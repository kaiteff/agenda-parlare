# Guía de Configuración: Integración con Google Sheets

Para que la sincronización con **TUS ARCHIVOS EXISTENTES** funcione, sigue estos pasos:

## 1. Preparar tus archivos existentes

Debes hacer esto DOS VECES (una vez en el archivo de Diana y otra en el de Sam):

1.  Abre el archivo de Excel en Google Sheets.
2.  Haz clic en el botón **+** (abajo a la izquierda) para añadir una nueva hoja.
3.  **IMPORTANTE:** Cámbiale el nombre a la hoja nueva para que se llame exactamente:
    **`App_Data`**
    (Respeta las mayúsculas y el guion bajo).
4.  (Opcional) Puedes ponerle encabezados en la fila 1 para guiarte:
    *   `A1`: Fecha
    *   `B1`: Hora
    *   `C1`: Paciente
    *   `D1`: Monto
    *   `E1`: Estatus
    *   `F1`: Timestamp

*Nota: No borres tus otras pestañas de horarios, esas se quedarán igual.*

## 2. Configurar los IDs en la App

1.  Abre el archivo `js/services/google/SheetService.js`.
2.  Busca las líneas:
    ```javascript
    config: {
        spreadsheets: {
            diana: 'ID_ARCHIVO_DIANA_AQUI', 
            sam:   'ID_ARCHIVO_SAM_AQUI'
        },
        // ...
    ```
3.  **Archivo de Diana:**
    *   Ve al archivo de Diana en el navegador.
    *   Copia el ID largo de la URL (entre `/d/` y `/edit`).
    *   Pégalo en donde dice `'ID_ARCHIVO_DIANA_AQUI'`.
4.  **Archivo de Sam:**
    *   Haz lo mismo con el archivo de Sam y pégalo en `'ID_ARCHIVO_SAM_AQUI'`.

## 3. Probar

1.  Recarga la Agenda (`http://localhost:8086`).
2.  Ve al historial de un paciente de Diana.
3.  Marca una cita como "Pagada".
4.  Revisa la pestaña `App_Data` en el archivo de Diana. ¡Debería aparecer una fila nueva!

---
*Una vez verificado que los datos llegan a `App_Data`, configuraremos las fórmulas en tus horarios visuales.*
