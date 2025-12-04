/**
 * PatientManager.js
 * Coordinador principal del módulo de pacientes
 * 
 * Este es el punto de entrada único para todo el sistema de pacientes.
 * Coordina todos los submódulos y expone una API pública limpia.
 * 
 * Arquitectura:
 * PatientManager (coordinador)
 * ├── PatientState (estado centralizado)
 * ├── PatientFilters (lógica pura)
 * ├── PatientUI (renderizado)
 * ├── PatientActions (CRUD)
 * └── PatientModals (modales)
 * 
 * @module PatientManager
 */

import { PatientState } from './patient/PatientState.js';
import { PatientFilters } from './patient/PatientFilters.js';
import { PatientUI } from './patient/PatientUI.js';
import { PatientActions } from './patient/PatientActions.js';
import { PatientModals } from './patient/PatientModals.js';
import { patientProfiles, patientsData } from '../firebase.js';
import { onSnapshot, collection, query } from '../firebase.js';

/**
 * Manager principal para gestión de pacientes
 * Coordina todos los submódulos y expone API pública
 */
export const PatientManager = {

    // ==========================================
    // SUBMÓDULOS (acceso público)
    // ==========================================

    /**
     * Estado centralizado
     * @type {Object}
     */
    state: PatientState,

    /**
     * Funciones de filtrado
     * @type {Object}
     */
    filters: PatientFilters,

    /**
     * Funciones de UI
     * @type {Object}
     */
    ui: PatientUI,

    /**
     * Acciones CRUD
     * @type {Object}
     */
    actions: PatientActions,

    /**
     * Gestión de modales
     * @type {Object}
     */
    modals: PatientModals,

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa el sistema completo de pacientes
     * Debe llamarse después de que el DOM esté listo
     * 
     * @returns {Promise<void>}
     */
    async init() {
        console.log('🏥 Inicializando PatientManager...');

        try {
            // 1. Inicializar referencias DOM
            console.log('  📋 Inicializando DOM...');
            PatientState.initDOM();

            if (!PatientState.isDOMReady()) {
                throw new Error('DOM no se inicializó correctamente');
            }

            // 2. Configurar listeners de UI
            console.log('  🎨 Configurando listeners de UI...');
            this._setupUIListeners();

            // 3. Configurar listeners de datos (Firestore)
            console.log('  🔄 Configurando listeners de datos...');
            await this._setupDataListeners();

            // 4. Renderizado inicial
            console.log('  🎨 Renderizado inicial...');
            PatientUI.renderList();

            console.log('✅ PatientManager inicializado correctamente');

        } catch (error) {
            console.error('❌ Error al inicializar PatientManager:', error);
            throw error;
        }
    },

    /**
     * Configura los event listeners de la UI
     * @private
     */
    _setupUIListeners() {
        const { dom } = PatientState;

        // Modal de nuevo paciente
        if (dom.closeNewPatientModalBtn) {
            dom.closeNewPatientModalBtn.onclick = () => {
                PatientModals.closeNewPatient();
            };
        }

        if (dom.saveNewPatientBtn) {
            dom.saveNewPatientBtn.onclick = async () => {
                await PatientActions.saveNewPatient();
            };
        }

        // Botón de ver inactivos
        const viewInactiveBtn = document.getElementById('viewInactivePatientsBtn');
        if (viewInactiveBtn) {
            viewInactiveBtn.onclick = () => {
                PatientModals.openInactive();
            };
        }

        // Modal de inactivos
        if (dom.closeInactivePatientsBtn) {
            dom.closeInactivePatientsBtn.onclick = () => {
                PatientModals.closeInactive();
            };
        }

        console.log('  ✅ Listeners de UI configurados');
    },

    /**
     * Configura los listeners de datos de Firestore
     * @private
     */
    async _setupDataListeners() {
        const { db, collection, query, onSnapshot } = await import('../firebase.js');

        // Listener para perfiles de pacientes
        const profilesRef = collection(db, 'patientProfiles');
        const profilesQuery = query(profilesRef);

        onSnapshot(profilesQuery, (snapshot) => {
            const profiles = [];
            snapshot.forEach((doc) => {
                profiles.push({ id: doc.id, ...doc.data() });
            });

            PatientState.updatePatients(profiles);

            // Re-renderizar lista cuando cambien los datos
            PatientUI.renderList();

            console.log(`🔄 Perfiles actualizados: ${profiles.length} pacientes`);
        });

        // Listener para citas (appointments)
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef);

        onSnapshot(appointmentsQuery, (snapshot) => {
            const appointments = [];
            snapshot.forEach((doc) => {
                appointments.push({ id: doc.id, ...doc.data() });
            });

            PatientState.updateAppointments(appointments);

            // Exponer globalmente para compatibilidad con funciones que lo necesitan
            if (typeof window !== 'undefined') {
                window.patientsData = appointments;
            }

            // Re-renderizar lista cuando cambien las citas
            PatientUI.renderList();

            console.log(`🔄 Citas actualizadas: ${appointments.length} citas`);
        });

        console.log('  ✅ Listeners de datos configurados');
    },

    // ==========================================
    // API PÚBLICA
    // ==========================================

    /**
     * API pública para otros módulos
     * Expone solo las funciones necesarias
     */
    api: {
        /**
         * Obtiene un paciente por ID
         * @param {string} id - ID del paciente
         * @returns {Object|undefined} Paciente encontrado
         */
        getPatient(id) {
            return PatientState.patients.find(p => p.id === id);
        },

        /**
         * Obtiene todos los pacientes activos
         * @returns {Array<Object>} Lista de pacientes activos
         */
        getActivePatients() {
            return PatientState.patients.filter(p => p.isActive !== false);
        },

        /**
         * Obtiene la cantidad de pacientes con cita hoy
         * @returns {number} Cantidad de pacientes
         */
        getTodayCount() {
            return PatientFilters.getToday().length;
        },

        /**
         * Obtiene la cantidad de pacientes con cita mañana
         * @returns {number} Cantidad de pacientes
         */
        getTomorrowCount() {
            return PatientFilters.getTomorrow().length;
        },

        /**
         * Fuerza un re-renderizado de la lista
         */
        refreshList() {
            PatientUI.renderList();
        },

        /**
         * Abre el modal de historial de un paciente
         * @param {Object} patient - Datos del paciente
         */
        openHistory(patient) {
            PatientModals.openHistory(patient);
        },

        /**
         * Abre el modal de nuevo paciente
         */
        openNewPatient() {
            PatientModals.openNewPatient();
        },

        /**
         * Marca una cita como pagada
         * @param {string} appointmentId - ID de la cita
         * @returns {Promise<boolean>}
         */
        async markAsPaid(appointmentId) {
            return await PatientActions.markAsPaid(appointmentId);
        },

        /**
         * Alterna confirmación de cita
         * @param {string} patientName - Nombre del paciente
         * @returns {Promise<boolean>}
         */
        async toggleConfirmation(patientName) {
            return await PatientActions.toggleConfirmation(patientName);
        }
    }
};

// ==========================================
// EXPOSICIÓN GLOBAL (para compatibilidad con HTML)
// ==========================================

/**
 * Exponer funciones necesarias globalmente
 * Esto permite que los onclick en HTML funcionen
 */
if (typeof window !== 'undefined') {
    // Exponer el manager completo
    window.PatientManager = PatientManager;

    // Funciones específicas para onclick en HTML
    window.openPatientHistoryModal = (patient) => PatientModals.openHistory(patient);
    window.closePatientHistoryModal = () => PatientModals.closeHistory();
    window.openNewPatientModal = () => PatientModals.openNewPatient();
    window.closeNewPatientModal = () => PatientModals.closeNewPatient();
    window.quickMarkAsPaid = (id) => PatientActions.markAsPaid(id);
    window.toggleConfirmationFromList = (name) => PatientActions.toggleConfirmation(name);
    window.reactivatePatientFromList = (id, name) => PatientActions.reactivatePatient(id, name);

    console.log('✅ PatientManager expuesto globalmente');
}
