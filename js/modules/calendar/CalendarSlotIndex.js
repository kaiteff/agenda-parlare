/**
 * CalendarSlotIndex.js
 * Índice en memoria para citas visibles en la semana/día actual del grid.
 * Evita filter() por cada celda (horas × días).
 */

import { formatDateLocal } from '../../utils/dateUtils.js';

/**
 * @param {Array} appointments
 * @param {Set<string>} visibleDateStrs — formatDateLocal de cada día del grid
 * @returns {{ slotMap: Map<string, object[]>, fullDayByDate: Map<string, object[]> }}
 */
export function buildCalendarSlotIndex(appointments, visibleDateStrs) {
    const slotMap = new Map();
    const fullDayByDate = new Map();

    for (const p of appointments) {
        if (p.isCancelled) continue;

        const pDate = new Date(p.date);
        let pDateStr;
        try {
            pDateStr = formatDateLocal(pDate);
        } catch {
            continue;
        }

        if (!visibleDateStrs.has(pDateStr)) continue;

        if (p.isFullDayBlock) {
            if (!fullDayByDate.has(pDateStr)) fullDayByDate.set(pDateStr, []);
            fullDayByDate.get(pDateStr).push(p);
            continue;
        }

        const hour = pDate.getHours();
        const key = `${pDateStr}|${hour}`;
        if (!slotMap.has(key)) slotMap.set(key, []);
        slotMap.get(key).push(p);
    }

    return { slotMap, fullDayByDate };
}

/**
 * @param {{ slotMap, fullDayByDate }} index
 * @param {string} dateStr
 * @param {number} hour
 */
export function getEventsForSlot(index, dateStr, hour) {
    const hourEvents = index.slotMap.get(`${dateStr}|${hour}`) || [];
    const fullDay = index.fullDayByDate.get(dateStr) || [];
    if (fullDay.length === 0) return hourEvents;
    return [...fullDay, ...hourEvents];
}
