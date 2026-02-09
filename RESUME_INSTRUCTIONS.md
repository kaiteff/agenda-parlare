# Instrucciones para Retomar el Proyecto

Este archivo sirve como guía rápida para iniciar el desarrollo cada día.

## 1. Iniciar el Servidor

Para que la aplicación funcione correctamente (especialmente la autenticación de Google), debes iniciar el servidor local en el puerto **8081**.

Ejecuta el siguiente comando en la terminal:

```powershell
python serve.py
```

O simplemente abre el archivo `serve.py` si tienes Python asociado.

> **Nota**: No uses `server-hot.ps1` ni otros métodos antiguos. `serve.py` es el script oficial actual.

## 2. Estado Actual (Resumen)

- **Última Actualización**: Implementación de Manejo de Errores de Red y Validación de Datos.
- **Funcionalidades Clave**:
  - Sincronización con Google Sheets (Diana/Sam).
  - Indicadores visuales de estado (Nube/Check/Offline).
  - Validación de formularios (pagos $0, nombres vacíos).
- **Pendiente Inmediato**: Revisar Roadmap (`roadmap_next_steps.md`) para siguientes mejoras (Modo Móvil, WhatsApp).

## 3. Antes de Cerrar (Protocolo Diario)

Siempre ejecutar estos pasos al finalizar la sesión:

1. **Backup**: Crear copia de la carpeta en `_backups/`.
2. **Git**: Guardar cambios (`git add .`, `git commit -m "Resumen del día"`).
