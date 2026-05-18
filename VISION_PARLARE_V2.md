# 🚀 Visión y Estrategia: Agenda Parláre V2
### (Documento de Contexto para Asistente de IA / Cursor)

> Este documento es el punto de partida para cualquier asistente de IA (Cursor, Copilot, etc.) que colabore en este proyecto.
> Léelo completo antes de escribir una sola línea de código. Contiene las reglas del sistema, la arquitectura actual, errores conocidos y la hoja de ruta futura.

---

## 🧠 Contexto del Proyecto

**Agenda Parláre** es una aplicación web de gestión clínica para el **Centro Parláre**, un centro de terapia psicológica con 3 terapeutas: **Diana, Sam y Vero**.

- **Usuarios del sistema**: Terapeutas (Diana, Sam, Vero), Recepción (Yari) y el administrador (Daniel - `rodriguezd.danielrob@gmail.com`).
- **¿Qué hace?**: Agenda de citas, control de pagos, sincronización con Google Calendar (un calendario por terapeuta), envío de recordatorios por WhatsApp y registro de pagos en Google Sheets (uno por terapeuta).
- **Firebase**: `taconotaco-d94fc` (Project ID). Es la única fuente de verdad. **Firebase siempre gana sobre Google Calendar y Google Sheets**.
- **Hosting**: Firebase Hosting → `https://taconotaco-d94fc.web.app`
- **Bot WhatsApp**: Python (Flask) desplegado en Render, vinculado a GitHub `main` (auto-deploy con cada `git push`).
- **Repositorio**: `https://github.com/kaiteff/agenda-parlare` (rama `main`).
- **Directorio local**: `g:\My Drive\AG`

---

## 📁 Arquitectura del Código

El frontend es una **Single Page Application (SPA)** en HTML + Vanilla JS (ES Modules) + Tailwind CSS compilado. Sin frameworks como React o Vue.

```
g:\My Drive\AG
├── index.html              # Esqueleto base de la SPA
├── index.css               # Sistema de diseño, variables, animaciones premium
├── serve.py                # Servidor local de desarrollo
├── whatsapp_webhook.py     # Bot de WhatsApp (Flask/Python) → desplegado en Render
├── firebase.json           # Configuración de Firebase Hosting
├── js/
│   ├── app.js              # Punto de entrada y orquestador principal
│   ├── firebase.js         # Config de Firebase + helpers de Auth y Firestore
│   ├── components/         # UI modular (Header, Sidebar, Modales, WhatsAppDashboard)
│   ├── managers/           # Lógica de negocio (AuthManager, PatientManager, etc.)
│   ├── modules/
│   │   ├── calendar/       # Grid, Drag & Drop, Modales de edición de citas
│   │   ├── reports/        # FinancialReport.js, CorteDeCaja.js
│   │   ├── admin/          # AdminSettingsModal.js, AuditPanel.js
│   │   └── help/           # HelpManual.js ← SIEMPRE actualizar al cambiar UI
│   ├── services/
│   │   ├── google/
│   │   │   ├── GoogleAuthService.js  # Autenticación GAPI + GIS (OAuth2)
│   │   │   ├── GoogleCalendarService.js  # Sync de citas con Google Calendar
│   │   │   └── SheetService.js       # Sync de pagos con Google Sheets
│   │   ├── AuditService.js     # Motor de bitácora (registra acciones en Sheets)
│   │   ├── SyncService.js      # Coordinador de guardados en lote
│   │   └── NetworkMonitor.js   # Detector de conexión offline
│   └── utils/
│       ├── TimeManager.js      # ← CENTRAL. Toda la lógica de fechas pasa por aquí
│       ├── ToastService.js     # Notificaciones no bloqueantes (reemplaza alert())
│       ├── LoaderService.js    # Spinner global para operaciones largas
│       └── Logger.js          # Logger con prefijos por módulo
```

---

## 🔗 IDs y Configuración Crítica (No cambiar sin aviso)

### Google Sheets (Excel por terapeuta)
```javascript
spreadsheets: {
    diana: '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
    sam:   '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg',
    vero:  '1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc'
}
// El sistema escribe en la pestaña "App_Data" de cada archivo.
// Si la pestaña no existe, el sistema falla silenciosamente.
```

### Google Calendar (un calendario por terapeuta)
```javascript
THERAPIST_CALENDARS: {
    diana: '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
    vero:  'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
    sam:   '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
}
```

### Firestore Colecciones
```javascript
collectionPath = 'appointments'       // Citas
patientProfilesPath = 'patientProfiles' // Perfiles de pacientes
```

---

## ⚠️ Reglas Críticas del Sistema (Obligatorias)

Estas reglas fueron aprendidas a través de bugs reales. Violarlas rompe el sistema.

### 1. Firebase es la única fuente de verdad
Google Calendar y Google Sheets son espejos secundarios. Nunca leas de Calendar o Sheets para tomar decisiones de negocio. Siempre lee de Firestore.

### 2. Zona horaria: Siempre México (`America/Mexico_City`, UTC-6)
- **NUNCA** usar `new Date().toISOString()` para calcular rangos de días → causa desfases de +6h (UTC rollover) que hacen que citas del martes aparezcan en el miércoles.
- **SIEMPRE** usar `TimeManager.js` para crear y parsear fechas.
- El formato estándar de guardado en Firestore es **ISO Naive** (`YYYY-MM-DDTHH:mm`) sin sufijo de zona.

### 3. Shell PowerShell: Separar con `;` no con `&&`
```powershell
# Correcto:
git add js/services/SheetService.js; git commit -m "fix"; git push origin main

# INCORRECTO (falla en PowerShell):
git add js/services/SheetService.js && git commit -m "fix"
```

### 4. `git add` debe ser selectivo (NUNCA `git add -A`)
La carpeta `old/backups_legacy/` contiene un repositorio Git anidado. `git add -A` falla con error fatal. Siempre hacer add por archivo o carpeta específica.

### 5. Protocolo de Despliegue Obligatorio
Al terminar CUALQUIER tarea con cambios en el frontend:
```powershell
# 1. Publicar a GitHub (activa auto-deploy del bot en Render):
git add js/ruta/al/archivo.js; git commit -m "descripción clara"; git push origin main

# 2. OBLIGATORIO para actualizar la web (git push solo NO actualiza Hosting):
firebase deploy --only hosting
```
Render (bot WhatsApp) se actualiza automáticamente con el `git push`. No requiere acción manual.

### 6. Actualizar el Manual del Usuario al Cambiar la UI
Cada vez que se modifique la interfaz (nuevos botones, pestañas, flujos), actualizar:
`js/modules/help/HelpManual.js`

### 7. Google Calendar: Estrategia de Actualización de Eventos
- Al **cambiar de terapeuta**: Borrar el evento viejo + crear uno nuevo (no se puede hacer `update` entre calendarios distintos; da error 404).
- Ante **error 404**: Buscar el evento "huérfano" por Nombre+Fecha antes de rendirse.
- **BLINDAJE**: Nunca crear eventos fuera del rango 8am-8pm México. El código lo valida y cancela la operación si lo detecta.

### 8. Citas Canceladas: Comportamiento de UI
- **Grid central**: Las citas canceladas se OCULTAN para liberar espacio visual.
- **Sidebar**: Las citas canceladas se MANTIENEN con etiqueta roja para control administrativo.
- La lógica de "Próxima Cita" salta días sin citas ACTIVAS, pero muestra TODO (activas+canceladas) una vez posicionada en el día.

### 9. Teléfonos de Pacientes: Formato Separado
- El `countryCode` (+52) se guarda SEPARADO del campo `phone` en Firestore.
- El campo `phone` debe tener exactamente 10 dígitos.
- El `whatsapp_webhook.py` concatena ambos dinámicamente para armar el número completo.

---

## 💰 Módulo de Finanzas (SheetService.js)

El sistema registra 10 columnas en la pestaña `App_Data` de cada Excel:

| Col | Dato | Notas |
|-----|------|-------|
| A | Fecha | Formato DD/MM/YYYY |
| B | Hora | Texto (ej: "14:00") |
| C | Paciente | Nombre completo |
| D | Monto Total | Número |
| E | Estatus | "Pagado", "Cancelado", etc. |
| F | ID de Cita | Para trazabilidad |
| G | Hora Simple | Solo el número de la hora |
| H | Ingreso Clínica (Parlare) | Default: $250 Diana/Sam, $400 Vero |
| I | Ingreso Terapeuta | Monto - Ingreso Clínica |
| J | Ingreso Planeación | Si aplica |

**Error común**: Si las celdas en Excel no están alineadas a la columna A (por celdas combinadas o datos residuales), el sistema empieza a escribir desde la columna B en adelante. Se corrige limpiando las primeras filas del archivo y asegurando que la columna A esté vacía.

**Error de permisos**: Si una terapeuta no aceptó la invitación de "Editor" en su archivo de Sheets, el sistema arroja un error 403 silencioso y no registra nada. La solución es verificar los permisos en Google Drive.

---

## ⚡ Optimizaciones Pendientes

### Forward-only Sync (Nuke Semanal Optimizado)
**Estado: Pendiente de implementación.**

Actualmente `nukeAndRebuildAll` en `GoogleCalendarService.js` borra y recrea 1 año de eventos (muy lento, consume mucha cuota de API). 

**El plan:**
1. Cambiar `timeMin` para que apunte al **Lunes de la semana en curso** (no 1 año atrás).
2. Filtrar las citas de Firebase antes de inyectar:
   ```javascript
   const lunesDeEstaSemana = ... // Calcular el lunes de la semana actual a las 00:00
   const citasRelevantes = allAppointments.filter(apt => apt.date >= lunesDeEstaSemana);
   ```
3. **Beneficio**: El historial pasado permanece intacto en Calendar (archivo visual), la sincronización tarda segundos en lugar de minutos y se eliminan los errores 429 por Quota.

> [!NOTE]
> **Con Firebase Blaze + Cloud Functions, el nuke puede volverse obsoleto por completo.** Ver sección siguiente.

### Solución Definitiva con Cloud Functions (Firebase Blaze)
Con el plan Blaze, la sincronización con Google Calendar deja de ser responsabilidad del navegador del usuario y pasa a ser responsabilidad de un servidor de Google (Cloud Function con Service Account).

**Flujo actual (problemático):**
```
Usuario guarda cita → Navegador llama a Calendar API → Token expira / Cuota se agota
```

**Flujo con Cloud Functions (robusto):**
```
Usuario guarda cita → Firestore guarda (50ms)
                    → Firestore dispara trigger en Cloud Function
                    → Cloud Function actualiza SOLO ese evento en Calendar
                       (sin token de usuario, sin cuota de navegador, sin popup)
```

Esto elimina la necesidad de nukes masivos porque cada cambio en Firestore dispara una actualización quirúrgica en Calendar. **Cero nukes. Cero 429. Cero tokens que expiran.**



## 🚀 Visión a Futuro (V2)

### Herramientas de Desarrollo
- **Editor**: Cursor.sh (Plan Pro) con el modelo **Claude 3.5 Sonnet**.
- **Modo de uso**: Usar `@Codebase` para que la IA lea todo el proyecto y genere nuevas funcionalidades respetando los patrones existentes.

### Estrategia Móvil Nativa (Android & iOS)
Para llevar la aplicación a las tiendas de Google Play y Apple App Store sin rehacer el código desde cero:
- **Tecnología Base**: **Capacitor** (de Ionic). Se utilizará para "envolver" la SPA web actual (HTML/JS/CSS) en un WebView nativo.
- **Flujo de Trabajo**:
  1. **Preparación (Cursor)**: Todo el empaquetado y la configuración de Capacitor se realizará dentro del editor Cursor usando las tecnologías web existentes. Capacitor generará automáticamente las carpetas nativas (`android/` e `ios/`).
  2. **Compilación y Tiendas (Android Studio / Xcode)**: Estas herramientas pesadas **no se usarán para programar**. Solo servirán como puente final para probar en emuladores y compilar los instalables finales (`.aab` o `.ipa`) para subir a las tiendas.
- **Actualizaciones "Over The Air" (OTA)**: Para evitar el lento proceso de revisión de las tiendas al modificar la interfaz (HTML/JS/CSS), se implementará **Capacitor Updater** o **Ionic Appflow**. Esto permite empujar mejoras a los celulares de los usuarios de forma instantánea y en segundo plano. Solo se subirá una nueva versión a la tienda si se instalan plugins nativos nuevos (ej. cámara).
- **Fundación de Marca y PWA (18 de Mayo, 2026)**: Implementación del logotipo oficial (`assets/parlare-logo.png`), favicon adaptativo, colores de interfaz de barra de estado (`theme-color`), y el archivo de manifiesto PWA (`manifest.webmanifest`). Esto sienta las bases estéticas e identitarias clave para la experiencia web móvil y la futura empaquetación nativa de Capacitor.

### Arquitectura Futura (100% Google Ecosystem)
- **Firebase Blaze** (Plan de pago por uso): Necesario para Cloud Functions y Scheduler. El costo para este volumen de uso es prácticamente $0.
- **Firebase Cloud Functions**: Migrar `whatsapp_webhook.py` (Flask) a una función nativa, eliminando la dependencia de Render.
- **Google Cloud Scheduler**: Reemplazar los cronjobs externos con el cronómetro oficial de Google para los recordatorios de las 8 AM.
- **Firebase Storage**: Almacenar justificantes médicos (imágenes/PDFs) enviados por WhatsApp.

### Módulo de Finanzas (Opciones a Medida)
La V2 ofrecerá al administrador la opción de elegir cómo llevar la contabilidad desde un panel de configuración:

1. **Dashboard Financiero Nativo** (Recomendado): Una pestaña "Contabilidad" dentro de la app que calcula automáticamente comisiones (Clínica vs. Terapeuta) desde Firebase, con botón de "Exportar a Excel" a fin de mes. Elimina los errores de permisos de Google Sheets.
2. **Toggle de Sincronización por Terapeuta**: Un interruptor ON/OFF por terapeuta para activar o desactivar la sincronización en vivo con su Google Sheet. Si está apagado, el sistema confía 100% en Firebase.

### Posibilidad de Escalar el Modelo (SaaS Readiness)
Para que esta aplicación sea vendible o replicable para otras clínicas de manera eficiente, el sistema debe evolucionar de un estado "Hardcoded" a uno "Configurable" (Agnóstico).

#### Pilares para la Repetibilidad:
1. **Configuración Dinámica (DB-Driven):** Mover los IDs de `spreadsheets`, `apiKey` y `THERAPIST_CALENDARS` de los archivos JS a una colección de `settings` en Firestore. La app debe inicializarse leyendo estos valores desde la base de datos.
2. **Abstracción de Terapeutas:** Eliminar las referencias fijas a nombres específicos. El sistema debe iterar sobre la lista de usuarios con rol `therapist` definidos en la base de datos para construir dinámicamente el Sidebar, los filtros y los reportes.
3. **Multi-Tenancy y Aislamiento:** Asegurar que cada nueva instancia (clínica) tenga su propio entorno de Firebase y Google Cloud, garantizando que los datos y calendarios nunca se mezclen.
4. **White-Labeling:** Centralizar logos, nombres de clínica y paletas de colores en variables CSS y objetos de configuración para permitir el cambio de identidad visual sin tocar el código.
5. **Panel de Onboarding / Setup Wizard:** Crear una interfaz administrativa inicial donde el nuevo cliente pueda vincular sus propios recursos de Google (OAuth, IDs de Sheets) de forma guiada.

#### 📱 Estrategia de Distribución y Monetización SaaS (Opción A - App Única)
Para que el modelo de negocio sea altamente rentable y con costo de soporte $0, el proyecto seguirá la **Opción A (App Única Multiclínica)**:
1. **Distribución en Tiendas (App Única):** Se subirá una sola aplicación oficial de Parláre a las tiendas de Google Play y App Store. Al iniciar sesión, el sistema detecta a qué organización pertenece el usuario (`clinicId`) y personaliza toda la interfaz (logo, colores, terapeutas y pacientes) de forma dinámica. Esto evita la inmanejable pesadilla de compilar y subir una app distinta para cada cliente en las tiendas.
2. **Monetización por Asientos (Seat-Based Pricing):** El modelo cobrará una mensualidad base según el límite de terapeutas permitidos. Desde su panel, el administrador puede invitar a terapeutas por correo. Si supera el límite contratado, la app solicita una actualización automática a través de **Stripe** antes de enviar la invitación por correo.
3. **Seguridad y Aislamiento (Multitenancy en Firestore):** Todos los documentos de citas y pacientes tendrán de forma obligatoria el campo `clinicId` (ej. `clinicId: "clinica_pancha"`). Mediante **Reglas de Seguridad en Firestore**, blindamos el acceso para asegurar que ningún usuario pueda leer ni modificar datos de otras clínicas.

#### 🛠️ Filosofía de Desarrollo SaaS (Para Cursor)
Para que este proyecto sea un motor de negocio escalable, Cursor debe seguir estos principios:
- **Autonomía Administrativa (No-Code para el cliente):** El cliente final (dueño de la clínica) debe poder configurar costos, comisiones, horarios y staff desde un panel interno sin intervención del desarrollador. El código nunca debe tener precios "hardcoded".
- **Arquitectura de Master Template:** El repositorio debe tratarse como una "Plantilla Maestra". Las mejoras generales (ej. nuevas integraciones de IA) deben ser modulares para que puedan "inyectarse" fácilmente en clones de otros clientes.
- **Rol del Desarrollador (SaaS Provider):** Daniel actúa como el proveedor de la plataforma. La IA debe priorizar la creación de herramientas de diagnóstico y logs que permitan a Daniel dar soporte técnico rápido sin entrar a la lógica de negocio de cada clínica.

#### 🤖 Estrategia de Replicación del Bot y Cronjobs en Firebase Functions:
Para asegurar que el backend y el Bot de WhatsApp sean 100% replicables sin modificar código duro en cada clonación:
1. **Puntos de Enlace Webhook Dinámicos:**
   - Cada nueva clínica tiene su propio número de WhatsApp de Twilio.
   - El webhook de Twilio de cada clínica apuntará a su Cloud Function específica de Firebase: `https://<region>-<id-proyecto-firebase>.cloudfunctions.net/whatsapp_bot`.
   - Las funciones Cloud se despliegan automáticamente al ejecutar `firebase deploy`, creando la URL única sin configuración manual.
2. **Variables de Entorno y Secrets (Google Secret Manager):**
   - Las credenciales sensibles (ej. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) nunca irán escritas en el código.
   - Se guardarán en el gestor de secretos nativo de Firebase/Google Cloud: `firebase functions:secrets:set TWILIO_AUTH_TOKEN="valor"`.
   - El código del bot lee estas variables de manera agnóstica (`os.environ.get("TWILIO_AUTH_TOKEN")`).
3. **Parámetros Clínicos en Firestore (/config/clinic):**
   - Teléfonos de terapeutas, plantillas de mensajes, comisiones y calendarios se guardarán en un documento maestro de Firestore bajo la ruta `/config/clinic`.
   - El bot de la Cloud Function lee dinámicamente este documento en cada mensaje. Así, la misma plantilla maestra de código funciona para cualquier clínica, adaptándose en milisegundos a sus terapeutas y reglas.
4. **Ciclo de Vida del Cronjob (Google Cloud Scheduler):**
   - Las tareas programadas (`/cron/reminders`, `/cron/daily-summary`) se declaran mediante decoradores en el código Python de Firebase:
     `@on_schedule(schedule="0 8 * * *", timezone="America/Mexico_City")`
   - Al hacer `firebase deploy`, Google Cloud Scheduler crea e inicializa automáticamente los crons nativos en el nuevo proyecto de la clínica, eliminando la necesidad de dar de alta cronjobs manuales en plataformas externas. Costo final: $0.

## 🌟 Módulos Avanzados (Roadmap Funcional)
Para diferenciar la aplicación y maximizar el ahorro de tiempo, se proponen los siguientes módulos para la V2:

1. **Lista de Espera Inteligente (WhatsApp):**
   - Al detectar una cancelación en la agenda, el sistema busca pacientes en lista de espera para ese horario.
   - El bot envía una notificación automática ofreciendo el lugar; el primero en confirmar se queda con la cita y la agenda se actualiza sola.

2. **Asistente de Notas Clínicas con IA:**
   - Permite a las terapeutas dictar un resumen de la sesión desde el móvil.
   - La IA (Claude/GPT) transforma el dictado en una nota clínica estructurada (tipo SOAP/DAP), lista para revisión y guardado. Ahorra hasta 2 horas de papeleo diario.

3. **Portal del Paciente (Módulo Opcional - Pendiente de Aprobación):**
   - Generación de links temporales enviados por WhatsApp.
   - Permite al paciente/tutor consultar sus próximas citas, historial de asistencia y descargar recibos de pago o justificantes de forma autónoma.
   - *Nota: Este módulo queda sujeto a la decisión de Dirección/Jefatura.*

4. **Módulo 6: El Aparador Digital (Landing Page V2 - Opcional):**
   - **Carácter Configurable:** Una interfaz pública (Landing Page) que puede activarse o desactivarse desde los ajustes de la app.
   - **Estética "Trauma-Informed":** Diseño minimalista, colores cálidos y uso de fotos/mini-videos reales de las terapeutas para generar confianza inmediata.
   - **Disponibilidad Restringida (Solo Registrados):** El widget de "Consultar Disponibilidad" solo funcionará tras validar que el número de WhatsApp del usuario ya existe en la base de datos de pacientes. Esto protege la privacidad de la clínica.
   - **Blog Educativo IA:** Sección de artículos de apoyo para padres generados/asistidos por IA basándose en las necesidades comunes detectadas en la clínica.

---

## 📋 Checklist de Inicio de Sesión

Al comenzar cualquier sesión de desarrollo:
1. Leer el `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md` más reciente.
2. Iniciar servidor local: `python serve.py` en `g:\My Drive\AG`.
3. Preguntar al usuario qué tarea o bug tiene hoy.

---
*Última actualización: 18 de Mayo, 2026 — Adaptación móvil y acceso táctil al Panel de Configuración Administrativa (Firestore-driven) completado y documentado.*
