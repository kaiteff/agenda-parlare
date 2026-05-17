import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('g:/My Drive/AG/firebase_service_key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

target = '3324955791'
docs = db.collection('patientProfiles').stream()

print(f"--- Buscando {target} ---")
count = 0
for doc in docs:
    d = doc.to_dict()
    phone = str(d.get('phone', ''))
    if target in phone:
        print(f"ID: {doc.id}")
        print(f"Nombre: {d.get('name')}")
        print(f"Teléfono: {phone}")
        print(f"Activo: {d.get('isActive', True)}")
        print(f"Recordatorios: {d.get('wantsWhatsapp', True)}")
        print("-" * 20)
        count += 1

if count == 0:
    print("❌ No se encontró ningún paciente con ese número.")
else:
    print(f"✅ Se encontraron {count} coincidencia(s).")
