# Roadmap: Escalabilidad y Profesionalización de Agenda Parlare

Este documento define la hoja de ruta para llevar el sistema actual a un nivel profesional, escalable y comercializable, enfocándose en el rendimiento y la mantenibilidad del código.

## 🎯 Objetivos Principales
1.  **Optimización de Rendimiento:** Asegurar que el sistema sea rápido incluso con miles de citas y pacientes.
2.  **Mantenibilidad:** Limpiar y organizar el código para facilitar nuevas funciones y correcciones.
3.  **Preparación para Venta/SaaS:** Dejar el sistema listo para poder ofrecerlo a otros consultorios o convertirlo en App.
4.  **Integraciones Pendientes:** Completar las conexiones con herramientas externas (Google).

---

## 📅 Fase 1: Optimización Inmediata (Vanilla JS)
*Objetivo: Resolver los límites de rendimiento actuales sin reescribir todo el sistema.*

### 1.1. Carga por Demanda (Lazy Loading) en Calendario
-   **Problema:** Actualmente se descargan *todas* las citas históricas al iniciar.
-   **Solución:** Modificar `calendar.js` para solicitar a Firebase solo las citas del mes que se está visualizando.
-   **Beneficio:** Carga inicial instantánea, sin importar si hay 10 años de historia.

### 1.2. Paginación de Pacientes
-   **Problema:** La lista de pacientes carga todos los registros de golpe.
-   **Solución:** Implementar "Cargar más" o paginación infinita en la lista de pacientes.
-   **Beneficio:** Menor consumo de memoria y mayor fluidez.

### 1.3. Refactorización de `calendar.js`
-   **Problema:** El archivo es monolítico (+800 líneas) y difícil de mantener.
-   **Solución:** Dividirlo en submódulos:
    -   `js/modules/calendar/CalendarUI.js` (Visualización)
    -   `js/modules/calendar/CalendarData.js` (Conexión con Firebase)
    -   `js/modules/calendar/CalendarEvents.js` (Manejo de clicks y modales)

---

## 🚀 Fase 2: Funcionalidades Pendientes e Integraciones
*Objetivo: Completar el ecosistema de herramientas.*

### 2.1. Registro de Pagos en Google Sheets
-   **Requerimiento:** Al eliminar una cita o marcar un pago, guardar el registro en un Sheet externo para contabilidad.
-   **Implementación:** Usar Google Apps Script o la API de Sheets para enviar los datos.

### 2.2. Integración con Google Calendar (Bidireccional)
-   **Requerimiento:** Que las citas de la App aparezcan en el Google Calendar de los terapeutas y viceversa.
-   **Implementación:** Sincronización mediante API de Google Calendar.

### 2.3. Carpetas de Pacientes en Google Drive
-   **Requerimiento:** Crear automáticamente una carpeta para expedientes al crear un paciente.

---

## 💎 Fase 3: Migración a Framework Moderno (El Salto a App/SaaS)
*Objetivo: Profesionalización total para venta masiva o App nativa.*

### 3.1. Selección de Tecnología
-   **Recomendación:** **React** (con Next.js) o **Vue.js**.
-   **Por qué:** Son el estándar de la industria, permiten crear PWAs (Apps Web Progresivas) de alta calidad y facilitan la migración a Apps Nativas (React Native).

### 3.2. Arquitectura de Componentes
-   Reconstruir la interfaz usando componentes reutilizables (`<Boton>`, `<TarjetaPaciente>`, `<Calendario>`).
-   Esto permite cambiar el diseño de *toda* la app tocando un solo archivo.

### 3.3. Preparación Multi-Tenant (Para Venta)
-   Adaptar la base de datos para soportar múltiples consultorios en una sola instalación (o automatizar el despliegue de instancias separadas).

---

## ✅ Estado Actual
-   [x] Agendamiento automático de nuevos pacientes.
-   [x] Visualización de horarios ocupados.
-   [x] Eliminación segura de pacientes (baja lógica/física selectiva).
-   [ ] Optimización de carga (Pendiente Fase 1).
-   [ ] Refactorización de código legado (Pendiente Fase 1).
