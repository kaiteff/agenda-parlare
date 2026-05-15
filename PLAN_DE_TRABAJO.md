# 🚀 Plan de Trabajo - Actualizado (15 Mayo 2026)

Este documento detalla el estado actual del sistema Parláre y las prioridades para las siguientes sesiones.

---

## ✅ Completado Recientemente (¡Listo!)
*   **Migración a Templates de Meta**: 
    *   Recordatorios automáticos de 8 AM con botones interactivos (`recordatorio_con_botones2`).
    *   Recordatorios manuales desde el frontend (`copy_info_proxima_cita`).
    *   Notificación de cancelaciones a Yari.
*   **Bitácora y Trazabilidad**: 
    *   Pestaña dedicada de WhatsApp para que Recepción lea los mensajes enviados.
    *   Identificación humana del staff en los historiales.
*   **Corrección de Bugs Críticos**:
    *   Guardia contra duplicados (evitando sobrecarga a Google Calendar / 429 Quota Exceeded).
    *   Ajuste de zona horaria (Drift UTC) en métricas y envíos diarios.
    *   Respuestas humanas automatizadas ("¡De nada!").

---

## 💎 Prioridad 1: Flujo Completo de Justificantes (Archivos Multimedia)
**Objetivo**: Permitir que los padres envíen su justificante médico por WhatsApp y Yari pueda auditarlo desde el sistema.

### Pasos a seguir:
1.  **Recepción de Imágenes en Bot**:
    *   Activar la "ventana de escucha" cuando el bot detecte una cancelación.
    *   Habilitar el webhook de Twilio para procesar mensajes tipo `Media` (imágenes/PDFs).
2.  **Almacenamiento y Vinculación**:
    *   Descargar la foto temporalmente y subirla a Firebase Storage.
    *   Vincular la URL de descarga al registro de la cita cancelada.
3.  **UI Control de Justificantes (Para Yari)**:
    *   Añadir botón/columna en la agenda para que Yari vea el justificante.
    *   Opción para marcar justificante como "Validado" o "Rechazado" (cobro pendiente).

---

## 📈 Prioridad 2: Panel de "Historial de Compromiso" (Pacientes)
**Objetivo**: Dar visibilidad rápida sobre el nivel de asistencia y cancelaciones previas de un paciente.

### Pasos a seguir:
1.  **UI en Perfil de Paciente**:
    *   Crear pestaña "Historial de Compromiso".
    *   Mostrar % de asistencia.
    *   Listado histórico de razones de cancelación y visualización de fotos/justificantes de ese paciente.

---

## 🛠️ Prioridad 3: Mantenimiento y Optimizaciones
*   **Dashboard de Control de Finanzas**: Validar que la nueva separación de comisiones (Clínica vs. Terapeuta) arroje los totales correctos a fin de quincena.
*   **Optimización de Carga del Calendario**: Evaluar lazy-loading si la base de datos de citas crece significativamente.

---
*Última actualización: 15 de Mayo, 2026*
