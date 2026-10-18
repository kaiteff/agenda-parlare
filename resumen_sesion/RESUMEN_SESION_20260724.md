# Resumen de sesión — 24 jul 2026

## Qué se hizo
- Diagnóstico: pagos del apartado de Vero «no se enlazan» / pendientes en header.
- Confirmado en código: destino = Excel de Vero; pendientes = `sheetSynced: false` tras fallo Sheets.
- Hueco documentado: modal de agenda pide token Google **después** del confirm (vs pre-auth en lista de pacientes).
- **Sin fix de código** (acordado «nada que hacer»).
- Manual: bullet operativo pendientes Vero. Pop-up sin bump.

## Qué falta / ops
- Diana o Yari: tocar botón naranja «X pendientes» para empujar a App_Data de Vero.
- Próxima sesión (si se pide): pre-auth en `CalendarModal.handlePaymentToggle`.

## Deploy
- **Completado:** Se ejecutó `npm run build` y `firebase deploy --only hosting` exitosamente.
- **URL activa:** https://taconotaco-d94fc.web.app
