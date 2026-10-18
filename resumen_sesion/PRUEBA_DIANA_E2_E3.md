# Prueba end-to-end — Diana WhatsApp E2 / E3

*9 jul 2026 — usar después de deploy hosting + functions*

## Requisitos previos

- Fase A desplegada: citas con `isEvaluation: true`, `evaluationStage`, `stageName`.
- Functions desplegadas con plantillas E2/E3 (`DIANA_SESION_EVALUACION_SID`, `DIANA_SIGUIENTE_ETAPA_SID`).
- Celular de Diana registrado en `THERAPIST_PHONES['diana']` (`functions/main.py`).
- Diana responde **desde ese mismo número** (el webhook valida `_is_diana_phone`).

---

## Escenario A — E2 «¿Se realizó la sesión?» (21:00 o manual)

### 1. Preparar cita de prueba (Firestore o app)

Cita **hoy**, terapeuta **diana**, con:

| Campo | Valor |
|-------|--------|
| `isEvaluation` | `true` |
| `evaluationStage` | `1` o `2` |
| `stageName` | ej. `Entrevista — cita 1 de 3` |
| `date` | Hora **ya pasada** hoy (ej. hace 1 h) |
| `isCancelled` | `false` |
| `dianaSessionConfirmed` | ausente o `false` |
| `dianaFollowupSentAt` | ausente |

### 2. Disparar E2 sin esperar al cron 21:00

Con sesión iniciada en Parláre (Firebase Auth) o `REMINDERS_API_KEY`:

```http
POST https://us-central1-taconotaco-d94fc.cloudfunctions.net/send_reminders_api?task=diana_eval_followup
Authorization: Bearer <Firebase_ID_TOKEN>
```

Respuesta esperada: `{"sent": 1}` (o más si hay varias citas elegibles).

### 3. Diana en WhatsApp

Mensaje plantilla **E2** con botones:

- **Sí, se realizó** → payload `eval_yes`
- **No, faltó** → payload `eval_no`

### 4. Verificar

| Qué | Dónde |
|-----|--------|
| `dianaSessionConfirmed: true` | Documento `appointments/{id}` |
| `dianaSessionAttended: true/false` | Mismo documento |
| `confirmedBy: 'diana'` | Mismo documento |
| Bitácora `WHATSAPP_DIANA_SESSION` | Panel Bitácora |

---

## Escenario B — E3 «¿Otra evaluación o entrega?»

Solo si en el paso A Diana pulsó **Sí** y la cita tenía **`evaluationStage: 2`** (sesión de Evaluación).

### 1. Automático tras eval_yes

El backend envía plantilla **E3** a Diana y pone en el perfil:

- `awaitingDianaNextStage: true`

### 2. Diana responde

- **Otra evaluación** → `eval_extra` → `evaluationMeta.optionalExtraEvaluation: true`
- **Entrega de resultados** → `eval_entrega` → `evaluationStage: 3`

### 3. Verificar perfil

`patientProfiles/{id}` — flags actualizados y `awaitingDianaNextStage: false`.

---

## Si algo falla

| Síntoma | Revisar |
|---------|---------|
| No llega E2 | `dianaFollowupSentAt` ya existe; cita en futuro; no es `isEvaluation`; terapeuta ≠ diana |
| Diana escribe y no pasa nada | Número no coincide con `THERAPIST_PHONES`; payload distinto de `eval_yes`/`eval_no` |
| No llega E3 | `evaluationStage` no era `2` al confirmar «Sí» |
| 403 webhook | Firma Twilio — probar solo con botones de plantilla, no texto libre |

Logs: Firebase Console → Functions → `whatsapp_webhook` / `send_reminders_api`.

---

## Checklist rápido Yari (operativo)

- [ ] Cita hoy sin confirmar y faltan ≤2 h → badge rosa en **Control Maestro**
- [ ] WhatsApp manual enviado al papá
- [ ] Tras sesión Diana: E2 respondido
- [ ] Si fue Evaluación (etapa 2): E3 respondido
