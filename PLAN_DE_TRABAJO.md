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
*   **Optimización del Nuke de Calendario (Forward-only Sync)**: Modificar `nukeAndRebuildAll` en `GoogleCalendarService.js`. En lugar de borrar 1 año de historial, hacer que la limpieza y sincronización comience estrictamente desde el **lunes de la semana en curso** hacia el futuro. Esto evitará tiempos largos de recarga, ahorrará cuota de Google API y dejará intacto el historial visual de las terapeutas en Google Calendar.

---

## 📱 Prioridad 4: Transformación a App Móvil Nativa (Capacitor)
**Objetivo**: Convertir la SPA actual en aplicaciones para Android e iOS de forma escalonada, minimizando riesgos operativos.

### Plan de Integración en Fases:
*   **Fase 1: Preparación Base (En proceso)**: Instalar entorno Capacitor, configurar script de empaquetado (`www/`) y generar carpetas `android/` e `ios/`.
*   **Fase 2: Pruebas de Concepto**: Abrir la app localmente en un emulador de Android Studio para verificar que Firebase, logins y UI funcionen correctamente en un WebView nativo.
*   **Fase 3: Diseño y Branding**: Generar Iconos de App y pantallas de carga (Splash Screens) premium.
*   **Fase 4: Configuración OTA**: Integrar el sistema de "Over The Air" updates para permitir actualizaciones instantáneas sin pasar por la tienda en cada cambio menor.
*   **Fase 5: Despliegue en Tiendas**: Compilación final de instalables (`.aab` y `.ipa`) y subida a Google Play Console y Apple App Store Connect.

---

## 🔍 Supervisión Post-Despliegue (Cosas para Revisar)
*   **Monitoreo del Cronjob (8:00 PM)**: Revisar mañana en el dashboard de Render/Twilio que el job de esta noche no haya arrojado Error 500 y haya procesado correctamente todas las citas usando el nuevo SID con botones.
*   **Control de Errores 429**: Confirmar que los bloques `try/except` están mitigando con éxito las ráfagas de confirmaciones y ya no aparece el mensaje "Quota exceeded" para los papás.
*   **Bitácora de Recepción**: Confirmar con Yari que la nueva pestaña de WhatsApp está cargando sus envíos diarios correctamente.

---
*Última actualización: 15 de Mayo, 2026*
