# 📖 Manual de Usuario - Agenda Parlare (Terapeutas)

¡Bienvenida a tu sistema de agenda! Haz clic en cada tema para ver el detalle. Están ordenados alfabéticamente para tu comodidad.

---

<details>
<summary><b>💰 A. Ajustes de Pago y Desglose</b></summary>

Al agendar o editar una cita, verás un botón que dice **"Ajuste Manual"**. Úsalo para casos especiales:
*   **Reparto de Comisión:** Puedes especificar cuánto se queda la clínica y cuánto la terapeuta.
*   **Pago de Planeación:** Si una terapeuta planeó y otra ejecutó, aquí puedes poner el monto exacto para cada una.
*   **Balance Automático:** El sistema suma todo por ti para que coincida siempre con el costo total de la cita.
</details>

<details>
<summary><b>🔍 B. Búsqueda de Pacientes</b></summary>

El buscador de pacientes (del lado izquierdo) es inteligente y comprensivo con los errores de dedo:
*   No importa si escribes con **MAYÚSCULAS** o **minúsculas**.
*   No importa si olvidas los **acentos** (puedes escribir "jose" y el sistema encontrará a "José" sin problema).
</details>

<details>
<summary><b>📅 C. Citas y Calendario (Recurrencia)</b></summary>

El calendario tiene funciones avanzadas para ahorrarte tiempo:
*   **Citas Recurrentes:** Marca la casilla "Es una cita recurrente" para agendar varias semanas de un solo clic (ej. todos los lunes).
*   **Reagendado Automático:** Si cancelas una cita y aceptas reagendar, el sistema te saltará automáticamente a la siguiente semana en el mismo horario.
*   **Arrastrar y Soltar:** Puedes mover citas simplemente arrastrándolas a otro espacio en el calendario.
</details>

<details open>
<summary><b>👤 C. Crear un Paciente Nuevo (Guía Paso a Paso)</b></summary>

1.  **¿Dónde empiezo?:** Haz clic en el botón azul con el símbolo **"+"** en la esquina superior derecha del panel de pacientes.
2.  **Llenado:** Ingresa el nombre (el sistema pone mayúsculas solo), terapeuta, costo y el WhatsApp (10 dígitos).
3.  **¿Qué pasa al finalizar?:** Al hacer clic en "Crear Paciente", el sistema lo guarda y **abre automáticamente la ventana de agendar** para su primera sesión. 
    *   *Nota sobre WhatsApp:* Los pacientes nuevos inician con recordatorios automáticos desactivados (`wantsWhatsapp = false`) y estado de consentimiento `Pendiente`. Al crearse, el sistema les envía la plantilla de bienvenida solicitando su autorización. Cuando respondan "Sí, autorizo", el sistema activará automáticamente los recordatorios. Si necesitas activarlos inmediatamente sin esperar a la respuesta del WhatsApp (por ejemplo, con pacientes antiguos), puedes marcar la casilla manual "Recibir recordatorios automáticos" en la ficha del paciente.
</details>

<details>
<summary><b>🟢 G. Google Sync (Tu Semáforo)</b></summary>

*   **Verde:** Todo bien. Tus citas se ven en tu celular.
*   **Rojo:** Permiso expirado. Haz clic para volver a entrar con tu cuenta de Google.
</details>

<details>
<summary><b>📋 H. Historial y Auditoría</b></summary>

Dentro de cada cita puedes ver quién hizo cambios:
*   Quién confirmó la asistencia.
*   Si el paciente canceló por WhatsApp o fue cancelado manualmente.
*   A qué hora se realizaron los cambios.
</details>

<details>
<summary><b>💚 J. Justificación Médica (Inasistencias)</b></summary>

Para inasistencias por salud de los pacientes, el sistema permite cargar justificantes médicos para evitar que se aplique el cargo de la sesión:
*   **Cómo Justificar:** Abre la cita cancelada en el calendario, activa la casilla **"Inasistencia Justificada (No cobrar)"** (se guarda instantáneamente) y arrastra o haz clic en la zona punteada para subir el justificante (imagen o PDF) directamente a Firebase Storage de forma gratuita.
*   **Auditoría Visual:** Las citas justificadas aparecerán en el historial de citas del paciente con una etiqueta verde premium: **`💚 Justificada`** en lugar de la etiqueta roja de cancelada normal.
*   **Ahorro de Espacio:** Para mantenernos siempre en el plan gratuito de Storage (5GB), los justificantes médicos se eliminan de forma automática del servidor al cumplir los **120 días de antigüedad**.
</details>

<details>
<summary><b>📱 M. Mensajes Diarios (WhatsApp)</b></summary>

Cada mañana a las 8 AM recibes tu reporte. Iconos:
*   ✅ = Confirmado.
*   ⏳ = Pendiente.
*   📩 = Recordatorio enviado.
</details>

<details>
<summary><b>🔄 R. Relevos de Terapeutas (Handover)</b></summary>

Cuando veas `~~D~~ / S`:
*   **Tachado:** Terapeuta que planeó (comisión de planeación).
*   **Activa:** Terapeuta que atiende (pago por sesión).
</details>

<details>
<summary><b>⛔ T. Tipos de Sesión y Bloqueos</b></summary>

*   **Inhabilitar Hora:** Úsalo para bloquear tus horarios de comida o compromisos personales.
*   **Vacaciones / Día Completo (Premium 🔒):** El candado **🔒** de cada día abre un modal premium diseñado para registrar ausencias rápido y sin errores:
    *   **Atajos rápidos (🆕 25 may noche):** Cuatro chips arriba del modal — `Hoy`, `Esta semana`, `Próxima semana`, `2 semanas` — rellenan automáticamente las fechas y activan «Todo el día» para rangos largos. Útil para vacaciones de una o dos semanas con un solo toque.
    *   **Tipo de ausencia con cards visuales (🆕):** Cinco tarjetas (Vacaciones · Médica · Capacitación · Personal · Otro) con icono grande. La seleccionada se enmarca en azul y se ilumina ligeramente.
    *   **Rango de fechas:** Bloquea varios días seguidos con un solo clic. Los domingos se excluyen solos del conteo de días hábiles.
    *   **Todo el día o rango horario:** Toggle en pill (con icono 🕒) para elegir si cubre todo el día o un bloque (ej. 2 PM a 5 PM). Si pones hora fin antes que inicio, los selects se marcan en rojo al instante (no hay que esperar a guardar).
    *   **Tarjeta resumen (🆕):** Antes de confirmar ves el resumen exacto, ej. `🏖️ Vacaciones · Sam · lun 25 → sáb 30 · 6 días hábiles · Todo el día`.
    *   **Banner verde «Sin citas afectadas» (🆕):** Te tranquiliza confirmando que nadie quedará colgado en el rango elegido.
    *   **Banner ámbar de citas afectadas:** Si hay niños agendados, los muestra con nombre y horario para que Yari/Diana decidan reagendar o cancelar.
    *   **Botón Confirmar premium (🆕):** Gradient azul→índigo con icono candado y animación al presionar. En iPhone respeta el safe-area (no queda debajo del home indicator).
    *   **Seguridad y Validación (S-011 a S-014):**
        *   Sanitización automática de nombres de pacientes para evitar XSS.
        *   Escritura rápida y atómica mediante lotes Firestore (`writeBatch`), reduciendo tiempos de espera al bloquear varios días.
        *   Validación horaria estricta (no permite hora fin menor o igual que hora inicio).
        *   Chequeo en memoria para evitar registrar bloqueos duplicados en las mismas horas.
    *   **Permisos:** Diana (Admin) y Yari (Recepción) pueden inhabilitar horarios para cualquier terapeuta. Las terapeutas (Vero y Sam) solo pueden registrar ausencias para su propia agenda (select bloqueado).
    *   *Tip operativo:* Para vacaciones largas usa el atajo **«Esta semana»** o **«Próxima semana»** y déjalo en «Todo el día». Si necesitas bloquear solo unas horas, hazlo día por día (mientras pulimos la sincronización con Google Calendar).

> **📝 Ejemplo paso a paso — «Me voy de vacaciones la próxima semana»**
>
> Practica con esta secuencia para confirmar que todo se ve y funciona bien (en tu compu o en tu celular):
>
> 1. Abre el calendario y **toca el candado 🔒** en el encabezado de cualquier día.
> 2. En el chip de atajos rápidos, toca **«Próxima semana»**. Las dos fechas se rellenan solas (Lun → Sáb) y *«Todo el día»* se activa automáticamente. ✅
> 3. En las cards de tipo, toca **«🏥 Médica»**. La tarjeta se enmarca en azul y se ilumina ligeramente. ✅
> 4. Mira la **tarjeta indigo «Resumen»**: debe decir algo como `🏥 Médica · Sam · lun 25 → sáb 30 · 6 días hábiles · Todo el día`. ✅
> 5. Si no hay niños agendados en ese rango, aparece la **barra verde «Sin citas afectadas en este rango.»** ✅ — Si hay niños, ves la **tarjeta ámbar** con sus nombres y horarios para decidir qué hacer antes de guardar.
> 6. **Prueba la validación:** destilda *«Todo el día»*, escoge hora inicio **10 AM** y hora fin **8 AM** → los dos selectores se enmarcan en rojo al instante. Si tratas de guardar, te avisa. ✅ Corrige la hora fin a **1 PM** y los bordes se quitan solos.
> 7. Toca **«Confirmar Bloqueo»** (botón con gradient azul→índigo y candado). En iPhone el botón no queda tapado por el home indicator. ✅
> 8. Aparece una confirmación con el resumen. Acepta y verás los bloques en tu calendario.
>
> *¿Algo se ve mal en celular? Avísale a Daniel con una captura — estamos refinando móvil semana a semana.*
*   **Visita a Escuela:** Opción especial para sesiones fuera de la clínica.
</details>

<details>
<summary><b>📞 T. Teléfonos y WhatsApp</b></summary>

*   **Solo 10 Dígitos:** No pongas el "52" al inicio.
*   **Bandera:** Elige el país antes de escribir el número.
*   **Privacidad:** Los mensajes nunca llevan el nombre del paciente, solo fecha y hora.
*   **Consentimiento (Opt-In):** Todo paciente nuevo o al que le envíes el mensaje de **Bienvenida** de forma manual iniciará con recordatorios inactivos. Se activarán solos en cuanto el papá/mamá responda autorizando al bot, o bien si tú activas manualmente la casilla "Recibir recordatorios automáticos" en su expediente.
</details>

---

## 🆘 ¿Necesitas ayuda?
Si algo no funciona, contacta a Soporte Técnico.
*Última actualización: 25 de Mayo, 2026 (noche — Fase 1.5 Ausencias UX premium: atajos rápidos, cards de tipo con destaque azul, tarjeta resumen indigo con conteo de días hábiles, banner verde de tranquilidad, validación horaria visual en tiempo real, botón Confirmar con gradient + candado).*
