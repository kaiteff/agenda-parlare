/**
 * CalendarState.js
 * Gestiona el estado central del calendario
 */

export const CalendarState = {
    currentDate: new Date(),
    appointments: [],
    selectedEventId: null,
    originalEventDate: null,

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
    }
};
