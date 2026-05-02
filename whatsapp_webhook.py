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

# ── Google Sync Helpers ─────────────────────────────────────────────
def update_google_sheet(appointment, status):
    if not sheets_service: return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        spreadsheet_id = SHEET_CONFIG['spreadsheets'].get(therapist)
        if not spreadsheet_id: return

        dt = datetime.fromisoformat(appointment['date'].replace('Z', '+00:00')).astimezone(MX_TZ)
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

# ── Helpers ──────────────────────────────────────────────────────────
def normalize_phone(phone):
    digits = re.sub(r'\D', '', str(phone))
    if digits.startswith('521'): digits = digits[3:]
    elif digits.startswith('52'): digits = digits[2:]
    return digits[-10:]

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
                    dt = datetime.fromisoformat(next_apt['date'].replace('Z', '+00:00')).astimezone(MX_TZ)
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
                    'name': p.get('name')
                }

        # 3. Obtener citas de mañana
        mx_now = datetime.now(MX_TZ)
        tomorrow = mx_now + timedelta(days=1)
        day_str = tomorrow.strftime('%Y-%m-%d')
        start_iso = f"{day_str}T00:00:00"
        end_iso = f"{day_str}T23:59:59"

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
            
            # Formatear hora (asumiendo ISO string)
            try:
                # Extraer hora de "2024-05-20T15:00:00Z" -> "3:00 PM"
                dt = datetime.fromisoformat(apt['date'].replace('Z', '+00:00')).astimezone(MX_TZ)
                hour_str = dt.strftime('%I:%M %p').lstrip('0')
            except:
                hour_str = "horario pendiente"

            dest = f"whatsapp:+52{patient_info['phone']}"
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

@app.route('/health', methods=['GET'])
def health_check():
    return "OK", 200

if __name__ == '__main__':
    # Usar el puerto que asigne Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
