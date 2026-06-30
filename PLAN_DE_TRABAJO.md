# 🚀 Plan de Trabajo - Actualizado (30 Junio 2026)

Este documento detalla el estado actual del sistema Parláre, registrando los extraordinarios avances en la interfaz responsiva, justificantes médicos y el **Copiloto Colaborativo** (frontend listo el 25 may), y definiendo las prioridades del backend en Firebase Blaze y la preparación SaaS.

---

## ✅ Completado Recientemente (¡Listo!)

*   **Acceso Yari (Recepción) a baja y borrado de pacientes (30 Jun 2026)** — Se otorgó acceso al rol `receptionist` para eliminar pacientes permanentemente en la lógica de `PatientActions.js`, además de validar su acceso existente a la baja (desactivación).
*   **Toast Excel pendiente + manual sync (22 Jun 2026)** — Si terapeuta no puede escribir Excel ajeno, pago queda en Parláre; Diana/Yari sincronizan con botón naranja. Aviso en `CalendarData.togglePayment`.
*   **Fix perfil del paciente en desglose de cita (22 Jun 2026)** — Detalles de Cita muestra cuota/sesión del **perfil**. Archivos: `appointmentFinancials.js`, `CalendarModal.js`, etc.
*   **Fix App_Data cancelaciones/confirmaciones (22 Jun 2026)** — Cancelar o confirmar cita ya no escribe 250/-250 fantasma en Excel; solo Monto 0 y Parláre/Sesión en 0. ID de cita real en columna F. Archivos: `SheetService.js`, `CalendarData.js`, `PatientActions.js`. **Deploy:** `firebase deploy --only hosting`.
*   **Fix Ajuste Manual Parláre → App_Data (21 Jun 2026)** — En modal Detalles de Cita, el desglose manual (Parláre/Sesión/Planeación) ya se respeta al guardar y al marcar pagado.
*   **Fix cuota Parláre → Google Sheets (11 Jun 2026)** — Cuota del paciente/config ya no cae a $250 en Excel (`SheetService`, fallbacks dinámicos).
*   **Modales paciente — UX móvil iPhone (11 Jun 2026)** — Modales en `document.body`, altura casi pantalla completa (`92dvh`), scroll único con footer fijo, Nuevo Paciente en una columna, bitácora como bottom-sheet. Archivos: `PatientModalsHTML.js`, `PatientModals.js`, `ComponentManager.js`, `index.css`. **Deploy:** `npm run build` + `firebase deploy --only hosting`.
*   **Fase C: Consentimiento WhatsApp (Opt-In/Opt-Out) y Auditoría — 100% Listo y Desplegado (21 Mayo 2026)**:
    *   **Configuración y Base de Datos:** Campo `recurrentOptIn` (`pending` / `accepted` / `rejected`) en `patientProfiles`. Inicialización automática de nuevos perfiles en `on_patient_created` con `wantsWhatsapp = false` y `recurrentOptIn = 'pending'`.
    *   **Reglas de Consentimiento e Integración Backend/Frontend:**
        *   Excepción automática para pacientes antiguos (con `wantsWhatsapp == true`) para evitar que queden bloqueados por el opt-in inicial.
        *   Al presionar **Bienvenida** en el expediente, se fuerza `wantsWhatsapp = false` y `recurrentOptIn = 'pending'` para iniciar el proceso de consentimiento limpio.
        *   Cuando el webhook recibe "Sí, autorizo", se activa la casilla automáticamente (`wantsWhatsapp = true`, `recurrentOptIn = 'accepted'`). Si responde "No", se desactiva (`wantsWhatsapp = false`, `recurrentOptIn = 'rejected'`) y genera alerta.
        *   Si Yari activa manualmente la casilla en el expediente, los recordatorios automáticos se envían sin restricción de opt-in.
    *   **Semáforo visual:** Integración de badge de estado en la ficha del paciente y punto de color en la lista del sidebar (`Sidebar.js`).
    *   **Soporte Webhook:** `optin_yes` / `optin_no` actualiza base de datos y crea alertas en `reception_alerts` para Yari. Plantilla `bienvenida_con_optin` SID `HX08f74d9b520b85acfbf9e678e434b1f6` en producción.
    *   **Trazabilidad en Bitácora (AuditPanel.js & Cloud Functions):**
        *   Acciones de WhatsApp agrupadas en pestaña propia: `WHATSAPP_REMINDER` (mañana), `WHATSAPP_REMINDER_PM` (tarde/noche), `WHATSAPP_REMINDER_SKIPPED` (omitido), y `WHATSAPP_REMINDER_ERROR` (error).
        *   Visualización del mensaje/error exacto colapsable/desplegable en la bitácora e indicación legible del horario de cita afectada.
*   **Fase A: Recibos Digitales de Reembolso (SGMM) — 100% Listo**:
    *   **Paso 1 (UI + Firestore):** Inputs `professionalLicense` y `graduationInstitution` en Configuración de Terapeutas, y casilla `autoGenerate` + `tutorName` en Pacientes. Todo en gris (disabled) listo para SaaS.
    *   **Paso 2 (Cloud Function PDF):** Función serverless `on_appointment_receipt_trigger` en Python. Genera PDFs premium inyectando datos clínicos dinámicos y los almacena en Firebase Storage ante el pago de citas (`isPaid`). Test local en `venv` completado con 0 errores y desplegado con éxito a Firebase Blaze.
*   **Fase 1 Móvil: Interfaz Web Responsiva Espectacular**: 
    *   Estructura global de barra de navegación inferior (`MobileBottomNav.js`) táctil con Safe Areas.
    *   Modal de Citas (`#eventModal`) convertido en una bottom-sheet deslizable y bloqueador de scroll de fondo.
    *   Modal de Ficha de Pacientes y expediente convertido en bottom-sheets responsivas táctiles.
    *   Búsqueda y barra lateral (Sidebar) rediseñada para celulares.
    *   Acceso administrativo a la **Configuración de Clínica** y **Control Maestro** integrado al menú "Más" en móvil.
    *   **Modo Un Día**: Grid responsivo de 2 columnas, pestañas táctiles e interactivas de Lunes a Sábado, y toggle "Día | Semana" en la barra de herramientas.
*   **Onboarding / Pop-up de Bienvenida (`NewFeatureAlert.js`)**:
    *   Pop-up informativo premium con difuminado de fondo (`backdrop-blur-md`) y cabecera con degradado.
    *   Expiración automática de 3 días (Regla 4) para evitar fatiga en el staff.
    *   Doble opción de descarte: "Cerrar aviso" (temporal) y "¡No volver a mostrar!" (permanente en `localStorage`).
*   **Flujo Completo de Justificantes Médicos (Multimedia)**:
    *   Inyección en la interfaz para que Yari y terapeutas puedan subir comprobantes de inasistencia médica.
    *   Guardado físico del archivo en Firebase Storage y marcado visual del paciente con la insignia esmeralda **"Justificada"** (evitando cobros indebidos).
*   **Batch UX (Antigravity / mayo 2026) — Implementado**:
    *   Logo oficial Parláre (`assets/parlare-logo.png`) en login, header, favicon y `manifest.webmanifest`.
    *   Semáforo WhatsApp en **lista de pacientes** (sidebar) + panel **Seguimiento manual** en Control Maestro (`reception_alerts`).
    *   Control Maestro en móvil como bottom-sheet (`92dvh`).
    *   Onboarding `NewFeatureAlert` v9 (`parlare_onboarding_v9_0`): Modo Día, opt-in, recibos.
    *   Banners «SaaS Ready» (`saasReadyCopy.js`) en Configuración y ficha paciente.
    *   Documentado para Antigravity en `ANALISIS_ESTRATEGIA_MOVIL.md` + manual `HelpManual.js`.
*   **Migración a Templates de Meta**: 
    *   Recordatorios automáticos de 8 AM con botones interactivos (`recordatorio_con_botones2`).
    *   Recordatorios manuales desde el frontend (`copy_info_proxima_cita`).
    *   Notificación de cancelaciones a Yari.
*   **Bitácora y Trazabilidad**: 
    *   Pestaña dedicada de WhatsApp para que Recepción lea los mensajes enviados.
    *   Identificación humana del staff en los historiales.
*   **Fase B: Optimizador de Espacios ("Adelantar Cita") — 100% Listo y Desplegado**:
    *   **Lógica del Trigger de Cancelación:** Cloud Function serverless en Python (`on_appointment_cancelled_trigger`) que monitorea cancelaciones dentro de la ventana de 8-24 horas de la cita.
    *   **Búsqueda Inteligente de Candidatos:** Escanea en Firestore citas activas del mismo día, programadas más tarde con el mismo terapeuta, priorizando de atrás hacia adelante para comprimir la agenda.
    *   **WhatsApp Autopilot:** Envío de oferta interactiva de WhatsApp mediante Twilio Content API a candidatos con `recurrentOptIn: 'accepted'`.
    *   **Auto-Reagendamiento Webhook:** El primero en responder "Sí, adelantar" (payload `offer_yes`) es re-programado automáticamente en Firestore, Google Sheets y Google Calendar. Las demás ofertas competidoras expiran, y se envía una confirmación al paciente y una alerta a Yari.
*   **Optimización del Nuke de Calendario (Forward-only Sync) — 100% Listo y Desplegado**:
    *   Modificado `nukeAndRebuildAll` en `GoogleCalendarService.js`. En lugar de borrar y descargar 1 año de historial, ahora la sincronización limpia estrictamente desde el **lunes de la semana en curso** hacia el futuro (6 meses). Esto evita largos tiempos de recarga y protege de bloqueos 429 de cuota de API de Google.
*   **Bitácora de Auditoría en móvil y Detalle de WhatsApp (19 may)** — Entrada en **Más → Bitácora de Auditoría** (admin/recepción) con modal adaptado a bottom-sheet en celular. Muestra del horario de la cita enviada formateado legiblemente (`appointmentDate`) y bloque colapsable/desplegable interactivo (`💬 Ver mensaje completo`) para leer el mensaje de WhatsApp. Además, se actualizó la Cloud Function scheduler para guardar el mensaje completo real. Archivos: `AuditPanel.js`, `main.py`, `MainModals.js`, `MobileBottomNav.js`.
*   **Hotfix calendario móvil (19 may)** — Columna hora angosta (~75%), vista Semana sin scroll horizontal, línea «ahora» solo sobre días, nombres compactos en semana. Archivos: `CalendarUI.js`, `CalendarEvents.js`, `index.css`, `dateUtils.js`, `index.html`.
*   **Agenda escritorio — rendimiento UX (19 may)** — Ver detalle y reversión en [`ARQUITECTURA_FUTURA.md`](ARQUITECTURA_FUTURA.md):
    *   ✅ **#1 Auto-scroll inteligente:** solo carga inicial y botón **Hoy** (`scrollToWorkHoursOnNextRender`); prev/next semana no mueve scroll.
    *   ✅ **#2 Índice por slot:** `CalendarSlotIndex.js` — una pasada por citas visibles en lugar de `filter()` por celda.
    *   ✅ **#3 Toggle Día \| Semana en desktop (`md+`)** — `#calendarViewToggle` visible en toolbar (`index.html`).
*   **Hotfixes móvil iPhone (25 may)** — (1) Búsqueda de pacientes en iPhone, ahora **a prueba de iOS Safari**: 5 event listeners cruzados (`input`/`search`/`change`/`keyup`/`compositionend`) + polling de respaldo 250 ms cuando el input está enfocado (cubre dictado por voz, paste y QuickType bar). Dedupe por `_lastSearchValue`; forzar update en `blur`. Auto-switch a **Todos** al teclear. Normalización por acentos/mayúsculas. (2) Botón de notificaciones (campana) móvil: el panel quedaba cortado por `overflow-hidden` del header; ahora `position: fixed` en celular. Archivos: `Sidebar.js`, `PatientFilters.js`, `Header.js`.
*   **Manual de Uso y Capacitación (25 may)** — (1) Creación del archivo de capacitación `MANUAL_DE_USO_Y_CAPACITACION.md` en la raíz detallando la regla de oro y los flujos críticos. (2) Integración de un banner destacado sobre la regla de oro ("Lo que no está en la app de Parláre, no existe") en la parte superior del modal interactivo de ayuda de la aplicación (`HelpManual.js`).
*   **UX Unificada Pestañas (25 may)** — Se eliminaron los botones duplicados de "Hoy/Mañana" dentro del panel de Confirmaciones (`WhatsAppDashboard.js`). Ahora el dashboard escucha dinámicamente y se sincroniza con la selección principal del `Sidebar.js`. Interfaz mucho más limpia para las terapeutas.
*   **Hotfix header móvil (25 may, tarde) — duplicado de «Diana» en iPhone** — En la captura del usuario aparecía dos veces «Diana» en el header de celular: una pill «D» a la izquierda del engrane (`#mobileViewingTherapistWrap`) y un dropdown «Diana ▼» a la derecha del candado (el `<select>` desktop `#therapistSelectorContainer` que NO debía verse en móvil). **Bug raíz:** `Header.js:_renderTherapistSelector` hacía `selectorContainer.classList.remove('hidden')` rompiendo el `hidden md:flex` del HTML inicial — el dropdown desktop quedaba visible también en móvil. **Fix:** ya no removemos `hidden` (el `md:flex` lo activa solo en md+). Además ocultamos definitivamente la pill `#mobileViewingTherapistWrap` porque era redundante con el filtro `#calendarTherapistFilterWrap` del toolbar del calendario. Archivo: `js/components/Header.js:307-368`.
*   **Pop-up Novedades v9.2 (25 may, tarde)** — `NewFeatureAlert.js` con `STORAGE_KEY: parlare_onboarding_v9_2`. **Cinco tarjetas** ahora — la nueva (al principio, gradient ámbar→naranja, badge «Nuevo»): **🏖️ Vacaciones / Día Completo — modal premium** (reemplaza el cuadro feo del navegador, rango de fechas, tipo, todo el día/horario, aviso de citas afectadas, permisos Vero/Sam vs Diana/Yari). El resto: (2) Regla de Oro destacada, (3) Búsqueda iPhone, (4) Campana móvil, (5) Pestañas unificadas en Confirmaciones.
    *   **Vigencia 2 días** (`MAX_DAYS_VISIBLE: 2`); después se oculta solo y lo importante vive en `HelpManual.js`.
    *   **Limpieza automática de claves legacy** ampliada a `['v8_0', 'v9_0', 'v9_1']`: los usuarios que ya cerraron v9.1 verán el pop-up de nuevo con la novedad del modal de vacaciones. La clave v9_1 anterior se borra del `localStorage` al arrancar.
*   **Optimización Firestore — Fase 1 (26 may, mañana — Antigravity)** — Migración de consultas globales a ventana temporal de 90 días `[-30, +60]` + filtro por terapeuta en `appointments` y `patientProfiles`. Historial del paciente bajo demanda con `getDocs` filtrado por nombre (en lugar de mantener todo en memoria). Polling de 30 s sobre `copilot_overrides` reemplazando `time.sleep(600)` puro en el backend. Archivos: `PatientManager.js`, `CalendarData.js`, `PatientModals.js`, `PatientActions.js` (import `serverTimestamp`), `space_optimizer.py`.
*   **HelpManual — sub-sección «Sin opt-in» y botones grises del Copiloto (26 may, tarde)** — Daniel detectó que en el modal de Búsqueda Manual del Copiloto algunos candidatos salían con etiqueta «Sin opt-in» y botones en gris, sin explicación. **Fix:** agregada sub-sección dentro de la entrada del Copiloto en `HelpManual.js` (fondo slate-50, ícono ❓): explica qué significa cada etiqueta («Sin opt-in» = sin autorización WhatsApp; «Rechazó WA» = respondió No; «Opt-in OK» = consentimiento dado), por qué los botones 📞 Llamar / 💬 WhatsApp se deshabilitan (solo si el paciente NO tiene teléfono en su ficha), y los 3 pasos para arreglar cada caso (activar casilla manualmente, capturar teléfono válido, o respetar rechazo). Cierre con tip del semáforo verde/amarillo/rojo en sidebar como referencia rápida.
*   **Hotfix HelpManual SyntaxError (26 may, tarde)** — Bug introducido por Cursor el 25 may al agregar el ejemplo de Vacaciones: backticks literales `` ` `` dentro del template literal del HTML del manual rompían el parser («Invalid or unexpected token»). El manual no abría con `Uncaught (in promise) SyntaxError` en `HelpManual.js:448`. **Fix:** reemplazados los backticks por `<code>` HTML semántico con estilo ámbar (visualmente más profesional que el monoespaciado plano). Verificado con `node --check` exit 0 + `npm run build` OK + `ReadLints` sin errores. Detectado por Yari cuando intentó abrir el manual; gracias al user que probó la app a tiempo.
*   **Pop-up Novedades v9.3 (26 may, tarde) — incluye Copiloto Colaborativo** — Detectado hueco: el pop-up v9.2 (25 may) nunca mencionó el Copiloto a Yari, a pesar de que es la principal usuaria del banner (solo Yari/Diana lo ven, las terapeutas no). Riesgo: Yari cancelaba una cita y aparecía banner glassmorphism con contador y 3 botones sin contexto previo. **Fix:** `NewFeatureAlert.js` bumpeado a `parlare_onboarding_v9_3` (legacy v9_2 añadido a limpieza); `launchDate` 2026-05-26; **tarjeta nueva al inicio** (gradient indigo→fuchsia→slate) que explica: cuándo aparece (ventana 8–24 h), contador 8 min, celda brillando con ⚡, los 3 botones (🚀 Automático / ⏸️ Pausar / 🔍 Manual), comportamiento default si Yari no actúa, y nota explícita «las terapeutas no ven este banner para no distraerlas». Link al manual al final de la tarjeta. Vigencia 2 días; después vive solo en `HelpManual.js`.
*   **Pop-up Novedades v9.4 + Manual (28 may)** — `NewFeatureAlert.js` → `parlare_onboarding_v9_4` (vigencia 2 días desde 28 may): tarjeta principal Vacaciones con acciones (bloquear / cancelar sin WA / reasignar + huecos sustituta + Más en móvil); Copiloto resumido; Regla de Oro. `HelpManual.js`: sección Vacaciones reestructurada (cómo abrir, acciones con citas afectadas, ejemplo con 10–20 niños). Legacy v9_3 en limpieza automática.
*   **Vacaciones Fase 2b — sugerencias de huecos sustituta (28 may)** — Al elegir «Pasar a otra terapeuta», panel indigo: cuántas caben a misma hora (verde) + por cada niño sin cupo, horarios libres de la sustituta ese día (8 AM–8 PM, ordenados por cercanía). Al guardar, reasignación automática **solo** donde cabe; el resto queda para coordinación manual. Archivos: `AbsenceModal.js`, `MainModals.js`, `HelpManual.js`.
*   **Híbrido A+B Google Calendar sync (28 may — Cursor)** — `server_calendar_sync` 7 AM MX: **domingo** = nuke suave (borra/recrea semana en los 3 calendarios); **lunes–sábado** = incremental (solo citas sin `googleEventId` o con `updatedAt` últimas 36 h; canceladas recientes borran evento en Google). Logs `mode: nuke|incremental` con contadores. **Deploy:** `firebase deploy --only functions:server_calendar_sync`.
*   **Vacaciones Fase 2a + móvil + cron sync 1×/día (28 may)** — (1) `server_calendar_sync` pasa de `0 7,20` a **`0 7 * * *`** (solo 7 AM MX) para bajar lecturas Firestore — opción A acordada con Daniel. (2) **Móvil:** `MobileBottomNav` → **Más → Vacaciones / Ausencia** para Vero/Sam/Diana/Yari (`AuthManager.canOpenAbsenceModal`); candado 🔒 también en vista semana móvil (compacto). (3) **Citas afectadas:** en `#absenceModal` — *Solo bloquear* · *Cancelar en Parláre* (sin WhatsApp) · *Pasar a otra terapeuta* (misma hora/día; select Diana/Sam/Vero; aviso si la sustituta ya tiene paciente a esa hora). Campos `reassignedFrom` / `reassignedAt` en reasignación. Archivos: `functions/main.py`, `AbsenceModal.js`, `MainModals.js`, `MobileBottomNav.js`, `CalendarUI.js`, `AuthManager.js`, `HelpManual.js`. **Deploy:** `firebase deploy --only functions,hosting`.
*   **Fase C-Lite: Recordatorios 8 AM Optimizados (28 may — Cursor/Antigravity)** — Al crear/editar cita en `appointmentService.js` se guarda `profileId` y `phone` en el doc de `appointment`. Los crons de recordatorios de las 8 AM y 8 PM en `main.py` ahora leen únicamente los perfiles de los pacientes que tienen cita mañana por su `profileId`/nombre, reduciendo drásticamente las lecturas a Firestore al evitar el `stream()` completo de la colección `patientProfiles`.
*   **Hotfix — Resumen diario a Diana/Yari (27 may, mañana)** — Reporte de producción: a Diana le llegó el resumen de confirmados a las **9 PM** (tarde, del día que ya pasó). Causa probable: todavía existe un **cron externo** pegándole al endpoint de Render `/cron/daily-summary` in horario nocturno, aunque ya exista el `daily_summary_cron` oficial en Firebase a las 9 AM. **Mitigación inmediata** (sin depender de paneles externos): `whatsapp_webhook.py:/cron/daily-summary` ahora tiene guardia de seguridad `outside_9am_window` y **no envía nada fuera de la ventana 8:40–9:40 AM México**. Acción recomendada: deshabilitar el cron externo y dejar solo el Scheduler de Firebase.
*   **Optimización Firestore — Fase 3 deploy + Win 1 (26 may, tarde — Antigravity)** — Deploy exitoso en producción:
    *   ✅ `firebase deploy --only firestore:indexes` — los 6 índices compuestos quedaron `Enabled`. Errores `failed-precondition` desaparecieron de la consola del navegador.
    *   ✅ `firebase deploy --only functions:on_appointment_cancelled_trigger` — Google Cloud rechazó `timeout_sec=720` (límite máximo permitido para triggers Firestore = **540 s**). Antigravity ajustó a `timeout_sec=540` y bajó el `total_wait` interno de 10 min a **8 min** (480 s) para mantener margen de 1 min antes de que la función expire.
    *   ✅ **Win 1 implementado** — Unificación del listener duplicado de `appointments`. `CalendarData.subscribe` ahora es **multicast**: el primer suscriptor abre la conexión real y los siguientes (incluido `PatientManager`) reutilizan la misma + reciben el último snapshot cacheado inmediatamente. `PatientManager._setupRealtimeListener` ya no hace `onSnapshot` propio para citas; sólo mantiene el listener filtrado de `patientProfiles`. **Ahorro adicional estimado 30–50 % sobre las lecturas que aún quedaban** tras las Fases 1+2.
    *   ✅ Código sincronizado a `main` en GitHub.
    *   ✅ **Limpieza Hosting Storage** (may 2026 — Daniel): revisado en consola Firebase; cuota Hosting al día.
*   **Hotfix sincronización Copiloto frontend↔backend (26 may, tarde — Cursor)** — Antigravity bajó el delay del backend a 480 s (8 min) pero el frontend seguía con `COPILOT_DELAY_MS = 10 * 60 * 1000`. **Bug crítico de UX**: el contador del banner mostraba 10 min, mientras que el backend procesaba ofertas a los 8 min → si Yari tocaba «Pausar» entre el min 8 y 10, la decisión se perdía silenciosamente (el polling del backend ya había terminado). **Fix:**
    *   `WaitlistCopilotService.js:44` — `COPILOT_DELAY_MS = 8 * 60 * 1000` (alineado con backend) + comentario explicando el contrato.
    *   `WaitlistCopilotPanel.js` — importa `COPILOT_DELAY_MS` y deriva `DELAY_MINUTES = Math.round(COPILOT_DELAY_MS / 60000)`. Las dos referencias hardcodeadas a `10 * 60 * 1000` (cálculo de `pct` y `progress`) ahora usan la constante. El chip «Esperando · 10 min» y el texto «Tienes 10 min para intervenir» ahora interpolan `${DELAY_MINUTES} min`.
    *   `HelpManual.js` — actualizado el bloque del Copiloto (3 menciones de «10 minutos» → «8 minutos»).
    *   Comentarios residuales en `WaitlistCopilotService.js` y `CalendarUI.js` ahora referencian la constante en lugar de un valor fijo.
*   **Optimización Firestore — Fase 2 hotfixes (26 may, mañana — Cursor)** — Validación post-Antigravity y corrección de 4 issues críticos/altos detectados:
    *   🔴 **CRÍTICO — SyntaxError `user` redeclarado** en `PatientManager.js:215` impedía cargar el módulo (`Uncaught SyntaxError: Identifier 'user' has already been declared`). Refactor del método `_setupRealtimeListener` para usar un solo `const user` + `const isSuperUser`. Confirmado con `node --input-type=module`.
    *   🔴 **CRÍTICO — `space_optimizer.py` `timeout_sec=120`** mientras el polling era de hasta 600 s: la Cloud Function moría en 2 min y nunca enviaba ofertas si Yari no actuaba. Subido a `timeout_sec=720`.
    *   🟠 **ALTO — Modal de historial perdía citas antiguas** en cada snapshot live porque `render()` lo recargaba con citas del estado limitado a ventana 90 días. Nuevo `PatientModals._historyCache` con merge inteligente (cache completo + live overrides por `id`) en `getHistoryAppointments()`. Cache se invalida en `closeHistory()`.
    *   🟠 **ALTO — Falta `firestore.indexes.json` versionado**: las queries con filtro `therapist + date`, `isCancelled + date`, `sheetSynced + isPaid + date` fallaban con «index required» para no-admins. Creado el archivo con 6 índices compuestos (`appointments` × 4, `space_offers` × 2) y enlazado en `firebase.json`.
    *   🟡 **Bonus — Unsubscribe en listeners** (`_unsubscribeApts`, `_unsubscribeProfiles`, `_teardownListeners()`). Evita memory leak en re-login.
    *   🟡 **Bonus — `_rawProfiles` separado** del array `patients` enriquecido en `_processData`. Sin contaminación cruzada entre snapshots.
    *   🟢 **Reducción adicional de lecturas:** filtros de fecha en dos listeners gigantescos sin filtro:
        *   `WaitlistCopilotService` ahora filtra `date >= today` (antes leía TODAS las cancelaciones históricas; ahorro estimado 500–2 k reads/sesión).
        *   `Header.batchSync` ahora filtra `date >= today - 30d` (antes leía toda la historia de citas pagadas sin sync).
    *   **Impacto esperado**: el dashboard mostraba **58.4 % cuota lecturas diarias** (29 k de 50 k); con todos los cambios desplegados debería bajar a **30–40 % (15-20 k/día)**.
*   **Mejora premium del modal Ausencia/Vacaciones (25 may, noche) — Fase 1.5** — Iteración visual y de usabilidad sobre el modal #absenceModal. **Cambios visuales:** (1) **Header con icono 🔒 en gradient ámbar→naranja** y subtítulo explicativo. (2) **Tipos de ausencia → cards verticales premium** (icono grande + texto, grid `grid-cols-3 sm:grid-cols-5`, estado `has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50` con sombra suave; ya no hay radio button visible). (3) **Toggle "Todo el día" como pill** con icono 🕒, color azul cuando activo. (4) **Botón Confirmar** con gradient `from-blue-600 to-indigo-600`, sombra azul `shadow-blue-500/25`, icono candado SVG y `active:scale-[0.98]`. **Funcionalidad nueva:** (5) **Atajos rápidos**: chips «Hoy / Esta semana / Próxima semana / 2 semanas» que rellenan fechas y activan «Todo el día» automáticamente para rangos largos. (6) **Tarjeta de resumen indigo** (`#absenceSummaryCard`) — calcula días hábiles excluyendo domingos y muestra: `🏖️ Vacaciones · **Sam** · lun 25 → sáb 30 · 6 días hábiles · Todo el día`. (7) **Mensaje verde tranquilizador** (`#absenceNoConflictsCard`) — «Sin citas afectadas en este rango.» cuando no hay choques pero el rango es válido. (8) **Validación visual de hora en tiempo real** — si `endHour ≤ startHour`, los selects se marcan con `border-red-400 ring-2 ring-red-100` antes de guardar (sin alertas). **Móvil:** placeholder más natural en notas, footer con `shadow-[0_-8px_24px_rgba(0,0,0,0.05)]`, mejor jerarquía táctil (`min-h-[64px]` para cards de tipo, `min-h-[48px]` para toggle). Archivos: `js/components/MainModals.js` (HTML), `js/modules/calendar/AbsenceModal.js` (lógica `_applyQuickRange`, `_updateSummary`, `_validateHourRange`, refactor `bindEvents` → `refresh()`), `dist/output.css` (recompilado).
*   **Panel de Administración Costos Base (Previo)** — Interfaz implementada en `AdminSettingsModal.js` y `adminSettings.js` para que el administrador actualice los porcentajes de clínica/comisiones y montos fijos directamente en Firestore, sin tocar el código fuente Javascript. (Documentado y olvidado de pendientes).
*   **Corrección de Bugs Críticos**:
    *   Guardia contra duplicados (evitando sobrecarga a Google Calendar / 429 Quota Exceeded).
    *   Ajuste de zona horaria (Drift UTC) en métricas y envíos diarios.
    *   Respuestas humanas automatizadas ("¡De nada!").

---

## 💡 Propuestas opcionales — Frontend / UX (sin compromiso)

> Revisión mayo 2026. Las marcadas ✅ se implementaron en sesión 18 may; el resto es opcional.

### Marca e identidad visual
- [x] **Logo + favicon + PWA** — `assets/parlare-logo.png`, login, header, `manifest.webmanifest`.
- [ ] **Favicon + icono de app** (tamaños 192/512 dedicados para tiendas): Hoy el login y header usan texto «Parláre» con gradiente; no hay `favicon.ico` ni `apple-touch-icon`. Mejoraría pestaña del navegador y preparación para Capacitor.

### Consistencia de modales (móvil)
- [x] **Control Maestro** como bottom-sheet (`92dvh`, pull-handle).
- [ ] **Reportes / Corte de caja / Configuración**: auditar que todos sigan el patrón `items-end`, pull-handle y `92dvh` donde aplique.
- [ ] Clase utilitaria única `.modal-sheet-mobile` ya existe en `index.css`; extender su uso y reducir HTML duplicado.

### Visibilidad de funciones ya implementadas
- [x] **Semáforo WhatsApp** en sidebar + ficha.
- [x] **Panel `reception_alerts`** en Control Maestro.
- [x] **`NewFeatureAlert` v9** (Modo Día, opt-in, recibos).

### Campos «SaaS Ready» (cuando decidan activarlos)
- [x] Banner explicativo en Configuración y recibos (`saasReadyCopy.js`).
- [ ] Recibos de reembolso: cuando activen `autoGenerate` y PDF, enlace «Ver recibo» en citas pagadas usando `receiptPdfUrl`.

### Lista de pacientes y agenda
- [ ] **Estados vacíos** más claros (ilustración ligera + CTA «Agregar paciente» / «Ir a hoy»).
- [ ] **Skeleton loaders** en sidebar y grid al cargar Firestore (ya existe `LoaderService.js`; uso irregular).
- [ ] Modo **Semana** en desktop: revisar densidad de chips y contraste de citas pagadas vs pendientes (accesibilidad de color).

### Agenda escritorio — roadmap acordado

> **Documento maestro (prioridades, registro de cambios, cómo revertir):** [`ARQUITECTURA_FUTURA.md`](ARQUITECTURA_FUTURA.md)  
> Histórico refactor nov 2025: [`old/ARQUITECTURA_FUTURA.md`](old/ARQUITECTURA_FUTURA.md)

| Prioridad | Ítems | Estado |
|-----------|--------|--------|
| **Alta** | Auto-scroll, índice slot, toggle Día desktop | 1–3 ✅ |
| **Media** | Tooltips TODAS, query semana Firestore, grid CSS fijo, debounce snapshot, quitar pulse status, dividir `renderCalendar` | ⏳ cola |
| **Premium** | Tokens Parláre + atajos teclado (← → semana, **H**) | 💎 después |

### Deuda técnica menor (frontend)
- [x] Comentarios aclarados: lista de pacientes = `Sidebar.js` (no `PatientUI.js`).
- [ ] Centralizar tokens de color Parláre en `tailwind.config.js` (hoy hay mezcla de `blue-600`, `indigo-600` y variables CSS) — ver **Premium** en `ARQUITECTURA_FUTURA.md`.

### Accesibilidad y detalle premium
- [ ] Revisión rápida de **focus trap** y cierre con Escape en modales grandes.
- [ ] Reducir animaciones `animate-ping` del badge WhatsApp en listas largas (rendimiento en celulares viejos).

### Priorización sugerida (para debatir)
| Si quieren… | Empezar por… |
|-------------|----------------|
| Impacto inmediato para Yari | ✅ Hecho — validar en producción tras deploy |
| Sensación «app premium» | Empty states, skeleton loaders; iconos 192/512 para tiendas |
| Coherencia móvil | Auditoría Reportes / Corte como bottom-sheet |
| Antes de Capacitor | Iconos tienda + prueba Capacitor en emulador Android |

---

## 💎 Prioridad 1: Transformación a App Móvil Nativa (Capacitor)
**Objetivo**: Convertir la SPA responsiva en aplicaciones instalables para Android e iOS en las tiendas.

*   **Fase 1: Preparación Base (Completada en la Web)**: Toda la interfaz responsiva y táctil móvil está lista y desplegada.
*   **Fase 2: Pruebas de Concepto**: Abrir la app localmente en un emulador de Android Studio para verificar que Firebase, logins y UI funcionen en un WebView nativo de Capacitor.
*   **Fase 3: Diseño y Branding**: Generar Iconos de App y pantallas de carga (Splash Screens) premium.
*   **Fase 4: Configuración de Actualizaciones Instantáneas (OTA)**: Integrar sistema de updates en vivo para no pasar por revisión de tiendas en cambios menores de UI.
*   **Fase 5: Despliegue en Tiendas**: Compilación final de instalables (`.aab` y `.ipa`) y subida a Google Play Console y Apple App Store Connect.

---

## 🛠️ Prioridad 2: Finanzas y Sincronización Google Calendar
*   **Dashboard de Control de Finanzas**: Validar que la nueva separación de comisiones (Clínica vs. Terapeuta) arroje los totales correctos a fin de quincena.

---

## 🚀 Copiloto Colaborativo — Frontend listo (25 may)

**Frontend completado** del «Copiloto Colaborativo» (Fase B / Waitlist Autopilot). El backend tiene polling de 30 s sobre `copilot_overrides` durante 8 min (`total_wait=480` en `functions/space_optimizer.py`, `timeout_sec=540` por límite Cloud Functions) y la regla de proximidad de 2 h. Lo que se construyó:

### Archivos nuevos
- **`js/services/WaitlistCopilotService.js`** — Listener Firestore: detecta cancelaciones en ventana 8–24 h cuyo `cancelledAt` esté dentro de los últimos 10 min. Tick interno de 1 s para contador regresivo. Métodos: `skipDelay`, `pauseAutopilot`, `markManualSearch`, `getCandidates`, `getGlowingAppointmentIds`. Escribe en colección **`copilot_overrides/{appointmentId}`** con `action ∈ { 'skip_delay', 'pause', 'manual_search' }`.
- **`js/components/WaitlistCopilotPanel.js`** — Banner flotante premium (glassmorphism, gradiente slate→indigo→fuchsia, backdrop-blur-xl). Contador regresivo en mono tabular grande + barra de progreso animada (emerald→amber→rose). 3 botones: **🚀 Automático** (gradiente esmeralda con shadow elevado), **⏸️ Pausar** (blanco translúcido), **🔍 Manual** (índigo translúcido). Modal de candidatos con WhatsApp + tel pre-llenados.
- **Glow CSS en `index.css`** — `.calendar-slot-glow` con `@keyframes copilotSlotGlow` (alterna inset 2 px ámbar ↔ esmeralda + box-shadow exterior radiante). Icono ⚡ en la esquina superior derecha del chip.

### Contrato backend (✅ cerrado 26 may por Antigravity)
- En cada ciclo de polling (30 s) durante los 8 min de delay, leer `copilot_overrides/{appointmentId}`:
  - `skip_delay` → ejecutar `process_autopilot_candidates` inmediatamente (rompe el polling).
  - `pause` → abortar; no enviar ofertas.
  - `manual_search` → solo trazabilidad, seguir flujo normal.
- Además se valida en cada ciclo que la cita siga existiendo y siga marcada como `isCancelled == true`; si fue retomada, se aborta.

### Re-render eficiente
- Tick del contador NO re-genera HTML: usa nodos `data-bind="countdown"`/`"progress"` y solo cambia textContent + width.
- Agenda solo se re-renderiza cuando cambia el **conjunto** de IDs en delay (no cada segundo).

### Validación pendiente (en producción)
- [x] **Backend: lectura de `copilot_overrides` antes/durante el delay** — ✅ Antigravity 26 may (polling de 30 s sobre overrides + estado de la cita; respeta `skip_delay` / `pause`; aborta si la cita es des-cancelada). Delay total acortado a 8 min por límite Cloud Functions.
- [ ] **Validación física con cita real en ventana 8–24 h** (todo el flujo Copiloto ya está en producción tras el deploy del 26 may, falta probarlo en vivo):
  - Aparece banner flotante con contador **8 min** en sup-der.
  - La celda cancelada en la agenda brilla con animación ámbar↔esmeralda.
  - **🚀 Automático** escribe `copilot_overrides/...action=skip_delay` y el backend lo procesa en < 30 s.
  - **⏸️ Pausar** escribe `action=pause` y el backend aborta el envío.
  - **🔍 Manual** abre modal con candidatos (mismo día, > 2 h, mismo terapeuta) + botones WhatsApp/Llamar.
  - Si no haces nada en 8 min → ofertas se envían automáticamente.

## ⏳ Roadmap futuro (siguiente fase)

**Bloque Copiloto:**
- [x] **Cerrar contrato backend Copiloto** — ✅ Antigravity 26 may: `space_optimizer.py` ahora hace polling de 30 s sobre `copilot_overrides/{id}` durante 8 min (480 s, ajustado por límite de 540 s de Cloud Functions). Respeta `skip_delay`, `pause` y aborta si la cita es des-cancelada. **Cursor 26 may tarde:** propagó `COPILOT_DELAY_MS = 8 * 60 * 1000` al frontend y unificó el copy del banner / HelpManual («8 min») para evitar bug de UI mintiendo a Yari.
- [ ] **Confirmación Colaborativa (Yari 🆚 Terapeuta):** WhatsApp de aprobación a la terapeuta + alerta web a Yari, temporizador 1 h, primero en confirmar lanza ofertas. (Capa adicional sobre el contrato anterior.)
- [x] **Quiet Hours + Copiloto (28 may):** UI tarjeta morada en `WaitlistCopilotPanel` + `QuietHoursCopilotService`; cron 8 AM libera `pending`; **Pausar** omite cron; **Liberar ya** vía `status: release_now` + trigger Firestore. Deploy: `firestore:rules`, `functions`, `hosting`.

**Bloque Inhabilitar día / Vacaciones / Notificación a tutores (Fase 1 ✅ Antigravity 25 may, fases 2 y 3 pendientes — ver `ANALISIS_ESTRATEGIA_MOVIL.md` → «🔎 Análisis técnico — Inhabilitar día/hora y Vacaciones»):**

- [x] **Fase 1 — Modal premium «Crear ausencia» (Antigravity, 25 may)**: reemplazado `prompt()` nativo por `#absenceModal` premium (bottom-sheet móvil, `max-w-lg` desktop, `z-9500`). Incluye:
    - **Tipo de ausencia** (radio): 🏖️ Vacaciones / 🏥 Médica / 📚 Capacitación / 👤 Personal / 🚫 Otro.
    - **Rango de fechas** con `<input type="date">` (start + end) + checkbox «Todo el día» que oculta los selectores horarios.
    - **Rango horario** 8 AM–9 PM con selectores `<select>` y hora fin por defecto +1 sobre la inicio.
    - **Detección de conflictos en tiempo real** (`AbsenceModal.checkConflicts`): escanea `CalendarState.appointments`, descarta cancelaciones y bloqueos previos, filtra por terapeuta + rango. Muestra tarjeta ámbar con lista de niños afectados (`name + díaCorto + hora`). Antes de guardar, `ModalService.confirm` lista hasta 3 nombres + «N más».
    - **Permisos de auto-gestión** (`AuthManager.canManageBlockFor`): admin/recepción → todo; terapeuta → solo su agenda. Si el rol es terapeuta el select queda `disabled`.
    - **Bug fix `isSchoolVisit: false`** explícito en `AbsenceModal.js:289,304` para que bloqueos nuevos NO contaminen reportes de visitas escolares.
    - **Apertura desde el botón 🔒** del header de cada día (`CalendarUI.js:168` con `import()` dinámico de `AbsenceModal.js`).
    - Domingos excluidos automáticamente del rango (cierra `currentDay.getDay() !== 0`); muestra toast si no quedaron días hábiles.
    - **Completado (Hotfixes de seguridad y robustez):**
        - **S-011 🚨 XSS** en lista de conflictos: mitigado aplicando `escapeHTML` en `AbsenceModal.js`.
        - **S-012 ⚠️ Escrituras Firestore en serie**: migrado a `writeBatch` (lote atómico) para bloqueos múltiples.
        - **S-013 🟡 Sin validación `endHour > startHour`**: agregado guard de validación horaria en `save()`.
        - **S-014 🟡 Sin detección de duplicados**: implementado chequeo proactivo en memoria antes de guardar.
- [x] **Optimización crítica de lecturas Firestore (Prioridad 1)** — ✅ **3 fases completadas el 26 may**:
    *   Fase 1 (Antigravity, mañana): ventana `[-30, +60]` días en `CalendarData.subscribe` y `PatientManager`, filtro por terapeuta para no-admins, historial bajo demanda con `getDocs(query(... where name == X))`, polling 30 s en `space_optimizer.py`.
    *   Fase 2 hotfixes (Cursor, mañana): arreglado SyntaxError fatal del PatientManager, `timeout_sec=540`, cache historial con merge live, `firestore.indexes.json` con 6 índices, unsubscribe en listeners, filtros de fecha en `WaitlistCopilotService` y `Header.batchSync`.
    *   Fase 3 deploy + Win 1 (Antigravity, tarde): índices `Enabled` en producción, function redeployada, **`CalendarData.subscribe` multicast** (PatientManager ya no abre listener propio para `appointments`; reusa el de calendar). Total: 29 k → **8–12 k lecturas/día estimadas** una vez propagado.
- [ ] **Fase 2 — Notificación WhatsApp al tutor**: nuevo template Twilio + Cloud Function que escanea citas en el rango y manda mensaje con opciones (A) reagendar misma semana, (B) próxima semana, (C) por WhatsApp manual. Pacientes sin opt-in → alerta en Control Maestro para llamada.
- [ ] **Fase 3 — Modelo de datos limpio (`availability_blocks/`)**: migrar `isFullDayBlock`/`isHourlyBlock` a colección dedicada con metadata (motivo, substituteTherapist, affectedAppointments snapshot, notificationStatus). Vista consolidada «Próximas ausencias del equipo» en Control Maestro. Refactor mayor, documentar en `ARQUITECTURA_FUTURA.md`.
- [ ] **Bug colateral conocido (sin resolver aún)**: `GoogleCalendarService.js:263` sube bloqueos de hora como recurrentes 24 semanas en Google Calendar pero en Firestore son docs únicos. Borrarlos en la app deja recurrencia huérfana en Google Calendar. A resolver con Fase 3. **Atención:** con el modal nuevo es más fácil generar muchos bloqueos por hora → si Diana se va 2 semanas con bloqueo horario, hoy se crean 120 docs en Firestore y **cada uno** se vuelve weekly por 24 semanas en Google Calendar → ruido masivo. Mientras Fase 3 llega, recomendar a Yari preferir «Todo el día» para vacaciones largas.

**Bloque Seguridad (auditoría 25 may, ver [`SEGURIDAD_Y_VULNERABILIDADES.md`](SEGURIDAD_Y_VULNERABILIDADES.md)):**

> Primera auditoría completa hecha el 25 may. 1 crítico, 4 altos, 3 medios, 2 mejoras. Resumen ejecutivo y bitácora viven en `SEGURIDAD_Y_VULNERABILIDADES.md`. Cada vez que se toque auth/reglas/secretos/sanitización, actualizar ahí.

- [x] **S-001 🚨 XSS en chips de la agenda**: nombres de paciente interpolados sin escape en `CalendarUI.js:348-372`. Centralizado `escapeHTML` en `js/utils/sanitize.js` y aplicado en TODAS las interpolaciones de datos de usuario.
- [x] **S-011 🚨 XSS en lista de citas en conflicto** (nuevo 25 may post-Antigravity): `AbsenceModal.js:208` interpola `appt.name` en `innerHTML`. Arreglado con el helper `escapeHTML`.
- [x] **S-012 ⚠️ Escrituras Firestore en serie sin batch** (`AbsenceModal.save()`): migrado a `writeBatch(db)` para atomicidad y reducir latencia.
- [x] **S-013 🟡 Sin validación `endHour > startHour`** en `AbsenceModal.save()`: añadido guard + mensaje claro.
- [x] **S-014 🟡 Sin detección de bloqueos duplicados**: query previo + confirm si ya existen.
- [x] **S-015 ⚠️ Regresión XSS en `ModalService.confirm/alert`** (25 may, sweep extendido): `innerHTML` con `patient.name` sin escapar en 7 callers. Cerrado con `escapeHTML` en `AbsenceModal`, `ReceptionControl`, `PatientActions`, `patientService`.
- [x] **S-016 ⚠️ XSS en listas dinámicas con nombre de paciente** (25 may): `Sidebar`, `ReceptionControl`, `PatientModals`, `CorteDeCaja` y atributos `data-name`. Cerrado con `escapeHTML` centralizado.
- [x] **S-003 ⚠️ Storage Rules versionadas** (25 may, Antigravity): archivo `storage.rules` creado + enlazado en `firebase.json`. Restringe acceso a `justificantes/` a autenticados y deniega lo demás.
- [x] **S-004 ⚠️ Headers HTTP de seguridad** (25 may, Antigravity, desplegado): CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy strict, HSTS por 1 año.
- [x] **Q-001 a Q-006** (26 may, Cursor — ver `SEGURIDAD_Y_VULNERABILIDADES.md`): SyntaxError fatal PatientManager, timeout Cloud Function, índices versionados, cache historial, listeners sin unsubscribe, listeners gigantes sin filtro de fecha.
- [ ] **S-002 ⚠️ Lectura cruzada `appointments`**: cualquier terapeuta autenticada puede leer nombres+costos+teléfonos de pacientes de otra terapeuta vía consola del navegador. Plan: dividir en `slots` público + `appointment_details` privado, o migrar a custom claims (S-005).
- [ ] **S-005 ⚠️ Whitelist de emails hardcoded en reglas**: migrar a custom claims de Firebase Auth para que cambios de email no requieran redeploy.
- [ ] **S-006/007/008 🟡 Medios**: rate-limit en `copilot_overrides`, suprimir `console.log` con datos sensibles en prod, custom claims (parte de S-005).
- [ ] **S-009/010 💡 Mejoras**: bitácora de seguridad central, auditar dependencias npm/pip mensualmente.

**Bloque mantenimiento general:**
- [ ] **Factorización del Backend (`FACTORING_PLAN.md`):** Seguir paso a paso el plan detallado. Actualizar con cada cambio si aún no se ha ejecutado la factorización completa.
- [ ] **Calidad y Optimización:** Revisar calidad de código, optimizar flujos lógicos y depurar posibles errores de código (debugging).
- [ ] **Recibos end-to-end:** Cita pagada o reembolsable → verificar `receiptPdfUrl` + PDF en Storage.
- [x] **Índices Firestore** — ✅ 26 may (Antigravity deploy): `firestore.indexes.json` con 6 índices compuestos en `appointments` (4) + `space_offers` (2). Todos `Enabled` en producción.
- [x] **Limpieza Hosting Storage** (may 2026 — Daniel): revisado en consola; cuota al día.
- [x] **Copiloto banner 8 min** (may 2026 — Daniel): validado en producción (contador alineado con backend).
- [x] **Redeploy functions (30 may — Antigravity):** `trigger_utils`, `secrets_config.py`, `release_quiet_hours_offers`, `on_quiet_hours_pending_written`, secrets en Copiloto. Error Reporting: revisar mañana si dejan de subir casos.
- [x] **Lecturas login admin (28–30 may):** cache perfiles 1×/sesión, Copiloto sin 2.º listener, notif `limit(80)`, `AppLifecycle` logout. Validado Daniel: ~**+200 reads/F5**, ~985 citas + 126 perfiles en consola; `agenda: all`.
- [x] **Auth admin vista Todas (30 may):** `AUTHORIZED_USERS` gana sobre `users/{uid}`; dedupe `initUser`/Header.

## 💡 Sugerencias (opcional — próximas sesiones)

**UX premium:**
- Enlace «Ver recibo» en citas pagadas (`receiptPdfUrl`).
- Iconos PWA 192/512 + splash Capacitor.
- Empty states y skeleton loaders en sidebar y agenda.
- Bottom-sheet móvil en Reportes / Corte de caja (patrón `92dvh` + pull-handle).
- Tokens de color Parláre en `tailwind.config.js` (teal/magenta del logo).

**Copiloto Colaborativo — mejoras visuales:**
- Notificación de escritorio (Notification API) cuando aparezca un nuevo banner.
- Sonido suave opcional al disparar el Copiloto (toggle en Configuración).
- Vista resumida en Control Maestro con el historial del día (`copilot_overrides` resuelto).
- Permitir a Yari reasignar manualmente un candidato del modal sin esperar WhatsApp (drag al slot libre).

**Roadmap mayor:**
- Capacitor POC Android; después retirar Render.

Detalle ampliado: `ANALISIS_ESTRATEGIA_MOVIL.md` → **Falta + Sugerencias**.

---

## 💡 Propuesta documentada — Cola prioridad (pacientes especiales)

> **No es prioridad de sprint actual** — spec lista para cuando dirección/Yari la pidan. Los asistentes IA deben **sugerirla** cuando hablemos de huecos libres, Copiloto o «deben cita».

| Qué | Dónde |
|-----|--------|
| **Documento maestro** (reglas, fases, boceto código, checklist) | [`PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md`](PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md) |
| **Resumen reglas** | Paciente **especial** que debe **1..N sesiones**; cola solo **semana en curso**; **cualquier día** lun–vie si hora cae en **±3 h** del horario referencia; **sin sábado**; misma **terapeuta**; Yari confirma WhatsApp |
| **Fase mínima viable** | A: marcar cola + filtro Control Maestro → B: panel Copiloto → C: backend match |

- [x] **Decisión dirección (28 may)** — ±3 h; cualquier día de la semana en curso (no mismo weekday obligatorio)
- [x] **UX cancelación mismo día (Fase A0)** — opcional «¿debe sesión?»; si marca → «¿fuera del horario habitual?» (**siempre +1**); reagendar y **guardar** → no sumar; ver §2.1 doc maestro
- [x] **Regla Oro 9** — backup en `_backups/` + `git status` antes de tocar código (`.cursor/rules/backup-y-git-antes-de-cambios.mdc`)
- [x] **Fase A0 + A (frontend)** — 2 jun 2026: `SchedulingQueueService`, cancelar hoy «debe sesión», expediente (cola), filtro Control Maestro «Deben sesión», L-1 glow Copiloto
- [ ] **Fase B** — panel Copiloto + backend `process_scheduling_queue_candidates` (ver checklist doc maestro)

---
*Última actualización: 2 de Junio, 2026 — Cola prioridad Fase A0+A en frontend. Heredado 28–30 may: Quiet Hours, lecturas, deploy functions.*
