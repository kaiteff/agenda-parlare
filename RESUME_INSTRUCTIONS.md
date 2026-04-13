# 🚀 Guía Maestra: Agenda Parlare

Este documento es el punto de partida para cada sesión. Aquí vive el estado real del proyecto.

## 📍 ¿En qué nos quedamos hoy? (13/Abril/2026)
- **Agendado Express**: Implementada multiselección de slots (puedes elegir varios días a la vez).
- **Auto-3 Meses**: Citas semanales ahora se agendan por 13 sesiones (3 meses) automáticamente.
- **Alertas de Recurrencia**: Sistema visual "RECURRENCIA POR AGOTARSE" activado para pacientes con <14 días de citas.
- **WhatsApp Estabilizado**: 
    - CORS y IDs de pacientes corregidos.
    - Plantilla oficial `recordatorio_cita` enviada a revisión en Meta/Twilio.

## 🛠️ Cómo Iniciar
1. **Servidor**: Ejecutar `python serve.py` (Debe ser puerto **8081**).
2. **Navegador**: Refrescar con **Ctrl + F5** para cargar los nuevos módulos de agendado.
3. **Adblocker**: Mantener apagado para `localhost` y `render.com`.

## 🛰️ Estado de la Infraestructura
- **Backend**: Python Flask en Render (Activo).
- **Base de Datos**: Firestore (Citas y Perfiles sincronizados).
- **WhatsApp**: Pendiente aprobación de plantilla en Twilio Content Builder.

## 📋 Próximos Pasos (ROADMAP)
1. **Activar Plantilla**: En cuanto Meta apruebe `recordatorio_cita`, actualizar `whatsapp_webhook.py` para usar el SID de la plantilla.
2. **Bot de Bienvenida**: Implementar el mensaje amable para números desconocidos (Gratis).
3. **Modo Móvil**: Optimizar la visualización de la agenda en celulares para las terapeutas.

---
*Si cerramos sesión, recuerda siempre hacer Git Push para guardar esta bitácora.*
