# 🚀 Plan de Trabajo - Actualizado (18 Mayo 2026)

Este documento detalla el estado actual del sistema Parláre, registrando los extraordinarios avances en la interfaz responsiva y justificantes médicos, y definiendo las prioridades del backend en Firebase Blaze y la preparación SaaS.

---

## ✅ Completado Recientemente (¡Listo!)

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
*   **Fase C: Consentimiento WhatsApp (Opt-In/Opt-Out) — Código listo, Meta en revisión**:
    *   Campo `recurrentOptIn` (`pending` / `accepted` / `rejected`) en `patientProfiles`.
    *   Semáforo visual en ficha del paciente (badge táctil).
    *   Plantilla **`bienvenida_con_optin`** SID `HX08f74d9b520b85acfbf9e678e434b1f6` en backend y frontend.
    *   Webhook: `optin_yes` / `optin_no` → Firestore + alertas `reception_alerts` para Yari.
    *   Crons de recordatorio solo si `recurrentOptIn === 'accepted'`.
    *   **Pendiente:** aprobación Meta + `firebase deploy` de functions y hosting.
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

### Deuda técnica menor (frontend)
- [x] Comentarios aclarados: lista de pacientes = `Sidebar.js` (no `PatientUI.js`).
- [ ] Centralizar tokens de color Parláre en `tailwind.config.js` (hoy hay mezcla de `blue-600`, `indigo-600` y variables CSS).

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

## ⏳ Falta y Siguientes Pasos (Waitlist Copilot - ¡Nuevo Diseño!)

Actualmente, **el Autopilot de Adelantos está temporalmente pausado en producción (en `functions/space_optimizer.py`)** para evitar falsos positivos mientras Diana está de vacaciones o cuando las terapeutas tienen ausencias.

En la siguiente sesión se implementará el **Copiloto Colaborativo con Confirmación Dual y Heurísticas Humanas**:
- [ ] **Pausa y Control:** Mantener el trigger pausado hasta completar el flujo de doble confirmación.
- [ ] **Confirmación Colaborativa (Yari 🆚 Terapeuta):**
  - Al cancelar, se envía WhatsApp de opción simple a la terapeuta y una alerta web a Yari.
  - Temporizador de **1 hora** de respuesta. Si nadie aprueba, expira sin mandar WhatsApp a los padres.
  - El primero en confirmar (Yari en web o Terapeuta en WhatsApp) activa el envío de ofertas.
- [ ] **Regla de Proximidad (Micro-Shifting):** Priorizar a pacientes cuyas citas originales tengan menos de 3-4 horas de desfase con la hora libre (ej: mover de 6pm a 5pm).
- [ ] **Efecto Visual (Calendar Glow):** Al cancelarse una cita, hacer que la nueva casilla vacía "brille/destelle" en la agenda web de Yari con un sutil efecto de glow pulsante para llamar su atención visual de inmediato.
- [ ] **Delay de Pensamiento (10 minutos):** Dar un margen de 10 minutos antes de cualquier acción automática para permitir cambios manuales o arrepentimientos de Yari.

- [ ] **Factorización del Backend (Plan en FACTORING_PLAN.md):** Seguir paso a paso el plan detallado en [FACTORING_PLAN.md](file:///d:/agbc/Ag_Pa/FACTORING_PLAN.md). Este archivo debe ser modificado y actualizado con cada cambio que hagamos si aún no se ha ejecutado la factorización completa.
- [ ] Calidad y Optimización: Revisar calidad de código, optimizar flujos lógicos y depurar posibles errores de código (debugging).
- [ ] Meta: plantilla `bienvenida_con_optin` aprobada.
- [ ] Probar opt-in Sí/No en número real + panel alertas en Control Maestro.
- [ ] Celular: logo, semáforo sidebar, Modo Un Día + Semana sin scroll X, columna hora, **Más → Bitácora**, Control Maestro sheet.
- [ ] Recibos: cita pagada → `receiptPdfUrl` + PDF en Storage.
- [ ] Índice Firestore `reception_alerts` solo si el listener marca error.

## 💡 Sugerencias (opcional)

- Enlace «Ver recibo» en citas pagadas.
- Iconos PWA 192/512 + splash Capacitor.
- Empty states y skeleton loaders.
- Bottom-sheet móvil en Reportes / Corte de caja.
- Colores de marca en `tailwind.config.js`.
- Capacitor POC Android; después retirar Render.

Detalle ampliado: `ANALISIS_ESTRATEGIA_MOVIL.md` → **Falta + Sugerencias**.

---
*Última actualización: 19 de Mayo, 2026 — Cierre sesión: calendario móvil, bitácora en Más, HelpManual, Regla Oro 7 docs siempre*

