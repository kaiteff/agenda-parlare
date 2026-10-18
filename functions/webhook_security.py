"""
Validación de seguridad para webhooks y APIs HTTP internas — Parláre.
"""
from __future__ import annotations

import os

from firebase_admin import auth
from twilio.request_validator import RequestValidator

# Staff con acceso a APIs manuales WhatsApp (alineado con firestore.rules isSuper + terapeutas)
STAFF_API_EMAILS = frozenset({
    'rodriguezd.danielrob@gmail.com',
    'lopezcarpio7@gmail.com',
    'yaritzajocgo@gmail.com',
    'kaiteff@gmail.com',
    'sammygtz90@gmail.com',
    'sanchezverooo21@gmail.com',
})

STAFF_API_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}


def _request_url(req) -> str:
    """URL pública que Twilio firmó (Cloud Functions usa X-Forwarded-*)."""
    override = os.environ.get('TWILIO_WEBHOOK_URL', '').strip()
    if override:
        return override
    proto = req.headers.get('X-Forwarded-Proto') or getattr(req, 'scheme', 'https')
    host = req.headers.get('X-Forwarded-Host') or req.headers.get('Host') or getattr(req, 'host', '')
    path = getattr(req, 'path', '') or '/'
    url = f'{proto}://{host}{path}'
    qs = getattr(req, 'query_string', None)
    if qs:
        url = f'{url}?{qs.decode("utf-8") if isinstance(qs, bytes) else qs}'
    return url


def _twilio_form_params(req) -> dict:
    params = {}
    try:
        for key in req.form:
            params[key] = req.form.get(key)
    except Exception:
        pass
    return params


def validate_twilio_webhook(req, auth_token: str) -> bool:
    """Verifica X-Twilio-Signature. En emulador local se omite si FUNCTIONS_EMULATOR=true."""
    if os.environ.get('FUNCTIONS_EMULATOR', '').lower() == 'true':
        return True
    signature = req.headers.get('X-Twilio-Signature', '')
    if not signature or not auth_token:
        return False
    validator = RequestValidator(auth_token)
    return validator.validate(_request_url(req), _twilio_form_params(req), signature)


def verify_staff_bearer(req) -> bool:
    """True si Authorization: Bearer <Firebase ID token> de un email del staff."""
    header = req.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return False
    token = header[7:].strip()
    if not token:
        return False
    try:
        decoded = auth.verify_id_token(token)
        email = (decoded.get('email') or '').strip().lower()
        return email in STAFF_API_EMAILS
    except Exception:
        return False


def authorize_staff_or_api_key(req, api_key_secret: str | None, body: dict | None = None) -> bool:
    """Firebase Auth staff (preferido) o clave legacy en query/body (Secret Manager)."""
    if verify_staff_bearer(req):
        return True
    if not api_key_secret:
        return False
    body = body or {}
    key = req.args.get('key') or body.get('key')
    return bool(key) and key == api_key_secret


def sanitize_whatsapp_user_text(text, max_len: int = 500) -> str:
    """Texto libre del papá: sin controles ASCII, longitud acotada."""
    if not text:
        return ''
    cleaned = ''.join(ch for ch in str(text) if ch == '\n' or ch == '\t' or ord(ch) >= 32)
    return cleaned.strip()[:max_len]


def mask_phone_for_log(phone: str) -> str:
    digits = ''.join(c for c in str(phone) if c.isdigit())
    if len(digits) >= 4:
        return f'***{digits[-4:]}'
    return '***'


def staff_api_cors_headers() -> dict:
    return dict(STAFF_API_CORS_HEADERS)
