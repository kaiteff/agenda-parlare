# Permisos del equipo — Fase 1 (panel Configuración)

*Última actualización: 9 jul 2026*

## Objetivo

Que **Diana** configure desde **Configuración de Clínica → Equipo y permisos** qué puede hacer cada persona (Sam, Vero, Yari), manteniendo **solo la dueña** con acceso a dinero consolidado de la clínica (reportes, corte, utilidad Parláre).

## Estado

| Fase | Qué incluye | Estado |
|------|-------------|--------|
| **1** | UI + `settings/clinicConfig.staffPermissions` + `AuthManager.can()` | ✅ En código |
| **2** | Auditar todos los `isAdmin()` restantes | ⏳ Pendiente |
| **3** | Custom claims Firebase + reglas Firestore | ⏳ Pendiente (S-005 / S-008) |

## Dueña de clínica

- **Email:** `lopezcarpio7@gmail.com` (Diana)
- Permisos bloqueados: `view_clinic_financials`, `manage_clinic_settings`, `manage_staff_permissions`
- Solo Diana ve la pestaña **Equipo y permisos**

## Admin técnico (Daniel)

- Rol `admin` en código, **sin** `view_clinic_financials` por defecto
- Puede abrir Configuración (temas, costos) si tiene `manage_clinic_settings`
- **No** ve botones de Reportes / Corte de Caja salvo que Diana le otorgue el permiso (no expuesto en panel para él)

## Dónde se guarda

```text
settings/clinicConfig.staffPermissions
```

Ejemplo:

```json
{
  "sammygtz90@gmail.com": { "grants": ["view_all_patients"], "denies": [] },
  "yaritzajocgo@gmail.com": { "grants": [], "denies": ["view_audit"] }
}
```

- **grants:** permisos extra sobre el rol base
- **denies:** quita permisos que el rol traía por defecto

## Catálogo de permisos (Fase 1)

| ID | Descripción |
|----|-------------|
| `view_all_agenda` | Ver todas las agendas |
| `switch_therapist_view` | Filtro Diana / Sam / Vero / Todas |
| `manage_schedule` | Citas de cualquier terapeuta |
| `manage_blocks` | Vacaciones y bloqueos |
| `view_all_patients` | Lista completa de pacientes |
| `manage_patients` | Editar expedientes |
| `create_evaluation_patient` | Alta de paciente en proceso de evaluación (ver `PLAN_EVALUACIONES.md`) |
| `delete_records` | Borrar paciente permanente |
| `view_reception_control` | Control Maestro |
| `view_audit` | Bitácora WhatsApp |
| `manage_payments` | Marcar pagado en cita |
| `view_own_session_pay` | Ver costo en sus pacientes (terapeutas) |
| `view_clinic_financials` | Reportes, corte, utilidad Parláre (**solo dueña**) |
| `manage_clinic_settings` | Panel Configuración |
| `manage_staff_permissions` | Editar permisos del equipo (**solo dueña**) |

## Archivos

| Archivo | Rol |
|---------|-----|
| `js/config/staffPermissions.js` | Catálogo, roster, cálculo efectivo |
| `js/managers/AuthManager.js` | `can()`, `canViewClinicFinancials()`, refresh |
| `js/managers/SettingsManager.js` | Persistencia + defaults |
| `js/modules/admin/AdminSettingsModal.js` | Pestaña UI |
| `js/components/Header.js` | Botones reporte/corte/config |
| `js/components/MobileBottomNav.js` | Menú Más |
| `js/components/Sidebar.js` | Corte en sidebar |

## Limitación Fase 1 (importante)

Los permisos se aplican en **frontend**. Firestore rules siguen por email (`isSuper` / `isOwner`). Un usuario con conocimientos técnicos podría intentar saltarse la UI — la **Fase 3** cierra eso con custom claims.

## Deploy

```powershell
cd d:\agbc\Ag_Pa
npm run build
firebase deploy --only hosting
```

## Validación

1. Entrar como **Diana** → Configuración → **Equipo y permisos** → activar «Ver todos los pacientes» para Sam → Guardar.
2. Sam recarga → debe ver pacientes de otras terapeutas si el permiso quedó.
3. Entrar como **Daniel** → no debe ver Reportes ni Corte.
4. Yari sin cambios → Control Maestro y cobros siguen igual.

## Próximo paso (Fase 2)

Reemplazar `isAdmin()` sueltos en `PatientModals`, `AuditPanel`, `CalendarUI`, etc., por `AuthManager.can('…')`.
