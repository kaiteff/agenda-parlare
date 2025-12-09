/**
 * PatientFilters.js
 * Funciones puras de filtrado de pacientes
 * 
 * Este módulo contiene:
 * - Filtros por fecha (hoy, mañana)
 * - Filtros por terapeuta
 * - Cálculos de pagos pendientes
 * - Agrupación de datos
 * 
 * IMPORTANTE: Todas las funciones aquí son PURAS
 * - No modifican estado global
 * - No tienen efectos secundarios
 * - Mismo input = mismo output
 * - Fáciles de testear
 * 
 * @module PatientFilters
 */

import { PatientState } from './PatientState.js';
import { AuthManager } from '../AuthManager.js';

/**
 * Funciones de filtrado para pacientes
 */
export const PatientFilters = {

    // ==========================================
    // FILTROS POR FECHA
    // ==========================================

    /**
     * Obtiene pacientes con citas hoy
     * Respeta el filtro de terapeuta seleccionado
     * 
     * @returns {Array<Object>} Lista de pacientes con cita hoy, ordenados por hora
     * @example
     * const todayPatients = PatientFilters.getToday();
     * // [{ name: "Juan", appointmentTime: Date, confirmed: false }, ...]
     */
    getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const selectedTherapist = AuthManager.getSelectedTherapist();

        const todayAppointments = (PatientState.appointments || []).filter(apt => {
            const aptDate = new Date(apt.date);

            // Verificar filtro de terapeuta seleccionado
            let matchesTherapist = true;
            if (selectedTherapist && selectedTherapist !== 'all') {
                matchesTherapist = (apt.therapist === selectedTherapist);
            } else {
                // Si no hay filtro específico, aplicar reglas de rol
                if (AuthManager.can('view_all_appointments')) {
                    matchesTherapist = true;
                } else {
                    // Si no puede ver todas, debe coincidir con su terapeuta asignado
                    matchesTherapist = (apt.therapist === AuthManager.currentUser?.therapist);
                }
            }

            return aptDate >= today &&
                aptDate < tomorrow &&
                !apt.isCancelled &&
                matchesTherapist;
        });

        return this._groupByPatient(todayAppointments);
    },

    /**
     * Obtiene pacientes con citas mañana
     * Respeta el filtro de terapeuta seleccionado
     * 
     * @returns {Array<Object>} Lista de pacientes con cita mañana, ordenados por hora
     */
    getTomorrow() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const selectedTherapist = AuthManager.getSelectedTherapist();

        const tomorrowAppointments = (PatientState.appointments || []).filter(apt => {
            const aptDate = new Date(apt.date);

            // Verificar filtro de terapeuta seleccionado
            let matchesTherapist = true;
            if (selectedTherapist && selectedTherapist !== 'all') {
                matchesTherapist = (apt.therapist === selectedTherapist);
            } else {
                // Si no hay filtro específico, aplicar reglas de rol
                if (AuthManager.can('view_all_appointments')) {
                    matchesTherapist = true;
                } else {
                    // Si no puede ver todas, debe coincidir con su terapeuta asignado
                    matchesTherapist = (apt.therapist === AuthManager.currentUser?.therapist);
                }
            }

            return aptDate >= tomorrow &&
                aptDate < dayAfter &&
                !apt.isCancelled &&
                matchesTherapist;
        });

        return this._groupByPatient(tomorrowAppointments);
    },

    // ==========================================
    // FILTROS POR TERAPEUTA
    // ==========================================

    /**
     * Filtra pacientes activos según el terapeuta seleccionado
     * 
     * @param {Array<Object>} patients - Lista de pacientes a filtrar
     * @returns {Array<Object>} Pacientes filtrados
     */
    filterBySelectedTherapist(patients) {
        const selectedTherapist = AuthManager.getSelectedTherapist();

        return patients.filter(p => {
            if (p.isActive === false) return false;

            // Filtro por terapeuta
            if (selectedTherapist && selectedTherapist !== 'all') {
                return p.therapist === selectedTherapist;
            }

            // Si es terapeuta normal (no admin), solo ve los suyos
            if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
                return p.therapist === AuthManager.currentUser.therapist;
            }

            return true;
        });
    },

    // ==========================================
    // CÁLCULOS DE PAGOS
    // ==========================================

    /**
     * Obtiene citas con pago pendiente de un paciente
     * Solo incluye citas pasadas, no canceladas y no pagadas
     * 
     * @param {string} patientName - Nombre del paciente
     * @returns {Array<Object>} Lista de citas con pago pendiente, ordenadas por fecha (más reciente primero)
     */
    getPendingPayments(patientName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (PatientState.appointments || [])
            .filter(apt => {
                const aptDate = new Date(apt.date);
                const matchesTherapist = AuthManager.canEditItem(apt);

                return apt.name === patientName &&
                    aptDate < today &&
                    !apt.isPaid &&
                    !apt.isCancelled &&
                    matchesTherapist;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Calcula totales de pagos para una lista de citas
     * 
     * @param {Array<Object>} appointments - Lista de citas
     * @returns {Object} { totalPaid: number, totalPending: number }
     */
    calculatePaymentTotals(appointments) {
        let totalPaid = 0;
        let totalPending = 0;

        appointments.forEach(apt => {
            if (apt.isCancelled) return;

            const cost = parseFloat(apt.cost) || 0;
            if (apt.isPaid) {
                totalPaid += cost;
            } else {
                totalPending += cost;
            }
        });

        return { totalPaid, totalPending };
    },

    /**
     * Agrega totales de pagos a una lista de pacientes
     * 
     * @param {Array<Object>} patients - Lista de pacientes
     * @returns {Array<Object>} Pacientes con campos totalPaid y totalPending agregados
     */
    addPaymentTotals(patients) {
        return patients.map(profile => {
            const appointments = (PatientState.appointments || []).filter(apt => apt.name === profile.name);
            const { totalPaid, totalPending } = this.calculatePaymentTotals(appointments);

            return {
                ...profile,
                totalPaid,
                totalPending,
                appointmentCount: appointments.length
            };
        });
    },

    // ==========================================
    // MÉTODOS PRIVADOS (HELPERS)
    // ==========================================

    /**
     * Agrupa citas por paciente, tomando solo la primera cita del día
     * @private
     * @param {Array<Object>} appointments - Lista de citas
     * @returns {Array<Object>} Pacientes únicos con su primera cita
     */
    _groupByPatient(appointments) {
        const patientsMap = new Map();

        appointments.forEach(apt => {
            const existing = patientsMap.get(apt.name);
            const aptTime = new Date(apt.date);

            if (!existing || aptTime < existing.appointmentTime) {
                patientsMap.set(apt.name, {
                    name: apt.name,
                    appointmentTime: aptTime,
                    confirmed: apt.confirmed || false
                });
            }
        });

        return Array.from(patientsMap.values())
            .sort((a, b) => a.appointmentTime - b.appointmentTime);
    }
};
