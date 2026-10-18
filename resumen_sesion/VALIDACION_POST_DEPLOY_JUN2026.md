# Validación post-deploy — Junio 2026 (revisión posterior)

> **Para qué sirve este documento:** Dejar claro qué ya se validó, qué falta (si aplica), y **qué significa** cada ítem que antes sonaba confuso (iPhone, cola «deben sesión», filtro ámbar).  
> **Audiencia:** Daniel, Yari, Diana, asistentes IA (Antigravity / Cursor).  
> **Última actualización:** 30 Jun 2026 (México)

Documentos relacionados: `ANALISIS_ESTRATEGIA_MOVIL.md` (retomar aquí), `PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md`, `js/modules/help/HelpManual.js` (sección «Deben sesión»).

---

## 1. Estado general (acordado con Daniel)

| Ítem | Estado | Notas |
|------|--------|--------|
| `firebase deploy --only hosting` | ✅ Hecho | Paquete jun 2026: finanzas cita, seguro pago A+B, Yari borrar paciente, fixes Excel, etc. |
| Julian 150/500 + Excel Parláre | ✅ Validado | Perfil manda sobre `manualClinicFee` stale |
| Corrección cita ya pagada (relevo) | ✅ Validado | Ajuste Manual → Guardar → No pagado → Pagado |
| Sam sin Excel Diana → batch naranja | ✅ Validado | `sheetSynced: false` + sync Diana/Yari |
| Yari: baja y borrado permanente paciente | ✅ Validado | Rol recepción |
| Herramienta masiva Excel en Control Maestro | ❌ **Descartado** | Corrección histórica **manual** en Google Sheets |
| UX iPhone (modales, búsqueda, cita) | ⏳ **Opcional / pendiente** | Ver §3 — solo si usan mucho el celular |
| Cola «deben sesión» (Fase A) | ⏳ **Opcional** | Solo si Yari usa cancelar hoy + marcar debe sesión — ver §4 |
| SaaS multiclínica Fase 0 | 🔒 Dormido | `SAAS_MULTICLINIC_ENABLED = false` — `js/saas/README.md` |

---

## 2. Por qué se hablaba de «iPhone» (y no es lo mismo que Julian/Excel)

Hay **dos tipos** de validación:

| Tipo | Dónde | Qué prueba |
|------|--------|------------|
| **Negocio / dinero** | PC o celular | Julian, pagos, Excel, Sam/Diana — **ya hecho** ✅ |
| **UX móvil** | Preferible **iPhone Safari** | Modales grandes, búsqueda, campana, bottom nav — fallos que **en computadora no se ven** |

Los arreglos de **11 jun** (modales paciente `92dvh`, scroll, safe-area) y **25 may** (búsqueda iOS, campana `fixed`) están hechos para **Safari en iPhone**. Validar en desktop **no garantiza** que el celular esté bien.

**No hace falta repetir Excel en iPhone** si ya se validó en PC.

---

## 3. Checklist UX iPhone (mínimo útil — ~5–10 min)

**Quién:** Yari o Diana. **Dónde:** Safari → URL producción Parláre. **Cuándo:** Cuando puedan; no bloquea el siguiente sprint de código.

| # | Paso | OK si… |
|---|------|--------|
| 1 | Menú ☰ → buscar paciente (escribir o dictar) | La lista filtra al teclear |
| 2 | **+** Nuevo paciente → scroll abajo | Botón **Crear** visible; modal casi pantalla completa |
| 3 | Abrir **expediente** de un paciente | Scroll fluido; nada cortado abajo |
| 4 | Agenda → tocar una **cita** | Modal sube desde abajo (bottom-sheet), no ventana chica centrada |
| 5 | Campana **🔔** | Panel de notificaciones se ve entero |
| 6 | (Opcional) **Más** → Vacaciones / Control Maestro | Botones no tapados por la barra del iPhone |

**Resultado:** Marcar ✅ en este doc o anotar en chat qué paso falló + captura.

---

## 4. Cola «deben sesión» y filtro ámbar — qué son (no confundir)

Son funciones de **Fase A** (2 jun 2026) para **pacientes especiales** que deben recuperar sesiones. Documento maestro: `PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md`.

### 4.1 Cola «deben sesión»

- **Cuándo:** Al **cancelar una cita del mismo día**, Yari puede indicar que el paciente **debe una sesión**.
- **Dónde se ve:** En el **expediente** del paciente → bloque **«Cola sesión»** (contador semanal).
- **Regla:** Si después **reagenda y guarda** la cita, **no** debe sumar al contador (solo cancelación sin reagendar suma según flujo acordado).

### 4.2 Control Maestro — botón ámbar «Deben sesión»

- **Dónde:** **Más** (bottom nav móvil) o acceso recepción → **Control Maestro**.
- **Qué hace:** Filtra la lista a pacientes con contador de «deben sesión» **activo en la semana en curso**.
- **⚠️ No confundir con:** el semáforo **naranja de WhatsApp** (opt-in pendiente) en la ficha del paciente. Aquí el ámbar es **solo el botón de filtro** «Deben sesión».

### 4.3 ¿Hay que validarlo ya?

| Si Yari… | Acción |
|----------|--------|
| **Sí** cancela citas hoy y marca «debe sesión» | Probar §4.1 + §4.2 (en iPhone **o** en PC) |
| **No** usa esa función aún | **Saltar** — no es bloqueo; retomar cuando la usen en operación diaria |

### Checklist cola (solo si aplica)

| # | Paso | OK si… |
|---|------|--------|
| 1 | Cancelar cita **de hoy** → marcar que **debe sesión** | Expediente muestra bloque Cola sesión |
| 2 | Control Maestro → botón **Deben sesión** (ámbar) | Aparece ese paciente (o sube el badge) |
| 3 | Reagendar la misma situación y **guardar** | Contador **no** sube de más (regla reagendar) |

---

## 5. Qué NO falta / qué sigue después

### Descartado explícitamente

- Script o herramienta en Control Maestro para **reparar masivamente** cuotas viejas en Excel → **manual** en hojas de Diana.

### Siguiente trabajo de producto (cuando den luz verde)

| Prioridad | Tema | Dónde |
|-----------|------|--------|
| 1 | Cola prioridad **Fase B** (Copiloto llena huecos + backend) | `PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md` |
| 2 | Iconos PWA + POC **Capacitor** (app iOS/Android) | `ANALISIS_ESTRATEGIA_MOVIL.md` Fase 4 |
| 3 | SaaS multiclínica | `ROADMAP_SAAS_CLINICAS.md` — flag OFF hasta piloto |

---

## 6. Bitácora de aclaración (chat 30 jun 2026)

Daniel confirmó: deploy ✅; validaciones de negocio ✅; Excel histórico manual; confusión entre «validar iPhone» y «cola/filtro ámbar» — este documento separa **UX móvil** (§3) de **función cola** (§4) y marca ambos como opcionales según uso real de Yari.

---

*Revisión posterior: abrir este archivo antes de planear la siguiente sesión o decir «iniciar todo».*
