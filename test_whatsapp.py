"""
Prueba rápida de envío de WhatsApp vía Twilio Sandbox.
Solo envía un mensaje de prueba a tu número.
"""
import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'whatsapp_config.json')
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

from twilio.rest import Client

client = Client(config['twilio_sid'], config['twilio_token'])

print("📤 Enviando mensaje de prueba...")

try:
    message = client.messages.create(
        body="🏥 Parlare - Prueba de recordatorio\n\nHola! Este es un mensaje de prueba del sistema de recordatorios. Si recibes esto, ¡la integración funciona correctamente! ✅",
        from_=config['twilio_whatsapp_from'],
        to=config['test_phone']
    )
    print(f"✅ Mensaje enviado! SID: {message.sid}")
    print(f"   Status: {message.status}")
    print(f"   To: {config['test_phone']}")
except Exception as e:
    print(f"❌ Error: {e}")
