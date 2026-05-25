# 🚀 Plan de Trabajo - Actualizado (25 Mayo 2026)

Este documento detalla el estado actual del sistema Parláre, registrando los extraordinarios avances en la interfaz responsiva, justificantes médicos y el **Copiloto Colaborativo** (frontend listo el 25 may), y definiendo las prioridades del backend en Firebase Blaze y la preparación SaaS.

---

## ✅ Completado Recientemente (¡Listo!)

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
*   **Pop-up Novedades v9.2 (25 may, tarde)** — `NewFeatureAlert.js` con `STORAGE_KEY: parlare_onboarding_v9_2`. **Cinco tarjetas** ahora — la nueva (al principio, gradient ámbar→naranja, badge «Nuevo»): **🏖️ Vacaciones / Día Completo — modal premium** (reemplaza el cuadro feo del navegador, rango de fechas, tipo, todo el día/horario, aviso de citas afectadas, permisos Vero/Sam vs Diana/Yari). El resto: (2) Regla de Oro destacada, (3) Búsqueda iPhone, (4) Campana móvil, (5) Pestañas unificadas en Confirmaciones.
    *   **Vigencia 2 días** (`MAX_DAYS_VISIBLE: 2`); después se oculta solo y lo importante vive en `HelpManual.js`.
    *   **Limpieza automática de claves legacy** ampliada a `['v8_0', 'v9_0', 'v9_1']`: los usuarios que ya cerraron v9.1 verán el pop-up de nuevo con la novedad del modal de vacaciones. La clave v9_1 anterior se borra del `localStorage` al arrancar.
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

**Frontend completado** del «Copiloto Colaborativo» (Fase B / Waitlist Autopilot). El backend ya tiene el delay de 10 min (`time.sleep(600)` en `functions/space_optimizer.py`) y la regla de proximidad de 2 h. Lo que se construyó hoy:

### Archivos nuevos
- **`js/services/WaitlistCopilotService.js`** — Listener Firestore: detecta cancelaciones en ventana 8–24 h cuyo `cancelledAt` esté dentro de los últimos 10 min. Tick interno de 1 s para contador regresivo. Métodos: `skipDelay`, `pauseAutopilot`, `markManualSearch`, `getCandidates`, `getGlowingAppointmentIds`. Escribe en colección **`copilot_overrides/{appointmentId}`** con `action ∈ { 'skip_delay', 'pause', 'manual_search' }`.
- **`js/components/WaitlistCopilotPanel.js`** — Banner flotante premium (glassmorphism, gradiente slate→indigo→fuchsia, backdrop-blur-xl). Contador regresivo en mono tabular grande + barra de progreso animada (emerald→amber→rose). 3 botones: **🚀 Automático** (gradiente esmeralda con shadow elevado), **⏸️ Pausar** (blanco translúcido), **🔍 Manual** (índigo translúcido). Modal de candidatos con WhatsApp + tel pre-llenados.
- **Glow CSS en `index.css`** — `.calendar-slot-glow` con `@keyframes copilotSlotGlow` (alterna inset 2 px ámbar ↔ esmeralda + box-shadow exterior radiante). Icono ⚡ en la esquina superior derecha del chip.

### Contrato backend pendiente (próximo sprint)
- Antes del `time.sleep(600)` y al despertar, leer `copilot_overrides/{appointmentId}`:
  - `skip_delay` → ejecutar `process_autopilot_candidates` inmediatamente.
  - `pause` → abortar; no enviar ofertas.
  - `manual_search` → solo trazabilidad, seguir flujo normal.

### Re-render eficiente
- Tick del contador NO re-genera HTML: usa nodos `data-bind="countdown"`/`"progress"` y solo cambia textContent + width.
- Agenda solo se re-renderiza cuando cambia el **conjunto** de IDs en delay (no cada segundo).

### Validación pendiente (en producción)
- [ ] Cancelar una cita real en ventana 8–24 h y validar:
  - Aparece banner flotante con contador en sup-der.
  - La celda cancelada en la agenda brilla con animación ámbar↔esmeralda.
  - **🚀 Automático** escribe `copilot_overrides/...action=skip_delay` (verificar en Firestore).
  - **⏸️ Pausar** escribe `action=pause` y el banner desaparece en 4 s.
  - **🔍 Manual** abre modal con candidatos (mismo día, > 2 h, mismo terapeuta) + botones WhatsApp/Llamar.
- [ ] Backend: implementar lectura de `copilot_overrides` antes/durante el delay.

## ⏳ Roadmap futuro (siguiente fase)

**Bloque Copiloto (siguiente sprint backend):**
- [ ] **Cerrar contrato backend Copiloto:** En `functions/space_optimizer.py`, reemplazar `time.sleep(600)` por polling cada 30 s leyendo `copilot_overrides/{appointmentId}`. Respetar `skip_delay` (procesar candidatos ya) y `pause` (abortar). Mientras tanto, la UI ya queda lista y registra las decisiones.
- [ ] **Confirmación Colaborativa (Yari 🆚 Terapeuta):** WhatsApp de aprobación a la terapeuta + alerta web a Yari, temporizador 1 h, primero en confirmar lanza ofertas. (Capa adicional sobre el contrato anterior.)
- [ ] **Quiet Hours + Copiloto:** Decidir flujo cuando la cancelación cae fuera de 07:00–22:00 MX (actualmente backend guarda en `quiet_hours_pending` pero frontend no la muestra). Procesar al amanecer automáticamente o aprobación manual de Yari.

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
- [ ] **S-002 ⚠️ Lectura cruzada `appointments`**: cualquier terapeuta autenticada puede leer nombres+costos+teléfonos de pacientes de otra terapeuta vía consola del navegador. Plan: dividir en `slots` público + `appointment_details` privado, o migrar a custom claims (S-005).
- [ ] **S-003 ⚠️ Falta `storage.rules`**: Firebase Storage (recibos médicos PDF) puede estar con reglas default permisivas. Auditar y agregar archivo al repo + `firebase.json`.
- [ ] **S-004 ⚠️ Headers HTTP de seguridad ausentes**: añadir CSP, X-Frame-Options, Referrer-Policy y X-Content-Type-Options en `firebase.json`.
- [ ] **S-005 ⚠️ Whitelist de emails hardcoded en reglas**: migrar a custom claims de Firebase Auth para que cambios de email no requieran redeploy.
- [ ] **S-006/007/008 🟡 Medios**: rate-limit en copilot_overrides, suprimir `console.log` con datos sensibles en prod, custom claims (parte de S-005).
- [ ] **S-009/010 💡 Mejoras**: bitácora de seguridad central, auditar dependencias npm/pip mensualmente.

**Bloque mantenimiento general:**
- [ ] **Factorización del Backend (`FACTORING_PLAN.md`):** Seguir paso a paso el plan detallado. Actualizar con cada cambio si aún no se ha ejecutado la factorización completa.
- [ ] **Calidad y Optimización:** Revisar calidad de código, optimizar flujos lógicos y depurar posibles errores de código (debugging).
- [ ] **Recibos end-to-end:** Cita pagada o reembolsable → verificar `receiptPdfUrl` + PDF en Storage.
- [ ] **Índices Firestore** si los listeners arrojan error en consola: `reception_alerts` (`status` + `createdAt`) y `appointments` (`therapist` + `date`, para query de candidatos del Copiloto).

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
*Última actualización: 25 de Mayo, 2026 (tarde, post-sweep) — Fase 1 Ausencias completa con hotfixes S-011 a S-014 cerrados (XSS lista de conflictos, `writeBatch`, validación horaria, dedup), **sweep XSS extendido S-015 y S-016 cerrados** (`escapeHTML` en `ModalService.confirm/alert` callers + listas de pacientes en `Sidebar`, `ReceptionControl`, `PatientModals`, `CorteDeCaja`), **safe-area iPhone** en `#absenceModalFooter`, **Pop-up Novedades v9.2** con tarjeta nueva «Vacaciones / Día Completo — modal premium» (legacy v9_1 limpiada), Frontend Copiloto Colaborativo intacto. Estado seguridad: 0 críticos, 4 altos, 3 medios, 2 mejoras, 15 reforzados.*
