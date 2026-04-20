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
 * ├── Sidebar (Componente UI Lista)
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
import { db, collectionPath, collection, onSnapshot, query, orderBy } from '../firebase.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.create('PatientMgr');

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
    ui: Sidebar,
    actions: PatientActions,
    modals: PatientModals,

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa el sistema completo de pacientes
     */
    async init() {
        log.info('Inicializando...');

        try {
            // 0. Inyectar Modales
            PatientModalsHTML.inject();

            // 1. Inicializar referencias DOM
            PatientState.initDOM();

            if (!PatientState.isDOMReady()) {
                throw new Error('DOM no se inicializó correctamente');
            }

            // 2. Inicializar Componente Sidebar
            Sidebar.init();

            // 3. Configurar listeners de UI (Restantes que no son de Sidebar)
            this._setupRemainingUIListeners();

            // 4. Configurar listener de datos (Firestore)
            this._setupRealtimeListener();

            log.success('Inicializado correctamente');

        } catch (error) {
            log.error('Error al inicializar:', error);
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

        // Listeners estáticos de modales
        if (dom.closeNewPatientModalBtn) {
            dom.closeNewPatientModalBtn.onclick = () => PatientModals.closeNewPatient();
        }

        if (dom.saveNewPatientBtn) {
            dom.saveNewPatientBtn.onclick = async (e) => {
                // El submit del form ya lo maneja
                console.log('🔘 PatientManager: Click en botón Crear');
            };
        }

        const newPatientForm = document.getElementById('newPatientForm');
        if (newPatientForm) {
            newPatientForm.onsubmit = async (e) => {
                e.preventDefault();
                console.log('📝 PatientManager: Procesando submit de formulario...');
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
     * Configura listeners de Firestore en tiempo real
     * Escucha tanto CITAS como PERFILES para sincronización total
     */
    _setupRealtimeListener() {
        // 1. Listen to Appointments
        const qApts = query(collection(db, collectionPath), orderBy("date", "desc"));
        onSnapshot(qApts, (snapshot) => {
            const appointments = [];
            snapshot.forEach((doc) => {
                appointments.push({ id: doc.id, ...doc.data() });
            });
            PatientState.updateAppointments(appointments);
            this._processData();
        });

        // 2. Listen to Patient Profiles (El "Maestro" de datos)
        const qProfiles = query(collection(db, 'patientProfiles'));
        onSnapshot(qProfiles, (snapshot) => {
            const profiles = [];
            snapshot.forEach((doc) => {
                profiles.push({ id: doc.id, ...doc.data() });
            });
            PatientState.updatePatients(profiles);
            this._processData();
        });
    },

    /**
     * Procesa y cruza los datos de citas y perfiles
     */
    _processData() {
        const appointments = PatientState.appointments;
        const profiles = PatientState.patients;

        log.time('Procesamiento de datos', () => {
            const patientMap = new Map();

            // 1. Primero cargar datos desde PERFILES oficiales (si existen)
            profiles.forEach(profile => {
                // EXCLUIR BLOQUES (No son pacientes reales)
                const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const normName = normalize(profile.name);

                if (profile.name?.startsWith('⛔') || 
                    normName.includes('inhabil') || 
                    normName.includes('vacaciones') || 
                    normName.includes('bloqueo')) {
                    return;
                }

                const normalizedName = profile.name.trim().toLowerCase();
                patientMap.set(normalizedName, {
                    ...profile,
                    appointments: [],
                    totalPaid: 0,
                    totalPending: 0,
                    lastVisit: null
                });
            });

            // 2. Agregar/Cruzar datos desde CITAS
            appointments.forEach(app => {
                // EXCLUIR BLOQUES (No son pacientes reales)
                const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const normName = normalize(app.name);

                if (app.name?.startsWith('⛔') || 
                    normName.includes('inhabil') || 
                    normName.includes('vacaciones') || 
                    normName.includes('bloqueo') ||
                    app.isFullDayBlock || 
                    app.isHourlyBlock) {
                    return;
                }

                const normalizedName = app.name.trim().toLowerCase();

                if (!patientMap.has(normalizedName)) {
                    // Si no tiene perfil, creamos uno temporal para que aparezca en la lista
                    patientMap.set(normalizedName, {
                        id: normalizedName, // ID temporal
                        name: app.name.trim(),
                        normalizedName: normalizedName,
                        appointments: [],
                        totalPaid: 0,
                        totalPending: 0,
                        lastVisit: null,
                        isActive: true,
                        therapist: app.therapist || 'diana'
                    });
                }

                const patient = patientMap.get(normalizedName);
                patient.appointments.push(app);
            });

            // 2. Calcular totales y ordenar
            const patients = Array.from(patientMap.values()).map(p => {
                // Calcular totales
                p.totalPaid = p.appointments
                    .filter(a => a.isPaid && !a.isCancelled)
                    .reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);

                p.totalPending = p.appointments
                    .filter(a => !a.isPaid && !a.isCancelled)
                    .reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);

                // Ordenar citas del paciente (más reciente primero - ya vienen ordenadas pero por seguridad)
                p.appointments.sort((a, b) => new Date(b.date) - new Date(a.date));

                if (p.appointments.length > 0) {
                    p.lastVisit = p.appointments[0].date;
                    // Solo sobreescribir si el perfil NO tiene terapeuta asignado (caso paciente nuevo sin perfil)
                    if (!p.hasProfile && p.appointments[0].therapist) {
                        p.therapist = p.appointments[0].therapist;
                    }
                }

                // Determinar si está activo (ej: última cita hace menos de 6 meses)
                // Por ahora mantenemos todos activos salvo lógica futura específica
                // p.isActive = ...

                return p;
            });

            // Actualizar estado centralizado
            PatientState.updatePatients(patients);
            PatientState.updateAppointments(appointments);

            // Re-renderizar UI
            this.render();

            log.info(`Perfiles actualizados: ${patients.length} pacientes`);
            log.debug(`Citas actualizadas: ${appointments.length} citas`);

            return patients;
        });
    },

    /**
     * Renderiza la interfaz principal (delega en Sidebar)
     */
    render() {
        Sidebar.render();

        // Refrescar modal de historial si está abierto para reflejar cambios en tiempo real
        const selectedPatient = PatientState.getSelectedPatient();
        if (selectedPatient &&
            PatientState.dom.patientHistoryModal &&
            !PatientState.dom.patientHistoryModal.classList.contains('hidden')) {
            // Buscar el paciente actualizado en el nuevo estado
            const updatedPatient = PatientState.patients.find(p => p.id === selectedPatient.id);
            if (updatedPatient) {
                // Actualizar solo los datos internos sin el log masivo de openHistory
                const canViewFinancials = AuthManager.isAdmin() || 
                                        AuthManager.currentUser?.role === 'receptionist' || 
                                        (updatedPatient.therapist === AuthManager.currentUser?.therapist);
                
                PatientModals._renderPatientAppointments(updatedPatient.appointments, canViewFinancials);
                PatientModals._setupHistoryActions(updatedPatient);
            }
        }
    }
};

// ==========================================
// EXPOSICIÓN GLOBAL (Compatibilidad HTML)
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
