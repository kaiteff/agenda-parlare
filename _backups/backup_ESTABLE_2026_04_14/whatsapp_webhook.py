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

def update_google_calendar(appointment, status_text):
    if not calendar_service or not appointment.get('googleEventId'): return
    try:
        # 1. Encontrar el calendario "Parlare Citas"
        cal_list = calendar_service.calendarList().list().execute()
        calendars = cal_list.get('items', [])
        
        # Log available calendars for debugging
        print(f"📊 Calendarios disponibles: {[c.get('summary') for c in calendars]}")
        
        parlare_cal = next((c for c in calendars if c.get('summary') == 'Parlare Citas'), None)
        
        if not parlare_cal:
            print("⚠️ Calendario 'Parlare Citas' no encontrado en la cuenta de servicio.")
            # Si no existe, usamos 'primary', pero probablemente no sea lo que buscamos
            target_cal_id = 'primary'
        else:
            target_cal_id = parlare_cal['id']
            
        print(f"📡 Sync Calendar: Usando calendario ID: {target_cal_id}")

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

def find_patients_by_phone(phone):
    norm = normalize_phone(phone)
    profiles = db.collection('patientProfiles').stream()
    return [{'id': doc.id, 'name': doc.to_dict().get('name', '')} 
            for doc in profiles if normalize_phone(doc.to_dict().get('phone', '')) == norm]

def find_tomorrow_appointments(patient_names):
    mx_now = datetime.now(MX_TZ)
    tomorrow = mx_now + timedelta(days=1)
    day_str = tomorrow.strftime('%Y-%m-%d')
    start, end = f"{day_str}T00:00:00", f"{day_str}T23:59:59"
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    return [{'id': doc.id, **doc.to_dict()} for doc in results if not doc.to_dict().get('isCancelled') and doc.to_dict().get('name', '').lower() in names_lower]

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
        <img src="https://firebasestorage.googleapis.com/v0/b/taconotaco-d94fc.appspot.com/o/WhatsApp%20Image%202025-02-05%20at%2018.41.31.jpeg?alt=media&token=737229a8-8e68-45ec-9ec5-b69c4c776a3b" class="logo-img" alt="Parláre Logo">
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
    msg_body = request.form.get('Body', '').strip().lower()
    from_num = request.form.get('From', '')
    resp = MessagingResponse()
    patients = find_patients_by_phone(from_num)
    if not patients:
        resp.message("Tu número no está registrado. Contacta a Parláre.")
        return str(resp), 200
    apts = find_tomorrow_appointments([p['name'] for p in patients])
    if not apts:
        resp.message(f"Hola {patients[0]['name'].split()[0]}, no encontramos citas para mañana.")
        return str(resp), 200
    if msg_body in ['1', 'ok', 'si', 'sí', 'confirmar']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({
                'confirmed': True, 
                'confirmedAt': firestore.SERVER_TIMESTAMP,
                'lastBotUpdate': 'WhatsApp-Confirm'
            })
            # Sync to Google
            update_google_sheet(a, "CONFIRMADO")
            update_google_calendar(a, "CONFIRMADO")
            
        names = ", ".join([a['name'].split()[0] for a in apts])
        resp.message(f"✅ ¡Gracias! Se han confirmado las citas de: {names}. ¡Nos vemos!")
    elif msg_body in ['2', 'cancelar', 'no']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({
                'isCancelled': True,
                'lastBotUpdate': 'WhatsApp-Cancel'
            })
            # Sync to Google
            update_google_sheet(a, "CANCELADO")
            update_google_calendar(a, "CANCELADO")
            
        resp.message("Citas canceladas correctamente. 📞")
    elif msg_body in ['3', 'recepcion', 'yari']:
        resp.message("Entendido. Puedes hablarnos directo aquí: https://wa.me/523324955791")
    else:
        resp.message("Responde 1 para CONFIRMAR o 2 para CANCELAR.")
    return str(resp), 200

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
                f"Hola {patient_name.split()[0]}, te recordamos tu cita para mañana "
                f"*{tomorrow.strftime('%d/%b')}* a las *{hour_str}* con *{therapist}*.\n\n"
                f"Responde:\n"
                f"1️⃣ *OK* para confirmar\n"
                f"2️⃣ *NO* para cancelar\n"
                f"3️⃣ *RECEPTION* para dudas\n\n"
                f"¡Te esperamos! 😊"
            )

            try:
                twilio_client.messages.create(body=msg_body, from_=config.get('twilio_whatsapp_from'), to=dest)
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
