/**
 * Constantes multiclínica — Modelo A (un Firebase, clinicId por documento).
 *
 * RAMA PARALELA SaaS: ver `js/saas/README.md`
 * La agenda Parláre en producción NO usa estas rutas hasta activar el flag.
 */

/**
 * OFF por defecto — la agenda actual (Diana, Yari, Sam, Vero) no ejecuta lógica multiclínica.
 * Activar solo cuando terminen setup en `SAAS_FASE0_SETUP.md` y quieran probar Support.
 */
export const SAAS_MULTICLINIC_ENABLED = false;

export function isSaasMulticlinicEnabled() {
    return SAAS_MULTICLINIC_ENABLED === true;
}

/** Primer tenant: Centro Parláre (datos legacy sin clinicId se tratan como este id). */
export const DEFAULT_CLINIC_ID = 'centro_parlare';

/** sessionStorage: clínica activa elegida por platform_support. */
export const ACTIVE_CLINIC_STORAGE_KEY = 'parlare_active_clinic_id';

/** Ruta legacy de configuración (pre-SaaS). */
export const LEGACY_SETTINGS_DOC = 'settings/clinicConfig';

/** Colección de organizaciones / clínicas. */
export const CLINICS_COLLECTION = 'clinics';

/** IDs de Google Sheets actuales de Centro Parláre (fallback si Firestore aún no tiene integrations). */
export const CENTRO_PARLARE_SHEET_IDS = {
    diana: '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
    sam: '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg',
    vero: '1o84rt6ZfGm0eb8URNGgadClVaeJGgna0dzBhdAjx6pc'
};

export const DEFAULT_SHEET_TAB = 'App_Data';
