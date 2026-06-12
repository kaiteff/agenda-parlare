/**
 * Reglas de negocio — cola «debe sesión» (pacientes especiales).
 * Debe coincidir con PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md
 */

import { TimeManager } from './TimeManager.js';
import { getStartOfWeek } from './dateUtils.js';

export const SIMILAR_WINDOW_MINUTES = 180;
export const EXCLUDE_SATURDAY = true;

export function weekAnchorFromDate(dateInput = new Date()) {
    const monday = getStartOfWeek(new Date(dateInput));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isSameCalendarDay(dateStr) {
    if (!dateStr) return false;
    const a = TimeManager.fromDate(dateStr);
    const b = new Date();
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function isSaturday(dateInput) {
    return new Date(dateInput).getDay() === 6;
}

export function isSimilarHour(slotDateStr, referenceSlotStr, windowMinutes = SIMILAR_WINDOW_MINUTES) {
    if (!slotDateStr || !referenceSlotStr) return false;
    const slot = TimeManager.fromDate(slotDateStr);
    const ref = TimeManager.fromDate(referenceSlotStr);
    const diffMin = Math.abs(slot.getTime() - ref.getTime()) / 60000;
    return diffMin <= windowMinutes;
}

/** true = fuera del habitual; false = habitual; null = desconocido */
export function inferOutsideHabitual(habitualSlot, cancelledSlot) {
    if (!habitualSlot || !cancelledSlot) return null;
    const h = TimeManager.fromDate(habitualSlot);
    const c = TimeManager.fromDate(cancelledSlot);
    if (h.getDay() !== c.getDay()) return true;
    return h.getHours() !== c.getHours() || h.getMinutes() !== c.getMinutes();
}
