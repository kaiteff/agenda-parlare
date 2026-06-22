# Resumen sesión — 21 Junio 2026

## Hecho y Desplegado (Antigravity)

1. **Compilación de Estilos de Tailwind CSS:**
   - Se corrió `npm run build` regenerando `dist/output.css` con total compatibilidad.

2. **Despliegue a Firebase:**
   - Ejecutado con la variable de entorno `FUNCTIONS_DISCOVERY_TIMEOUT=120` para evitar timeouts de análisis de código Python en dependencias pesadas.
   - Despliegue exitoso de **Firestore Rules & Indexes**, **Cloud Functions** y **Hosting** a la URL de producción: https://taconotaco-d94fc.web.app

3. **Correcciones del Lado del Cliente (JS/Frontend):**
   - **Fix del Desglose Financiero Manual:** El modal de Detalles de Cita respeta las cuotas manuales configuradas (`manualClinicFee`, `manualTherapistPay`, `manualPlanningPay`) en lugar de sobreescribirlas.
   - **Priorización del Perfil de Paciente:** La cuota/sesión de la cita se resuelve en base al perfil del paciente configurado en lugar de usar fallbacks genéricos de la terapeuta.
   - **Evitar Registros Financieros Fantasmas en Hojas de Cálculo (`SheetService.js` / `logAttendance`):** Se modificó la escritura de asistencia/status (Cancelar, Confirmar, Pendiente) para que envíe explícitamente `$0` en las columnas financieras de la clínica, de la terapeuta y de planeación, evitando el registro de cantidades fantasmas ($250 o -$250) en Google Sheets.

4. **Sincronización de Git & GitHub:**
   - Todos los cambios fueron commiteados y empujados a la rama `main` de GitHub de forma exitosa.
