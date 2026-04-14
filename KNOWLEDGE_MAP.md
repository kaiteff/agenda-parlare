# 🗺️ Mapa del Sistema - Agenda Parláre

Este archivo es tu guía rápida para entender dónde está cada cosa tras la Gran Refactorización de Abril 2026.

## 📁 Estructura de Archivos

### 🌐 Frontend (Interfaz)
- **`index.html`**: Solo contiene el esqueleto. Si quieres cambiar la estructura base, es aquí.
- **`index.css`**: Contiene todos los estilos, animaciones y colores.
- **`js/components/`**: Las piezas modulares de la UI:
    - `Header.js`: Barra superior, usuario, filtros y estado de sync.
    - `Sidebar.js`: Lista de pacientes y acciones rápidas.
    - `MainModals.js`: Modales de Calendario, Corte de Caja y Reportes.
    - `ComponentManager.js`: El orquestador que inyecta todo al cargar.

### ⚙️ Lógica y Datos
- **`js/app.js`**: El punto de entrada principal. Coordina la carga.
- **`js/firebase.js`**: Configuración de la base de datos.
- **`js/managers/`**: Manejadores de lógica de negocio (Pacientes, Auth, Pagos).
- **`js/modules/`**: Módulos especializados (Calendario, Reportes, WhatsApp).

### 🤖 Automatización y Bot
- **`whatsapp_webhook.py`**: El motor del bot en Render.
- **`render.yaml` / `requirements.txt`**: Archivos de despliegue para el bot.

## 🔄 Flujo de Sincronización
1. **Firebase**: Es la verdad absoluta. Todo se guarda aquí primero.
2. **Google Calendar**: Se sincroniza al crear/editar citas (si hay sesión iniciada).
3. **Google Sheets**: 
    - Pagos individuales se sincronizan al marcar como "Pagado".
    - Si falla o estás offline, usa el **Botón Naranja** en el Header para sincronización masiva.

---
*Ultima actualización: 14 de Abril, 2026 - Fase de Modularización Completa*
