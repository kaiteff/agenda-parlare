# Resumen de sesión — 14 Sep 2026

## Qué se hizo

Hotfix de producción: al **reagendar / guardar** citas en Safari (iPhone/iPad) aparecía:

`Error al guardar: null is not an object (evaluating 'recurringOptions.value')`

Causa: el select `#recurringOptions` podía no estar en el cache DOM (`null`) y el código leía `.value` sin protección, sobre todo en citas simples (sin serie).

### Cambios de código

- `CalendarState.ensureDom` — reconsulta nodos si el cache está vacío o desconectado
- `CalendarSuggestions.resolveRecurringControls` / `resetRecurrenceUi` — `?.` / `??`, default `weekly`
- `CalendarModal` — guardas en `_executeSave`; cita simple no entra a recurrencia; fallback al crear serie
- `MainModals.inject` — no duplica `#main-modals-container`
- `HelpManual.js` — nota: reagendar cita suelta no requiere marcar recurrentes

**No se borraron citas, pacientes ni datos.** Solo se endureció el guardado para que no falle.

## Deploy

```powershell
npm run build
firebase deploy --only hosting
```

✅ Completado → https://taconotaco-d94fc.web.app  
Solo **hosting** (sin functions, reglas ni Firestore).

## Pop-up / Manual

- Pop-up (`NewFeatureAlert`): **sin bump** (fix operativo)
- Manual: actualizado en sección Reagendado

## Validar en clínica (próxima)

1. iPhone/iPad: **recarga forzada**
2. Abrir cita simple → cambiar hora (chip o fecha) → **Guardar**
3. Cancelar cita → **Sí, Reagendar** → Guardar nuevo horario
4. Confirmar que ya no aparece el error de `recurringOptions`

## Backup

`_backups/backup_20260914_1051_fix_reagendar_recurringOptions`

## Docs vivos tocados

`ANALISIS_ESTRATEGIA_MOVIL.md`, `PLAN_DE_TRABAJO.md`, `ARQUITECTURA_FUTURA.md`, `HelpManual.js`
