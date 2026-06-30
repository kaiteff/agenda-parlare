# 🤖 Protocolo para el Asistente AI (Antigravity)

Este archivo contiene reglas críticas que DEBEN seguirse en cada sesión de desarrollo para mantener la integridad y usabilidad del sistema Parláre.

## 📝 REGLA DE ORO: Actualización del Manual
Cada vez que realices un cambio en la interfaz, funcionalidad principal o flujo de trabajo del usuario, **DEBES actualizar el Manual de Usuario** ubicado en:
`js/modules/help/HelpManual.js`

## 📐 REGLA DE ORO 2: Actualización del Documento de Visión
Cada vez que se implemente una mejora importante, se descubra un bug crítico o surja una nueva idea de arquitectura, **DEBES actualizar `VISION_PARLARE_V2.md`**. Es el **merge maestro** (✅ hecho + ⏳ pendiente + 🔜 visión); el detalle operativo sigue en `PLAN_DE_TRABAJO.md`, `ANALISIS_ESTRATEGIA_MOVIL.md` y `ARQUITECTURA_FUTURA.md`.

## 📱 REGLA DE ORO 3: Actualización del Análisis Móvil (Antigravity)
Cada sesión que toque la **estrategia móvil**, la **UI responsive**, **Capacitor**, **Cloud Functions / backend Firebase** (triggers, crons, recibos, Storage) o decisiones de producto sobre la app, **DEBES actualizar `ANALISIS_ESTRATEGIA_MOVIL.md`** al cierre de la tarea.

**Antigravity lee este archivo como mapa principal del roadmap** — si no se actualiza, el siguiente agente trabajará con contexto desactualizado. Regla Cursor: `.cursor/rules/analisis-estrategia-movil.mdc`.

## 📢 REGLA DE ORO 4: Duración de Pop-ups Informativos (Novedades)
Cada vez que se cree o actualice un pop-up de novedades o bienvenida (ej: `NewFeatureAlert.js`):
1. **Expiración de 2 Días:** El pop-up debe dejar de mostrarse automáticamente después de **2 días** (`MAX_DAYS_VISIBLE`) a partir de su fecha de lanzamiento o creación para evitar fatiga visual y molestias en el staff.
2. **Información Práctica:** El contenido del pop-up siempre debe actualizarse y redactarse con un enfoque claro en el beneficio y las instrucciones prácticas de uso para las terapeutas (Diana, Sam, Vero) y la recepcionista (Yari).
3. **Persistencia Local:** Utilizar `localStorage` para evitar re-renderizaciones intrusivas una vez cerrado por el usuario dentro del periodo de validez.
4. **Limpieza de claves legacy:** Cuando se cambie de versión (`STORAGE_KEY`), agregar la clave anterior a `LEGACY_KEYS` para que se borre automáticamente del navegador del usuario en el próximo arranque. Evita acumulación de claves obsoletas.
5. **Permanencia en el Manual:** Lo importante del pop-up (Regla de Oro, fixes críticos, flujos nuevos) debe vivir también en `HelpManual.js`. El pop-up es solo un destacado temporal; el manual es la referencia permanente.

## 🗺️ REGLA DE ORO 5: Alineación del Roadmap y Check de Inicio de Sesión
Al inicio de **CUALQUIER** sesión de desarrollo, mantenimiento o consulta de arquitectura:
1. **Lectura Obligatoria del Plan:** Todo asistente de IA (Antigravity, Cursor) **DEBE leer y comparar en su primer turno** los archivos `PLAN_DE_TRABAJO.md` y `ANALISIS_ESTRATEGIA_MOVIL.md` para entender con exactitud matemática el estado del proyecto, qué piezas ya están 100% listas/desplegadas y cuáles son las prioridades inmediatas.
2. **Cero Duplicación de Esfuerzos:** No intentar proponer o reescribir funcionalidades que ya estén marcadas como completadas, evitando colisiones de código y desviaciones de la arquitectura SaaS.
3. **Refactor y escritorio:** Para roadmap de agenda desktop, rendimiento y deuda técnica gradual, leer y actualizar **`ARQUITECTURA_FUTURA.md`** (registro de cambios con **para qué** y **cómo revertir**). Histórico: `old/ARQUITECTURA_FUTURA.md`.
4. **Seguridad y vulnerabilidades:** Para auditorías, hallazgos de seguridad, XSS, reglas Firestore/Storage, secretos, dependencias, leer y actualizar **`SEGURIDAD_Y_VULNERABILIDADES.md`**. Cada hallazgo lleva ID `S-XXX`, severidad y estado. Nunca borrar hallazgos cerrados (se mueven a «✅ Reforzado»). Regla Cursor: `.cursor/rules/seguridad-vulnerabilidades.mdc`.
5. **Cola prioridad (pacientes especiales):** Si la sesión habla de huecos libres, «deben cita», lista de espera, Copiloto ampliado o prioridad de agendado, **mencionar** la propuesta documentada en **`PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md`** (semana en curso, horario similar ±3 h, sin sábado, debe 1..N sesiones). No implementar sin decisión de dirección; actualizar ese doc si cambian las reglas de negocio.
6. **Rama paralela SaaS (Modelo A):** Al **«iniciar todo»** / inicio de sesión, recordar que hay **dos pistas** en el mismo repo: (A) agenda Parláre en producción — prioridad; (B) multiclínica Support/`clinicId` — **apagada** con `SAAS_MULTICLINIC_ENABLED = false` en `js/core/clinicConstants.js`. No confundir ni bloquear la pista A al tocar B. Mapa: `js/saas/README.md`, roadmap: `ROADMAP_SAAS_CLINICAS.md`. Regla Cursor: `.cursor/rules/rama-paralela-saas-inicio-sesion.mdc`.

## 💾 REGLA DE ORO 9: Backup y Git ANTES de tocar código
Antes del **primer cambio** en código producto (JS, `functions/`, rules, hosting):

1. **Backup local** en `_backups/backup_YYYYMMDD_HHmm_tema/` (copia selectiva; **nunca** `git add -A`).
2. **`git status`** + avisar si hay cambios sin commitear; **no** commit/push sin que el usuario lo pida.
3. Anunciar en chat que el protocolo se cumplió o está pendiente de OK del usuario.

Regla Cursor: `.cursor/rules/backup-y-git-antes-de-cambios.mdc` (`alwaysApply: true`).

Excepción: solo lectura, solo docs de propuesta personal, o auditoría sin edits.


### Qué actualizar en ANALISIS_ESTRATEGIA_MOVIL.md:
- Sección **«Registro de avance y qué hacer ahora»** (hecho / pendiente / checklist del usuario).
- Tabla **«Estado de implementación Fase 1»** y pasos de roadmap.
- **«Bitácora de decisiones»** si hubo una decisión nueva (ej. elegir Capacitor vs Flutter).
- Archivos modificados y comandos de deploy relevantes.
- Fecha en el pie del documento.

### Qué actualizar en VISION_PARLARE_V2.md:
- Nuevas reglas críticas aprendidas de bugs reales.
- Cambios en IDs de servicios (Sheets, Calendar, Firebase).
- Ideas de arquitectura o mejoras futuras discutidas en sesión.
- Decisiones técnicas importantes (ej: cambio de estrategia de sync).
- Optimizaciones implementadas o pendientes.

### Qué actualizar:
- Nuevas pestañas o botones en el Sidebar.
- Cambios en la lógica de confirmación o recordatorios de WhatsApp.
- Nuevas secciones administrativas o de reportes.
- Cualquier cambio que afecte cómo la terapeuta o Yari interactúan con la página.

## 🏁 REGLA DE ORO 7: Documentación viva — SIEMPRE (cada acción)
Tras **cualquier** cambio de código o producto, el asistente **DEBE actualizar los archivos vivos en la misma respuesta**, sin esperar a que el usuario lo pida. **Siempre, siempre, siempre** — no solo al cerrar sesión.

Mínimo habitual: `ANALISIS_ESTRATEGIA_MOVIL.md` (incluye **⏳ Falta** y **💡 Sugerencias**), `PLAN_DE_TRABAJO.md`, y `HelpManual.js` si cambió la UI para el staff.

Regla Cursor: `.cursor/rules/documentacion-viva-siempre.mdc` (`alwaysApply: true`).

## 🛡️ REGLA DE ORO 8: Seguridad y vulnerabilidades — SIEMPRE revisar
En **toda** sesión, sin importar el tema:

1. **Tener presente** el estado de `SEGURIDAD_Y_VULNERABILIDADES.md` al iniciar (mínimo el Resumen Ejecutivo).
2. **Avisar al usuario** si lo que vamos a tocar tiene hallazgos abiertos relacionados. Ejemplo: «Antes de tocar `CalendarUI.js`: hay un S-001 abierto (XSS) en esa misma área; ¿lo arreglamos junto?».
3. **Actualizar el documento en la misma respuesta** si introdujiste, reforzaste o detectaste algo de seguridad. Nunca borrar hallazgos cerrados (se mueven a «✅ Reforzado / OK»).

Áreas sensibles que disparan revisión inmediata: auth/login, `firestore.rules`, `storage.rules`, secretos backend (Twilio, Google), `innerHTML` con datos de usuario, webhooks WhatsApp, permisos por rol, dependencias npm/pip, headers HTTP, `console.log` con datos sensibles.

Regla Cursor: `.cursor/rules/seguridad-vulnerabilidades.mdc` (`alwaysApply: true`).

## 🏁 REGLA DE ORO 6: Cierre de sesión ("Vamos" / "Alistémonos")
Cuando el usuario diga **«vamos»**, **«vámonos»**, **«vamosno»**, **«alistémonos»**, **«cerramos»**, **«listo para irnos»** o frases similares, el asistente **DEBE hacer un repaso final** de la documentación viva — no basta con un resumen en el chat (la Regla 7 ya debió aplicarse en cada tarea).

**Checklist de archivos (obligatorio revisar y actualizar si hubo cambios en la sesión):**

| Orden | Archivo | Para qué |
|-------|---------|----------|
| 1 | `js/modules/help/HelpManual.js` | Manual para terapeutas y Yari |
| 2 | `ANALISIS_ESTRATEGIA_MOVIL.md` | Roadmap móvil + técnico (Antigravity) |
| 3 | `PLAN_DE_TRABAJO.md` | Prioridades y ✅ completados |
| 4 | `VISION_PARLARE_V2.md` | Reglas críticas, IDs, arquitectura |
| 5 | `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md` | Bitácora breve de la sesión |

Regla Cursor persistente: `.cursor/rules/cierre-sesion-documentacion.mdc`.

## 🚀 Protocolo de Despliegue ("Alistémonos para irnos")
Al finalizar **cualquier tarea** (Regla 7) y al cerrar sesión (Regla 6), se deben ejecutar obligatoriamente los siguientes pasos:
1. **Manual Check**: Verificar si los cambios realizados requieren actualizar el manual de ayuda en `js/modules/help/HelpManual.js`.
2. **Vision Check**: Verificar si los cambios o ideas de la sesión requieren actualizar `VISION_PARLARE_V2.md` (nuevas reglas, IDs, decisiones de arquitectura, optimizaciones).
2b. **Mobile Strategy Check (Antigravity)**: Si la sesión incluyó trabajo móvil, backend Firebase, recibos o decisiones de app/roadmap, actualizar `ANALISIS_ESTRATEGIA_MOVIL.md`.
3. **Git Add/Commit/Push**: Asegurar que los cambios lleguen al repositorio de GitHub (el código del bot en Render ya es obsoleto, ahora corre 100% en Firebase).
4. **Despliegues en Vivo (Firebase Deploy)**:
   * **Si los cambios fueron en el Frontend (interfaz web/móvil):**
     `firebase deploy --only hosting`
   * **Si los cambios fueron en el Backend (Webhook, Crons, o Trigger en `functions/`):**
     `firebase deploy --only functions`
   * **Si los cambios incluyeron Frontend y Backend simultáneamente:**
     `firebase deploy`
5. **ZIP Backup**: Crear un respaldo comprimido de la sesión (ej: `Backup_Parlare_YYYYMMDD_Final.zip`).
6. **Resumen de Sesión**: Crear el archivo de cierre en `resumen_sesion/RESUMEN_SESION_YYYYMMDD.md`.

## 💸 REGLA DE ORO 9: Arquitectura de Costo Cero ($0) y Gasto Mínimo
Cualquier desarrollador o asistente de IA debe diseñar y optimizar el sistema para mantenerse dentro de los niveles gratuitos de Firebase (Blaze con cobros de $0 USD):
1. **Ignorados en Hosting Estricto:** Hosting debe servir exclusivamente el frontend estático. Está prohibido subir entornos virtuales (`functions/**`), carpetas de dependencias (`node_modules/**`), historial de git (`.git/**`), archivos de cache (`.firebase/**`, `.cursor/**`) o scripts locales (`scratch/**`, `scripts/**`). El despliegue de hosting debe mantenerse por debajo de **150 archivos** para evitar exceder los 10 GB gratuitos.
2. **Minimización de Consultas Firestore:** Está prohibido suscribirse en tiempo real (`onSnapshot`) a colecciones completas sin filtros o límites de fechas.
   * La agenda solo debe escuchar citas dentro del rango visible (`[-30, +60]` días).
   * La lista y saldos de pacientes no debe descargar todo el historial de citas; los detalles históricos y balances se cargan bajo demanda (`getDocs`) al abrir la ficha específica de un paciente.
   * Los terapeutas deben filtrar los listeners por su ID correspondiente (`therapistId`) para evitar leer datos ajenos.

## 💻 ENTORNO DE DESARROLLO: Cursor.sh (Desde 17 de Mayo 2026)
A partir del **domingo 17 de Mayo de 2026**, el desarrollo de la V2 se realiza de manera centralizada utilizando **Cursor.sh** como el entorno e IDE de cabecera.
- **Sincronización de IA**: Cualquier asistente de IA debe estar consciente de que estamos trabajando en Cursor.sh y coordinar de manera armónica las sugerencias de la IA interna de Cursor con los cambios de arquitectura globales.
- **Seguimiento de Cambios**: Revisar siempre los cambios locales hechos desde Cursor antes de realizar despliegues o actualizaciones de bases de datos.

## 🛠️ Estándares Técnicos
- Mantener la estética premium (Rich Aesthetics).
- No eliminar comentarios existentes.
- Usar hora local de México (`America/Mexico_City`) para toda la lógica de fechas.
- **Google Calendar Sync**: Ante cambios de terapeuta o errores 404, usar estrategia "Borrar Anterior + Crear Nuevo" en lugar de solo actualizar. Siempre buscar huérfanos por Nombre/Fecha si el ID no responde.
- **Zonas Horarias**: NUNCA usar `toISOString()` para cálculos de rangos diarios en `syncWeek`; usar siempre formato local `YYYY-MM-DD` para evitar saltos de día por UTC.
- **UI Grid vs Sidebar**: Las citas canceladas se OCULTAN de la cuadrícula central para liberar espacio visual, pero se MANTIENEN en el sidebar con etiqueta roja para control administrativo.
- **Pestaña Dinámica**: La lógica de "Próxima Cita" debe saltar días sin citas ACTIVAS, pero mostrar TODO (activas+canceladas) una vez aterrizada en el día correcto.
- **Refactorización Segura**: Al modificar funciones de filtrado como `_groupByPatient`, verificar rigurosamente que no se eliminen variables de contexto (como `existing` o `aptTime`).
- **Idioma de las Respuestas**: Cuando el usuario diga «iniciar todo» o «inicia todo», el asistente de IA DEBE responder e interactuar siempre en español a lo largo de toda la sesión, y **recordar la rama paralela SaaS** (pista B apagada vs agenda Parláre pista A) — ver Regla de Oro 5 punto 6 y `.cursor/rules/rama-paralela-saas-inicio-sesion.mdc`.
- **Resumen de Despliegues**: Tras realizar cualquier despliegue (`firebase deploy`), el asistente de IA DEBE presentar siempre al usuario un resumen detallado y amigable de qué cambios específicos fueron incluidos en ese despliegue.


## 🏢 REGLA DE ORO 10: Rama paralela SaaS vs agenda Parláre (producción)

Existen **dos pistas** en el mismo repositorio:

1. **Pista A — Producción:** Agenda funcional de Centro Parláre (`settings/clinicConfig`, staff actual). **Nunca** degradar por cambios SaaS con el flag apagado.
2. **Pista B — SaaS Modelo A:** Multiclínica, Support, `clinicId`, segunda clínica. Control: `SAAS_MULTICLINIC_ENABLED` en `js/core/clinicConstants.js` (**`false` en producción**).

Documentos: `js/saas/README.md`, `ROADMAP_SAAS_CLINICAS.md`, `CONTABILIDAD_MULTICLINICA.md`, `SAAS_FASE0_SETUP.md`.

Al codificar en archivos `js/core/`, `ClinicContext`, `ClinicSelector`: siempre guardar con `isSaasMulticlinicEnabled()`. Activar el flag solo en rama/preview acordada con Daniel.

