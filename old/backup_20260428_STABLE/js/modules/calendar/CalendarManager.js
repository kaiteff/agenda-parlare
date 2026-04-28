/**
 * CalendarManager.js
 * Punto de entrada principal para el módulo de calendario
 */

import { CalendarEvents } from './CalendarEvents.js';

export const CalendarManager = {
    initCalendar() {
        CalendarEvents.init();
        // Exponer renderCalendar globalmente por compatibilidad
        window.renderCalendar = () => CalendarEvents.render();
    }
};
