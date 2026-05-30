# Resumen sesión — 28 Mayo 2026

## Hecho y desplegado (Antigravity + Cursor)

- **Sync Google híbrido:** 7 AM MX; domingo nuke; L–S incremental (36 h).
- **C-Lite recordatorios:** perfiles por `profileId`; `enrichWithProfileData` en citas nuevas/editadas.
- **Fix bitácora 8 AM:** `_log_reminder_to_audit` usa `doc_id` (líneas 561/571).
- **Vacaciones:** Más → Ausencia (móvil); cancelar / reasignar / huecos sustituta.
- **Pop-up v9.4 + HelpManual** actualizados (en repo; hosting si falta deploy).

## Pendiente ligero (Daniel)

1. `firebase deploy --only hosting` si no está el v9.4.
2. Cita test **mañana** → validar recordatorio 8 AM + `entityId` en bitácora.
3. Dashboard lecturas en **48 h** (comparar vs ~32k).
4. ~~Hosting Storage~~ ✅ Revisado en consola (may 2026).
5. ~~Copiloto banner 8 min~~ ✅ Confirmado en producción (may 2026).

## Modo leve (pocas lecturas)

- Cerrar app al terminar; una pestaña; filtro por terapeuta; vista Día en móvil.
- No dejar sesiones abiertas en varios celulares sin uso.

## Deploy referencia

```powershell
npm run build
firebase deploy --only hosting
```

*Functions ya desplegadas según Antigravity.*
