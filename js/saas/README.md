# Rama paralela — SaaS multiclínica (Modelo A)

> **Estado:** código presente en el repo, **desactivado en producción** por defecto.

## Regla de oro

La agenda **Centro Parláre** que usa el equipo hoy **no debe** verse afectada por esta rama hasta que ustedes decidan activarla.

Control central:

```javascript
// js/core/clinicConstants.js
export const SAAS_MULTICLINIC_ENABLED = false;  // ← producción Parláre
```

Con `false`:

| Área | Comportamiento |
|------|----------------|
| Login Diana / Yari / Sam / Vero | Igual que siempre |
| `SettingsManager` | Solo `settings/clinicConfig` (ruta original) |
| Citas / pacientes | Sin filtro `clinicId`, sin stamp en escrituras |
| Selector Support | No aparece |
| Banner Support | No aparece |
| `SheetService` | IDs hardcodeados históricos (como antes) |
| Cuenta `support@parlare.mx` | Si existiera, login rechazado con mensaje claro |

Con `true` (solo cuando estén listos):

- Login Support → selector de clínica
- Config por `settings/{clinicId}`
- Filtros y migración `clinicId`

## Archivos de esta rama

| Archivo | Rol |
|---------|-----|
| `js/core/clinicConstants.js` | Flag + constantes |
| `js/core/ClinicContext.js` | Clínica activa en sesión |
| `js/components/ClinicSelector.js` | UI Support |
| `js/utils/clinicData.js` | Filtro / stamp `clinicId` |
| `functions/clinic_saas.py` | Backfill callable (no afecta frontend) |
| `CONTABILIDAD_MULTICLINICA.md` | Excel por clínica |
| `SAAS_FASE0_SETUP.md` | Checklist activación |
| `ROADMAP_SAAS_CLINICAS.md` | Fases 0–4 |

## Cómo probar sin tocar producción

1. Rama git `feature/saas-multiclinic` (recomendado) **o** hosting preview.
2. Poner `SAAS_MULTICLINIC_ENABLED = true` solo en ese entorno.
3. Seguir `SAAS_FASE0_SETUP.md`.
4. **No** desplegar a `taconotaco-d94fc.web.app` con el flag en `true` hasta validar.

## Deploy seguro para Parláre hoy

```bash
npm run build
firebase deploy --only hosting
```

El flag en `false` hace que el bundle desplegado sea funcionalmente el mismo flujo que antes del SaaS (settings legacy, sin picker, sin filtros).

**Regla Cursor:** `.cursor/rules/rama-paralela-saas-inicio-sesion.mdc` — al «iniciar todo»: pista A (Parláre) vs pista B (SaaS dormido) + **destino app iOS/Android (Capacitor)**.

---

*30 Jun 2026*
