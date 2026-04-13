# Instrucciones Maestras de Inicio (Contexto Permanente)

## 🏁 Estado del Proyecto
- **Frontend (UI)**: GitHub Pages (`https://kaiteff.github.io/agenda-parlare/`)
- **Backend (WhatsApp/API)**: Render (`https://parlare-webhook.onrender.com/`)
- **Base de Datos**: Firebase Firestore (taconotaco-d94fc)
- **Repositorio**: `kaiteff/agenda-parlare` (Rama: `main`)

## 🧠 Comportamiento Esperado al "Iniciar"
Cuando el usuario diga "Iniciar", "Server ON", o palabras similares de arranque diario, el asistente debe:
1.  **Reconocer el Entorno**: Saber que el código base está en `G:\My Drive\AG`.
2.  **Validar Estado**: No preguntar "¿en qué nos quedamos?", sino revisar el `PLAN_MANANA.md` y proponer la continuación inmediata de las tareas pendientes.
3.  **Deploy Automático**: Recordar que cualquier cambio en JS/HTML requiere `git push` para actualizar la web de las terapeutas y cualquier cambio en Python requiere el mismo `git push` para Render.

## 👥 Roles y Seguridad
- **Admin**: Daniel (Acceso total)
- **Profesionales**: Sam, Vero (Solo ven sus propias citas y pacientes activos)
- **Notificaciones**: El bot de WhatsApp (V7.8) gestiona confirmaciones automáticas basadas en palabras clave (1, 2, 3).
