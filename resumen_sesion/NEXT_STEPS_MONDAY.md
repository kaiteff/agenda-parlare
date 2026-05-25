# Agenda y Pendientes (Próximos Pasos)
*Última actualización: 25 Mayo 2026*

Esta es la hoja de ruta con todo lo que dejamos en el tintero para retomar con calma en las próximas sesiones. Las tareas completadas han sido eliminadas ("olvidadas") para no regresar a temas ya vistos.

### 1. 📊 Dashboard Financiero y Reportes
- **Objetivo**: Desarrollar la vista de resumen mensual para Diana (con vista global) y para las terapeutas individuales.
- **Estado**: Pendiente de integrar las vistas de agenda y corte de caja de una forma más ejecutiva e inteligente.

### 2. 🧹 Limpieza de Logs y Mantenimiento
- **Objetivo**: Estudiar la implementación de una Cloud Function que detecte y purgue las auditorías de "Bitácora" (`audit_logs`) y alertas muy viejas para evitar que la cuenta de Firebase se encarezca o sature con registros obsoletos.

### 3. 🤖 Copiloto Colaborativo (Backend Polling)
- **Objetivo**: Conectar las decisiones de Yari (UI) con la lógica de Python.
- **Estado Actual**: ¡UI frontend (botones de Automático, Pausa, Búsqueda) y el Freno Inicial de 10 mins (`time.sleep`) listos y desplegados!
- **Enfoque clave**: Reemplazar en el próximo sprint el `time.sleep(600)` de `space_optimizer.py` por un polling que lea la colección `copilot_overrides` cada 30 segundos. Respetar si Yari presiona "Pausar" (abortar) o "Automático" (lanzar de inmediato).
