# 🏁 CHECKPOINT: Migración a D y Plan de Arranque Móvil
### (Última actualización: 16 de Mayo, 2026 - 17:18 Local México)

> **¡Hola! Si estás leyendo esto es porque ya es "mañana" (o tu siguiente sesión de desarrollo).**
> Este documento contiene el estado exacto donde nos quedamos hoy y la lista de tareas inmediata para reanudar el trabajo en el nuevo disco físico `D:\agbc\Ag_Pa`.

---

## 📍 Estado de la Migración
*   **Origen:** `G:\My Drive\AG` (Google Drive - Congelado por lentitud de archivos).
*   **Destino:** `D:\agbc\Ag_Pa` (Disco físico - ¡Listo!).
*   **Archivos Copiados Limpios (Hecho por Daniel):**
    *   `js/`, `dist/`, `assets/`, `resumen_sesion/`
    *   `index.html`, `index.css`, `package.json`, `firebase.json`, `firestore.rules`
    *   `AI_RULES.md`, `VISION_PARLARE_V2.md`, `PLAN_DE_TRABAJO.md`
    *   `whatsapp_webhook.py`, `serve.py`, `tailwind.config.js`, `favicon.ico`
    *   *(Excluidos exitosamente: `.git`, `node_modules`, `.firebase`, `old`, `_backups` para evitar lentitud).*

---

## 📋 Lista de Pasos Inmediatos para Iniciar Hoy

Sigue estos pasos en orden para arrancar el motor en tu nueva carpeta:

### 1. Preparar Cursor y Dependencias
- [ ] **Paso 1.1:** Abre **Cursor.sh** (Asegúrate de estar con el Plan Pro activo).
- [ ] **Paso 1.2:** Abre la nueva carpeta en **D:** (`File > Open Folder...` y selecciona `D:\agbc\Ag_Pa`).
- [ ] **Paso 1.3:** Abre la terminal integrada de Cursor (`Terminal > New Terminal`).
- [ ] **Paso 1.4:** Corre el comando de instalación de librerías:
  ```bash
  npm install
  ```
  *(Verás que en este disco físico se instalará todo en menos de 1 minuto).*

### 2. Inicializar Capacitor (Fase 1 Móvil)
- [ ] **Paso 2.1:** Escríbeme en el chat de Cursor: *"Ya estoy en D con Cursor Pro y npm install listo. Ejecuta la Fase 1"*.
- [ ] **Paso 2.2:** Yo enviaré el comando para inicializar Capacitor y crear las carpetas de Android e iOS (tú solo le darás a **"Aprobar"** en la interfaz):
  ```powershell
  npx cap init "Agenda Parlare" "com.parlare.app" --web-dir www
  npm install @capacitor/android @capacitor/ios
  npx cap add android
  npx cap add ios
  ```

### 3. Pruebas y Compilación (Fase 2 Móvil)
- [ ] **Paso 3.1:** Abriremos **Android Studio**.
- [ ] **Paso 3.2:** Importaremos la carpeta recién generada en `D:\agbc\Ag_Pa\android`.
- [ ] **Paso 3.3:** Encenderemos el emulador de Android Studio para ver la app nativa corriendo localmente por primera vez.

---
*¡El plan está perfectamente trazado y listo para despegar! Buen provecho y nos vemos en la siguiente sesión.*
