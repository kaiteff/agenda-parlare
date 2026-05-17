# functions/main.py
"""
Parláre Cloud Functions - Serverless Backend (Plan Blaze)
Migración completa de Flask/Render a Firebase Functions 2nd Gen en Python.
"""
import json
import re
from datetime import datetime, timedelta
import pytz

# Firebase & Functions
import firebase_admin
from firebase_admin import firestore
from firebase_functions import https_fn, options, scheduler_fn, firestore_fn
from firebase_functions.params import SecretParam

# Twilio
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

# Google APIs
import google.auth
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── 1. Inicialización Global y Secretos ────────────────────────────────────

# Proxy Dinámico para evitar que Firebase CLI falle al analizar el archivo localmente
class FirestoreProxy:
    def __getattr__(self, name):
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        return getattr(firestore.client(), name)

db = FirestoreProxy()

MX_TZ = pytz.timezone('America/Mexico_City')

# Registro de Secretos de Firebase (se inyectarán en tiempo de ejecución)
TWILIO_SID = SecretParam('TWILIO_SID')
TWILIO_TOKEN = SecretParam('TWILIO_TOKEN')
GOOGLE_REFRESH_TOKEN = SecretParam('GOOGLE_REFRESH_TOKEN')
GOOGLE_CLIENT_ID = SecretParam('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = SecretParam('GOOGLE_CLIENT_SECRET')

ALL_SECRETS = [TWILIO_SID, TWILIO_TOKEN, GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET]
TWILIO_WHATSAPP_FROM = "whatsapp:+16066451055"

# ── 2. Configuraciones Duras (Pendiente Fase 2 SaaS) ───────────────────────

SHEET_CONFIG = {
    'spreadsheets': {
        'diana': '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
        'sam': '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg',
        'vero': '1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc'
    },
    'targetSheetName': 'App_Data'
}

THERAPIST_CALENDARS = {
    'diana': '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
    'vero': 'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
    'sam': '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
}

THERAPIST_PHONES = {
    'diana': '523331834432',
    'sam': '523321145307',
    'vero': '523318006167',
    'reception': '523315196702'
}

# ── 3. Factorías e Instancias Seguras (Evaluación en Ejecución) ───────────

def get_twilio_client():
    """Genera cliente de Twilio leyendo secretos seguros en runtime"""
    return Client(TWILIO_SID.value, TWILIO_TOKEN.value)

def get_google_services():
    """Genera servicios genéricos usando la cuenta de servicio Default de GCP"""
    try:
        credentials, _ = google.auth.default(scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/calendar'
        ])
        sheets_service = build('sheets', 'v4', credentials=credentials)
        calendar_service = build('calendar', 'v3', credentials=credentials)
        return sheets_service, calendar_service
    except Exception as e:
        print(f"Error inicializando Google Auth Default: {e}")
        return None, None

def get_user_calendar_service():
    """Genera cliente OAuth para el calendario Maestro de Admin"""
    try:
        creds = Credentials(
            token=None,
            refresh_token=GOOGLE_REFRESH_TOKEN.value,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GOOGLE_CLIENT_ID.value,
            client_secret=GOOGLE_CLIENT_SECRET.value,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        creds.refresh(Request())
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"Error construyendo User Calendar Service OAuth: {e}")
        return None

# ── 4. Utilidades Centrales ───────────────────────────────────────────────

def parse_mx_datetime(date_str):
    raw = str(date_str).strip()
    if raw.endswith('Z'):
        raw = raw.replace('Z', '+00:00')
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(MX_TZ)
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = MX_TZ.localize(dt)
    else:
        dt = dt.astimezone(MX_TZ)
    return dt

def normalize_phone(phone):
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) > 10:
        if digits.startswith('521'): digits = digits[3:]
        elif digits.startswith('52'): digits = digits[2:]
    return digits[-10:] if len(digits) >= 10 else digits

def update_google_sheet(appointment, status):
    sheets_service, _ = get_google_services()
    if not sheets_service: return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        spreadsheet_id = SHEET_CONFIG['spreadsheets'].get(therapist)
        if not spreadsheet_id: return

        dt = parse_mx_datetime(appointment['date'])
        values = [[
            dt.strftime('%d/%m/%Y'), dt.strftime('%I:%M %p'),
            appointment.get('name', 'Paciente'), 0, status,
            datetime.now(MX_TZ).isoformat(), dt.hour, 0, 0
        ]]
        sheets_service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id, range=f"{SHEET_CONFIG['targetSheetName']}!A:I",
            valueInputOption='USER_ENTERED', body={'values': values}
        ).execute()
        print(f"✅ Sync Sheet OK: {appointment.get('name')} -> {status}")
    except Exception as e:
        print(f"❌ Error Sync Sheet: {e}")

def update_google_calendar(appointment, status_text):
    _, calendar_service = get_google_services()
    if not calendar_service or not appointment.get('googleEventId'): return
    try:
        therapist = appointment.get('therapist', 'diana').lower()
        target_cal_id = THERAPIST_CALENDARS.get(therapist, THERAPIST_CALENDARS['diana'])
        event = calendar_service.events().get(calendarId=target_cal_id, eventId=appointment['googleEventId']).execute()
        
        desc = event.get('description', '').replace("\n✅ Asistencia confirmada vía WhatsApp", "").replace("\n❌ CANCELADO vía WhatsApp", "")
        if status_text == "CONFIRMADO":
            desc += "\n✅ Asistencia confirmada vía WhatsApp"
        elif status_text == "CANCELADO":
            desc += "\n❌ CANCELADO vía WhatsApp"
            event['colorId'] = '8'
            
        event['description'] = desc
        calendar_service.events().update(calendarId=target_cal_id, eventId=appointment['googleEventId'], body=event).execute()
        print(f"✅ Sync Calendar OK: {appointment.get('name')}")
    except Exception as e:
        print(f"❌ Error Sync Calendar: {e}")

def notify_receptionist(patient_name, action_type, date_str="Mañana", hour_str="", therapist="Diana", phone=""):
    try:
        twilio_client = get_twilio_client()
        yari_num = "whatsapp:+523315196702"
        icon = "❌" if "CANCELAR" in action_type.upper() else "📞"
        wa_link = f"wa.me/{phone}" if phone else "No disponible"
        detalle = f"{icon} CANCELACIÓN: {patient_name}  Cita: {date_str} {hour_str} ({therapist})  ACCION: Solicitar justificante y reagendar.  📱 Escribir: {wa_link}"
        
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_FROM, to=yari_num, content_sid='HX28a1f7c6ccbb2b507f9764b098c44779',
            content_variables=json.dumps({"1": "Yari", "2": date_str, "3": detalle})
        )
        print(f"📩 Notificación enviada a Yari para: {patient_name}")
    except Exception as e:
        print(f"⚠️ Error notificando a Yari: {e}")

def find_patients_by_identifier(phone, bsuid=None):
    found, found_ids = [], set()
    if bsuid:
        docs = db.collection('patientProfiles').where('whatsappBSUID', '==', bsuid).stream()
        for doc in docs:
            if doc.id not in found_ids and doc.to_dict().get('isActive', True):
                found.append({'id': doc.id, 'name': doc.to_dict().get('name', '')})
                found_ids.add(doc.id)
        if found: return found

    if phone:
        norm = normalize_phone(phone)
        search_variants = [norm, f"+52{norm}", f"52{norm}", f"+521{norm}", f"521{norm}"]
        docs_to_update = []
        for variant in search_variants:
            docs = db.collection('patientProfiles').where('phone', '==', variant).stream()
            for doc in docs:
                if doc.id not in found_ids and doc.to_dict().get('isActive', True):
                    found.append({'id': doc.id, 'name': doc.to_dict().get('name', '')})
                    found_ids.add(doc.id)
                    if bsuid and not doc.to_dict().get('whatsappBSUID'):
                        docs_to_update.append(doc.reference)
            if found: break
        if docs_to_update and bsuid:
            for ref in docs_to_update:
                try: ref.update({'whatsappBSUID': bsuid})
                except: pass
    return found

def find_tomorrow_appointments(patient_names):
    tomorrow = datetime.now(MX_TZ) + timedelta(days=1)
    start, end = f"{tomorrow.strftime('%Y-%m-%d')}T00:00:00", f"{tomorrow.strftime('%Y-%m-%d')}T23:59:59"
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', start).where('date', '<=', end).stream()
    return [{'id': d.id, **d.to_dict()} for d in results if not d.to_dict().get('isCancelled') and d.to_dict().get('name', '').lower() in names_lower]

def find_next_appointment(patient_names):
    now_iso = datetime.now(MX_TZ).strftime('%Y-%m-%dT%H:%M:%S')
    names_lower = [n.lower() for n in patient_names]
    results = db.collection('appointments').where('date', '>=', now_iso).stream()
    apts = [d.to_dict() for d in results if not d.to_dict().get('isCancelled') and d.to_dict().get('name', '').lower() in names_lower]
    if apts:
        apts.sort(key=lambda x: x['date'])
        return apts[0]
    return None

# ── 5. Endpoints / Webhooks ───────────────────────────────────────────────

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]), secrets=ALL_SECRETS)
def whatsapp_webhook(req: https_fn.Request) -> https_fn.Response:
    try:
        msg_body = req.form.get('Body', '').strip().lower()
        from_num = req.form.get('From', '')
        bsuid = req.form.get('ExternalUserId', '')
        print(f"📥 Recibido de {from_num}: {msg_body}")

        resp = MessagingResponse()
        patients = find_patients_by_identifier(from_num, bsuid)

        if not patients:
            norm_from = normalize_phone(from_num)
            staff_name = next((k.capitalize() for k, p in THERAPIST_PHONES.items() if normalize_phone(p) == norm_from), None)
            if staff_name:
                resp.message(f"¡Hola {staff_name}! Sesión abierta por 24h. Lista para notificaciones. 🤖✅")
            else:
                resp.message("Tu número no está registrado. Contacta a Recepción de Parláre.")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        RECEPTION_KEYWORDS = ['3', 'recepcion', 'yari', 'duda']
        CONFIRM_KEYWORDS = ['1', 'ok', 'si', 'sí', 'confirmar']
        CANCEL_KEYWORDS = ['2', 'cancelar', 'no']
        THANKS_KEYWORDS = ['gracias']

        if any(w in msg_body for w in RECEPTION_KEYWORDS):
            resp.message("Entendido. Puedes hablarnos directo aquí: https://wa.me/523315196702")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if any(w in msg_body for w in THANKS_KEYWORDS) and not any(w in msg_body for w in CONFIRM_KEYWORDS + CANCEL_KEYWORDS):
            resp.message("¡De nada! Que tengas un muy bonito día. 😊")
            return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        apts = find_tomorrow_appointments([p['name'] for p in patients])
        if not apts:
            next_apt = find_next_appointment([p['name'] for p in patients])
            if next_apt:
                dt = parse_mx_datetime(next_apt['date'])
                meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                day_str = f"{dt.strftime('%A').capitalize()} {dt.day} de {meses[dt.month]}"
                get_twilio_client().messages.create(
                    from_=TWILIO_WHATSAPP_FROM, to=from_num, content_sid='HXe500a927cfbef3321fc0ba7ae7aa86d7',
                    content_variables=json.dumps({"1": day_str, "2": dt.strftime('%I:%M %p').lstrip('0')})
                )
                return https_fn.Response("", status=200)
            else:
                resp.message("Hola, no encontramos citas futuras. Contacta a Recepción: https://wa.me/523315196702")
                return https_fn.Response(str(resp), status=200, mimetype='text/xml')

        if any(w in msg_body for w in CONFIRM_KEYWORDS):
            for a in apts:
                db.collection('appointments').document(a['id']).update({
                    'confirmed': True, 'confirmedAt': firestore.SERVER_TIMESTAMP,
                    'confirmedBy': 'Robot Parláre', 'lastBotUpdate': 'WhatsApp-Confirm'
                })
                update_google_sheet(a, "CONFIRMADO")
                update_google_calendar(a, "CONFIRMADO")
            try:
                get_twilio_client().messages.create(from_=TWILIO_WHATSAPP_FROM, to=from_num, content_sid='HX079c41d2222032d6c3ab41f44c7272f7', content_variables='{}')
            except:
                resp.message("✅ ¡Gracias! Se han confirmado las citas. ¡Nos vemos!")
                return https_fn.Response(str(resp), status=200, mimetype='text/xml')
            return https_fn.Response("", status=200)

        elif any(w in msg_body for w in CANCEL_KEYWORDS):
            for a in apts:
                db.collection('appointments').document(a['id']).update({
                    'isCancelled': True, 'cancelledBy': 'WhatsApp',
                    'cancelledAt': firestore.SERVER_TIMESTAMP, 'lastBotUpdate': 'WhatsApp-Cancel'
                })
                update_google_sheet(a, "CANCELADO")
                update_google_calendar(a, "CANCELADO")
                dt = parse_mx_datetime(a['date'])
                notify_receptionist(a.get('name', ''), "CANCELADA", f"{dt.day}/{dt.month}", dt.strftime('%I:%M %p').lstrip('0'), a.get('therapist', 'Diana').title(), re.sub(r'\D', '', from_num))
            resp.message("Cita cancelada. ¡Esperamos todo esté bien! 😊 Para reagendar y evitar cargos, envía tu justificante médico a Yari aquí: https://wa.me/523315196702")
        else:
            resp.message("Responde 1 para CONFIRMAR o 2 para CANCELAR.")
        return https_fn.Response(str(resp), status=200, mimetype='text/xml')

    except Exception as e:
        print(f"💥 CRASH EN WEBHOOK: {e}")
        error_resp = MessagingResponse()
        error_resp.message(f"Problema técnico (Error: {str(e)}). Contacta a Recepción.")
        return https_fn.Response(str(error_resp), status=200, mimetype='text/xml')

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]), secrets=ALL_SECRETS)
def send_message_api(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS": return https_fn.Response(status=204)
    data = req.get_json(silent=True) or {}
    dest = f"whatsapp:+52{normalize_phone(data.get('phone'))}"
    try:
        tw_args = {'from_': TWILIO_WHATSAPP_FROM, 'to': dest}
        if data.get('variables'):
            tw_args.update({'content_sid': data.get('template_sid'), 'content_variables': json.dumps(data.get('variables'))})
        else:
            tw_args.update({'body': data.get('message')})
        get_twilio_client().messages.create(**tw_args)
        return https_fn.Response(json.dumps({'status': 'success'}), status=200, mimetype='application/json')
    except Exception as e:
        return https_fn.Response(json.dumps({'error': str(e)}), status=500, mimetype='application/json')

# ── 6. Tareas Programadas Automáticas (Cloud Scheduler) ───────────────────

@scheduler_fn.on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def send_reminders_cron(event: scheduler_fn.ScheduledEvent) -> None:
    mx_now = datetime.now(MX_TZ)
    tomorrow = mx_now + timedelta(days=1)
    
    profiles = db.collection('patientProfiles').stream()
    phone_map = {p.to_dict().get('name', '').strip().lower(): p.to_dict() for p in profiles if p.to_dict().get('phone') and p.to_dict().get('wantsWhatsapp', True)}

    start_iso = f"{tomorrow.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(tomorrow + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    query = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()

    for doc in query:
        apt = doc.to_dict()
        if apt.get('isCancelled') or apt.get('confirmed'): continue
        p_name = apt.get('name', '')
        p_info = phone_map.get(p_name.strip().lower())
        if not p_info: continue

        last_sent = apt.get('lastReminderSentAt')
        if last_sent and (last_sent.to_datetime() if hasattr(last_sent, 'to_datetime') else last_sent).astimezone(MX_TZ).date() == mx_now.date():
            continue

        try:
            dt = parse_mx_datetime(apt['date'])
            if dt.date() != tomorrow.date() or not (8 <= dt.hour <= 20): continue
            meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
            date_str = f"{dt.day} de {meses[dt.month]}"
            hour_str = dt.strftime('%I:%M %p').lstrip('0')
            therapist = apt.get('therapist', 'Diana').title()
            
            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=f"whatsapp:+{p_info.get('countryCode', '52')}{normalize_phone(p_info['phone'])}",
                content_sid='HX100149d5295d1839864ad33cc9e73567',
                content_variables=json.dumps({"1": date_str, "2": hour_str, "3": therapist})
            )
            db.collection('appointments').document(doc.id).update({
                'lastReminderSentAt': firestore.SERVER_TIMESTAMP, 'lastReminderType': 'AUTO_CRON'
            })
            print(f"✅ Recordatorio enviado a {p_name}")
        except Exception as e:
            print(f"⚠️ Error enviando a {p_name}: {e}")

@scheduler_fn.on_schedule(schedule="0 21 * * *", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def daily_summary_cron(event: scheduler_fn.ScheduledEvent) -> None:
    mx_now = datetime.now(MX_TZ)
    start_iso = f"{mx_now.strftime('%Y-%m-%d')}T00:00:00"
    end_iso = f"{(mx_now + timedelta(days=1)).strftime('%Y-%m-%d')}T08:00:00"
    
    query = db.collection('appointments').where('date', '>=', start_iso).where('date', '<=', end_iso).stream()
    by_therapist = {'diana': [], 'sam': [], 'vero': []}
    
    for doc in query:
        a = doc.to_dict()
        if a.get('isCancelled'): continue
        try:
            if parse_mx_datetime(a['date']).date() != mx_now.date(): continue
        except: continue
        t = str(a.get('therapist', 'diana')).strip().lower()
        if t in by_therapist: by_therapist[t].append(a)
        else: by_therapist['diana'].append(a)

    for t_key in by_therapist: by_therapist[t_key].sort(key=lambda x: x.get('date', ''))
    
    for t_key, list_apts in by_therapist.items():
        if not list_apts or not THERAPIST_PHONES.get(t_key): continue
        items = []
        for a in list_apts:
            try:
                dt = parse_mx_datetime(a['date'])
                if not (8 <= dt.hour <= 20): continue
                time_str = dt.strftime('%I:%M %p').lstrip('0').lower()
            except: time_str = "??:??"
            items.append(f"• {time_str}: {a.get('name')} ({'✅' if a.get('confirmed') else '⏳'})")
        
        try:
            get_twilio_client().messages.create(
                from_=TWILIO_WHATSAPP_FROM, to=f"whatsapp:+{THERAPIST_PHONES[t_key]}",
                content_sid='HX28a1f7c6ccbb2b507f9764b098c44779',
                content_variables=json.dumps({"1": t_key.capitalize(), "2": mx_now.strftime('%d/%b'), "3": "  /  ".join(items) if items else "Sin citas"})
            )
        except Exception as e: print(f"❌ Error reporte {t_key}: {e}")

@scheduler_fn.on_schedule(schedule="0 1 * * 1", timezone="America/Mexico_City", secrets=ALL_SECRETS)
def server_calendar_sync(event: scheduler_fn.ScheduledEvent) -> None:
    gcal = get_user_calendar_service()
    if not gcal: return
    mx_now = datetime.now(MX_TZ)
    week_start = (mx_now - timedelta(days=mx_now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    query = db.collection('appointments').where('date', '>=', f"{week_start.strftime('%Y-%m-%d')}T00:00:00").where('date', '<=', f"{week_end.strftime('%Y-%m-%d')}T23:59:59").stream()
    active_apts = [a.to_dict() | {'_id': a.id} for a in query if not a.to_dict().get('isCancelled')]

    for t_key, cal_id in THERAPIST_CALENDARS.items():
        try:
            existing = gcal.events().list(calendarId=cal_id, timeMin=week_start.isoformat(), timeMax=week_end.isoformat(), singleEvents=True, maxResults=2500).execute().get('items', [])
            for ev in existing: gcal.events().delete(calendarId=cal_id, eventId=ev['id']).execute()
        except: continue

        for a in [ap for ap in active_apts if (ap.get('therapist') or 'diana').lower() == t_key]:
            try:
                dt_start = parse_mx_datetime(a['date'])
                dt_end = dt_start + timedelta(hours=1)
                color_id = '4' if t_key == 'diana' else ('7' if t_key == 'sam' else '3')
                summary = ('✅ ' if a.get('confirmed') else '') + a.get('name', 'Cita')
                created_ev = gcal.events().insert(calendarId=cal_id, body={
                    'summary': summary, 'description': f"Terapeuta: {t_key.capitalize()}\nCosto: ${a.get('cost', 0)}\n📱 Agenda Parláre",
                    'start': {'dateTime': dt_start.isoformat(), 'timeZone': 'America/Mexico_City'}, 'end': {'dateTime': dt_end.isoformat(), 'timeZone': 'America/Mexico_City'},
                    'colorId': color_id, 'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 5}]}
                }).execute()
                db.collection('appointments').document(a['_id']).update({'googleEventId': created_ev['id']})
            except: pass

# ── 7. Gatillos de Base de Datos (Firestore Triggers) ─────────────────────

@firestore_fn.on_document_created(document="patientProfiles/{patientId}", secrets=ALL_SECRETS)
def on_patient_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    try:
        snap = event.data
        if not snap: return
        data = snap.to_dict()
        if not data: return
        
        phone = data.get('phone')
        wants_wa = data.get('wantsWhatsapp', True)
        if not phone or not wants_wa: return
        
        name = data.get('name', 'Paciente').strip()
        first_name = name.split(' ')[0] if name else 'Paciente'
        dest = f"whatsapp:+52{normalize_phone(phone)}"
        
        get_twilio_client().messages.create(
            from_=TWILIO_WHATSAPP_FROM, to=dest,
            content_sid='HX2ce20d173330363b2db700bc02e66204',
            content_variables=json.dumps({"1": first_name})
        )
        print(f"🎉 Mensaje de bienvenida enviado exitosamente a: {name}")
    except Exception as e:
        print(f"❌ Error en trigger de bienvenida: {e}")

