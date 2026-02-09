# Instrucciones para Retomar el Proyecto

Este archivo sirve como guía rápida para iniciar el desarrollo cada día.

## 1. Iniciar el Servidor

Para que la aplicación funcione correctamente (especialmente la autenticación de Google), debes iniciar el servidor local en el puerto **8081**.

Ejecuta el siguiente comando en la terminal:

```powershell
python serve.py
```

El script buscará automáticamente el puerto **8081**. Si ese puerto está ocupado, intentará otro, pero **PARA QUE FUNCIONE GOOGLE AUTH, DEBE SER EL 8081**.
Si ves que inicia en otro puerto, cierra lo que esté ocupando el 8081 e intenta de nuevo.

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
