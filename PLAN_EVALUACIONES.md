# Plan de implementación — Flujo de Evaluaciones

*Última actualización: 9 jul 2026 — Paso 1 Twilio con samples + IDs de botones*

Documento maestro con **decisiones cerradas**, **código de referencia** y fases de implementación. Complementa `PERMISOS_EQUIPO_FASE1.md` y `SEGURIDAD_Y_VULNERABILIDADES.md`.

---

## Resumen ejecutivo

Incorporar el ciclo de vida **Entrevista → Evaluación → Entrega de resultados** para pacientes nuevos en evaluación, con:

- Recordatorios WhatsApp a papás (8 AM / 8 PM) con texto de etapa
- Confirmación de papás **siempre** (botones / texto libre en webhook)
- Diana confirma desde **app o celular** → bitácora `confirmedBy: 'diana'`
- Alta de paciente evaluación controlada por permiso en **Configuración → Equipo y permisos**
- Sincronía de etapa en título de Google Calendar
- Seguridad: mismas prácticas actuales (validación Twilio, audit logs, sin PII en console)

**Plantillas Twilio/Meta:** se registran en ~30 min — no bloquean el desarrollo; usar variables en plantilla aprobada.

---

## Decisiones cerradas (9 jul 2026)

| Tema | Decisión |
|------|----------|
| Plantillas WhatsApp | Registrar en Twilio/Meta (Yari ~30 min). Código listo para `content_sid` + variables. |
| ¿3 etapas = citas separadas o recurrencia? | **Citas separadas** en Firestore (un documento por sesión, cada una con `evaluationStage` y `stageName`). **No** es una sola cita recurrente opaca. El ritmo **no es fijo**: a veces las 3–4 sesiones caben en **1–2 semanas** (urgencia); otras van más espaciadas. Ver sección **«Cómo agendar»** abajo. |
| Cómo agendar las sesiones | **Dos caminos equivalentes** (Yari/Diana eligen según el caso): **(A)** recurrencia al crear (semanal / quincenal × N sesiones) o **(B)** abrir agenda y elegir huecos disponibles uno a uno (incluso varios días en la misma semana). **Siempre** se pueden **mover o editar** citas después con el flujo normal de la agenda. |
| Alta paciente evaluación | Permiso `create_evaluation_patient` en panel **Equipo y permisos** (Diana asigna a Yari/Sam/Vero). Dueña siempre puede. |
| Google Calendar | **Sí** — título incluye etapa: `Entrevista — Juan Pérez`, `Evaluación (2) — Juan Pérez`, etc. |
| Recordatorios papás | Crons **8 AM** (`execute_send_reminders`) y **8 PM** (`execute_send_evening_reminders`) con texto de etapa si `isEvaluation`. Papás pueden confirmar/cancelar **siempre** vía webhook. |
| ~2 h antes de la sesión | **Regla operativa permanente:** si faltan ~2 h y el papá no confirmó, **Yari envía manual** desde WhatsApp (no solo en evaluaciones — **siempre**). Opcional Fase C: badge en Control Maestro / lista de citas del día. |
| Diana confirma | Desde **app** (marcar asistencia/confirmado) **o** respondiendo por **celular** al bot. Ambos escriben en bitácora con `confirmedBy: 'diana'` (o `source: 'whatsapp_diana'`). No depende de un solo canal. |
| Sam / Vero y evaluaciones | **Misma libertad** que en terapia regular en **su propia agenda** (`manage_own_schedule` + `canEditItem`): mover fechas, activar recurrencia, agendar etapas sueltas. **Sin** bloqueo extra por `treatmentType`. Solo ven/editan citas de su terapeuta. |
| Hueco ocupado | Si el horario ya tiene cita, la UI muestra **quién** está ahí (nombre + etapa si aplica). Ver `formatConflictAppointment()` en `validators.js`. |

---

## Modelo de datos

### Perfil paciente (`patientProfiles`)

```javascript
// js/config/evaluationStages.js (NUEVO)
export const EVALUATION_STAGES = [
    { stage: 1, key: 'entrevista', label: 'Entrevista' },
    { stage: 2, key: 'evaluacion', label: 'Evaluación' },
    { stage: 3, key: 'entrega', label: 'Entrega de resultados' }
];

export function getStageLabel(stageNum) {
    return EVALUATION_STAGES.find((s) => s.stage === stageNum)?.label || `Etapa ${stageNum}`;
}
```

Campos nuevos en `createPatientProfile` (`js/services/patientService.js`):

```javascript
treatmentType: options.treatmentType || 'regular',  // 'regular' | 'evaluation'
evaluationStage: options.treatmentType === 'evaluation' ? 1 : null,
evaluationMeta: options.treatmentType === 'evaluation' ? {
    plannedSessions: 3,              // 3 habitual; puede ser 4 si Diana pide otra evaluación
    optionalExtraEvaluation: false,  // Diana indica 4ª sesión vía bot o app
    schedulingNotes: ''              // opcional: «urgente 2 semanas», etc.
} : null
```

### Cita (`appointments`)

```javascript
{
  // ... campos actuales ...
  isEvaluation: true,
  evaluationStage: 1,           // 1 | 2 | 3
  stageName: 'Entrevista',        // denormalizado para queries y WhatsApp
  confirmedBy: null,              // 'parent' | 'diana' | 'staff' | null
  confirmedAt: null,
  confirmedSource: null           // 'whatsapp' | 'app' | 'whatsapp_diana'
}
```

### Bitácora (`audit_logs`)

```javascript
{
  action: 'APPOINTMENT_CONFIRMED',  // o WHATSAPP_CONFIRM / existente
  entityType: 'APPOINTMENT',
  entityId: '<appointmentId>',
  details: {
    patientName: '...',
    confirmedBy: 'diana',
    confirmedSource: 'app',       // 'app' | 'whatsapp' | 'whatsapp_diana'
    evaluationStage: 2,
    stageName: 'Evaluación',
    message: 'Confirmado por Diana desde la app'
  },
  userEmail: 'lopezcarpio7@gmail.com',
  userName: 'Diana',
  userRole: 'admin'
}
```

---

## Permisos (Fase 1 — ya en catálogo)

**Archivo:** `js/config/staffPermissions.js`

```javascript
{ id: 'create_evaluation_patient', label: 'Crear paciente en proceso de evaluación' }
```

**Gate en UI** (`js/managers/patient/PatientModals.js` o modal nuevo paciente):

```javascript
import { AuthManager } from '../../managers/AuthManager.js';

const canCreateEvaluation =
    AuthManager.isClinicOwner?.() ||
    AuthManager.can('create_evaluation_patient');

// Mostrar radio «Proceso de Evaluación» solo si canCreateEvaluation
```

Dueña (`lopezcarpio7@gmail.com`) siempre tiene el permiso vía `OWNER_LOCKED_PERMISSIONS` + rol admin.

---

## Frontend

### 1. Modal nuevo paciente

**Archivo:** `js/managers/patient/PatientModals.js` (o `ScheduleManager` si el alta es desde agenda)

- Selector **Tipo:** Paciente regular | Proceso de evaluación (solo con permiso)
- Si evaluación → `treatmentType: 'evaluation'`, `evaluationStage: 1`

### 2. Agendar con etapa automática

**Archivos:** `js/managers/ScheduleManager.js`, `js/modules/calendar/CalendarModal.js`, `js/services/appointmentService.js`

Al crear cita para perfil con `treatmentType === 'evaluation'`:

```javascript
import { getStageLabel } from '../../config/evaluationStages.js';

const stage = profile.evaluationStage || 1;
const appointmentPayload = {
    // ...existente...
    isEvaluation: true,
    evaluationStage: stage,
    stageName: getStageLabel(stage)
};
```

Tras cita **realizada** (asistencia logged) o confirmación Diana de sesión N, incrementar en perfil:

```javascript
if (profile.treatmentType === 'evaluation' && profile.evaluationStage < 3) {
    await updateDoc(profileRef, { evaluationStage: increment(1) });
}
```

(La lógica exacta de “¿habrá 4ª evaluación?” la resuelve el bot con Diana — ver Backend.)

### 3. Cómo agendar — dos caminos (flexible por urgencia)

Las sesiones de evaluación son **documentos independientes**. El equipo elige **cómo** llenar el calendario según urgencia y disponibilidad — no hay un solo patrón «1 cita por semana».

| Situación | Camino recomendado | Dónde en la app |
|-----------|-------------------|-----------------|
| Ritmo claro (ej. 1 cita/semana × 3) | **Recurrencia** al agendar | `ScheduleManager` (alta paciente) o `CalendarModal` + `#recurringOptions` / `#recurringDuration` |
| Urgencia: 3–4 sesiones en **1–2 semanas** | **Huecos manuales** — elegir varios slots en días distintos | `ScheduleManager`: tocar varios horarios libres en la grilla semanal; o agenda → nueva cita por fecha |
| Mezcla (entrevista ya, resto después) | Agendar **una** ahora; las demás cuando haya hueco | Misma agenda; perfil conserva `evaluationStage` para la **próxima** etapa |
| Cambio de plan | **Mover / editar** cita existente | Flujo normal de agenda (sin reglas especiales) |

**Regla de producto:** nunca obligar recurrencia. Si Yari solo agenda la Entrevista hoy, las etapas 2 y 3 se agendan después; cada nueva cita toma el `evaluationStage` actual del perfil.

#### Camino A — Recurrencia (ya existe)

- **Nuevo paciente:** `ScheduleManager` — `recurrenceType`: `none` | `weekly` | `biweekly` + `sessionsCount` (3 o 4)
- **Cita en agenda:** `CalendarModal` + `CalendarSuggestions` — `#recurringOptions`, `#recurringDuration` (conteo de **sesiones**, no meses)

Al crear en bucle, asignar etapa por índice de sesión:

```javascript
// Dentro del bucle que crea N citas (recurrencia o slots seleccionados)
appointmentsToCreate.forEach((slot, index) => {
    const stageNum = index + 1; // 1=Entrevista, 2=Evaluación, 3=Entrega, 4=Evaluación extra
    payload.evaluationStage = stageNum;
    payload.stageName = getStageLabel(stageNum <= 3 ? stageNum : 2); // 4ª repite «Evaluación»
    payload.isEvaluation = true;
});
```

Ejemplos reales:

- **Estándar:** semanal × 3 → Entrevista, Evaluación, Entrega en 3 semanas.
- **Urgente:** `sessionsCount: 4`, recurrencia **semanal** pero con slots manuales en la misma semana (Camino B) o quincenal × 2 si solo hay 2 semanas.
- **Espaciado:** quincenal × 3 si el caso no es urgente.

#### Camino B — Elegir fechas en la agenda (ya existe)

`ScheduleManager` ya permite **varios `selectedSlots`** en la grilla (botón «Agendar N citas»). Para evaluación:

1. Crear paciente tipo **Evaluación**.
2. En la grilla, tocar **cada hueco libre** (pueden ser martes + jueves de la misma semana).
3. Confirmar → se crean N citas; cada una recibe `evaluationStage` 1, 2, 3… en orden de fecha/hora.

Si falta la 4ª sesión (evaluación extra), se agenda **después** como cita suelta; el perfil ya tendrá `evaluationStage` actualizado.

#### Después de agendar — siempre editable

- Reagendar fecha/hora: modal de cita existente (sin perder `evaluationStage` salvo que el staff lo cambie explícitamente).
- Cancelar una etapa: flujo normal; no borra el perfil de evaluación.
- **No** bloquear edición por ser «proceso de evaluación».
- **Sam y Vero** pueden hacer todo lo anterior en pacientes de evaluación de **su terapeuta** (mismo `AuthManager.canEditItem` que hoy).

#### Conflictos — mostrar qué cita ocupa el hueco

Al elegir horario o recurrencia, si el slot está tomado la app indica la cita existente:

| Pantalla | Comportamiento |
|----------|----------------|
| `ScheduleManager` (alta paciente) | Botón rojo con hora + nombre corto; al guardar, lista huecos saltados con detalle |
| `CalendarModal` (grilla día) | Mismo patrón en slots ocupados |
| `CalendarSuggestions` (recurrencia) | Cada fecha: «Ocupado: [nombre]» (incluye `stageName` si es evaluación) |
| Confirmar con conflicto | Modal: «A las X ya está: **Entrevista — Pedro (10:00)**» |

```javascript
// js/utils/validators.js
import { checkSlotConflict, formatConflictAppointment } from '../../utils/validators.js';

const conflict = checkSlotConflict(iso, appointments, excludeId, therapist);
if (conflict) {
    const msg = formatConflictAppointment(conflict); // "Evaluación — Ana (11:00)"
}
```

**Implementación Fase A:** no añadir guards que impidan a terapeutas editar citas `isEvaluation` en su agenda.


### 4. Google Calendar

**Archivo:** `js/services/google/GoogleCalendarService.js`

```javascript
let summary = appointment.name || '(Sin nombre)';
if (appointment.isEvaluation && appointment.stageName) {
    summary = `${appointment.stageName} — ${summary}`;
}
if (appointment.confirmed) summary = `✅ ${summary}`;
```

### 5. Diana confirma desde app

**Archivos:** `js/managers/patient/PatientActions.js`, `js/modules/reception/ReceptionControl.js`

Al marcar confirmado / asistencia por Diana:

```javascript
await updateDoc(aptRef, {
    confirmed: true,
    confirmedBy: 'diana',
    confirmedSource: 'app',
    confirmedAt: serverTimestamp()
});
await AuditService.log({
    action: 'APPOINTMENT_CONFIRMED',
    details: { confirmedBy: 'diana', confirmedSource: 'app', evaluationStage, stageName }
});
```

---

## Backend (`functions/main.py`)

> **Nombres reales** (no usar `execute_send_morning_reminders` ni `whatsapp_optin.py` para confirmaciones).

| Función | Cron / ruta | Rol |
|---------|-------------|-----|
| `execute_send_reminders()` | 8:00 AM MX | Recordatorio día siguiente |
| `execute_send_evening_reminders()` | 8:00 PM MX | Segundo recordatorio si no confirmó |
| `whatsapp_webhook` | POST Twilio | Respuestas papás + Diana |
| `find_confirmable_appointments()` | — | Match por `patientId` + nombre normalizado |

### Recordatorio con etapa (8 AM / 8 PM)

```python
def _evaluation_reminder_line(apt: dict) -> str:
    if not apt.get('isEvaluation'):
        return ""
    stage = apt.get('evaluationStage') or 1
    name = apt.get('stageName') or {1: 'Entrevista', 2: 'Evaluación', 3: 'Entrega de resultados'}.get(stage, '')
    return f"\n📋 Esta cita es la *{stage}* ({name}) de su proceso de evaluación.\n"

# Dentro del body del mensaje en execute_send_reminders / execute_send_evening_reminders:
body = (
    f"🏥 *Recordatorio de Cita (8 AM)*\n\n"
    f"Hola, le recordamos la cita de *{p_name}* mañana..."
    f"{_evaluation_reminder_line(apt)}"
    f"\nResponda *1* para confirmar o *2* para cancelar."
)
```

Plantilla Twilio (cuando esté aprobada):

```python
# content_sid = 'HX...'  # plantilla parlare_recordatorio_evaluacion
variables = {
    "1": p_name,
    "2": apt_date_str,
    "3": str(apt.get('evaluationStage', 1)),
    "4": apt.get('stageName', 'Entrevista')
}
```

### Webhook — papás (sin cambio de filosofía)

Seguir `find_confirmable_appointments`, keywords ampliados, `ButtonPayload` + `Body`. Al confirmar:

```python
apt_ref.update({
    'confirmed': True,
    'confirmedBy': 'parent',
    'confirmedSource': 'whatsapp',
    'confirmedAt': firestore.SERVER_TIMESTAMP
})
```

### Webhook — Diana (terapeuta)

Detectar mensaje desde teléfono de Diana (config en `settings/clinicConfig` o constante `DIANA_PHONE`):

```python
DIANA_EVAL_KEYWORDS = {'si', 'sí', 'realizada', 'se realizo', 'confirmo'}
# Button payloads: 'eval_yes', 'eval_no', 'eval_extra', 'eval_entrega'

def handle_diana_evaluation_reply(from_phone, body, button_payload):
    # 1. Buscar cita de evaluación de hoy para ese paciente/contexto
    # 2. Si confirma realización → actualizar asistencia + audit confirmedBy diana
    # 3. Si etapa 2 o 3 → preguntar: ¿otra evaluación o entrega?
    # 4. Actualizar patientProfiles.evaluationStage / evaluationMeta.optionalExtraEvaluation
```

Cron opcional **21:00** — recordatorio a Diana si no respondió sobre sesión del día:

```python
def execute_send_diana_evaluation_followup():
    """Citas isEvaluation con date=hoy, therapist=diana, sin respuesta Diana."""
    # Enviar WhatsApp con botones Sí/No realizada
```

### Regla ~2 h antes (operativa + futuro código)

**Hoy (manual):** Yari revisa citas del día; si `confirmed != true` y faltan ≤2 h → mensaje manual por WhatsApp Business.

**Fase C (opcional):** query en Control Maestro — citas **de hoy** sin confirmar papá; resaltado extra (rosa) si además faltan ≤2 h para la sesión.

---

## Seguridad (obligatorio)

Mismas prácticas que el resto del proyecto:

1. **Webhook Twilio:** validar firma `X-Twilio-Signature` (ya en `main.py`; no relajar).
2. **Sin PII en logs:** `print` solo IDs o iniciales, no teléfonos completos en producción.
3. **Firestore rules:** escritura de `confirmedBy` solo vía Functions o usuarios autenticados con rol; Fase 3 permisos en rules (`S-008`).
4. **Audit:** toda confirmación Diana/papá → `audit_logs` + Excel vía `SheetService.logAudit` cuando aplique.
5. **Plantillas:** solo SIDs aprobados en Meta; no texto libre fuera de ventana 24 h.
6. **Permiso UI:** `create_evaluation_patient` en frontend; no exponer selector sin `AuthManager.can()`.

---

## Inventario plantillas WhatsApp (9 jul 2026)

Referencia completa en `MANUAL_PLANTILLAS_WHATSAPP.md` (algunos SIDs del cron 8 AM/PM difieren del manual — ver tabla abajo).

### ✅ Ya en producción (no crear de nuevo)

| Nombre lógico | Content SID | Uso | Archivo |
|---------------|-------------|-----|---------|
| `bienvenida_con_optin` | `HX08f74d9b520b85acfbf9e678e434b1f6` | Opt-in al crear paciente / botón Bienvenida | `whatsapp_optin.py`, `main.py`, `whatsappTemplates.js` |
| Recordatorio cron **8 AM y 8 PM** | `HX100149d5295d1839864ad33cc9e73567` | Mañana: fecha, hora, terapeuta + botones 1/2/3 | `main.py` `execute_send_reminders` / `execute_send_evening_reminders` |
| `copy_info_proxima_cita` | `HXe500a927cfbef3321fc0ba7ae7aa86d7` | Recordatorio manual app + webhook «próxima cita» | `WhatsAppMessaging.js`, `main.py` webhook |
| Post-confirmación papá | `HX079c41d2222032d6c3ab41f44c7272f7` | Tras confirmar con botón 1 | `main.py` webhook |
| `cancelacion_sesion` | `HX7493af9c40a5df17d33ca598f043f2ba` | Cancelación manual/auto | `WhatsAppMessaging.js` |
| Reagendar | `HX9de65123a2d3b426f0b644ef2593d53e` | Mensaje manual reagendar | `WhatsAppMessaging.js` |
| Inasistencia | `HX91155fde499d8551099df309515b1c68` | No-show manual | `WhatsAppMessaging.js` |
| Pago pendiente | `HXfe0923442618a0fae3018d17b9c33909` | Cobro manual | `WhatsAppMessaging.js` |
| Agenda del día (terapeutas + Yari) | `HX28a1f7c6ccbb2b507f9764b098c44779` | Cron 9 AM + alerta cancelación a Yari | `main.py` |
| `oferta_adelanto_cita` | `HX14731670198becbf2becfc20dbccb9b9` | Copiloto / waitlist | `space_optimizer.py` |

**Nota:** Los crons usan `HX100149…` (3 variables: fecha, hora, terapeuta). El manual antiguo citaba `HXe500…` para recordatorio — hoy el cron usa `HX100149…`.

### ⏳ Faltan para **Evaluaciones** (Fase B — registrar en Twilio/Meta)

| # | Nombre sugerido | Para qué | Variables | Botones (payload) |
|---|-----------------|----------|-----------|-------------------|
| **E1** | `recordatorio_evaluacion` | Crons 8 AM / 8 PM cuando `isEvaluation` | `{{1}}` fecha · `{{2}}` hora · `{{3}}` terapeuta · `{{4}}` etapa (*«Entrevista — cita 1»*) | Igual que hoy: `1` confirmar · `2` cancelar · `3` recepción |
| **E2** | `diana_sesion_evaluacion` | Cron ~21:00 o tras sesión del día — pregunta a Diana | `{{1}}` paciente · `{{2}}` etapa (*Evaluación*) · `{{3}}` hora | `eval_yes` · `eval_no` |
| **E3** | `diana_siguiente_etapa` | Si Diana dijo que sí hubo sesión 2/3 | `{{1}}` paciente | `eval_extra` (otra evaluación) · `eval_entrega` (entrega resultados) |

**Alternativa mínima:** solo **E1** — meter la etapa en `{{4}}` y seguir usando el mismo webhook de confirmación papá. **E2 + E3** hacen falta para el flujo bot↔Diana documentado en Fase B.

### ⏳ Cancelación con motivo — **Opción B acordada** (plantilla + botones)

| # | Nombre sugerido | Para qué | Variables | Botones (payload) |
|---|-----------------|----------|-----------|-------------------|
| **C1** | `motivo_cancelacion` | Inmediatamente **después** de que el papá pulse **2 — Cancelar** en recordatorio | `{{1}}` fecha cita · `{{2}}` hora | `cancel_enfermedad` · `cancel_viaje` · `cancel_otro` |

**Copy sugerido para Meta:**

> Gracias por avisarnos. Tu cita del **{{1}}** a las **{{2}}** quedó cancelada en nuestro sistema.  
> ¿Nos compartes el motivo? (Nos ayuda a reagendar y, si aplica, el justificante.)
>
> - **Enfermedad** → `cancel_enfermedad`  
> - **Viaje / imprevisto** → `cancel_viaje`  
> - **Otro** → `cancel_otro` (luego el bot pide texto libre en un mensaje de seguimiento)

**Flujo en código (Fase B — `main.py` webhook):**

1. Papá responde `2` / cancelar → cita `isCancelled`, Sheets/Calendar, alerta Yari (como hoy).
2. En lugar del texto plano actual → enviar plantilla **C1** (`content_sid` + variables fecha/hora).
3. Papá elige botón → guardar en cita: `cancellationReason` (`enfermedad` | `viaje` | `otro`) + `cancellationReasonAt` + bitácora `WHATSAPP_CANCEL_REASON`.
4. Si `cancel_otro` → bot responde: *«Cuéntanos brevemente el motivo»* y la **siguiente** respuesta de texto se guarda en `cancellationReasonNote`.
5. Si **no responde** en ~24 h (o nunca elige botón) → Yari ya tiene alerta en Control Maestro / WhatsApp; **seguimiento manual** (igual que hoy).

**Evaluaciones:** mismo flujo C1 para citas `isEvaluation`; la etapa queda en bitácora vía `stageName` de la cita cancelada.

**~2 h antes sin confirmar:** sin plantilla — Yari manual (regla operativa permanente).

### 🔜 Roadmap (otros features, no evaluaciones)

| Feature | Plantilla | Estado código |
|---------|-----------|---------------|
| Vacaciones / aviso tutor (Fase 2 ausencias) | Por definir (reagendar A/B/C) | ⏳ `PLAN_DE_TRABAJO.md` |
| Cola prioridad pacientes especiales | Variante oferta o nueva | 💡 solo documentado |

### Dónde vamos en el proceso

| Fase | Estado |
|------|--------|
| Documentación `PLAN_EVALUACIONES.md` | ✅ |
| Permisos + fix panel Config + conflictos huecos | ✅ en código |
| **Fase A** — `evaluationStages.js`, alta paciente evaluación, tags en citas | ✅ **9 jul 2026** |
| **Plantillas E1–E3 + C1 en Meta/Twilio** | ✅ **aprobadas 9 jul 2026** |
| **Fase B** — crons + webhook Diana + motivo cancelación + `confirmedBy` | ✅ **desplegado** |
| Deploy Fase A + B + seguridad | ⏳ **hosting** tras `npm run build` |

SIDs centralizados en `js/config/whatsappTemplates.js` y `functions/whatsapp_templates.py`.

---

## Procedimiento para seguir (orden acordado)

### Paso 0 — Deploy de lo ya hecho (Daniel, ~15 min)

Antes de más código nuevo, subir a producción lo de esta semana:

```powershell
cd d:\agbc\Ag_Pa
npm run build
firebase deploy --only hosting,functions:whatsapp_webhook
```

Validar: pestaña **Equipo y permisos**, huecos ocupados con nombre, confirmaciones WhatsApp.

---

### Paso 1 — Yari: registrar plantillas en Twilio/Meta (paralelo, ~30–60 min)

#### A. Entrar a Twilio

1. [Twilio Console](https://console.twilio.com) → cuenta Parláre.
2. **Messaging** → **Content Template Builder** → **Create new**.
3. En **todas** las plantillas:
   - **Channel:** WhatsApp
   - **Language:** Spanish (Mexico) / `es_MX`
   - **Category:** Utility (utilidad / transaccional)
   - **Type:** Quick Reply (botones)
4. Al terminar cada una: **Submit for WhatsApp approval**.
5. Cuando Meta apruebe → copiar **Content SID** (`HX…`).

**Regla Meta:** no poner nombre del niño en el mensaje (privacidad). Solo fecha, hora, terapeuta, etapa genérica.

**Regla botones:** en el campo **ID** (o Payload) de Twilio va **solo el valor** — sin la palabra `Payload:`, sin espacios. Ejemplo: `cancel_viaje`, no `Payload: cancel_viaje`.

Crear **en este orden**:

| Prioridad | Código | Template name |
|-----------|--------|---------------|
| 1 | **C1** | `motivo_cancelacion` |
| 2 | **E1** | `recordatorio_evaluacion` |
| 3 | **E2** | `diana_sesion_evaluacion` |
| 4 | **E3** | `diana_siguiente_etapa` |

**C1 primero** — mejora cancelaciones de **todos** los pacientes.

---

#### B. Plantilla C1 — `motivo_cancelacion`

**Body (copiar/pegar):**

```text
Gracias por avisarnos. Tu cita del {{1}} a las {{2}} quedó cancelada en nuestro sistema.

¿Nos compartes el motivo? Nos ayuda a reagendar y, si aplica, con el justificante.
```

**Sample data (variables):**

| Variable | Sample |
|----------|--------|
| `{{1}}` | Martes 15 de julio |
| `{{2}}` | 5:00 PM |

**Botones:**

| Texto visible | ID (solo esto en Twilio) |
|---------------|--------------------------|
| Enfermedad | `cancel_enfermedad` |
| Viaje o imprevisto | `cancel_viaje` |
| Otro | `cancel_otro` |

→ Submit → SID C1: `HX8fa5239da35438daf405b24a6297e7d2`

---

#### C. Plantilla E1 — `recordatorio_evaluacion`

**Body:**

```text
Hola, te recordamos la cita del {{1}} a las {{2}} con {{3}}.

Esta sesión es: {{4}} (proceso de evaluación).

Confirma tu asistencia:
```

**Sample data:**

| Variable | Sample |
|----------|--------|
| `{{1}}` | Miércoles 16 de julio |
| `{{2}}` | 10:00 AM |
| `{{3}}` | Diana |
| `{{4}}` | Entrevista — cita 1 de 3 |

**Botones:**

| Texto visible | ID |
|---------------|-----|
| 1 - Confirmar | `1` |
| 2 - Cancelar | `2` |
| 3 - Recepción | `3` |

→ Submit → SID E1: `HXd5b11512c2329c5373116a47d0e28398`

---

#### D. Plantilla E2 — `diana_sesion_evaluacion`

**Body:**

```text
Hola Diana, hoy tuviste sesión de evaluación con {{1}} ({{2}}) a las {{3}}.

¿Se llevó a cabo la sesión?
```

**Sample data:**

| Variable | Sample |
|----------|--------|
| `{{1}}` | Familia García |
| `{{2}}` | Evaluación |
| `{{3}}` | 4:00 PM |

**Botones:**

| Texto visible | ID |
|---------------|-----|
| Sí, se realizó | `eval_yes` |
| No, faltó | `eval_no` |

→ Submit → SID E2: `HXd4336feb9605f3bbea6b55fc3ad8c0da`

---

#### E. Plantilla E3 — `diana_siguiente_etapa`

**Body:**

```text
Para el proceso de evaluación de {{1}}:

¿Habrá otra sesión de evaluación, o la próxima ya es entrega de resultados?
```

**Sample data:**

| Variable | Sample |
|----------|--------|
| `{{1}}` | Familia García |

**Botones:**

| Texto visible | ID |
|---------------|-----|
| Otra evaluación | `eval_extra` |
| Entrega de resultados | `eval_entrega` |

→ Submit → SID E3: `HXfd9918421f300da29dbaa9a8c63cd172`

---

#### F. Al terminar — enviar a Daniel

```text
C1 motivo_cancelacion:     HX8fa5239da35438daf405b24a6297e7d2
E1 recordatorio_evaluacion: HXd5b11512c2329c5373116a47d0e28398
E2 diana_sesion_evaluacion: HXd4336feb9605f3bbea6b55fc3ad8c0da
E3 diana_siguiente_etapa:   HXfd9918421f300da29dbaa9a8c63cd172
```

**Checklist Paso 1:**

- [x] C1 creada y enviada a aprobación
- [x] E1 creada y enviada
- [x] E2 creada y enviada
- [x] E3 creada y enviada
- [x] SIDs anotados y compartidos (9 jul 2026)

Si Meta rechaza: revisar categoría **Utility**, quitar nombres de pacientes del texto, IDs de botón exactos (tabla arriba).

---

### Paso 2 — Código Fase A (Cursor, 1 sesión)

Sin esperar a que Meta apruebe todo:

1. `js/config/evaluationStages.js`
2. Campos `treatmentType` / `evaluationStage` en `patientService.js`
3. Selector «Proceso de evaluación» (permiso `create_evaluation_patient`)
4. Tags `isEvaluation`, `stageName` al agendar
5. Título Google Calendar con etapa
6. `npm run build` + deploy **hosting**

Diana/Yari pueden probar alta y agenda; recordatorios con etapa llegan cuando exista **E1** aprobada.

---

### Paso 3 — Código Fase B (Cursor, 1–2 sesiones)

Cuando lleguen los SIDs (mínimo **C1** + **E1**):

1. ✅ Centralizar SIDs en `whatsappTemplates.js` + `whatsapp_templates.py`
2. ✅ Crons 8 AM/8 PM: si `isEvaluation` → plantilla **E1**
3. ✅ Webhook cancelar → plantilla **C1** + guardar `cancellationReason`
4. ✅ Webhook Diana **E2** / **E3** + cron 21:00 (`send_diana_eval_followup_cron`)
5. ⏳ `confirmedBy` en app (Diana desde UI — papá WhatsApp ya `parent`)
6. Deploy:

```powershell
firebase deploy --only hosting,functions:whatsapp_webhook,functions:send_reminders_cron,functions:send_evening_reminders_cron
```

---

### Paso 4 — Validación en equipo (Diana / Yari)

| Prueba | Quién |
|--------|--------|
| Paciente evaluación + 3 citas (recurrencia o manual) | Yari |
| Recordatorio mañana con etapa en WhatsApp | Papá test / Yari |
| Cancelar con **2** → plantilla motivo → botón Enfermedad | Papá test |
| Sin responder motivo → alerta Yari | Yari |
| Diana confirma en app → bitácora | Diana |
| ~2 h sin confirmar → Yari manda manual | Yari (operativo) |

---

### Paso 5 — Fase C (opcional)

- Badge 2 h en Control Maestro  
- `HelpManual.js` + pop-up si hay novedad visible  
- Custom claims permisos (futuro)

---

### Resumen en una línea

**Deploy hoy → Yari plantillas C1+E1+E2+E3 → nosotros Fase A → con SIDs Fase B → pruebas Diana/Yari.**

---

## Fases de implementación

### Fase A — Datos + permiso + UI alta (1 sesión)

| # | Tarea | Archivo |
|---|--------|---------|
| A1 | Constantes etapas | `js/config/evaluationStages.js` |
| A2 | Campos perfil | `js/services/patientService.js` |
| A3 | Permiso en panel | `js/config/staffPermissions.js` ✅ |
| A4 | Selector tipo paciente | `PatientModals.js` / `ScheduleManager.js` |
| A5 | Tags en cita al agendar | `appointmentService.js`, `CalendarModal.js` |
| A6 | Título Calendar | `GoogleCalendarService.js` |
| A7 | Fix tab Equipo y permisos | `AdminSettingsModal.js` ✅ |
| A8 | UX conflicto huecos (nombre cita ocupante) | `validators.js`, `ScheduleManager.js`, `CalendarModal.js`, `CalendarSuggestions.js` ✅ |

### Fase B — WhatsApp etapas + Diana (1–2 sesiones)

| # | Tarea | Archivo |
|---|--------|---------|
| B1 | Línea etapa en 8 AM / 8 PM | `functions/main.py` |
| B2 | Plantilla Twilio variables | Meta + `main.py` content_sid |
| B3 | Handler respuestas Diana | `functions/main.py` (`whatsapp_webhook`) |
| B4 | Cron follow-up Diana 21:00 | `functions/main.py` + `firebase.json` scheduler |
| B5 | `confirmedBy` en app | `PatientActions.js`, `ReceptionControl.js` |
| B6 | Cancelación → plantilla **C1** + `cancellationReason` | `main.py` webhook |
| B7 | Deploy | `firebase deploy --only hosting,functions:whatsapp_webhook,functions:send_reminders_cron,functions:send_evening_reminders_cron` |

### Fase C — Pulido (opcional)

- ✅ Badge «sin confirmar — 2 h» en Control Maestro (`receptionUrgency.js`, `ReceptionControl.js`) — 9 jul 2026
- ✅ HelpManual + NewFeatureAlert v9.9
- ⏳ Custom claims `create_evaluation_patient` (Fase 3 permisos)
- Guía prueba Diana E2/E3: `resumen_sesion/PRUEBA_DIANA_E2_E3.md`

---

## Plan de pruebas

1. **Permisos:** Diana ve tab Equipo; Yari con `create_evaluation_patient` ve opción Evaluación; sin permiso no la ve.
2. **Alta:** Crear paciente evaluación → Firestore `treatmentType`, `evaluationStage: 1`.
3. **Agenda — recurrencia:** Paciente evaluación + semanal × 3 → 3 citas con etapas 1, 2, 3.
4. **Agenda — urgencia manual:** Mismo paciente; elegir 3 huecos en **1–2 semanas** (grilla multi-slot) → mismas etapas, fechas comprimidas.
5. **Reagendar:** Mover una cita de evaluación → conserva `stageName`; Google Calendar actualizado.
6. **Calendar:** Eventos con prefijo Entrevista / Evaluación / Entrega.
7. **8 AM mock:** `send_reminders_api` con cita mañana `isEvaluation` → texto incluye etapa.
8. **Papá confirma** por WhatsApp → `confirmedBy: parent`, ✓ en app.
9. **Diana confirma** en app → `confirmedBy: diana`, entrada bitácora.
10. **Diana responde** por celular al bot → mismo efecto en bitácora.
11. **Sam/Vero:** Reagendar cita de evaluación propia + recurrencia → permitido; hueco ocupado muestra nombre del paciente bloqueante.

---

## Archivos tocados (referencia)

| Área | Archivos |
|------|----------|
| Config | `js/config/evaluationStages.js`, `js/config/staffPermissions.js` |
| Pacientes | `js/services/patientService.js`, `js/managers/patient/PatientModals.js`, `PatientActions.js` |
| Agenda | `js/managers/ScheduleManager.js`, `js/modules/calendar/CalendarModal.js`, `appointmentService.js` |
| Calendar | `js/services/google/GoogleCalendarService.js` |
| Admin | `js/modules/admin/AdminSettingsModal.js` |
| Backend | `functions/main.py`, `functions/whatsapp_templates.py` |
| Docs | `PLAN_EVALUACIONES.md`, `PERMISOS_EQUIPO_FASE1.md`, `HelpManual.js` (al implementar UI) |

---

## Deploy

```powershell
cd d:\agbc\Ag_Pa
npm run build
firebase deploy --only hosting,functions:whatsapp_webhook,functions:send_reminders_cron,functions:send_evening_reminders_cron,functions:send_diana_eval_followup_cron
```

*Última actualización: 9 de Julio, 2026 — Fase A (frontend evaluación) implementada. Deploy hosting pendiente.*
