/**
 * CalendarState.js
 * Gestiona el estado central del calendario
 */

export const CalendarState = {
    currentDate: new Date(),
    appointments: [],
    selectedEventId: null,
    originalEventDate: null,
    rescheduledFromId: null,

    // Vista móvil: semana completa vs un día
    viewMode: 'week', // 'week' | 'day'
    selectedDayIndex: 0, // 0–5 (Lun–Sáb dentro de la semana actual)

    // Referencias DOM (se inicializan en init)
    dom: {
        grid: null,
        monthLabel: null,
        modal: null,
        // ... otros elementos
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
        this.viewMode = window.innerWidth < 768 ? 'day' : 'week';

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
