# 🛡️ Seguridad y vulnerabilidades — Parláre

**Documento vivo de auditoría.** Aquí registramos cada área revisada, hallazgos, severidad, estado (✅ reforzado / 🔍 en revisión / ⚠️ pendiente / 🚨 crítico) y siguiente paso. Cada vez que toquemos código sensible o salga a producción una sección nueva, actualizamos este documento.

> **Reglas de juego**
> - Severidad: 🚨 Crítico (acción inmediata) · ⚠️ Alto (próximo sprint) · 🟡 Medio (cola) · 💡 Mejora (opcional).
> - Cada hallazgo lleva: **archivo:línea**, descripción, impacto, mitigación propuesta.
> - Si se cierra un hallazgo, **no se borra** — se mueve a la sección «✅ Reforzado» con la fecha y el commit/cambio.
> - Auditorías programadas: al cerrar cada fase grande (Copiloto, Vacaciones, Capacitor, etc.) y al inicio de cada mes.

---

## 📊 Resumen ejecutivo (Última actualización: 25 May 2026 — Hotfixes completados)

| Severidad | Cantidad | Pendientes |
|---|---|---|
| 🚨 Crítico | 0 | Ninguno |
| ⚠️ Alto | 4 | Lectura cruzada nombres pacientes; falta `storage.rules`; sin headers CSP; whitelist emails hardcoded |
| 🟡 Medio | 3 | Sin rate-limit frontend; `console.log` con datos sensibles; sin custom claims |
| 💡 Mejora | 2 | Bitácora de seguridad central; auditar dependencias npm/pip |
| ✅ Reforzado | 13 | Ver sección al final |

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

### S-003 · No hay `storage.rules` en el repo

- **Archivo:** ausente. `firebase.json` no referencia `storage.rules`.
- **Detalle:** Firebase Storage guarda recibos PDF (`recibos_pacientes/{patientId}/{fecha}.pdf`) y posiblemente justificantes médicos. Sin `storage.rules` definidas en el repo, probablemente está usando las reglas default («usuarios autenticados leen y escriben todo») o lo que se haya configurado manualmente en consola.
- **Impacto:** Recibos médicos con datos del paciente pueden ser legibles por cualquier usuario autenticado, no solo el dueño de la agenda. Riesgo legal alto.
- **Mitigación propuesta:**
  1. Auditar reglas actuales en Firebase Console → Storage → Rules.
  2. Crear `storage.rules` en el repo con: lectura solo del super user + del terapeuta dueño del paciente (mismo patrón que `patientProfiles`).
  3. Agregar `"storage": { "rules": "storage.rules" }` en `firebase.json` para que se versione y se deploye.
- **Estado:** ⚠️ Identificado 25 may.

### S-004 · Sin headers de seguridad HTTP (CSP, X-Frame-Options, etc.)

- **Archivo:** `firebase.json:39-58`
- **Detalle:** Solo se definen headers de `Cache-Control`. Faltan:
  - `Content-Security-Policy` (mitiga el XSS del S-001 a nivel browser)
  - `X-Frame-Options: DENY` (previene clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (camera, mic, geo)
- **Impacto:** Ataques XSS y clickjacking más fáciles. Si alguien embebe `parlare.app` en un iframe malicioso podría tomar sesión.
- **Mitigación propuesta:** agregar los headers en `firebase.json`. CSP debe permitir `gstatic.com` (Firebase SDK), `googleapis.com`, `googleusercontent.com`, `googletagmanager.com` si aplica.
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

---

## 📅 Bitácora de auditorías

| Fecha | Realizada por | Alcance | Hallazgos nuevos | Hallazgos cerrados |
|-------|---------------|---------|-------------------|--------------------|
| **25 May 2026** | Daniel + Claude | Auditoría inicial completa: Firestore rules, frontend XSS, secrets backend, headers HTTP, Storage rules, console.log. | S-001 (crítico XSS) · S-002 (lectura cruzada) · S-003 (storage.rules ausente) · S-004 (headers HTTP) · S-005 (emails hardcoded) · S-006 (rate-limit) · S-007 (console.log) · S-008 (custom claims) · S-009 (audit log seguridad) · S-010 (dependencias) | — (primera ronda) |
| **25 May 2026 (tarde)** | Claude (review post-Antigravity Fase 1 Ausencias) | Revisión del nuevo `AbsenceModal.js`, integración en `CalendarUI.js`, modal HTML en `MainModals.js`, función `canManageBlockFor` en `AuthManager.js`, fix `isSchoolVisit`. | S-011 (crítico XSS en lista de conflictos) · S-012 (escrituras en serie sin batch) · S-013 (sin validación endHour > startHour) · S-014 (sin detección duplicados) | **Cierre parcial:** bug `isSchoolVisit:true` en bloqueos nuevos (queda histórico viejo por migrar). Refuerzo: `canManageBlockFor` y eliminación de `prompt()` nativo. |

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


