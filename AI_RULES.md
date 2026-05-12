# 🤖 Protocolo para el Asistente AI (Antigravity)

Este archivo contiene reglas críticas que DEBEN seguirse en cada sesión de desarrollo para mantener la integridad y usabilidad del sistema Parláre.

## 📝 REGLA DE ORO: Actualización del Manual
Cada vez que realices un cambio en la interfaz, funcionalidad principal o flujo de trabajo del usuario, **DEBES actualizar el Manual de Usuario** ubicado en:
`js/modules/help/HelpManual.js`

### Qué actualizar:
- Nuevas pestañas o botones en el Sidebar.
- Cambios en la lógica de confirmación o recordatorios de WhatsApp.
- Nuevas secciones administrativas o de reportes.
- Cualquier cambio que afecte cómo la terapeuta o Yari interactúan con la página.

## 🚀 Protocolo de Despliegue ("Alistémonos para irnos")
Al finalizar cualquier tarea o sesión, se deben ejecutar obligatoriamente los siguientes pasos:
1. **Manual Check**: Verificar si los cambios realizados requieren actualizar el manual de ayuda en `js/modules/help/HelpManual.js`.
2. **Git Add/Commit/Push**: Asegurar que los cambios lleguen al repositorio de GitHub (esto dispara la actualización automática del bot en Render).
3. **Firebase Deploy**: Desplegar la versión web a Firebase Hosting si hubo cambios en el frontend.
4. **ZIP Backup**: Crear un respaldo comprimido de la sesión (ej: `Backup_Parlare_YYYYMMDD_Final.zip`).
5. **Resumen de Sesión**: Crear el archivo de cierre en `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md`.

## 🛠️ Estándares Técnicos
- Mantener la estética premium (Rich Aesthetics).
- No eliminar comentarios existentes.
- Usar hora local de México (`America/Mexico_City`) para toda la lógica de fechas.
- **Google Calendar Sync**: Ante cambios de terapeuta o errores 404, usar estrategia "Borrar Anterior + Crear Nuevo" en lugar de solo actualizar. Siempre buscar huérfanos por Nombre/Fecha si el ID no responde.
- **Zonas Horarias**: NUNCA usar `toISOString()` para cálculos de rangos diarios en `syncWeek`; usar siempre formato local `YYYY-MM-DD` para evitar saltos de día por UTC.
- **UI Grid vs Sidebar**: Las citas canceladas se OCULTAN de la cuadrícula central para liberar espacio visual, pero se MANTIENEN en el sidebar con etiqueta roja para control administrativo.
- **Pestaña Dinámica**: La lógica de "Próxima Cita" debe saltar días sin citas ACTIVAS, pero mostrar TODO (activas+canceladas) una vez aterrizada en el día correcto.
- **Refactorización Segura**: Al modificar funciones de filtrado como `_groupByPatient`, verificar rigurosamente que no se eliminen variables de contexto (como `existing` o `aptTime`).
