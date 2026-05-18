# Análisis: Estructura del Proyecto y Estrategia App Móvil

> Documento generado el **17 de Mayo de 2026** a partir de la revisión de `VISION_PARLARE_V2.md`, `resumen_sesion/RESUMEN_SESION_20260517.md`, `AI_RULES.md` y el código activo del repositorio.
>
> Objetivo: entender la arquitectura actual y decidir el camino hacia una app móvil espectacular (Android + iPhone) con visión SaaS (clonar para otras clínicas).
>
> **Este archivo es el documento vivo de la estrategia móvil.** Cualquier asistente de IA (Cursor) debe **actualizarlo al terminar cada sesión** que toque UI móvil, responsive, Capacitor o decisiones de producto. Ver también `AI_RULES.md` → Regla de Oro 3.

---

## Dónde vamos (resumen en una mirada)

```
HOY ──────────────────────────────────────────────────────────────► FUTURO

[Fase 1: UI móvil en WEB]          [Fase 2: Serverless Functions] [Fase 3: SaaS Datos]     [Fase 4: Capacitor]
 ✅ Fundamentos CSS                  ⏳ Migrar Webhook (Twilio)    ⏳ Firestore config       ⏳ android/ ios/
 ✅ Bottom nav (Agenda/Pacientes…)  ⏳ Recordatorios (Scheduler)  ⏳ Terapeutas dinámicos  ⏳ Iconos/splash
 ✅ Modal cita = bottom-sheet        ⏳ Reporte Diario (Scheduler) ⏳ White-label CSS
 ✅ Toolbar calendario móvil         ⏳ Google Secret Manager
 ✅ Modales paciente (bottom-sheets)
 ✅ Google Sync en menú «Más»
 ✅ Control Maestro solo en «Más» (móvil)
 ✅ Fixes UX: ficha paciente + columna HORA agenda
```

**Decisión estratégica cerrada:** Opción **A — Capacitor** (misma SPA web optimizada para touch), no reescribir en React Native/Flutter por ahora. Ver [Bitácora de decisiones](#bitácora-de-decisiones).

**Siguiente paso de código:** **Camino A — Migración Serverless a Firebase Blaze & Functions (Python)** (en desarrollo coordinado). Ver [DOCUMENTACION_MIGRACION_BLAZE.md](file:///d:/agbc/Ag_Pa/DOCUMENTACION_MIGRACION_BLAZE.md).

---

## Bitácora de decisiones

| Fecha | Decisión | Motivo | Alternativa descartada |
|-------|----------|--------|------------------------|
| May 2026 | **Capacitor** como camino a Play Store / App Store | Una sola codebase con la web; OTA de UI; encaja con Master Template SaaS; menor tiempo que reescribir | React Native / Flutter (doble mantenimiento, meses de reimplementar calendario) |
| May 2026 | **Fase 1 antes que Capacitor** | La web debe sentirse app en móvil (nav + modales) antes de empaquetar WebView | Envolver desktop tal cual (mala UX en celular) |
| May 2026 | Breakpoint **`md` (768px)** | Ya usado en Header/Sidebar; coherente en todo el proyecto | Breakpoint custom solo para móvil |
| May 2026 | **`MobileNav.js` centralizado** | Evitar duplicar lógica drawer entre hamburguesa y bottom nav | onclick sueltos en cada componente |
| May 2026 | **`#eventModal` = bottom-sheet en &lt; md** | Mismo patrón que `ReceptionControl`; pulgar, 92dvh, sin zoom iOS en inputs | Modal centrado pequeño en móvil |
| May 2026 | **Validación usuario:** bottom nav “espectacular” en producción | Confirmado en dispositivo real + deploy Hosting | — |
| May 2026 | **Validación usuario:** modal de cita “brutal / premium” en celular | Mismo patrón bottom-sheet replicado en modales de paciente (Paso 3) | — |
| May 2026 | **Paso 3 = modales paciente + búsqueda sidebar** | Toolbar calendario pasa a Paso 4; prioridad UX ficha clínica en móvil | Paso 3 original (solo toolbar) |
| May 2026 | **Google Sync en menú «Más» (móvil)** | Header estrecho ocultaba `#googleSyncBtn`; semáforo + misma acción en `mobileMoreSheet` vía `GoogleSyncUI.js` | Duplicar lógica en cada componente |
| 17 May 2026 | **Control Maestro solo en «Más» (&lt; md)** | Botón del header y del sidebar no cabían / no se veían en celular; recepción vive en sheet «Más» (`#mobileMoreReception`) | Tab «Recepción» en bottom nav (ocupaba espacio) |
| 17 May 2026 | **Header ficha paciente en columna (móvil)** | Alerta «Recurrencia por agotarse» se traslapaba con Bienvenida y botones editar/cerrar | Mantener fila única compacta |
| 17 May 2026 | **`sticky-column` z-index 30+ en agenda** | Al scroll horizontal, chips de cita tapaban la columna «HORA» | Rehacer `CalendarUI.js` (Sprint 2) |

---

## Registro de avance y qué hacer ahora

> **Última sesión de implementación:** **17 May 2026** — Hotfixes UX móvil post-Paso 4 (Control Maestro, ficha paciente, columna HORA).
>
> **Validación previa:** Pasos 0–4 de Fase 1 validados en producción (bottom nav, modal cita, fichas paciente, toolbar, Google Sync en «Más»). **Pendiente re-validar en celular** los 3 hotfixes de esta sesión tras deploy.

### Lo que ya llevamos hecho

| Área | Qué se hizo |
|------|-------------|
| **Decisión estratégica** | Opción A: Capacitor + misma SPA web, con visión SaaS y serverless en Blaze documentadas. |
| **Paso 0 — Fundamentos** | `--bottom-nav-height`, `.touch-target`, safe-areas, `.pb-bottom-nav`, estilos de barra inferior en `index.css`. Tokens en `tailwind.config.js`. Padding inferior en el layout (`index.html`). |
| **Paso 1 — Bottom nav** | Nuevos `js/utils/MobileNav.js` y `js/components/MobileBottomNav.js`. Inyección en `ComponentManager.js`. Header usa `MobileNav` para el menú hamburguesa. |
| **Navegación móvil** | 3 tabs: **Agenda**, **Pacientes**, **Más** (sheet: Control Maestro, Corte, Reportes, Google Sync, Manual, etc.). Solo visible en `< md` (768px). **Validado en producción** (tabs); Control Maestro reubicado 17 may. |
| **Hotfix 17 may — Control Maestro** | `#openReceptionControlBtn` solo `md:flex` en header. Eliminado botón del sidebar móvil. Admin/recepción: **Más → Control Maestro** (`#mobileMoreReception`). |
| **Hotfix 17 may — Ficha paciente** | `#patientHistoryTitle` en columna; botones editar/cerrar `absolute top-3 right-3` en móvil; `#patientRecurrenceAlert` en fila propia; se oculta al abrir edición + `scrollIntoView` al formulario. |
| **Hotfix 17 may — Agenda scroll X** | `.sticky-column` / `.sticky-corner` con `z-index` 30/40; celdas y `.absolute.inset-0` por debajo para que «HORA» no quede tapada. |
| **Paso 2 — Modal de cita** | `#eventModal` como bottom-sheet: `items-end`, `h-[92dvh]`, `rounded-t-3xl`, inputs `text-base`/`py-3.5`, botones `min-h-[48px]`, animación `eventSheetSlideUp`, `overflow-hidden` en body vía `CalendarModal.js`. **Validado en celular.** |
| **Paso 3 — Ficha de paciente** | Búsqueda táctil + modales bottom-sheet. Drawer con `bottom` = altura bottom nav. Fichas de historial y creación integradas. **Validado en producción.** |
| **Paso 4 — Toolbar + Google Sync** | `#calendarToolbar` táctil (Prev/Next, mes, Hoy, filtro terapeuta móvil). Semáforo Google en menú **Más** (`GoogleSyncUI.js`, `#mobileMoreGoogleSync`). `#googleSyncBtn` solo `md+`. **Validado en producción.** |
| **Compilación / deploy** | `npm run build` → `dist/output.css`. Deploy **Firebase Hosting** completo. |

**Archivos tocados y completados en Fase 1:**

```
tailwind.config.js
index.css
index.html
js/utils/MobileNav.js
js/components/MobileBottomNav.js
js/components/ComponentManager.js
js/components/Header.js
js/components/MainModals.js          ← Paso 2: #eventModal responsive
js/modules/calendar/CalendarModal.js ← Paso 2: bloqueo scroll body
js/managers/patient/PatientModalsHTML.js  ← Paso 3: bottom-sheets paciente
js/managers/patient/PatientModals.js       ← Paso 3: _syncBodyScroll
js/components/Sidebar.js                   ← Paso 3: búsqueda táctil
js/managers/PatientManager.js              ← Paso 3: cancel + window close inactivos
js/utils/GoogleSyncUI.js                   ← Paso 4: semáforo + click sync (header + Más)
js/modules/reception/ReceptionControl.js   ← Hotfix 17 may: sin sidebar móvil; header md+
js/modules/help/HelpManual.js              ← Paso 4: apertura desde «Más» (bottom-sheet)
index.html                                 ← Paso 4: #calendarToolbar responsive
index.css                                  ← Hotfix 17 may: sticky-column z-index, scroll-margin edición paciente
dist/output.css
```

**Archivos creados / modificados en sesiones anteriores (contexto):** justificantes médicos + Firebase Storage (`RESUMEN_SESION_20260517.md`).

### Estado de la Fase 1 (UI Móvil)

| Paso | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundamentos CSS / Tailwind | ✅ Completado |
| 1 | `MobileBottomNav` + `MobileNav` | ✅ Completado |
| 2 | Modal de citas `#eventModal` touch-friendly | ✅ Completado |
| 3 | Ficha de paciente: búsqueda + modales (Nuevo / Historial) | ✅ Completado |
| 4 | Toolbar calendario + Google Sync en «Más» | ✅ Completado |
| 4b | Hotfixes UX móvil (Control Maestro, ficha, HORA) | ✅ Implementado — **validar en celular** |

Fases posteriores: **Fase 2: Serverless Functions (En curso)** → Fase 3: SaaS en Firestore → Fase 4: Capacitor → OTA.

---

### Qué debes hacer tú (checklist actual de transición)

#### ✅ Hecho por el usuario (confirmado)

- [x] Probar barra inferior y navegación en celular móvil — **aprobada**
- [x] Probar creación de citas y bottom sheet táctil — **aprobada**
- [x] Probar ficha de paciente e historial clínico — **aprobada**
- [x] Probar semáforo animado de Google Sync en la pestaña "Más" — **aprobado**

#### ⏳ Pendiente validación usuario (hotfix 17 may)

- [ ] **Más → Control Maestro** (admin/recepción): abre panel sin buscar botón en header
- [ ] **Ficha paciente → Editar**: sin traslape con alerta de recurrencia; formulario visible al scroll
- [ ] **Agenda → scroll horizontal**: columna «HORA» legible; citas no encima del texto de hora

#### ⏳ Pendiente técnico (Para habilitar Cloud Functions)

| Tarea | Prioridad | Notas |
|-------|-----------|--------|
| **Asociar Tarjeta a Firebase (Upgrade a Blaze)** | Alta | Obligatorio en la consola de Firebase para usar Cloud Functions. La capa gratuita de Blaze es enorme ($0 cobro real). |
| **Inicializar carpeta `/functions`** | Media | Ejecutar `firebase init functions` seleccionando **Python** en la terminal. |
| **Registrar secrets en Firebase CLI** | Media | Ejecutar comandos para guardar `TWILIO_TOKEN`, `GOOGLE_REFRESH_TOKEN`, etc. |

#### Siguiente desarrollo (cuando digas “adelante”)

**Fase 2 — Migración a Firebase Functions & Cloud Scheduler (Python):**
El asistente de IA (Cursor) debe leer el archivo [DOCUMENTACION_MIGRACION_BLAZE.md](file:///d:/agbc/Ag_Pa/DOCUMENTACION_MIGRACION_BLAZE.md) y seguir la guía detallada de transiciones de endpoints.

Comando sugerido a Cursor: *“Lee el archivo DOCUMENTACION_MIGRACION_BLAZE.md e inicialicemos la carpeta de functions en Python para la migración de Render a serverless”*.

#### Pruebas rápidas (referencia)

| Prueba | Móvil (&lt; 768px) | Desktop |
|--------|-------------------|---------|
| Bottom nav | Visible | Oculta |
| Modal cita | Sheet 92dvh, slide-up | Centrado max-w-lg |
| Cerrar modal | ✕ o tap fuera; scroll body restaurado | Igual |
| Google Sync | Semáforo activo en pestaña "Más" | Semáforo activo en Header superior |
| Control Maestro | **Más** → fila destacada (admin/recepción) | Header `#openReceptionControlBtn` |
| Ficha paciente | Header en columna; alerta en fila; editar oculta alerta | Mismo layout, más ancho |
| Scroll agenda X | Columna HORA por encima de chips (`z-index` CSS) | Igual |

---

## Estado actual del proyecto

**Agenda Parláre** es el sistema operativo del Centro Parláre: agenda, pacientes, pagos, sincronización con Google Calendar/Sheets, recordatorios por WhatsApp y panel de recepción.

| Pieza | Tecnología | Dónde vive |
|--------|------------|------------|
| **Frontend** | HTML + Vanilla JS (ES modules) + Tailwind | Firebase Hosting (`taconotaco-d94fc.web.app`) |
| **Base de datos** | Firestore (+ Storage para justificantes) | Firebase — **siempre gana** sobre Google |
| **Bot WhatsApp** | Python + Flask + Twilio | Render (auto-deploy con `git push`) |
| **Última sesión (17 may)** | Justificantes médicos → Firebase Storage + lifecycle 120 días | Código en `main`; desplegar con `firebase deploy --only hosting` si aún no se hizo |

### Reglas críticas del sistema (no negociables)

Extraídas de `AI_RULES.md` y `VISION_PARLARE_V2.md`:

- Fechas solo con `TimeManager.js` y zona `America/Mexico_City` — **nunca** `toISOString()` para rangos de día.
- Citas en Firestore como ISO naive: `YYYY-MM-DDTHH:mm`.
- Google Calendar: blindaje 8:00–20:00 México; cambio de terapeuta = borrar evento anterior + crear uno nuevo.
- Grid central: citas canceladas **ocultas**; sidebar: canceladas **visibles** con etiqueta roja.
- Teléfono: `countryCode` + `phone` (10 dígitos) guardados por separado en Firestore.

---

## Cómo está estructurado el código

Dos programas hermanos comparten **Firebase** como única fuente de verdad:

```
┌─────────────────────────────────────────────────────────────┐
│  NAVEGADOR / APP MÓVIL (futuro)                             │
│  index.html + dist/output.css (Tailwind)                    │
│       ↓                                                     │
│  js/app.js  ←── orquesta todo al iniciar sesión             │
│       ├── firebase.js     (Auth, Firestore, Storage)        │
│       ├── managers/       (reglas de negocio)               │
│       ├── modules/        (calendario, reportes, admin…)    │
│       ├── services/       (Google, sync, auditoría)         │
│       └── components/     (Header, Sidebar, modales…)       │
└──────────────────────────┬──────────────────────────────────┘
                           │ lee/escribe
                           ▼
                    Firebase Firestore
                           ▲
                           │ lee/escribe
┌──────────────────────────┴──────────────────────────────────┐
│  whatsapp_webhook.py (Flask en Render)                      │
│  /webhook, /cron/reminders, /cron/daily-summary, etc.       │
│  + Twilio + Google Sheets/Calendar (service account)        │
└─────────────────────────────────────────────────────────────┘
```

### Frontend (Vanilla JS + Tailwind)

1. **`index.html`** — Esqueleto: pantalla de login + contenedor de la app. CSS compilado en `dist/output.css` (`npm run build` desde `index.css`).

2. **`js/app.js`** — Punto de entrada:
   - Login con Firebase Auth.
   - Si el usuario es válido → `ComponentManager` inyecta modales/UI → arranca calendario, pacientes, notificaciones, etc.

3. **Capas internas** (~50 archivos JS activos en `js/`):

   | Carpeta | Rol |
   |---------|-----|
   | `managers/` | “Cerebro”: `AuthManager`, `PatientManager`, `ScheduleManager` |
   | `modules/calendar/` | Grid, drag & drop, modales de citas (lo más complejo) |
   | `modules/reports/`, `admin/`, `reception/` | Finanzas, auditoría, control recepción |
   | `services/` | Firebase ↔ Google (Calendar, Sheets), sync en lote, red offline |
   | `components/` | Piezas de UI reutilizables (Header, Sidebar, WhatsApp dashboard) |
   | `utils/TimeManager.js` | **Todas** las fechas pasan por aquí |

4. **`js/firebase.js`** — Config del proyecto, rutas (`appointments`, `patientProfiles`), helpers de Firestore/Storage. Firebase se importa por CDN (módulos ES desde `gstatic.com`), no por npm.

5. **Flujo típico de una cita**  
   Usuario edita en `CalendarModal` → se guarda en Firestore → `SyncService` / servicios Google reflejan en Calendar y Sheet → el bot puede leer la misma cita para confirmaciones y recordatorios.

### Backend (bot Python)

**`whatsapp_webhook.py`** (~1.000 líneas): un solo archivo Flask con:

- `/webhook` — Respuestas interactivas de WhatsApp (confirmar, cancelar, etc.).
- `/cron/reminders` y `/cron/daily-summary` — Recordatorios (llamados por cron externo).
- `/api/send-message` — Envíos desde el dashboard web.
- Integración: Firestore, Twilio, Google Sheets/Calendar (IDs de Diana/Sam/Vero **hardcodeados**, igual que en el JS).

**`serve.py`** — Servidor local solo para desarrollo.

### Árbol de archivos principal (referencia)

```
Ag_Pa/
├── index.html              # SPA — esqueleto
├── index.css               # Diseño + variables; compila a dist/output.css
├── dist/output.css         # Tailwind compilado
├── serve.py                # Dev server local
├── whatsapp_webhook.py     # Bot WhatsApp (Render)
├── firebase.json           # Hosting + reglas Firestore
├── package.json            # Scripts: npm run build | watch
└── js/
    ├── app.js              # Orquestador principal
    ├── firebase.js         # Auth + Firestore + Storage
    ├── components/         # Header, Sidebar, modales, WhatsAppDashboard
    ├── managers/           # Auth, Patient, Schedule, Settings
    ├── modules/
    │   ├── calendar/       # Grid, eventos, modales
    │   ├── reports/        # Finanzas, corte de caja
    │   ├── admin/          # Ajustes, auditoría
    │   ├── reception/      # Control recepción
    │   └── help/           # HelpManual.js (actualizar al cambiar UI)
    ├── services/
    │   ├── google/         # OAuth, Calendar, Sheets
    │   ├── SyncService.js, AuditService.js, NetworkMonitor.js
    │   └── appointmentService.js, patientService.js
    └── utils/
        ├── TimeManager.js  # ← CENTRAL para fechas México
        ├── ToastService.js, LoaderService.js, Logger.js
        └── ...
```

---

## Estrategias para la app móvil

### Opción A — Híbrida: web actual + Capacitor (+ Tailwind móvil)

**Qué es:** La misma SPA dentro de un WebView nativo. Capacitor genera proyectos `android/` e `ios/`. Actualizaciones OTA posibles (Capacitor Updater / Ionic Appflow). **Ya documentada como preferida en `VISION_PARLARE_V2.md`.**

| Pros | Contras |
|------|---------|
| **Una sola base de código** con la web que ya funciona | La UI actual está pensada para **escritorio** — hay que **rediseñar responsive** (no es solo “envolver”) |
| Time-to-market **mucho menor** (semanas vs meses) | Sensación “nativa” limitada: animaciones, gestos, teclado, safe areas requieren cuidado extra |
| **OTA**: cambios HTML/JS/CSS sin revisión de tiendas | Google OAuth en WebView puede ser delicado (flujo del sistema o plugin) |
| Encaja con **Master Template SaaS**: mismo repo, otro Firebase + config | Rendimiento del calendario con muchas citas en móvil hay que validar |
| Alineado con stack actual (Tailwind, ES modules) | Plugins nativos nuevos = nueva versión en tienda |

### Opción B — Nativa: React Native o Flutter + mismo Firebase

**Qué es:** App nueva; Firebase Auth/Firestore/Storage vía SDK nativo; reimplementar pantallas y flujos.

| Pros | Contras |
|------|---------|
| UX móvil **potencialmente espectacular** (gestos, navegación nativa) | **Reescribir** calendario, pacientes, modales, sync Google, offline — meses de trabajo |
| Mejor integración cámara, push, biometría | **Dos codebases**: web + móvil; cada feature se implementa dos veces |
| OAuth/Google suele ir mejor en apps nativas | Para SaaS: clonar implica mantener **paridad** web ↔ móvil |
| Flutter = una UI para Android/iOS | Se pierde beneficio OTA del HTML empaquetado |
| Bueno si el producto es **móvil-first** y la web pasa a segundo plano | No sustituye el bot Python ni la web administrativa |

---

## Recomendación para SaaS (clonar otras clínicas)

### Decisión: **Opción A (Capacitor) primero**

Con un plan explícito de **UI móvil** — no como wrapper rápido del desktop, sino como la misma plantilla web optimizada para touch.

#### Por qué encaja con la visión SaaS

1. **Master Template** — Un repo plantilla con config en Firestore (`/config/clinic`), terapeutas dinámicos y white-label. Una UI sirve web + móvil; no duplicar ~50 módulos en Flutter/RN.

2. **Velocidad de clonación** — Nueva clínica ≈ nuevo proyecto Firebase + secrets + deploy hosting + build Capacitor con logo/colores en variables CSS.

3. **Operación y soporte** — Un bug en el modal de citas se corrige una vez; con OTA llega al móvil sin esperar Apple/Google. Crítico con N clínicas.

4. **Coherencia con roadmap** — Cloud Functions, Storage, justificantes, finanzas nativas en Firebase: todo vive hoy en JS; Capacitor lo reutiliza.

5. **Cuándo considerar Opción B** — Si el 80% del uso es solo móvil, se buscan animaciones premium tipo app bancaria, o la web queda solo en desktop y el móvil es un producto distinto. Entonces RN/Flutter como **segunda fase**, no como primer paso.

#### Cuello de botella real para SaaS (independiente de Capacitor vs Flutter)

El estado **hardcoded** actual:

- Nombres fijos: Diana, Sam, Vero en JS y Python.
- IDs de Google Sheets y Calendar en código.
- Config de Twilio en `whatsapp_config.json` / variables de Render.

**Debe evolucionar a configuración en Firestore** (`settings` / `/config/clinic`) según `VISION_PARLARE_V2.md`. Sin eso, cada clonación sigue siendo un fork manual.

---

## Roadmap sugerido (orden práctico)

1. **Fase 1 — UI móvil en web** — Ver sección detallada más abajo (fundamentos CSS, bottom nav, modales touch-friendly).
2. **Fase 2 — SaaS en datos** — Mover IDs de Sheets/Calendar y lista de terapeutas a Firestore; iterar sidebar/filtros desde DB.
3. **Fase 3 — Capacitor** — Proyectos `android/` / `ios/`, splash, iconos, plugins mínimos (status bar, etc.).
4. **Fase 4 — OTA** — Parches de UI sin revisión de tienda.
5. **Opcional después** — Pantallas nativas puntuales (ej. dictado IA) vía plugins; vista “un día” en calendario móvil.

### Pantallas prioritarias para adaptación móvil

| Orden | Pantalla / flujo | Módulos principales |
|-------|------------------|---------------------|
| 1 | Login | `index.html`, `app.js`, `AuthManager` |
| 2 | Día de hoy / agenda resumida | `CalendarManager`, `CalendarUI` |
| 3 | Detalle y edición de cita | `CalendarModal`, `CalendarEvents`, `MainModals.js` |
| 4 | Ficha de paciente | `PatientManager`, `PatientModals` |
| 5 | Recepción / WhatsApp | `ReceptionControl`, `WhatsAppDashboard` |

---

## Fase 1: UI Móvil en Web (plan detallado)

> **Decisión:** Opción A (Capacitor) con visión SaaS. La Fase 1 prepara la SPA para móvil **antes** de empaquetar con Capacitor.
>
> **Primer entregable recomendado:** Paso 0 (fundamentos CSS) + Paso 1 (barra de navegación inferior).

### Lo que ya existe (no partir de cero)

| Archivo | Qué hace hoy en móvil |
|---------|------------------------|
| `index.html` | `viewport-fit=cover`; `pb-bottom-nav md:pb-0` en layout; scroll horizontal del grid; botón fecha móvil |
| `js/components/MobileBottomNav.js` | **Nuevo:** barra Agenda / Pacientes / Recepción / Más (`md:hidden`) |
| `js/utils/MobileNav.js` | **Nuevo:** abrir/cerrar sidebar, sheet “Más”, estado de tab activo |
| `js/components/Header.js` | Menú hamburguesa → `MobileNav.showPatients()` |
| `js/components/Sidebar.js` | Drawer fijo `w-80`, oculto con `-translate-x-full` fuera de `md` |
| `js/components/ComponentManager.js` | Overlay `#sidebarOverlay` para cerrar el drawer en móvil |
| `js/components/MainModals.js` | `#eventModal`: bottom-sheet móvil (`#eventModalPanel`, 92dvh, touch); centrado en `md+` |
| `js/modules/calendar/CalendarModal.js` | `overflow-hidden` en body al abrir/cerrar modal de cita |
| `js/modules/reception/ReceptionControl.js` | **Referencia gold:** modal `h-full` en móvil, `sm:rounded-2xl` en desktop |
| `index.css` | `100dvh`, animaciones de modal, transición del sidebar, estilos de impresión |

### Breakpoints y tokens actuales

- **Breakpoint dominante:** `md` (768px) = móvil vs escritorio.
- **`sm` (640px):** solo en algunos modales (`genericModal`, `ReceptionControl`).
- **`tailwind.config.js`:** incluye `bottom-nav`, safe-area padding y variable `--bottom-nav-height` en `index.css`.
- **UX móvil (Sprint 1):** barra inferior (3 tabs) + drawer + modales bottom-sheet + toolbar calendario + hotfixes sticky/HORA y ficha paciente.

### Orden de implementación (Sprint 1)

#### Paso 0 — Fundamentos (~30 min, bajo riesgo)

**Archivos:** `tailwind.config.js`, `index.css`, `index.html`

1. En `tailwind.config.js` → `theme.extend`:
   - `spacing['bottom-nav']`: altura de la barra inferior (ej. `4.5rem`).
   - Utilidades de safe-area con `env(safe-area-inset-*)` (notch / home indicator en iPhone).

2. En `index.css` → capa `@layer utilities`:
   - `.touch-target` → `min-h-[44px] min-w-[44px]`.
   - `.modal-sheet-mobile` → viewport completo en `< md`, sheet en desktop.
   - Variable CSS `--bottom-nav-height` para que `main` y modales no queden tapados.

3. En `index.html` → en `#appContent` o `main`:
   - `pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0`.

**Por qué primero:** la bottom nav y los modales full-screen dependen de este espacio reservado abajo.

#### Paso 1 — Barra de navegación inferior (primer entregable visible)

**Archivos:** nuevo `js/components/MobileBottomNav.js`, nuevo `js/utils/MobileNav.js`, `ComponentManager.js`, ajustes en `Header.js`, opcional `#mobile-bottom-nav-root` en `index.html`.

**Visible solo en móvil:** `md:hidden`.

| Tab | Acción | Notas |
|-----|--------|-------|
| **Agenda** | Muestra `main` (calendario), cierra drawer | Estado por defecto |
| **Pacientes** | Abre `#mainSidebar` | Reutilizar lógica del menú hamburguesa |
| **Más** | Bottom sheet: **Control Maestro** (admin/recepción), Corte, Reportes, Google Sync, Manual, Salir | Acciones que hoy están `hidden md:flex` en el header |

**Refactor JS:** extraer `toggleSidebarMobile()` de `Header.js` a `MobileNav.js` compartido (bottom nav + hamburguesa sin duplicar lógica).

**Header en móvil:** simplificar; dejar usuario + campana + sync; mover Corte/Reportes/Soporte al tab “Más”.

#### Paso 2 — Modal de citas touch-friendly ✅ IMPLEMENTADO

**Archivos:** `js/components/MainModals.js`, `js/modules/calendar/CalendarModal.js`, `index.css` (`eventSheetSlideUp`, `#eventModalFooter` safe-area).

| Elemento | Desktop (`md+`) | Móvil (`< md`) — implementado |
|----------|-----------------|-------------------------------|
| Contenedor `#eventModal` | Centrado, `p-4` | `items-end`, `p-0`, backdrop blur |
| Panel `#eventModalPanel` | `max-w-lg`, `h-[85vh]`, `rounded-3xl` | Ancho completo, `h-[92dvh]`, `rounded-t-3xl`, animación slide-up |
| Handle | — | Barra superior gris |
| Inputs / selects | `text-sm`, `py-2` | `text-base`, `py-3.5` (anti-zoom iOS) |
| Radios tipo cita | Fila | Tarjetas apiladas, radios 20px |
| Footer `#eventModalFooter` | Botones compactos | `min-h-[48px]`, safe-area inferior |
| Body scroll | — | Bloqueado al abrir (`CalendarModal.js`) |

#### Paso 3 — Ficha de paciente (bottom-sheets) ✅ IMPLEMENTADO

**Archivos:** `PatientModalsHTML.js`, `PatientModals.js`, `Sidebar.js`.

- Modales Nuevo / Historial: patrón `items-end`, `92dvh`, `rounded-t-3xl`.
- Búsqueda sidebar táctil; drawer con `bottom` = altura bottom nav.

**Hotfix 17 may:** header historial en columna en móvil; `#patientRecurrenceAlert` sin traslape; edición oculta alerta.

#### Paso 4 — Toolbar calendario + Google Sync ✅ IMPLEMENTADO

**Archivos:** `index.html` (`#calendarToolbar`), `GoogleSyncUI.js`, `MobileBottomNav.js`, `Header.js`.

- Toolbar táctil; filtro terapeuta móvil; semáforo Google en «Más».

**Hotfix 17 may:** Control Maestro en «Más»; CSS `sticky-column` z-index para scroll horizontal del grid.

El grid semanal completo (vista “un día”) sigue en **Sprint 2**; el scroll horizontal del grid actual ya tiene fix de capas CSS.

### Qué NO tocar en Sprint 1 (salvo hotfixes puntuales)

- `js/modules/calendar/CalendarUI.js` — vista “un día” (complejo); solo CSS de capas para sticky HORA.
- Lógica de Firebase, `TimeManager.js`, sync con Google.

### Mapa de archivos por sprint

```
Sprint 1 (Fase 1 — esta semana)
├── tailwind.config.js              ← tokens safe-area + bottom-nav
├── index.css                       ← utilidades touch + modal-sheet
├── index.html                      ← padding-bottom en main
├── js/components/MobileBottomNav.js   ← NUEVO
├── js/utils/MobileNav.js              ← NUEVO (toggle sidebar compartido)
├── js/components/ComponentManager.js
├── js/components/Header.js
└── js/components/MainModals.js        ← #eventModal responsive

Sprint 2 (Fase 1 continuación / polish)
├── js/modules/calendar/CalendarUI.js  ← vista día en móvil (opcional)
└── Capacitor (Fase 4) cuando Blaze + UX móvil estén estables
```

### Inyección de UI (flujo actual)

`ComponentManager.init()` orden actual:

1. `Header.inject(appContent)`
2. `Sidebar.inject(mainLayout)`
3. `MobileBottomNav.inject(appContent)` + `MobileBottomNav.init()`
4. `PatientModalsHTML.inject(appContent)`
5. `MainModals.inject(appContent)`
6. `injectMobileOverlay(appContent)`

### Estado de implementación Fase 1 (detalle histórico)

| Paso | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundamentos CSS / Tailwind | ✅ Implementado |
| 1 | `MobileBottomNav` + `MobileNav` | ✅ Implementado |
| 2 | `#eventModal` touch-friendly | ✅ Implementado |
| 3 | Ficha paciente + búsqueda sidebar | ✅ Implementado |
| 4 | Toolbar calendario + Google Sync en «Más» | ✅ Implementado |
| 4b | Hotfixes Control Maestro / ficha / HORA | ✅ Implementado (validar en celular) |

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cómo está hoy? | SPA modular en vanilla JS + Tailwind → Firebase; bot Flask en Render comparte Firestore y Google. |
| ¿Una base de código móvil? | **Sí, con Capacitor**, reutilizando la web tras adaptarla a móvil. |
| ¿Mejor para “verse espectacular”? | Nativo gana el techo visual; híbrido gana si se invierte en **diseño móvil** (no solo empaquetar desktop). |
| ¿Mejor para SaaS / clonar clínicas? | **Capacitor + config Firestore + white-label CSS** — alineado con `VISION_PARLARE_V2.md`. |

---

## Referencias

- `VISION_PARLARE_V2.md` — Visión V2, reglas críticas, estrategia Capacitor y pilares SaaS.
- `AI_RULES.md` — Protocolo de despliegue, manual de ayuda, estándares técnicos.
- `resumen_sesion/RESUMEN_SESION_20260517.md` — Justificantes médicos + Storage.
- Sesión **17 may 2026** — Hotfixes UX móvil: Control Maestro en «Más», header ficha paciente, `sticky-column` agenda (`index.css`, `PatientModals.js`, `PatientModalsHTML.js`, `ReceptionControl.js`).

*Última actualización de este documento: **17 de Mayo de 2026** (hotfixes post-Fase 1).*

---

*Última actualización: 17 de Mayo de 2026 — Regla de mantenimiento documento vivo; Pasos 0–2 implementados y validados (bottom nav en Hosting); siguiente: Paso 3 toolbar calendario.*
