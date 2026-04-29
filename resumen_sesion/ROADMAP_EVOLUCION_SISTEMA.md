# 🚀 Hoja de Ruta: Evolución a Parláre 100% Nativo (Plan Blaze)

Este documento detalla las mejoras estructurales que ahora son posibles gracias a la activación del **Plan Blaze** en Firebase. Estas mejoras simplificarán el sistema y aumentarán su robustez.

## 1. Migración de Render a Firebase Cloud Functions
Actualmente, el bot vive en un servidor externo (Render). Con Blaze, podemos moverlo al corazón de Google.
*   **Beneficio:** Menor latencia, mayor seguridad y eliminación de la dependencia de servidores externos.
*   **Acción:** Convertir `whatsapp_webhook.py` (Flask) a funciones de Node.js o Python dentro de Firebase.

## 2. Implementación de Google Cloud Scheduler
En lugar de depender de servicios de cron externos para los recordatorios de las 8:00 AM, usaremos el cronómetro oficial de Google.
*   **Beneficio:** Precisión absoluta y control total desde la consola de Firebase.
*   **Acción:** Programar una función de "Reminders" que se dispare automáticamente sin intervención externa.

## 3. Backups Automáticos de Base de Datos
Con el Plan Blaze, podemos configurar copias de seguridad automáticas diarias.
*   **Beneficio:** Protección total contra pérdida de datos accidentales.
*   **Acción:** Activar la exportación programada de Firestore a un bucket de Google Storage.

## 4. Auditoría Avanzada de Operaciones
Podemos usar **Google Cloud Logging** para registrar cada movimiento del bot y cada recordatorio enviado con lujo de detalle.
*   **Beneficio:** Diagnóstico inmediato si un mensaje no llega o si hay un error de cuota.

---
**Última actualización:** 23 de Abril de 2026
**Estado:** Pendiente de ejecución (Roadmap Futuro)
