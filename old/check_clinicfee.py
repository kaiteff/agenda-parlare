"""
check_clinicfee.py
Verifica y corrige los valores de clinicFee en patientProfiles de Firestore
"""
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializar Firebase
cred = credentials.Certificate('firebase_service_key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

print("=== REVISANDO clinicFee en patientProfiles ===\n")

profiles_ref = db.collection('patientProfiles')
docs = profiles_ref.get()

print(f"{'Nombre':<30} {'Terapeuta':<12} {'clinicFee':<15} {'defaultCost':<12}")
print("-" * 70)

problemas = []

for doc in docs:
    data = doc.to_dict()
    name = data.get('name', '???')
    therapist = data.get('therapist', '???')
    clinic_fee = data.get('clinicFee', 'NO EXISTE')
    default_cost = data.get('defaultCost', '???')
    
    # Marcar como problema si clinicFee no existe, o si clinicFee == defaultCost (posible error)
    flag = ""
    if clinic_fee == 'NO EXISTE':
        flag = " ⚠️ FALTA"
        problemas.append((doc.id, name, therapist, clinic_fee, default_cost))
    elif isinstance(clinic_fee, (int, float)) and isinstance(default_cost, (int, float)):
        if clinic_fee == default_cost and clinic_fee != 250:
            flag = " ROJO IGUAL AL COSTO (posible error)"
            problemas.append((doc.id, name, therapist, clinic_fee, default_cost))
    
    print(f"{name:<30} {therapist:<12} {str(clinic_fee):<15} {str(default_cost):<12}{flag}")

print("\n")
if problemas:
    print(f"Encontrados {len(problemas)} perfiles con posible problema:")
    for p in problemas:
        print(f"  - {p[1]} ({p[2]}): clinicFee={p[3]}, defaultCost={p[4]}")
    
    print("\nDeseas corregir todos los clinicFee problematicos a 250? (s/n): ", end='')
    resp = input().strip().lower()
    if resp == 's':
        for doc_id, name, therapist, old_fee, default_cost in problemas:
            profiles_ref.document(doc_id).update({'clinicFee': 250})
            print(f"  OK {name}: clinicFee actualizado a 250")
        print("\nCorreccion completada.")
    else:
        print("No se realizaron cambios.")
else:
    print("OK Todos los perfiles tienen clinicFee correctamente configurado.")
