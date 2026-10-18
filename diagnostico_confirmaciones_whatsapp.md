# Diagnóstico: confirmaciones WhatsApp no reflejadas en agenda

*Última actualización: 1 jul 2026 — revisión Cursor + fix aplicado en `functions/main.py`*

## Incidente reportado

Tres familias confirmaron por WhatsApp (capturas de pantalla) pero en Parláre **no apareció el ✓** de confirmación:

| Paciente | Mamá/papá | Terapeuta | Hora típica |
|----------|-----------|-----------|-------------|
| Pedro David Gutiérrez | — | Sam | 7:00 PM |
| Carlos Máximo García | — | Sam | 7:00 PM |
| Gael Cote (Muñoz del Cote) | — | Diana | 5:00 PM |

Los tres perfiles están activos, con teléfono y `wantsWhatsapp: true`. **No fue un problema de alta ni de opt-in.**

---

## Resumen ejecutivo

| # | Causa | Afecta a | Severidad |
|---|--------|----------|-----------|
| 1 | Rango de fechas del webhook incompatible con citas de tarde en UTC | Carlos, Pedro (7 PM) y cualquier cita ≥ ~6 PM | **Crítico** |
| 2 | El webhook procesaba “próxima cita” **antes** que confirmar, cuando no encontraba la cita | Los tres (UX engañosa) | **Alto** |
| 3 | Solo buscaba citas de “mañana”, no de “hoy” | Gael si respondió el día de la cita por la mañana | **Medio** |
| 4 | `update_google_calendar` usaba cuenta de servicio sin acceso a calendarios de terapeutas | Reflejo en Google Calendar (no en el ✓ de Parláre) | **Medio** |

---

## Causa 1 — Desfase UTC vs México (principal)

### Qué pasa

Las citas de **7:00 PM** (hora México) se guardan en Firestore como **día siguiente en UTC**:

- 30 jun 7 PM → `2026-07-01T01:00:00.000Z`
- 2 jul 7 PM → `2026-07-03T01:00:00.000Z`

El **cron de recordatorios (8 AM)** ya buscaba con rango amplio:

```
mañanaT00:00:00  …  (pasado-mañana)T08:00:00
```

El **webhook** (antes del fix) buscaba solo:

```
mañanaT00:00:00  …  mañanaT23:59:59   ← la cita de 7 PM queda FUERA
```

### Flujo roto

1. Robot envía recordatorio correctamente.
2. Mamá responde `1` o `OK`.
3. Webhook no encuentra la cita → **no escribe `confirmed: true`** en Firestore.
4. Agenda Parláre sigue sin ✓.

### IDs de cita verificados en audit_logs

| Paciente | ID Firestore | Recordatorio | `date` en DB |
|----------|--------------|--------------|--------------|
| Gael Cote | `RL3mubLPxZ9vf9uYt2uA` | 24 jun 8 AM | `2026-06-25T23:00:00.000Z` (25 jun 5 PM) |
| Carlos Máximo | `73ttamb3UPXz5SPlCOKn` | 29 jun 8 AM | `2026-07-01T01:00:00.000Z` (30 jun 7 PM) |
| Pedro David | `CnsiAA9fMAcTwSAGseYd` | 1 jul 8 AM | `2026-07-03T01:00:00.000Z` (2 jul 7 PM) |

---

## Causa 2 — Orden incorrecto en el webhook

Antes del fix, si `find_tomorrow_appointments` devolvía vacío, el código entraba a la rama de **“próxima cita”** (plantilla `HXe500a927…`) y **salía sin evaluar** si el mensaje era `1` / `OK`.

La familia veía respuesta del bot y podía creer que confirmó, pero Firestore no se actualizaba.

---

## Causa 3 — Solo “mañana”, no “hoy”

Si Gael respondió el **25 de junio por la mañana** (día de su cita a las 5 PM), el webhook buscaba citas del **26** (mañana), no del **25** (hoy).

---

## Causa 4 — Google Calendar (secundario)

`update_google_calendar` usaba `get_google_services()` (cuenta de servicio GCP), que **no tiene acceso** a los calendarios compartidos de Diana/Sam/Vero.

El cron `server_calendar_sync` (7 AM) sí usa OAuth (`get_user_calendar_service`) y podía corregir el ✅ en Google **al día siguiente**, pero el webhook fallaba en silencio.

**Nota:** El ✓ en la app Parláre lee `confirmed` de **Firestore**, no de Google Calendar. Si no hay ✓ en la app, la causa principal es la 1 o 2, no la 4.

---

## Lo que NO fue el problema

- Perfiles inactivos o sin WhatsApp
- Twilio sin entregar recordatorios
- Nombres distintos entre perfil y cita
- Opt-in / `recurrentOptIn` (los tres tienen `wantsWhatsapp: true`)

---

*Última actualización: 3 ago 2026 — refuerzo match nombres + recordatorio 48h + keywords*

---

## Fix adicional (3 ago 2026) — Gael Cote + regresión residual

| # | Problema | Mitigación |
|---|----------|------------|
| 1 | Nombre cita ≠ perfil (`Gael Muñoz del Cote` vs `Gael Cote`) | `_names_loosely_match` (contiene / tokens) |
| 2 | Keyword `'no'` cancelaba mensajes inocentes | Match por palabra + quitar `'no'` suelto |
| 3 | Confirmación solo hoy/mañana perdía casos con recordatorio reciente | Incluir citas con `lastReminderSentAt` ≤ 48 h |
| 4 | Match también por `phone` en la cita | Además de `patientId` / nombre |

**Relacionado (frontend, misma sesión):** cambio de horario fijo Sam (Carlos Máximo, Getzania, Jade) — bug «Agendar Ahora» + fechas UTC en `ScheduleManager` + terapeuta por defecto Diana.

**Deploy ✅ 3 ago 2026:** `npm run build` + hosting + `functions:whatsapp_webhook` (taconotaco-d94fc).

---

## Fix adicional (9 jul 2026) — regresión confirmaciones

Tras el fix del 1 jul volvió a fallar al menos un caso. Causas residuales corregidas en `functions/main.py`:

| # | Problema | Mitigación |
|---|----------|------------|
| 1 | Solo se leía `Body`; botones Twilio a veces mandan payload en `ButtonPayload` | `_incoming_whatsapp_text()` combina ambos |
| 2 | Keywords estrechas (`confirmo`, `listo`, `va` no contaban) | Lista ampliada + payloads `1`/`2` explícitos |
| 3 | Nombre de cita ≠ nombre de perfil (acentos, apellidos) | Match por `patientId` + nombre normalizado sin acentos |

**Deploy:** `firebase deploy --only functions:whatsapp_webhook`

---

## Fix aplicado (1 jul 2026)

Archivo: `functions/main.py`

### 1. Helper compartido `_tomorrow_firestore_bounds(mx_now)`

Un solo rango amplio para recordatorios y búsqueda por “mañana” local.

### 2. Nueva función `find_confirmable_appointments`

- Consulta Firestore con rango amplio (hoy → pasado-mañana 08:00).
- Filtra por **fecha local México** con `parse_mx_datetime`.
- Incluye citas de **hoy y mañana** (cubre respuesta el día de la cita).

### 3. Webhook reordenado

- Si el mensaje es confirmar/cancelar → usa `find_confirmable_appointments` **primero**.
- La plantilla “próxima cita” solo para mensajes que no son 1/2/OK.

### 4. Google Calendar en confirmación

`update_google_calendar` usa `get_user_calendar_service()` (OAuth) con fallback a service account.

### 5. Auditoría

Acciones `WHATSAPP_CONFIRM` y `WHATSAPP_CANCEL` en `audit_logs` para que Yari vea confirmaciones en bitácora.

---

## Cómo evitar que vuelva a pasar (estrategia)

### Regla de oro

> **Nunca comparar fechas de citas como strings ISO sin convertir a `America/Mexico_City`.**

Toda búsqueda por “mañana”, “hoy” o “esta semana” debe:

1. Consultar Firestore con **rango amplio** (como el cron de recordatorios).
2. Filtrar en Python con `parse_mx_datetime(apt['date']).date()`.

### Checklist antes de deploy de functions

- [ ] Cita de prueba a las **7:00 PM** → recordatorio llega → responder `1` → `confirmed: true` y ✓ en agenda.
- [ ] Cita de prueba a las **5:00 PM** → mismo flujo.
- [ ] Responder el **día de la cita** (no solo el día anterior).
- [ ] Ver en bitácora acción `WHATSAPP_CONFIRM`.
- [ ] Deploy: `firebase deploy --only functions:whatsapp_webhook`

### Mejora futura (opcional)

Guardar en Firestore un campo `dateLocal` (`YYYY-MM-DD` en MX) al crear/editar citas para consultas indexadas sin depender del string UTC. Requiere migración y cambio en frontend — no urgente si se mantiene el filtro con `parse_mx_datetime`.

---

## Comandos de deploy

```powershell
cd d:\agbc\Ag_Pa
firebase deploy --only functions:whatsapp_webhook
```

Si también se tocó el cron de recordatorios (mismo archivo):

```powershell
firebase deploy --only functions:whatsapp_webhook,functions:send_reminders,functions:send_evening_reminders
```

---

## Verificación manual post-deploy

En Firebase Console → `appointments` → documento de la cita:

- `confirmed` = `true`
- `confirmedBy` = `Robot Parláre`
- `lastBotUpdate` = `WhatsApp-Confirm`

En `audit_logs` → filtrar `WHATSAPP_CONFIRM` con el nombre del paciente.

---

## Correcciones respecto al diagnóstico inicial (Antigravity)

| Punto Antigravity | Ajuste |
|-------------------|--------|
| Solo bug UTC | Correcto para 7 PM; se añadió **bug de orden del webhook** y **solo-mañana** |
| Gael confirmado en Firestore | No verificado en este entorno sin credenciales; si no hay ✓ en app, probablemente respondió el día de la cita o entró en rama “próxima cita” |
| Fix solo en rango de fechas | Insuficiente solo; hace falta **reordenar flujo** + **hoy/mañana** + **OAuth en calendar** + **audit log** |
