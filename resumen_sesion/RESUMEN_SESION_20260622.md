# Resumen sesión — 22 Jun 2026

## Qué se hizo

1. **Bug Julian (250/400 vs 150/650)** — El modal leía `manualClinicFee` stale del documento de cita, no el perfil. Fix: `resolveEffectiveFinancials()` prioriza `patientProfiles.clinicFee` + `defaultCost`.

2. **Seguro pago Excel (A+B)**
   - Confirmación con desglose antes de Pagado / No pagado.
   - Bloqueo si cambió costo o Ajuste Manual sin **Guardar cita**.
   - Aviso si Ajuste Manual cerrado con override oculto al guardar.

3. **Excel sin permisos cruzados** — Sam puede guardar desglose en Parláre; si Excel falla, Diana/Yari sincronizan con botón naranja «X pendientes».

4. **Heredado** — Fix cancelaciones App_Data (250/-250 fantasma); cadena Ajuste Manual 21 jun.

## Archivos clave

- `js/utils/appointmentFinancials.js` (nuevo/refactor)
- `js/modules/calendar/CalendarModal.js`
- `js/modules/calendar/CalendarData.js`
- `js/modules/help/HelpManual.js`

## Validar tras deploy

- [ ] Julian: Ajuste Manual → 150 / 500
- [ ] Corrección cita pagada: Guardar → No pagado → Pagado
- [ ] Sam sin Excel Diana: pendiente + sync Diana

## Deploy

```powershell
cd d:\agbc\Ag_Pa
npm run build
firebase deploy --only hosting
```

*Build local OK 22 jun. Hosting pendiente.*
