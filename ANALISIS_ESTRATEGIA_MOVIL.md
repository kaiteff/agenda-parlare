# Análisis: Estructura del Proyecto y Estrategia App Móvil

> Documento actualizado el **25 de Mayo de 2026** a partir de la revisión de `VISION_PARLARE_V2.md`, `resumen_sesion/RESUMEN_SESION_20260525.md`, `AI_RULES.md` y el código activo del repositorio.
>
> Objetivo: entender la arquitectura actual y decidir el camino hacia una app móvil espectacular (Android + iPhone) con visión SaaS (clonar para otras clínicas).
>
> **Este archivo es el documento vivo de la estrategia móvil y del roadmap técnico-producto.** **Antigravity lo usa como mapa principal del proyecto.** Cualquier asistente (Cursor, Antigravity) debe **actualizarlo al cerrar cada sesión** que toque UI móvil, responsive, Capacitor, Cloud Functions, recibos/reembolsos, Storage o decisiones de producto. Ver `AI_RULES.md` → Regla de Oro 3 y `.cursor/rules/analisis-estrategia-movil.mdc`.

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
 ✅ Modo Un Día (vista diaria móvil, grid 2 cols + pestañas Lun–Sáb)
 ✅ Recibos reembolso Fase 1 (campos SaaS Ready + schema Firestore)
 ✅ Recibos reembolso Fase A Paso 2 (Cloud Function PDF + Storage)
 ✅ Fase C WhatsApp Opt-In (recurrentOptIn + badge ficha + webhook)
 ✅ Marca Parláre (logo, favicon, manifest PWA)
 ✅ UX Fase C visible (semáforo sidebar + panel reception_alerts + onboarding v9)
 ✅ Hotfix calendario móvil (columna hora angosta + semana sin scroll X)
 ✅ Bitácora de Auditoría móvil y Detalle de WhatsApp (Ver mensaje completo colapsable + horario legible + Cloud Function message logging)
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
| 18 May 2026 | **Modo Un Día en calendario (&lt; md)** | Grid 2 columnas (Hora + día), pestañas táctiles Lun–Sáb, sin scroll horizontal; default `day` en móvil vía `initViewMode()` | Mantener solo vista semanal con scroll en celular |
| 18 May 2026 | **Toggle Día \| Semana en toolbar** | Control segmentado `#toggleViewDayBtn` / `#toggleViewWeekBtn` (`md:hidden`) enlazado en `CalendarEvents.js` | Vista día forzada siempre en desktop |
| 18 May 2026 | **Onboarding Novedades (`NewFeatureAlert.js`)** | Inyectar pop-up premium con expiración de 3 días (Regla 4) y doble descarte: Cerrar aviso (temporal) y No volver a mostrar (permanente) | Avisos permanentes e intrusivos en cada sesión |
| 18 May 2026 | **Recibos reembolso — Fase 1 UI (prep SaaS)** | Campos disabled + badge «SaaS Ready» en Configuración y pacientes; schema Firestore listo | Activar inputs antes del generador PDF |
| 18 May 2026 | **Recibos Digitales de Reembolso (Fase A)** | Generación automática en Cloud Functions de PDFs de reembolso con Cédula Profesional y Egreso de terapeutas; envío WhatsApp al tutor = paso posterior | Facturación SAT obligatoria o comprobantes manuales |
| 18 May 2026 | **Recibos Fase A — Paso 2 (backend)** | Trigger `on_appointment_receipt_trigger` en `appointments` al marcar `isPaid`; PDF HTML→`xhtml2pdf`; Storage `recibos_pacientes/{patientId}/{fecha}.pdf`; flag paciente `reimbursementReceipt.autoGenerate` (+ legacy `autoReceipt`) | Generar PDF solo en cliente |
| 18 May 2026 | **Optimizador de Espacios (Fase B)** | Ante cancelaciones de 8-24h, ofrecer automáticamente por WhatsApp adelantar la sesión a pacientes agendados más tarde el mismo día | Lista de espera abierta general lenta y manual |
| 18 May 2026 | **Fase C — Consentimiento WhatsApp** | Campo `recurrentOptIn` (pending/accepted/rejected), badge semáforo en ficha paciente, webhook `optin_yes`/`optin_no`, alertas `reception_alerts`, crons solo si `accepted` | Recordatorios sin consentimiento |
| 18 May 2026 | **Marca + PWA base** | Logo oficial `assets/parlare-logo.png` en login/header; `manifest.webmanifest`, favicon, `theme-color`; helper `js/utils/brandAssets.js` | Solo texto con gradiente en header |
| 18 May 2026 | **UX visible Fase C + SaaS copy** | Semáforo en tarjetas del sidebar (`WhatsAppOptIn.renderWhatsAppOptInDot`); panel alertas en Control Maestro (`ReceptionAlertsService.js`); `NewFeatureAlert` v9; banners «SaaS Ready» (`saasReadyCopy.js`); Control Maestro bottom-sheet en móvil | Semáforo solo en ficha; alertas solo en Firestore |
| 18 May 2026 | **Lista pacientes = `Sidebar.js`** | Comentarios y refresh post-cita usan `Sidebar.render()`; **no existe** `PatientUI.js` en el repo activo | Mantener referencias obsoletas a `PatientUI` |
| 19 May 2026 | **Hotfix calendario móvil (Día / Semana)** | Columna hora ~75% (`3.25rem`); vista Semana sin scroll horizontal; línea «ahora» solo sobre días; chips compactos (`formatTime12hCompact`) | `grid-cols-2` 50/50 en Día; `min-w-[700px]` + scroll X en Semana |
| 19 May 2026 | **Hotfix calendario desktop** | z-index: encabezado «Hora» por encima de celdas al scroll; línea roja «ahora» no tapa columna hora (`calendar-header-row`, `index.css`) | Hora 9:00 am traslapaba texto «Hora» en esquina sticky |
| 21 May 2026 | **Excepción de Opt-In y Detalle en Bitácora** | Los pacientes preexistentes con `wantsWhatsapp == true` conservan el envío de recordatorios automáticos sin ser bloqueados por el opt-in inicial. Al crear paciente o enviar bienvenida se pone en `false` y `pending`. La bitácora ahora maneja múltiples sub-acciones de WhatsApp (`WHATSAPP_REMINDER_PM`, `WHATSAPP_REMINDER_SKIPPED`, `WHATSAPP_REMINDER_ERROR`) con detalles de error/mensaje colapsables. | Bloquear recordatorios para todos los pacientes hasta que respondan el opt-in manualmente. |

---

## Registro de avance y qué hacer ahora

> **Última sesión de implementación:** **21 May 2026** — Opt-In WhatsApp + bitácora (ver bloque abajo).
>
> **Complemento cerrado (agenda escritorio + docs):** Validación usuario de auto-scroll e índice slot; toggle **Día \| Semana** en desktop; `ARQUITECTURA_FUTURA.md` (roadmap + registro reversión); fusión **`VISION_PARLARE_V2.md`** (✅/⏳/🔜). Resumen: `resumen_sesion/RESUMEN_SESION_20260519.md` (sección complemento).

### Cierre de sesión — 21 May 2026

**Entregado hoy:**
- **Lógica de Excepción de Opt-In (WhatsApp):** Los pacientes antiguos (que ya tienen `wantsWhatsapp == true`) no son bloqueados por las nuevas reglas de opt-in recurrente, permitiendo que sigan recibiendo recordatorios automáticos.
- **Flujo de Registro de Pacientes Nuevos:** Se inicializa `wantsWhatsapp = false` y `recurrentOptIn = 'pending'` para garantizar que se envíe la plantilla de bienvenida solicitando opt-in.
- **Acción Manual de Bienvenida:** Al presionar **Bienvenida** en el expediente, se fuerza `wantsWhatsapp = false` y `recurrentOptIn = 'pending'` para iniciar el proceso de consentimiento limpio.
- **Integración Webhook:** Cuando el paciente responde "Sí, autorizo", el webhook actualiza Firestore con `wantsWhatsapp = true` y `recurrentOptIn = 'accepted'`. Si responde "No", se pone en `false` y `'rejected'` y crea una alerta de seguimiento manual.
- **Bitácora Enriquecida de WhatsApp:** Soporte para sub-acciones `WHATSAPP_REMINDER_PM`, `WHATSAPP_REMINDER_SKIPPED` y `WHATSAPP_REMINDER_ERROR` en el panel de auditoría, con filtros inteligentes y visualización del mensaje o error exacto colapsable/desplegable.
- **Corrección en Manual:** Corrección de typo en `HelpManual.js` y actualización de sus instrucciones de WhatsApp.

**Deploy recomendado:**
```powershell
npm run build
firebase deploy --only hosting
```

**Validar en celular:** Más → Bitácora; agenda Día/Semana; semáforo pacientes; Control Maestro.

**Resumen:** `resumen_sesion/RESUMEN_SESION_20260521.md`

### Cierre — agenda escritorio y documentación maestra

**Entregado (código + docs):**
- ✅ Agenda desktop alta prioridad **#1–#3** (`CalendarSlotIndex.js`, `scrollToWorkHoursOnNextRender`, `#calendarViewToggle` en `index.html`). Usuario validó #1 y #2 en producción.
- ✅ `ARQUITECTURA_FUTURA.md` en raíz — prioridades alta/media/premium y registro de cambios con reversión.
- ✅ `VISION_PARLARE_V2.md` — merge estado real (hecho / pendiente / visión); backend Functions; forward-only sync marcado implementado.
- ✅ `HelpManual.js` — vista Día/Semana también en computadora.

**Deploy si aún no está en hosting:**
```powershell
npm run build
firebase deploy --only hosting
```

**Validar tras deploy:** toolbar **Día \| Semana** en PC; modo Día + pestañas Lun–Sáb; prev/next sin salto de scroll.

### ⏳ Falta (obligatorio / validación)

| # | Qué falta | Notas |
|---|-----------|--------|
| 1 | **Validación final de opt-in en producción** | ✅ Validado en vivo por el usuario (nuevos pacientes en amarillo, autorizados en verde). |
| 2 | **Recibos end-to-end** | Paciente con `reimbursementReceipt.autoGenerate: true` → cita **Pagada** → comprobar `receiptPdfUrl` + PDF en Storage. |
| 3 | **Toggle Día desktop en producción** | ✅ Validado en vivo por el usuario (probada la vista Día en PC). |
| 4 | **Búsqueda iPhone — validar tras hotfix robusto** | Tras deploy 25 may: en iPhone teclear nombre completo y parcial de paciente recién creado (con y sin acentos, dictado por voz, paste). Debe filtrarse a tiempo real. Si vuelve a fallar: pedir captura de consola Safari (Web Inspector). |
| 5 | **Campana de notificaciones móvil — validar** | Tras deploy 25 may: en iPhone tocar la 🔔 del header → debe abrir panel `fixed top-16 left-2 right-2` sin quedar cortado por `overflow-hidden`. |
| 6 | **Pestañas unificadas Confirmaciones — validar** | Verificar que el panel WhatsApp ya no muestra botones duplicados Hoy/Mañana y se sincroniza con la selección del Sidebar. |
| 7 | **Copiloto Colaborativo — validar UI** | Cancelar una cita real en ventana 8–24 h: (a) aparece banner glassmorphism en sup-der con contador **8 min** (ajustado el 26 may por límite de Cloud Functions), (b) celda en agenda brilla ámbar↔esmeralda con ⚡, (c) cada botón escribe en `copilot_overrides/{id}` con el `action` correcto (verificar en Firestore Console), (d) modal Manual lista candidatos > 2 h con WhatsApp pre-llenado y tel link. |
| 8 | ✅ **Copiloto Colaborativo — contrato backend cerrado** (26 may, Antigravity) | `functions/space_optimizer.py` ahora hace **polling cada 30 s** sobre `copilot_overrides/{id}` + estado de la cita durante `total_wait=480 s` (8 min ajustado por límite Cloud Functions 540 s). Respeta `skip_delay`, `pause` y aborta si la cita es des-cancelada. Frontend `COPILOT_DELAY_MS` propagado a 8 min por Cursor en la tarde. |
| 9 | **Quiet Hours + Copiloto** | Actualmente el delay/banner solo aplica en horario diurno (07:00–22:00 MX). Si la cancelación cae en Quiet Hours, el backend guarda en `quiet_hours_pending` pero el frontend aún no la muestra. Decisión pendiente: ¿procesar al día siguiente automáticamente o requerir aprobación manual de Yari al amanecer? |
| 10 | ✅ **Índices Firestore versionados y desplegados** (26 may) | `firestore.indexes.json` con 6 índices compuestos (`appointments` × 4, `space_offers` × 2) creado por Cursor en la mañana y desplegado por Antigravity en la tarde. Todos `Enabled` en producción. Errores `failed-precondition` desaparecieron de consola. |
| 11 | **Agenda desktop — media prioridad** | Ver ítems 4–9 en `ARQUITECTURA_FUTURA.md` (tooltips/hover, query semana, debounce…). |
| 12 | **Fase 1 Ausencias / Vacaciones — validar UI en producción** | Tras deploy 25 may (Antigravity): (a) clic en 🔒 del header del día abre modal premium en vez de `prompt()`; (b) elegir terapeuta (con Diana/admin: select habilitado; con Vero/Sam: select bloqueado en su nombre); (c) rango de fechas multi-día funciona y excluye domingos; (d) toggle «Todo el día» oculta selectores horarios; (e) si hay citas en el rango, aparece tarjeta ámbar con conteo + nombres; (f) confirmar muestra modal con resumen (3 nombres + «N más»); (g) tras guardar, los bloqueos aparecen en el calendario y NO contaminan reportes de visitas escolares. |
| 13 | **Fase 1 Ausencias — hotfixes pendientes (S-011 a S-014)** | ✅ Completados (XSS mitigado, escrituras en batch implementadas, validación de hora y detección de duplicados añadidas). |
| 14 | **Fase 1.5 Ausencias — Modal premium UX (25 may, noche)** | Validar con Vero/Sam/Yari en celular: (a) cards de tipo de ausencia se destacan al tocarse (borde y fondo azul + sombra suave); (b) chips «Hoy / Esta semana / Próxima semana / 2 semanas» rellenan los inputs de fecha y activan «Todo el día»; (c) tarjeta indigo «Resumen» muestra `Tipo · Terapeuta · rango · N días hábiles · horario`; (d) banner verde «Sin citas afectadas» aparece cuando el rango está bien y no choca con niños; (e) si pones hora fin antes que inicio, los dos selects se marcan en rojo en tiempo real; (f) botón Confirmar con icono candado y gradient azul→índigo no se solapa con el home indicator en iPhone (safe-area). |
| 15 | ✅ **Optimización Firestore Fase 3 — deploy en producción** (26 may, Antigravity) | Índices `Enabled`, function con `timeout_sec=540` y delay 8 min en producción, **Win 1 multicast** `CalendarData.subscribe` implementado. ⏳ Faltan validaciones físicas: (a) cancelar cita test en ventana 8-24 h → banner aparece con contador 8 min; (b) pulsar «Pausar» entre min 0-8 → el backend respeta la decisión (no envía); (c) si no hay acción → ofertas WhatsApp se envían a los 8 min; (d) abrir historial paciente con citas > 30 días, confirmar otra cita → el historial completo se mantiene visible (cache merge funciona); (e) dashboard Firebase «Operaciones de lectura» 24-48 h después: bajar de 58.4 % a < 25 %; (f) login Vero/Sam → no debe haber error «index required» ni `failed-precondition`. |
| 16 | **Limpieza Hosting Storage** (acción manual Daniel) | Hosting Storage está en 17.6 GB / 10 GB (cuota excedida). Antigravity confirmó por CLI que solo hay 1 canal activo (`live`). Acción: Firebase Console → Hosting → Release history → menú tres puntos arriba derecha → *Release storage settings* → mantener únicamente las últimas 10–15 versiones. Firebase purga automáticamente el excedente en 24 h. |
| 17 | **Validación móvil del cambio Copiloto 8 min** | Tras deploy hosting con el hotfix: en iPhone/Android, cancelar una cita test → el banner debe mostrar literalmente «Esperando · 8 min» y el contador empezar en `8:00`. Verificar también el `HelpManual.js` (sección Copiloto) y `MANUAL_TERAPEUTAS.md` — ya no debe decir «10 min» en ninguna parte. |

### 💡 Sugerencias (opcional — próximas sesiones)

| Prioridad | Sugerencia | Beneficio |
|-----------|------------|-----------|
| Alta | Enlace **«Ver recibo»** en citas pagadas (`receiptPdfUrl`) | Cierra el flujo Fase A para Yari/familias sin abrir Storage. |
| Alta | Iconos PWA **192×192** y **512×512** (y splash Capacitor) | Tiendas + «Añadir a pantalla de inicio» con marca correcta. |
| Media | **Empty states** + skeleton loaders en sidebar y agenda | Sensación app premium; menos pantalla en blanco al cargar. |
| Media | Reportes / **Corte de caja** como bottom-sheet en móvil (mismo patrón 92dvh) | Coherencia UX con Control Maestro y ficha paciente. |
| Media | Tokens de color Parláre en `tailwind.config.js` (teal/magenta del logo) | UI alineada al colibrí; menos mezcla `blue-600` / `indigo-600`. Ver **Premium** en `ARQUITECTURA_FUTURA.md`. |
| Media (desktop) | Query Firestore por semana visible + debounce snapshot | Menos re-renders; ver ítems 5–7 en `ARQUITECTURA_FUTURA.md`. |
| Baja | Enviar PDF de recibo por **WhatsApp al tutor** | Paso posterior a generación automática. |
| Baja | Reducir `animate-ping` del badge WhatsApp en listas largas | Rendimiento en celulares viejos. |
| Baja | En móvil, aviso al elegir **Semana**: «Para ver nombres completos, usa vista Día» | Refuerza UX sin quitar Semana. |
| Roadmap | **Capacitor POC** en emulador Android | Validar login Firebase + UI en WebView antes de tiendas. |
| Roadmap | Retirar **Render** cuando todo el bot esté en Functions | Un solo backend serverless. |

> **Regla de cierre:** cada sesión debe dejar esta subsección **Falta + Sugerencias** actualizada (no solo lo hecho).

---

## 🔎 Análisis técnico — Inhabilitar día/hora y Vacaciones (25 may)

> **Estado actualizado 25 may (tarde):** Antigravity ejecutó la **Fase 1 completa** (modal premium + permisos por terapeuta + bug `isSchoolVisit:true` cerrado). Las fases 2 (WhatsApp a tutores) y 3 (colección `availability_blocks/`) siguen pendientes. Hallazgos de seguridad/calidad detectados en la revisión post-merge están listados en `SEGURIDAD_Y_VULNERABILIDADES.md` (S-011 a S-014) y en `PLAN_DE_TRABAJO.md`.

### Cómo funciona hoy (mapeo del código)

| Funcionalidad | Dónde vive | Cómo funciona | Problemas |
|---|---|---|---|
| **Inhabilitar Hora** (modal cita) | `CalendarModal.js`, radio `value="block"` | Crea un `appointment` con `isHourlyBlock: true`. Permiso `manage_blocks` (admin/recepción). | UX ok. **Pero** en Google Calendar se sube recurrente `RRULE:FREQ=WEEKLY;BYDAY=MO-SA;COUNT=24` (6 meses, no 4 semanas como dice el comentario) — `GoogleCalendarService.js:263`. En Firestore es **un único doc**, así que borrarlo en la app deja la recurrencia huérfana en Google Calendar. **Inconsistencia.** |
| **Bloquear Día Completo** | Botón 🔒 (`day-block-btn`) en el header de cada día — `CalendarUI.js:148–200` | Pregunta terapeuta vía **`prompt()` nativo del navegador** si vista=Todas. Crea un `appointment` con `name: "⛔ Día Inhábil/Vacaciones"`, `isFullDayBlock: true`, **`isSchoolVisit: true`** (sí, también activa esa bandera), `date: "YYYY-MM-DDT08:00:00"`. | • Icono `w-3 h-3` casi invisible.<br>• `prompt()` nativo: pésimo en móvil, sin estilo, sin validación visual.<br>• `isSchoolVisit: true` contamina reportes de visitas a escuela.<br>• **NO detecta citas existentes** ese día.<br>• Las citas previas quedan visualmente en conflicto con el bloqueo. |
| **Vacaciones** | **No existe como concepto** | Diana/Yari tienen que clickear el botón 🔒 día por día. | Sin rango de fechas; tedioso para vacaciones largas. No hay metadata (motivo, retorno, sustituto). |
| **Notificación a tutores** | **No existe** | Cero. El paciente se entera el día de la cita o cuando ve que WhatsApp no llega. | Riesgo de imagen profesional: tutor con cita confirmada llega a clínica y se topa con que está cerrada. |
| **Sustitución de terapeuta** | **No existe** | Si Diana se va y Sam puede cubrir, hay que reagendar pacientes manualmente uno por uno. | Carga operativa para Yari. |
| **Vista consolidada de ausencias futuras** | **No existe** | No hay panel «próximas ausencias del equipo» en Control Maestro. | Diana no ve un vistazo de quién falta esta semana / el próximo mes. |

### Otros bugs / inconsistencias detectadas en el camino

- **Doble propósito de `isSchoolVisit`** — al bloquear día completo se marca también como visita escolar (`CalendarUI.js:195`). Cualquier reporte que filtre por «visitas a escuela» va a contar bloqueos erróneamente.
- **`CalendarData.js:211`** ignora `isFullDayBlock || isSchoolVisit` en cálculos — coherente con el bug anterior pero hace que ambos conceptos se traten como uno solo en finanzas.
- **Validador `isSlotFree`** considera el bloqueo de día completo bien (comparación por `YYYY-MM-DD`), pero no por terapeuta cruzada: si Diana se bloquea, Sam y Vero siguen disponibles ✅ (correcto, ya filtra por `apptTherapist`).

### Propuesta de rediseño — 3 fases

#### **Fase 1 — UX premium del bloqueo (frontend solo, sin backend nuevo) — ✅ Implementada 25 may por Antigravity**

> Archivos: `js/modules/calendar/AbsenceModal.js` (nuevo, 330 líneas), `js/components/MainModals.js` (sección 7 `#absenceModal`), `js/managers/AuthManager.js:271` (`canManageBlockFor`), `js/modules/calendar/CalendarUI.js:168-178` (apertura del modal).
>
> **Pendientes de calidad detectados en review post-merge** (no bloquean Fase 2, ver `SEGURIDAD_Y_VULNERABILIDADES.md` y `PLAN_DE_TRABAJO.md`):
> - **S-011 🚨 XSS** en `AbsenceModal.js:208` — `appt.name` interpolado en `innerHTML` sin escape (mismo vector que S-001 del calendario). Arreglar junto a S-001 con helper centralizado.
> - **S-012 ⚠️ Escrituras en serie sin batch** — `await CalendarData.createEvent` en bucle: una vacación con bloqueo horario completo puede generar 120+ round-trips serializados sin atomicidad. Migrar a `writeBatch`.
> - **S-013 🟡 Sin validación `endHour > startHour`** — si el usuario elige 15→10, el toast dice «éxito» pero no se escribe nada. Agregar guard.
> - **S-014 🟡 Sin detección de duplicados** — dos clics seguidos crean docs duplicados (en Firestore y Google Calendar).
> - **Bug Google Calendar pendiente Fase 3** — `GoogleCalendarService.js:263` sigue subiendo bloqueos horarios como recurrentes `RRULE:FREQ=WEEKLY;BYDAY=MO-SA;COUNT=24`. Con el modal nuevo es más fácil generar muchos bloqueos por hora; mientras Fase 3 llega, **recomendar usar «Todo el día» para vacaciones largas**.

- **Reemplazar `prompt()` por modal premium «Crear ausencia»** con:
  - Selector visual de terapeuta (chips con foto + iniciales).
  - **Tipo de ausencia**: 🏖️ Vacaciones / 🏥 Médica / 📚 Capacitación / 👤 Personal / 🚫 Otro. Por defecto «Vacaciones».
  - **Rango de fechas** (`<input type="date">` × 2 con date-picker premium). Si es 1 día, mismo valor en ambos.
  - **Rango horario opcional**: «Todo el día» (toggle) o «De X:XX a Y:YY» dentro del día.
  - **Motivo** (textarea breve, opcional, queda en bitácora para auditoría).
  - **Detección automática de citas afectadas**: tarjeta visual que liste pacientes con cita en ese rango. Esta validación corre antes de crear el bloqueo.
- **Pre-acciones obligatorias** antes de confirmar bloqueo si hay citas afectadas:
  - Para cada cita el sistema sugiere: ① reagendar manualmente, ② proponer otro día misma semana al tutor, ③ pasarla a otra terapeuta (si aplica) ④ cancelarla y avisar.
  - Yari debe resolver cada cita antes de poder presionar «Confirmar ausencia».
- **Datos limpios**:
  - Dejar de poner `isSchoolVisit: true` al bloquear día (es bug).
  - Añadir `blockReason: 'vacation' | 'medical' | 'training' | 'personal' | 'other'`.
  - Añadir `blockNote: string` con el motivo libre.

#### **Fase 2 — Notificación al tutor (backend WhatsApp)**

- Cuando se confirma el bloqueo con citas afectadas:
  - **Para cada paciente con `recurrentOptIn: 'accepted'`**: enviar template Twilio aprobado (nuevo, hay que crearlo en Meta) con texto:
    > «Hola [Nombre]. Te avisamos que tu sesión del [día] a las [hora] con [terapeuta] no se llevará a cabo por motivo de [vacaciones / otro]. Para reagendar responde: A) Misma semana B) La próxima C) Reagendo después por WhatsApp».
  - **Webhook handle** en `main.py` para procesar respuesta interactiva:
    - **A** → ofrecer slots libres misma semana (similar al Copiloto, pero invertido: aquí el sistema ofrece huecos al paciente).
    - **B** → ofrecer slots la semana siguiente.
    - **C** → crear alerta en `reception_alerts` para Yari.
  - **Para pacientes sin opt-in WhatsApp**: alerta en Control Maestro para que Yari los llame.
- **Trazabilidad en bitácora**: tipo `BLOCK_NOTIFICATION_SENT` / `BLOCK_NOTIFICATION_RESPONDED` con el ID del paciente.

#### **Fase 3 — Modelo de datos limpio (refactor, opcional pero recomendado)**

> Esto es lo «correcto» a largo plazo pero requiere migración. Documentar en `ARQUITECTURA_FUTURA.md` como ítem de **alta prioridad** futura.

- **Nueva colección `availability_blocks/{id}`** con esquema:
  ```js
  {
    therapist: 'diana' | 'sam' | 'vero',
    startDate: 'YYYY-MM-DDTHH:mm:ss',
    endDate: 'YYYY-MM-DDTHH:mm:ss',
    type: 'full_day' | 'hourly' | 'recurring_weekly',
    reason: 'vacation' | 'medical' | 'training' | 'personal' | 'other',
    note: string,
    substituteTherapist: 'sam' | null,  // si delegan pacientes
    affectedAppointments: [appointmentId, ...],  // snapshot al crear
    notificationStatus: 'pending' | 'partial' | 'sent' | 'failed',
    createdBy: 'diana' | 'yari',
    createdAt: timestamp
  }
  ```
- Migrar `isFullDayBlock`/`isHourlyBlock` actuales: dejar de crearlos en `appointments`, pero mantener compatibilidad de lectura (los viejos siguen funcionando).
- Vista consolidada en Control Maestro: **«Próximas ausencias del equipo»** con cards por bloque mostrando el período, motivo, citas afectadas y estado de notificación.

### Riesgos / cosas a cuidar al implementar

- **Bloqueo recurrente Google Calendar** — Si Fase 1 elimina la recurrencia `COUNT=24` del lado del frontend, el backend GoogleCalendarService.js debe actualizarse también o quedan huérfanos. Posible solución: en Fase 3, los bloqueos recurrentes de hora se modelan como `type: 'recurring_weekly'` en la colección nueva y Google Calendar se sincroniza desde ahí.
- **Permisos**: la notificación masiva a tutores debe pasar por opt-in. Pacientes que rechazaron WhatsApp NO reciben mensaje (alerta a Yari para que llame).
- **Idempotencia**: si Yari crea/cancela un bloqueo varias veces, no enviar WhatsApp duplicado al tutor. Usar campo `notificationStatus` en el bloque.
- **Capacidad operativa**: si Sam está en vacaciones 2 semanas y tiene 30 pacientes con sesión, son 30 WhatsApp + 30 reagendamientos. Debe escalonarse o agruparse para no saturar el bot de Twilio.

### Beneficios esperados

- **Para Diana/Yari:** un click → vacaciones de 2 semanas con tutores ya avisados y reagendados, en vez de 12 clicks + 30 mensajes manuales.
- **Para tutores:** percepción profesional («me avisaron con anticipación») y opción rápida de reagendar.
- **Para la clínica:** menos no-shows / quejas, mejor uso de slots libres durante la ausencia (Copiloto Colaborativo puede ofrecerlos).
- **Para SaaS futuro:** modelo de datos limpio listo para multi-clínica.

---

### Lo que ya llevamos hecho

| Área | Qué se hizo |
|------|-------------|
| **Decisión estratégica** | Opción A: Capacitor + misma SPA web, con visión SaaS y serverless en Blaze documentadas. |
| **Paso 0 — Fundamentos** | `--bottom-nav-height`, `.touch-target`, safe-areas, `.pb-bottom-nav`, estilos de barra inferior en `index.css`. Tokens en `tailwind.config.js`. Padding inferior en el layout (`index.html`). |
| **Paso 1 — Bottom nav** | Nuevos `js/utils/MobileNav.js` y `js/components/MobileBottomNav.js`. Inyección en `ComponentManager.js`. Header usa `MobileNav` para el menú hamburguesa. |
| **Navegación móvil** | 3 tabs: **Agenda**, **Pacientes**, **Más** (sheet: Control Maestro, Corte, Reportes, Google Sync, Configuración de Clínica, Manual, etc.). Solo visible en `< md` (768px). **Validado en producción y emulación móvil.** |
| **Paso 5 — Configuración de Clínica** | Adaptación del panel administrativo de costos, comisiones y temas como bottom sheet deslizable con pull handle, safe bottom padding, y botones de eliminación táctiles visibles (`opacity-100` en móvil). Integrado al menú móvil **Más** (`#mobileMoreSettings`). **Totalmente validado.** |
| **Hotfix 17 may — Control Maestro** | `#openReceptionControlBtn` solo `md:flex` en header. Eliminado botón del sidebar móvil. Admin/recepción: **Más → Control Maestro** (`#mobileMoreReception`). |
| **Hotfix 17 may — Ficha paciente** | `#patientHistoryTitle` en columna; botones editar/cerrar `absolute top-3 right-3` en móvil; `#patientRecurrenceAlert` en fila propia; se oculta al abrir edición + `scrollIntoView` al formulario. |
| **Hotfix 17 may — Agenda scroll X** | `.sticky-column` / `.sticky-corner` con `z-index` 30/40; celdas y `.absolute.inset-0` por debajo para que «HORA» no quede tapada. |
| **Paso 2 — Modal de cita** | `#eventModal` como bottom-sheet: `items-end`, `h-[92dvh]`, `rounded-t-3xl`, inputs `text-base`/`py-3.5`, botones `min-h-[48px]`, animación `eventSheetSlideUp`, `overflow-hidden` en body vía `CalendarModal.js`. **Validado en celular.** |
| **Paso 3 — Ficha de paciente** | Búsqueda táctil + modales bottom-sheet. Drawer con `bottom` = altura bottom nav. Fichas de historial y creación integradas. **Validado en producción.** |
| **Paso 4 — Toolbar + Google Sync** | `#calendarToolbar` táctil (Prev/Next, mes, Hoy, filtro terapeuta móvil). Semáforo Google en menú **Más** (`GoogleSyncUI.js`, `#mobileMoreGoogleSync`). `#googleSyncBtn` solo `md+`. **Validado en producción.** |
| **Paso 6 — Modo Un Día** | `CalendarState.viewMode` (`week` \| `day`), `selectedDayIndex`, `initViewMode()` (default `day` si &lt; 768px). `CalendarUI.js`: grid `grid-cols-2`, pestañas Lun–Sáb, quita `min-w-[700px]` y scroll X. Toolbar: toggle **Día \| Semana** (`#toggleViewDayBtn`, `#toggleViewWeekBtn`). `CalendarEvents.js`: init + bind + sync índice al usar Hoy / mini-calendario / salto fecha. **Sin cambios en `CalendarData.js`.** |
| **UX móvil — Bitácora auditoría** | Entrada en menú **Más → Bitácora de Auditoría** (`MobileBottomNav.js`, permiso `view_audit`). Modal `auditLogModal` bottom-sheet en móvil (`MainModals.js`). Formateo de fecha de cita legible (`appointmentDate`) y bloque de mensaje de WhatsApp colapsable (`💬 Ver mensaje completo` en `AuditPanel.js`). Backend: la Cloud Function scheduler guarda el texto de mensaje real en lugar de un log estático (`main.py`). |
| **Hotfix 19 may — Calendario móvil** | `index.css`: `--cal-time-col` 3.25rem, `.cal-grid-day` / `.cal-grid-week`, `.calendar-week-fit` (sin overflow-x). `CalendarUI.js`: hora compacta, línea roja desde columna de días, chips `S·Nombre` en semana. `dateUtils.formatTime12hCompact`. `index.html`: `#calendarScrollWrap`. |
| **Agenda escritorio — perf UX (19 may)** | Auto-scroll solo en carga/Hoy; índice `CalendarSlotIndex.js`; toggle **Día \| Semana** en `md+` (`#calendarViewToggle`). Roadmap: **`ARQUITECTURA_FUTURA.md`**. |
| **Hotfixes móvil iPhone (25 may)** | (1) **Búsqueda pacientes iPhone — robusta a iOS Safari**: input con `autocorrect/autocapitalize/spellcheck off` + `inputmode="search"`; al teclear se cambia automáticamente a la pestaña **Todos**. **5 event listeners cruzados** (`input`, `search`, `change`, `keyup`, `compositionend`) + **polling de respaldo 250 ms** mientras el input está enfocado (cubre dictado por voz, autocompletado QuickType y casos donde iOS «traga» eventos). Comparación contra `_lastSearchValue` para evitar renders duplicados. Forzar update en `blur`. Normalización (acentos/mayúsculas + teléfono solo dígitos) en `applyAll` y filtro inline. (2) **Botón notificaciones (campana) móvil**: el panel desplegable era `position: absolute` dentro de un contenedor con `overflow-hidden` y se quedaba oculto en celular. Ahora el panel es `position: fixed` en móvil (`top-16 left-2 right-2`, `max-h-[70vh]`) y mantiene `absolute md:w-80` en desktop. Archivos: `Sidebar.js`, `PatientFilters.js`, `Header.js`. |
| **Frontend Copiloto Colaborativo (25 may)** | UI completa del «Waitlist Autopilot» para Yari. **Servicio** `js/services/WaitlistCopilotService.js`: listener `appointments` que detecta cancelaciones en ventana 8–24 h con `cancelledAt < 10 min`; tick interno 1 s para contador. Escribe en `copilot_overrides/{appointmentId}` con `action ∈ {skip_delay, pause, manual_search}`. Métodos: `skipDelay`, `pauseAutopilot`, `markManualSearch`, `getCandidates`, `getGlowingAppointmentIds`. **Panel** `js/components/WaitlistCopilotPanel.js`: banner flotante glassmorphism (gradiente slate→indigo→fuchsia + `backdrop-blur-xl`), contador regresivo mono tabular + barra emerald→amber→rose, 3 botones premium (🚀 Automático esmeralda con shadow elevado, ⏸️ Pausar blanco translúcido, 🔍 Manual índigo). Modal de candidatos con WhatsApp pre-llenado + tel link. Optimización: tick solo actualiza nodos `data-bind` sin re-generar HTML. **CSS** `.calendar-slot-glow` en `index.css` con `@keyframes copilotSlotGlow` (alterna inset ámbar↔esmeralda + box-shadow radiante + ⚡ en esquina). Integración en `CalendarUI.js` y `app.js` (inicialización + re-render agenda solo cuando cambia el conjunto de IDs glowing). |
| **Fase 1 Ausencias / Vacaciones (25 may — Antigravity)** | Reemplaza el `prompt()` nativo del botón 🔒 por modal premium `#absenceModal` (bottom-sheet en móvil, `max-w-lg` desktop, `z-9500`). **Nuevo archivo** `js/modules/calendar/AbsenceModal.js` (330 líneas): tipo (🏖️ vacaciones / 🏥 médica / 📚 capacitación / 👤 personal / 🚫 otro), rango de fechas con `<input type="date">` × 2, toggle «Todo el día» + selectores horarios 8 AM–9 PM, **detección de conflictos en tiempo real** (lista nominal de niños afectados en card ámbar con count). **Permisos**: `AuthManager.canManageBlockFor()` — admin/recepción: todo; terapeuta (Vero/Sam): solo su agenda (select `disabled`). **Bug fix**: `isSchoolVisit: false` explícito en bloqueos nuevos (no contamina reportes de visitas escolares). Apertura desde `CalendarUI.js:168` con `import()` dinámico. Domingos excluidos automáticamente del rango. **Pendientes detectados en review (no bloquean Fase 2):** S-011 a S-014 en `SEGURIDAD_Y_VULNERABILIDADES.md` (XSS en lista de conflictos, escrituras sin batch, validación end>start, dedup). |
| **Optimización Firestore Fase 1 (26 may, mañana — Antigravity)** | Reducción drástica del consumo de lecturas en plan Blaze. **`PatientManager.js`**: listener de `appointments` migrado de `orderBy("date", "desc")` global a query con ventana `[-30, +60]` días + filtro `where('therapist', '==', therapistId)` para no-admins. Sort cliente-side (evita índice compuesto adicional). Listener de `patientProfiles` filtrado por terapeuta para no-admins. **`PatientModals.openHistory`**: ahora es async; muestra skeleton/spinner mientras hace `getDocs(query(... where name == patient.name))` para cargar todas las citas históricas del paciente bajo demanda (en lugar de tenerlas en memoria global). Import de `serverTimestamp` corregido en `PatientActions.js`. **`CalendarData.subscribe`**: misma ventana 90 días, admin/recepción carga todo sin filtro de terapeuta. **`functions/space_optimizer.py`**: reemplazado `time.sleep(600)` puro por polling de 30 s sobre `appointments/{id}` + `copilot_overrides/{id}` para detectar cancelaciones revertidas o acciones manuales (`skip_delay` / `pause`). **Refactor `process_autopilot_candidates`** extraída para reutilizar desde el CRON de Quiet Hours. |
| **Pop-up Novedades v9.3 con Copiloto (26 may, tarde)** | Detectado hueco crítico: el pop-up v9.2 no mencionaba el Copiloto a Yari (su usuaria principal). Bumpeado `STORAGE_KEY = parlare_onboarding_v9_3`, `LEGACY_KEYS += 'v9_2'`, `launchDate = 2026-05-26`, vigencia 2 días. **Tarjeta nueva al inicio** (gradient indigo→fuchsia→slate, badge «Solo Yari/Diana»): explica el banner glassmorphism, contador 8 min, celda brillando ámbar↔esmeralda con ⚡, los 3 botones (🚀 Automático salta a la acción / ⏸️ Pausar aborta / 🔍 Manual abre lista con WhatsApp), comportamiento default (envío automático si no hay acción en 8 min), y nota explícita de que terapeutas no ven el banner. Link al Manual de Ayuda al final. Las otras 5 tarjetas (vacaciones modal, regla de oro, búsqueda iPhone, campana móvil, pestañas unificadas) se mantienen. |
| **Optimización Firestore Fase 3 — deploy producción + Win 1 (26 may, tarde — Antigravity)** | ✅ Deploy exitoso de los 6 índices compuestos (`failed-precondition` desapareció de consola). ✅ Cloud Function `on_appointment_cancelled_trigger` redeployada — Google rechazó `timeout_sec=720` (límite duro para triggers Firestore = **540 s**); ajuste fino a `timeout_sec=540` y `total_wait=480` (8 min de delay manual) con margen de 1 min para Twilio/Sheets. ✅ **Win 1 implementado** (que Cursor había marcado como pendiente alto-impacto): `CalendarData.subscribe` ahora es **multicast** — el primer suscriptor abre la conexión Firestore real, los siguientes (incluyendo `PatientManager`) reusan la misma + reciben el último snapshot cacheado inmediato. `PatientManager._setupRealtimeListener` quitó su listener duplicado de citas y se suscribe a CalendarData. Solo conserva su listener filtrado de `patientProfiles`. **Ahorro esperado**: otro **30–50 %** sobre las lecturas que aún quedaban tras Fase 1+2. Total estimado: 29 k → 8–12 k/día. ✅ Código pushado a `main`. ⏳ **Manual pendiente Daniel**: en consola Firebase → Hosting → Release history → tres puntos → *Release storage settings* → mantener únicamente las últimas 10–15 versiones para que purgue automáticamente los 7.6 GB excedentes. |
| **Hotfix sincronización Copiloto frontend↔backend (26 may, tarde — Cursor)** | Antigravity bajó el delay del backend a 480 s (8 min) por límite de timeout de Google Cloud, pero el frontend seguía con `COPILOT_DELAY_MS = 10 * 60 * 1000`. **Bug crítico UX**: contador del banner mostraba 10 min mientras backend procesaba ofertas a los 8 min. Si Yari tocaba «Pausar» entre min 8 y 10, la decisión **se perdía silenciosamente** (polling del backend ya había terminado). **Fix:** (a) `WaitlistCopilotService.js:44` — constante `COPILOT_DELAY_MS = 8 * 60 * 1000` con comentario explicando el contrato; (b) `WaitlistCopilotPanel.js` — importa `COPILOT_DELAY_MS` y deriva `DELAY_MINUTES = Math.round(...)`; los cálculos hardcoded `10 * 60 * 1000` en `pct` y `progress` ahora usan la constante; los textos «Esperando · 10 min» y «Tienes 10 min para intervenir» ahora interpolan `${DELAY_MINUTES} min`; (c) `HelpManual.js` — 3 menciones de «10 minutos» → «8 minutos»; (d) comentarios residuales en `WaitlistCopilotService.js` y `CalendarUI.js` ahora referencian la constante en lugar del valor fijo. **Resultado**: cambio futuro del delay se propaga al UI con un solo edit en la constante. Build OK, lints OK. |
| **Optimización Firestore Fase 2 — hotfixes (26 may, mañana — Cursor)** | Validación post-Antigravity y corrección de issues que bloqueaban producción: 🔴 **CRÍTICO `PatientManager.js:215`** — redeclaración de `const user` en mismo scope causaba `SyntaxError: Identifier 'user' has already been declared` → módulo entero no cargaba → **app no arrancaba en producción**. Refactor de `_setupRealtimeListener` para usar un solo `const user` + `const isSuperUser = isAdmin() || role === 'receptionist'`. Verificado con `node --input-type=module -e "import(...)"`. 🔴 **CRÍTICO `space_optimizer.py:111`** — `timeout_sec=120` (2 min) mientras polling era de 600 s (10 min): la función moría antes de completar el delay y el Copiloto **nunca enviaba ofertas** si Yari no actuaba en 2 min. Subido a `timeout_sec=720` (12 min). 🟠 **ALTO modal historial** — `PatientManager.render()` sobreescribía las citas históricas con el array limitado del listener cada vez que llegaba un snapshot. Solución: `PatientModals._historyCache = { patientId, patientName, appointments, loadedAt }` se llena en `openHistory()`, y nuevo método `getHistoryAppointments(patient, fallback)` hace **merge** del cache con live updates del listener (por `id`) para que el modal muestre todo el histórico Y refleje cambios en tiempo real. Cache invalidado en `closeHistory()` con TTL 5 min. 🟠 **ALTO `firestore.indexes.json` versionado** — creado en raíz con 6 índices compuestos (`appointments`: `therapist+date`, `name+date`, `isCancelled+date`, `sheetSynced+isPaid+date`; `space_offers`: `phone+status+createdAt`, `freedAppointmentId+status`). Enlazado en `firebase.json` bajo `"firestore": { ..., "indexes": ... }`. 🟡 **Bonus** — `_unsubscribeApts`/`_unsubscribeProfiles` + `_teardownListeners()` (evita memory leak en re-login) y separación `_rawProfiles` vs `patients` enriquecidos en `_processData` (sin contaminación cruzada). 🟢 **Reducción adicional lecturas** — filtros de fecha en dos listeners gigantes sin filtro: `WaitlistCopilotService` ahora `where('date', '>=', todayIso)` (antes leía TODAS las canceladas históricas, podían ser cientos) y `Header.batchSync` ahora `where('date', '>=', -30d)`. **Impacto**: dashboard mostraba **58.4 % cuota lecturas diarias (29 k de 50 k)**; con todos estos cambios desplegados se espera bajar a **30–40 % (15–20 k/día)**. Win pendiente (alto impacto, no aplicado hoy por riesgo): unificar listener duplicado de `appointments` entre `PatientManager` y `CalendarData` (ambos leen lo mismo). |
| **Fase 1.5 — Modal Ausencias UX premium (25 may, noche)** | Iteración sobre el modal anterior, pulida para terapeutas + Yari en escritorio y celular. **Visual:** header con icono 🔒 en gradient ámbar→naranja y subtítulo descriptivo. Tipos de ausencia rediseñados como **cards verticales (icono grande + texto)** en grid `grid-cols-3 sm:grid-cols-5`, estado activo con `has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-sm` (Tailwind 3.4) — `min-h-[64px]`, sin radio button visible. Toggle «Todo el día» como pill con icono 🕒 que vira azul al activarse. Botón Confirmar con `bg-gradient-to-br from-blue-600 to-indigo-600`, `shadow-blue-500/25`, icono candado SVG y `active:scale-[0.98]`. Footer móvil con sombra superior. **Funcionalidad nueva:** (1) **Atajos rápidos** chips «Hoy / Esta semana / Próxima semana / 2 semanas» — calculan lunes/sábado de la semana ISO actual, escriben en los `<input type="date">` y fuerzan «Todo el día» cuando el rango > 1 día. (2) **Tarjeta resumen indigo** (`#absenceSummaryCard`) — recalcula en cada cambio y muestra: `🏖️ Vacaciones · **Sam** · lun 25 → sáb 30 · 6 días hábiles · Todo el día`. Excluye domingos del conteo. (3) **Banner verde** (`#absenceNoConflictsCard`) — «Sin citas afectadas en este rango.» aparece sólo si rango válido y sin conflictos (mutuamente excluyente con la card ámbar). (4) **Validación visual en tiempo real** — si `endHour ≤ startHour`, los dos selects se marcan con `border-red-400 ring-2 ring-red-100` (sin alert, hasta intentar guardar). Archivos: `js/components/MainModals.js` (HTML modal completo), `js/modules/calendar/AbsenceModal.js` (`_applyQuickRange`, `_updateSummary`, `_validateHourRange`, refactor `bindEvents → refresh()`), `dist/output.css` recompilado. |
| **Recibos Fase 1 — Prep SaaS** | **Clínica** (`AdminSettingsModal` / tab Costos): por terapeuta `professionalLicense`, `graduationInstitution` (disabled, badge «SaaS Ready»). **Paciente** (nuevo + editar): `reimbursementReceipt.autoGenerate`, `reimbursementReceipt.tutorName` (disabled, «Próximamente»). Firestore: `settings/clinicConfig.baseCosts.{id}.*` y `patientProfiles.reimbursementReceipt`. |
| **Fase C — Opt-In WhatsApp** | `recurrentOptIn` en `patientProfiles` (default `pending`). Badge en ficha (`js/utils/WhatsAppOptIn.js` + `PatientModals.js`). Webhook: `functions/whatsapp_optin.py` + `main.py` (`optin_yes` → accepted, `optin_no` → rejected + `reception_alerts`). Crons solo si `accepted`. Template **`bienvenida_con_optin`** SID `HX08f74d9b520b85acfbf9e678e434b1f6` (`js/config/whatsappTemplates.js`). |
| **UX Fase C visible (frontend)** | **Sidebar:** punto verde/amarillo/rojo junto al nombre (`renderWhatsAppOptInDot` en `Sidebar.js`). **Control Maestro:** panel «Seguimiento manual WhatsApp» con listener `reception_alerts` (`ReceptionAlertsService.js` + `ReceptionControl.js`): Ver ficha (`window.openPatientHistoryById`), Atendido. **Móvil:** Control Maestro como bottom-sheet `92dvh` + pull-handle. **Onboarding:** `NewFeatureAlert.js` clave `parlare_onboarding_v9_0` (Modo Día, opt-in, recibos PDF). |
| **Marca + PWA** | `assets/parlare-logo.png`, `js/utils/brandAssets.js`, login + `Header.js`, `index.html` (favicon, apple-touch-icon, `theme-color`), `manifest.webmanifest`. |
| **SaaS Ready — copy UI** | `js/utils/saasReadyCopy.js`: banner en Configuración (`AdminSettingsModal.js`) y bloque recibos en paciente (`PatientModalsHTML.js`). Campos siguen `disabled` hasta activación comercial; no es bug. |
| **Arquitectura pacientes** | Lista y búsqueda: **`js/components/Sidebar.js`** (`render()`). `PatientActions.js` refresca con `Sidebar.render()`. No usar `PatientUI.js` (solo backups/`old/`). |
| **Recibos Fase A — Paso 2 (backend)** | `functions/receipt_generator.py`: trigger `@firestore_fn.on_document_written` en `appointments/{appointmentId}` cuando `isPaid` pasa a `true`. Valida `reimbursementReceipt.autoGenerate` (o `autoReceipt`). PDF desde `functions/templates/receipt.html` (Jinja2 + `xhtml2pdf`). Sube a Storage `recibos_pacientes/{patientId}/{YYYY-MM-DD}.pdf`. Escribe en cita: `receiptPdfUrl`, `receiptStoragePath`, `receiptGeneratedAt`. Logo opcional: env `RECEIPT_LOGO_URL`. Prueba local: `python functions/scripts/test_receipt_local.py`. |
| **Compilación / deploy** | Frontend: `npm run build` → `dist/output.css`; `firebase deploy --only hosting`. Backend recibos: `firebase deploy --only functions:on_appointment_receipt_trigger`. |

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
js/modules/help/HelpManual.js              ← Paso 4: apertura desde «Más» (bottom-sheet) + Paso 5: Sección Configuración
js/modules/admin/AdminSettingsModal.js     ← Paso 5: Modal de Configuración responsivo, táctil y pull handle
js/modules/calendar/CalendarState.js       ← Paso 6: viewMode, selectedDayIndex, initViewMode()
js/modules/calendar/CalendarUI.js          ← Paso 6: render día (2 cols, tabs, sin scroll X)
js/modules/calendar/CalendarEvents.js      ← Paso 6: toggle Día/Semana, sync selectedDayIndex
index.html                                 ← Paso 4: #calendarToolbar + Paso 6: toggle Día/Semana
index.css                                  ← Hotfix 17 may: sticky-column z-index, scroll-margin edición paciente + Paso 5: animaciones settings modal
dist/output.css
functions/receipt_generator.py          ← Fase A Paso 2: trigger + PDF + Storage
functions/templates/receipt.html      ← Plantilla recibo corporativo
functions/main.py                     ← import on_appointment_receipt_trigger
functions/requirements.txt            ← jinja2, xhtml2pdf
functions/scripts/test_receipt_local.py
js/utils/WhatsAppOptIn.js
js/config/whatsappTemplates.js
functions/whatsapp_optin.py
js/services/ReceptionAlertsService.js   ← UX: listener reception_alerts
js/modules/reception/ReceptionControl.js ← UX: panel alertas + bottom-sheet móvil
js/utils/NewFeatureAlert.js              ← onboarding v9
js/utils/saasReadyCopy.js
js/utils/brandAssets.js
assets/parlare-logo.png
manifest.webmanifest
firestore.rules                          ← lectura reception_alerts (super users)
```

**Deploy sugerido tras batch UX + Fase C:**

```powershell
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions:whatsapp_webhook,functions:on_patient_created
```

**Índice Firestore (si el listener de alertas falla en consola):** colección `reception_alerts`, campos `status` (Ascending) + `createdAt` (Descending).

**Archivos creados / modificados en sesiones anteriores (contexto):** justificantes médicos + Firebase Storage (`RESUMEN_SESION_20260517.md`).

### Estado de la Fase 1 (UI Móvil)

| Paso | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundamentos CSS / Tailwind | ✅ Completado |
| 1 | `MobileBottomNav` + `MobileNav` | ✅ Completado |
| 2 | Modal de citas `#eventModal` touch-friendly | ✅ Completado |
| 3 | Ficha de paciente: búsqueda + modales (Nuevo / Historial) | ✅ Completado |
| 4 | Toolbar calendario + Google Sync en «Más» | ✅ Completado |
| 4b | Hotfixes UX móvil (Control Maestro, ficha, HORA) | ✅ Implementado |
| 5 | Adaptación móvil responsiva del Panel de Configuración | ✅ Completado y Validado |
| 6 | Modo Un Día (vista diaria calendario móvil) | ✅ Implementado — **validar en celular** |

Fases posteriores: **Fase 2: Serverless Functions (En curso)** → Fase 3: SaaS en Firestore → Fase 4: Capacitor → OTA.

---

### Qué debes hacer tú (checklist actual de transición)

#### ✅ Hecho por el usuario (confirmado)

- [x] Probar barra inferior y navegación en celular móvil — **aprobada**
- [x] Probar creación de citas y bottom sheet táctil — **aprobada**
- [x] Probar ficha de paciente e historial clínico — **aprobada**
- [x] Probar semáforo animado de Google Sync en la pestaña "Más" — **aprobado**

#### ⏳ Pendiente validación usuario

**Hotfix 17 may**

- [ ] **Más → Control Maestro** (admin/recepción): abre panel sin buscar botón en header
- [ ] **Ficha paciente → Editar**: sin traslape con alerta de recurrencia; formulario visible al scroll
- [ ] **Agenda → scroll horizontal (modo Semana)**: columna «HORA» legible; citas no encima del texto de hora

**Paso 6 — Modo Un Día (18 may)**

- [ ] Al abrir en celular (&lt; 768px), agenda arranca en **Día** (una columna de citas + Hora)
- [ ] Pestañas **Lun–Sáb** cambian el día sin scroll horizontal
- [ ] Toggle **Semana** restaura grid de 6 días + scroll X; **Día** vuelve a vista compacta
- [ ] **Hoy** y salto de fecha seleccionan el día correcto en la barra de pestañas

#### ⏳ Pendiente técnico (Cloud Functions / Recibos)

| Tarea | Prioridad | Notas |
|-------|-----------|--------|
| **Deploy función recibos** | Alta | `firebase deploy --only functions:on_appointment_receipt_trigger` (requiere Blaze). |
| **Probar flujo end-to-end** | Alta | Paciente con `reimbursementReceipt.autoGenerate: true` → marcar cita **Pagada** → ver `receiptPdfUrl` en Firestore y PDF en Storage. |
| **Prueba local PDF (sin emulador)** | Media | `cd functions && python scripts/test_receipt_local.py --open` |
| **Emuladores (opcional)** | Media | `firebase emulators:start --only functions,firestore,storage` + `FIRESTORE_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST` |
| **Registrar secrets en Firebase CLI** | Media | Twilio/Google ya usados por otras functions; recibos no requieren secretos extra. |
| **UI: descargar recibo en ficha paciente** | Media | Leer `receiptPdfUrl` de citas pagadas (paso posterior). |
| **WhatsApp: enviar PDF al tutor** | Baja | Paso posterior a Fase A Paso 2. |

#### Siguiente desarrollo (cuando digas “adelante”)

**Fase 2 — Firebase Functions (Python) — en curso:**
- ✅ Carpeta `functions/` con webhook WhatsApp, crons, trigger bienvenida paciente.
- ✅ **Recibos Fase A Paso 2:** `on_appointment_receipt_trigger` (ver tabla arriba).
- ⏳ Deploy y validación en producción del generador de recibos.
- ⏳ Retirar Render cuando todo el tráfico del bot esté en Functions.

Guía: [DOCUMENTACION_MIGRACION_BLAZE.md](DOCUMENTACION_MIGRACION_BLAZE.md).

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
| Modo Un Día | Default en &lt; 768px; pestañas Lun–Sáb; grid 2 cols; sin `min-w-[700px]` | Toolbar toggle disponible; default **Semana** |
| Toggle vista | **Día \| Semana** junto a «Hoy» (`md:hidden`) | Misma semana completa en grid |

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
5. **Opcional después** — Pantallas nativas puntuales (ej. dictado IA) vía plugins; iconos 192/512 para tiendas; enlace «Ver recibo» en citas pagadas.

### Pantallas prioritarias para adaptación móvil

| Orden | Pantalla / flujo | Módulos principales |
|-------|------------------|---------------------|
| 1 | Login | `index.html`, `app.js`, `AuthManager` |
| 2 | Día de hoy / agenda (Modo Un Día ✅) | `CalendarManager`, `CalendarUI`, `CalendarState`, `CalendarEvents` |
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

#### Paso 6 — Modo Un Día ✅ IMPLEMENTADO

**Fuente de diseño:** reporte Antigravity `technical_analysis_mobile_day_view.md`.

**Archivos:** `CalendarState.js`, `CalendarUI.js`, `CalendarEvents.js`, `index.html` (toolbar).

| Pieza | Comportamiento |
|-------|----------------|
| `CalendarState.viewMode` | `'week'` \| `'day'` |
| `CalendarState.selectedDayIndex` | 0–5 (Lun–Sáb dentro de la semana de `currentDate`) |
| `initViewMode()` | En `CalendarEvents.init()`: `day` si `innerWidth < 768`, si no `week`; preselecciona día laborable actual |
| `CalendarUI.renderCalendar` | Si `day`: `allWeekDays` → un solo día; `grid-cols-2`; barra pestañas; quita `overflow-x-auto` y `min-w-[700px]` |
| Toolbar | `#toggleViewDayBtn` / `#toggleViewWeekBtn` con estilos activo/inactivo; `render()` al cambiar |
| Navegación fecha | Hoy, mini-calendario y `#calendarJumpInput` actualizan `selectedDayIndex` |

**Regla de oro:** no se modificó `CalendarData.js` ni validaciones de guardado en Firestore.

**Onboarding:** `NewFeatureAlert.js` v9 (`parlare_onboarding_v9_0`) — Modo Día, opt-in WhatsApp, recibos. Reset prueba: `localStorage.removeItem('parlare_onboarding_v9_0')`.

### Qué NO tocar (salvo UX móvil acordada)

- Lógica de Firebase, `TimeManager.js`, sync con Google, reglas de negocio en `CalendarData.js`.

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
├── js/utils/NewFeatureAlert.js        ← onboarding v9 (implementado)
├── js/services/ReceptionAlertsService.js
├── assets/parlare-logo.png + manifest.webmanifest
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
| 5 | Configuración de Clínica en «Más» | ✅ Implementado |
| 6 | Modo Un Día (calendario móvil) | ✅ Implementado (validar en celular) |

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
- Sesión **17 may 2026** — Hotfixes UX móvil: Control Maestro en «Más», header ficha paciente, `sticky-column` agenda.
- Sesión **18 may 2026** — **Paso 6 Modo Un Día:** `CalendarState.js`, `CalendarUI.js`, `CalendarEvents.js`, toggle en `index.html` (reporte Antigravity).
- Sesión **18 may 2026** — **Recibos Fase A Paso 2:** `functions/receipt_generator.py`, plantilla HTML, trigger `isPaid`, Storage `recibos_pacientes/`.
- Sesión **18 may 2026** — **Batch UX:** logo/PWA, `ReceptionAlertsService`, semáforo sidebar, `saasReadyCopy`, Control Maestro sheet.
- Sesión **19 may 2026** — Calendario móvil; Bitácora en **Más**; Regla documentación siempre; manual actualizado.
- Sesión **21 may 2026** — Reglas de excepción de Opt-In WhatsApp, inicialización en base de datos, flujo de Bienvenida manual/automático, webhook de actualización, y ampliación de bitácora WhatsApp con soporte para detalles de errores y mensajes omitidos.

*Última actualización de este documento: **26 de Mayo de 2026 (tarde — Fase 3 deploy producción + Win 1 multicast `CalendarData.subscribe` + Hotfix sincronización Copiloto 8 min + Pop-up v9.3 con tarjeta nueva del Copiloto para Yari). Lecturas esperadas: 29 k → 8–12 k/día tras propagación. Manual pendiente: limpieza de revisiones Hosting en consola Firebase.)** — Hotfixes móvil iPhone (búsqueda robusta, campana panel `fixed`, pestañas unificadas) · Banner Regla de Oro en `HelpManual.js` · **Pop-up Novedades v9.2** (`parlare_onboarding_v9_2`) con tarjeta nueva «🏖️ Vacaciones / Día Completo — modal premium» al principio, vigencia 2 días, limpieza automática de claves legacy (`v8_0`, `v9_0`, `v9_1`) del `localStorage` · **Frontend Copiloto Colaborativo** (`WaitlistCopilotService.js` + `WaitlistCopilotPanel.js` + `.calendar-slot-glow`) · **Fase 1 Ausencias / Vacaciones — Antigravity** (`AbsenceModal.js` 330 líneas + modal `#absenceModal` + `AuthManager.canManageBlockFor` + bug `isSchoolVisit:true` cerrado en bloqueos nuevos) · **Hotfixes seguridad S-011 a S-016 cerrados** (XSS en `AbsenceModal`, `writeBatch` Firestore, validación horaria, dedup, regresión XSS en `ModalService` callers + listas de pacientes en `Sidebar`/`ReceptionControl`/`PatientModals`/`CorteDeCaja` con `escapeHTML` centralizado) · **Safe-area iPhone** aplicada a `#absenceModalFooter` · **Hotfix header móvil**: dropdown «Diana ▼» (`#therapistSelectorContainer`) ya no se muestra en celular (era bug por `classList.remove('hidden')` que rompía el `hidden md:flex` del HTML) y pill `#mobileViewingTherapistWrap` ocultada definitivamente por redundancia con `#calendarTherapistFilterWrap` del toolbar.odal` en `MainModals.js` + integración en `CalendarUI.js` y `AuthManager.js`) con bloqueos por rango de fechas/horas, validación en tiempo real de citas afectadas, bloqueo restringido para terapeutas (Sam/Vero) y corrección de bug en `isSchoolVisit: true` en `CalendarModal.js`, y **Auditoría de seguridad inicial** documentada en `SEGURIDAD_Y_VULNERABILIDADES.md` (1 crítico XSS, 4 altos, 3 medios, 2 mejoras; 6 áreas ya reforzadas).*

---

*Reglas de mantenimiento (documentos vivos):*
- ***Siempre** (cada acción con cambios):* `.cursor/rules/documentacion-viva-siempre.mdc` + `AI_RULES.md` Regla de Oro **7**
- *Antigravity / roadmap:* `.cursor/rules/analisis-estrategia-movil.mdc`
- *Cierre de sesión («vamos», «alistémonos», etc.):* repaso final — `.cursor/rules/cierre-sesion-documentacion.mdc` y Regla de Oro **6**
