import firebase_admin
from firebase_admin import credentials, firestore
import sys

sys.stdout.reconfigure(encoding='utf-8')

cred = credentials.Certificate('firebase_service_key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

patients_to_check = [
    "Dario Lasso",
    "Leonardo Martinez",
    "Andre Santiago Cardenas",
    "Aquiles Rigoberto Aviles",
    "Rafael Perez Fajardo",
    "Mariana Osorno Aspe",
    "Ezequias Malek Lopez Vega"
]

print("--- Patient Profiles Checking ---")
for name in patients_to_check:
    docs = db.collection('patientProfiles').where('name', '==', name).stream()
    found = False
    for doc in docs:
        found = True
        d = doc.to_dict()
        print(f"Name: {d.get('name')}")
        print(f"  Phone: {d.get('phone')}")
        print(f"  Wants WhatsApp: {d.get('wantsWhatsapp')}")
        print(f"  Recurrent Opt In: {d.get('recurrentOptIn')}")
        print(f"  Recurrent Opt In Updated At: {d.get('recurrentOptInUpdatedAt')}")
        print(f"  WhatsApp Opt In: {d.get('whatsappOptIn')}")
        print(f"  Is Active: {d.get('isActive')}")
    if not found:
        print(f"Name: {name} | PROFILE NOT FOUND")
