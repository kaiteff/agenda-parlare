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

## 🚀 Protocolo de Despliegue (Siempre)
Al finalizar cualquier tarea o sesión, se deben ejecutar los siguientes pasos:
1. **Git Add/Commit/Push**: Asegurar que los cambios lleguen al repositorio de GitHub (y se actualice el bot en Render).
2. **Firebase Deploy**: Desplegar la versión web a Firebase Hosting.
3. **ZIP Backup**: Crear un respaldo comprimido de la sesión en la carpeta `_backups/`.
4. **Resumen de Sesión**: Crear o actualizar el archivo correspondiente en `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md`.

## 🛠️ Estándares Técnicos
- Mantener la estética premium (Rich Aesthetics).
- No eliminar comentarios existentes.
- Usar hora local de México (`America/Mexico_City`) para toda la lógica de fechas.
