# 📜 Razón del Cambio y Migración a V2
### Fecha: 16 de Mayo, 2026

Este documento detalla las razones técnicas y de arquitectura detrás de los cambios estructurales realizados en el proyecto, marcando la transición oficial de **Agenda Parláre V1** a **Agenda Parláre V2 (Móvil & SaaS Ready)**.

---

## 🔍 1. ¿Por qué la migración del disco G: (Google Drive) al disco D: (Físico)?
El proyecto se encontraba alojado en un disco virtual montado por Google Drive (`G:\My Drive\AG`). Esto causaba fallos críticos durante el desarrollo de la V2:
- **Bloqueo de Archivos (File Locks):** El cliente de sincronización de Google Drive bloqueaba en tiempo real los archivos creados por Node.js y npm, provocando que la terminal se congelara indefinidamente durante los comandos de instalación de dependencias.
- **Cuello de Botella de E/S (I/O Bottleneck):** Google Drive procesa las solicitudes de archivos mediante red virtual. Intentar copiar o escanear carpetas masivas (como `node_modules` o archivos `.git` anidados, que suman más de 380,000 archivos históricos en las carpetas de respaldos y legados) bloqueaba el Explorador de Windows.
- **Solución:** Mudar el núcleo activo del proyecto a un disco de almacenamiento físico local (`D:\agbc\Ag_Pa`) eliminando `node_modules` y carpetas heredadas pesadas (`old/` y `_backups/`), lo que permite que el desarrollo sea 100x más rápido.

---

## 📱 2. Transición a Aplicación Móvil Nativa (Capacitor)
Para expandir el uso de Agenda Parláre en celulares Android y iPhone sin incurrir en reescrituras costosas:
- **Adopción de Capacitor (de Ionic):** Se integrará Capacitor para envolver la SPA web (HTML/JS/CSS) actual en un contenedor WebView nativo, generando las carpetas base de Android Studio (`android/`) y Xcode (`ios/`).
- **Actualizaciones Over-The-Air (OTA):** Se implementará un flujo de actualización instantánea para que los cambios en la interfaz web se reflejen en los teléfonos de los usuarios sin pasar por la lenta revisión manual de las tiendas de aplicaciones.

---

## 💻 3. Adopción de Cursor.sh como IDE Oficial
A partir del **domingo 17 de Mayo de 2026**, Cursor.sh queda establecido como el entorno oficial de desarrollo del proyecto. Esto nos permitirá:
- Utilizar la indexación completa del código base (`@Codebase`) con modelos avanzados de IA (Claude 3.5 Sonnet).
- Acelerar el microdesarrollo diario gracias a Cursor Tab y la edición en pantalla con `Ctrl + K`.

---
*Este documento marca el inicio de la versión V2. Todos los cambios clave han sido commiteados en Git para asegurar la trazabilidad del proyecto.*
