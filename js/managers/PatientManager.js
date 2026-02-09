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
 * ├── Sidebar (Componente UI Lista) [NUEVO]
 * ├── PatientActions (CRUD)
 * └── PatientModals (modales)
 * 
 * @module PatientManager
 */

import { PatientState } from './patient/PatientState.js';
import { PatientFilters } from './patient/PatientFilters.js';
import { Sidebar } from '../components/Sidebar.js';
import { PatientActions } from './patient/PatientActions.js';
import { PatientModals } from './patient/PatientModals.js';
import { PatientModalsHTML } from './patient/PatientModalsHTML.js';
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

    state: PatientState,
    filters: PatientFilters,
    ui: Sidebar, // Reemplazamos UI con Sidebar en la API pública para renderizado de lista
    actions: PatientActions,
    modals: PatientModals,

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa el sistema completo de pacientes
     */
    async init() {
        console.log('🏥 Inicializando PatientManager...');

        try {
            // 0. Inyectar Modales
            console.log('  💉 Inyectando HTML de modales...');
            PatientModalsHTML.inject();

            // 1. Inicializar referencias DOM
            console.log('  📋 Inicializando DOM...');
            PatientState.initDOM();

            if (!PatientState.isDOMReady()) {
                throw new Error('DOM no se inicializó correctamente');
            }

            // 2. Inicializar Componente Sidebar
            console.log('  🎨 Inicializando Sidebar...');
            Sidebar.init();

            // 3. Configurar listeners de UI (Restantes que no son de Sidebar)
            this._setupRemainingUIListeners();

            // 4. Configurar listeners de datos (Firestore)
            console.log('  🔄 Configurando listeners de datos...');
            await this._setupDataListeners();

            console.log('✅ PatientManager inicializado correctamente');

        } catch (error) {
            console.error('❌ Error al inicializar PatientManager:', error);
            throw error;
        }
    },

    /**
     * Configura listeners de UI que no pertenecen al Sidebar
     * (Principalmente lógica interna de modales que aún no se ha extraído)
     * @private
     */
    _setupRemainingUIListeners() {
        const { dom } = PatientState;

        // Listeners estáticos de modales (que no están en la lista principal)
        if (dom.closeNewPatientModalBtn) {
            dom.closeNewPatientModalBtn.onclick = () => PatientModals.closeNewPatient();
        }

        if (dom.saveNewPatientBtn) {
            dom.saveNewPatientBtn.onclick = async () => {
                await PatientActions.saveNewPatient();
            };
        }

        // Controles de modales de inactivos
        if (dom.closeInactivePatientsBtn) dom.closeInactivePatientsBtn.onclick = () => PatientModals.closeInactivePatients();
        if (dom.closeInactivePatientsFooterBtn) dom.closeInactivePatientsFooterBtn.onclick = () => PatientModals.closeInactivePatients();

        // Delegación para HISTORIAL (Confirmar/Pagar) - Esto ocurre DENTRO del modal
        if (dom.patientHistoryList) {
            dom.patientHistoryList.addEventListener('click', async (e) => {
                const target = e.target;
                const payBtn = target.closest('.pay-btn');
                const confirmBtn = target.closest('.confirm-btn');

                if (confirmBtn) {
                    e.stopPropagation();
                    const id = confirmBtn.dataset.id;
                    const status = confirmBtn.dataset.status === 'true';
                    await PatientActions.toggleConfirmationDirect(id, status);
                } else if (payBtn) {
                    e.stopPropagation();
                    const id = payBtn.dataset.id;
                    await PatientActions.markAsPaid(id, { target: payBtn });
                }
            });
        }

        // Delegación para LISTA DE INACTIVOS (Reactivar) - Esto ocurre DENTRO del modal
        if (dom.inactivePatientsList) {
            dom.inactivePatientsList.addEventListener('click', async (e) => {
                const reactivateBtn = e.target.closest('.reactivate-btn');
                if (reactivateBtn) {
                    const id = reactivateBtn.dataset.id;
                    const name = reactivateBtn.dataset.name;
                    await PatientActions.reactivatePatient(id, name);
                }
            });
        }
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

            // Re-renderizar Sidebar cuando cambien los datos
            Sidebar.render();

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

            if (typeof window !== 'undefined') {
                window.patientsData = appointments;
            }

            // Re-renderizar Sidebar cuando cambien las citas
            Sidebar.render();

            // Refrescar modal de historial si está abierto
            const selectedPatient = PatientState.getSelectedPatient();
            if (selectedPatient &&
                PatientState.dom.patientHistoryModal &&
                !PatientState.dom.patientHistoryModal.classList.contains('hidden')) {
                PatientModals.openHistory(selectedPatient);
            }

            console.log(`🔄 Citas actualizadas: ${appointments.length} citas`);
        });
    },

    // ==========================================
    // API PÚBLICA
    // ==========================================

    api: {
        getPatient(id) {
            return PatientState.patients.find(p => p.id === id);
        },
        getActivePatients() {
            return PatientState.patients.filter(p => p.isActive !== false);
        },
        getTodayCount() {
            return PatientFilters.getToday().length;
        },
        getTomorrowCount() {
            return PatientFilters.getTomorrow().length;
        },
        refreshList() {
            Sidebar.render();
        },
        // Métodos proxy para mantener compatibilidad
        openHistory: PatientModals.openHistory,
        openNewPatient: PatientModals.openNewPatient,
        markAsPaid: PatientActions.markAsPaid,
        toggleConfirmation: PatientActions.toggleConfirmation
    }
};

// ==========================================
// EXPOSICIÓN GLOBAL
// ==========================================

if (typeof window !== 'undefined') {
    window.PatientManager = PatientManager;

    // Métodos para HTML onclicks
    window.openPatientHistoryModal = (patient) => PatientModals.openHistory(patient);
    window.openPatientHistoryById = (id) => {
        const patient = PatientState.patients.find(p => p.id === id);
        if (patient) {
            PatientModals.openHistory(patient);
        } else {
            console.error("Paciente no encontrado para ID:", id);
        }
    };
    window.closePatientHistoryModal = () => PatientModals.closeHistory();
    window.openNewPatientModal = () => PatientModals.openNewPatient();
    window.closeNewPatientModal = () => PatientModals.closeNewPatient();
}
