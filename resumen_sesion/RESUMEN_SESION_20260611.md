# Resumen de sesión — 11 Junio 2026

## Qué se hizo

### 1. Fix cuota Parláre → Google Sheets
- **Problema:** Al registrar paciente con cuota $300 (o config del panel), Excel columna Parláre mostraba $250.
- **Causa:** `SheetService` y varios fallbacks tenían `250` hardcodeado.
- **Solución:** Fallbacks dinámicos con `AuthManager.getTherapistDefaults()` + `clinicFee` del perfil/cita.
- **Archivos:** `SheetService.js`, `SyncService.js`, `CalendarData.js`, `PatientActions.js`, `patientService.js`, `FinancialReport.js`, `PatientModals.js`, `PatientModalsHTML.js`.

### 2. Modales paciente — UX móvil (iPhone)
- **Problema:** Scroll en ventana muy pequeña al abrir Nuevo Paciente / expediente.
- **Causa:** Modales dentro de `#appContent` con `overflow-hidden`; Nuevo Paciente sin altura fija y bloque recibo fuera del scroll.
- **Solución:** Inyección en `document.body`, panel `92dvh`, scroll único, footer fijo, bitácora bottom-sheet, safe-area iOS.
- **Archivos:** `PatientModalsHTML.js`, `PatientModals.js`, `ComponentManager.js`, `index.css`, `HelpManual.js`.

### 3. Build
- `npm run build` ejecutado (`dist/output.css` actualizado).

## Backups locales
- `_backups/backup_20260611_1949_clinicfee_300_drive/`
- `_backups/backup_20260611_1956_modales_movil_paciente/`

## Deploy completado

- **Firebase (Hosting, Firestore y Cloud Functions)**: Desplegados exitosamente (`firebase deploy --only functions,hosting,firestore`).
- **Render (Webhook de WhatsApp)**: Sincronizado mediante `git push origin main`.


## Validar tras deploy (iPhone + Yari)

1. **Cuota:** Panel Costos → $300 → nuevo paciente → cita pagada → Excel columna H = 300.
2. **Modales:** Nuevo paciente / expediente / bitácora — pantalla casi completa, scroll fluido, botones abajo.
3. **Cola (heredado 2 jun):** cancelar hoy «debe sesión», filtro ámbar Control Maestro, bloque en expediente.

## Próximo sprint sugerido
- Cola prioridad **Fase B** (`WaitlistCopilotPanel` + backend `space_optimizer`).
- Spec: `PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md` §10.

## Docs actualizados
`ANALISIS_ESTRATEGIA_MOVIL.md`, `PLAN_DE_TRABAJO.md`, `ARQUITECTURA_FUTURA.md`, `HelpManual.js`, `SEGURIDAD_Y_VULNERABILIDADES.md` (sin hallazgos nuevos).
