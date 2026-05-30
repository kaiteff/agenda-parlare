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
import { db, collectionPath, collection, onSnapshot, query, getDocs, where } from '../firebase.js';
import { Logger } from '../utils/Logger.js';
import { AuthManager } from './AuthManager.js';
import { CalendarData } from '../modules/calendar/CalendarData.js';

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

    // Unsubscribe handlers (para evitar memory leak en logout/login)
    _unsubscribeApts: null,
    _unsubscribeProfiles: null,
    /** Super/recepción: getDocs 1× por sesión (uid); terapeutas: onSnapshot filtrado. */
    _profilesSessionUid: null,
    _profilesLoadPromise: null,
    // Profiles crudos directos del snapshot Firestore (evita que _processData lea
    // el array enriquecido en una segunda pasada y sobreescriba con appointments: []).
    _rawProfiles: [],

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa el sistema completo de pacientes
     */
    async init() {
        log.info('Inicializando...');

        try {
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
        const cancelNewPatientBtn = document.getElementById('cancelNewPatientBtn');
        if (cancelNewPatientBtn) {
            cancelNewPatientBtn.onclick = () => PatientModals.closeNewPatient();
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
                } else if (target.closest('.note-btn')) {
                    e.stopPropagation();
                    const btn = target.closest('.note-btn');
                    const aptId = btn.dataset.aptId;
                    const patient = PatientState.getSelectedPatient();
                    const appointment = PatientState.appointments.find(a => a.id === aptId);
                    if (appointment && patient) {
                        PatientModals.openSessionNote(appointment, patient);
                    }
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
     * Ventana de 90 días [-30, +60] para reducir lecturas Firestore (~75% menos vs anterior).
     */
    _setupRealtimeListener() {
        // Limpieza previa: si ya hay listeners activos (re-login, hot reload, etc.)
        // los desuscribimos antes de crear nuevos para evitar memory leak y rendido doble.
        this._teardownListeners();

        const user = AuthManager.currentUser;
        const isSuperUser = AuthManager.isAdmin() || user?.role === 'receptionist';
        const therapistId = user?.therapist || 'diana';

        // 1. Listener de CITAS unificado y compartido vía CalendarData
        this._unsubscribeApts = CalendarData.subscribe((appointments) => {
            // Clonar para no alterar el array compartido y ordenar en cliente
            const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
            this._processData(sortedAppointments, null);
        });

        // 2. Perfiles: super/recepción = 1 lectura masiva por sesión; terapeutas = tiempo real filtrado
        if (isSuperUser) {
            this._loadProfilesOnce();
        } else {
            this._subscribeProfilesRealtime(therapistId);
        }
    },

    /**
     * Super/recepción: una sola carga de todos los perfiles por login (sin onSnapshot).
     * @param {boolean} [force=false] — true tras crear/editar paciente
     */
    async refreshProfiles(force = false) {
        const isSuperUser = AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist';
        if (!isSuperUser) return;
        await this._loadProfilesOnce(force);
    },

    async _loadProfilesOnce(force = false) {
        const uid = AuthManager.currentUser?.uid;
        if (!uid) return;

        if (!force && this._profilesSessionUid === uid && this._rawProfiles.length > 0) {
            log.info('Perfiles: cache de sesión (sin nueva lectura Firestore)');
            this._processData(null, this._rawProfiles);
            return;
        }

        if (this._profilesLoadPromise && !force) {
            await this._profilesLoadPromise;
            return;
        }

        log.info('Perfiles: getDocs único (modo super/recepción)');

        this._profilesLoadPromise = (async () => {
            try {
                const snap = await getDocs(collection(db, 'patientProfiles'));
                const profiles = [];
                snap.forEach((d) => profiles.push({ id: d.id, ...d.data() }));
                this._profilesSessionUid = uid;
                this._processData(null, profiles);
                log.success(`Perfiles cargados: ${profiles.length} (~${profiles.length} reads, getDocs 1× sesión)`);
            } catch (error) {
                log.error('Error cargando perfiles:', error);
            } finally {
                this._profilesLoadPromise = null;
            }
        })();

        await this._profilesLoadPromise;
    },

    _subscribeProfilesRealtime(therapistId) {
        log.info(`Perfiles: listener filtrado (${therapistId})`);
        const qProfiles = query(
            collection(db, 'patientProfiles'),
            where('therapist', '==', therapistId)
        );

        this._unsubscribeProfiles = onSnapshot(qProfiles, (snapshot) => {
            const profiles = [];
            snapshot.forEach((d) => {
                profiles.push({ id: d.id, ...d.data() });
            });
            this._processData(null, profiles);
        }, (error) => {
            log.error('Error en listener de perfiles:', error);
        });
    },

    /**
     * Cancela los listeners activos. Llamado al re-suscribir y, opcionalmente,
     * al hacer logout (ver `AuthManager.onLogout` si se integra).
     */
    _teardownListeners() {
        if (typeof this._unsubscribeApts === 'function') {
            try { this._unsubscribeApts(); } catch (e) { log.warn('Error al desuscribir citas:', e); }
            this._unsubscribeApts = null;
        }
        if (typeof this._unsubscribeProfiles === 'function') {
            try { this._unsubscribeProfiles(); } catch (e) { log.warn('Error al desuscribir perfiles:', e); }
            this._unsubscribeProfiles = null;
        }
        this._profilesSessionUid = null;
        this._profilesLoadPromise = null;
    },

    /**
     * Procesa y cruza los datos de citas y perfiles.
     * Recibe los datos frescos por argumento (no del estado global) para evitar
     * que una segunda pasada lea el array de pacientes ya enriquecido.
     *
     * @param {Array|null} appointmentsArg - Si se pasa, actualiza el state + reprocesa
     * @param {Array|null} profilesArg - Si se pasa, actualiza `_rawProfiles` + reprocesa
     */
    _processData(appointmentsArg = null, profilesArg = null) {
        // Actualizar estado fresco si llegó snapshot
        if (Array.isArray(appointmentsArg)) {
            PatientState.updateAppointments(appointmentsArg);
        }
        if (Array.isArray(profilesArg)) {
            this._rawProfiles = profilesArg;
        }

        const appointments = PatientState.appointments;
        const profiles = this._rawProfiles;

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
                    const lastApt = p.appointments[0];
                    p.lastVisit = lastApt.date;

                    // LÓGICA DE RELEVO PARA PESTAÑA "TODAS":
                    // Si el terapeuta de la cita es distinto al del perfil, marcamos el relevo
                    if (lastApt.therapist && lastApt.therapist !== p.therapist) {
                        p.planningTherapist = p.therapist; // El dueño del perfil planeó
                        p.therapist = lastApt.therapist;   // El de la cita atiende
                    }

                    // Solo sobreescribir si el perfil NO tiene terapeuta asignado (caso paciente nuevo sin perfil)
                    if (!p.hasProfile && lastApt.therapist) {
                        p.therapist = lastApt.therapist;
                    }
                }

                // Determinar si está activo (ej: última cita hace menos de 6 meses)
                // Por ahora mantenemos todos activos salvo lógica futura específica
                // p.isActive = ...

                return p;
            });

            // Actualizar estado centralizado (solo el enriquecido; las appointments
            // ya las actualizamos al inicio si llegó snapshot fresco).
            PatientState.updatePatients(patients);

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
        import('../components/WhatsAppDashboard.js').then(m => m.WhatsAppDashboard.render());

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

                // Usar cache de historial cargado en `openHistory` (todas las citas históricas)
                // como fuente preferida; sólo recurrir a `updatedPatient.appointments`
                // (ventana 90 días) si no hay cache válido.
                const historyAppointments = PatientModals.getHistoryAppointments(
                    updatedPatient,
                    updatedPatient.appointments
                );

                PatientModals._renderPatientAppointments(historyAppointments, canViewFinancials);
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
    window.closeInactivePatientsModal = () => PatientModals.closeInactivePatients();
}
