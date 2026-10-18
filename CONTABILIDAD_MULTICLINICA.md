# Contabilidad escrita (Google Sheets) — multiclínica Modelo A

> **Fecha:** 30 Jun 2026  
> **Contexto:** Centro Parláre ya usa **un Excel/Google Sheet por terapeuta** con pestaña `App_Data`. Otras clínicas pueden querer el mismo modelo o solo agenda sin Excel.

Relacionado: `ROADMAP_SAAS_CLINICAS.md` Fase 0–2, `js/services/google/SheetService.js`, `SettingsManager`.

---

## 1. Cómo funciona hoy en Parláre

| Pieza | Dónde vive |
|-------|------------|
| IDs de hojas (Diana, Sam, Vero) | Antes: hardcode en `SheetService.js` → **ahora:** `settings/{clinicId}.integrations.google.sheets` |
| Pestaña de escritura | `App_Data` (fija por clínica, configurable `targetSheetName`) |
| Quién escribe | El **navegador del usuario logueado** vía OAuth Google (`GoogleAuthService`) |
| Cuándo escribe | Al marcar **Pagado** / sincronización batch (Diana/Yari) |
| Backend WhatsApp / crons | `functions/main.py` → `SHEET_CONFIG` (aún hardcode; Fase 2 mover a Firestore) |

**Importante:** Excel no usa la cuenta de Firebase; usa **la sesión Google del dispositivo**. Si Support marca pagado sin sesión de Diana, el pago queda en Firestore pero Excel puede fallar (igual que Sam hoy).

---

## 2. Modelo por clínica (recomendado)

Cada clínica en `settings/{clinicId}`:

```json
{
  "clinicId": "centro_parlare",
  "baseCosts": { "diana": { "cost": 800, "fee": 250 } },
  "integrations": {
    "google": {
      "sheets": {
        "diana": "1KUoPue_...",
        "sam": "1XKpgEE_...",
        "vero": "1o84rt6Z_..."
      },
      "calendars": { },
      "targetSheetName": "App_Data",
      "oauthMode": "admin_browser"
    }
  }
}
```

| Modo contabilidad | Descripción | Para quién |
|-------------------|-------------|------------|
| **A — Sheets por terapeuta** (actual Parláre) | Cada terapeuta (o la clínica) tiene su libro; Parláre escribe solo en `App_Data` | Clínicas que ya llevan Excel visual |
| **B — Un solo libro clínica** | Un `spreadsheetId` + hojas por terapeuta o una sola hoja | Clínicas pequeñas |
| **C — Sin Excel (solo Firestore)** | `integrations.google.sheets` vacío; pagos solo en app | Piloto rápido; dashboard nativo Fase 3 |
| **D — Dashboard nativo Parláre** | Export CSV/PDF desde app; opcional sync a Sheets | Futuro comercial |

**Onboarding clínica nueva (Fase 1):**

1. Admin clínica crea o comparte sus Google Sheets (pestaña `App_Data`).
2. Support o admin registra IDs en `settings/{clinicId}` (luego: wizard en UI).
3. Admin conecta **su** Google en el menú superior de la app (misma UX que Diana).
4. Terapeutas sin permiso de escritura en el Sheet → solo Diana/admin sincroniza (batch).

---

## 3. Support entrando a una clínica

| Acción | Comportamiento |
|--------|----------------|
| Ver agenda / pacientes | Filtrado por `clinicId` activo |
| Config costos / temas | Lee `settings/{clinicId}` |
| Marcar pagado → Excel | Usa **IDs de esa clínica** + **OAuth del navegador actual** |
| Banner | «Modo Parláre Support — {nombre clínica}» + aviso de sesión Google |

**Recomendación operativa:** Para probar Excel en Parláre como Support, conectar Google con una cuenta que tenga permiso de edición en las hojas de Diana (o usar cuenta de Diana en el dispositivo de prueba).

---

## 4. Aislamiento entre clínicas

- Clínica A **nunca** debe tener en su config los Sheet IDs de Clínica B.
- Al cambiar clínica en el selector, `SettingsManager` recarga `settings/{nuevoId}` y `SheetService` actualiza IDs en memoria.
- Migración: todos los documentos legacy de Parláre reciben `clinicId: 'centro_parlare'` (script `backfillClinicId`).

---

## 5. Roadmap técnico contabilidad

| Fase | Entregable |
|------|------------|
| **0** (ahora) | `integrations.google.sheets` en settings por clínica; SheetService lee de Firestore |
| **1** | UI admin: pegar IDs de hojas; validar pestaña `App_Data` |
| **2** | `functions/main.py` lee Sheets/Calendar desde Firestore por `clinicId` |
| **2b** | OAuth por clínica (token refresh en Secret Manager por tenant) |
| **3** | Reporte financiero nativo + export; Excel opcional |

---

## 6. Checklist clínica piloto (cuando llegue el segundo cliente)

- [ ] Crear `clinics/{slug}` con nombre y estado `pilot`
- [ ] Crear `settings/{slug}` con `baseCosts` y `integrations.google`
- [ ] Invitar usuarios con `users/{uid}.clinicId = slug`
- [ ] Verificar que Support **no** ve datos de `centro_parlare` al elegir piloto
- [ ] Definir si llevan Excel (A/B) o solo app (C)
- [ ] Documentar quién conecta Google en recepción

---

*Última actualización: 30 Jun 2026 — Fase 0 código en paralelo.*
