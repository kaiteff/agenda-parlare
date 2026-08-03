# functions/main.py
"""
Parláre Cloud Functions - Serverless Backend (Plan Blaze)
Migración completa de Flask/Render a Firebase Functions 2nd Gen en Python.
"""
import json
import re
import unicodedata
from datetime import datetime, timedelta
import pytz

# Firebase & Functions
import firebase_admin
import time  # added for controlled delays
from firebase_admin import firestore
from firebase_functions import https_fn, options, scheduler_fn, firestore_fn
from firebase_functions.params import SecretParam

# Twilio
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

# Google APIs
import google.auth
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from whatsapp_optin import (
    WELCOME_OPTIN_CONTENT_SID,
    handle_optin_interactive,
    parse_interactive_payload,
    patient_accepts_automated_whatsapp,
)
from whatsapp_templates import (
    MOTIVO_CANCELACION_SID,
    RECORDATORIO_EVALUACION_SID,
    RECORDATORIO_CRON_SID,
    DIANA_SESION_EVALUACION_SID,
    DIANA_SIGUIENTE_ETAPA_SID,
    COPY_INFO_PROXIMA_CITA_SID,
    POST_CONFIRM_SID,
    CANCEL_REASON_PAYLOADS,
    DIANA_EVAL_PAYLOADS,
)

# ── 1. Inicialización Global y Secretos ────────────────────────────────────

# Proxy Dinámico para evitar que Firebase CLI falle al analizar el archivo localmente
class FirestoreProxy:
    def __getattr__(self, name):
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        return getattr(firestore.client(), name)

db = FirestoreProxy()

MX_TZ = pytz.timezone('America/Mexico_City')

# Registro de Secretos de Firebase (se inyectarán en tiempo de ejecución)
from secrets_config import (
    TWILIO_SID,
    TWILIO_TOKEN,
    REMINDERS_API_KEY,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    ALL_SECRETS,
)
from webhook_security import (
    validate_twilio_webhook,
    authorize_staff_or_api_key,
    sanitize_whatsapp_user_text,
    mask_phone_for_log,
    staff_api_cors_headers,
)

TWILIO_WHATSAPP_FROM = "whatsapp:+16066451055"

# ── 2. Configuraciones Duras (Pendiente Fase 2 SaaS) ───────────────────────

SHEET_CONFIG = {
    'spreadsheets': {
        'diana': '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
        'sam': '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg',
        'vero': '1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc'
    },
    'targetSheetName': 'App_Data'
}

THERAPIST_CALENDARS = {
    'diana': '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
    'vero': 'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
    'sam': '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
}

THERAPIST_PHONES = {
    'diana': '523331834432',
    'sam': '523321145307',
    'vero': '523318006167',
    'reception': '523315196702'
}

# ── 3. Factorías e Instancias Seguras (Evaluación en Ejecución) ───────────

def get_twilio_client():
    """Genera cliente de Twilio leyendo secretos seguros en runtime"""
    return Client(TWILIO_SID.value, TWILIO_TOKEN.value)

def get_google_services():
    """Genera servicios genéricos usando la cuenta de servicio Default de GCP"""
    try:
        credentials, _ = google.auth.default(scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/calendar'
        ])
        sheets_service = build('sheets', 'v4', credentials=credentials)
        calendar_service = build('calendar', 'v3', credentials=credentials)
        return sheets_service, calendar_service
    except Exception as e:
        print(f"Error inicializando Google Auth Default: {e}")
        return None, None

def get_user_calendar_service():
    """Genera cliente OAuth para el calendario Maestro de Admin"""
    try:
        creds = Credentials(
            token=None,
            refresh_token=GOOGLE_REFRESH_TOKEN.value,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GOOGLE_CLIENT_ID.value,
            client_secret=GOOGLE_CLIENT_SECRET.value,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        creds.refresh(Request())
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"Error construyendo User Calendar Service OAuth: {e}")
        return None

# ── 4. Utilidades Centrales ───────────────────────────────────────────────

def parse_mx_datetime(date_str):
    raw = str(date_str).strip()
    if raw.endswith('Z'):
        raw = raw.replace('Z', '+00:00')
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(MX_TZ)
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = MX_TZ.localize(dt)
    else:
        dt = dt.astimezone(MX_TZ)
    return dt

def normalize_phone(phone):
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) > 10:
        if digits.startswith('521'): digits = digits[3:]
        elif digits.startswith('52'): digits = digits[2:]
    return digits[-10:] if len(digits) >= 10 else digits

def _normalize_match_name(name):
    """Minúsculas sin acentos para comparar perfil vs cita."""
    if not name:
        return ''
    s = str(name).strip().lower()
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def _incoming_whatsapp_text(msg_body, raw_payload):
    """Combina texto libre y payload de botones Twilio (a veces Body viene vacío)."""
    parts = []
    for part in (msg_body, raw_payload):
        if not part:
            continue
        t = str(part).strip().lower()
        if t and t not in parts:
            parts.append(t)
    return ' '.join(parts)

def _message_has_keyword(text, keywords):
    """Match confirm/cancel intent without substring false positives.

    Short tokens ('no', 'si', 'va', '1') must be whole words. Multi-word
    phrases ('no puedo') may match as substrings. Prevents messages like
    'buenas noches' / 'posible' / 'vamos' from cancelling or confirming.
    """
    if not text:
        return False
    normalized = str(text).strip().lower()
    tokens = set(re.findall(r"[a-z0-9áéíóúüñ]+", normalized, flags=re.IGNORECASE))
    for raw in keywords:
        kw = str(raw).strip().lower()
        if not kw:
            continue
        if " " in kw:
            if kw in normalized:
                return True
        elif len(kw) == 1 and kw.isdigit():
            # Digits like "1"/"2"/"3" only when they are the whole message
            if normalized == kw or tokens == {kw}:
                return True
        elif kw in tokens:
            return True
    return False

WHATSAPP_CONFIRM_KEYWORDS = [
    '1', 'ok', 'si', 'sí', 'confirmar', 'confirmado', 'confirmo', 'listo', 'claro', 'sale', 'va'
]
WHATSAPP_CANCEL_KEYWORDS = [
    '2', 'cancelar', 'no puedo', 'no asist', 'cancelado', 'no asistiremos', 'no asistira', 'no'
]
WHATSAPP_RECEPTION_KEYWORDS = ['3', 'recepcion', 'yari', 'duda']
WHATSAPP_THANKS_KEYWORDS = ['gracias', 'mil gracias', 'muchas gracias', 'te lo agradezco']

def update_google_sheet(appointment, status):
    sheets_service, _ = get_google_services()
    if not sheets_service: return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        spreadsheet_id = SHEET_CONFIG['spreadsheets'].get(therapist)
        if not spreadsheet_id: return

        dt = parse_mx_datetime(appointment['date'])
        values = [[
            dt.strftime('%d/%m/%Y'), dt.strftime('%I:%M %p'),
            appointment.get('name', 'Paciente'), 0, status,
            datetime.now(MX_TZ).isoformat(), dt.hour, 0, 0
        ]]
        sheets_service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id, range=f"{SHEET_CONFIG['targetSheetName']}!A:I",
            valueInputOption='USER_ENTERED', body={'values': values}
        ).execute()
        print(f"✅ Sync Sheet OK: {appointment.get('name')} -> {status}")
    except Exception as e:
        print(f"❌ Error Sync Sheet: {e}")

def update_google_calendar(appointment, status_text):
    calendar_service = get_user_calendar_service() or get_google_services()[1]
    if not calendar_service or not appointment.get('googleEventId'): return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        target_cal_id = THERAPIST_CALENDARS.get(therapist, THERAPIST_CALENDARS['diana'])
        event = calendar_service.events().get(calendarId=target_cal_id, eventId=appointment['googleEventId']).execute()
        
        desc = event.get('description', '').replace("\n✅ Asistencia confirmada vía WhatsApp", "").replace("\n❌ CANCELADO vía WhatsApp", "")
        summary = event.get('summary', appointment.get('name', 'Cita')).replace("✅ ", "").replace("❌ ", "")
        
        if status_text == "CONFIRMADO":
            desc += "\n✅ Asistencia confirmada vía WhatsApp"
            summary = "✅ " + summary
        elif status_text == "CANCELADO":
            desc += "\n❌ CANCELADO vía WhatsApp"
            summary = "❌ " + summary
            event['colorId'] = '8'
            
        event['description'] = desc
        event['summary'] = summary
        calendar_service.events().update(calendarId=target_cal_id, eventId=appointment['googleEventId'], body=event).execute()
        print(f"✅ Sync Calendar OK: {appointment.get('name')}")
    except Exception as e:
        print(f"❌ Error Sync Calendar: {e}")

def notify_receptionist(patient_name, action_type, date_str="Mañana", hour_str="", therapist="Diana", phone=""):
    try:
        twilio_client = get_twilio_client()
        yari_num = "whatsapp:+523315196702"
        icon = "❌" if "CANCELAR" in action_type.upper() else "📞"
        wa_link = f"wa.me/{phone}" if phone else "No disponible"
        detalle = f"{icon} CANCELACIÓN: {patient_name}  Cita: {date_str} {hour_str} ({therapist})  ACCION: Solicitar justificante y reagendar.  📱 Escribir: {wa_link}"
        
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_FROM, to=yari_num, content_sid='HX28a1f7c6ccbb2b507f9764b098c44779',
            content_variables=json.dumps({"1": "Yari", "2": date_str, "3": detalle})
        )
        print(f"📩 Notificación enviada a Yari para: {patient_name}")
    except Exception as e:
        print(f"⚠️ Error notificando a Yari: {e}")

def find_patients_by_identifier(phone, bsuid=None):
    found, found_ids = [], set()
    if bsuid:
        docs = db.collection('patientProfiles').where('whatsappBSUID', '==', bsuid).stream()
        for doc in docs:
            if doc.id not in found_ids and doc.to_dict().get('isActive', True):
                data = doc.to_dict()
                found.append(_patient_match_from_doc(doc.id, data))
                found_ids.add(doc.id)
        if found: return found

    if phone:
        norm = normalize_phone(phone)
        search_variants = [norm, f"+52{norm}", f"52{norm}", f"+521{norm}", f"521{norm}"]
        docs_to_update = []
        for variant in search_variants:
            docs = db.collection('patientProfiles').where('phone', '==', variant).stream()
            for doc in docs:
                if doc.id not in found_ids and doc.to_dict().get('isActive', True):
                    data = doc.to_dict()
                    found.append(_patient_match_from_doc(doc.id, data))
                    found_ids.add(doc.id)
                    if bsuid and not doc.to_dict().get('whatsappBSUID'):
                        docs_to_update.append(doc.reference)
            if found: break
        if docs_to_update and bsuid:
            for ref in docs_to_update:
                try: ref.update({'whatsappBSUID': bsuid})
                except: pass
    return found

def _patient_match_from_doc(doc_id, data):
    return {
        'id': doc_id,
        'name': data.get('name', ''),
        'therapist': data.get('therapist', 'diana'),
        'phone': data.get('phone', ''),
        'countryCode': data.get('countryCode', '52'),
    }

def _tomorrow_firestore_bounds(mx_now):
    """Rango amplio en Firestore para citas con fecha local = mañana (MX).

    Las citas de tarde (p. ej. 7 PM) se guardan en UTC con día siguiente;
    el cron de recordatorios ya usaba este rango — el webhook debe alinearse.
    """
    tomorrow = mx_now + timedelta(days=1)
    day_str = tomorrow.strftime('%Y-%m-%d')
    start_iso = f"{day_str}T00:00:00"
    end_iso = f"{(tomorrow + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    return tomorrow.date(), start_iso, end_iso


def find_confirmable_appointments(patients, mx_now=None):
    """Citas de hoy o mañana (hora México) del paciente, listas para confirmar/cancelar."""
    mx_now = mx_now or datetime.now(MX_TZ)
    today = mx_now.date()
    tomorrow = (mx_now + timedelta(days=1)).date()
    target_dates = {today, tomorrow}
    start_iso = f"{today.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(mx_now + timedelta(days=2)).strftime('%Y-%m-%d')}T08:00:00"

    if isinstance(patients, list) and patients and isinstance(patients[0], dict):
        patient_ids = {p['id'] for p in patients if p.get('id')}
        names_norm = {_normalize_match_name(p.get('name', '')) for p in patients if p.get('name')}
    else:
        patient_ids = set()
        names_norm = {_normalize_match_name(n) for n in (patients or [])}

    results = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
    apts = []
    for doc in results:
        data = doc.to_dict()
        if data.get('isCancelled'):
            continue
        p_id = data.get('patientId') or data.get('profileId')
        name_norm = _normalize_match_name(data.get('name', ''))
        if p_id not in patient_ids and name_norm not in names_norm:
            continue
        try:
            if parse_mx_datetime(data['date']).date() not in target_dates:
                continue
        except Exception:
            continue
        apts.append({'id': doc.id, **data})
    return apts


def find_tomorrow_appointments(patient_names):
    mx_now = datetime.now(MX_TZ)
    tomorrow_date, start_iso, end_iso = _tomorrow_firestore_bounds(mx_now)
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
    apts = []
    for doc in results:
        data = doc.to_dict()
        if data.get('isCancelled') or data.get('name', '').lower() not in names_lower:
            continue
        try:
            if parse_mx_datetime(data['date']).date() != tomorrow_date:
                continue
        except Exception:
            continue
        apts.append({'id': doc.id, **data})
    return apts

def find_next_appointment(patient_names):
    now_iso = datetime.now(MX_TZ).strftime('%Y-%m-%dT%H:%M:%S')
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', now_iso).stream()
    apts = [d.to_dict() for d in results if not d.to_dict().get('isCancelled') and d.to_dict().get('name', '').lower() in names_lower]
    if apts:
        apts.sort(key=lambda x: x['date'])
        return apts[0]
    return None

MESES_ES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

def _format_apt_date_long(dt):
    return f"{dt.strftime('%A').capitalize()} {dt.day} de {MESES_ES[dt.month]}"

def _format_apt_date_short(dt):
    return f"{dt.day} de {MESES_ES[dt.month]}"

def _format_apt_hour(dt):
    return dt.strftime('%I:%M %p').lstrip('0')

def _evaluation_stage_display(apt):
    if apt.get('stageName'):
        return apt['stageName']
    stage = apt.get('evaluationStage') or 1
    name = {1: 'Entrevista', 2: 'Evaluación', 3: 'Entrega de resultados'}.get(stage, 'Evaluación')
    return f"{name} — cita {stage} de 3"

def _is_diana_phone(from_num):
    return normalize_phone(from_num) == normalize_phone(THERAPIST_PHONES.get('diana', ''))

def _patient_match_ids_names(patients):
    if isinstance(patients, list) and patients and isinstance(patients[0], dict):
        patient_ids = {p['id'] for p in patients if p.get('id')}
        names_norm = {_normalize_match_name(p.get('name', '')) for p in patients if p.get('name')}
    else:
        patient_ids = set()
        names_norm = {_normalize_match_name(n) for n in (patients or [])}
    return patient_ids, names_norm

def _apt_matches_patients(data, patient_ids, names_norm):
    p_id = data.get('patientId') or data.get('profileId')
    name_norm = _normalize_match_name(data.get('name', ''))
    return p_id in patient_ids or name_norm in names_norm

def _find_apt_with_flag(patients, flag_field):
    patient_ids, names_norm = _patient_match_ids_names(patients)
    try:
        for doc in db.collection('appointments').where(flag_field, '==', True).limit(30).stream():
            data = doc.to_dict()
            if _apt_matches_patients(data, patient_ids, names_norm):
                return {'id': doc.id, **data}
    except Exception as e:
        print(f"⚠️ _find_apt_with_flag({flag_field}): {e}")
    return None

def _send_content_template(to_num, content_sid, variables=None):
    tw_args = {'from_': TWILIO_WHATSAPP_FROM, 'to': to_num, 'content_sid': content_sid}
    if variables:
        tw_args['content_variables'] = json.dumps(variables)
    get_twilio_client().messages.create(**tw_args)

def _reminder_content_for_apt(apt, dt):
    therapist = apt.get('therapist', 'Diana').title()
    hour_str = _format_apt_hour(dt)
    if apt.get('isEvaluation'):
        return RECORDATORIO_EVALUACION_SID, {
            '1': _format_apt_date_long(dt),
            '2': hour_str,
            '3': therapist,
            '4': _evaluation_stage_display(apt),
        }
    return RECORDATORIO_CRON_SID, {
        '1': _format_apt_date_short(dt),
        '2': hour_str,
        '3': therapist,
    }

def _find_diana_eval_apt_today():
    mx_now = datetime.now(MX_TZ)
    today = mx_now.date()
    start_iso = f"{today.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(mx_now + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    for doc in db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream():
        data = doc.to_dict()
        if not data.get('isEvaluation') or data.get('isCancelled') or data.get('dianaSessionConfirmed'):
            continue
        if str(data.get('therapist', '')).lower() != 'diana':
            continue
        try:
            if parse_mx_datetime(data['date']).date() == today:
                return {'id': doc.id, **data}
        except Exception:
            continue
    return None

def _find_diana_awaiting_next_stage():
    try:
        for doc in db.collection('patientProfiles').where('awaitingDianaNextStage', '==', True).limit(5).stream():
            return {'id': doc.id, **doc.to_dict()}
    except Exception as e:
        print(f"⚠️ _find_diana_awaiting_next_stage: {e}")
    return None

def handle_diana_eval_interactive(raw_payload):
    apt = _find_diana_eval_apt_today()
    profile = _find_diana_awaiting_next_stage()
    diana_dest = f"whatsapp:+{THERAPIST_PHONES['diana']}"

    if raw_payload in ('eval_yes', 'eval_no'):
        if not apt:
            return "No encontré una sesión de evaluación de hoy pendiente de confirmar."
        apt_ref = db.collection('appointments').document(apt['id'])
        attended = raw_payload == 'eval_yes'
        apt_ref.update({
            'dianaSessionConfirmed': True,
            'dianaSessionConfirmedAt': firestore.SERVER_TIMESTAMP,
            'dianaSessionAttended': attended,
            'confirmedBy': 'diana',
            'confirmedSource': 'whatsapp',
        })
        _log_reminder_to_audit(
            apt['id'], apt.get('name', ''), 'diana', diana_dest, apt.get('date', ''),
            'WHATSAPP_DIANA_SESSION',
            message=f"Diana respondió {'Sí realizada' if attended else 'No realizada'} (evaluación)"
        )
        if attended and (apt.get('evaluationStage') or 1) == 2:
            p_id = apt.get('profileId') or apt.get('patientId')
            if p_id:
                db.collection('patientProfiles').document(p_id).update({'awaitingDianaNextStage': True})
            try:
                _send_content_template(diana_dest, DIANA_SIGUIENTE_ETAPA_SID, {'1': apt.get('name', 'paciente')})
            except Exception as e:
                print(f"⚠️ E3 a Diana falló: {e}")
        return "Gracias Diana, quedó registrado. ✅" if attended else "Entendido, sesión marcada como no realizada."

    if raw_payload in ('eval_extra', 'eval_entrega'):
        if not profile:
            return "No encontré un proceso de evaluación pendiente de siguiente etapa."
        p_ref = db.collection('patientProfiles').document(profile['id'])
        if raw_payload == 'eval_extra':
            p_ref.update({
                'evaluationMeta.optionalExtraEvaluation': True,
                'awaitingDianaNextStage': False,
            })
            return "Anotado: habrá otra sesión de evaluación antes de la entrega."
        p_ref.update({'evaluationStage': 3, 'awaitingDianaNextStage': False})
        return "Anotado: la próxima cita es entrega de resultados."

    return None

def execute_send_diana_evaluation_followup():
    """21:00 MX — E2 a Diana si hubo sesión de evaluación hoy sin respuesta."""
    mx_now = datetime.now(MX_TZ)
    today = mx_now.date()
    start_iso = f"{today.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(mx_now + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    sent = 0
    diana_dest = f"whatsapp:+{THERAPIST_PHONES['diana']}"
    for doc in db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream():
        apt = doc.to_dict()
        if not apt.get('isEvaluation') or apt.get('isCancelled'):
            continue
        if str(apt.get('therapist', '')).lower() != 'diana':
            continue
        if apt.get('dianaSessionConfirmed') or apt.get('dianaFollowupSentAt'):
            continue
        try:
            dt = parse_mx_datetime(apt['date'])
        except Exception:
            continue
        if dt.date() != today or dt > mx_now:
            continue
        stage_label = apt.get('stageName') or _evaluation_stage_display(apt).split('—')[0].strip()
        try:
            _send_content_template(diana_dest, DIANA_SESION_EVALUACION_SID, {
                '1': apt.get('name', ''),
                '2': stage_label,
                '3': _format_apt_hour(dt),
            })
            db.collection('appointments').document(doc.id).update({
                'dianaFollowupSentAt': firestore.SERVER_TIMESTAMP,
            })
            sent += 1
        except Exception as e:
            print(f"⚠️ E2 Diana falló ({apt.get('name')}): {e}")
    return {'sent': sent}

# ── 5. Endpoints / Webhooks ───────────────────────────────────────────────

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]), secrets=ALL_SECRETS)
def whatsapp_webhook(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return https_fn.Response(status=204)
    if not validate_twilio_webhook(req, TWILIO_TOKEN.value):
        print("🚫 Webhook WhatsApp rechazado: firma Twilio inválida")
        return https_fn.Response("Forbidden", status=403)
    try:
        msg_body = req.form.get('Body', '').strip().lower()
        from_num = req.form.get('From', '')
        bsuid = req.form.get('ExternalUserId', '')
        raw_payload = req.form.get('ButtonPayload') or req.form.get('button_payload') or req.form.get('ListId') or req.form.get('list_id')
        if raw_payload:
            raw_payload = str(raw_payload).strip().lower()
        else:
            raw_payload = msg_body

        print(f"📥 WhatsApp webhook payload={raw_payload} from={mask_phone_for_log(from_num)}")

        resp = MessagingResponse()

        # 1. Procesar payloads del Optimizador de Espacios (Fase B)
        if raw_payload in ('offer_yes', 'offer_no'):
            from space_optimizer import handle_space_offer_interactive
            reply = handle_space_offer_interactive(db, from_num, raw_payload)
            if reply:
                resp.message(reply)
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        patients = find_patients_by_identifier(from_num, bsuid)
        optin_payload = parse_interactive_payload(req.form)

        if optin_payload:
            reply = handle_optin_interactive(db, patients, optin_payload, from_num)
            if reply:
                resp.message(reply)
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if _is_diana_phone(from_num) and raw_payload in DIANA_EVAL_PAYLOADS:
            reply = handle_diana_eval_interactive(raw_payload)
            if reply:
                resp.message(reply)
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if not patients:
            norm_from = normalize_phone(from_num)
            staff_name = next((k.capitalize() for k, p in THERAPIST_PHONES.items() if normalize_phone(p) == norm_from), None)
            
            if staff_name and staff_name.lower() in ('diana', 'sam', 'vero'):
                from space_optimizer import handle_collaborative_approval_reply
                reply = handle_collaborative_approval_reply(staff_name.lower(), raw_payload, msg_body)
                if reply:
                    resp.message(reply)
                    return https_fn.Response(str(resp), status=200, mimetype='text/xml')

            if staff_name:
                resp.message(f"¡Hola {staff_name}! Sesión abierta por 24h. Lista para notificaciones. 🤖✅")
            else:
                resp.message("Tu número no está registrado. Contacta a Recepción de Parláre.")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        RECEPTION_KEYWORDS = WHATSAPP_RECEPTION_KEYWORDS
        CONFIRM_KEYWORDS = WHATSAPP_CONFIRM_KEYWORDS
        CANCEL_KEYWORDS = WHATSAPP_CANCEL_KEYWORDS
        THANKS_KEYWORDS = WHATSAPP_THANKS_KEYWORDS

        incoming = _incoming_whatsapp_text(msg_body, raw_payload)

        if _message_has_keyword(incoming, RECEPTION_KEYWORDS):
            resp.message("Entendido. Puedes hablarnos directo aquí: https://wa.me/523315196702")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if _message_has_keyword(incoming, THANKS_KEYWORDS) and not _message_has_keyword(incoming, CONFIRM_KEYWORDS + CANCEL_KEYWORDS):
            resp.message("¡De nada! Que tengas un muy bonito día. 😊")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if raw_payload in CANCEL_REASON_PAYLOADS:
            apt = _find_apt_with_flag(patients, 'awaitingCancellationReason')
            if not apt:
                resp.message("No encontramos una cancelación reciente. Dudas: https://wa.me/523315196702")
                return https_fn.Response(str(resp), status=200, mimetype='text/xml')
            reason = CANCEL_REASON_PAYLOADS[raw_payload]
            apt_ref = db.collection('appointments').document(apt['id'])
            updates = {
                'cancellationReason': reason,
                'cancellationReasonAt': firestore.SERVER_TIMESTAMP,
                'awaitingCancellationReason': False,
            }
            if raw_payload == 'cancel_otro':
                updates['awaitingCancellationNote'] = True
            apt_ref.update(updates)
            _log_reminder_to_audit(
                apt['id'], apt.get('name', ''), apt.get('therapist', 'diana'),
                from_num, apt.get('date', ''), 'WHATSAPP_CANCEL_REASON',
                message=f"Motivo cancelación: {reason}"
            )
            if raw_payload == 'cancel_otro':
                resp.message("Gracias. Cuéntanos brevemente el motivo (una línea).")
            else:
                resp.message("Gracias, quedó registrado. Para reagendar: https://wa.me/523315196702")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        apt_note = _find_apt_with_flag(patients, 'awaitingCancellationNote')
        if apt_note and msg_body and raw_payload not in ('1', '2', '3', *CANCEL_REASON_PAYLOADS):
            if not _message_has_keyword(incoming, CONFIRM_KEYWORDS + CANCEL_KEYWORDS + RECEPTION_KEYWORDS):
                note = sanitize_whatsapp_user_text(req.form.get('Body', ''))
                if note:
                    db.collection('appointments').document(apt_note['id']).update({
                        'cancellationReasonNote': note,
                        'awaitingCancellationNote': False,
                    })
                    _log_reminder_to_audit(
                        apt_note['id'], apt_note.get('name', ''), apt_note.get('therapist', 'diana'),
                        from_num, apt_note.get('date', ''), 'WHATSAPP_CANCEL_REASON_NOTE',
                        message=f"Nota motivo: {note[:120]}"
                    )
                    resp.message("Gracias, motivo registrado. Para reagendar: https://wa.me/523315196702")
                    return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        is_confirm = _message_has_keyword(incoming, CONFIRM_KEYWORDS) or raw_payload in ('1', 'confirm', 'confirmar', 'ok')
        is_cancel = _message_has_keyword(incoming, CANCEL_KEYWORDS) or raw_payload in ('2', 'cancel', 'cancelar')

        if is_confirm or is_cancel:
            apts = find_confirmable_appointments(patients)
            if not apts:
                resp.message("No encontramos una cita activa para hoy o mañana. Si ya confirmaste, ignora este mensaje. Dudas: https://wa.me/523315196702")
                return https_fn.Response(str(resp), status=200, mimetype='text/xml')

            if is_confirm:
                for a in apts:
                    db.collection('appointments').document(a['id']).update({
                        'confirmed': True, 'confirmedAt': firestore.SERVER_TIMESTAMP,
                        'confirmedBy': 'parent', 'confirmedSource': 'whatsapp',
                        'lastBotUpdate': 'WhatsApp-Confirm',
                        'updatedAt': firestore.SERVER_TIMESTAMP,
                        'updatedBy': 'whatsapp_webhook'
                    })
                    update_google_sheet(a, "CONFIRMADO")
                    update_google_calendar(a, "CONFIRMADO")
                    _log_reminder_to_audit(
                        a['id'], a.get('name', ''), a.get('therapist', 'diana'),
                        from_num, a.get('date', ''), 'WHATSAPP_CONFIRM',
                        message='✅ Confirmación registrada vía WhatsApp'
                    )
                try:
                    get_twilio_client().messages.create(from_=TWILIO_WHATSAPP_FROM, to=from_num, content_sid=POST_CONFIRM_SID, content_variables='{}')
                except:
                    resp.message("✅ ¡Gracias! Se han confirmado las citas. ¡Nos vemos!")
                    return https_fn.Response(str(resp), status=200, mimetype='text/xml')
                return https_fn.Response("", status=200)

            cancelled_first = None
            for a in apts:
                db.collection('appointments').document(a['id']).update({
                    'isCancelled': True, 'cancelledBy': 'WhatsApp',
                    'cancelledAt': firestore.SERVER_TIMESTAMP, 'lastBotUpdate': 'WhatsApp-Cancel',
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'updatedBy': 'whatsapp_webhook'
                })
                update_google_sheet(a, "CANCELADO")
                update_google_calendar(a, "CANCELADO")
                dt = parse_mx_datetime(a['date'])
                notify_receptionist(a.get('name', ''), "CANCELADA", f"{dt.day}/{dt.month}", dt.strftime('%I:%M %p').lstrip('0'), a.get('therapist', 'Diana').title(), re.sub(r'\D', '', from_num))
                _log_reminder_to_audit(
                    a['id'], a.get('name', ''), a.get('therapist', 'diana'),
                    from_num, a.get('date', ''), 'WHATSAPP_CANCEL',
                    message='❌ Cancelación registrada vía WhatsApp'
                )
                if not cancelled_first:
                    cancelled_first = a
            if cancelled_first:
                try:
                    dt = parse_mx_datetime(cancelled_first['date'])
                    _send_content_template(from_num, MOTIVO_CANCELACION_SID, {
                        '1': _format_apt_date_long(dt),
                        '2': _format_apt_hour(dt),
                    })
                    db.collection('appointments').document(cancelled_first['id']).update({
                        'awaitingCancellationReason': True,
                    })
                    return https_fn.Response("", status=200)
                except Exception as c1_err:
                    print(f"⚠️ Plantilla C1 falló: {c1_err}")
            resp.message("Cita cancelada. ¡Esperamos todo esté bien! 😊 Para reagendar: https://wa.me/523315196702")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        patient_names = [p.get('name', '') for p in patients if p.get('name')]
        apts = find_tomorrow_appointments(patient_names)
        if not apts:
            next_apt = find_next_appointment(patient_names)
            if next_apt:
                dt = parse_mx_datetime(next_apt['date'])
                meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                day_str = f"{dt.strftime('%A').capitalize()} {dt.day} de {meses[dt.month]}"
                get_twilio_client().messages.create(
                    from_=TWILIO_WHATSAPP_FROM, to=from_num, content_sid=COPY_INFO_PROXIMA_CITA_SID,
                    content_variables=json.dumps({"1": day_str, "2": dt.strftime('%I:%M %p').lstrip('0')})
                )
                return https_fn.Response("", status=200)
            resp.message("Hola, no encontramos citas futuras. Contacta a Recepción: https://wa.me/523315196702")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        resp.message("Responde 1 para CONFIRMAR o 2 para CANCELAR.")
        return https_fn.Response(str(resp), status=200, mimetype='text/xml')

    except Exception as e:
        print(f"💥 CRASH EN WEBHOOK: {e}")
        error_resp = MessagingResponse()
        error_resp.message(f"Problema técnico (Error: {str(e)}). Contacta a Recepción.")
        return https_fn.Response(str(error_resp), status=200, mimetype='text/xml')

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]), secrets=ALL_SECRETS)
def send_message_api(req: https_fn.Request) -> https_fn.Response:
    cors = staff_api_cors_headers()
    if req.method == "OPTIONS":
        return https_fn.Response(status=204, headers=cors)
    data = req.get_json(silent=True) or {}
    if not authorize_staff_or_api_key(req, REMINDERS_API_KEY.value, data):
        return https_fn.Response(json.dumps({'error': 'Unauthorized'}), status=401, mimetype='application/json', headers=cors)
    dest = f"whatsapp:+52{normalize_phone(data.get('phone'))}"
    try:
        tw_args = {'from_': TWILIO_WHATSAPP_FROM, 'to': dest}
        if data.get('variables'):
            tw_args.update({'content_sid': data.get('template_sid'), 'content_variables': json.dumps(data.get('variables'))})
        else:
            tw_args.update({'body': data.get('message')})
        get_twilio_client().messages.create(**tw_args)
        return https_fn.Response(json.dumps({'status': 'success'}), status=200, mimetype='application/json', headers=cors)
    except Exception as e:
        return https_fn.Response(json.dumps({'error': str(e)}), status=500, mimetype='application/json', headers=cors)

@https_fn.on_request(secrets=ALL_SECRETS)
def migrate_claims_temp(req: https_fn.Request) -> https_fn.Response:
    import firebase_admin
    from firebase_admin import auth
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
        
    AUTHORIZED_USERS = {
        'lopezcarpio7@gmail.com': { 'role': 'admin', 'therapist': 'diana', 'displayName': 'Diana' },
        'sammygtz90@gmail.com': { 'role': 'therapist', 'therapist': 'sam', 'displayName': 'Sam' },
        'sanchezverooo21@gmail.com': { 'role': 'therapist', 'therapist': 'vero', 'displayName': 'Vero' },
        'yaritzajocgo@gmail.com': { 'role': 'receptionist', 'therapist': 'all', 'displayName': 'Yari' },
        'rodriguezd.danielrob@gmail.com': { 'role': 'admin', 'therapist': 'all', 'displayName': 'Daniel (Admin)' },
        'kaiteff@gmail.com': { 'role': 'admin', 'therapist': 'all', 'displayName': 'Kaiteff (Admin)' }
    }
    
    results = []
    for email, data in AUTHORIZED_USERS.items():
        try:
            user = auth.get_user_by_email(email)
            claims = { 'role': data['role'], 'therapist': data['therapist'] }
            auth.set_custom_user_claims(user.uid, claims)
            
            db.collection('users').document(user.uid).set({
                'email': email,
                'displayName': data['displayName'],
                'role': data['role'],
                'therapist': data['therapist'],
                'migratedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            results.append(f"✅ {email}: claims set {claims}")
        except Exception as e:
            results.append(f"❌ {email}: error {str(e)}")
            
    return https_fn.Response("\n".join(results), status=200, mimetype='text/plain')

@https_fn.on_call()
def manage_staff_user(req: https_fn.CallableRequest) -> dict:
    import firebase_admin
    from firebase_admin import auth
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
        
    caller_email = req.auth.token.get('email', '') if req.auth else ''
    is_admin_claim = req.auth and req.auth.token.get('role') == 'admin'
    is_legacy_admin = caller_email in ['lopezcarpio7@gmail.com', 'rodriguezd.danielrob@gmail.com']
    
    if not (is_admin_claim or is_legacy_admin):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo los administradores pueden gestionar usuarios del staff."
        )
        
    data = req.data
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    role = (data.get('role') or 'therapist').strip().lower()
    therapist_id = data.get('therapistId', '').strip().lower()
    password = data.get('password') or None
    
    if not email or not name:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Faltan datos obligatorios (email, nombre)."
        )

    # S-020: roles allowlist — evita role="" (AuthManager.can permissivo) o admin forjado
    allowed_roles = {'admin', 'therapist', 'receptionist'}
    if role not in allowed_roles:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message=f"Rol inválido. Use: {', '.join(sorted(allowed_roles))}."
        )
    if role == 'therapist' and therapist_id not in ('diana', 'sam', 'vero'):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="therapistId debe ser diana, sam o vero para rol therapist."
        )
    if not password:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Debes indicar un password temporal (ya no hay default público)."
        )
        
    try:
        try:
            user_record = auth.get_user_by_email(email)
            auth.update_user(user_record.uid, display_name=name)
            uid = user_record.uid
        except auth.UserNotFoundError:
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            uid = user_record.uid
            
        claims = {'role': role, 'therapist': therapist_id}
        auth.set_custom_user_claims(uid, claims)
        
        db.collection('users').document(uid).set({
            'email': email,
            'displayName': name,
            'role': role,
            'therapist': therapist_id,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        return {
            'success': True,
            'uid': uid,
            'message': 'Usuario gestionado exitosamente con Custom Claims.'
        }
    except Exception as e:
        print(f"Error en manage_staff_user: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Error interno al gestionar usuario: {str(e)}"
        )


# ── 6. Tareas Programadas Automáticas (Cloud Scheduler) ───────────────────

def _log_reminder_to_audit(doc_id, p_name, therapist, phone, appointment_date, action, message="", error=""):
    """Registra acción de recordatorio en audit_logs (bitácora WhatsApp de Yari)"""
    try:
        log_entry = {
            'timestamp': firestore.SERVER_TIMESTAMP,
            'action': action,
            'entityType': 'APPOINTMENT',
            'entityId': doc_id or 'unknown',
            'details': {
                'patientName': p_name,
                'therapist': therapist,
                'phone': phone or '⚠️ SIN NÚMERO',
                'appointmentDate': appointment_date,
                'message': message,
                'error': error
            },
            'userEmail': 'system',
            'userName': 'Robot Parláre',
            'userRole': 'system'
        }
        db.collection('audit_logs').add(log_entry)
    except Exception as log_e:
        print(f"⚠️ Error guardando en audit_log: {log_e}")

def execute_send_reminders():
    """Lógica centralizada para enviar recordatorios automáticos de citas para el día de mañana"""
    mx_now = datetime.now(MX_TZ)
    tomorrow_date, start_iso, end_iso = _tomorrow_firestore_bounds(mx_now)
    tomorrow = mx_now + timedelta(days=1)
    report_date = tomorrow.strftime('%Y-%m-%d')
    query = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()

    # Pre-cargar citas y recopilar profileIds/nombres
    appointments_list = []
    profile_ids = set()
    names = set()
    for doc in query:
        apt = doc.to_dict()
        appointments_list.append((doc.id, apt))
        p_id = apt.get('profileId') or apt.get('patientId')
        if p_id:
            profile_ids.add(p_id)
        if apt.get('name'):
            names.add(apt.get('name').strip().lower())

    phone_map = {}
    # Leer perfiles específicos por profileId
    for p_id in profile_ids:
        try:
            p_doc = db.collection('patientProfiles').document(p_id).get()
            if p_doc.exists:
                data = p_doc.to_dict()
                if data.get('phone') and data.get('wantsWhatsapp', True) and patient_accepts_automated_whatsapp(data):
                    phone_map[data.get('name', '').strip().lower()] = data
                    phone_map[p_id] = data
        except Exception as e:
            print(f"⚠️ Error al leer perfil {p_id}: {e}")

    # Complementar buscando por nombre para citas sin profileId (o no encontrados)
    for name in names:
        if name not in phone_map:
            try:
                docs = db.collection('patientProfiles').where('name', '==', name).stream()
                for doc in docs:
                    data = doc.to_dict()
                    if data.get('phone') and data.get('wantsWhatsapp', True) and patient_accepts_automated_whatsapp(data):
                        phone_map[name] = data
                        phone_map[doc.id] = data
            except Exception as e:
                print(f"⚠️ Error buscando perfil por nombre {name}: {e}")

    sent_count = 0
    skipped_count = 0
    skipped_details = []
    errors = []

    for doc_id, apt in appointments_list:
        if apt.get('isCancelled') or apt.get('confirmed'):
            skipped_details.append({
                'name': apt.get('name', ''),
                'therapist': apt.get('therapist', 'diana'),
                'reason': 'already_confirmed' if apt.get('confirmed') else 'cancelled',
                'date': apt.get('date', '')
            })
            continue
            
        p_name = apt.get('name', '')
        # Intentar buscar por profileId primero, luego por nombre
        p_id = apt.get('profileId') or apt.get('patientId')
        p_info = phone_map.get(p_id) if p_id else None
        if not p_info:
            p_info = phone_map.get(p_name.strip().lower())

        if not p_info:
            skipped_details.append({
                'name': p_name,
                'therapist': apt.get('therapist', 'diana'),
                'reason': 'no_profile_phone_optin_or_wantsWhatsapp',
                'date': apt.get('date', '')
            })
            _log_reminder_to_audit(
                doc_id, p_name, apt.get('therapist', 'diana'),
                None, apt.get('date', ''),
                'WHATSAPP_REMINDER_SKIPPED',
                message='⚠️ Paciente sin número, sin opt-in aceptado, o wantsWhatsapp=False',
                error='no_profile_phone_optin_or_wantsWhatsapp'
            )
            skipped_count += 1
            continue

        # 🛡️ GUARDIA: Evitar duplicados si ya se envió un recordatorio hoy
        last_sent = apt.get('lastReminderSentAt')
        if last_sent:
            try:
                if hasattr(last_sent, 'to_datetime'):
                    last_sent_dt = last_sent.to_datetime().astimezone(MX_TZ)
                else:
                    last_sent_dt = last_sent.astimezone(MX_TZ)
                if last_sent_dt.date() == mx_now.date():
                    skipped_details.append({
                        'name': p_name,
                        'therapist': apt.get('therapist', 'diana'),
                        'reason': 'already_sent_today',
                        'date': apt.get('date', '')
                    })
                    skipped_count += 1
                    continue
            except Exception as guard_e:
                print(f"⚠️ Error en guardia de duplicados: {guard_e}")

        try:
            dt = parse_mx_datetime(apt['date'])
            # 🛡️ VALIDACIÓN: Solo procesar si la fecha local de México es realmente mañana y está en horario
            if dt.date() != tomorrow.date() or not (8 <= dt.hour <= 20):
                skipped_details.append({
                    'name': p_name,
                    'therapist': apt.get('therapist', 'diana'),
                    'reason': 'date_mismatch_or_outside_business_hours',
                    'date': apt.get('date', '')
                })
                skipped_count += 1
                continue
                
            content_sid, content_vars = _reminder_content_for_apt(apt, dt)
            date_str = content_vars.get('1', '')
            hour_str = content_vars.get('2', '')
            therapist = content_vars.get('3', apt.get('therapist', 'Diana').title())
            
            dest = f"whatsapp:+{p_info.get('countryCode', '52')}{normalize_phone(p_info['phone'])}"
            
            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=dest,
                content_sid=content_sid,
                content_variables=json.dumps(content_vars)
            )
            
            # Registrar en Firestore
            db.collection('appointments').document(doc_id).update({
                'lastReminderSentAt': firestore.SERVER_TIMESTAMP,
                'lastReminderType': 'AUTO_CRON_EVAL' if apt.get('isEvaluation') else 'AUTO_CRON',
                'lastReminderBy': 'Robot Parláre'
            })
            
            # Registrar en Bitácora (Auditoría) para que Yari pueda verlo
            eval_line = f"\n📋 Etapa: *{content_vars.get('4')}*\n" if apt.get('isEvaluation') else ""
            msg_log = (
                f"🏥 *Recordatorio de Cita (8 AM)*\n\n"
                f"Hola, te recordamos la cita programada para "
                f"*{date_str}* a las *{hour_str}* con *{therapist}*."
                f"{eval_line}\n"
                f"Responde:\n"
                f"1️⃣ *OK* para confirmar\n"
                f"2️⃣ *NO* para cancelar\n"
                f"3️⃣ *RECEPCIÓN* para dudas\n\n"
                f"¡Te esperamos! 😊"
            )
            _log_reminder_to_audit(
                doc_id, p_name, therapist, dest, apt['date'],
                'WHATSAPP_REMINDER', message=msg_log
            )
                
            sent_count += 1
            print(f"✅ Recordatorio enviado a {p_name}")
        except Exception as e:
            errors.append(f"Error {p_name}: {str(e)}")
            print(f"⚠️ Error enviando a {p_name}: {e}")
            _log_reminder_to_audit(
                doc_id, p_name, apt.get('therapist', 'diana'),
                p_info.get('phone', '') if p_info else '⚠️ SIN NÚMERO',
                apt.get('date', ''),
                'WHATSAPP_REMINDER_ERROR',
                error=f"[8AM] {str(e)}"
            )

    return {
        'sent': sent_count,
        'skipped': skipped_count,
        'skipped_details': skipped_details,
        'errors': errors,
        'date': report_date
    }

@scheduler_fn.on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def send_reminders_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """Cronjob programado para ejecutarse todos los días a las 8:00 AM hora México"""
    result = execute_send_reminders()
    print(f"⏰ Cron de recordatorios ejecutado: {result}")

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["GET", "POST", "OPTIONS"]), secrets=ALL_SECRETS)
def send_reminders_api(req: https_fn.Request) -> https_fn.Response:
    """Endpoint HTTPS que permite disparar manualmente los recordatorios desde el panel de control"""
    cors = staff_api_cors_headers()
    if req.method == "OPTIONS":
        return https_fn.Response(status=204, headers=cors)

    if not authorize_staff_or_api_key(req, REMINDERS_API_KEY.value):
        return https_fn.Response(json.dumps({'error': 'Unauthorized'}), status=401, mimetype='application/json', headers=cors)

    try:
        task = (req.args.get('task') or 'morning').strip().lower()
        if task in ('diana_eval', 'diana_eval_followup', 'e2'):
            result = execute_send_diana_evaluation_followup()
        elif task in ('evening', 'evening_reminders'):
            result = execute_send_evening_reminders()
        else:
            result = execute_send_reminders()
        return https_fn.Response(json.dumps(result), status=200, mimetype='application/json', headers=cors)
    except Exception as e:
        return https_fn.Response(json.dumps({'error': str(e)}), status=500, mimetype='application/json', headers=cors)

@scheduler_fn.on_schedule(schedule="0 9 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def daily_summary_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """Cronjob programado para ejecutarse todos los días a las 9:00 AM hora México.
    Envía resúmenes individuales a las terapeutas y un reporte maestro a Recepción (Yari).
    """
    mx_now = datetime.now(MX_TZ)
    start_iso = f"{mx_now.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(mx_now + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    
    query = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
    by_therapist = {'diana': [], 'sam': [], 'vero': []}
    
    for doc in query:
        a = doc.to_dict()
        if a.get('isCancelled'): continue
        try:
            if parse_mx_datetime(a['date']).date() != mx_now.date(): continue
        except: continue
        t = str(a.get('therapist', 'diana')).strip().lower()
        # Do not dump unknown/non-enum therapist keys onto Diana's WhatsApp roster (PHI).
        if t in by_therapist:
            by_therapist[t].append(a)
        else:
            print(f"⚠️ daily_summary: therapist desconocido '{t}' — cita omitida del resumen individual")

    for t_key in by_therapist: by_therapist[t_key].sort(key=lambda x: x.get('date', ''))
    
    # 1. Enviar reportes a terapeutas individuales
    for t_key, list_apts in by_therapist.items():
        if not list_apts or not THERAPIST_PHONES.get(t_key): continue
        items = []
        for a in list_apts:
            try:
                dt = parse_mx_datetime(a['date'])
                if not (8 <= dt.hour <= 20): continue
                time_str = dt.strftime('%I:%M %p').lstrip('0').lower()
            except: time_str = "??:??"
            items.append(f"• {time_str}: {a.get('name')} ({'✅' if a.get('confirmed') else '⏳'})")
        
        try:
            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=f"whatsapp:+{THERAPIST_PHONES[t_key]}",
                content_sid='HX28a1f7c6ccbb2b507f9764b098c44779',
                content_variables=json.dumps({"1": t_key.capitalize(), "2": mx_now.strftime('%d/%b'), "3": "  /  ".join(items) if items else "Sin citas"})
            )
            print(f"✅ Reporte individual enviado a {t_key.capitalize()}")
        except Exception as e: print(f"❌ Error reporte {t_key}: {e}")

    # 2. Enviar Reporte Maestro a Yari (Recepción)
    yari_phone = THERAPIST_PHONES.get('reception')
    if yari_phone:
        try:
            master_items = []
            total_apts = 0
            for t_key in ['diana', 'sam', 'vero']:
                list_apts = by_therapist[t_key]
                t_section = f"*{t_key.upper()}*: "
                if not list_apts:
                    t_section += "Sin citas"
                else:
                    sub_items = []
                    for a in list_apts:
                        try:
                            dt = parse_mx_datetime(a['date'])
                            if not (8 <= dt.hour <= 20): continue
                            time = dt.strftime('%I:%M%p').lstrip('0').lower()
                        except:
                            time = "??:??"
                        status_icon = "✅" if a.get('confirmed') else "⏳"
                        sub_items.append(f"{time} {a.get('name')} {status_icon}")
                        total_apts += 1
                    t_section += " | ".join(sub_items)
                master_items.append(t_section)
            
            final_content = "  //  ".join(master_items) + f"  >> Total: {total_apts}"
            
            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=f"whatsapp:+{yari_phone}",
                content_sid='HX28a1f7c6ccbb2b507f9764b098c44779',
                content_variables=json.dumps({
                    "1": "Yari",
                    "2": mx_now.strftime('%d/%b'),
                    "3": final_content
                })
            )
            print("✅ Reporte Maestro enviado a Yari.")
        except Exception as e:
            print(f"❌ Error enviando reporte maestro a Yari: {e}")

def execute_send_evening_reminders():
    """Lógica 8 PM — segundo recordatorio a pacientes que recibieron el de 8 AM pero no confirmaron."""
    mx_now = datetime.now(MX_TZ)
    tomorrow_date, start_iso, end_iso = _tomorrow_firestore_bounds(mx_now)
    tomorrow = mx_now + timedelta(days=1)
    report_date = tomorrow.strftime('%Y-%m-%d')
    query = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()

    # Pre-cargar citas y recopilar profileIds/nombres
    appointments_list = []
    profile_ids = set()
    names = set()
    for doc in query:
        apt = doc.to_dict()
        appointments_list.append((doc.id, apt))
        p_id = apt.get('profileId') or apt.get('patientId')
        if p_id:
            profile_ids.add(p_id)
        if apt.get('name'):
            names.add(apt.get('name').strip().lower())

    phone_map = {}
    # Leer perfiles específicos por profileId
    for p_id in profile_ids:
        try:
            p_doc = db.collection('patientProfiles').document(p_id).get()
            if p_doc.exists:
                data = p_doc.to_dict()
                if data.get('phone') and data.get('wantsWhatsapp', True) and patient_accepts_automated_whatsapp(data):
                    phone_map[data.get('name', '').strip().lower()] = data
                    phone_map[p_id] = data
        except Exception as e:
            print(f"⚠️ Error al leer perfil {p_id}: {e}")

    # Complementar buscando por nombre para citas sin profileId (o no encontrados)
    for name in names:
        if name not in phone_map:
            try:
                docs = db.collection('patientProfiles').where('name', '==', name).stream()
                for doc in docs:
                    data = doc.to_dict()
                    if data.get('phone') and data.get('wantsWhatsapp', True) and patient_accepts_automated_whatsapp(data):
                        phone_map[name] = data
                        phone_map[doc.id] = data
            except Exception as e:
                print(f"⚠️ Error buscando perfil por nombre {name}: {e}")

    sent_count = 0
    skipped_count = 0
    errors = []

    for doc_id, apt in appointments_list:
        if apt.get('isCancelled') or apt.get('confirmed'):
            skipped_count += 1
            continue

        p_name = apt.get('name', '')
        # Intentar buscar por profileId primero, luego por nombre
        p_id = apt.get('profileId') or apt.get('patientId')
        p_info = phone_map.get(p_id) if p_id else None
        if not p_info:
            p_info = phone_map.get(p_name.strip().lower())
        if not p_info:
            _log_reminder_to_audit(
                doc_id, p_name, apt.get('therapist', 'diana'),
                None, apt.get('date', ''),
                'WHATSAPP_REMINDER_SKIPPED',
                message='⚠️ Sin número, opt-in no aceptado, o wantsWhatsapp=False',
                error='no_profile_phone_optin_or_wantsWhatsapp'
            )
            skipped_count += 1
            continue

        # 🛡️ Solo enviar si ya recibió el recordatorio de 8 AM hoy
        last_sent = apt.get('lastReminderSentAt')
        got_morning = False
        if last_sent:
            try:
                last_sent_dt = last_sent.to_datetime().astimezone(MX_TZ) if hasattr(last_sent, 'to_datetime') else last_sent.astimezone(MX_TZ)
                got_morning = last_sent_dt.date() == mx_now.date()
            except Exception as e:
                print(f"⚠️ Error leyendo lastReminderSentAt para {p_name}: {e}")

        if not got_morning:
            skipped_count += 1
            continue

        # 🛡️ GUARDIA: no enviar dos veces el de tarde
        last_evening = apt.get('lastEveningReminderSentAt')
        if last_evening:
            try:
                le_dt = last_evening.to_datetime().astimezone(MX_TZ) if hasattr(last_evening, 'to_datetime') else last_evening.astimezone(MX_TZ)
                if le_dt.date() == mx_now.date():
                    skipped_count += 1
                    continue
            except Exception as guard_e:
                print(f"⚠️ Error en guardia duplicado PM: {guard_e}")

        try:
            dt = parse_mx_datetime(apt['date'])
            if dt.date() != tomorrow.date() or not (8 <= dt.hour <= 20):
                skipped_count += 1
                continue

            content_sid, content_vars = _reminder_content_for_apt(apt, dt)
            date_str = content_vars.get('1', '')
            hour_str = content_vars.get('2', '')
            therapist = content_vars.get('3', apt.get('therapist', 'Diana').title())
            dest = f"whatsapp:+{p_info.get('countryCode', '52')}{normalize_phone(p_info['phone'])}"

            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=dest,
                content_sid=content_sid,
                content_variables=json.dumps(content_vars)
            )

            db.collection('appointments').document(doc_id).update({
                'lastEveningReminderSentAt': firestore.SERVER_TIMESTAMP,
                'lastReminderType': 'AUTO_CRON_PM_EVAL' if apt.get('isEvaluation') else 'AUTO_CRON_PM',
                'lastReminderBy': 'Robot Parláre'
            })

            eval_line = f"\n📋 Etapa: *{content_vars.get('4')}*\n" if apt.get('isEvaluation') else ""
            msg_log = (
                f"🌙 *Recordatorio de Tarde (8 PM)*\n\n"
                f"Hola, te recordamos la cita programada para "
                f"*{date_str}* a las *{hour_str}* con *{therapist}*."
                f"{eval_line}\n"
                f"Responde:\n"
                f"1️⃣ *OK* para confirmar\n"
                f"2️⃣ *NO* para cancelar\n"
                f"3️⃣ *RECEPCIÓN* para dudas\n\n"
                f"¡Te esperamos! 😊"
            )
            _log_reminder_to_audit(
                doc_id, p_name, therapist, dest, apt['date'],
                'WHATSAPP_REMINDER_PM', message=msg_log
            )

            sent_count += 1
            print(f"✅ Recordatorio tarde (8 PM) enviado a {p_name}")
        except Exception as e:
            errors.append(f"Error {p_name}: {str(e)}")
            print(f"⚠️ Error enviando PM a {p_name}: {e}")
            _log_reminder_to_audit(
                doc_id, p_name, apt.get('therapist', 'diana'),
                p_info.get('phone', ''), apt.get('date', ''),
                'WHATSAPP_REMINDER_ERROR',
                error=f"[8PM] {str(e)}"
            )

    return {'sent': sent_count, 'skipped': skipped_count, 'errors': errors, 'date': report_date, 'wave': 'evening'}

@scheduler_fn.on_schedule(schedule="0 20 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def send_evening_reminders_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """Cronjob a las 8:00 PM — Segundo recordatorio para pacientes que no confirmaron el de 8 AM"""
    result = execute_send_evening_reminders()
    print(f"🌙 Cron tarde de recordatorios ejecutado: {result}")

@scheduler_fn.on_schedule(schedule="0 21 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def send_diana_eval_followup_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """21:00 MX — Pregunta a Diana (E2) si hubo sesión de evaluación sin respuesta."""
    result = execute_send_diana_evaluation_followup()
    print(f"👩‍⚕️ Cron Diana evaluación ejecutado: {result}")

# ── Google Calendar sync (híbrido A+B: incremental L–S, nuke suave domingo) ──

SYNC_LOOKBACK_HOURS = 36  # citas editadas desde ayer tarde entran al incremental


def _calendar_week_bounds(mx_now):
    week_start = (mx_now - timedelta(days=mx_now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return week_start, week_end


def _fetch_week_appointments(week_start, week_end):
    query = (
        db.collection('appointments')
        .where('date', '>=', f"{week_start.strftime('%Y-%m-%d')}T00:00:00")
        .where('date', '<=', f"{week_end.strftime('%Y-%m-%d')}T23:59:59")
        .stream()
    )
    return [doc.to_dict() | {'_id': doc.id} for doc in query]


def _firestore_ts_to_mx(val):
    if val is None:
        return None
    if hasattr(val, 'timestamp'):
        return datetime.fromtimestamp(val.timestamp(), tz=MX_TZ)
    if isinstance(val, datetime):
        return val.astimezone(MX_TZ) if val.tzinfo else MX_TZ.localize(val)
    return None


def _apt_touched_since(apt, since_dt):
    if not apt.get('googleEventId'):
        return True
    updated = _firestore_ts_to_mx(apt.get('updatedAt'))
    if updated is None:
        return False
    return updated >= since_dt


def _gcal_color_id(t_key):
    if t_key == 'diana':
        return '4'
    if t_key == 'sam':
        return '7'
    return '3'


def _gcal_event_body(t_key, apt):
    dt_start = parse_mx_datetime(apt['date'])
    dt_end = dt_start + timedelta(hours=1)
    summary = ('✅ ' if apt.get('confirmed') else '') + apt.get('name', 'Cita')
    return {
        'summary': summary,
        'description': f"Terapeuta: {t_key.capitalize()}\nCosto: ${apt.get('cost', 0)}\n📱 Agenda Parláre",
        'start': {'dateTime': dt_start.isoformat(), 'timeZone': 'America/Mexico_City'},
        'end': {'dateTime': dt_end.isoformat(), 'timeZone': 'America/Mexico_City'},
        'colorId': _gcal_color_id(t_key),
        'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 5}]},
    }


@firestore_fn.on_document_written(
    document="appointments/{appointmentId}",
    memory=options.MemoryOption.MB_512,
    secrets=ALL_SECRETS,
)
def on_appointment_calendar_sync(
    event: firestore_fn.Event[firestore_fn.Change | None],
) -> None:
    """Sincroniza en tiempo real las citas con Google Calendar sin hacer reads extra."""
    change = event.data
    if change is None:
        return
        
    from trigger_utils import change_before_after
    before, after = change_before_after(change)
    
    appointment_id = event.params.get("appointmentId")
    if not appointment_id:
        return

    gcal = get_user_calendar_service()
    if not gcal:
        print('⚠️ on_appointment_calendar_sync: sin cliente Google Calendar OAuth')
        return

    # Check if deleted or cancelled
    is_deleted = after is None
    is_cancelled = after.get('isCancelled', False) if after else False
    
    # Check if we should delete from Calendar
    if is_deleted or is_cancelled:
        google_event_id = (before.get('googleEventId') if before else None) or (after.get('googleEventId') if after else None)
        therapist = (before.get('therapist') if before else None) or (after.get('therapist') if after else 'diana')
        cal_id = THERAPIST_CALENDARS.get(therapist.lower(), THERAPIST_CALENDARS['diana'])
        
        if google_event_id:
            try:
                gcal.events().delete(calendarId=cal_id, eventId=google_event_id).execute()
                print(f"🗑️ Eliminado de GCal: {appointment_id}")
            except Exception as e:
                err_str = str(e).lower()
                if '404' not in err_str and 'not found' not in err_str and 'gone' not in err_str:
                    print(f"⚠️ Error eliminando de GCal: {e}")
            
            # Remove googleEventId from Firestore if it was cancelled (not deleted)
            if not is_deleted and after.get('googleEventId'):
                try:
                    db.collection('appointments').document(appointment_id).update({
                        'googleEventId': firestore.DELETE_FIELD
                    })
                except Exception as e:
                    print(f"⚠️ Error quitando googleEventId: {e}")
        return

    # From here, it's an active appointment (created or updated)
    if not after:
        return
        
    therapist = after.get('therapist', 'diana').lower()
    cal_id = THERAPIST_CALENDARS.get(therapist, THERAPIST_CALENDARS['diana'])
    
    # Check if relevant fields changed
    if before:
        relevant_fields = ['date', 'therapist', 'name', 'confirmed', 'isCancelled', 'cost']
        changed = any(before.get(f) != after.get(f) for f in relevant_fields)
        if not changed and after.get('googleEventId'):
            # No relevant change, and event already created
            return
            
    body = _gcal_event_body(therapist, after)
    google_event_id = after.get('googleEventId')
    
    try:
        if google_event_id:
            try:
                gcal.events().patch(calendarId=cal_id, eventId=google_event_id, body=body).execute()
                print(f"🔄 Actualizado en GCal: {appointment_id}")
            except Exception as e:
                err_low = str(e).lower()
                if '404' in err_low or 'not found' in err_low:
                    created = gcal.events().insert(calendarId=cal_id, body=body).execute()
                    db.collection('appointments').document(appointment_id).update({'googleEventId': created['id']})
                    print(f"➕ Re-creado en GCal (404 anterior): {appointment_id}")
                else:
                    print(f"⚠️ Error patch en GCal: {e}")
        else:
            created = gcal.events().insert(calendarId=cal_id, body=body).execute()
            db.collection('appointments').document(appointment_id).update({'googleEventId': created['id']})
            print(f"➕ Creado en GCal: {appointment_id}")
    except Exception as e:
        print(f"⚠️ Error creando en GCal: {e}")

# ── 7. Gatillos de Base de Datos (Firestore Triggers) ─────────────────────

# ── 8. Release Quiet‑Hours Offers ────────────────────────────────────────
@scheduler_fn.on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def release_quiet_hours_offers(event: scheduler_fn.ScheduledEvent) -> None:
    """Procesa cancelaciones acumuladas durante Quiet Hours (9 PM‑8 AM)."""
    from space_optimizer import process_quiet_hours_pending_item

    pending = db.collection('quiet_hours_pending').stream()
    twilio_client = get_twilio_client()

    count = 0
    for doc in pending:
        if process_quiet_hours_pending_item(
            doc,
            db,
            twilio_client,
            TWILIO_WHATSAPP_FROM,
        ):
            count += 1

    logger.info(f"✅ Liberadas {count} cancelaciones de Quiet Hours.")

@scheduler_fn.on_schedule(schedule="*/10 * * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def collaborative_approvals_expiration_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """Cronjob cada 10 min — Expira aprobaciones colaborativas (Autopilot) que lleven > 1 hora."""
    from space_optimizer import check_expired_collaborative_approvals
    count = check_expired_collaborative_approvals()
    if count > 0:
        print(f"⏳ Expiradas {count} aprobaciones colaborativas (alerta inteligente enviada).")

@firestore_fn.on_document_created(document="patientProfiles/{patientId}", secrets=ALL_SECRETS)
def on_patient_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    try:
        snap = event.data
        if not snap: return
        data = snap.to_dict()
        if not data: return
        
        phone = data.get('phone')
        wants_wa = data.get('wantsWhatsapp', True)
        if not phone or not wants_wa: return
        
        name = data.get('name', 'Paciente').strip()
        first_name = name.split(' ')[0] if name else 'Paciente'
        dest = f"whatsapp:+52{normalize_phone(phone)}"
        
        get_twilio_client().messages.create(
            from_=TWILIO_WHATSAPP_FROM, to=dest,
            content_sid=WELCOME_OPTIN_CONTENT_SID,
            content_variables=json.dumps({"1": first_name})
        )
        snap.reference.update({
            'recurrentOptIn': 'pending',
            'recurrentOptInUpdatedAt': firestore.SERVER_TIMESTAMP,
            'wantsWhatsapp': False,
        })
        print(f"🎉 bienvenida_con_optin enviado a: {name} (recurrentOptIn=pending)")
    except Exception as e:
        print(f"❌ Error en trigger de bienvenida: {e}")

# Recibos digitales de reembolso (Fase A — Paso 2)
from receipt_generator import on_appointment_receipt_trigger  # noqa: F401, E402

# Optimizador de espacios (Fase B)
from space_optimizer import (
    on_appointment_cancelled_trigger,
    on_quiet_hours_pending_written,
    on_collaborative_approval_written,
)  # noqa: F401, E402

# SaaS Modelo A — backfill clinicId
from clinic_saas import backfillClinicId  # noqa: F401, E402

