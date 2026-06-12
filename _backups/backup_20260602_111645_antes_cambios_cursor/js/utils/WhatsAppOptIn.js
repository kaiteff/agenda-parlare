/**
 * Fase C — Consentimiento WhatsApp (recurrentOptIn)
 * Estados: pending | accepted | rejected
 */

export const RECURRENT_OPT_IN = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};

const VALID = new Set(Object.values(RECURRENT_OPT_IN));

/**
 * Normaliza el estado guardado en Firestore (legacy sin campo → pending).
 * @param {Object} patient
 * @returns {'pending'|'accepted'|'rejected'}
 */
export function getRecurrentOptInStatus(patient) {
    const raw = patient?.recurrentOptIn;
    if (VALID.has(raw)) return raw;
    return RECURRENT_OPT_IN.PENDING;
}

/**
 * Badge semáforo para ficha clínica (touch-friendly, responsive).
 * @param {Object} patient
 * @returns {string} HTML
 */
/** Punto compacto para tarjetas del sidebar. */
export function renderWhatsAppOptInDot(patient) {
    const status = getRecurrentOptInStatus(patient);
    const dot = {
        [RECURRENT_OPT_IN.ACCEPTED]: { cls: 'bg-green-500', title: 'WhatsApp Activo' },
        [RECURRENT_OPT_IN.REJECTED]: { cls: 'bg-red-500', title: 'Seguimiento Manual' },
        [RECURRENT_OPT_IN.PENDING]: { cls: 'bg-amber-400', title: 'Pendiente de Respuesta' }
    }[status] || { cls: 'bg-amber-400', title: 'Pendiente de Respuesta' };
    return `<span class="inline-block w-2.5 h-2.5 rounded-full ${dot.cls} ring-2 ring-white shadow-sm flex-shrink-0" title="${dot.title}" aria-label="${dot.title}"></span>`;
}

export function renderWhatsAppOptInBadge(patient) {
    const status = getRecurrentOptInStatus(patient);
    const configs = {
        [RECURRENT_OPT_IN.ACCEPTED]: {
            label: 'WhatsApp Activo',
            dot: 'bg-green-500',
            ring: 'ring-green-200',
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800'
        },
        [RECURRENT_OPT_IN.REJECTED]: {
            label: 'Seguimiento Manual',
            dot: 'bg-red-500',
            ring: 'ring-red-200',
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800'
        },
        [RECURRENT_OPT_IN.PENDING]: {
            label: 'Pendiente de Respuesta',
            dot: 'bg-amber-400',
            ring: 'ring-amber-200',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-900'
        }
    };
    const c = configs[status] || configs[RECURRENT_OPT_IN.PENDING];
    return `
        <div id="patientWhatsAppOptInBadge"
            class="inline-flex items-center gap-2 min-h-[36px] px-2.5 py-1.5 rounded-xl border ${c.border} ${c.bg} ${c.text} touch-manipulation"
            role="status"
            aria-label="Estado WhatsApp: ${c.label}"
            data-optin-status="${status}">
            <span class="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-40"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${c.dot} ring-2 ${c.ring}"></span>
            </span>
            <span class="text-[10px] font-black uppercase tracking-tight leading-tight">${c.label}</span>
        </div>
    `;
}
