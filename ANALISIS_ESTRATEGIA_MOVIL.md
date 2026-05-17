# Análisis: Estructura del Proyecto y Estrategia App Móvil

> Documento generado el **17 de Mayo de 2026** a partir de la revisión de `VISION_PARLARE_V2.md`, `resumen_sesion/RESUMEN_SESION_20260517.md`, `AI_RULES.md` y el código activo del repositorio.
>
> Objetivo: entender la arquitectura actual y decidir el camino hacia una app móvil espectacular (Android + iPhone) con visión SaaS (clonar para otras clínicas).

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
| `index.html` | `viewport-fit=cover`; scroll horizontal del grid (`min-w-[700px]`); mini-calendario oculto hasta `xl`; botón saltar a fecha (`md:hidden`) |
| `js/components/Header.js` | Menú hamburguesa (`md:hidden`) que abre el sidebar como drawer |
| `js/components/Sidebar.js` | Drawer fijo `w-80`, oculto con `-translate-x-full` fuera de `md` |
| `js/components/ComponentManager.js` | Overlay `#sidebarOverlay` para cerrar el drawer en móvil |
| `js/components/MainModals.js` | Modal de cita `#eventModal`: `max-w-lg`, `h-[85vh]`; `genericModal` con patrón bottom-sheet en `sm` |
| `js/modules/reception/ReceptionControl.js` | **Referencia gold:** modal `h-full` en móvil, `sm:rounded-2xl` en desktop |
| `index.css` | `100dvh`, animaciones de modal, transición del sidebar, estilos de impresión |

### Breakpoints y tokens actuales

- **Breakpoint dominante:** `md` (768px) = móvil vs escritorio.
- **`sm` (640px):** solo en algunos modales (`genericModal`, `ReceptionControl`).
- **`tailwind.config.js`:** sin tokens móviles centralizados (safe-area, altura de bottom nav).
- **Problema de UX actual:** en móvil la navegación principal es “abrir el sidebar entero” (~320px). Funciona en tablet, pero **no** es el patrón de app (agenda + pacientes + acciones al alcance del pulgar).

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
| **Recepción** | Abre `ReceptionControl` si el rol lo permite | Modal ya full-screen en móvil |
| **Más** | Bottom sheet: Corte, Reportes, Manual, Salir | Acciones que hoy están `hidden md:flex` en el header |

**Refactor JS:** extraer `toggleSidebarMobile()` de `Header.js` a `MobileNav.js` compartido (bottom nav + hamburguesa sin duplicar lógica).

**Header en móvil:** simplificar; dejar usuario + campana + sync; mover Corte/Reportes/Soporte al tab “Más”.

#### Paso 2 — Modal de citas touch-friendly (alto impacto)

**Archivo principal:** `js/components/MainModals.js` → bloque `#eventModal` (~líneas 45–204).

**Patrón a copiar:** `ReceptionControl.js` (sheet desde abajo en móvil).

```html
<!-- Esquema objetivo -->
<div id="eventModal" class="... flex items-end md:items-center p-0 md:p-4">
  <div class="w-full md:max-w-lg h-[92dvh] md:h-[85vh] rounded-t-3xl md:rounded-3xl ...">
```

| Elemento | Desktop | Móvil |
|----------|---------|--------|
| Contenedor | Centrado, `p-4` | `items-end`, sin padding lateral |
| Panel | `max-w-lg`, `rounded-3xl` | `w-full`, `rounded-t-3xl`, `h-[92dvh]` |
| Inputs / selects | `py-2` | `py-3.5 text-base` (evita zoom automático en iOS) |
| Radios tipo cita | `flex gap-4` | `flex-col gap-2` en `< md` |
| Footer botones | `py-2` | `min-h-[48px]`, `touch-manipulation`, sticky + safe-area |
| Botón cerrar | Icono pequeño | Área táctil 44×44 (`p-3 -m-1`) |

**Opcional:** en `CalendarModal.js`, al abrir: `document.body.classList.add('overflow-hidden')` (mejor en Capacitor).

`genericModal` ya está razonable; unificar clases `.touch-target` en botones.

#### Paso 3 — Toolbar del calendario en móvil

**Archivo:** `index.html` (toolbar del calendario, ~líneas 76–108).

- En `< md`: ocultar o reubicar `#statusMsg`.
- Botones prev/next/hoy: `min-h-[44px]`, más separación.
- Título: `text-lg` en móvil si hace falta.

El grid semanal con scroll horizontal puede quedarse para **Sprint 2**; bottom nav + modal táctil aportan más valor inmediato que rehacer `CalendarUI.js`.

### Qué NO tocar en Sprint 1

- `js/modules/calendar/CalendarUI.js` — vista “un día” (complejo).
- `js/managers/patient/PatientModalsHTML.js` — después del modal de citas.
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

Sprint 2 (Fase 1 continuación)
├── js/modules/calendar/CalendarUI.js  ← vista día en móvil (opcional)
├── js/managers/patient/PatientModalsHTML.js
└── js/modules/help/HelpManual.js      ← documentar nav móvil (AI_RULES)
```

### Inyección de UI (flujo actual)

`ComponentManager.init()` orden actual:

1. `Header.inject(appContent)`
2. `Sidebar.inject(mainLayout)`
3. `PatientModalsHTML.inject(appContent)`
4. `MainModals.inject(appContent)`
5. `injectMobileOverlay(appContent)`

**Propuesta:** insertar `MobileBottomNav.inject(appContent)` después del sidebar (paso 2.5), antes de modales.

### Estado de implementación Fase 1

| Paso | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundamentos CSS / Tailwind | Pendiente |
| 1 | `MobileBottomNav` + `MobileNav` | Pendiente |
| 2 | `#eventModal` touch-friendly | Pendiente |
| 3 | Toolbar calendario móvil | Pendiente |

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
- `resumen_sesion/RESUMEN_SESION_20260517.md` — Justificantes médicos + Storage (última sesión al crear este documento).

---

*Última actualización: 17 de Mayo de 2026 — Añadido plan detallado Fase 1 (UI móvil en web).*
