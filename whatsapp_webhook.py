"""
whatsapp_webhook.py
Servidor Flask que recibe respuestas de WhatsApp vía Twilio.

Cuando un paciente responde al recordatorio:
- "OK" / "Si" / "Confirmo" → Confirma la cita en Firestore
- "Cancelar" / "No" → Cancela la cita en Firestore

Uso local:
    python whatsapp_webhook.py

Uso en Render (producción):
    Variables de entorno requeridas:
    - TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM
    - FIREBASE_SERVICE_KEY_B64 (service key JSON codificado en base64)
"""

import json
import os
import sys
import re
import base64
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# ── Config (env vars for Render, JSON file for local) ────────────────
IS_RENDER = os.environ.get('RENDER', False)

if IS_RENDER:
    config = {
        'twilio_sid': os.environ['TWILIO_SID'],
        'twilio_token': os.environ['TWILIO_TOKEN'],
        'twilio_whatsapp_from': os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886'),
    }
else:
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'whatsapp_config.json')
    with open(CONFIG_PATH, 'r') as f:
        config = json.load(f)

# ── Firebase ─────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    if IS_RENDER:
        # En Render: service key como variable de entorno (base64)
        key_b64 = os.environ['FIREBASE_SERVICE_KEY_B64']
        key_json = json.loads(base64.b64decode(key_b64).decode('utf-8'))
        cred = credentials.Certificate(key_json)
    else:
        # Local: archivo JSON
        SERVICE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase_service_key.json')
        cred = credentials.Certificate(SERVICE_KEY_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Twilio ───────────────────────────────────────────────────────────
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

twilio_client = Client(config['twilio_sid'], config['twilio_token'])

# ── Notifications Path (same as frontend) ────────────────────────────
NOTIFICATIONS_PATH = 'artifacts/taconotaco-d94fc/public/data/notifications'


def create_notification(patient_name, notif_type, message, appointment_date='', appointment_id=''):
    """Crea una notificación en Firestore que la app mostrará en tiempo real"""
    try:
        notif_data = {
            'patientName': patient_name,
            'type': notif_type,
            'message': message,
            'appointmentDate': appointment_date,
            'appointmentId': appointment_id,
            'isRead': False,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'source': 'whatsapp'
        }
        db.collection(NOTIFICATIONS_PATH).add(notif_data)
        print(f"   🔔 Notificación creada: {message}")
    except Exception as e:
        print(f"   ⚠️ Error creando notificación: {e}")


# ── Flask App ────────────────────────────────────────────────────────
app = Flask(__name__)

# Palabras clave para confirmar/cancelar/hablar con recepción
CONFIRM_KEYWORDS = ['ok', 'si', 'sí', 'confirmo', 'confirmar', 'yes', 'va', 'listo', '1']
CANCEL_KEYWORDS = ['cancelar', 'cancelo', 'no', 'cancel', '2']
YARI_KEYWORDS = ['recepcion', 'recepción', 'yari', 'hablar', '3']


def normalize_phone(phone):
    """Normaliza un número de teléfono para comparación"""
    digits = re.sub(r'\D', '', phone)
    # Remover prefijo de país si existe
    if digits.startswith('521'):
        digits = digits[3:]
    elif digits.startswith('52'):
        digits = digits[2:]
    elif digits.startswith('1') and len(digits) == 11:
        digits = digits[1:]
    return digits[-10:]  # Últimos 10 dígitos


def find_patient_by_phone(phone):
    """Busca un paciente por su número de teléfono"""
    normalized_incoming = normalize_phone(phone)
    
    profiles_ref = db.collection('patientProfiles')
    results = profiles_ref.stream()
    
    for doc in results:
        profile = doc.to_dict()
        patient_phone = profile.get('phone', '')
        if patient_phone and normalize_phone(patient_phone) == normalized_incoming:
            return {
                'id': doc.id,
                'name': profile.get('name', ''),
                'phone': patient_phone
            }
    
    return None


def find_tomorrow_appointment(patient_name):
    """Busca la cita de mañana para un paciente"""
    tomorrow = datetime.now() + timedelta(days=1)
    start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    
    appointments_ref = db.collection('appointments')
    query = appointments_ref.where('date', '>=', start).where('date', '<=', end)
    results = query.stream()
    
    for doc in results:
        apt = doc.to_dict()
        if apt.get('isCancelled', False):
            continue
        if apt.get('name', '').lower() == patient_name.lower():
            return {'id': doc.id, **apt}
    
    return None


@app.route('/webhook', methods=['POST'])
def webhook():
    """Recibe mensajes entrantes de Twilio"""
    incoming_msg = request.form.get('Body', '').strip().lower()
    from_number = request.form.get('From', '')
    
    print(f"\n📥 Mensaje recibido de {from_number}: '{incoming_msg}'")
    
    # Crear respuesta TwiML
    resp = MessagingResponse()
    
    # Buscar paciente por teléfono
    patient = find_patient_by_phone(from_number)
    
    if not patient:
        print(f"   ❓ No se encontró paciente con teléfono: {from_number}")
        resp.message("No encontramos tu número en nuestro sistema. Por favor contacta a la clínica directamente.")
        return str(resp), 200
    
    print(f"   👤 Paciente encontrado: {patient['name']}")
    
    # Buscar cita de mañana
    appointment = find_tomorrow_appointment(patient['name'])
    
    if not appointment:
        print(f"   📅 No se encontró cita de mañana para {patient['name']}")
        resp.message(f"Hola {patient['name'].split()[0]}, no encontramos una cita tuya para mañana.")
        return str(resp), 200
    
    # Procesar respuesta
    if incoming_msg in CONFIRM_KEYWORDS:
        # Confirmar cita
        apt_ref = db.collection('appointments').document(appointment['id'])
        apt_ref.update({
            'confirmed': True,
            'confirmedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Crear notificación en la app
        create_notification(
            patient_name=patient['name'],
            notif_type='whatsapp_confirm',
            message=f"{patient['name']} confirmó su cita por WhatsApp",
            appointment_date=appointment.get('date', '')
        )
        
        print(f"   ✅ Cita CONFIRMADA para {patient['name']}")
        resp.message(f"✅ ¡Perfecto {patient['name'].split()[0]}! Tu cita de mañana está confirmada. ¡Te esperamos!")
        
    elif incoming_msg in CANCEL_KEYWORDS:
        # Cancelar cita
        apt_ref = db.collection('appointments').document(appointment['id'])
        apt_ref.update({'isCancelled': True})
        
        # Crear notificación en la app
        create_notification(
            patient_name=patient['name'],
            notif_type='whatsapp_cancel',
            message=f"{patient['name']} canceló su cita por WhatsApp",
            appointment_date=appointment.get('date', ''),
            appointment_id=appointment['id']
        )
        
        print(f"   ❌ Cita CANCELADA para {patient['name']}")
        resp.message(f"Tu cita de mañana ha sido cancelada. Si deseas reagendar, por favor contáctanos. 📞")
        
    elif incoming_msg in YARI_KEYWORDS:
        print(f"   📞 {patient['name']} solicitó hablar con recepción")
        # TODO: Cambiar este número por el número real de Yari
        yari_phone = "52XXXXXXXXXX" 
        resp.message(f"Con gusto {patient['name'].split()[0]}. Puedes enviarle un mensaje directo a Yari (Recepción) haciendo clic aquí: https://wa.me/{yari_phone} o llamando a ese número.")
        
    else:
        print(f"   ❓ Respuesta no reconocida: '{incoming_msg}'")
        resp.message(f"Hola {patient['name'].split()[0]}, no entendimos tu respuesta. Responde:\n• *1* para confirmar tu cita\n• *2* para cancelarla\n• *3* para hablar con recepción")
    
    return str(resp), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'service': 'Parlare WhatsApp Webhook'}, 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 50)
    print("📱 Parlare WhatsApp Webhook Server")
    print("=" * 50)
    print(f"Escuchando en http://localhost:{port}/webhook")
    print(f"Health check: http://localhost:{port}/health")
    if not IS_RENDER:
        print(f"\nPara exponer con ngrok:")
        print(f"  ngrok http {port}")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=port, debug=not IS_RENDER)
