/**
 * Citas sin confirmar — Control Maestro (Yari).
 * Badge principal: **hoy** sin confirmar (citas ya agendadas con anticipación).
 * Resaltado crítico (rosa + pulso): además faltan ≤2 h (regla operativa pre-sesión).
 */

export const CRITICAL_CONFIRM_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * @param {string} dateIso
 * @param {Date} [now]
 * @returns {number}
 */
export function getMsUntilAppointment(dateIso, now = new Date()) {
    if (!dateIso) return Infinity;
    return new Date(dateIso).getTime() - now.getTime();
}

function isSameLocalDay(dateIso, now = new Date()) {
    const d = new Date(dateIso);
    return d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate();
}

/**
 * Cita futura hoy, sin confirmar papá.
 * @param {object|null} apt
 * @param {Date} [now]
 */
export function isTodayUnconfirmed(apt, now = new Date()) {
    if (!apt || apt.confirmed || apt.isCancelled) return false;
    if (!isSameLocalDay(apt.date, now)) return false;
    return getMsUntilAppointment(apt.date, now) > 0;
}

/**
 * Ventana crítica: ≤2 h antes de la sesión (extra urgente).
 * @param {object|null} apt
 * @param {Date} [now]
 */
export function isCriticalUnconfirmed(apt, now = new Date()) {
    if (!isTodayUnconfirmed(apt, now)) return false;
    const ms = getMsUntilAppointment(apt.date, now);
    return ms > 0 && ms <= CRITICAL_CONFIRM_WINDOW_MS;
}

/** @deprecated usar isTodayUnconfirmed / isCriticalUnconfirmed */
export function isUrgentUnconfirmed(apt, now = new Date()) {
    return isTodayUnconfirmed(apt, now);
}

/**
 * @param {string} dateIso
 * @param {Date} [now]
 * @returns {string|null}
 */
export function formatAppointmentCountdown(dateIso, now = new Date()) {
    const ms = getMsUntilAppointment(dateIso, now);
    if (ms <= 0) return null;
    const totalMin = Math.ceil(ms / 60000);
    if (totalMin >= 24 * 60) {
        return `${Math.floor(totalMin / (24 * 60))} d`;
    }
    if (totalMin >= 60) {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return m > 0 ? `${h} h ${m} min` : `${h} h`;
    }
    return `${totalMin} min`;
}

/**
 * @param {Array<object>} appointments
 * @param {Date} [now]
 */
export function collectTodayUnconfirmed(appointments, now = new Date()) {
    return (appointments || []).filter((a) => isTodayUnconfirmed(a, now));
}

/** @deprecated usar collectTodayUnconfirmed */
export function collectUrgentUnconfirmed(appointments, now = new Date()) {
    return collectTodayUnconfirmed(appointments, now);
}
