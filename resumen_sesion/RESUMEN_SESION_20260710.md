# Resumen sesión — 10 julio 2026

## Qué se hizo

1. **Diagnóstico** — «Hora Inhábil» en Google Calendar aparecía lun–sáb porque `GoogleCalendarService` subía `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA;COUNT=24` aunque en Parláre solo existía un bloqueo puntual.
2. **Fix código** — `recurrence: []` para todos los eventos; bloqueos horarios = un evento por fecha/hora.
3. **Sync semana** — al borrar eventos de la semana, elimina el maestro de series recurrentes (`recurringEventId`).
4. **Deploy** — `firebase deploy --only hosting` (fix sync en producción).
5. **Documentación** — Manual (Inhabilitar Hora), pop-up `parlare_onboarding_v9_10`, `ANALISIS_ESTRATEGIA_MOVIL.md`, `PLAN_DE_TRABAJO.md`.

## Validación

- Sync Sam: **33 borrados, 33 recreados** — OK.
- **✅ Validado post-deploy (Daniel, 10 jul):** (1) serie vieja borrada en Google, (2) sync desde Parláre, (3) solo el día bloqueado visible — sin Hora Inhábil fantasma lun–sáb.
- Consola: `permission-denied` en listeners de notificaciones / copiloto para algunos roles — **no bloquea** la sync de Google; tema aparte de reglas Firestore.

## Pendiente validar

- Nada crítico de este fix. Opcional: segundo deploy si manual/pop-up v9.10 aún no visible en producción.

## Archivos tocados

- `js/services/google/GoogleCalendarService.js`
- `js/utils/NewFeatureAlert.js`
- `js/modules/help/HelpManual.js`
- `ANALISIS_ESTRATEGIA_MOVIL.md`
- `PLAN_DE_TRABAJO.md`

## Deploy

```powershell
cd d:\agbc\Ag_Pa
firebase deploy --only hosting
```
