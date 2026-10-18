# functions/migrate_claims.py
import firebase_admin
from firebase_admin import auth, firestore

AUTHORIZED_USERS = {
    'lopezcarpio7@gmail.com': { 'role': 'admin', 'therapist': 'diana', 'displayName': 'Diana' },
    'sammygtz90@gmail.com': { 'role': 'therapist', 'therapist': 'sam', 'displayName': 'Sam' },
    'sanchezverooo21@gmail.com': { 'role': 'therapist', 'therapist': 'vero', 'displayName': 'Vero' },
    'yaritzajocgo@gmail.com': { 'role': 'receptionist', 'therapist': 'all', 'displayName': 'Yari' },
    'rodriguezd.danielrob@gmail.com': { 'role': 'admin', 'therapist': 'all', 'displayName': 'Daniel (Admin)' },
    'kaiteff@gmail.com': { 'role': 'admin', 'therapist': 'all', 'displayName': 'Kaiteff (Admin)' }
}

def migrate():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    db = firestore.client()
    
    for email, data in AUTHORIZED_USERS.items():
        try:
            user = auth.get_user_by_email(email)
            print(f"✅ Encontrado usuario: {email} (UID: {user.uid})")
            
            claims = {
                'role': data['role'],
                'therapist': data['therapist']
            }
            
            auth.set_custom_user_claims(user.uid, claims)
            print(f"   -> Custom Claims asignados: {claims}")
            
            db.collection('users').document(user.uid).set({
                'email': email,
                'displayName': data['displayName'],
                'role': data['role'],
                'therapist': data['therapist'],
                'migratedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"   -> Perfil guardado en Firestore (/users/{user.uid})")
            
        except auth.UserNotFoundError:
            print(f"❌ Usuario NO encontrado en Firebase Auth: {email}")
        except Exception as e:
            print(f"⚠️ Error procesando {email}: {e}")

if __name__ == '__main__':
    print("Iniciando migración de Custom Claims...")
    migrate()
    print("Migración finalizada.")
