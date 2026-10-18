/**
 * Utilidades de filtrado y escritura multiclínica.
 * Durante la transición, documentos sin clinicId cuentan como centro_parlare.
 */

import { DEFAULT_CLINIC_ID, isSaasMulticlinicEnabled } from '../core/clinicConstants.js';

/**
 * @param {object|null|undefined} data - Documento Firestore o payload.
 * @param {string} activeClinicId
 */
export function documentBelongsToClinic(data, activeClinicId = DEFAULT_CLINIC_ID) {
    if (!isSaasMulticlinicEnabled()) return true;
    if (!data) return false;
    const docClinic = data.clinicId;
    if (!docClinic) {
        return activeClinicId === DEFAULT_CLINIC_ID;
    }
    return docClinic === activeClinicId;
}

/**
 * @param {Array<{id?: string} & object>} items
 * @param {string} activeClinicId
 */
export function filterByClinic(items, activeClinicId = DEFAULT_CLINIC_ID) {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => documentBelongsToClinic(item, activeClinicId));
}

/**
 * Añade clinicId a payloads de escritura si falta.
 * @param {object} payload
 * @param {string} activeClinicId
 */
export function stampClinicId(payload, activeClinicId = DEFAULT_CLINIC_ID) {
    if (!isSaasMulticlinicEnabled()) return payload;
    if (!payload || typeof payload !== 'object') return payload;
    if (payload.clinicId) return payload;
    return { ...payload, clinicId: activeClinicId };
}
