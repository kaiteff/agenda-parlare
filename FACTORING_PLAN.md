# 📦 Factorización del Backend (functions/main.py)

## 1. Propósito
Este documento es **un plan de trabajo vivo** que describe, paso a paso, las acciones que debemos realizar para **factorizar y modularizar** el código de `functions/main.py`.  Cada vez que se realice un cambio o una refactorización, el plan debe actualizarse para no perder seguimiento de lo que queda pendiente.

---

## 2. Áreas de Factorización Identificadas (actuales)
| Área | Problema / Oportunidad | Acción sugerida |
|------|------------------------|----------------|
| **Importaciones y dependencias** | Gran bloque de `import` mezclado (Firebase, Twilio, Google, utils propios). | - Crear un módulo `functions/dependencies.py` que exponga: `db`, `mx_tz`, `twilio_client()`, `google_service()`.
| **Firestore Proxy** | Clase `FirestoreProxy` para evitar errores del CLI, pero se usa directamente en todo el archivo. | - Extraer a `functions/firestore_proxy.py` y usar una función `get_db()` que devuelva la instancia.
| **Manejo de zona horaria y parsing de fechas** | Código repetido para convertir strings a `datetime` con zona MX. | - Mover a `functions/date_utils.py` -> `parse_mx_datetime(date_str)` y `format_mx_date(dt)`.
| **Construcción de mensajes de WhatsApp** | Mensajes formateados en varios lugares (recordatorios, ofertas, auditoría). | - Centralizar en `functions/message_builder.py` con funciones como `build_reminder_message()`, `build_offer_message()`, `build_audit_message()`.
| **Auditoría / Logging** | Se crea manualmente un diccionario `log_entry` en varios handlers. | - Crear módulo `functions/audit_log.py` con función `log_action(action, entity_type, entity_id, details)` que incluya siempre `timestamp` y `user*`.
| **Errores y bloques `try/except`** | Repetición de `try/except` con `print` o `logger.error`. | - Unificar manejo con decorador `@handle_errors` en `functions/error_handler.py`.
| **Funciones Scheduler / Cron** | Lógica de envío de recordatorios y de procesamiento de ofertas está mezclada con Firebase triggers. | - Separar en módulos: `functions/schedulers/reminder.py`, `functions/schedulers/space_offer.py`.
| **Uso de Secrets** | `SecretParam` se declara en varios lugares. | - Centralizar en `functions/secrets.py` para crear variables como `TWILIO_SID`, `TWILIO_TOKEN`.
| **Código de pruebas / scripts auxiliares** | Algunos bloques de código están directamente en `main.py` (ej. pruebas locales). | - Mover a `functions/scripts/` y excluir de la compilación.

---

## 3. Road‑Map de Refactorización (Iterativo)
1. **Crear la estructura de paquetes**
   - `functions/utils/`
   - `functions/schedulers/`
   - `functions/scripts/`
2. **Extraer dependencias**
   - Copiar los `import` actuales a `dependencies.py`.
   - Reemplazar en `main.py` con `from .dependencies import db, mx_tz, get_twilio_client, get_google_service`.
3. **Implementar `date_utils.py`**
   - Funciones: `parse_mx_datetime`, `format_mx_date`, `format_time12h`, `format_time12h_compact` (ya existen en `dateUtils.js`).
4. **Crear `message_builder.py`**
   - Prototipo de una función:
     ```python
     def build_reminder_message(date_str, hour_str, therapist):
         return (
             "🏥 *Recordatorio de Cita*\n\n"
             f"Hola, te recordamos la cita programada para *{date_str}* a las *{hour_str}* con *{therapist}*.\n\n"
             "Responde:\n"
             "1️⃣ *OK* para confirmar\n"
             "2️⃣ *NO* para cancelar\n"
             "3️⃣ *RECEPCIÓN* para dudas\n\n"
             "¡Te esperamos! 😊"
         )
     ```
5. **Crear `audit_log.py`**
   - Función genérica que reciba `action`, `entity_type`, `entity_id` y `details` y escriba en Firestore.
6. **Crear `error_handler.py`**
   - Decorador que envuelva funciones con `try/except` y registre logs.
7. **Migrate `FirestoreProxy`**
   - Reemplazar por `def get_db(): ...` y usar en todo el código.
8. **Separar Scheduler Handlers**
   - Mover la lógica de `send_reminders_cron` y `send_reminders_api` a archivos bajo `schedulers/` y exportar con `@scheduler_fn.on_schedule`.
9. **Actualizar los imports en `main.py`** (paso de integración).  Cada vez que se haga un movimiento de código, **añadir una nota** al final de este plan indicando:
   - Qué módulo se creó.
   - Qué archivo se modificó.
   - Fecha y responsable.
10. **Ejecutar pruebas unitarias** (si existen) después de cada paso y actualizar el plan con los resultados.

---

## 4. Checklist de Factores a Verificar Tras Cada Cambio
- [ ] **Los imports** de `main.py` están limitados a los módulos de alto nivel (`from .dependencies import …`).
- [ ] **Todas las funciones** de generación de mensajes están centralizadas en `message_builder.py`.
- [ ] **Los logs de auditoría** usan exclusivamente `audit_log.log_action`.
- [ ] **Zona horaria** siempre se maneja a través de `date_utils.parse_mx_datetime`.
- [ ] **Los Cron/Scheduler** están en `functions/schedulers/` y su registro en `main.py` es sólo la importación del módulo.
- [ ] **Los Secrets** se obtienen mediante `secrets.py`.
- [ ] **El proyecto sigue pasando `pytest`** (si hay tests) y el despliegue a Firebase no falla.
- [ ] **Documentación** – Cada nuevo módulo tiene una docstring breve y está referenciada en este plan.

---

## 5. Cómo Mantener este Documento Actualizado
1. **Después de cada PR o commit** que toque la arquitectura del backend, abrir este archivo y agregar una línea bajo la sección correspondiente (por ejemplo, bajo *Crear `audit_log.py`*).
2. **Usar el formato:**
   - `YYYY‑MM‑DD – <developer> – <acción> – <referencia de commit>`
   - Ejemplo: `2026‑05‑19 – Diana – Implementado `audit_log.py` con `log_action` – commit abc123`.
3. **Marcar checklist** (✔) cuando la tarea esté completada y verificada.

---

## 6. Próximos Pasos Inmediatos (sprint 1)
- Crear `functions/dependencies.py` y mover los imports y la inicialización de Firebase/Twilio.
- Implementar `functions/date_utils.py` con `parse_mx_datetime` y `format_mx_date`.
- Refactorizar la generación del mensaje de recordatorio dentro de `main.py` usando la nueva función `build_reminder_message`.
- Actualizar `main.py` para usar `audit_log.log_action` en el bloque donde se escribe la bitácora.
- Ejecutar `npm run build` y `firebase deploy --only functions` para validar que todo sigue funcionando.

---

**Nota:** Este plan será el “source of truth” para la factoración futura. Cada vez que se realice una refactorización, actualizar el documento antes de hacer merge.
