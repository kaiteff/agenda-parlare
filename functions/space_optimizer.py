"""
Fase B — Optimizador de Espacios ("Adelantar Cita" / Waitlist Autopilot)

Lógica:
1. Detecta cancelaciones de corta antelación (ventana de 8 a 24 horas antes de la cita).
2. Busca pacientes agendados más tarde ese mismo día con la misma terapeuta y con consentimiento activo.
3. Envía una oferta automática vía WhatsApp con botones para adelantar su cita al espacio liberado.
4. El primero en aceptar (payload interactive 'offer_yes') es re-programado automáticamente en Firestore y Google Calendar.
"""
from __future__ import annotations

import logging
import os
import re
import json
import time
from datetime import datetime, timedelta
import pytz

import firebase_admin
from firebase_admin import firestore
from firebase_functions import firestore_fn, options
from twilio.rest import Client

logger = logging.getLogger(__name__)

MX_TZ = pytz.timezone("America/Mexico_City")

# Template predeterminado en Twilio (o configurable por variable de entorno)
OFFER_TEMPLATE_SID = os.environ.get(
    "OFFER_TEMPLATE_SID",
    "HX14731670198becbf2becfc20dbccb9b9", # Meta/Twilio approved waitlist offer template
)

def _get_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    return firestore.client()


def _parse_mx_datetime(date_str: str) -> datetime:
    raw = str(date_str).strip()
    if raw.endswith("Z"):
        raw = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(MX_TZ)
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        return MX_TZ.localize(dt)
    return dt.astimezone(MX_TZ)


def _normalize_phone(phone) -> str:
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) > 10:
        return digits
    elif len(digits) == 10:
        return "52" + digits
    return digits


def get_twilio_client():
    from main import TWILIO_SID, TWILIO_TOKEN
    return Client(TWILIO_SID.value, TWILIO_TOKEN.value)


def update_google_calendar_time(appointment: dict, new_date_str: str) -> None:
    """Actualiza la fecha y hora de un evento en Google Calendar desde el backend."""
    from main import get_google_services, THERAPIST_CALENDARS
    _, calendar_service = get_google_services()
    if not calendar_service or not appointment.get("googleEventId"):
        return
    try:
        therapist = appointment.get("therapist", "diana").lower()
        target_cal_id = THERAPIST_CALENDARS.get(therapist, THERAPIST_CALENDARS["diana"])
        
        # Obtener evento existente
        event = calendar_service.events().get(
            calendarId=target_cal_id, eventId=appointment["googleEventId"]
        ).execute()
        
        # Calcular nueva hora de fin (+1 hora)
        dt = _parse_mx_datetime(new_date_str)
        dt_end = dt + timedelta(hours=1)
        
        event["start"] = {
            "dateTime": dt.isoformat(),
            "timeZone": "America/Mexico_City"
        }
        event["end"] = {
            "dateTime": dt_end.isoformat(),
            "timeZone": "America/Mexico_City"
        }
        
        desc = event.get("description", "")
        if "⚡ Adelantado vía Autopilot" not in desc:
            desc += "\n⚡ Adelantado vía Autopilot de Parláre"
        event["description"] = desc
        
        calendar_service.events().update(
            calendarId=target_cal_id, eventId=appointment["googleEventId"], body=event
        ).execute()
        logger.info(f"✅ Sync Calendar Reschedule OK: {appointment.get('name')}")
    except Exception as e:
        logger.error(f"❌ Error Sync Calendar Reschedule: {e}")


@firestore_fn.on_document_written(
    document="appointments/{appointmentId}",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
)
def on_appointment_cancelled_trigger(
    event: firestore_fn.Event[firestore_fn.Change | None],
) -> None:
    """Monitorea cancelaciones de citas y activa la lista de espera Autopilot."""
    # ✅ Autopilot Reactivado con soporte para Quiet Hours y Delay de 10 min.
    from main import ALL_SECRETS, TWILIO_WHATSAPP_FROM
    
    change = event.data
    if change is None:
        return

    before = change.before.to_dict() if change.before.exists else None
    after = change.after.to_dict() if change.after.exists else None

    # Detectar si pasó de ACTIVA a CANCELADA
    if not after or not after.get("isCancelled"):
        return
    if before and before.get("isCancelled"):
        return

    appointment_id = event.params.get("appointmentId", "")
    if not appointment_id:
        return

    logger.info(f"🚨 Cancelación detectada para cita: {appointment_id}")

    cancelled_date_str = after.get("date")
    therapist = after.get("therapist")
    if not cancelled_date_str or not therapist:
        return

    # 1. Validar la ventana de tiempo (8h a 24h antes)
    now_mx = datetime.now(MX_TZ)
    cancelled_dt = _parse_mx_datetime(cancelled_date_str)
    diff_hours = (cancelled_dt - now_mx).total_seconds() / 3600.0

    if not (8.0 <= diff_hours <= 24.0):
        logger.info(
            f"La cita cancelada {appointment_id} es en {diff_hours:.1f} horas. "
            "Fuera del rango de 8-24 horas. Omitiendo Autopilot."
        )
        return

    db = _get_db()

    # --- INICIO LÓGICA COPILOTO COLABORATIVO ---
    # 1. Quiet Hours (07:00 a 21:59 es horario normal, fuera de eso es Quiet Hours)
    is_quiet_hours = not (7 <= now_mx.hour < 22)
    if is_quiet_hours:
        logger.info(f"🌙 Cancelación en Quiet Hours. Pausando para {appointment_id}")
        db.collection("quiet_hours_pending").document(appointment_id).set({
            "appointmentId": appointment_id,
            "therapist": therapist,
            "cancelledAt": firestore.SERVER_TIMESTAMP,
            "originalDate": cancelled_date_str,
        })
        return

    # 2. Delay inicial de 10 minutos con polling cada 30 segundos
    logger.info(f"⏳ Esperando hasta 10 minutos (margen manual) con polling de 30s para {appointment_id}")
    
    total_wait = 600  # 10 minutos
    poll_interval = 30
    elapsed = 0
    should_proceed = True
    
    while elapsed < total_wait:
        # Validar que la cita siga cancelada
        current_doc = db.collection("appointments").document(appointment_id).get()
        if not current_doc.exists:
            logger.info(f"🛑 La cita {appointment_id} ya no existe en Firestore. Abortando.")
            should_proceed = False
            break
            
        if not current_doc.to_dict().get("isCancelled"):
            logger.info(f"🛑 La cita {appointment_id} fue retomada durante el delay. Abortando.")
            should_proceed = False
            break
            
        # Revisar si hay un override del Copiloto
        override_doc = db.collection("copilot_overrides").document(appointment_id).get()
        if override_doc.exists:
            override_data = override_doc.to_dict()
            action = override_data.get("action")
            logger.info(f"⚡ Copiloto override detectado para {appointment_id}: {action}")
            
            if action == "skip_delay":
                logger.info(f"🚀 Adelantando el Autopilot inmediatamente por petición manual.")
                break
            elif action == "pause":
                logger.info(f"⏸️ Autopilot pausado manualmente por Recepción/Terapeuta. Abortando.")
                should_proceed = False
                break
        
        # Esperar 30 segundos
        time.sleep(poll_interval)
        elapsed += poll_interval

    if not should_proceed:
        return

    process_autopilot_candidates(
        appointment_id,
        therapist,
        cancelled_date_str,
        cancelled_dt,
        db,
        get_twilio_client(),
        TWILIO_WHATSAPP_FROM,
        is_quiet_hours=False
    )
def process_autopilot_candidates(
    appointment_id: str,
    therapist: str,
    cancelled_date_str: str,
    cancelled_dt: datetime,
    db,
    twilio_client,
    twilio_from: str,
    is_quiet_hours: bool = False
):
    logger.info(f"🎯 Buscando candidatos Autopilot para cita: {appointment_id}...")
    day_end_str = cancelled_dt.strftime("%Y-%m-%dT23:59:59-06:00")

    # 2. Buscar citas el mismo día, programadas más tarde con el mismo terapeuta
    docs = list(
        db.collection("appointments")
        .where("therapist", "==", therapist)
        .where("date", ">", cancelled_date_str)
        .where("date", "<=", day_end_str)
        .stream()
    )

    candidates = []
    for doc in docs:
        apt = doc.to_dict()
        apt["id"] = doc.id
        if apt.get("isCancelled") or apt.get("isPaid"):
            continue
        if apt.get("isFullDayBlock") or apt.get("isHourlyBlock"):
            continue
            
        # Regla de proximidad: Omitir si la cita candidata está a menos de 2 horas de la cancelada
        candidate_start = _parse_mx_datetime(apt["date"])
        if (candidate_start - cancelled_dt).total_seconds() < 2 * 3600:
            logger.info(f"Omitiendo {apt.get('name')} por regla de proximidad (< 2h).")
            continue
            
        candidates.append(apt)

    if not candidates:
        logger.info("No se encontraron candidatos programados más tarde para este terapeuta hoy.")
        return

    # Ordenar candidatos DESC (de más tarde a más temprano) para comprimir la agenda de atrás hacia adelante
    candidates.sort(key=lambda x: x["date"], reverse=True)
    logger.info(f"Encontrados {len(candidates)} candidatos potenciales.")

    # 3. Filtrar candidatos con recurrentOptIn == 'accepted' y enviar ofertas
    offers_sent = 0

    # Hora legible en México (e.g. 4:00 PM)
    time_label = cancelled_dt.strftime("%I:%M %p").lstrip("0")
    therapist_name = therapist.capitalize()

    for apt in candidates:
        patient_name = apt.get("name")
        if not patient_name:
            continue

        profiles = list(
            db.collection("patientProfiles")
            .where("name", "==", patient_name)
            .limit(1)
            .stream()
        )
        if not profiles:
            continue

        profile = profiles[0].to_dict()
        profile["id"] = profiles[0].id

        # Validar consentimiento de recordatorios automáticos
        if profile.get("recurrentOptIn") != "accepted":
            logger.info(f"Candidato {patient_name} omitido: sin consentimiento de WhatsApp activo.")
            continue

        phone = profile.get("phone")
        if not phone:
            continue

        dest_phone = _normalize_phone(phone)
        
        # Registrar oferta en /space_offers para trazabilidad y control de competencia
        offer_ref = db.collection("space_offers").document()
        offer_data = {
            "phone": dest_phone,
            "patientId": profile["id"],
            "patientName": patient_name, # Para trazabilidad interna de Yari
            "candidateAppointmentId": apt["id"],
            "freedAppointmentId": appointment_id,
            "freedDate": cancelled_date_str,
            "status": "pending",
            "quietHours": is_quiet_hours,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        offer_ref.set(offer_data)

        # Enviar WhatsApp vía Twilio Content API con botones interactivos
        try:
            twilio_client.messages.create(
                from_=twilio_from,
                to=f"whatsapp:+{dest_phone}",
                content_sid=OFFER_TEMPLATE_SID,
                content_variables=json.dumps({"1": time_label, "2": therapist_name}),
            )
            logger.info(f"✉️ Oferta enviada a {patient_name} ({dest_phone})")
            offers_sent += 1
        except Exception as exc:
            logger.error(f"⚠️ Error enviando oferta de WhatsApp a {dest_phone}: {exc}")

    logger.info(f"🚀 Fase B Autopilot completada. Ofertas enviadas: {offers_sent}")


def handle_space_offer_interactive(
    db,
    from_num: str,
    payload: str,
) -> str | None:
    """
    Procesa las respuestas interactivas a ofertas de adelanto de citas (Fase B).
    Se activa cuando el payload de los botones interactivos de Twilio coincide con 'offer_yes' u 'offer_no'.
    """
    norm_phone = _normalize_phone(from_num)
    
    # 1. Buscar si tiene ofertas pendientes para este teléfono
    offers = list(
        db.collection("space_offers")
        .where("phone", "==", norm_phone)
        .where("status", "==", "pending")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )

    if not offers:
        logger.info(f"No se encontraron ofertas pendientes para {norm_phone}.")
        return None

    offer_doc = offers[0]
    offer = offer_doc.to_dict()
    offer_id = offer_doc.id

    if payload == "offer_no":
        # El paciente declinó de forma amable la oferta
        db.collection("space_offers").document(offer_id).update({"status": "declined"})
        logger.info(f"El paciente {offer.get('patientName')} declinó la oferta de espacio.")
        return "Entendido. No te preocupes, tu sesión se mantiene programada en tu horario habitual. ¡Lindo día! 😊"

    if payload == "offer_yes":
        freed_apt_id = offer.get("freedAppointmentId")
        candidate_apt_id = offer.get("candidateAppointmentId")
        new_date_str = offer.get("freedDate")

        if not freed_apt_id or not candidate_apt_id or not new_date_str:
            return "Hubo un inconveniente al procesar tu solicitud. Por favor contacta a Recepción."

        # 2. Verificar que el espacio liberado SIGA estando cancelado (no ocupado por otro)
        freed_snap = db.collection("appointments").document(freed_apt_id).get()
        if not freed_snap.exists:
            db.collection("space_offers").document(offer_id).update({"status": "expired"})
            return "Lo sentimos, el espacio ya no se encuentra disponible. Tu cita sigue en su horario programado."

        freed_apt = freed_snap.to_dict() or {}
        # Si ya fue uncancelled o tiene un nombre diferente al original (reagendado), ya no está libre
        # También verificamos en la colección de space_offers si otra oferta ya fue aceptada para este slot
        competitors = list(
            db.collection("space_offers")
            .where("freedAppointmentId", "==", freed_apt_id)
            .where("status", "==", "accepted")
            .limit(1)
            .stream()
        )

        if not freed_apt.get("isCancelled") or competitors:
            # Ya fue tomado por otro candidato o Yari reagendó manualmente
            db.collection("space_offers").document(offer_id).update({"status": "expired"})
            logger.info(f"El espacio {freed_apt_id} ya fue ocupado. Oferta expirada para {offer.get('patientName')}.")
            return "Lo sentimos, ese horario ya fue tomado por otro paciente. Tu cita se mantiene en su horario original."

        # 3. ¡EL ESPACIO ESTÁ LIBRE! Reagendar cita del candidato
        cand_snap = db.collection("appointments").document(candidate_apt_id).get()
        if not cand_snap.exists:
            return "No encontramos tu cita original para reprogramarla. Por favor contacta a Recepción."

        candidate_apt = cand_snap.to_dict() or {}

        # 4. Modificar fecha de la cita en Firestore
        db.collection("appointments").document(candidate_apt_id).update({
            "date": new_date_str,
            "lastBotUpdate": "Autopilot-Reschedule",
            "rescheduledAt": firestore.SERVER_TIMESTAMP,
        })

        # 5. Modificar en Google Calendar de forma directa
        try:
            update_google_calendar_time(candidate_apt, new_date_str)
        except Exception as exc:
            logger.error(f"Fallo al actualizar Google Calendar: {exc}")

        # 6. Actualizar en Google Sheets
        try:
            from main import update_google_sheet
            # Registrar el cambio de horario
            candidate_apt["date"] = new_date_str
            update_google_sheet(candidate_apt, "ADELANTADO AUTOPILOT")
        except Exception as exc:
            logger.error(f"Fallo al actualizar Google Sheets: {exc}")

        # 7. Marcar oferta como aceptada y las demás ofertas competidoras para ese mismo slot como expiradas
        db.collection("space_offers").document(offer_id).update({"status": "accepted"})
        
        other_offers = list(
            db.collection("space_offers")
            .where("freedAppointmentId", "==", freed_apt_id)
            .where("status", "==", "pending")
            .stream()
        )
        for other_doc in other_offers:
            db.collection("space_offers").document(other_doc.id).update({"status": "taken"})

        # 8. Notificar a Yari de forma inmediata creando una alerta en /reception_alerts
        dt = _parse_mx_datetime(new_date_str)
        time_label = dt.strftime("%I:%M %p").lstrip("0")
        
        alert_data = {
            "type": "autopilot_compress",
            "status": "open",
            "freedAppointmentId": freed_apt_id,
            "candidateAppointmentId": candidate_apt_id,
            "patientName": candidate_apt.get("name", "Paciente"),
            "therapist": candidate_apt.get("therapist", "diana"),
            "message": (
                f"⚡ ¡Autopilot comprimió la agenda! El paciente de la sesión de hoy a las "
                f"{_parse_mx_datetime(candidate_apt.get('date')).strftime('%I:%M %p').lstrip('0')} "
                f"aceptó adelantar su cita a las {time_label}."
            ),
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        db.collection("reception_alerts").add(alert_data)

        logger.success(f"⚡ Autopilot exitoso para {candidate_apt.get('name')}. Cita movida a las {time_label}.")
        
        # Retornar confirmación anónima al paciente
        return f"¡Excelente! Tu sesión ha sido reprogramada con éxito para el día de hoy a las {time_label}. ¡Nos vemos en tu sesión! 😊"

    return None
