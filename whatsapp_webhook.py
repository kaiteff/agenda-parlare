"""
whatsapp_webhook.py
Versión Final Premium Parlare - V7.5 (Multi-Confirm + TZ Fix)
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
    # Usar hora de México para calcular "mañana"
    mx_now = datetime.now(MX_TZ)
    tomorrow = mx_now + timedelta(days=1)
    day_str = tomorrow.strftime('%Y-%m-%d')
    start = f"{day_str}T00:00:00"
    end = f"{day_str}T23:59:59"
    
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    
    found_apts = []
    for doc in results:
        a = doc.to_dict()
        if not a.get('isCancelled') and a.get('name', '').lower() in names_lower:
            found_apts.append({'id': doc.id, **a})
    return found_apts

# ── Routes ───────────────────────────────────────────────────────────

@app.route('/')
def home():
    return "<h1>Parlare Webhook V7.5 (Multi-Confirm + Mexico TZ)</h1>", 200

@app.route('/webhook', methods=['POST'])
def webhook():
    msg_body = request.form.get('Body', '').strip().lower()
    from_num = request.form.get('From', '')
    resp = MessagingResponse()
    
    patients = find_patients_by_phone(from_num)
    if not patients:
        resp.message("Tu número no está registrado.")
        return str(resp), 200

    # Buscar todas las citas de mañana para todos los perfiles asociados al celular
    apts = find_tomorrow_appointments([p['name'] for p in patients])

    if not apts:
        name = patients[0]['name'].split()[0]
        resp.message(f"Hola {name}, no encontré una cita tuya para mañana.")
        return str(resp), 200

    if msg_body in ['1', 'ok', 'si', 'sí', 'confirmar']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({'confirmed': True, 'confirmedAt': firestore.SERVER_TIMESTAMP})
            # Notificación silenciada por ahora para no saturar, o puedes activarla
        names = ", ".join([a['name'].split()[0] for a in apts])
        resp.message(f"✅ ¡Gracias! Se han confirmado las citas de: {names}. ¡Nos vemos!")
    elif msg_body in ['2', 'cancelar', 'no']:
        for a in apts:
            db.collection('appointments').document(a['id']).update({'isCancelled': True})
        resp.message("Citas canceladas. Contáctanos para reagendar. 📞")
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
