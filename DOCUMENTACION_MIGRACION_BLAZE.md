# 🛡️ Plan de Migración Serverless: Firebase Blaze & Functions (Python)
### (Guía Técnica y Protocolo "Cero Riesgo" para Clonación SaaS)

Este documento detalla la estrategia de ingeniería para migrar el backend de la agenda (el bot de WhatsApp de Twilio y los cronjobs diarios) desde **Render** a **Firebase Cloud Functions (Python)** en el plan de pago por uso Firebase Blaze.

---

## 🗺️ Mapa de Arquitectura: Render (Actual) vs. Firebase Blaze (Futuro)

```mermaid
graph TD
    subgraph Servidor Actual (Render)
        A[whatsapp_webhook.py] -->|Flask App| B[Webhook /webhook]
        A -->|API| C[Send Message /api/send-message]
        D[Cronjobs Externos] -->|Peticiones HTTP 8 AM| E[/cron/reminders]
        D -->|Peticiones HTTP 9 AM| F[/cron/daily-summary]
    end

    subgraph Serverless Nativo (Firebase Blaze)
        G[functions/main.py] -->|HTTPS Trigger| H[Cloud Function: whatsapp_webhook]
        G -->|HTTPS Trigger| I[Cloud Function: send_message_api]
        J[Cloud Scheduler] -->|Cron Oficial 8 AM| K[Cloud Function: send_reminders_cron]
        J -->|Cron Oficial 9 AM| L[Cloud Function: daily_summary_cron]
    end
    
    style Servidor Actual (Render) fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style Serverless Nativo (Firebase Blaze) fill:#dcfce7,stroke:#22c55e,stroke-width:2px
```

> **Nota crítica (27 may 2026):** si aún existe un cron externo apuntando a Render `/cron/daily-summary`, **puede mandar el resumen tarde (9 PM)** aunque ya exista `daily_summary_cron` en Firebase a las 9 AM.  
> Recomendación: **deshabilitar el cron externo** y dejar **solo** el Scheduler oficial de Firebase (`daily_summary_cron`).  
> Mitigación temporal: el endpoint de Render se auto-protege y **no envía nada fuera de la ventana 9 AM** (ver guardia `outside_9am_window` en `whatsapp_webhook.py`).

---

## 🎯 Ventajas del Camino A (Serverless en Python)
1. **Costo Real de Operación $0:** Firebase Functions en plan Blaze regala **2 millones de ejecuciones de funciones** y **3 descargas de Scheduler al mes**. No pagarás nada por el bot.
2. **Cero Mantenimiento de Servidores:** Olvídate de caídas en Render, cuotas de inactividad o configuraciones manuales. Google administra la infraestructura de forma automática.
3. **Credenciales 100% Seguras:** Las llaves de Twilio y tokens de Google se guardan en **Google Secret Manager** y se inyectan en tiempo de ejecución, eliminando vulnerabilidades en el repositorio.
4. **Clonación SaaS Automatizada:** En una nueva clínica, ejecutar `firebase deploy` creará instantáneamente toda la web móvil, base de datos, bot de WhatsApp y cronjobs de forma automatizada y aislada.

---

## 📋 Protocolo de Transición Híbrido "Cero Riesgo" (Paso a Paso)

Para garantizar la estabilidad operativa del Centro Parláre, la migración se hará en paralelo. **Render seguirá encendido en todo momento hasta validar que Firebase funciona al 100%.**

### Paso 1: Preparación (Dueño de la Clínica)
1. Entra a la consola de Firebase (`https://console.firebase.google.com/`).
2. En la parte inferior izquierda, haz clic en **"Upgrade"** y selecciona el **Plan Blaze** (Pago por uso).
   > *Nota: Firebase te pedirá asociar una tarjeta de crédito. No te preocupes, el tráfico actual de Parláre está al 0.01% del límite gratuito de Blaze, por lo que el cargo mensual seguirá siendo de $0.*

### Paso 2: Inicialización de Functions en la Computadora
Desde la terminal en `d:\agbc\Ag_Pa`, iniciaremos el entorno de funciones en Python ejecutando:
```bash
firebase init functions
```
* Seleccionar **Python** como lenguaje.
* Responder **No** al sobreescribir archivos existentes si pregunta.
* Esto creará un directorio `/functions` con `main.py` y `requirements.txt`.

### Paso 3: Definición del Código Serverless
#### A. Dependencias (`functions/requirements.txt`):
```text
firebase-functions~=2.0
firebase-admin~=6.0
twilio~=8.0
pytz
google-api-python-client
google-auth
google-auth-oauthlib
```

#### B. Funciones en `functions/main.py`:
Implementaremos la lógica actual adaptándola a los decoradores oficiales de Firebase de 2da generación:
* **El Webhook:**
  ```python
  from firebase_functions import https_fn, options
  
  @https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["POST", "OPTIONS"]))
  def whatsapp_webhook(req: https_fn.Request) -> https_fn.Response:
      # Lógica idéntica de Twilio, parsing de req.form y búsquedas en Firestore
  ```
* **Los Recordatorios Programados (Scheduler):**
  ```python
  from firebase_functions import scheduler_fn
  
  @scheduler_fn.on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City")
  def send_reminders_cron(event: scheduler_fn.ScheduledEvent) -> None:
      # Lógica idéntica del recordatorio de las 8 AM
  ```

### Paso 4: Registro de Secretos Seguros
En lugar de escribir tokens en archivos JSON o variables de entorno de Render, registramos las llaves directamente en Firebase:
```bash
firebase functions:secrets:set TWILIO_SID="tu_sid"
firebase functions:secrets:set TWILIO_TOKEN="tu_token"
firebase functions:secrets:set GOOGLE_REFRESH_TOKEN="tu_refresh_token"
firebase functions:secrets:set GOOGLE_CLIENT_ID="tu_client_id"
firebase functions:secrets:set GOOGLE_CLIENT_SECRET="tu_client_secret"
```

### Paso 5: Despliegue en Paralelo
Desplegamos la carpeta `/functions` sin tocar la web actual:
```bash
firebase deploy --only functions
```
Al finalizar, Firebase te entregará una URL única para tu webhook, por ejemplo:
`https://us-central1-taconotaco-d94fc.cloudfunctions.net/whatsapp_webhook`

---

## 🧪 Plan de Pruebas y Validación (Fase Híbrida)

1. **Prueba Aislada (Postman / Consola):**
   * Enviaremos una petición de prueba simulada a la URL de la Cloud Function para validar que busque correctamente en la base de datos de Firestore.
2. **Switch Rápido de WhatsApp (Twilio Webhook):**
   * Entraremos a la consola de Twilio y en la sección de WhatsApp Sandbox / Número Activo, cambiaremos la URL del Webhook de Render por la nueva URL de la Cloud Function de Firebase.
   * **La Prueba:** Enviaremos un mensaje de WhatsApp (ej: *"Sí, confirmo"*) desde un teléfono real.
   * **Validación:** Confirmamos que la cita se marque en Firestore en tiempo real y que el semáforo de Google cambie a verde.
3. **Monitoreo de Logs:**
   * Abriremos la consola de Firebase en la pestaña "Functions -> Logs" para verificar que no haya crashes ni desfases de zona horaria.

---

## 🛡️ Protocolo de Rollback Instantáneo (Plan de Retorno)

Si durante la prueba de 5 minutos detectamos algún comportamiento extraño en la Cloud Function:
1. **Acción de Reversión:** Entramos a la consola de Twilio de inmediato.
2. **Restaurar URL:** Reemplazamos la URL de la Cloud Function de Firebase con la URL antigua de Render (que ha permanecido encendida):
   `https://agenda-parlare-webhook.onrender.com/webhook`
3. **¡Listo!** El sistema vuelve a operar a través de Render de forma instantánea en menos de 10 segundos, asegurando que ningún paciente se quede sin atención.

---

## 🔍 Gotchas y Resoluciones Comunes (Errores de Permisos GCP)

Durante la implementación real de la migración en el Centro Parláre, se identificaron y resolvieron los siguientes comportamientos y errores críticos de Google Cloud Platform (GCP) que ocurren por defecto en proyectos de Firebase nuevos:

### 1. Error de Permisos en Cloud Build (Build failed with status: FAILURE)
* **El Problema:** Al ejecutar `firebase deploy --only functions`, la compilación falla con el mensaje `Could not build the function due to a missing permission on the build service account`. Esto ocurre porque las nuevas políticas de seguridad de GCP no asignan el permiso de construcción a la cuenta de servicio por defecto de Compute.
* **La Solución:**
  1. Entrar al panel de [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam?project=taconotaco-d94fc).
  2. Identificar la fila con la cuenta de servicio de Compute: `40563362456-compute@developer.gserviceaccount.com` (en otras clínicas, usar el número de proyecto correspondiente).
  3. Editar los permisos de esa cuenta (ícono del lápiz ✏️).
  4. Hacer clic en **"Agregar otro rol"** (Add another role).
  5. Seleccionar el rol: **`Cloud Build Service Account`** (Cuenta de servicio de Cloud Build) y hacer clic en **Guardar**.
  6. Reintentar el despliegue tras 15 segundos.

### 2. Error local de Análisis de Credenciales en Firebase CLI (DefaultCredentialsError)
* **El Problema:** Al lanzar `firebase deploy`, la CLI importa `main.py` de forma local para analizar su configuración. Como tu máquina de desarrollo no cuenta con credenciales activas del servidor de GCP, instanciar Firestore de forma global con `db = firestore.client()` detona un crash que interrumpe la compilación.
* **La Solución (Implementada en `functions/main.py`):**
  Se inyectó un **Proxy Dinámico (`FirestoreProxy`)** para retrasar la inicialización de Firestore:
  ```python
  class FirestoreProxy:
      def __getattr__(self, name):
          if not firebase_admin._apps:
              firebase_admin.initialize_app()
          return getattr(firestore.client(), name)
  db = FirestoreProxy()
  ```
  Esto permite que la CLI compile el código localmente sin credenciales, y la conexión real a Firestore se realice de forma transparente solo cuando la Cloud Function se ejecute activamente en los servidores de Google.

### 3. Solicitud de Retención de Contenedores (Cleanup Policy)
* **El Problema:** Al desplegar por primera vez funciones de 2da generación en Python, Firebase CLI detecta que no hay una política de purga de imágenes y pregunta: `How many days do you want to keep container images before they're deleted?`. Si no se eliminan las imágenes antiguas, Google Cloud podría realizar micro-cargos mensuales de almacenamiento.
* **La Solución:** Escribir **`1`** y presionar **Enter**. Esto crea una regla automática nativa para borrar las imágenes compiladas de Artifact Registry en 24 horas, asegurando que tu almacenamiento acumulado se mantenga siempre dentro del rango de **$0 USD**.

---
*Documento de Control y Estrategia V2 — Diseñado para asegurar la continuidad de negocio y la escalabilidad técnica hacia un SaaS agnóstico.*
