# Guía para Instalar en Otra PC

Sigue estos pasos para configurar el proyecto en tu segunda computadora.

## 1. Requisitos Previos
Asegúrate de tener instalado **Git** y **VS Code** (opcional pero recomendado).
- Para verificar si tienes Git, abre una terminal y escribe: `git --version`

## 2. Descargar el Código (Clonar)
1. Abre una terminal (PowerShell, CMD, o Git Bash).
2. Navega a la carpeta donde quieres guardar el proyecto (ej. `cd Documents`).
3. Ejecuta el siguiente comando:
   ```bash
   git clone https://github.com/kaiteff/agenda-parlare.git
   ```
4. Entra a la carpeta creada:
   ```bash
   cd agenda-parlare
   ```

## 3. Configurar la Seguridad (El paso vital)
Como protegimos tus claves, el archivo `firebase.js` no se descargará. Debes crearlo tú mismo.

1. En la carpeta `js`, verás un archivo llamado `firebase.example.js`.
2. Haz una copia de ese archivo y llámala `firebase.js`.
3. Abre `js/firebase.js` con un editor de texto (como el Bloc de Notas o VS Code).
4. Busca la parte que dice:
   ```javascript
   const firebaseConfig = {
       apiKey: "TU_API_KEY_AQUI",
       ...
   };
   ```
5. **¡Aquí es donde pegas lo de la imagen!** Borra esas líneas de ejemplo y pega el bloque de código que aparece en tu imagen (el que tiene `apiKey`, `authDomain`, etc.).
6. Guarda el archivo.

## 4. Ejecutar el Proyecto
Si tienes el script de servidor (`server.ps1`), puedes ejecutarlo igual que en tu PC principal:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
O simplemente abre el archivo `index.html` en tu navegador (aunque algunas funciones requieren un servidor local).
