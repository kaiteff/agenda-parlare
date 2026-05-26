# 🚀 Visión y Estrategia: Agenda Parláre V2
### (Documento de Contexto para Asistente de IA / Cursor)

> **Documento maestro de contexto** para Cursor, Antigravity y Copilot.
> Combina **lo que ya está en producción (✅)**, **lo en curso o pausado (⏳)** y **la visión futura (🔜/💎)** — no sustituye el detalle operativo de los otros archivos vivos.
>
> | Documento | Para qué |
> |-----------|----------|
> | `PLAN_DE_TRABAJO.md` | Prioridades del equipo y ✅ recientes |
> | `ANALISIS_ESTRATEGIA_MOVIL.md` | Roadmap móvil, deploy, **⏳ Falta** y **💡 Sugerencias** |
> | `ARQUITECTURA_FUTURA.md` | Agenda desktop, refactor gradual, **registro de cambios + reversión** |
> | `js/modules/help/HelpManual.js` | Manual para Diana, Sam, Vero y Yari |

---

## 🧠 Contexto del Proyecto

**Agenda Parláre** es una aplicación web de gestión clínica para el **Centro Parláre**, un centro de terapia psicológica con 3 terapeutas: **Diana, Sam y Vero**.

- **Usuarios del sistema**: Terapeutas (Diana, Sam, Vero), Recepción (Yari) y el administrador (Daniel - `rodriguezd.danielrob@gmail.com`).
- **¿Qué hace?**: Agenda de citas, control de pagos, sincronización con Google Calendar (un calendario por terapeuta), envío de recordatorios por WhatsApp y registro de pagos en Google Sheets (uno por terapeuta).
- **Firebase**: `taconotaco-d94fc` (Project ID). Es la única fuente de verdad. **Firebase siempre gana sobre Google Calendar y Google Sheets**.
- **Hosting**: Firebase Hosting → `https://taconotaco-d94fc.web.app`
- **Backend principal**: **Firebase Cloud Functions** (Python) en `functions/` — webhook WhatsApp, crons de recordatorios, triggers (`on_patient_created`, recibos PDF, optimizador de espacios, opt-in).
- **Render / Flask legacy**: `whatsapp_webhook.py` en raíz — **en retiro**; no asumir que sigue siendo la fuente del bot en producción. Despliegue actual: `firebase deploy --only functions:…`
- **Repositorio**: `https://github.com/kaiteff/agenda-parlare` (rama `main`).
- **Plan Firebase**: **Blaze** (Functions + Storage + Scheduler).

---

## 📁 Arquitectura del Código

El frontend es una **Single Page Application (SPA)** en HTML + Vanilla JS (ES Modules) + Tailwind CSS compilado. Sin frameworks como React o Vue.

```
Ag_Pa/  (repo local)
├── index.html, index.css, dist/output.css
├── serve.py                # Servidor local
├── firebase.json
├── functions/              # Cloud Functions Python (producción)
│   ├── main.py             # Webhook, crons, triggers
│   ├── whatsapp_optin.py, receipt_generator.py, space_optimizer.py
├── js/
│   ├── app.js, firebase.js
│   ├── components/         # Header, Sidebar, MobileBottomNav, MainModals, MiniCalendar…
│   ├── managers/         # AuthManager, PatientManager, CalendarManager
│   ├── modules/
│   │   ├── calendar/       # CalendarUI, CalendarEvents, CalendarState, CalendarSlotIndex…
│   │   ├── reports/, admin/, help/HelpManual.js
│   ├── services/           # Google Calendar/Sheets, Audit, WhatsApp, reception_alerts
│   └── utils/              # dateUtils, TimeManager, brandAssets, saasReadyCopy…
└── assets/parlare-logo.png
```

**Nota arquitectura pacientes:** la lista y búsqueda viven en **`js/components/Sidebar.js`**, no en `PatientUI.js` (solo aparece en backups/`old/`).

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
reception_alerts      // Alertas WhatsApp / seguimiento manual (Yari)
```

### Plantilla WhatsApp crítica (opt-in)
- `bienvenida_con_optin` — SID `HX08f74d9b520b85acfbf9e678e434b1f6` (`js/config/whatsappTemplates.js`)

---

## 📊 Estado consolidado (Mayo 2026)

Leyenda: **✅** en producción o validado · **⏳** pendiente · **🔜** diseñado / pausado · **💎** premium / fase posterior

### ✅ Producto core (listo)

| Área | Qué incluye |
|------|-------------|
| Agenda | Grid semanal, drag & drop, modales, vista **Día \| Semana** (móvil + desktop), mini-calendario |
| Pacientes | Sidebar, ficha, recurrentes, justificantes médicos → **Storage** + badge «Justificada» |
| Pagos / Sheets | Comisiones clínica/terapeuta/planeación, sync `App_Data` |
| Google Calendar | Sync por terapeuta; **nuke forward-only** (desde lunes de semana en curso → 6 meses) |
| WhatsApp | Templates Meta, recordatorios AM/PM, webhook Functions, opt-in `recurrentOptIn`, semáforo + `reception_alerts` |
| Recepción | Control Maestro, bitácora auditoría (desktop + **Más → Bitácora** en móvil) |
| Recibos SGMM | UI «SaaS Ready» + trigger PDF `on_appointment_receipt_trigger` → Storage |
| Adelantar cita | `on_appointment_cancelled_trigger` + ofertas WhatsApp (**autopilot** desplegado) |
| Marca / PWA | Logo Parláre, favicon, `manifest.webmanifest`, onboarding `NewFeatureAlert` v9 |

### ✅ Móvil — Fase 1 web responsiva (listo)

Bottom nav (Agenda / Pacientes / Más), modales bottom-sheet (cita, ficha, Control Maestro, config), toolbar táctil, filtro terapeuta móvil, calendario compacto (columna hora, semana sin scroll X). Detalle: `ANALISIS_ESTRATEGIA_MOVIL.md`.

### ✅ Agenda escritorio — alta prioridad (19 may, validado)

| # | Mejora | Archivos clave |
|---|--------|----------------|
| 1 | Auto-scroll solo carga / **Hoy** | `CalendarState.scrollToWorkHoursOnNextRender` |
| 2 | Índice citas por slot | `CalendarSlotIndex.js` |
| 3 | Toggle **Día \| Semana** en `md+` | `#calendarViewToggle` en `index.html` |

Registro y reversión: **`ARQUITECTURA_FUTURA.md`**.

### ⏳ Pendiente cercano (acordado, no bloquea operación diaria)

| Área | Ítem |
|------|------|
| Escritorio | Tooltips/nombres en vista TODAS; query Firestore por semana visible; debounce snapshot; grid CSS fijo; quitar `animate-pulse` fijo en `#statusMsg` |
| Escritorio 💎 | Tokens color Parláre; atajos teclado (← →, **H**) |
| Recibos | Enlace «Ver recibo» en citas pagadas (`receiptPdfUrl`); validación end-to-end en producción |
| UX | Empty states, skeleton loaders; iconos 192/512; Reportes/Corte como bottom-sheet en móvil |
| Waitlist | **Copiloto colaborativo** (confirmación dual Yari + terapeuta, delay 10 min, glow calendario) — autopilot pausado en `space_optimizer.py` |
| Capacitor | POC Android → tiendas; retirar Render por completo |
| Firestore | Índice compuesto `reception_alerts` si el listener falla en consola |
| SaaS | Activar campos disabled (`autoGenerate` recibos, licencias, multitenancy) — ver sección futura |

### 🔜 Visión V2 (aún no producto cerrado)

Sync Calendar **quirúrgica** por trigger Firestore (sin depender del navegador), dashboard financiero nativo, multitenancy `clinicId`, Stripe por asientos, portal paciente, notas clínicas IA, landing pública. Detalle abajo en «Visión a Futuro».

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
```powershell
npm run build   # si hubo cambios en index.css / Tailwind

# Frontend (SPA):
firebase deploy --only hosting

# Backend (según lo tocado):
firebase deploy --only functions:whatsapp_webhook,functions:on_patient_created
firebase deploy --only functions:on_appointment_receipt_trigger
# … otras functions según el cambio
```
`git push` **no** actualiza Hosting ni Functions por sí solo.

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
- El backend (Cloud Functions) concatena ambos para Twilio.

### 10. Consentimiento y Opt-In de WhatsApp (`recurrentOptIn`)
- **Pacientes legacy:** si `wantsWhatsapp == true` y no está `'rejected'`, los crons pueden seguir enviando recordatorios.
- **Pacientes nuevos:** `on_patient_created` → `wantsWhatsapp = false`, `recurrentOptIn = 'pending'`.
- **Bienvenida manual:** reinicia consentimiento (`pending`) y dispara plantilla Meta.
- **Webhook:** `optin_yes` → `accepted`; `optin_no` → `rejected` + alerta en `reception_alerts`.
- **UI:** semáforo en sidebar/ficha; panel Control Maestro para seguimiento manual.

### 11. Documentación viva (cada cambio de código)
Actualizar en la misma tarea: `ANALISIS_ESTRATEGIA_MOVIL.md`, `PLAN_DE_TRABAJO.md`, `HelpManual.js` si cambió UI; `ARQUITECTURA_FUTURA.md` si fue agenda desktop/refactor; este archivo si cambió arquitectura, IDs o reglas nuevas. Ver `AI_RULES.md` Reglas de Oro 6–7.

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

## ⚡ Sincronización y rendimiento (hecho vs siguiente paso)

### ✅ Forward-only Sync (Nuke Semanal Optimizado) — IMPLEMENTADO
`nukeAndRebuildAll` en `GoogleCalendarService.js` ya limpia desde el **lunes de la semana en curso** hacia el futuro (~6 meses), no 1 año atrás. Reduce tiempo de sync y errores 429.

### 🔜 Solución Definitiva con Cloud Functions (Firebase Blaze) — PENDIENTE
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
| Fase | Estado |
|------|--------|
| **Fase 1 — SPA responsiva** | ✅ Desplegada (bottom nav, sheets, Modo Día, bitácora móvil) |
| **Fase 2 — POC Capacitor** | ⏳ Emulador Android, login Firebase en WebView |
| **Fase 3–5** | ⏳ Iconos 192/512, splash, OTA, tiendas |

- **Tecnología:** **Capacitor** envuelve la misma SPA (HTML/JS/CSS).
- **OTA:** Capacitor Updater / Appflow para UI sin pasar por revisión de tienda en cada cambio menor.

### Arquitectura Futura (100% Google Ecosystem)
| Componente | Estado |
|------------|--------|
| **Firebase Blaze** | ✅ Activo |
| **Cloud Functions** (webhook, crons, triggers) | ✅ Mayoría en `functions/` |
| **Retirar Render / Flask** | ⏳ Pendiente cuando todo el bot esté en Functions |
| **Cloud Scheduler** (recordatorios 8 AM) | ✅ Vía Functions |
| **Firebase Storage** (justificantes, PDF recibos) | ✅ En uso |
| **Sync Calendar por trigger Firestore** | 🔜 Reemplazaría nukes y sync desde navegador |

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

| Módulo | Estado | Notas |
|--------|--------|-------|
| **Adelantar cita / optimizador** | ✅ Autopilot desplegado · ⏳ Copiloto dual + heurísticas | Pausa temporal en `space_optimizer.py` |
| **Lista de espera inteligente** | 🔜 | Extensión del flujo de cancelación |
| **Asistente notas clínicas IA** | 🔜 | Dictado → nota SOAP/DAP |
| **Portal del paciente** | 🔜 Opcional | Links WhatsApp; sujeto a dirección |
| **Landing / Aparador digital** | 🔜 Opcional | Trauma-informed; solo pacientes registrados |

Detalle de módulos propuestos:

1. **Lista de Espera Inteligente (WhatsApp):** *(parcialmente cubierto por Fase B «Adelantar cita»)*
   - Al cancelar, ofrecer hueco a candidatos con opt-in; primer «Sí» reagenda en Firestore, Sheets y Calendar.

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
1. Leer **`PLAN_DE_TRABAJO.md`** y **`ANALISIS_ESTRATEGIA_MOVIL.md`** (estado real y pendientes).
2. Si toca agenda desktop o refactor: **`ARQUITECTURA_FUTURA.md`**.
3. Opcional: `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md` más reciente.
4. Servidor local: `python serve.py` en la raíz del repo.
5. Confirmar con el usuario la tarea del día — **no reimplementar lo ya ✅** en la tabla «Estado consolidado».

---
*Última actualización: **26 de Mayo de 2026** — Cambios arquitectónicos clave:

**1. Patrón Multicast en `CalendarData.subscribe`** (26 may, tarde) — La capa de datos del calendario ahora mantiene `_subscribers: Array<callback>` y un único `_unsubscribeSnapshot`. El primer suscriptor abre la conexión real de Firestore; los siguientes (incluyendo `PatientManager`) reusan la misma + reciben el `_lastData` cacheado al instante. Cuando todos se desuscriben, el listener real se apaga. **Regla**: cualquier módulo que necesite escuchar `appointments` en tiempo real DEBE pasar por `CalendarData.subscribe()` — NO crear otro `onSnapshot` propio.

**2. Ventana temporal `[-30, +60]` días** — Todos los listeners de `appointments` deben filtrar por `where('date', '>=', startStr).where('date', '<', endStr)`. Datos históricos > 30 días: cargar bajo demanda con `getDocs(query(... where name == X))` (ver `PatientModals.openHistory`). NO mantener historiales en memoria global.

**3. Filtro por terapeuta para no-admins** — `where('therapist', '==', therapistId)` cuando el usuario no es admin/recepcionista. Aplica en `CalendarData.subscribe` y `PatientManager` (perfiles).

**4. Copiloto Colaborativo — contrato frontend↔backend** — La constante `COPILOT_DELAY_MS` (`js/services/WaitlistCopilotService.js`) DEBE coincidir con `total_wait` en `functions/space_optimizer.py`. Actual: **8 min (480 s)**, ajustado por límite de Google Cloud Functions para triggers Firestore (`timeout_sec` max 540 s). El backend hace polling de 30 s sobre `copilot_overrides/{id}` y respeta `skip_delay` / `pause`. Si cambia el delay del backend, actualizar la constante única en frontend y se propaga al UI (panel, manual).

**5. Índices Firestore versionados** — `firestore.indexes.json` en raíz con los índices compuestos requeridos por las queries (`therapist+date`, `name+date`, `isCancelled+date`, `sheetSynced+isPaid+date`, `space_offers × 2`). Cualquier query nueva con filtro compuesto debe añadir su índice ahí + `firebase deploy --only firestore:indexes`.

Estado heredado: ✅/⏳/🔜 móvil Fase 1, opt-in, recibos, agenda desktop 1–3, forward-only sync; mapa de documentos vivos; backend Functions como principal.*
