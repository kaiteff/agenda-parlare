"""
whatsapp_webhook.py
Versión Final Premium Parlare - V7.4
- Inteligencia de respuestas (1, 2, 3) 🧠
- Conexión con Firestore 🔥
- Diseño Web Premium 🎨
- CORS Manual Blindado 🛡️
"""

import json
import os
import sys
import re
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify

app = Flask(__name__)

# CORS MANUAL BLINDADO
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

# ── Config ───────────────────────────────────────────────────────────
IS_RENDER = os.environ.get('RENDER', False)

if IS_RENDER:
    config = {
        'twilio_sid': os.environ.get('TWILIO_SID'),
        'twilio_token': os.environ.get('TWILIO_TOKEN'),
        'twilio_whatsapp_from': os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+16066451055')
    }
else:
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'whatsapp_config.json')
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r') as f: config = json.load(f)
    else: config = {'test_mode': True}

# ── Firebase ─────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    if IS_RENDER:
        key_b64 = os.environ.get('FIREBASE_SERVICE_KEY_B64')
        key_json = json.loads(base64.b64decode(key_b64).decode('utf-8'))
        cred = credentials.Certificate(key_json)
    else:
        cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), 'firebase_service_key.json'))
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Twilio ───────────────────────────────────────────────────────────
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
twilio_client = Client(config.get('twilio_sid'), config.get('twilio_token'))

# ── Helpers ──────────────────────────────────────────────────────────
def normalize_phone(phone):
    if not phone: return ""
    digits = re.sub(r'\D', '', str(phone))
    if digits.startswith('521'): digits = digits[3:]
    elif digits.startswith('52'): digits = digits[2:]
    return digits[-10:]

def find_patients_by_phone(phone):
    norm = normalize_phone(phone)
    profiles = db.collection('patientProfiles').stream()
    found = []
    for doc in profiles:
        p = doc.to_dict()
        if normalize_phone(p.get('phone', '')) == norm:
            found.append({'id': doc.id, 'name': p.get('name', '')})
    return found

def find_tomorrow_appointment(patient_name):
    tomorrow = datetime.now() + timedelta(days=1)
    start = tomorrow.replace(hour=0, minute=0, second=0).isoformat()
    end = tomorrow.replace(hour=23, minute=59, second=59).isoformat()
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    for doc in results:
        apt = doc.to_dict()
        if not apt.get('isCancelled') and apt.get('name', '').lower() == patient_name.lower():
            return {'id': doc.id, **apt}
    return None

def create_notification(p_name, n_type, msg, apt_date, apt_id, therapist):
    try:
        db.collection('artifacts/taconotaco-d94fc/public/data/notifications').add({
            'patientName': p_name, 'type': n_type, 'message': msg,
            'appointmentDate': apt_date, 'appointmentId': apt_id,
            'therapist': therapist, 'isRead': False, 'timestamp': firestore.SERVER_TIMESTAMP
        })
    except: pass

# ── Routes ───────────────────────────────────────────────────────────

@app.route('/')
def home():
    return """
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parláre Webhook</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; font-family: 'Outfit', sans-serif; }
        .card { background: white; padding: 40px; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
        .logo { width: 150px; margin-bottom: 20px; }
        h1 { color: #1e293b; font-size: 28px; margin: 0 0 10px; }
        p { color: #64748b; font-size: 16px; margin-bottom: 30px; }
        .status-pill { background: #ecfdf5; color: #059669; padding: 12px 24px; border-radius: 99px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #d1fae5; }
        .status-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    </style></head><body>
    <div class="card">
        <img src="https://firebasestorage.googleapis.com/v0/b/taconotaco-d94fc.appspot.com/o/WhatsApp%20Image%202025-02-05%20at%2018.41.31.jpeg?alt=media&token=737229a8-8e68-45ec-9ec5-b69c4c776a3b" class="logo">
        <h1>Parláre Webhook</h1>
        <p>Sistema de Automatización de Mensajería V7.4</p>
        <div class="status-pill"><div class="status-dot"></div> Servidor Operativo</div>
    </div></body></html>
    """, 200

@app.route('/webhook', methods=['POST'])
def webhook():
    msg = request.form.get('Body', '').strip().lower()
    num = request.form.get('From', '')
    resp = MessagingResponse()
    
    patients = find_patients_by_phone(num)
    if not patients:
        resp.message("Tu número no está registrado. Contacta a Parláre.")
        return str(resp), 200

    apt = None
    patient = None
    for p in patients:
        a = find_tomorrow_appointment(p['name'])
        if a: apt = a; patient = p; break

    if not apt:
        resp.message(f"Hola {patients[0]['name'].split()[0]}, no encontré una cita tuya para mañana.")
        return str(resp), 200

    if msg in ['1', 'ok', 'si', 'sí', 'confirmar']:
        db.collection('appointments').document(apt['id']).update({'confirmed': True, 'confirmedAt': firestore.SERVER_TIMESTAMP})
        create_notification(patient['name'], 'whatsapp_confirm', f"{patient['name']} confirmó vía WhatsApp", apt.get('date'), apt['id'], apt.get('therapist'))
        resp.message(f"✅ ¡Gracias {patient['name'].split()[0]}! Cita confirmada. ¡Nos vemos!")
    elif msg in ['2', 'cancelar', 'no']:
        db.collection('appointments').document(apt['id']).update({'isCancelled': True})
        create_notification(patient['name'], 'whatsapp_cancel', f"{patient['name']} canceló vía WhatsApp", apt.get('date'), apt['id'], apt.get('therapist'))
        resp.message("Cita cancelada. Contáctanos si deseas reagendar. 📞")
    elif msg in ['3', 'recepcion', 'yari']:
        resp.message("Entendido. Puedes hablarnos directo aquí: https://wa.me/523324955791")
    else:
        resp.message(f"Hola {patient['name'].split()[0]}, responde 1 para CONFIRMAR o 2 para CANCELAR.")
    
    return str(resp), 200

@app.route('/api/send-message', methods=['POST', 'OPTIONS'])
def send_individual_message():
    if request.method == 'OPTIONS': return '', 204
    data = request.json
    if data.get('key') != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    phone = data.get('phone')
    dest = f"whatsapp:+52{normalize_phone(phone)}"
    template_sid = data.get('template_sid', 'HXa1dc17f5edd3b774ef3ab3b92088035b')
    variables = data.get('variables', {}) 
    
    try:
        if variables:
            twilio_client.messages.create(from_=config.get('twilio_whatsapp_from'), to=dest, content_sid=template_sid, content_variables=json.dumps(variables))
        else:
            twilio_client.messages.create(body=data.get('message'), from_=config.get('twilio_whatsapp_from'), to=dest)
        return jsonify({'status': 'success'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
