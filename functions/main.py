# functions/main.py
import json
import re
from datetime import datetime, timedelta
import pytz

from firebase_functions import https_fn, options, scheduler_fn
import firebase_admin
from firebase_admin import firestore
from twilio.rest import Client

# Inicialización Nativa y Segura (En Cloud Functions no requiere JSON externo)
if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()
MX_TZ = pytz.timezone('America/Mexico_City')

# ── Configuración de Endpoints Serverless (Blaze) ─────────────────────────

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]))
def whatsapp_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Webhook Oficial de WhatsApp (Twilio)
    Reemplaza al antiguo /webhook de Flask en Render.
    """
    try:
        if req.method == "OPTIONS":
            return https_fn.Response(status=204)

        # La migración de la lógica del bot se agregará aquí en los siguientes pasos
        # leyendo de req.form y ejecutando búsquedas en db.collection('patientProfiles')

        return https_fn.Response("Webhook activo en Firebase Functions", status=200)

    except Exception as e:
        print(f"💥 CRASH EN WEBHOOK: {e}")
        return https_fn.Response("Error interno", status=500)

@scheduler_fn.on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City")
def send_reminders_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Cronjob Oficial (8 AM)
    Reemplaza al servicio externo. Se ejecuta automáticamente en Google Cloud Scheduler.
    """
    print("⏳ Ejecutando envío automático de recordatorios (8 AM)...")
    # Lógica de recordatorios aquí

@scheduler_fn.on_schedule(schedule="0 21 * * *", timezone="America/Mexico_City")
def daily_summary_cron(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Cronjob Oficial (9 PM)
    Reemplaza al servicio externo. Envía reportes diarios a terapeutas y recepción.
    """
    print("📊 Ejecutando reporte diario (9 PM)...")
    # Lógica de reporte diario aquí
