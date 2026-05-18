# 📖 Manual de Usuario: Plataforma de Gestión Clínica Parláre V2

Este manual está diseñado para capacitar a la administración de la clínica (**Daniel**) y al personal de recepción (**Yari**) en el uso operativo de la plataforma web de Parláre V2. Detalla cada módulo de la interfaz, los flujos de trabajo diarios, la facturación digital de reembolso y las automatizaciones inteligentes.

---

## 🎨 Arquitectura y Estilo Visual
Parláre V2 está construida con una interfaz premium responsiva, estilizada con una paleta de colores armónicos (tonos índigo, azul y pizarra), adaptada al 100% para computadoras de escritorio y dispositivos móviles (tablets y smartphones). 

Los modales principales se abren como elegantes **Bottom-Sheets** en celulares (deslizando desde abajo), optimizando el espacio táctil y preparando la aplicación para su conversión nativa con Capacitor.

---

## 🗺️ Índice de Módulos
1. [Módulo 1: Acceso y Seguridad (Login)](#1-acceso-y-seguridad-login)
2. [Módulo 2: Panel Lateral (Sidebar) y Expedientes de Pacientes](#2-panel-lateral-sidebar-y-expedientes-de-pacientes)
3. [Módulo 3: Agenda e Interacción con el Calendario](#3-agenda-e-interacción-con-el-calendario)
4. [Módulo 4: Caja, Comisiones y Recibos Digitales de Reembolso](#4-caja-comisiones-y-recibos-digitales-de-reembolso)
5. [Módulo 5: Centro de Control Maestro (Integración Google)](#5-centro-de-control-maestro-integración-google)
6. [Módulo 6: Monitoreo de Alertas del Autopilot (Waitlist)](#6-monitoreo-de-alertas-del-autopilot-waitlist)

---

## 1. Acceso y Seguridad (Login)

### 🔐 Pantalla de Inicio
*   **Acceso Autorizado:** La plataforma está integrada con **Firebase Auth**. Solo los usuarios registrados con correos electrónicos autorizados pueden acceder a las agendas y expedientes médicos.
*   **Google Sign-In:** Para mayor comodidad, puedes presionar el botón "Ingresar con Google" usando tu correo corporativo institucional.
*   **Sesiones de Larga Duración:** El inicio de sesión se mantiene activo de forma segura en el navegador local, evitando tener que re-autenticarse constantemente en el celular durante la jornada clínica.

---

## 2. Panel Lateral (Sidebar) y Expedientes de Pacientes

El panel izquierdo (en desktop) o el menú deslizable (en móvil) es el centro de datos de tus pacientes.

```
+------------------------------------------+
| 🔍 Buscar Paciente...                     |
|                                          |
| [➕ Nuevo Paciente]                       |
+------------------------------------------+
| Pacientes Recientes:                     |
| 🟢 Juan Pérez (Diana)  [Recurrent Opt-in] |
| 🟡 María Gómez (Sam)   [Pendiente Opt-in] |
| 🔴 Luis Torres (Vero)   [Manual / Opt-out]|
+------------------------------------------+
```

### 👤 Registro de Nuevo Paciente
1.  Presiona el botón **"➕ Nuevo Paciente"**.
2.  Ingresa los campos requeridos:
    *   **Nombre Completo del Paciente** (Niño/Niña).
    *   **Nombre del Tutor** (Mamá/Papá - *Regla de Oro: la correspondencia externa usa este nombre*).
    *   **Teléfono Celular (10 dígitos):** Ingresa los 10 dígitos locales sin espacios. El sistema le añadirá de forma automática el prefijo internacional `52` de México.
    *   **Terapeuta Asignada:** Selecciona a quién pertenece el caso clínico (Diana, Sam o Vero).
    *   **Costo de la Sesión:** Tarifa personalizada acordada con el paciente.
3.  Al guardar, se ejecuta el **Trigger de Bienvenida**: El paciente se guarda en Firestore y, de manera inmediata, **el bot de WhatsApp le envía la plantilla de bienvenida interactiva** para solicitar consentimiento.

### 🚦 Semáforo de Consentimiento WhatsApp (`recurrentOptIn`)
En la lista de pacientes y dentro de cada ficha clínica, verás un indicador visual (badge/punto de color):
*   🟢 **Verde (Aceptado):** El papá/mamá aceptó los recordatorios automáticos de WhatsApp. El cronjob diario de las 8:00 PM le enviará mensajes de confirmación de forma automática.
*   🟡 **Amarillo (Pendiente):** Se le envió la plantilla de bienvenida pero aún no ha presionado ningún botón en su WhatsApp.
*   🔴 **Rojo (Rechazado / Manual):** El paciente prefirió no recibir notificaciones automáticas o Yari desactivó la casilla. **¡Importante! El sistema bloqueará cualquier envío automático a este número para respetar su privacidad y evitar penalizaciones de Meta.**

---

## 3. Agenda e Interacción con el Calendario

El calendario interactivo muestra la distribución horaria de las terapeutas de forma visual.

```
       [ DIANA ]          [ SAMANTHA ]          [ VERÓNICA ]
09:00  [Cita Activa ⏳]   [Disponible]          [Disponible]
10:00  [Cita Activa ⏳]   [Cita Confirmada ✅]   [Bloqueo Agenda 🔒]
11:00  [Disponible]       [Disponible]          [Cita Pagada 💰]
```

### 📅 Crear y Modificar Citas
*   **Agendar:** Haz clic en cualquier espacio vacío del calendario. Se abrirá la **Ficha de Cita**. Busca al paciente por su nombre, confirma la fecha, hora y terapeuta, y presiona guardar.
*   **Arrastrar y Soltar (Reschedule):** En desktop, puedes arrastrar una cita a otra hora. El sistema validará en milisegundos que no haya colisiones de agenda y actualizará Firestore, Google Sheets y Google Calendar de forma transparente.
*   **Bloqueos de Horario:** Si una terapeuta no estará disponible (ej: junta, curso o receso), puedes crear un "Bloqueo de Agenda" para evitar que Yari agende citas por error en ese horario.

### ✅ Estados de Confirmación y Colorimetría
Las citas cambian de color y añaden emojis indicadores en tiempo real:
*   ⏳ **Amarillo (Pendiente):** Cita programada. A las 8:00 PM de la noche anterior se le enviará recordatorio automático de WhatsApp.
*   ✅ **Verde (Confirmado):** El paciente presionó el botón *"1 - Confirmar"* en su WhatsApp o Yari la marcó como confirmada manualmente. El título en Google Calendar recibe el prefijo `✅` y la celda de Sheets cambia a verde.
*   💰 **Azul (Pagado):** La sesión ya concluyó y el pago fue registrado en el sistema.
*   ❌ **Gris con Línea Cruzada (Cancelado):** Cita cancelada. Si se canceló con menos de 24 horas y más de 8 horas, **se activa el Autopilot para recuperar ese espacio libre de forma automática.**

---

## 4. Caja, Comisiones y Recibos Digitales de Reembolso

Parláre V2 cuenta con un sistema avanzado de contabilidad y facturación de reembolsos médicos para aseguradoras.

### 💰 Registrar Pago y Generar Recibo de Reembolso (Fase A)
1.  Haz clic sobre la cita concluida y abre sus detalles.
2.  Marca la casilla **"isPaid" (Pagada)**.
3.  Si el paciente tiene activa la casilla **"Auto-generar Recibos de Reembolso"** en su ficha técnica:
    *   La base de datos dispara la Cloud Function en Python.
    *   Genera un **PDF de Reembolso Premium** con logotipos institucionales, folio único y datos de cédula profesional y universidad de egreso de la terapeuta.
    *   Sube el archivo de forma segura a Firebase Storage.
    *   Aparecerá un botón azul **"📄 Descargar Recibo"** en los detalles de la cita en tu pantalla para abrir el PDF o enviárselo al cliente.
4.  Si el paciente no tiene activo el recibo automático, el pago se registra normalmente en caja, pero no genera archivo digital para ahorrar espacio.

### 📊 Corte de Caja y Comisiones (Cálculo Automático)
En la sección de reportes financieros:
*   El sistema calcula el **Corte de Caja** desglosando los ingresos totales del día o quincena.
*   **División de Comisión:** Calcula de forma automática el porcentaje que le corresponde a la Terapeuta (Sam, Vero, etc.) y la comisión restante que corresponde a la Administración de la Clínica, evitando errores de cálculo manuales al final de la quincena.

---

## 5. Centro de Control Maestro (Integración Google)

Ubicado en el panel administrativo de Daniel, el **Control Maestro** gestiona la salud de los servicios externos en la nube.

*   **Sincronizar Ahora:** Obliga al sistema a realizar una lectura en tiempo real de Firestore y actualizar las agendas de Google Calendar y las hojas de cálculo de Google Sheets.
*   **💣 Reconstrucción Total (Nuke Rebuild - Optimizado):**
    *   Si detectas alguna discrepancia o desfase en los calendarios de las terapeutas, este botón limpia las agendas de Google Calendar y las vuelve a inyectar desde Firestore.
    *   **Línea Temporal Segura:** Para evitar saturar las cuotas de la API de Google (errores 429), la limpieza ahora ocurre estrictamente **desde el lunes de la semana en curso hasta 6 meses al futuro**. Tus registros históricos pasados quedan 100% intactos y protegidos.

---

## 6. Monitoreo de Alertas del Autopilot (Waitlist)

El **Optimizador de Espacios** trabaja de forma silenciosa en el backend, pero ofrece herramientas visuales para su supervisión.

### 📋 Gestión de Alertas en Recepción
Cuando ocurra una compresión exitosa de agenda:
1.  Se inyectará un banner de alerta en el panel de Yari:
    > *"⚡ ¡Autopilot comprimió la agenda! El paciente de la sesión de las 7:00 PM aceptó adelantar su cita a las 3:00 PM (hora liberada por cancelación)."*
2.  Yari puede auditar la alerta para verificar que el calendario de Google se haya ajustado correctamente en el teléfono de la terapeuta.
3.  Presionar el botón **"Marcar como Atendido"** para archivar la alerta y mantener el panel limpio.

### 🔍 Auditoría en Firebase Console (Solo Admin)
Daniel puede revisar en cualquier momento las siguientes colecciones para trazabilidad en Firebase:
*   📁 `/space_offers`: Registra a qué celulares se les envió ofertas de adelanto, a qué hora y cuál fue su respuesta (`accepted`, `declined` o `expired` si otro paciente ganó el lugar primero).
*   📁 `/reception_alerts`: Bitácora histórica de todas las alertas automáticas creadas por el sistema.
