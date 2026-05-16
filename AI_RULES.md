# 🤖 Protocolo para el Asistente AI (Antigravity)

Este archivo contiene reglas críticas que DEBEN seguirse en cada sesión de desarrollo para mantener la integridad y usabilidad del sistema Parláre.

## 📝 REGLA DE ORO: Actualización del Manual
Cada vez que realices un cambio en la interfaz, funcionalidad principal o flujo de trabajo del usuario, **DEBES actualizar el Manual de Usuario** ubicado en:
`js/modules/help/HelpManual.js`

## 📐 REGLA DE ORO 2: Actualización del Documento de Visión
Cada vez que se implemente una mejora importante, se descubra un bug crítico o surja una nueva idea de arquitectura, **DEBES actualizar `VISION_PARLARE_V2.md`**. Este documento es el contexto vivo del proyecto para cualquier asistente de IA (Cursor, etc.).

### Qué actualizar en VISION_PARLARE_V2.md:
- Nuevas reglas críticas aprendidas de bugs reales.
- Cambios en IDs de servicios (Sheets, Calendar, Firebase).
- Ideas de arquitectura o mejoras futuras discutidas en sesión.
- Decisiones técnicas importantes (ej: cambio de estrategia de sync).
- Optimizaciones implementadas o pendientes.

### Qué actualizar:
- Nuevas pestañas o botones en el Sidebar.
- Cambios en la lógica de confirmación o recordatorios de WhatsApp.
- Nuevas secciones administrativas o de reportes.
- Cualquier cambio que afecte cómo la terapeuta o Yari interactúan con la página.

## 🚀 Protocolo de Despliegue ("Alistémonos para irnos")
Al finalizar cualquier tarea o sesión, se deben ejecutar obligatoriamente los siguientes pasos:
1. **Manual Check**: Verificar si los cambios realizados requieren actualizar el manual de ayuda en `js/modules/help/HelpManual.js`.
2. **Vision Check**: Verificar si los cambios o ideas de la sesión requieren actualizar `VISION_PARLARE_V2.md` (nuevas reglas, IDs, decisiones de arquitectura, optimizaciones).
3. **Git Add/Commit/Push**: Asegurar que los cambios lleguen al repositorio de GitHub (esto dispara la actualización automática del bot en Render).
4. **Firebase Deploy**: Desplegar la versión web a Firebase Hosting si hubo cambios en el frontend.
5. **ZIP Backup**: Crear un respaldo comprimido de la sesión (ej: `Backup_Parlare_YYYYMMDD_Final.zip`).
6. **Resumen de Sesión**: Crear el archivo de cierre en `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md`.
## 💻 ENTORNO DE DESARROLLO: Cursor.sh (Desde 17 de Mayo 2026)
A partir del **domingo 17 de Mayo de 2026**, el desarrollo de la V2 se realiza de manera centralizada utilizando **Cursor.sh** como el entorno e IDE de cabecera.
- **Sincronización de IA**: Cualquier asistente de IA debe estar consciente de que estamos trabajando en Cursor.sh y coordinar de manera armónica las sugerencias de la IA interna de Cursor con los cambios de arquitectura globales.
- **Seguimiento de Cambios**: Revisar siempre los cambios locales hechos desde Cursor antes de realizar despliegues o actualizaciones de bases de datos.

## 🛠️ Estándares Técnicos
- Mantener la estética premium (Rich Aesthetics).
- No eliminar comentarios existentes.
- Usar hora local de México (`America/Mexico_City`) para toda la lógica de fechas.
- **Google Calendar Sync**: Ante cambios de terapeuta o errores 404, usar estrategia "Borrar Anterior + Crear Nuevo" en lugar de solo actualizar. Siempre buscar huérfanos por Nombre/Fecha si el ID no responde.
- **Zonas Horarias**: NUNCA usar `toISOString()` para cálculos de rangos diarios en `syncWeek`; usar siempre formato local `YYYY-MM-DD` para evitar saltos de día por UTC.
- **UI Grid vs Sidebar**: Las citas canceladas se OCULTAN de la cuadrícula central para liberar espacio visual, pero se MANTIENEN en el sidebar con etiqueta roja para control administrativo.
- **Pestaña Dinámica**: La lógica de "Próxima Cita" debe saltar días sin citas ACTIVAS, pero mostrar TODO (activas+canceladas) una vez aterrizada en el día correcto.
- **Refactorización Segura**: Al modificar funciones de filtrado como `_groupByPatient`, verificar rigurosamente que no se eliminen variables de contexto (como `existing` o `aptTime`).
