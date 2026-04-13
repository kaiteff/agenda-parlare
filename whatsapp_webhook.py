"""
whatsapp_webhook.py
Versión Final Premium Parlare - V7.6 (Estética Final)
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
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
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
twilio_client = Client(config.get('twilio_sid'), config.get('twilio_token'))

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
    <title>Parláre Messaging</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; font-family: 'Outfit', sans-serif; color: #1e293b; overflow: hidden; }
        .container { text-align: center; max-width: 450px; padding: 20px; transition: all 0.5s ease; }
        .logo-container { margin-bottom: 2rem; }
        .logo-icon { width: 80px; height: 80px; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); border-radius: 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(78, 205, 196, 0.2); margin-bottom: 20px; }
        .logo-icon svg { width: 40px; height: 40px; color: white; }
        h1 { font-size: 32px; font-weight: 600; margin: 0; letter-spacing: -1px; background: linear-gradient(to right, #1e293b, #64748b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { color: #94a3b8; font-size: 18px; margin: 10px 0 30px; }
        .status { display: inline-flex; align-items: center; gap: 10px; background: #f1f5f9; padding: 12px 24px; border-radius: 99px; font-weight: 500; font-size: 14px; color: #475569; }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); animation: pulse 2s infinite; }
        .version { position: absolute; bottom: 20px; left: 20px; font-size: 10px; color: #cbd5e1; font-weight: 300; letter-spacing: 1px; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    </style></head><body>
    <div class="container">
        <div class="logo-container">
            <div class="logo-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            </div>
            <h1>Parláre</h1>
            <p>Messaging Service</p>
        </div>
        <div class="status"><div class="status-dot"></div> Servidor Activo</div>
    </div>
    <div class="version">V7.6.0-MASTER</div>
    </body></html>
    """, 200

@app.route('/webhook', methods=['POST'])
def webhook():
    msg_body = request.form.get('Body', '').strip().lower()
    from_num = request.form.get('From', '')
    resp = MessagingResponse()
    patients = find_patients_by_phone(from_num)
    if not patients:
        resp.message("Tu número no está registrado. Por favor contacta a la clínica.")
        return str(resp), 200

    apts = find_tomorrow_appointments([p['name'] for p in patients])
    if not apts:
        resp.message(f"Hola {patients[0]['name'].split()[0]}, no encontramos citas para mañana ligadas a este número.")
        return str(resp), 200

    if msg_body in ['1', 'ok', 'si', 'sí', 'confirmar']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({'confirmed': True, 'confirmedAt': firestore.SERVER_TIMESTAMP})
        names = ", ".join([a['name'].split()[0] for a in apts])
        resp.message(f"✅ ¡Gracias! Se han confirmado las citas de: {names}. ¡Nos vemos!")
    elif msg_body in ['2', 'cancelar', 'no']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({'isCancelled': True})
        resp.message("Citas canceladas correctamente. Si fue un error, contáctanos. 📞")
    elif msg_body in ['3', 'recepcion', 'yari']:
        resp.message("Con gusto. Puedes hablarnos directo aquí: https://wa.me/523324955791")
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
