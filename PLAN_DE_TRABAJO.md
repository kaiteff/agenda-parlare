# 🚀 Plan de Trabajo - Próxima Sesión

Este documento detalla las prioridades y pasos técnicos para las siguientes mejoras del sistema Parláre.

---

## 💎 Prioridad 1: Sistema de Justificantes y Seguimiento de Yari
**Objetivo**: Automatizar la captura de motivos de cancelación y dar herramientas de auditoría a Yari y Diana.

### Pasos a seguir:
1.  **Lógica del Bot**: 
    *   Modificar el flujo de cancelación para abrir una "ventana de escucha" de 15 min.
    *   Preguntar explícitamente por el motivo y/o justificante médico.
2.  **Manejo de Media (Fotos)**:
    *   Habilitar la descarga de imágenes desde Twilio.
    *   Vincular la URL de la imagen al documento de la cita en Firebase.
3.  **Alertas a Yari**:
    *   Notificación inmediata de "Cancelación en proceso".
    *   Alerta de seguimiento si no se recibe motivo en 15 minutos.
4.  **UI Pacientes**:
    *   Crear pestaña "Historial de Compromiso" en el perfil del paciente.
    *   Listado de razones y visualización de fotos/justificantes.

---

## ✉️ Prioridad 2: Estandarización de Respuestas y Plantillas (Templates)
**Objetivo**: Asegurar la entrega del 100% de los mensajes a padres mediante Twilio Content API.

### Pasos a seguir:
1.  **Inventario de Mensajes**: Listar todas las interacciones actuales (Confirmación, Recordatorio, Aviso de Cancelación).
2.  **Migración a Templates**:
    *   Diseñar las plantillas en la consola de Twilio para evitar el bloqueo de la "ventana de 24 horas".
    *   Definir variables `{{1}}`, `{{2}}`, etc., para personalizar con nombres y horarios.
3.  **Refactorización del Bot**:
    *   Sustituir el envío de texto plano por llamadas a `content_sid`.
    *   Implementar "Fallbacks" por si una plantilla falla.

---

## 🛠️ Prioridad 3: Mantenimiento y Calidad
*   **Limpieza de Google Calendar**: Verificar que no queden eventos duplicados tras los cambios de hoy.
*   **Optimización de Carga**: Revisar si el Sidebar carga rápido con la nueva búsqueda sin acentos.

---
*Última actualización: 07 de Mayo, 2026*
