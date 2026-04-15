/**
 * PatientState.js
 * Estado centralizado del módulo de pacientes
 * 
 * Este módulo contiene:
 * - Todas las variables de estado (datos, UI state)
 * - Referencias DOM
 * - Métodos para actualizar estado de forma controlada
 * 
 * @module PatientState
 */

/**
 * Estado centralizado del módulo de pacientes
 * Todas las variables de estado viven aquí en lugar de variables globales
 */
export const PatientState = {
    // ==========================================
    // DATOS
    // ==========================================

    /**
     * Lista de perfiles de pacientes
     * Sincronizada con Firestore vía listener
     * @type {Array<Object>}
     */
    patients: [],

    activeCount: 0,
    inactiveCount: 0,

    /**
     * Lista de citas
     * Sincronizada con Firestore vía listener
     * @type {Array<Object>}
     */
    appointments: [],

    // ==========================================
    // UI STATE
    // ==========================================

    /**
     * Paciente actualmente seleccionado (para modal de historial)
     * @type {Object|null}
     */
    selectedPatient: null,

    /**
     * Modo de vista actual
     * @type {'today'|'tomorrow'|'all'|'inactive'}
     */
    viewMode: 'today',

    // ==========================================
    // REFERENCIAS DOM
    // ==========================================

    /**
     * Referencias a elementos del DOM
     * Se inicializan en initDOM()
     */
    dom: {
        // Lista principal
        patientsList: null,
        patientsHeader: null,
        searchInput: null, // Agregado para búsqueda

        // Modales
        patientHistoryModal: null,
        inactivePatientsModal: null,
        newPatientModal: null,

        // Inputs del modal de nuevo paciente
        newPatientFirstName: null,
        newPatientLastName: null,
        newPatientTherapist: null,
        newPatientDefaultCost: null,
        newPatientClinicFee: null,
        saveNewPatientBtn: null,
        closeNewPatientModalBtn: null,

        // Modal de historial
        patientHistoryTitle: null,
        patientHistoryList: null,
        patientTotalPaid: null,
        patientTotalPending: null,
        patientTotalAppointments: null,
        patientCompletedAppointments: null,
        patientUpcomingAppointments: null,
        deactivatePatientBtn: null,
        deletePatientBtn: null,
        editPatientBtn: null,
        patientEditSection: null,
        editPatientTherapist: null,
        editPatientCost: null,
        savePatientEditBtn: null,

        // Modal de inactivos
        inactivePatientsList: null,
        closeInactivePatientsBtn: null,
        closeInactivePatientsFooterBtn: null,

        // Otros
        viewInactivePatientsBtn: null
    },

    // ==========================================
    // MÉTODOS DE INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa todas las referencias DOM
     * Debe llamarse después de que el DOM esté listo
     */
    initDOM() {
        // Lista principal
        this.dom.patientsList = document.getElementById('patientsList');
        this.dom.patientsHeader = document.getElementById('patientsHeader');
        this.dom.searchInput = document.getElementById('searchInput');

        // Modales
        this.dom.patientHistoryModal = document.getElementById('patientHistoryModal');
        this.dom.inactivePatientsModal = document.getElementById('inactivePatientsModal');
        this.dom.newPatientModal = document.getElementById('newPatientModal');

        // Inputs del modal de nuevo paciente
        this.dom.newPatientFirstName = document.getElementById('newPatientFirstName');
        this.dom.newPatientLastName = document.getElementById('newPatientLastName');
        this.dom.newPatientTherapist = document.getElementById('newPatientTherapist');
        this.dom.newPatientDefaultCost = document.getElementById('newPatientDefaultCost');
        this.dom.newPatientClinicFee = document.getElementById('newPatientClinicFee');
        this.dom.newPatientParentName = document.getElementById('newPatientParentName');
        this.dom.newPatientPhone = document.getElementById('newPatientPhone');
        this.dom.saveNewPatientBtn = document.getElementById('saveNewPatientBtn');
        this.dom.closeNewPatientModalBtn = document.getElementById('closeNewPatientModalBtn');

        // Modal de historial
        this.dom.patientHistoryTitle = document.getElementById('patientHistoryTitle');
        this.dom.patientHistoryList = document.getElementById('patientAppointmentsList');
        this.dom.patientTotalPaid = document.getElementById('patientTotalPaid');
        this.dom.patientTotalPending = document.getElementById('patientTotalPending');
        this.dom.patientTotalAppointments = document.getElementById('patientTotalAppointments');
        this.dom.patientCompletedAppointments = document.getElementById('patientCompletedAppointments');
        this.dom.patientUpcomingAppointments = document.getElementById('patientUpcomingAppointments');
        this.dom.deactivatePatientBtn = document.getElementById('deactivatePatientBtn');
        this.dom.deletePatientBtn = document.getElementById('deletePatientBtn');
        this.dom.editPatientBtn = document.getElementById('editPatientBtn');
        this.dom.patientEditSection = document.getElementById('patientEditSection');
        this.dom.editPatientTherapist = document.getElementById('editPatientTherapist');
        this.dom.editPatientCost = document.getElementById('editPatientCost');
        this.dom.savePatientEditBtn = document.getElementById('savePatientEditBtn');

        // Modal de inactivos
        this.dom.inactivePatientsList = document.getElementById('inactivePatientsList');
        this.dom.closeInactivePatientsBtn = document.getElementById('closeInactivePatientsBtn');
        this.dom.closeInactivePatientsFooterBtn = document.getElementById('closeInactivePatientsFooterBtn');

        // Otros
        this.dom.viewInactivePatientsBtn = document.getElementById('viewInactivePatientsBtn');

        console.log('✅ PatientState: Referencias DOM inicializadas');
    },

    // ==========================================
    // MÉTODOS DE ACTUALIZACIÓN DE ESTADO
    // ==========================================

    /**
     * Actualiza la lista de pacientes
     * @param {Array<Object>} newPatients - Nueva lista de pacientes
     */
    updatePatients(newPatients) {
        this.patients = newPatients;
        // Calcular contadores
        this.activeCount = newPatients.filter(p => p.isActive !== false).length;
        this.inactiveCount = newPatients.length - this.activeCount;

        console.log(`📊 PatientState: ${newPatients.length} pacientes cargados (${this.activeCount} activos)`);
    },

    /**
     * Actualiza la lista de citas
     * @param {Array<Object>} newAppointments - Nueva lista de citas
     */
    updateAppointments(newAppointments) {
        this.appointments = newAppointments;
        console.log(`📅 PatientState: ${newAppointments.length} citas cargadas`);
    },

    /**
     * Cambia el modo de vista A UI (solo estado)
     * @param {'today'|'tomorrow'|'all'|'inactive'} mode - Nuevo modo de vista
     * @returns {boolean} - true si el cambio fue exitoso
     */
    setViewMode(mode) {
        this.viewMode = mode;
        console.log(`🔄 PatientState: Modo cambiado a: ${mode}`);
        return true;
    },

    /**
     * Establece el paciente seleccionado
     * @param {Object|null} patient - Paciente a seleccionar
     */
    setSelectedPatient(patient) {
        this.selectedPatient = patient;
        if (patient) {
            console.log(`👤 PatientState: Paciente seleccionado: ${patient.name}`);
        } else {
            console.log('👤 PatientState: Paciente deseleccionado');
        }
    },

    // ==========================================
    // MÉTODOS DE CONSULTA
    // ==========================================

    /**
     * Obtiene el paciente actualmente seleccionado
     * @returns {Object|null}
     */
    getSelectedPatient() {
        return this.selectedPatient;
    },

    /**
     * Obtiene el modo de vista actual
     * @returns {string}
     */
    getViewMode() {
        return this.viewMode;
    },

    /**
     * Verifica si hay referencias DOM inicializadas
     * @returns {boolean}
     */
    isDOMReady() {
        return this.dom.patientsList !== null;
    }
};
