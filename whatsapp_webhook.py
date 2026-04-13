"""
whatsapp_webhook.py
Versión unificada y mejorada para Parlare.
"""

import json
import os
import sys
import re
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

# Fix encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

app = Flask(__name__)
# Configuración ultra-abierta de CORS
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-requested-with'
    return response

# ── Config ───────────────────────────────────────────────────────────
IS_RENDER = os.environ.get('RENDER', False)

if IS_RENDER:
    config = {
        'twilio_sid': os.environ['TWILIO_SID'],
        'twilio_token': os.environ['TWILIO_TOKEN'],
        'twilio_whatsapp_from': os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+16066451055'),
        'test_mode': False
    }
else:
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'whatsapp_config.json')
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r') as f:
            config = json.load(f)
    else:
        config = {'test_mode': True}

# ── Firebase ─────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    if IS_RENDER:
        key_b64 = os.environ['FIREBASE_SERVICE_KEY_B64']
        key_json = json.loads(base64.b64decode(key_b64).decode('utf-8'))
        cred = credentials.Certificate(key_json)
    else:
        SERVICE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase_service_key.json')
        cred = credentials.Certificate(SERVICE_KEY_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Twilio ───────────────────────────────────────────────────────────
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
twilio_client = Client(config['twilio_sid'], config['twilio_token'])

# ── Helpers ──────────────────────────────────────────────────────────
NOTIFICATIONS_PATH = 'artifacts/taconotaco-d94fc/public/data/notifications'

def create_notification(patient_name, notif_type, message, appointment_date='', appointment_id='', metadata={}):
    try:
        notif_data = {
            'patientName': patient_name,
            'type': notif_type,
            'message': message,
            'appointmentDate': appointment_date,
            'appointmentId': appointment_id,
            'isRead': False,
            'recipient': 'therapist' if notif_type.startswith('whatsapp_') else 'manager',
            'therapist': metadata.get('therapist'),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'source': 'whatsapp'
        }
        db.collection(NOTIFICATIONS_PATH).add(notif_data)
    except Exception as e:
        print(f"   ⚠️ Error creando notificación: {e}")

def normalize_phone(phone):
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('521'): digits = digits[3:]
    elif digits.startswith('52'): digits = digits[2:]
    elif digits.startswith('1') and len(digits) == 11: digits = digits[1:]
    return digits[-10:]

def find_patients_by_phone(phone):
    normalized_incoming = normalize_phone(phone)
    profiles_ref = db.collection('patientProfiles')
    results = profiles_ref.stream()
    patients = []
    for doc in results:
        profile = doc.to_dict()
        p_phone = profile.get('phone', '')
        if p_phone and normalize_phone(p_phone) == normalized_incoming:
            patients.append({'id': doc.id, 'name': profile.get('name', ''), 'phone': p_phone})
    return patients

def find_tomorrow_appointment(patient_name):
    tomorrow = datetime.now() + timedelta(days=1)
    start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    for doc in results:
        apt = doc.to_dict()
        if not apt.get('isCancelled', False) and apt.get('name', '').lower() == patient_name.lower():
            return {'id': doc.id, **apt}
    return None

def format_time(date_str):
    try:
        dt_utc = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        dt_local = dt_utc.astimezone()
        return dt_local.strftime('%I:%M %p').lstrip('0')
    except:
        return date_str

# ── Routes ───────────────────────────────────────────────────────────

@app.route('/')
@app.route('/index')
def home():
    return """
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Parláre - Centro de Atención</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: #f8fafc; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                margin: 0;
                overflow: hidden;
                position: relative;
            }
            body::before {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 120%;
                height: 120%;
                background: url('/static/images/logo.png') no-repeat center;
                background-size: contain;
                opacity: 0.05;
                transform: translate(-50%, -50%) rotate(-15deg);
                z-index: -1;
            }
            .card { 
                background: rgba(255, 255, 255, 0.95); 
                padding: 4rem 3rem; 
                border-radius: 2.5rem; 
                box-shadow: 0 40px 60px -15px rgba(0,0,0,0.1); 
                text-align: center; 
                max-width: 500px; 
                width: 90%; 
                border: 1px solid rgba(255,255,255,0.3);
                backdrop-filter: blur(10px);
            }
            .logo { width: 180px; height: auto; margin-bottom: 1.5rem; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
            h1 { color: #000; margin: 0; font-size: 3rem; font-weight: 800; letter-spacing: -1px; }
            .accent { color: #e11d48; }
            p { color: #334155; font-size: 1.2rem; line-height: 1.6; margin-top: 1rem; }
            .social-links { margin-top: 2rem; display: flex; justify-content: center; gap: 1.5rem; }
            .social-links a { 
                color: #64748b; 
                font-size: 2rem; 
                transition: all 0.3s ease;
                text-decoration: none;
            }
            .social-links a:hover { transform: translateY(-5px); }
            .fa-instagram:hover { color: #e1306c; }
            .fa-facebook:hover { color: #1877f2; }
            .status { 
                margin-top: 2.5rem; 
                display: inline-flex; 
                align-items: center; 
                gap: 0.7rem; 
                padding: 0.8rem 2rem; 
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); 
                color: #166534; 
                border-radius: 9999px; 
                font-weight: 700; 
                font-size: 1rem; 
                border: 1px solid #bbf7d0;
            }
            .dot { width: 12px; height: 12px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; }
        </style>
    </head>
    <body>
        <div class="card">
            <img src="/static/images/logo.png" alt="Parlare Logo" class="logo">
            <h1>Parl<span class="accent">á</span>re</h1>
            <p><strong>Centro de atención en problemas de lenguaje y habla.</strong></p>
            
            <div class="social-links">
                <a href="https://www.facebook.com/parlarehablaylenguaje" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>
                <a href="https://www.instagram.com/centrodeatencionparlare/" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>
            </div>

            <div class="status">
                <div class="dot"></div>
                Sistema de Notificaciones Activo V7
            </div>
        </div>
    </body>
    </html>
    """, 200

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'Parlare WhatsApp Server'}), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    CONFIRM_KEYWORDS = ['ok', 'si', 'sí', 'confirmo', 'confirmar', 'yes', 'va', 'listo', '1']
    CANCEL_KEYWORDS = ['cancelar', 'cancelo', 'no', 'cancel', '2']
    YARI_KEYWORDS = ['recepcion', 'recepción', 'yari', 'hablar', '3']
    
    incoming_msg = request.form.get('Body', '').strip().lower()
    from_number = request.form.get('From', '')
    resp = MessagingResponse()
    
    patients = find_patients_by_phone(from_number)
    if not patients:
        resp.message("No encontramos tu número en nuestro sistema. Por favor contacta a la clínica directamente.")
        return str(resp), 200

    appointment = None
    patient = None
    for p in patients:
        apt = find_tomorrow_appointment(p['name'])
        if apt:
            appointment = apt
            patient = p
            break

    if not appointment:
        first_name = patients[0]['name'].split()[0]
        resp.message(f"Hola {first_name}, no encontramos una cita tuya para mañana.")
        return str(resp), 200

    if incoming_msg in CONFIRM_KEYWORDS:
        db.collection('appointments').document(appointment['id']).update({
            'confirmed': True,
            'confirmedAt': firestore.SERVER_TIMESTAMP
        })
        create_notification(patient['name'], 'whatsapp_confirm', f"{patient['name']} confirmó su cita por WhatsApp", appointment.get('date', ''), appointment['id'], {'therapist': appointment.get('therapist')})
        resp.message(f"✅ ¡Perfecto {patient['name'].split()[0]}! Tu cita de mañana está confirmada. ¡Te esperamos!")
    elif incoming_msg in CANCEL_KEYWORDS:
        db.collection('appointments').document(appointment['id']).update({'isCancelled': True})
        create_notification(patient['name'], 'whatsapp_cancel', f"{patient['name']} canceló su cita por WhatsApp", appointment.get('date', ''), appointment['id'], {'therapist': appointment.get('therapist')})
        resp.message(f"Tu cita de mañana ha sido cancelada. Si deseas reagendar, por favor contáctanos. 📞")
    elif incoming_msg in YARI_KEYWORDS:
        recepcion_phone = "523324955791" # Daniel: actualiza este número después
        resp.message(f"Con gusto. Puedes enviarnos un mensaje directo haciendo clic aquí: https://wa.me/{recepcion_phone}")
    else:
        resp.message(f"Hola {patient['name'].split()[0]}, no entendimos tu respuesta. Responde:\n• *1* para confirmar\n• *2* para cancelar\n• *3* para ayuda")
    
    return str(resp), 200

@app.route('/cron/reminders', methods=['GET', 'OPTIONS'])
def run_reminders():
    # Soporte para pre-vuelo de CORS
    if request.method == 'OPTIONS':
        return '', 204
        
    auth_key = request.args.get('key')
    if auth_key != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401

    tomorrow = datetime.now() + timedelta(days=1)
    start_iso = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end_iso = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    
    results = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
    appointments = [dict(doc.to_dict(), id=doc.id) for doc in results if not doc.to_dict().get('isCancelled') and not doc.to_dict().get('confirmed')]

    profiles = db.collection('patientProfiles').stream()
    patient_phones = {p.to_dict().get('name', '').lower(): p.to_dict() for p in profiles if p.to_dict().get('phone')}

    results_log = []
    tomorrow_str = tomorrow.strftime('%d/%m/%Y')

    for apt in appointments:
        p_name = apt.get('name', 'Paciente')
        p_info = patient_phones.get(p_name.lower())
        if not p_info or p_info.get('wantsWhatsapp') is False: continue

        phone = p_info['phone']
        dest = f"whatsapp:+52{phone}" if not phone.startswith('whatsapp:') else phone
        apt_time = format_time(apt.get('date', ''))
        therapist = apt.get('therapist', 'diana').title()

        msg = (f"🏥 Parlare - Recordatorio\n\n¡Hola! Te recordamos tu cita mañana {tomorrow_str} a las {apt_time}.\n\n"
               f"Responde:\n1️⃣ *OK* para confirmar\n2️⃣ *CANCELAR* para cancelar\n3️⃣ *RECEPCIÓN* para hablar con alguien\n\n¡Te esperamos! 😊")
        
        try:
            twilio_client.messages.create(body=msg, from_=config['twilio_whatsapp_from'], to=dest)
            results_log.append(f"SUCCESS: {p_name}")
        except Exception as e:
            results_log.append(f"ERROR: {p_name} - {str(e)}")

    return jsonify({'status': 'done', 'results': results_log}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
