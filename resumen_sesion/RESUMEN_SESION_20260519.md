# Resumen de sesión — 19 Mayo 2026

## Hecho

- **Calendario móvil:** columna hora ~75% (`3.25rem`), vista Semana sin scroll horizontal, línea roja solo sobre días, chips compactos (`CalendarUI.js`, `index.css`, `dateUtils.js`).
- **Bitácora de Auditoría en celular:** `Más → Bitácora de Auditoría` (`MobileBottomNav.js`); modal bottom-sheet (`MainModals.js`).
- **Documentación:** Regla de Oro 7 + `documentacion-viva-siempre.mdc`; `HelpManual.js` (menú Más, bitácora, agenda); `ANALISIS_ESTRATEGIA_MOVIL.md`; `PLAN_DE_TRABAJO.md`.

## Validar (usuario)

- [ ] `npm run build` + `firebase deploy --only hosting`
- [ ] Celular: Más → Bitácora (Yari/Diana)
- [ ] Agenda Día y Semana (nombres legibles, sin scroll X en semana)
- [ ] Resto pendiente sesión 18 may: opt-in Meta, recibos, semáforo sidebar

## Deploy

```powershell
npm run build
firebase deploy --only hosting
```

## Complemento (agenda escritorio + docs) — cierre sesión

- **#1 Auto-scroll:** solo carga y **Hoy** — validado en producción.
- **#2 Índice slot:** `CalendarSlotIndex.js` — validado en producción.
- **#3 Toggle Día \| Semana en desktop:** `#calendarViewToggle` visible en toolbar.
- **Docs:** `ARQUITECTURA_FUTURA.md` (nuevo); `VISION_PARLARE_V2.md` (merge ✅/⏳/🔜); `PLAN`, `ANALISIS`, `AI_RULES`, reglas Cursor.

### Validar tras deploy hosting

- [ ] PC: **Día** / **Semana** en toolbar; pestañas Lun–Sáb en modo Día
- [ ] PC: prev/next semana sin salto de scroll; **Hoy** → ~10:00

## Próxima sesión

Ver **⏳ Falta** y **💡 Sugerencias** en `ANALISIS_ESTRATEGIA_MOVIL.md` y roadmap media en `ARQUITECTURA_FUTURA.md`.
