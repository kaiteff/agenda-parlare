import firebase_admin
from firebase_admin import credentials, firestore
import sys
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

# Inicializar Firebase
cred = credentials.Certificate('firebase_service_key.json')
try:
    firebase_admin.initialize_app(cred)
except Exception:
    pass
db = firestore.client()

print("==================================================================")
print("🔍 REVISIÓN DE CANCELACIONES Y MOVIMIENTOS RECIENTES DE WHATSAPP")
print("==================================================================")

# 1. Citas canceladas por WhatsApp recientemente
print("\n--- 🚫 CITAS CANCELADAS VÍA WHATSAPP (Últimos 7 días) ---")
apts_ref = db.collection('appointments')
# Consultar citas donde cancelledBy es WhatsApp o contains WhatsApp
apts = apts_ref.where('isCancelled', '==', True).stream()

cancelled_by_wa = []
for doc in apts:
    d = doc.to_dict()
    if d.get('cancelledBy') == 'WhatsApp' or d.get('lastBotUpdate') == 'WhatsApp-Cancel':
        cancelled_by_wa.append(d)

if not cancelled_by_wa:
    print("No se encontraron citas canceladas por el bot de WhatsApp en este periodo.")
else:
    # Ordenar por fecha de cancelación o timestamp si existe
    for d in sorted(cancelled_by_wa, key=lambda x: x.get('date', '')):
        print(f"Paciente: {d.get('name')}")
        print(f"  Terapeuta: {d.get('therapist')}")
        print(f"  Fecha de Cita: {d.get('date')}")
        print(f"  Cancelado el: {d.get('cancelledAt')}")
        print(f"  Origen: {d.get('cancelledBy')} | BotUpdate: {d.get('lastBotUpdate')}")
        print("-" * 40)

# 2. Últimos logs de auditoría de WhatsApp
print("\n--- 📱 LOGS DE AUDITORÍA DE WHATSAPP (Últimos 15 movimientos) ---")
logs_ref = db.collection('audit_logs')
# Como tal vez no tengamos índices compuestos creados, consultamos ordenando localmente o filtrando por action
actions = ['WHATSAPP_REMINDER', 'WHATSAPP_REMINDER_PM', 'WHATSAPP_REMINDER_SKIPPED', 'WHATSAPP_REMINDER_ERROR']
logs = logs_ref.stream()

wa_logs = []
for doc in logs:
    d = doc.to_dict()
    if d.get('action') in actions:
        d['id'] = doc.id
        wa_logs.append(d)

# Ordenar por timestamp descendente
wa_logs.sort(key=lambda x: x.get('timestamp') or datetime.min, reverse=True)

for log in wa_logs[:15]:
    ts = log.get('timestamp')
    ts_str = ts.strftime('%Y-%m-%d %H:%M:%S') if ts else 'Sin fecha'
    details = log.get('details', {})
    print(f"[{ts_str}] Acción: {log.get('action')}")
    print(f"  Paciente: {details.get('patientName')}")
    print(f"  Terapeuta: {details.get('therapist')}")
    print(f"  Cita: {details.get('appointmentDate')}")
    print(f"  Teléfono: {details.get('phone')}")
    if details.get('message'):
        print(f"  Mensaje/Entrada: {details.get('message')}")
    if details.get('error'):
        print(f"  Detalle/Error: {details.get('error')}")
    print("-" * 40)
