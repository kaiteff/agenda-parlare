"""
whatsapp_reminders.py
Envía recordatorios de citas por WhatsApp usando Twilio.

Uso:
    python whatsapp_reminders.py           # Envía recordatorios para mañana
    python whatsapp_reminders.py --dry     # Solo muestra qué enviaría (sin enviar)
    python whatsapp_reminders.py --test    # Envía todo a tu número de prueba

Requiere:
    pip install twilio firebase-admin
"""

import json
import sys
import os
from datetime import datetime, timedelta

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# ── Cargar configuración ─────────────────────────────────────────────
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'whatsapp_config.json')

with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

# ── Firebase Setup ───────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase_service_key.json')

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_KEY_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Twilio Setup ─────────────────────────────────────────────────────
from twilio.rest import Client

twilio_client = Client(config['twilio_sid'], config['twilio_token'])

# ── Funciones principales ────────────────────────────────────────────

def get_tomorrow_appointments():
    """Obtiene las citas de mañana desde Firestore"""
    tomorrow = datetime.now() + timedelta(days=1)
    tomorrow_start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Las fechas en Firestore están como ISO string (ej: "2026-02-10T15:00:00.000Z")
    start_iso = tomorrow_start.isoformat()
    end_iso = tomorrow_end.isoformat()
    
    print(f"📅 Buscando citas para: {tomorrow.strftime('%d/%m/%Y')}")
    print(f"   Rango: {start_iso} → {end_iso}")
    
    appointments_ref = db.collection('appointments')
    
    # Consultar citas en el rango de mañana
    query = appointments_ref.where('date', '>=', start_iso) \
                           .where('date', '<=', end_iso)
    
    results = query.stream()
    
    appointments = []
    for doc in results:
        apt = doc.to_dict()
        apt['id'] = doc.id
        
        # Filtrar canceladas
        if apt.get('isCancelled', False):
            continue
            
        appointments.append(apt)
    
    print(f"   Encontradas: {len(appointments)} citas")
    return appointments


def get_patient_phones():
    """Obtiene los teléfonos de todos los pacientes"""
    profiles_ref = db.collection('patientProfiles')
    results = profiles_ref.stream()
    
    phones = {}
    for doc in results:
        profile = doc.to_dict()
        name = profile.get('name', '')
        phone = profile.get('phone', '')
        if name and phone:
            phones[name.lower()] = {
                'phone': phone,
                'name': name
            }
    
    return phones


def format_time(date_str):
    """Extrae hora legible de un ISO string"""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%I:%M %p').lstrip('0')  # "3:00 PM"
    except:
        return date_str


def send_reminder(phone_number, patient_name, appointment_time, therapist, dry_run=False, test_mode=False):
    """Envía un recordatorio por WhatsApp"""
    
    # En test mode, enviar todo al número de prueba
    if test_mode:
        destination = config['test_phone']
    else:
        destination = f"whatsapp:+52{phone_number}" if not phone_number.startswith('whatsapp:') else phone_number
    
    # Usar template de Twilio Sandbox: appointment_reminders
    # Variables: {{1}} = fecha, {{2}} = hora
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%d/%m/%Y')
    
    # Mensaje personalizado (después del sandbox se usa template)
    message_body = (
        f"🏥 Parlare - Recordatorio de cita\n\n"
        f"Hola {patient_name}, te recordamos tu cita mañana "
        f"{tomorrow} a las {appointment_time} con {therapist.title()}.\n\n"
        f"Responde:\n"
        f"1️⃣ *OK* para confirmar\n"
        f"2️⃣ *CANCELAR* para cancelar\n"
        f"3️⃣ *YARI* para hablar con recepción\n\n"
        f"¡Te esperamos! 😊"
    )
    
    if dry_run:
        print(f"   📱 [DRY RUN] Enviaría a {destination}:")
        print(f"      {message_body[:80]}...")
        return True
    
    try:
        message = twilio_client.messages.create(
            body=message_body,
            from_=config['twilio_whatsapp_from'],
            to=destination
        )
        print(f"   ✅ Enviado a {patient_name} ({destination}) - SID: {message.sid}")
        return True
    except Exception as e:
        print(f"   ❌ Error enviando a {patient_name}: {e}")
        return False


def main():
    # Parsear argumentos
    dry_run = '--dry' in sys.argv
    test_mode = '--test' in sys.argv or config.get('test_mode', False)
    
    print("=" * 50)
    print("📱 WhatsApp Reminders - Parlare")
    print("=" * 50)
    
    if dry_run:
        print("🔒 MODO DRY RUN - No se enviarán mensajes\n")
    elif test_mode:
        print(f"🧪 MODO TEST - Todo se envía a {config['test_phone']}\n")
    else:
        print("🚀 MODO PRODUCCIÓN - Enviando mensajes reales\n")
    
    # 1. Obtener citas de mañana
    appointments = get_tomorrow_appointments()
    
    if not appointments:
        print("\n✨ No hay citas para mañana. ¡Nada que enviar!")
        return
    
    # 2. Obtener teléfonos de pacientes
    patient_phones = get_patient_phones()
    print(f"📞 Pacientes con teléfono registrado: {len(patient_phones)}")
    
    # 3. Enviar recordatorios
    print(f"\n{'─' * 50}")
    print(f"📤 Enviando recordatorios...\n")
    
    sent = 0
    skipped = 0
    errors = 0
    
    for apt in appointments:
        patient_name = apt.get('name', 'Paciente')
        apt_time = format_time(apt.get('date', ''))
        therapist = apt.get('therapist', 'diana')
        
        # Buscar teléfono del paciente
        patient_info = patient_phones.get(patient_name.lower())
        
        if not patient_info:
            print(f"   ⏭️  {patient_name} - Sin teléfono registrado")
            skipped += 1
            continue
        
        phone = patient_info['phone']
        
        success = send_reminder(phone, patient_name, apt_time, therapist, 
                              dry_run=dry_run, test_mode=test_mode)
        if success:
            sent += 1
        else:
            errors += 1
    
    # 4. Resumen
    print(f"\n{'─' * 50}")
    print(f"📊 Resumen:")
    print(f"   ✅ Enviados:  {sent}")
    print(f"   ⏭️  Sin tel:   {skipped}")
    print(f"   ❌ Errores:   {errors}")
    print(f"   📋 Total:     {len(appointments)} citas")


if __name__ == '__main__':
    main()
