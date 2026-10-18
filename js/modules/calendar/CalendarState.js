/**
 * CalendarState.js
 * Gestiona el estado central del calendario
 */

import { isMobileLayout } from '../../utils/viewport.js';

export const CalendarState = {
    currentDate: new Date(),
    appointments: [],
    selectedEventId: null,
    originalEventDate: null,
    rescheduledFromId: null,

    // Vista móvil: semana completa vs un día
    viewMode: 'week', // 'week' | 'day'
    selectedDayIndex: 0, // 0–5 (Lun–Sáb dentro de la semana actual)

    /** Si true, el próximo renderCalendar hace scroll a ~10:00 (solo Hoy / carga inicial). */
    scrollToWorkHoursOnNextRender: false,

    // Referencias DOM (se inicializan en init)
    dom: {
        grid: null,
        monthLabel: null,
        modal: null,
        // ... otros elementos
    },

    /**
     * Reconsulta un nodo si el cache está vacío o ya no está en el documento.
     * Evita TypeError Safari: "null is not an object (evaluating 'x.value')".
     */
    ensureDom(key, id) {
        const current = this.dom[key];
        if (current?.isConnected) return current;
        const live = typeof document !== 'undefined' ? document.getElementById(id) : null;
        if (live) this.dom[key] = live;
        return live || null;
    },

    /**
     * Actualiza la fecha actual
     * @param {Date} date 
     */
    setDate(date) {
        this.currentDate = new Date(date);
    },

    /**
     * Establece las citas cargadas
     * @param {Array} appointments 
     */
    setAppointments(appointments) {
        this.appointments = appointments;
    },

    /**
     * Detecta resolución y preselecciona el día laborable actual (Lun–Sáb).
     */
    initViewMode() {
        // Landscape en celular supera 768px de ancho; usar altura (viewport.js)
        this.viewMode = isMobileLayout() ? 'day' : 'week';

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, …, 6 = Sábado
        if (dayOfWeek === 0) {
            this.selectedDayIndex = 0;
        } else {
            this.selectedDayIndex = dayOfWeek - 1;
        }
        console.log(`[CalendarState] ViewMode auto-set: ${this.viewMode}, selectedDayIndex: ${this.selectedDayIndex}`);
    }
};
