# 🗺️ Mapa del Sistema - Agenda Parláre

Este archivo es tu guía rápida para entender dónde está cada cosa. Actualizado tras la implementación de auditoría y reportes financieros (Abril 2026).

## 📁 Estructura de Archivos Principal

### 🌐 Frontend (Interfaz y Estilo)
- **`index.html`**: Esqueleto base (SPA).
- **`index.css`**: Sistema de diseño, animaciones premium y variables de color.
- **`js/components/`**: Piezas modulares de la UI:
    - `Header.js`: Gestión de Auth, filtros de terapeuta, estado de sync y accesos a Admin/Reportes.
    - `Sidebar.js`: Lista de pacientes (búsqueda rápida) y panel de navegación.
    - `MainModals.js`: Contenedor de HTML para modales (Citas, Corte de Caja, Auditoría).
    - `WhatsAppDashboard.js`: Monitor de mensajes y confirmaciones pendientes.

### ⚙️ Lógica de Negocio y Servicios
- **`js/managers/`**: Lógica central (AuthManager, PatientManager).
- **`js/services/`**: Integraciones externas:
    - `google/`: `GoogleCalendarService.js` (Sync citas) y `SheetService.js` (Sync pagos y auditoría).
    - `AuditService.js`: Motor de registro de acciones (Bitácora).
    - `SyncService.js`: Coordinador de guardado en lote y reintentos.

### 📊 Módulos Especializados (`js/modules/`)
- **`calendar/`**: Lógica del calendario (Grid, Drag & Drop, Modales de edición).
- **`reports/`**: `FinancialReport.js` (Cálculo de utilidades) y `CorteDeCaja.js` (Reconciliación diaria).
- **`admin/`**: `AdminSettingsModal.js` (Configuración de costos) y `AuditPanel.js` (Visualización de bitácora).
- **`help/`**: `HelpManual.js` (Manual de capacitación integrado).

### 📝 Documentación de Sesión (`resumen_sesion/`)
- Carpeta que contiene el histórico de avances y pendientes:
    - `RESUMEN_SESION_*.md`: Detalles técnicos de cada jornada.
    - `NEXT_STEPS_*.md`: Hoja de ruta para la siguiente sesión.

## 🔄 Flujos Críticos de Datos

1. **Firebase**: Single Source of Truth (SSOT).
2. **Google Calendar**: Espejo en tiempo real de las citas en Firebase.
3. **Google Sheets (Excel)**: 
    - **Pagos**: Se registran al marcar "Pagado".
    - **Bitácora**: Copia permanente de todas las acciones del sistema para auditoría histórica.

---
*Ultima actualización: 29 de Abril, 2026 - Auditoría y Respaldo Permanente en Sheets Completado*
