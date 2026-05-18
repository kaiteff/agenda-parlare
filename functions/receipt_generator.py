"""
Generador automático de Recibos Digitales de Reembolso (Fase A — Paso 2).

Dispara al marcar una cita como pagada (`isPaid`) si el paciente tiene
`reimbursementReceipt.autoGenerate` (o legacy `autoReceipt`) activo.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import firebase_admin
import pytz
from firebase_admin import firestore, storage
from firebase_functions import firestore_fn, options
from jinja2 import Environment, FileSystemLoader, select_autoescape
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

MX_TZ = pytz.timezone("America/Mexico_City")
CLINIC_NAME = os.environ.get("RECEIPT_CLINIC_NAME", "Parláre")
DEFAULT_CONCEPT = os.environ.get(
    "RECEIPT_CONCEPT",
    "Tratamiento de Intervención Psicológica",
)
LOGO_URL = os.environ.get("RECEIPT_LOGO_URL", "").strip()
STORAGE_PREFIX = "recibos_pacientes"
TEMPLATE_DIR = Path(__file__).parent / "templates"

THERAPIST_LABELS = {
    "diana": "Lic. Diana López Carpió",
    "sam": "Lic. Samantha Gutiérrez",
    "vero": "Lic. Verónica Sánchez",
}


def _get_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    return firestore.client()


def _get_bucket():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    return storage.bucket()


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


def _truthy(value) -> bool:
    return value is True or value == "true" or value == 1


def patient_wants_auto_receipt(patient: dict) -> bool:
    if _truthy(patient.get("autoReceipt")):
        return True
    rr = patient.get("reimbursementReceipt") or {}
    return _truthy(rr.get("autoGenerate"))


def patient_tutor_name(patient: dict) -> str:
    rr = patient.get("reimbursementReceipt") or {}
    return (
        (rr.get("tutorName") or "").strip()
        or (patient.get("parentName") or "").strip()
        or "—"
    )


def became_paid(before: dict | None, after: dict | None) -> bool:
    if not after:
        return False
    if after.get("isCancelled"):
        return False
    if not _truthy(after.get("isPaid")):
        return False
    if before and _truthy(before.get("isPaid")):
        return False
    if after.get("receiptStoragePath") or after.get("receiptPdfUrl"):
        return False
    return True


def find_patient_by_name(patient_name: str) -> tuple[str, dict] | None:
    trimmed = (patient_name or "").strip()
    if not trimmed:
        return None
    docs = list(
        _get_db()
        .collection("patientProfiles")
        .where("name", "==", trimmed)
        .limit(1)
        .stream()
    )
    if not docs:
        return None
    doc = docs[0]
    return doc.id, doc.to_dict() or {}


def load_clinic_therapist_profile(therapist_key: str) -> dict:
    key = (therapist_key or "diana").strip().lower()
    try:
        snap = _get_db().collection("settings").document("clinicConfig").get()
        if not snap.exists:
            return {}
        base_costs = (snap.to_dict() or {}).get("baseCosts") or {}
        return base_costs.get(key) or {}
    except Exception as exc:
        logger.warning("No se pudo cargar clinicConfig: %s", exc)
        return {}


def therapist_display_name(therapist_key: str, profile: dict) -> str:
    custom = (profile.get("displayName") or profile.get("fullName") or "").strip()
    if custom:
        return custom
    return THERAPIST_LABELS.get(
        (therapist_key or "diana").strip().lower(),
        (therapist_key or "Terapeuta").strip().title(),
    )


def format_currency(amount) -> str:
    try:
        value = float(amount)
    except (TypeError, ValueError):
        value = 0.0
    return f"${value:,.2f} MXN"


def session_date_label(date_str: str) -> tuple[str, str]:
    """Devuelve (etiqueta legible, slug YYYY-MM-DD para el nombre del archivo)."""
    dt = _parse_mx_datetime(date_str)
    meses = [
        "",
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ]
    label = f"{dt.day} de {meses[dt.month]} de {dt.year}"
    return label, dt.strftime("%Y-%m-%d")


def _load_logo_data_uri() -> str:
    if not LOGO_URL:
        return ""
    try:
        import base64
        import urllib.request

        with urllib.request.urlopen(LOGO_URL, timeout=8) as resp:
            raw = resp.read()
        content_type = "image/png"
        if LOGO_URL.lower().endswith(".jpg") or LOGO_URL.lower().endswith(".jpeg"):
            content_type = "image/jpeg"
        elif LOGO_URL.lower().endswith(".svg"):
            content_type = "image/svg+xml"
        b64 = base64.b64encode(raw).decode("ascii")
        return f"data:{content_type};base64,{b64}"
    except Exception as exc:
        logger.warning("Logo no disponible (%s): %s", LOGO_URL, exc)
        return ""


def render_receipt_html(context: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("receipt.html")
    return template.render(**context)


def html_to_pdf_bytes(html: str) -> bytes:
    buffer = BytesIO()
    result = pisa.CreatePDF(html, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"Error generando PDF (código {result.err})")
    return buffer.getvalue()


def upload_pdf_and_get_url(
    patient_id: str, date_slug: str, pdf_bytes: bytes
) -> tuple[str, str]:
    storage_path = f"{STORAGE_PREFIX}/{patient_id}/{date_slug}.pdf"
    bucket = _get_bucket()
    blob = bucket.blob(storage_path)
    token = str(uuid.uuid4())
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_string(pdf_bytes, content_type="application/pdf")
    encoded_path = quote(storage_path, safe="")
    download_url = (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
        f"{encoded_path}?alt=media&token={token}"
    )
    return storage_path, download_url


def generate_and_store_receipt(
    appointment_id: str, appointment: dict
) -> dict | None:
    patient_name = appointment.get("name", "")
    found = find_patient_by_name(patient_name)
    if not found:
        logger.info("Recibo omitido: sin perfil para '%s'", patient_name)
        return None

    patient_id, patient = found
    if not patient_wants_auto_receipt(patient):
        logger.info("Recibo omitido: autoGenerate desactivado (%s)", patient_id)
        return None

    therapist_key = (appointment.get("therapist") or "diana").strip().lower()
    therapist_profile = load_clinic_therapist_profile(therapist_key)
    session_label, date_slug = session_date_label(appointment.get("date", ""))
    amount = appointment.get("cost", therapist_profile.get("cost", 0))
    issued_at = datetime.now(MX_TZ).strftime("%d/%m/%Y %H:%M")

    context = {
        "clinic_name": CLINIC_NAME,
        "logo_data_uri": _load_logo_data_uri(),
        "receipt_id": f"{appointment_id[:8].upper()}-{date_slug}",
        "issued_at": issued_at,
        "session_date": session_label,
        "concept": DEFAULT_CONCEPT,
        "patient_name": patient_name,
        "tutor_name": patient_tutor_name(patient),
        "amount_formatted": format_currency(amount),
        "therapist_name": therapist_display_name(therapist_key, therapist_profile),
        "professional_license": (
            therapist_profile.get("professionalLicense") or "—"
        ).strip() or "—",
        "graduation_institution": (
            therapist_profile.get("graduationInstitution") or "—"
        ).strip() or "—",
    }

    html = render_receipt_html(context)
    pdf_bytes = html_to_pdf_bytes(html)
    storage_path, download_url = upload_pdf_and_get_url(
        patient_id, date_slug, pdf_bytes
    )

    _get_db().collection("appointments").document(appointment_id).update(
        {
            "receiptPdfUrl": download_url,
            "receiptStoragePath": storage_path,
            "receiptGeneratedAt": firestore.SERVER_TIMESTAMP,
        }
    )

    logger.info(
        "Recibo generado: paciente=%s cita=%s path=%s",
        patient_id,
        appointment_id,
        storage_path,
    )
    return {
        "patientId": patient_id,
        "storagePath": storage_path,
        "downloadUrl": download_url,
    }


@firestore_fn.on_document_written(
    document="appointments/{appointmentId}",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
)
def on_appointment_receipt_trigger(
    event: firestore_fn.Event[firestore_fn.Change | None],
) -> None:
    """Genera PDF de reembolso cuando una cita pasa a pagada."""
    change = event.data
    if change is None:
        return

    before = change.before.to_dict() if change.before.exists else None
    after = change.after.to_dict() if change.after.exists else None

    if not became_paid(before, after):
        return

    appointment_id = event.params.get("appointmentId", "")
    if not appointment_id:
        return

    try:
        generate_and_store_receipt(appointment_id, after)
    except Exception as exc:
        logger.exception(
            "Error generando recibo para cita %s: %s", appointment_id, exc
        )
