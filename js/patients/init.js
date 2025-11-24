import { db, patientProfilesPath, collection, onSnapshot, query, subscribeToPatientsData, updatePatientProfiles } from '../firebase.js';
import { state } from './state.js';
import { renderPatientsList } from './ui.js';
import { handleSaveNewPatient } from './actions.js';

// Inicializar referencias DOM
export function initPatientsDom() {
    state.dom.patientsList = document.getElementById('patientsList');
    state.dom.patientsHeader = document.getElementById('patientsHeader');
    state.dom.patientHistoryModal = document.getElementById('patientHistoryModal');
    state.dom.inactivePatientsModal = document.getElementById('inactivePatientsModal');
    state.dom.newPatientModal = document.getElementById('newPatientModal');
    state.dom.newPatientFirstName = document.getElementById('newPatientFirstName');
    state.dom.newPatientLastName = document.getElementById('newPatientLastName');
    state.dom.saveNewPatientBtn = document.getElementById('saveNewPatientBtn');
    state.dom.closeNewPatientModalBtn = document.getElementById('closeNewPatientModalBtn');

    // History Modal Elements
    state.dom.patientHistoryTitle = document.getElementById('patientHistoryTitle');
    state.dom.patientTotalPaid = document.getElementById('patientTotalPaid');
    state.dom.patientTotalPending = document.getElementById('patientTotalPending');
    state.dom.patientTotalAppointments = document.getElementById('patientTotalAppointments');
    state.dom.patientCompletedAppointments = document.getElementById('patientCompletedAppointments');
    state.dom.patientUpcomingAppointments = document.getElementById('patientUpcomingAppointments');
    state.dom.patientAppointmentsList = document.getElementById('patientAppointmentsList');
    state.dom.deactivateBtn = document.getElementById('deactivatePatientBtn');
    state.dom.deleteBtn = document.getElementById('deletePatientBtn');
    state.dom.editBtn = document.getElementById('editPatientBtn');

    // Inactive Modal Elements
    state.dom.inactivePatientsList = document.getElementById('inactivePatientsList');
}

// Setup event listeners
export function setupEventListeners() {
    if (state.dom.closeNewPatientModalBtn) {
        state.dom.closeNewPatientModalBtn.onclick = () => state.dom.newPatientModal.classList.add('hidden');
    }

    if (state.dom.saveNewPatientBtn) {
        state.dom.saveNewPatientBtn.onclick = handleSaveNewPatient;
    }

    // Listener para botón "Ver Bajas"
    const viewInactiveBtn = document.getElementById('viewInactivePatientsBtn');
    if (viewInactiveBtn) {
        viewInactiveBtn.onclick = window.openInactivePatientsModal;
    }
}

// Listener de perfiles
export function setupPatientProfilesListener() {
    console.log("🏥 patients.js: Iniciando listener de perfiles");
    const profilesColRef = collection(db, patientProfilesPath);
    const profilesQuery = query(profilesColRef);

    onSnapshot(profilesQuery, (snapshot) => {
        const profiles = [];
        snapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        updatePatientProfiles(profiles);
        renderPatientsList();
    }, (error) => {
        console.error("Error Patient Profiles: " + error.message);
    });
}

// Suscribirse a cambios en citas
export function setupPatientsDataListener() {
    subscribeToPatientsData(() => {
        console.log("🏥 patients.js: Recibida actualización de datos de citas");
        renderPatientsList();
    });
}
