"""
Plantillas WhatsApp aprobadas (Twilio Content API) — Parláre.
Actualizar aquí y en js/config/whatsappTemplates.js
"""
from __future__ import annotations

import os

# --- Existentes (referencia) ---
RECORDATORIO_CRON_SID = "HX100149d5295d1839864ad33cc9e73567"
COPY_INFO_PROXIMA_CITA_SID = "HXe500a927cfbef3321fc0ba7ae7aa86d7"
POST_CONFIRM_SID = "HX079c41d2222032d6c3ab41f44c7272f7"
AGENDA_DIA_SID = "HX28a1f7c6ccbb2b507f9764b098c44779"

BIENVENIDA_CON_OPTIN_SID = os.environ.get(
    "WELCOME_OPTIN_CONTENT_SID",
    "HX08f74d9b520b85acfbf9e678e434b1f6",
)

# --- Aprobadas 9 jul 2026 — Evaluaciones + motivo cancelación ---
MOTIVO_CANCELACION_SID = os.environ.get(
    "MOTIVO_CANCELACION_SID",
    "HX8fa5239da35438daf405b24a6297e7d2",
)
RECORDATORIO_EVALUACION_SID = os.environ.get(
    "RECORDATORIO_EVALUACION_SID",
    "HXd5b11512c2329c5373116a47d0e28398",
)
DIANA_SESION_EVALUACION_SID = os.environ.get(
    "DIANA_SESION_EVALUACION_SID",
    "HXd4336feb9605f3bbea6b55fc3ad8c0da",
)
DIANA_SIGUIENTE_ETAPA_SID = os.environ.get(
    "DIANA_SIGUIENTE_ETAPA_SID",
    "HXfd9918421f300da29dbaa9a8c63cd172",
)

CANCEL_REASON_PAYLOADS = {
    "cancel_enfermedad": "enfermedad",
    "cancel_viaje": "viaje",
    "cancel_otro": "otro",
}

DIANA_EVAL_PAYLOADS = frozenset({
    "eval_yes", "eval_no", "eval_extra", "eval_entrega",
})
