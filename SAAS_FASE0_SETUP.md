# SaaS Fase 0 — Setup manual (Centro Parláre)

> **IMPORTANTE:** Hoy `SAAS_MULTICLINIC_ENABLED = false`. **No hace falta** ejecutar este setup para la agenda Parláre en producción. Solo cuando activen la rama paralela (`js/saas/README.md`).

## 0. Activar la rama (solo entorno de prueba)

En `js/core/clinicConstants.js`:

```javascript
export const SAAS_MULTICLINIC_ENABLED = true;
```

Recomendado: rama git `feature/saas-multiclinic` o preview hosting — **no** el sitio que usan Diana/Yari hasta validar.

## 1. Documento `clinics/centro_parlare`

Colección: `clinics` → ID: `centro_parlare`

```json
{
  "name": "Centro Parláre",
  "slug": "centro_parlare",
  "status": "active",
  "createdAt": "2026-06-30T00:00:00.000Z"
}
```

## 2. Settings por clínica

Opción A — **Copiar** `settings/clinicConfig` → `settings/centro_parlare` y añadir:

```json
{
  "clinicId": "centro_parlare",
  "integrations": {
    "google": {
      "sheets": {
        "diana": "1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4",
        "sam": "1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg",
        "vero": "1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc"
      },
      "targetSheetName": "App_Data"
    }
  }
}
```

Si no existe `settings/centro_parlare`, la app hace fallback a `clinicConfig` y aplica IDs por defecto en código.

## 3. Cuenta Parláre Support

1. Firebase Console → Authentication → Add user  
   - Email: `support@parlare.mx` (o el que definan)  
   - Password: (segura, solo equipo Support)

2. El email ya está en `AuthManager.AUTHORIZED_USERS` con rol `platform_support`.

3. (Opcional) Doc `users/{uid}`:

```json
{
  "role": "platform_support",
  "displayName": "Parláre Support"
}
```

## 4. Migración `clinicId` en datos existentes

Desde terminal (con Firebase CLI y credenciales admin):

```bash
cd functions
# Tras deploy de la función:
# firebase functions:call backfillClinicId --data '{"clinicId":"centro_parlare","dryRun":true}'
# firebase functions:call backfillClinicId --data '{"clinicId":"centro_parlare","dryRun":false}'
```

Colecciones: `appointments`, `patientProfiles`, `audit_logs` (opcional).

**Sin función aún:** los documentos sin `clinicId` se tratan como `centro_parlare` en el frontend (transición).

## 5. Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes
# Cuando exista la función de backfill:
# firebase deploy --only functions:backfillClinicId
```

## 6. Probar

1. Login `support@parlare.mx` → pantalla **Selecciona la clínica** → Centro Parláre  
2. Banner índigo «Modo Parláre Support»  
3. Agenda, pacientes y pagos igual que staff (filtrado `centro_parlare`)  
4. Excel: conectar Google con cuenta con permiso en las hojas de la clínica  

Staff Parláre (Diana, Yari, etc.) **no** ven el selector; entran directo con `clinicId` implícito `centro_parlare`.

---

*30 Jun 2026*
