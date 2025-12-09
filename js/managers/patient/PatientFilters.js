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
                // Modo "Todos":
                // Si tienes permiso 'view_all_patients', ves todo.
                // Si no, solo ves lo tuyo.
                if (AuthManager.can('view_all_patients')) {
                    matchesTherapist = true;
                } else {
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
                if (AuthManager.can('view_all_patients')) {
                    matchesTherapist = true;
                } else {
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

            // 1. Si hay un terapeuta específico seleccionado (ej: "Diana" o "Sam")
            if (selectedTherapist && selectedTherapist !== 'all') {
                return p.therapist === selectedTherapist;
            }

            // 2. Si está seleccionado "Todos" (selectedTherapist === 'all' o null)

            // Si tiene permiso de ver todos, mostrar todos
            if (AuthManager.can('view_all_patients')) {
                return true;
            }

            // Si es terapeuta normal SIN permiso de ver todos, restringir a los suyos
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
     * @param {string} patientName - Nombre del paciente
     * @returns {Array<Object>} Lista de citas con pago pendiente
     */
    getPendingPayments(patientName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (PatientState.appointments || [])
            .filter(apt => {
                const aptDate = new Date(apt.date);
                // Usar canViewDetails es suficiente aquí
                const matchesTherapist = AuthManager.canViewDetails(apt);

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

    // ==========================================
    // MÉTODOS PRIVADOS (HELPERS)
    // ==========================================

    /**
     * Agrupa citas por paciente, tomando solo la primera cita del día
     * Y asegura enlazar con el ID correcto del perfil del paciente
     * @private
     */
    _groupByPatient(appointments) {
        const patientsMap = new Map();
        // Obtener lista completa de perfiles para cruzar IDs
        const allPatients = PatientState.patients || [];

        appointments.forEach(apt => {
            const existing = patientsMap.get(apt.name);
            const aptTime = new Date(apt.date);

            if (!existing || aptTime < existing.appointmentTime) {
                // Buscar el perfil real del paciente para obtener su ID correcto
                // Esto es crucial para que el click en "Hoy/Mañana" funcione y abra el historial
                const patientProfile = allPatients.find(p => p.name === apt.name);
                const realPatientId = patientProfile ? patientProfile.id : (apt.patientId || null);

                if (!realPatientId) {
                    // Si no encontramos ID, no podremos abrir historial, pero al menos mostramos la tarjeta
                    // console.warn(`⚠️ PatientFilters: No se encontró perfil para ${apt.name}`);
                }

                patientsMap.set(apt.name, {
                    name: apt.name,
                    appointmentTime: aptTime,
                    confirmed: apt.confirmed || false,
                    therapist: apt.therapist, // Importante conservar terapeuta
                    id: realPatientId, // USAR ID DEL PERFIL PARA QUE EL CLICK FUNCIONE
                    hasProfile: !!patientProfile
                });
            }
        });

        return Array.from(patientsMap.values())
            .sort((a, b) => a.appointmentTime - b.appointmentTime);
    }
};
