"""
Fase C — Consentimiento WhatsApp (Opt-In / Opt-Out)
Template Twilio: bienvenida_con_optin (botones optin_yes / optin_no)
"""
from __future__ import annotations

import os

from firebase_admin import firestore

OPTIN_PENDING = "pending"
OPTIN_ACCEPTED = "accepted"
OPTIN_REJECTED = "rejected"

OPTIN_PAYLOAD_YES = "optin_yes"
OPTIN_PAYLOAD_NO = "optin_no"

# Template Twilio: bienvenida_con_optin (Meta en revisión — listo al aprobar)
BIENVENIDA_CON_OPTIN_TEMPLATE_NAME = "bienvenida_con_optin"
BIENVENIDA_CON_OPTIN_CONTENT_SID = "HX08f74d9b520b85acfbf9e678e434b1f6"

WELCOME_OPTIN_CONTENT_SID = os.environ.get(
    "WELCOME_OPTIN_CONTENT_SID",
    BIENVENIDA_CON_OPTIN_CONTENT_SID,
)


def parse_interactive_payload(req_form) -> str | None:
    """Lee payload de botones interactivos de Twilio WhatsApp."""
    candidates = [
        req_form.get("ButtonPayload"),
        req_form.get("button_payload"),
        req_form.get("ListId"),
        req_form.get("list_id"),
    ]
    for raw in candidates:
        if raw:
            value = str(raw).strip().lower()
            if value in (OPTIN_PAYLOAD_YES, OPTIN_PAYLOAD_NO):
                return value
    body = (req_form.get("Body") or "").strip().lower()
    if body in (OPTIN_PAYLOAD_YES, OPTIN_PAYLOAD_NO):
        return body
    return None


def patient_accepts_automated_whatsapp(profile: dict) -> bool:
    if not profile.get("wantsWhatsapp", True):
        return False
    return profile.get("recurrentOptIn", OPTIN_PENDING) == OPTIN_ACCEPTED


def update_patient_optin(db, patient_id: str, status: str) -> None:
    db.collection("patientProfiles").document(patient_id).update(
        {
            "recurrentOptIn": status,
            "recurrentOptInUpdatedAt": firestore.SERVER_TIMESTAMP,
        }
    )


def create_reception_optout_alert(
    db,
    patient: dict,
    from_whatsapp: str = "",
) -> str:
    """Crea alerta en /reception_alerts para seguimiento manual de Yari."""
    alert = {
        "type": "whatsapp_optout",
        "status": "open",
        "patientId": patient.get("id", ""),
        "patientName": patient.get("name", "Paciente"),
        "phone": patient.get("phone", ""),
        "countryCode": patient.get("countryCode", "52"),
        "therapist": patient.get("therapist", "diana"),
        "recurrentOptIn": OPTIN_REJECTED,
        "source": "bienvenida_con_optin",
        "fromWhatsApp": from_whatsapp,
        "message": (
            f"{patient.get('name', 'Paciente')} rechazó recordatorios automáticos por WhatsApp. "
            "Dar seguimiento manual."
        ),
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    _ref = db.collection("reception_alerts").add(alert)
    return _ref[1].id


def handle_optin_interactive(
    db,
    patients: list[dict],
    payload: str,
    from_num: str,
) -> str | None:
    """
    Procesa optin_yes / optin_no. Retorna mensaje de respuesta al paciente o None.
    """
    if not patients:
        return (
            "No encontramos tu expediente. Contacta a Recepción: "
            "https://wa.me/523315196702"
        )

    if payload == OPTIN_PAYLOAD_YES:
        for p in patients:
            update_patient_optin(db, p["id"], OPTIN_ACCEPTED)
        print(f"✅ Opt-in aceptado: {[p['name'] for p in patients]}")
        return (
            "¡Gracias! ✅ Activaste los recordatorios de WhatsApp de Parláre. "
            "Te escribiremos solo para confirmar tus citas."
        )

    if payload == OPTIN_PAYLOAD_NO:
        for p in patients:
            update_patient_optin(db, p["id"], OPTIN_REJECTED)
            try:
                alert_id = create_reception_optout_alert(db, p, from_num)
                print(f"📋 Alerta recepción {alert_id} — opt-out: {p.get('name')}")
            except Exception as exc:
                print(f"⚠️ Error creando reception_alerts: {exc}")
        return (
            "Entendido. No te enviaremos recordatorios automáticos por WhatsApp. "
            "Para cualquier duda, Recepción está aquí: https://wa.me/523315196702"
        )

    return None
