# 📖 Manual de Uso y Capacitación - Agenda Parláre

> **REGLA DE ORO DE LA CLÍNICA:** 
> ### *"Lo que no está registrado en la app de Parláre, no existe en el mundo real."*

Este manual está diseñado para capacitar a todo el personal (Diana, Yari, terapeutas y recepcionistas) en el uso de la plataforma **Parláre Clinical Intelligence**. Su objetivo es garantizar la consistencia de los datos, evitar errores de sincronización y asegurar la automatización de recordatorios y reportes de comisiones.

---

## 🚨 1. La Regla de Oro: Flujo Único de Datos

### ¿Por qué no debes editar el Google Calendar manualmente?
El sistema Parláre funciona con un **flujo de sincronización de una sola dirección (Frontend/Firebase → Google Calendar)**.

*   **¿Cómo funciona?:** Cuando creas, editas, arrastras o marcas una cita como pagada en la plataforma de Parláre, los datos se guardan inmediatamente en la base de datos central (Firestore) y, en cuestión de milisegundos, el sistema actualiza el Google Calendar de la clínica.
*   **El peligro de la edición manual:** Si entras directamente a la aplicación de Google Calendar en tu celular o computadora y mueves, creas o eliminas un evento:
    1.  **Esos cambios NO se guardarán en Parláre.**
    2.  Al no registrarse en la base de datos, el bot de WhatsApp **no enviará recordatorios** al paciente.
    3.  La terapeuta **no recibirá su comisión** ni se registrará el pago para reportes de utilidades.
    4.  En la siguiente sincronización automática, Parláre **podría sobreescribir o duplicar** el evento para restaurar el estado correcto.

> [!IMPORTANT]
> **Toda acción sobre una cita (crear, mover, cancelar, pagar o justificar) debe realizarse exclusivamente a través de la aplicación web o móvil de Parláre.**

---

## 📅 2. Gestión de Agenda y Citas

### A. Crear Citas y Recurrencia
*   **Cita Única:** Haz clic en una celda vacía de la agenda, selecciona al paciente y confirma la hora.
*   **Citas Recurrentes (Seguidas):** Si un paciente asistirá de forma fija (ej. todos los lunes a las 4:00 PM):
    1.  Al crear la cita, marca la casilla **"Es una cita recurrente"**.
    2.  Selecciona el intervalo (**Semanal** o **Quincenal**).
    3.  Elige la cantidad de semanas a programar.
    4.  El sistema agendará todas las sesiones de un solo golpe, tanto en Parláre como en Google Calendar.

### B. Mover Citas (Drag & Drop)
*   **En Computadora:** Puedes arrastrar cualquier cita y soltarla en otro horario o día diferente. El sistema guardará el cambio al instante de forma segura.
*   **En Celular:** Abre la cita tocando sobre ella, selecciona el botón **Editar**, modifica la fecha/hora y guarda los cambios.

### C. Reagendado Automático Inteligente
*   Si necesitas cancelar una cita porque el paciente no puede asistir, al presionar **Cancelar**, el sistema te preguntará si deseas **Reagendar**.
*   Si seleccionas **Sí**, la aplicación te llevará automáticamente a la **siguiente semana en el mismo horario** para que encuentres el espacio rápidamente sin tener que buscar manualmente.

---

## 💬 3. Consentimiento de WhatsApp (El Semáforo de Recordatorios)

Para cumplir con las políticas de Meta y evitar bloqueos en el número de la clínica, los pacientes deben dar su consentimiento explícito para recibir recordatorios automáticos.

### El Semáforo en la Lista y Ficha de Pacientes:
*   🟢 **Verde (WhatsApp Activo):** El paciente ha autorizado los mensajes. Recibirá recordatorios automáticos normales.
*   🟡 **Ámbar/Naranja (Pendiente de Respuesta):** Se le ha enviado el mensaje de bienvenida y consentimiento. Aún no responde.
    *   *Nota:* Recibirá recordatorios automáticos provisionalmente *solo si* la casilla "Recordatorios por WhatsApp" en su ficha está marcada de forma manual.
*   🔴 **Rojo (Seguimiento Manual):** El paciente explícitamente rechazó los mensajes automáticos.
    *   **Acción requerida:** Yari debe coordinar la confirmación de manera telefónica o manual. Aparecerá una alerta persistente en el **Control Maestro**.

### Flujo con Pacientes Nuevos:
1.  Al registrar un paciente nuevo, el sistema lo crea en color **Ámbar** y desactiva la casilla de WhatsApp.
2.  Presiona el botón **Bienvenida** en su ficha para enviarle la plantilla de bienvenida por WhatsApp con botones interactivos (*"Sí, autorizo"* / *"No, prefiero manual"*).
3.  **Si responde "Sí, autorizo":** El sistema se actualiza a **Verde** y activa la casilla automáticamente.
4.  **Si responde "No, prefiero manual":** Se actualiza a **Rojo**, desactiva la casilla y envía una notificación a Yari.

---

## 💰 4. Finanzas, Comisiones y Recibos de Reembolso

### A. Corte de Caja y Comisiones
*   Cada cita tiene un costo establecido y un reparto de comisiones configurado para la terapeuta.
*   **Ajuste Manual:** Si en una cita el reparto es diferente (por ejemplo, si una terapeuta planeó la sesión y otra la ejecutó), haz clic en **Ajuste Manual** dentro del modal de la cita para especificar los montos exactos para cada una. El sistema se encargará de que la suma cuadre perfectamente con el costo total de la sesión.

### B. Recibos Digitales de Reembolso (SGMM)
Para los pacientes que cuentan con Seguro de Gastos Médicos Mayores:
1.  En la configuración de cada Terapeuta deben estar registrados su **Cédula Profesional** e **Institución de Egreso** (campos *"SaaS Ready"*).
2.  En la ficha del paciente, debe estar activada la generación automática de recibos y el nombre del **Tutor** si aplica.
3.  Al marcar la cita como **Pagada**, el sistema genera de forma automática un PDF premium firmado digitalmente con los datos clínicos en Firebase Storage.
4.  Podrás consultar o descargar el archivo desde el enlace **"Ver recibo"** dentro del detalle de la cita pagada.

---

## 🔎 5. Bitácora de Auditoría y Control

Para evitar confusiones sobre *"quién movió qué"* o *"por qué no se envió un WhatsApp"*, la bitácora es el registro definitivo:

*   **Pestaña General:** Muestra qué usuario del staff (👱‍♀️ Yari, 👩‍⚕️ Diana, etc.) creó, editó, canceló o pagó una cita.
*   **Pestaña WhatsApp:** Muestra el historial detallado de envíos:
    *   **Enviado (AM/PM):** Mensaje entregado con éxito.
    *   **Saltado (Skipped):** Explicación clara en español (ej. *"el paciente no tiene celular registrado o desactivó WhatsApp"*, o *"cita fuera de horario laboral"*).
    *   **Error:** Fallos técnicos o de conexión de red para rápido diagnóstico.

---

## 🧹 6. Limpieza y Buenas Prácticas
*   **Limpieza de Auditoría (Diana/Admin):** Para evitar cobros innecesarios en Firebase por saturación de base de datos, Diana puede usar el botón **Limpiar App** en el panel de Bitácora. Esto eliminará registros de más de 60 días.
*   *Importante:* Siempre exporta a Excel antes de realizar una limpieza si requieres conservar el historial histórico completo para reportes externos.

---

## 🚀 7. Copiloto Colaborativo (Optimizador de Espacios)

El sistema cuenta con un **Copiloto Colaborativo** para recuperar espacios perdidos por cancelaciones de última hora (8 a 24 horas antes de la cita).

1.  **Freno de 10 minutos:** Al cancelar una cita, el sistema espera 10 minutos antes de enviar ofertas. Esto te da tiempo de reasignar el lugar manualmente si ya tenías a alguien en mente.
2.  **Quiet Hours:** Si cancelas una cita en la noche (después de las 10:00 PM), el sistema no enviará mensajes de madrugada. Las notificaciones saldrán automáticamente a las 8:00 AM del día siguiente.
3.  **Adelanto de Citas:** El sistema contacta por WhatsApp a los pacientes agendados más tarde ese mismo día para ofrecerles el espacio, respetando una ventana mínima de 2 horas para que tengan tiempo de llegar.
