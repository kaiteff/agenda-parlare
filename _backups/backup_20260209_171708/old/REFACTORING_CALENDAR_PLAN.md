# Plan de Refactorización de Calendario

## Objetivo
Estandarizar el módulo `Calendar` siguiendo la arquitectura modular exitosa de `PatientManager`. Centralizar la lógica de negocio y efectos secundarios (como Google Sheets) en la capa de datos/acciones, dejando la UI limpia.

## Estado Actual
- `CalendarModal.js` (574 líneas) es monolítico: mezcla UI, Lógica de Negocio y Logging.
- Inconsistencia en Logging: `CalendarData` maneja logs de pagos, pero `CalendarModal` maneja logs de confirmación y cancelación.

## Cambios Propuestos

### 1. Centralizar Lógica en `CalendarData.js`
- Mover la lógica de **Logging a Sheets** para Confirmaciones y Cancelaciones desde `CalendarModal` a `CalendarData`.
- Crear métodos unificados:
  - `confirmEvent(id, currentStatus)` -> Llama al servicio y loguea en Sheets.
  - `cancelEvent(id)` -> Llama al servicio y loguea en Sheets.

### 2. Limpiar `CalendarModal.js`
- Eliminar dependencia directa de `SheetService`.
- Eliminar lógica de negocio duplicada.
- Enfocar el archivo solo en:
  - Gestión del DOM del modal.
  - Validación de formularios.
  - Llamadas a `CalendarData`.

### 3. Organizar "Smart Logic"
- Mantener la lógica de sugerencias (`analyzeAndSuggest`, `generateRescheduleOptions`) en `CalendarModal.js` por ahora, ya que está muy ligada a la UI del formulario, pero agruparla claramente.

## Archivos Afectados
- `js/modules/calendar/CalendarData.js`
- `js/modules/calendar/CalendarModal.js`

## Resultado Esperado
- Código más limpio y fácil de mantener.
- Menor probabilidad de bugs en el logging de reportes.
- Arquitectura consistente con `PatientManager`.
