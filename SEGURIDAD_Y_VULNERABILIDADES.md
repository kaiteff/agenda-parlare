# 🛡️ Seguridad y vulnerabilidades — Parláre

**Documento vivo de auditoría.** Aquí registramos cada área revisada, hallazgos, severidad, estado (✅ reforzado / 🔍 en revisión / ⚠️ pendiente / 🚨 crítico) y siguiente paso. Cada vez que toquemos código sensible o salga a producción una sección nueva, actualizamos este documento.

> **Reglas de juego**
> - Severidad: 🚨 Crítico (acción inmediata) · ⚠️ Alto (próximo sprint) · 🟡 Medio (cola) · 💡 Mejora (opcional).
> - Cada hallazgo lleva: **archivo:línea**, descripción, impacto, mitigación propuesta.
> - Si se cierra un hallazgo, **no se borra** — se mueve a la sección «✅ Reforzado» con la fecha y el commit/cambio.
> - Auditorías programadas: al cerrar cada fase grande (Copiloto, Vacaciones, Capacitor, etc.) y al inicio de cada mes.

---

## 📊 Resumen ejecutivo (Última actualización: 26 May 2026 — Optimización Firestore Fase 1+2+3 + Win 1 + Hotfix Copiloto cerrados)

| Severidad | Cantidad | Pendientes |
|---|---|---|
| 🚨 Crítico | 0 | Ninguno |
| ⚠️ Alto | 2 | Lectura cruzada nombres pacientes (S-002); whitelist emails hardcoded (S-005) |
| 🟡 Medio | 3 | Sin rate-limit frontend; `console.log` con datos sensibles; sin custom claims |
| 💡 Mejora | 2 | Bitácora de seguridad central; auditar dependencias npm/pip |
| ✅ Reforzado | 25 | Ver sección al final (S-001, S-003, S-004, S-011 a S-016, Q-001 a Q-008, headers, sanitize.js, indexes, multicast, sync Copiloto) |

---

## 🚨 Crítico — acción inmediata

*No hay vulnerabilidades críticas pendientes.*


---

## ⚠️ Alto — próximo sprint

### S-002 · `appointments` permite lectura cruzada de nombres entre terapeutas

- **Archivo:** `firestore.rules:38`
- **Detalle:** `allow read: if isAuthenticated();` para toda la colección `appointments`. El comentario explica que la UI oculta nombres, pero **cualquier terapeuta puede abrir la consola del navegador** y hacer `getDocs(collection(db, 'appointments'))` para ver TODOS los nombres + costos + teléfonos de pacientes que no le corresponden.
- **Impacto:** Riesgo legal de privacidad (LFPDPPP MX). Sam puede ver pacientes de Diana y viceversa por la vía técnica.
- **Mitigación propuesta:**
  - **Corto plazo:** documentar el riesgo y obtener consentimiento del equipo de terapeutas (es información laboral, no externa).
  - **Mediano plazo:** dividir `appointments` en `{slot: 'occupied', therapist}` público + `appointment_details/{id}` privado con nombre/costo/teléfono. La UI cruza ambos.
  - **Largo plazo (SaaS):** custom claims por terapeuta para hacer la regla `resource.data.therapist == request.auth.token.therapist`.
- **Estado:** ⚠️ Identificado 25 may.

### S-005 · Whitelist de emails hardcoded en `firestore.rules`

- **Archivo:** `firestore.rules:17-30`
- **Detalle:** Las funciones `isSuper()` e `isOwner()` comparan contra emails concretos (`'lopezcarpio7@gmail.com'`, etc.). Si Diana cambia su correo, hay que **modificar y redesplegar reglas**. Si se agrega una terapeuta nueva, igual.
- **Impacto:** Operacional, no de seguridad directa. Pero: si por error se pierde acceso a redeployar reglas en un fin de semana, queda toda la clínica bloqueada.
- **Mitigación propuesta:**
  - Usar **custom claims** de Firebase Auth: en un Cloud Function admin (con auth de super user) setear `{role: 'admin' | 'therapist' | 'receptionist', therapist: 'diana'}` en el usuario.
  - Reglas se vuelven: `request.auth.token.role == 'admin'` y `request.auth.token.therapist == resource.data.therapist`.
  - Cambio de email no requiere redeploy de reglas.
- **Estado:** ⚠️ Identificado 25 may. Refactor mayor — alinearlo con SaaS multi-clínica.



---

## 🟡 Medio — cola

### S-006 · Sin rate-limit en el frontend para `copilot_overrides`

- **Archivo:** `js/services/WaitlistCopilotService.js`
- **Detalle:** Un usuario malicioso podría disparar `skipDelay`/`pauseAutopilot` cientos de veces. Aunque solo escribe `copilot_overrides/{appointmentId}` (que es idempotente, sobreescribe el mismo doc), si se llama muy seguido sí podría hacer un peak de escritura.
- **Impacto:** Bajo (escritura idempotente, costo Firestore mínimo) pero buena práctica.
- **Mitigación propuesta:** debounce de 1 s en los handlers de los botones del banner.
- **Estado:** 🟡 Identificado 25 may. Mejora menor.

### S-007 · `console.log` con datos sensibles en producción

- **Archivos:** `js/managers/PatientManager.js`, `js/services/patientService.js`, otros.
- **Detalle:** Muchos `console.log('✅ ...', patientData)` se quedan visibles en producción. Cualquier persona con acceso físico al equipo de Yari/terapeuta puede abrir DevTools y leer datos.
- **Impacto:** Riesgo de privacidad si la laptop queda desbloqueada.
- **Mitigación propuesta:**
  - Usar `Logger` (ya existe en `js/utils/Logger.js`) en lugar de `console.log` directo.
  - En `Logger`, suprimir `info/debug` en producción según `window.location.hostname`.
  - Auditar y migrar los `console.log` críticos.
- **Estado:** 🟡 Identificado 25 may.

### S-008 · Sin custom claims Firebase Auth

- **Detalle:** El rol del usuario se determina cliente-side (`AuthManager.currentUser?.role`). Las reglas Firestore validan por email. Si un cliente compromete `localStorage` y modifica el rol, **frontend** podría dejarle hacer cosas que **no** corresponden, aunque Firestore lo rechace.
- **Impacto:** UX engañosa, no es elevación de privilegios real (Firestore detiene la escritura), pero confunde al usuario malicioso y posibilita exfiltración de UI sensible.
- **Mitigación propuesta:** ver S-005 (mismo refactor de custom claims).
- **Estado:** 🟡 Identificado 25 may.

---

## 💡 Mejora — opcional

### S-009 · Bitácora de seguridad central

- **Detalle:** Hoy la bitácora (`AuditPanel.js`) registra movimientos de citas y WhatsApp. No registra eventos de seguridad (login fallido, intento de escritura denegado por reglas, etc.).
- **Mitigación propuesta:** Cloud Function que escucha eventos de `audit_log_v2` o similar y permite filtrar por tipo `SECURITY_*`.
- **Estado:** 💡 Roadmap.

### S-010 · Auditar dependencias (npm + pip)

- **Detalle:** No hemos corrido `npm audit` ni `pip-audit` en mucho tiempo.
- **Mitigación propuesta:**
  - Frontend: `npm audit` y revisar advisories de Tailwind y demás.
  - Backend: `pip list --outdated` y `safety check` o `pip-audit` en `functions/`.
  - Configurar `dependabot` (GitHub) si el repo está en GitHub.
- **Estado:** 💡 Roadmap.

---

## ✅ Reforzado / OK

| Fecha | Área | Detalle |
|-------|------|---------|
| 18 may 2026 | **Notas clínicas (`clinicalNotes`)** | Reglas Firestore restringen lectura/escritura al terapeuta dueño y super users. **Grado médico**. |
| 18 may 2026 | **Perfiles de pacientes (`patientProfiles`)** | Mismas reglas estrictas que `clinicalNotes`. |
| 18 may 2026 | **Configuración (`settings`)** | Lectura para autenticados, escritura solo super user. |
| 18 may 2026 | **Secretos backend (Twilio, Google)** | Manejados con `SecretParam` de Firebase Secret Manager (`functions/main.py:49-55`). No hardcoded, no en `.env` versionado. |
| 25 may 2026 | **`copilot_overrides`** | Nueva colección del Copiloto Colaborativo con regla `read/write: if isSuper()`. Solo admin/recepción. |
| 25 may 2026 | **`_backups/`, `old/`, archivos comprimidos** | Excluidos del hosting (`firebase.json:10-32`). No se publican al deploy. |
| 25 may 2026 | **Sin `eval` / `new Function` / `document.write`** | Confirmado por grep. |
| 25 may 2026 | **Sin `.env` versionado** | Confirmado por glob `*.env*`. |
| 25 may 2026 | **`WaitlistCopilotPanel._escape`** | Helper para escape HTML implementado al construir el modal de candidatos. **Cerrado y movido a utilidad compartida (S-001).** |
| 25 may 2026 | **Bug `isSchoolVisit:true` en bloqueos nuevos** (cierre parcial) | `AbsenceModal.js:289,304` asigna `isSchoolVisit: false` explícitamente al crear bloqueos. Los reportes de visitas escolares ya no se contaminarán con ausencias nuevas. **Pendiente:** migrar documentos antiguos con `isFullDayBlock:true && isSchoolVisit:true` para limpiar histórico (`old/` o script de migración). |
| 25 may 2026 | **`canManageBlockFor` por terapeuta** | Nueva función en `AuthManager.js:271`: admin/recepción pueden todo; terapeuta solo puede su propia agenda. Comparación lowercased. Evita escalación lateral entre terapeutas. |
| 25 may 2026 | **Reemplazo de `prompt()` nativo del navegador** (UX/seguridad menor) | `CalendarUI.js:168-178` ya no usa `window.prompt` para preguntar terapeuta; abre `AbsenceModal` premium con `<select>` constrained. Reduce superficie de input libre + previene typos que generaban bloqueos huérfanos con `therapist` inválido. |
| 25 may 2026 | **`sanitize.js`** | Creada utilidad central de sanitización (`escapeHTML`) para prevenir XSS en interfaces dinámicas. *(Mitigación de S-001 en progreso)* |
| 25 may 2026 | **`AbsenceModal.js`** | Se escapa el nombre del paciente (`escapeHTML`) al renderizar las citas en conflicto en el DOM para mitigar XSS. |
| 25 may 2026 | **Mitigación XSS (S-001 / S-011)** | Aplicado escape HTML en [CalendarUI.js](file:///d:/agbc/Ag_Pa/js/modules/calendar/CalendarUI.js) (chips y arrastre de citas) y [AbsenceModal.js](file:///d:/agbc/Ag_Pa/js/modules/calendar/AbsenceModal.js) (lista de conflictos) previniendo inyección arbitraria de código cliente-side. |
| 25 may 2026 | **Escritura en lote (`writeBatch`) (S-012)** | Reemplazada creación en serie en [AbsenceModal.js](file:///d:/agbc/Ag_Pa/js/modules/calendar/AbsenceModal.js) por un lote atómico (`writeBatch`) de Firestore para bloqueos múltiples (vacaciones). Evita corrupción de datos y colapsa la latencia. |
| 25 may 2026 | **Validación de horas (S-013)** | Agregada validación proactiva en [AbsenceModal.js](file:///d:/agbc/Ag_Pa/js/modules/calendar/AbsenceModal.js) que impide crear bloqueos horarios si la hora de fin es menor o igual a la hora de inicio. |
| 25 may 2026 | **Detección de duplicados (S-014)** | Implementada validación en memoria en [AbsenceModal.js](file:///d:/agbc/Ag_Pa/js/modules/calendar/AbsenceModal.js) que escanea bloqueos preexistentes en las mismas fechas antes de guardar, pidiendo confirmación al usuario. |
| 25 may 2026 | **Safe-area iPhone en `#absenceModalFooter`** (UX móvil) | `index.css` ahora aplica `padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))` al footer del modal de ausencias (mismo patrón que `#eventModalFooter`, `#adminSettingsModalFooter`). Antes los botones «Cancelar / Confirmar Bloqueo» podían quedar parcialmente tapados por el home indicator de iPhone con notch. Recompilado con `npm run build`. |
| 25 may 2026 | **XSS regresivo en `ModalService.confirm/alert`** (S-015) | `ModalService._setupModal:153` inserta `message` como `innerHTML` (para permitir `<strong>`/`<br>`). Hallazgo: varios callers pasaban `patient.name` / `apt.name` sin escapar — regresión amplia del patrón S-001/S-011. **Cerrado aplicando `escapeHTML`** en: `AbsenceModal.js:292` (resumen de pacientes afectados), `ReceptionControl.js:518,527` (confirmar asistencia + pago), `PatientActions.js:454,523,566` (dar de baja, reactivar, eliminar), `patientService.js:216` (paciente inactivo). |
| 25 may 2026 | **XSS en listas de pacientes renderizadas dinámicamente** (S-016) | `${p.name}` / `${patient.name}` interpolados sin escape en `innerHTML` de listas que se renderizan en cada sesión. **Cerrado aplicando `escapeHTML`** en: `Sidebar.js:395` (lista principal de pacientes), `ReceptionControl.js:440-442` (panel Control Maestro), `PatientModals.js:263,266,1222,1232` (ficha de historial + lista de pacientes inactivos, incluyendo el atributo `data-name` que también era peligroso), `CorteDeCaja.js:122-124` (tabla de detalle del corte diario). Estos eran los vectores de mayor impacto porque cualquier nombre malicioso (`<img onerror>`) se ejecutaba en TODAS las sesiones que cargaran la lista. |
| 25 may 2026 | **Storage Rules versionadas (S-003)** | Creado el archivo [storage.rules](file:///d:/agbc/Ag_Pa/storage.rules) en el repositorio y configurado en `firebase.json`, restringiendo el acceso del bucket a usuarios autenticados (carpeta `justificantes/`) y denegando todo lo demás por defecto. *(Pendiente activar Storage en la consola de Firebase para despliegue final en la nube)*. |
| 25 may 2026 | **Headers HTTP de seguridad en Hosting (S-004)** | Configurado en `firebase.json` y desplegado con éxito en Hosting en producción. Implementa: CSP (Content Security Policy) restrictiva para scripts y orígenes de confianza, `X-Frame-Options: DENY` (evita clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Strict-Transport-Security` (HSTS) para forzar HTTPS por un año. |
| 26 may 2026 | **SyntaxError fatal en `PatientManager.js` (Q-001)** | `_setupRealtimeListener` declaraba `const user` dos veces en el mismo scope (líneas 185 y 215) → `Uncaught SyntaxError: Identifier 'user' has already been declared` → módulo no se parseaba → app entera no arrancaba en producción. **Vulnerabilidad de disponibilidad** (DoS auto-infligido). Detectado con `node --input-type=module -e "import(...)"`. **Cerrado** con refactor a un solo `const user` + `const isSuperUser`. Verificado parsing OK. |
| 26 may 2026 | **`timeout_sec` insuficiente en Cloud Function Copiloto (Q-002)** | `space_optimizer.py:111` configuraba `timeout_sec=120` (2 min) mientras el polling era de `total_wait=600` (10 min). Resultado: la función moría a los 2 min y el Autopilot NUNCA enviaba ofertas WhatsApp si Yari no actuaba antes. Vulnerabilidad de funcionalidad crítica (Copiloto silenciosamente inoperante). **Cerrado** subiendo a `timeout_sec=720` (12 min: 10 de delay + 2 de margen para Twilio/Sheets). |
| 26 may 2026 | **Índices Firestore versionados (Q-003)** | `firestore.indexes.json` no existía en el repo: queries con filtro compuesto (`therapist+date`, `isCancelled+date`, etc.) dependían de creación manual en consola, frágil. Riesgo: error «index required» al loguear Vero/Sam tras un eventual reset, bloqueando la app para no-admins. **Cerrado** creando `firestore.indexes.json` con 6 índices compuestos (`appointments` × 4, `space_offers` × 2) y enlazando en `firebase.json`. Pendiente: deploy con `firebase deploy --only firestore:indexes`. |
| 26 may 2026 | **Cache de historial con merge live en `PatientModals` (Q-004 — regresión UX)** | Tras la migración a ventana 90 días del listener, `PatientManager.render()` sobreescribía las citas históricas cargadas con `getDocs` por el array recortado del listener. Resultado: las citas > 30 días desaparecían del expediente al haber cualquier cambio en otra cita. **Cerrado** con `PatientModals._historyCache` + `getHistoryAppointments(patient, fallback)` que hace merge (cache base + live overrides por id). TTL 5 min, invalidación al cerrar. |
| 26 may 2026 | **Memory leak por listeners sin unsubscribe (Q-005)** | `PatientManager._setupRealtimeListener` creaba `onSnapshot` sin guardar la función de unsubscribe. Re-login/hot-reload acumulaba listeners duplicados → DoS de lecturas Firestore + double rendering. **Cerrado** con `_unsubscribeApts`/`_unsubscribeProfiles` y método `_teardownListeners()` que se llama al inicio (idempotente). |
| 26 may 2026 | **Listeners gigantes sin filtro de fecha (Q-006 — costo)** | `WaitlistCopilotService` leía TODAS las citas canceladas históricas (`where isCancelled==true`) en cada login → cientos de reads innecesarias. `Header.batchSync` leía todas las citas pagadas sin sync de toda la historia. **Cerrado** agregando `where('date', '>=', todayIso)` en el primero (cancelaciones futuras únicamente) y `where('date', '>=', -30d)` en el segundo. Reduce consumo del plan Blaze; estimación 29k → 15-20k lecturas/día. |
| 26 may 2026 | **Listener duplicado `appointments` (Q-007 — costo, Win 1)** | `PatientManager._setupRealtimeListener` y `CalendarData.subscribe` mantenían **dos listeners independientes IDÉNTICOS** sobre `appointments` (misma ventana 90 días, mismo filtro por terapeuta). Cada cambio en una cita disparaba DOS callbacks y DOS payloads completos al cliente. **Cerrado** (Antigravity, tarde) implementando patrón **multicast** en `CalendarData.subscribe`: el primer suscriptor abre la conexión real de Firestore; los siguientes (incluyendo `PatientManager`) reusan la misma + reciben el último snapshot cacheado inmediatamente. `PatientManager` quitó su listener propio de citas; mantiene solo el de `patientProfiles`. **Ahorro estimado: 30–50 % adicional sobre las lecturas que aún quedaban tras Q-006. Total acumulado proyectado: 29 k → 8–12 k/día.** |
| 26 may 2026 | **Desync de tiempos entre frontend y backend del Copiloto (Q-008 — UX crítico)** | Tras el deploy de la Cloud Function, Antigravity tuvo que bajar `total_wait` de 10 min a **8 min** (480 s) porque Google Cloud rechaza `timeout_sec > 540 s` en triggers Firestore. Pero el frontend (`WaitlistCopilotService.js:41`) seguía con `COPILOT_DELAY_MS = 10 * 60 * 1000`. **Síntoma**: el banner mostraba contador de 10 min mientras el backend procesaba las ofertas a los 8 min. Si Yari tocaba «Pausar» entre el minuto 8 y el 10, la decisión **se perdía silenciosamente** (el polling del backend ya había terminado y las ofertas ya estaban en camino). Vulnerabilidad de integridad de UX + posible inconsistencia operacional (paciente recibe oferta WhatsApp que Yari intentó cancelar). **Cerrado** (Cursor, tarde) alineando `COPILOT_DELAY_MS = 8 * 60 * 1000` + propagando la constante única desde service hacia panel (cálculos `pct`/`progress` y textos «Esperando · X min», «Tienes X min para intervenir»). Actualizado `HelpManual.js` (3 menciones). Build OK, lints OK. Cualquier cambio futuro del delay se propaga al UI con un solo edit. |

---

## 📅 Bitácora de auditorías

| Fecha | Realizada por | Alcance | Hallazgos nuevos | Hallazgos cerrados |
|-------|---------------|---------|-------------------|--------------------|
| **25 May 2026** | Daniel + Claude | Auditoría inicial completa: Firestore rules, frontend XSS, secrets backend, headers HTTP, Storage rules, console.log. | S-001 (crítico XSS) · S-002 (lectura cruzada) · S-003 (storage.rules ausente) · S-004 (headers HTTP) · S-005 (emails hardcoded) · S-006 (rate-limit) · S-007 (console.log) · S-008 (custom claims) · S-009 (audit log seguridad) · S-010 (dependencias) | — (primera ronda) |
| **25 May 2026 (tarde)** | Claude (review post-Antigravity Fase 1 Ausencias) | Revisión del nuevo `AbsenceModal.js`, integración en `CalendarUI.js`, modal HTML en `MainModals.js`, función `canManageBlockFor` en `AuthManager.js`, fix `isSchoolVisit`. | S-011 (crítico XSS en lista de conflictos) · S-012 (escrituras en serie sin batch) · S-013 (sin validación endHour > startHour) · S-014 (sin detección duplicados) | **Cierre parcial:** bug `isSchoolVisit:true` en bloqueos nuevos (queda histórico viejo por migrar). Refuerzo: `canManageBlockFor` y eliminación de `prompt()` nativo. |
| **25 May 2026 (4 pm)** | Claude (sweep XSS extendido tras hotfixes Antigravity) | Auditoría dirigida de `ModalService.confirm/alert` y listas con `innerHTML` que interpolan nombres de paciente. | S-015 (regresión XSS en `ModalService`) · S-016 (XSS en listas dinámicas: `Sidebar`, `ReceptionControl`, `PatientModals`, `CorteDeCaja`) | **Cerrados S-015 + S-016** aplicando `escapeHTML` centralizado. Además: safe-area iPhone en `#absenceModalFooter`. Recompilado con `npm run build` ✅. |
| **26 May 2026 (mañana)** | Claude (revisión post-Antigravity Optimización Firestore Fase 1) | Auditoría de los 5 archivos tocados por Antigravity para la migración a ventana 90 días + historial bajo demanda + polling Copiloto: `PatientManager.js`, `PatientModals.js`, `PatientActions.js`, `CalendarData.js`, `space_optimizer.py`. Verificación con `node --input-type=module`, revisión de queries Firestore vs índices, lectura del dashboard Firebase (58.4 % lecturas). | Q-001 (SyntaxError fatal) · Q-002 (timeout Cloud Function) · Q-003 (índices Firestore no versionados) · Q-004 (modal historial pierde citas) · Q-005 (memory leak listeners) · Q-006 (listeners gigantes sin filtro fecha) | **Cerrados Q-001 a Q-006** en la misma sesión: refactor `_setupRealtimeListener`, `timeout_sec=720`, `firestore.indexes.json` con 6 índices, `PatientModals._historyCache` con merge live, `_unsubscribeApts/_unsubscribeProfiles`, filtros de fecha en Copilot+batchSync. Pendiente para Antigravity: `firebase deploy --only firestore:indexes,functions,hosting` y validación dashboard 24-48 h después. |
| **26 May 2026 (tarde)** | Claude (revisión post-Antigravity deploy + Win 1 + ajuste de tiempos) | Auditoría del trabajo de Antigravity en la tarde: deploys exitosos de índices, function (con `timeout_sec=540` forzado por límite Cloud Functions = 540 s) y hosting; refactor de `CalendarData.subscribe` a patrón multicast para unificar listeners de citas (Win 1 que estaba marcado como pendiente alto-impacto en la mañana). Verificación de que los fixes Q-001 a Q-006 siguen intactos tras el refactor del listener compartido. | Q-007 (listener duplicado `appointments` ya cerrado por Antigravity como Win 1) · Q-008 (desync `COPILOT_DELAY_MS` 10 min frontend vs 8 min backend, detectado en review) | **Cerrados Q-007 y Q-008** en la misma sesión: Antigravity implementó el multicast (Q-007) y Cursor propagó la constante `COPILOT_DELAY_MS = 8 * 60 * 1000` desde service hacia panel (cálculos + textos visibles a Yari) + `HelpManual.js` con «8 min» (Q-008). Lecturas totales esperadas tras propagación: **29 k → 8–12 k/día** (de 58.4 % a probablemente <25 %). Pendiente Daniel (manual): limpieza Hosting Storage 17.6 GB → 10 GB en consola Firebase. |

---

## 🔧 Cómo usar este documento

1. **Cada vez que se toque código sensible** (auth, reglas, secrets, sanitización), actualizar la fila correspondiente y registrar la fecha.
2. **Cuando se cierre un hallazgo**, no borrarlo: moverlo a «✅ Reforzado» con la fecha y el commit/cambio que lo resolvió.
3. **Auditorías programadas:**
   - Al inicio de cada mes.
   - Al cerrar cada fase grande (Copiloto, Vacaciones, Capacitor, SaaS, etc.).
   - Cuando un dependency advisory aparezca en `npm audit` / `pip-audit`.
4. **Al introducir nueva funcionalidad** con datos sensibles (pacientes, pagos, médico), agregar fila en «🔍 En revisión» antes de desplegar.

---

*Última actualización: 26 de Mayo, 2026 (tarde) — Cerrados Q-001 a Q-008 en una sola jornada. Fase 1+2+3 de optimización Firestore desplegadas en producción: índices `Enabled`, function con `timeout_sec=540` y `total_wait=480` (8 min por límite Cloud Functions), **multicast `CalendarData.subscribe`** (Win 1 que cierra duplicación de listener de `appointments`), y **propagación de `COPILOT_DELAY_MS = 8 * 60 * 1000`** al frontend para evitar que el banner del Copiloto mienta a Yari con un contador inflado. Lecturas estimadas: 29 k → **8–12 k/día**. Estado de seguridad cierra el día con 0 críticos, 2 altos (S-002, S-005 — refactor de custom claims pendiente), 3 medios, 2 mejoras, **25 reforzados**. Pendiente Daniel: limpieza manual de revisiones Hosting (17.6 GB → 10 GB).*
