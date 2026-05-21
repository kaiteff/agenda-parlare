# Arquitectura futura y roadmap técnico — Parláre

> **Documento vivo** para refactor gradual, mejoras de escritorio y decisiones que no son «urgencia del día» pero sí dirección del proyecto.
>
> Histórico detallado (nov 2025, ejemplo PatientManager): [`old/ARQUITECTURA_FUTURA.md`](old/ARQUITECTURA_FUTURA.md)
>
> **Mapa operativo diario:** [`ANALISIS_ESTRATEGIA_MOVIL.md`](ANALISIS_ESTRATEGIA_MOVIL.md) · **Prioridades producto:** [`PLAN_DE_TRABAJO.md`](PLAN_DE_TRABAJO.md)

*Última actualización: **19 de Mayo de 2026***

---

## Cómo usar y actualizar este documento (regla del proyecto)

1. **Cuándo escribir aquí:** ideas de refactor, rendimiento desktop, módulos nuevos, deuda técnica que no cabe en una sesión.
2. **Qué registrar siempre al implementar algo de esta lista:**
   - Fecha | Ítem | Archivos tocados | **Para qué** (beneficio) | **Cómo revertir** (commit / qué flag quitar)
   - Marcar el ítem en la tabla de prioridades: ⏳ → 🔜 → ✅
3. **No duplicar** lo ya ✅ en `PLAN_DE_TRABAJO.md` / `ANALISIS` — enlazar.
4. **Al crecer el proyecto:** añadir filas a «Registro de cambios» y revisar prioridades cada cierre de sesión importante.

**Reglas Cursor:** `.cursor/rules/documentacion-viva-siempre.mdc` · `AI_RULES.md` Regla de Oro 7.

---

## Registro de cambios (desde este roadmap)

| Fecha | Ítem | Archivos | Para qué | Revertir |
|-------|------|----------|----------|----------|
| 19 May 2026 | **#1 Auto-scroll inteligente** | `CalendarState.js`, `CalendarEvents.js`, `CalendarUI.js` | No saltar scroll al cambiar semana; solo carga inicial y botón **Hoy** | Quitar flag `scrollToWorkHoursOnNextRender` y restaurar `setTimeout` siempre en `renderCalendar` |
| 19 May 2026 | **#2 Índice citas por slot** | `CalendarSlotIndex.js` (nuevo), `CalendarUI.js` | Menos `filter()` por celda; render más rápido con muchas citas | Borrar import índice y volver al `filter` en `CalendarUI` |
| 19 May 2026 | **#3 Toggle Día \| Semana en desktop** | `index.html` (quitar `md:hidden` en `#calendarViewToggle`) | Misma UX que móvil en `md+`; reutiliza `CalendarState.viewMode` y bind en `CalendarEvents.js` | Volver a poner `md:hidden` en el contenedor del toggle |

---

## Priorización acordada (escritorio / agenda)

Leyenda: ✅ hecho | 🔜 en curso | ⏳ pendiente | 💎 premium (más adelante)

### Alta impacto (acordado — implementar primero)

| # | Mejora | Estado | Notas |
|---|--------|--------|-------|
| 1 | Auto-scroll solo en carga / **Hoy** | ✅ 19 may | Ver registro arriba |
| 2 | Índice `fecha\|hora` antes de pintar grid | ✅ 19 may | `CalendarSlotIndex.js` |
| 3 | Toggle **Día \| Semana** visible en desktop (`md+`) | ✅ 19 may | `#calendarViewToggle` visible en toolbar; default desktop sigue siendo semana vía `initViewMode()` |

**Revisar sin romper (checklist manual tras #1 y #2):**

- [x] Cambiar semana ← →: la vista **no** debe saltar de scroll (validado usuario)
- [x] Botón **Hoy**: sí lleva a ~10:00 (validado usuario)
- [x] Citas en vista TODAS y por terapeuta (validado usuario)
- [ ] Bloqueos día completo (`isFullDayBlock`) en todas las horas del día
- [ ] Arrastrar cita a otro slot
- [ ] Crear cita desde celda vacía
- [x] Móvil: Día/Semana y scroll sin regresión
- [ ] Desktop: toggle Día/Semana + pestañas Lun–Sáb en modo Día (tras deploy hosting)

### Media impacto (acordado — todas en cola)

| # | Mejora | Estado |
|---|--------|--------|
| 4 | Tooltips / nombre paciente en chips (vista TODAS, desktop) | ⏳ |
| 5 | Query Firestore por rango de semana visible (no todas las citas) | ⏳ |
| 6 | Grid CSS: columna hora fija + `repeat(6, 1fr)` en desktop | ⏳ |
| 7 | Debounce ~150 ms en `onSnapshot` antes de `render()` | ⏳ |
| 8 | Quitar `animate-pulse` fijo en `#statusMsg` (solo al sincronizar) | ⏳ |
| 9 | Dividir `CalendarUI.renderCalendar` en helpers (`buildHeader`, `buildRow`) | ⏳ |

### Premium (acordado — después)

| # | Mejora | Estado |
|---|--------|--------|
| 10 | Tokens de color marca Parláre en `tailwind.config.js` | 💎 |
| 11 | Atajos teclado (← → semana, **H** = Hoy) | 💎 |

**Explícitamente fuera de premium por ahora:** virtualización React, reescritura completa del calendario, quitar vista semana.

---

## Ideas desktop (análisis 19 may 2026 — para comparar y decidir)

Detalle en conversación Cursor; resumen:

- **Rendimiento:** snapshot trae todas las citas; cada cambio re-renderiza grid + mini-cal + WhatsApp dashboard.
- **UX:** en compu no hay toggle Día; chips `[S] Sam` sin nombre completo; doble scroll vertical + horizontal.
- **Código:** `PatientUI.js` no existe (lista = `Sidebar.js`) — alinear docs y refactor pacientes con `old/ARQUITECTURA_FUTURA.md`.

---

## Arquitectura modular objetivo (referencia)

El proyecto **ya sigue** en gran parte el híbrido modular:

```
js/managers/          ← coordinación (PatientManager, CalendarManager)
js/modules/           ← dominio (calendar/, reception/, admin/)
js/services/        ← Firestore, appointments, audit
js/components/      ← UI inyectada (Header, Sidebar, MobileBottomNav)
```

**Pendiente histórico (nov 2025):** terminar desglose PatientManager según [`old/ARQUITECTURA_FUTURA.md`](old/ARQUITECTURA_FUTURA.md). Mucho ya está en `PatientModals`, `PatientActions`, `Sidebar` — actualizar plan antes de mover archivos.

---

## Comparación: plan 2025 vs realidad 2026

| Tema | Plan nov 2025 | Hoy |
|------|----------------|-----|
| Pacientes | `PatientUI.js` separado | Lista en **`Sidebar.js`** |
| Calendario | Monolito | **`CalendarManager`** + `CalendarUI/Data/Events/Modal` ✅ |
| Móvil | No priorizado | **Fase 1 móvil** ✅ + Capacitor roadmap |
| Estado | Variables globales | **`CalendarState`**, `AuthManager` ✅ |

**Decisión:** no reabrir refactor grande de pacientes sin necesidad; priorizar mejoras desktop medibles (tabla arriba).

---

## Próxima revisión sugerida del documento

- Tras deploy: validar checklist desktop (toggle Día/Semana).
- Cuando Firestore query por semana (#5): documentar índices compuestos si Firebase lo pide.
- Cada 2–3 sesiones: podar ítems ✅ y mover premium si el negocio lo pide.

---

*Mantenido junto con `ANALISIS_ESTRATEGIA_MOVIL.md` (Antigravity) y `PLAN_DE_TRABAJO.md` (prioridades equipo).*
