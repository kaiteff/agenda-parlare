"""
whatsapp_webhook.py
Versión Final Premium Parlare - V7.8 (Identidad Digital Completa)
"""

import json
import os
import sys
import re
import base64
from datetime import datetime, timedelta
import pytz
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

# ── Config ───────────────────────────────────────────────────────────
IS_RENDER = os.environ.get('RENDER', False)
MX_TZ = pytz.timezone('America/Mexico_City')

if IS_RENDER:
    config = {
        'twilio_sid': os.environ.get('TWILIO_SID'),
        'twilio_token': os.environ.get('TWILIO_TOKEN'),
        'twilio_whatsapp_from': os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+16066451055')
    }
else:
    with open(os.path.join(os.path.dirname(__file__), 'whatsapp_config.json'), 'r') as f:
        config = json.load(f)

# ── Firebase ─────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    if IS_RENDER:
        key_json = json.loads(base64.b64decode(os.environ.get('FIREBASE_SERVICE_KEY_B64')).decode('utf-8'))
        cred = credentials.Certificate(key_json)
    else:
        cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), 'firebase_service_key.json'))
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Twilio ───────────────────────────────────────────────────────────
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── Google APIs ──────────────────────────────────────────────────────
SHEET_CONFIG = {
    'spreadsheets': {
        'diana': '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
        'sam': '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg',
        'vero': '1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc'
    },
    'targetSheetName': 'App_Data'
}

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar'
]

def get_google_services():
    try:
        if IS_RENDER:
            key_json = json.loads(base64.b64decode(os.environ.get('FIREBASE_SERVICE_KEY_B64')).decode('utf-8'))
        else:
            with open(os.path.join(os.path.dirname(__file__), 'firebase_service_key.json'), 'r') as f:
                key_json = json.load(f)
        
        creds = service_account.Credentials.from_service_account_info(key_json, scopes=SCOPES)
        sheets_service = build('sheets', 'v4', credentials=creds)
        calendar_service = build('calendar', 'v3', credentials=creds)
        return sheets_service, calendar_service
    except Exception as e:
        print(f"Error initializing Google services: {e}")
        return None, None

sheets_service, calendar_service = get_google_services()
twilio_client = Client(config.get('twilio_sid'), config.get('twilio_token'))

# ── Google Calendar (OAuth - Cuenta Admin) ───────────────────────────────
def get_user_calendar_service():
    """
    Construye un cliente de Google Calendar usando el OAuth Refresh Token
    de la cuenta Admin (Daniel). Independiente del usuario que tenga la app abierta.
    Requiere las variables de entorno: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
    """
    try:
        client_id     = os.environ.get('GOOGLE_CLIENT_ID')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
        refresh_token = os.environ.get('GOOGLE_REFRESH_TOKEN')

        if not all([client_id, client_secret, refresh_token]):
            print("⚠️ get_user_calendar_service: Faltan variables GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN")
            return None

        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        # Forzar refresh para obtener un access_token válido
        creds.refresh(Request())
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"❌ Error construyendo user calendar service: {e}")
        return None

# IDs de calendarios por terapeuta (mismos que el frontend)
THERAPIST_CALENDARS = {
    'diana': '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
    'vero':  'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
    'sam':   '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
}

# ── Timezone Helper ─────────────────────────────────────────────────
def parse_mx_datetime(date_str):
    """
    Parsea correctamente las fechas de Firestore como hora local de México.
    Si el string tiene 'Z', se interpreta como UTC y se convierte a México.
    Si no tiene 'Z', se asume que es una fecha 'naive' que ya representa hora de México.
    """
    raw = str(date_str).strip()
    
    if raw.endswith('Z'):
        # Es UTC, reemplazar por offset para que fromisoformat lo entienda
        raw = raw.replace('Z', '+00:00')
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(MX_TZ)
        
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = MX_TZ.localize(dt)  # Decirle explícitamente: es hora de México
    else:
        dt = dt.astimezone(MX_TZ)
    return dt

# ── Google Sync Helpers ─────────────────────────────────────────────
def update_google_sheet(appointment, status):
    if not sheets_service: return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        spreadsheet_id = SHEET_CONFIG['spreadsheets'].get(therapist)
        if not spreadsheet_id: return

        dt = parse_mx_datetime(appointment['date'])
        date_str = dt.strftime('%d/%m/%Y')
        time_str = dt.strftime('%I:%M %p')

        values = [[
            date_str,
            time_str,
            appointment.get('name', 'Paciente'),
            0, # Amount 0 for attendance logs
            status,
            datetime.now(MX_TZ).isoformat(),
            dt.hour,
            0, # Clinic Fee
            0  # Therapist Income
        ]]
        
        range_name = f"{SHEET_CONFIG['targetSheetName']}!A:I"
        sheets_service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption='USER_ENTERED',
            body={'values': values}
        ).execute()
        print(f"✅ Sync Sheet OK: {appointment.get('name')} -> {status}")
    except Exception as e:
        print(f"❌ Error Sync Sheet: {e}")

THERAPIST_CALENDARS = {
    'diana': '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
    'vero': 'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
    'sam': '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
}

def update_google_calendar(appointment, status_text):
    if not calendar_service or not appointment.get('googleEventId'): return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        target_cal_id = THERAPIST_CALENDARS.get(therapist, THERAPIST_CALENDARS['diana'])
            
        print(f"📡 Sync Calendar: Usando calendario ID: {target_cal_id} (Terapeuta: {therapist})")

        # 2. Obtener el evento
        event = calendar_service.events().get(
            calendarId=target_cal_id,
            eventId=appointment['googleEventId']
        ).execute()

        # 3. Actualizar descripción
        desc = event.get('description', '')
        
        # Limpiar menciones previas de confirmación/cancelación para evitar duplicados
        desc = desc.replace("\n✅ Asistencia confirmada vía WhatsApp", "")
        desc = desc.replace("\n❌ CANCELADO vía WhatsApp", "")

        if status_text == "CONFIRMADO":
            desc += "\n✅ Asistencia confirmada vía WhatsApp"
        elif status_text == "CANCELADO":
            desc += "\n❌ CANCELADO vía WhatsApp"
            # Opcional: Mantener color gris para cancelaciones si lo prefieres, pero solo si es estrictamente necesario.
            # Por ahora lo dejamos como estaba antes de mi intervención.
            event['colorId'] = '8'
        
        event['description'] = desc
        calendar_service.events().update(
            calendarId=target_cal_id, 
            eventId=appointment['googleEventId'],
            body=event
        ).execute()
        print(f"✅ Sync Calendar OK: {appointment.get('name')}")
    except Exception as e:
        print(f"❌ Error Sync Calendar: {e}")

def notify_receptionist(patient_name, action_type, date_str="Mañana", hour_str="", therapist="Diana", phone=""):
    """
    Notifica a Yari (Recepción) sobre cancelaciones vía WhatsApp.
    USA PLANTILLA OFICIAL DE META (content_sid) para garantizar entrega
    sin depender de la ventana de conversación activa de 24 horas.
    """
    try:
        # Número de Yari (Central Parláre)
        yari_num = "whatsapp:+523315196702"
        # Plantilla oficial aprobada por Meta (misma del reporte diario)
        TEMPLATE_SID = 'HX28a1f7c6ccbb2b507f9764b098c44779'

        icon = "❌" if "CANCELAR" in action_type.upper() else "📞"

        # Crear link directo de WhatsApp para que Yari responda al paciente
        wa_link = f"wa.me/{phone}" if phone else "No disponible"

        # Armar el contenido de la variable {{3}} de la plantilla
        # Formato compacto para no exceder el límite de caracteres de la variable
        detalle = (
            f"{icon} CANCELACION de {patient_name}  "
            f"Cita: {date_str} {hour_str}  "
            f"Terapeuta: {therapist}  "
            f"Escribir al paciente: {wa_link}  "
            f"Dar seguimiento para reagendar o cobro segun politica."
        )

        twilio_client.messages.create(
            from_=config.get('twilio_whatsapp_from'),
            to=yari_num,
            content_sid=TEMPLATE_SID,
            content_variables=json.dumps({
                "1": "Yari",
                "2": date_str,
                "3": detalle
            })
        )
        print(f"📩 Notificación (plantilla) enviada a Yari para cancelación de: {patient_name}")
    except Exception as e:
        print(f"⚠️ Error notificando a Yari: {e}")

# ── Helpers ──────────────────────────────────────────────────────────
def normalize_phone(phone):
    """Limpia el teléfono dejando solo los dígitos significativos (normalmente los últimos 10)"""
    digits = re.sub(r'\D', '', str(phone))
    # Si es un número de México con prefijos redundantes de Twilio/Meta, los limpiamos
    if len(digits) > 10:
        if digits.startswith('521'): digits = digits[3:]
        elif digits.startswith('52'): digits = digits[2:]
        # Para otros países, si mide más de 10, intentamos quedarnos con los últimos 10 
        # (Ajustar si tienen pacientes con números de distinta longitud)
    return digits[-10:] if len(digits) >= 10 else digits

def find_patients_by_identifier(phone, bsuid=None):
    found = []
    found_ids = set()
    
    # 1. Intentar buscar por BSUID primero (identificador único de WhatsApp)
    if bsuid:
        print(f"🔍 Buscando paciente por BSUID: {bsuid}")
        docs = db.collection('patientProfiles').where('whatsappBSUID', '==', bsuid).stream()
        for doc in docs:
            if doc.id not in found_ids:
                d = doc.to_dict()
                if d.get('isActive', True) is not False:
                    found.append({'id': doc.id, 'name': d.get('name', '')})
                    found_ids.add(doc.id)
        
        if found:
            print(f"✅ Pacientes encontrados por BSUID: {len(found)}")
            return found

    # 2. Si no hay BSUID o no se encontró, buscar por teléfono
    if phone:
        norm = normalize_phone(phone)
        print(f"🔍 Buscando paciente de forma optimizada para: {norm}")
        
        # Formatos comunes en los que podría estar guardado
        search_variants = [norm, f"+52{norm}", f"52{norm}", f"+521{norm}", f"521{norm}"]
        
        docs_to_update = []
        for variant in search_variants:
            # Buscamos directamente por el campo 'phone'
            docs = db.collection('patientProfiles').where('phone', '==', variant).stream()
            for doc in docs:
                if doc.id not in found_ids:
                    d = doc.to_dict()
                    if d.get('isActive', True) is not False:
                        found.append({'id': doc.id, 'name': d.get('name', '')})
                        found_ids.add(doc.id)
                        # Guardar referencia para vincular el BSUID si es nuevo
                        if bsuid and not d.get('whatsappBSUID'):
                            docs_to_update.append(doc.reference)
            
            # Si ya encontramos a alguien, no necesitamos seguir buscando variantes
            if found: break

        # 3. Vincular el BSUID al perfil si lo encontramos por teléfono y nos llegó un BSUID nuevo
        if docs_to_update and bsuid:
            for ref in docs_to_update:
                try:
                    ref.update({'whatsappBSUID': bsuid})
                    print(f"🔗 Nuevo BSUID ({bsuid}) guardado en el perfil del paciente.")
                except Exception as e:
                    print(f"⚠️ Error vinculando BSUID: {e}")

        print(f"✅ Pacientes encontrados (Query): {len(found)}")
        
    return found

def find_tomorrow_appointments(patient_names):
    mx_now = datetime.now(MX_TZ)
    tomorrow = mx_now + timedelta(days=1)
    day_str = tomorrow.strftime('%Y-%m-%d')
    start, end = f"{day_str}T00:00:00", f"{day_str}T23:59:59"
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    return [{'id': doc.id, **doc.to_dict()} for doc in results if not doc.to_dict().get('isCancelled') and doc.to_dict().get('name', '').lower() in names_lower]

def find_next_appointment(patient_names):
    mx_now = datetime.now(MX_TZ)
    now_iso = mx_now.strftime('%Y-%m-%dT%H:%M:%S')
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', now_iso).stream()
    future_apts = []
    for doc in results:
        apt = doc.to_dict()
        if not apt.get('isCancelled') and apt.get('name', '').lower() in names_lower:
            future_apts.append(apt)
    if future_apts:
        future_apts.sort(key=lambda x: x['date'])
        return future_apts[0]
    return None

# ── Configuración de Staff (Privado) ─────────────────────────────────
THERAPIST_PHONES = {
    'diana': os.environ.get('PHONE_DIANA', '523331834432'),
    'sam': os.environ.get('PHONE_SAM', '523321145307'),
    'vero': os.environ.get('PHONE_VERO', '523318006167'),
    'reception': os.environ.get('PHONE_YARI', '523315196702')
}

# ── Routes ───────────────────────────────────────────────────────────

@app.route('/')
def home():
    return """
    <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parláre Inbox</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; font-family: 'Outfit', sans-serif; color: #1e293b; }
        .container { text-align: center; max-width: 450px; padding: 40px; }
        .logo-img { width: 200px; height: auto; margin-bottom: 20px; }
        h1 { font-size: 24px; font-weight: 600; margin: 0; color: #334155; }
        p { color: #94a3b8; font-size: 16px; margin: 5px 0 30px; }
        .status { display: inline-flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 20px; border-radius: 99px; font-weight: 500; font-size: 13px; color: #64748b; border: 1px solid #f1f5f9; }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
        .social-container { margin-top: 40px; display: flex; gap: 20px; justify-content: center; }
        .social-link { text-decoration: none; color: #64748b; font-weight: 600; font-size: 14px; transition: all 0.3s; display: flex; align-items: center; gap: 8px; }
        .social-link:hover { color: #FF4B7D; transform: translateY(-2px); }
        .social-link.fb:hover { color: #1877F2; }
        .version { position: absolute; bottom: 20px; left: 20px; font-size: 9px; color: #e2e8f0; letter-spacing: 1px; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    </style></head><body>
    <div class="container">
        <img src="https://taconotaco-d94fc.web.app/assets/parlare_logo.png" class="logo-img" alt="Parláre Logo" style="border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
        <h1>Centro de Atención</h1>
        <p>Messaging & Notifications</p>
        <div class="status"><div class="status-dot"></div> Sistema Operativo</div>
        <div class="social-container">
            <a href="https://www.instagram.com/centrodeatencionparlare/" target="_blank" class="social-link">
                <svg style="width:20px;height:20px" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
            </a>
            <a href="https://www.facebook.com/parlarehablaylenguaje" target="_blank" class="social-link fb">
                <svg style="width:20px;height:20px" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                Facebook
            </a>
        </div>
    </div>
    <div class="version">V7.8.0-MASTER</div>
    </body></html>
    """, 200

@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        msg_body = request.form.get('Body', '').strip().lower()
        from_num = request.form.get('From', '')
        bsuid = request.form.get('ExternalUserId', '')
        
        print(f"📥 Mensaje recibido de {from_num} (BSUID: {bsuid}): {msg_body}")
        
        resp = MessagingResponse()
        patients = find_patients_by_identifier(from_num, bsuid)
        
        if not patients:
            # 1. Verificar si es una terapeuta o recepción
            norm_from = normalize_phone(from_num)
            staff_name = None
            for key, phone in THERAPIST_PHONES.items():
                if normalize_phone(phone) == norm_from:
                    staff_name = key.capitalize()
                    break
            
            if staff_name:
                print(f"👩‍⚕️ Staff detectado: {staff_name}")
                resp.message(f"¡Hola {staff_name}! Tu sesión de WhatsApp está abierta por 24 horas. Lista para recibir reportes y notificaciones del sistema. 🤖✅")
                return str(resp), 200
            else:
                print("❌ Número no registrado")
                resp.message("Tu número no está registrado. Contacta a Recepción de Parláre.")
                return str(resp), 200

        # PALABRAS CLAVE AMPLIADAS
        RECEPTION_KEYWORDS = ['3', 'recepcion', 'yari', 'recepcionista', 'hablar con recepcion', 'hablar con recepsion', 'duda', 'pregunta']
        CONFIRM_KEYWORDS = ['1', 'ok', 'si', 'sí', 'confirmar', 'confirmado', 'confirmo', 'listo', 'claro']
        CANCEL_KEYWORDS = ['2', 'cancelar', 'no', 'cancelado', 'no puedo', 'no asistiremos', 'no asistira']

        if any(word in msg_body for word in RECEPTION_KEYWORDS):
            print("📞 Solicitud de recepción detectada")
            resp.message("Entendido. Puedes hablarnos directo aquí: https://wa.me/523315196702")
            return str(resp), 200

        apts = find_tomorrow_appointments([p['name'] for p in patients])
        if not apts:
            print("📅 No hay citas para mañana. Buscando próxima cita...")
            next_apt = find_next_appointment([p['name'] for p in patients])
            if next_apt:
                try:
                    import locale
                    try: locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
                    except: pass
                    dt = parse_mx_datetime(next_apt['date'])
                    day_str = dt.strftime('%A %d/%b').capitalize()
                    hour_str = dt.strftime('%I:%M %p').lstrip('0')
                    resp.message(f"Hola, tu próxima sesión en Parláre está programada para el *{day_str} a las {hour_str}*. Si deseas reagendar o tienes dudas, puedes hablar con Recepción aquí: https://wa.me/523315196702")
                except Exception as e:
                    print(f"⚠️ Error formateando fecha: {e}")
                    resp.message("Hola, no encontramos citas agendadas para el día de mañana. Si deseas agendar, puedes hablar con Recepción aquí: https://wa.me/523315196702")
            else:
                resp.message("Hola, no encontramos citas futuras agendadas para tu número. Si deseas agendar, puedes hablar con Recepción aquí: https://wa.me/523315196702")
            return str(resp), 200

        if any(word in msg_body for word in CONFIRM_KEYWORDS):
            print("✅ Confirmación recibida")
            for a in apts:
                db.collection('appointments').document(a['id']).update({
                    'confirmed': True, 
                    'confirmedAt': firestore.SERVER_TIMESTAMP,
                    'confirmedBy': 'Robot Parláre',
                    'lastBotUpdate': 'WhatsApp-Confirm'
                })
                update_google_sheet(a, "CONFIRMADO")
                update_google_calendar(a, "CONFIRMADO")
            resp.message("✅ ¡Gracias! Se han confirmado las citas. ¡Nos vemos!")
        elif any(word in msg_body for word in CANCEL_KEYWORDS):
            print("🚫 Cancelación recibida")
            for a in apts:
                db.collection('appointments').document(a['id']).update({
                    'isCancelled': True, 
                    'cancelledBy': 'WhatsApp',
                    'cancelledAt': firestore.SERVER_TIMESTAMP,
                    'lastBotUpdate': 'WhatsApp-Cancel'
                })
                update_google_sheet(a, "CANCELADO")
                update_google_calendar(a, "CANCELADO")
                
                # Formatear datos específicos para la notificación a Yari
                try:
                    dt = parse_mx_datetime(a['date'])
                    date_info = dt.strftime('%d/%b')
                    hour_info = dt.strftime('%I:%M %p').lstrip('0')
                except:
                    date_info = "Mañana"
                    hour_info = "Horario pendiente"
                
                therapist_info = a.get('therapist', 'Diana').title()
                # Extraer solo dígitos para el link de WhatsApp
                clean_phone = re.sub(r'\D', '', from_num)
                
                notify_receptionist(
                    a.get('name', 'Paciente'), 
                    "CANCELADA", 
                    date_info, 
                    hour_info, 
                    therapist_info, 
                    clean_phone
                )
            
            resp.message("Entendido. Hemos cancelado tu sesión. 📞 Si deseas reagendar, puedes escribirnos directamente aquí o llamarnos al 3315196702. ¡Bonito día!")
        else:
            resp.message("Responde 1 para CONFIRMAR o 2 para CANCELAR.")
        
        return str(resp), 200

    except Exception as e:
        print(f"💥 CRASH EN WEBHOOK: {e}")
        error_resp = MessagingResponse()
        error_resp.message(f"Lo sentimos, hubo un problema técnico (Error: {str(e)}). Por favor contacta a Recepción al 3315196702.")
        return str(error_resp), 200

@app.route('/api/send-message', methods=['POST', 'OPTIONS'])
def send_individual_message():
    if request.method == 'OPTIONS': return '', 204
    data = request.json
    if data.get('key') != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401
    dest = f"whatsapp:+52{normalize_phone(data.get('phone'))}"
    try:
        tw_args = {'from_': config.get('twilio_whatsapp_from'), 'to': dest}
        if data.get('variables'):
            tw_args.update({'content_sid': data.get('template_sid'), 'content_variables': json.dumps(data.get('variables'))})
        else:
            tw_args.update({'body': data.get('message')})
        twilio_client.messages.create(**tw_args)
        return jsonify({'status': 'success'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now(MX_TZ).isoformat()}), 200

@app.route('/cron/reminders', methods=['GET', 'POST'])
def send_reminders():
    # 1. Verificar llave de seguridad
    key = request.args.get('key') or (request.json.get('key') if request.is_json else None)
    if key != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        # 2. Obtener teléfonos de pacientes (Maestro)
        profiles = db.collection('patientProfiles').stream()
        phone_map = {}
        for doc in profiles:
            p = doc.to_dict()
            name_norm = p.get('name', '').strip().lower()
            if name_norm and p.get('phone') and p.get('wantsWhatsapp', True) is not False:
                phone_map[name_norm] = {
                    'phone': normalize_phone(p.get('phone')),
                    'countryCode': str(p.get('countryCode', '52')), # Default 52
                    'name': p.get('name')
                }

        # 3. Obtener citas de mañana (con rango extendido para capturar desfases UTC)
        mx_now = datetime.now(MX_TZ)
        tomorrow = mx_now + timedelta(days=1)
        day_str = tomorrow.strftime('%Y-%m-%d')
        
        # Consultamos un rango más amplio (de mañana a pasado mañana) y filtramos en Python
        # Esto atrapa citas como "2026-05-15T00:00:00Z" que realmente son las 6pm del 14 en México
        start_iso = f"{day_str}T00:00:00"
        next_day = tomorrow + timedelta(days=1)
        end_iso = f"{next_day.strftime('%Y-%m-%d')}T08:00:00"

        apts_ref = db.collection('appointments')
        query = apts_ref.where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
        
        sent_count = 0
        skipped_count = 0
        errors = []

        # 4. Procesar y enviar
        for doc in query:
            apt = doc.to_dict()
            if apt.get('isCancelled') or apt.get('confirmed'):
                continue
            
            patient_name = apt.get('name', '')
            patient_info = phone_map.get(patient_name.strip().lower())
            
            if not patient_info:
                skipped_count += 1
                continue

            # Formatear hora y filtrar horario Parláre (8am-8pm)
            try:
                dt = parse_mx_datetime(apt['date'])
                
                # 🛡️ VALIDACIÓN: Solo procesar si la fecha local de México es realmente mañana
                if dt.date() != tomorrow.date():
                    continue

                # 🛡️ GUARDIA: Solo enviar recordatorios dentro del horario Parláre
                if not (8 <= dt.hour <= 20):
                    print(f"⏰ Cita fuera de horario Parláre ({dt.hour}h) para {patient_name}. Recordatorio omitido.")
                    skipped_count += 1
                    continue
                hour_str = dt.strftime('%I:%M %p').lstrip('0')
            except:
                hour_str = "horario pendiente"

            dest = f"whatsapp:+{patient_info['countryCode']}{patient_info['phone']}"
            therapist = apt.get('therapist', 'Diana').title()
            
            msg_body = (
                f"🏥 *Parláre - Recordatorio de Cita*\n\n"
                f"Hola, te recordamos la cita programada para mañana "
                f"*{tomorrow.strftime('%d/%b')}* a las *{hour_str}* con *{therapist}*.\n\n"
                f"Responde:\n"
                f"1️⃣ *OK* para confirmar\n"
                f"2️⃣ *NO* para cancelar\n"
                f"3️⃣ *RECEPCIÓN* para dudas\n\n"
                f"¡Te esperamos! 😊"
            )

            # Enviar usando Plantilla Oficial de Meta (Para asegurar entrega)
            try:
                # El SID de la plantilla de recordatorio
                reminder_template_sid = 'HXa1dc17f5edd3b774ef3ab3b92088035b'
                
                # Variables para la plantilla (Asegúrate que coincidan con Meta)
                # 1: Fecha (Mañana), 2: Hora, 3: Terapeuta
                variables = {
                    "1": tomorrow.strftime('%d/%b'),
                    "2": hour_str,
                    "3": therapist
                }

                twilio_client.messages.create(
                    from_=config.get('twilio_whatsapp_from'),
                    to=dest,
                    content_sid=reminder_template_sid,
                    content_variables=json.dumps(variables)
                )
                
                # 5. Marcar en Firestore que se envió el recordatorio
                try:
                    db.collection('appointments').document(doc.id).update({
                        'lastReminderSentAt': firestore.SERVER_TIMESTAMP,
                        'lastReminderType': 'AUTO_CRON',
                        'lastReminderBy': 'Robot Parláre'
                    })
                except Exception as db_e:
                    print(f"⚠️ Error actualizando Firestore para {patient_name}: {db_e}")

                sent_count += 1
            except Exception as e:
                errors.append(f"Error {patient_name}: {str(e)}")

        return jsonify({
            'sent': sent_count,
            'skipped': skipped_count,
            'errors': errors,
            'date': day_str
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/cron/daily-summary', methods=['GET', 'POST'])
def send_daily_summary():
    """Envía la agenda de HOY a cada terapeuta y un reporte maestro a Yari"""
    # 1. Verificar llave de seguridad
    key = request.args.get('key') or (request.json.get('key') if request.is_json else None)
    if key != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        mx_now = datetime.now(MX_TZ)
        day_str = mx_now.strftime('%Y-%m-%d')
        start_iso, end_iso = f"{day_str}T00:00:00", f"{day_str}T23:59:59"
        errors = []
        
        # 2. Consultar citas de HOY
        apts_ref = db.collection('appointments')
        query = apts_ref.where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
        
        by_therapist = {'diana': [], 'sam': [], 'vero': []}
        all_apts = []
        
        for doc in query:
            a = doc.to_dict()
            if a.get('isCancelled'): continue
            
            # Limpiar y normalizar el nombre del terapeuta
            raw_t = str(a.get('therapist', 'diana')).strip().lower()
            if raw_t in by_therapist:
                by_therapist[raw_t].append(a)
                all_apts.append(a)
            else:
                # Si es un nombre desconocido, lo asignamos a Diana por seguridad
                by_therapist['diana'].append(a)
                all_apts.append(a)
        
        print(f"📊 Citas agrupadas: Diana({len(by_therapist['diana'])}), Sam({len(by_therapist['sam'])}), Vero({len(by_therapist['vero'])})")
        
        # Ordenar por hora cada lista de forma explícita
        for t in by_therapist:
            by_therapist[t].sort(key=lambda x: x.get('date', ''))
        
        # 3. Enviar resúmenes individuales usando la Plantilla Oficial
        sent_summaries = 0
        template_sid = 'HX28a1f7c6ccbb2b507f9764b098c44779' # reporte_diario
        
        for t_key, list_apts in by_therapist.items():
            if not list_apts: continue
            
            phone = THERAPIST_PHONES.get(t_key)
            if not phone: continue
            
            # Formatear la lista de pacientes para la variable {{3}}
            items = []
            for a in list_apts:
                try:
                    dt = parse_mx_datetime(a['date'])
                    # 🛡️ GUARDIA: Omitir citas fuera del horario Parláre
                    if not (8 <= dt.hour <= 20):
                        print(f"⏰ Cita fuera de horario ({dt.hour}h) para {a.get('name')}. Omitida del resumen.")
                        continue
                    time = dt.strftime('%I:%M %p').lstrip('0').lower() # ej: 9:00 am
                except:
                    time = "??:??"
                
                status = "✅" if a.get('confirmed') else "⏳"
                items.append(f"• {time}: {a.get('name')} ({status})")
            
            list_str = "  /  ".join(items) if items else "Sin citas"
            
            try:
                twilio_client.messages.create(
                    from_=config.get('twilio_whatsapp_from'),
                    to=f"whatsapp:+{phone}",
                    content_sid=template_sid,
                    content_variables=json.dumps({
                        "1": t_key.capitalize(),
                        "2": mx_now.strftime('%d/%b'),
                        "3": list_str
                    })
                )
                sent_summaries += 1
            except Exception as e:
                print(f"❌ Error enviando plantilla a {t_key}: {e}")
                errors.append(f"Therapist {t_key}: {str(e)}")
            
        # 4. Enviar Reporte Maestro a Yari usando la MISMA plantilla
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
                                # 🛡️ GUARDIA: Omitir citas fuera del horario Parláre
                                if not (8 <= dt.hour <= 20):
                                    print(f"⏰ Cita fuera de horario ({dt.hour}h) omitida del reporte maestro.")
                                    continue
                                time = dt.strftime('%I:%M%p').lstrip('0').lower() # ej: 9:00am
                            except:
                                time = "??:??"
                            status_icon = "✅" if a.get('confirmed') else "⏳"
                            sub_items.append(f"{time} {a.get('name')} {status_icon}")
                            total_apts += 1
                        t_section += " | ".join(sub_items)
                    master_items.append(t_section)
                
                final_content = "  //  ".join(master_items) + f"  >> Total: {total_apts}"
                
                twilio_client.messages.create(
                    from_=config.get('twilio_whatsapp_from'),
                    to=f"whatsapp:+{yari_phone}",
                    content_sid=template_sid,
                    content_variables=json.dumps({
                        "1": "Yari",
                        "2": mx_now.strftime('%d/%b'),
                        "3": final_content
                    })
                )
                print(f"✅ Reporte Maestro enviado a Yari.")
            except Exception as e:
                print(f"❌ Error enviando reporte a Yari: {e}")
                errors.append(f"Reception: {str(e)}")

        return jsonify({
            'status': 'success',
            'debug': {
                'diana': len(by_therapist['diana']),
                'sam': len(by_therapist['sam']),
                'vero': len(by_therapist['vero'])
            },
            'summaries_sent': sent_summaries,
            'reception_report': True,
            'total_appointments': len(all_apts),
            'errors': errors
        }), 200

    except Exception as e:
        print(f"❌ Error en Daily Summary: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/cron/calendar-sync', methods=['GET', 'POST'])
def server_calendar_sync():
    """
    Sincroniza Google Calendar desde el servidor usando el Refresh Token de Admin.
    Estrategia: Nuke & Replace de la semana actual en cada calendario.
    Llamar desde cron.job o manualmente para forzar sync.
    """
    key = request.args.get('key') or (request.json.get('key') if request.is_json else None)
    if key != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        gcal = get_user_calendar_service()
        if not gcal:
            return jsonify({'error': 'Google Calendar no disponible. Verifica GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN en Render.'}), 503

        mx_now = datetime.now(MX_TZ)

        # ── Rango: semana actual (lunes a domingo) ────────────────────────
        days_to_monday = mx_now.weekday()  # 0 = lunes
        week_start = (mx_now - timedelta(days=days_to_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_end   = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

        time_min = week_start.isoformat()
        time_max = week_end.isoformat()
        week_str = week_start.strftime('%d/%b') + ' - ' + week_end.strftime('%d/%b')

        print(f"📅 Server Calendar Sync: {week_str}")

        # ── Leer citas activas de Firestore ──────────────────────────────
        start_iso = week_start.strftime('%Y-%m-%d') + 'T00:00:00'
        end_iso   = week_end.strftime('%Y-%m-%d')   + 'T23:59:59'

        query = db.collection('appointments') \
            .where('date', '>=', start_iso) \
            .where('date', '<=', end_iso) \
            .stream()

        active_apts = []
        for doc in query:
            a = doc.to_dict()
            a['_id'] = doc.id
            if not a.get('isCancelled'):
                active_apts.append(a)

        print(f"   Citas activas esta semana: {len(active_apts)}")

        deleted_total = 0
        created_total = 0
        errors = []

        for t_key, cal_id in THERAPIST_CALENDARS.items():
            # FASE 1: Borrar todos los eventos de esta semana en este calendario
            try:
                resp = gcal.events().list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    maxResults=2500
                ).execute()

                existing = resp.get('items', [])
                print(f"   [{t_key}] Borrando {len(existing)} eventos...")

                for ev in existing:
                    try:
                        gcal.events().delete(calendarId=cal_id, eventId=ev['id']).execute()
                        deleted_total += 1
                    except Exception as del_e:
                        print(f"   ⚠️ No se pudo borrar {ev['id']}: {del_e}")

            except Exception as list_e:
                print(f"   ❌ Error listando [{t_key}]: {list_e}")
                errors.append(f"{t_key}_list: {str(list_e)}")
                continue

            # FASE 2: Crear eventos desde Firestore
            apt_for_therapist = [a for a in active_apts if (a.get('therapist') or 'diana').lower() == t_key]
            print(f"   [{t_key}] Creando {len(apt_for_therapist)} citas...")

            for a in apt_for_therapist:
                try:
                    dt_start = parse_mx_datetime(a['date'])
                    dt_end   = dt_start + timedelta(hours=1)

                    therapist_name = t_key.capitalize()
                    color_id = '4' if t_key == 'diana' else ('7' if t_key == 'sam' else '3')

                    summary = a.get('name', 'Cita')
                    if a.get('confirmed'): summary = '✅ ' + summary

                    event_body = {
                        'summary': summary,
                        'description': f"Terapeuta: {therapist_name}\nCosto: ${a.get('cost', 0)}\n📱 Agenda Parláre (Sync Automático)",
                        'start': {'dateTime': dt_start.isoformat(), 'timeZone': 'America/Mexico_City'},
                        'end':   {'dateTime': dt_end.isoformat(),   'timeZone': 'America/Mexico_City'},
                        'colorId': color_id,
                        'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 5}]}
                    }

                    created_ev = gcal.events().insert(calendarId=cal_id, body=event_body).execute()

                    # Guardar googleEventId en Firestore
                    try:
                        db.collection('appointments').document(a['_id']).update({'googleEventId': created_ev['id']})
                    except: pass

                    created_total += 1

                except Exception as create_e:
                    print(f"   ❌ Error creando [{a.get('name')}]: {create_e}")
                    errors.append(f"{a.get('name', '?')}: {str(create_e)}")

        result_msg = f"✅ Server Sync completo: {deleted_total} borrados, {created_total} creados ({week_str})"
        print(result_msg)

        return jsonify({
            'status': 'success',
            'week': week_str,
            'deleted': deleted_total,
            'created': created_total,
            'appointments_found': len(active_apts),
            'errors': errors
        }), 200

    except Exception as e:
        print(f"❌ Error en server_calendar_sync: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Usar el puerto que asigne Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
