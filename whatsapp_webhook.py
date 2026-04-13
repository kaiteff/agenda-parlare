"""
whatsapp_webhook.py
Versión unificada y mejorada para Parlare.
V7.3 - CORS Manual Puro
"""

import json
import os
import sys
import re
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify

app = Flask(__name__)

# ÚNICA SOLUCIÓN DE CORS - SIN LIBRERÍAS EXTERNAS
@app.after_request
def add_cors_headers(response):
    # Forzamos una sola vez el origen permitido
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# ── Config ───────────────────────────────────────────────────────────
IS_RENDER = os.environ.get('RENDER', False)

if IS_RENDER:
    config = {
        'twilio_sid': os.environ.get('TWILIO_SID'),
        'twilio_token': os.environ.get('TWILIO_TOKEN'),
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
        key_b64 = os.environ.get('FIREBASE_SERVICE_KEY_B64')
        if key_b64:
            key_json = json.loads(base64.b64decode(key_b64).decode('utf-8'))
            cred = credentials.Certificate(key_json)
        else:
            SERVICE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase_service_key.json')
            cred = credentials.Certificate(SERVICE_KEY_PATH)
    else:
        SERVICE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase_service_key.json')
        cred = credentials.Certificate(SERVICE_KEY_PATH)
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

# ── Routes ───────────────────────────────────────────────────────────

@app.route('/')
def home():
    return "<h1>Parlare Webhook Activo V7.3</h1><p>CORS fix applied.</p>", 200

@app.route('/health')
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    resp = MessagingResponse()
    resp.message("Recibido.")
    return str(resp), 200

@app.route('/api/send-message', methods=['POST', 'OPTIONS'])
def send_individual_message():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    phone = data.get('phone')
    message = data.get('message')
    auth_key = data.get('key')
    
    if auth_key != os.environ.get('CRON_SECRET_KEY', 'parlare_secret_2026'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    dest = f"whatsapp:+52{normalize_phone(phone)}"
    template_sid = data.get('template_sid', 'HXa1dc17f5edd3b774ef3ab3b92088035b')
    variables = data.get('variables', {}) 
    
    try:
        if variables:
            twilio_client.messages.create(
                from_=config.get('twilio_whatsapp_from'),
                to=dest,
                content_sid=template_sid,
                content_variables=json.dumps(variables)
            )
        else:
            twilio_client.messages.create(body=message, from_=config.get('twilio_whatsapp_from'), to=dest)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
