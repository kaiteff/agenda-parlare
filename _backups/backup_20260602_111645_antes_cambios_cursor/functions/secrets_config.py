# functions/secrets_config.py
"""Definición centralizada de SecretParams para evitar inicializaciones duplicadas en despliegues."""
from firebase_functions.params import SecretParam

TWILIO_SID = SecretParam('TWILIO_SID')
TWILIO_TOKEN = SecretParam('TWILIO_TOKEN')
GOOGLE_REFRESH_TOKEN = SecretParam('GOOGLE_REFRESH_TOKEN')
GOOGLE_CLIENT_ID = SecretParam('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = SecretParam('GOOGLE_CLIENT_SECRET')

ALL_SECRETS = [
    TWILIO_SID,
    TWILIO_TOKEN,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
]
