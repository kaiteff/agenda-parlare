# Resumen de sesión — 3 agosto 2026

## Qué se hizo

1. **Cambio de horario fijo (Sam)** — Carlos Máximo García, Getzania Ivonne, Jade Jarquin.
   - Bug: «Agendar Ahora» sombreaba `ScheduleManager` con `import()` Promise.
   - Bug: fechas con `toISOString()` (UTC) y terapeuta a veces `diana` → toast OK, agenda Sam vacía.
   - Baja: limpia citas por `patientId`/`profileId` + nombre; tras reactivar ofrece agendar.
2. **Confirmaciones WhatsApp (Gael Cote)** — match flojo de nombres, recordatorio ≤48 h, keywords por palabra (sin `no` suelto).
3. **Docs** — HelpManual, ANALISIS, PLAN, diagnostico WA, SEGURIDAD.
4. **Pop-up** — sin bump (fix operativo; instrucción en manual).

## Deploy

| Qué | Estado |
|-----|--------|
| `npm run build` | ✅ |
| Hosting | ✅ `https://taconotaco-d94fc.web.app` |
| `functions:whatsapp_webhook` | ✅ (con `FUNCTIONS_DISCOVERY_TIMEOUT=60`) |

## Validar mañana / en clínica

1. Recarga forzada.
2. Uno de los 3 peques: **sin dar de baja** → Agendar Ahora → Semanal → toast «…con SAM».
3. Gael: mamá confirma recordatorio → ✓ en agenda + bitácora `WHATSAPP_CONFIRM`.

## Archivos tocados

- `js/managers/ScheduleManager.js`
- `js/managers/patient/PatientModals.js`
- `js/managers/patient/PatientActions.js`
- `js/services/patientService.js`
- `js/modules/calendar/CalendarModal.js`
- `js/modules/help/HelpManual.js`
- `functions/main.py`
- Docs vivos + `diagnostico_confirmaciones_whatsapp.md`

Backup: `_backups/backup_20260803_2059_fix_horario_confirm_sam`
