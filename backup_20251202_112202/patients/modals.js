import { state } from './state.js';
import { patientsData, patientProfiles } from '../firebase.js';
import { renderPatientAppointments, renderInactivePatientsList } from './ui.js';
import { deactivatePatient, deletePatient } from './actions.js';

// Abrir modal de historial
export function openPatientHistoryModal(patient) {
    state.selectedPatient = patient;

    const appointments = patientsData.filter(apt => apt.name === patient.name);

    // Calcular estadísticas
    const now = new Date();
    const completed = appointments.filter(apt => new Date(apt.date) < now);
    const upcoming = appointments.filter(apt => new Date(apt.date) >= now);

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

    // Actualizar título
    if (state.dom.patientHistoryTitle) {
        state.dom.patientHistoryTitle.innerHTML = `
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Historial de ${patient.name}
        `;
    }

    // Actualizar totales
    if (state.dom.patientTotalPaid) state.dom.patientTotalPaid.textContent = `$${totalPaid}`;
    if (state.dom.patientTotalPending) state.dom.patientTotalPending.textContent = `$${totalPending}`;

    // Actualizar estadísticas
    if (state.dom.patientTotalAppointments) state.dom.patientTotalAppointments.textContent = appointments.length;
    if (state.dom.patientCompletedAppointments) state.dom.patientCompletedAppointments.textContent = completed.length;
    if (state.dom.patientUpcomingAppointments) state.dom.patientUpcomingAppointments.textContent = upcoming.length;

    // Renderizar lista de citas
    renderPatientAppointments(appointments);

    // Botones de acción
    const { deactivateBtn, deleteBtn, editBtn } = state.dom;

    if (deactivateBtn && deleteBtn && editBtn) {
        // Ocultar inicialmente los botones de baja y eliminar
        deactivateBtn.classList.add('hidden');
        deleteBtn.classList.add('hidden');

        // Al hacer clic en Editar, mostrar opciones
        editBtn.onclick = () => {
            deactivateBtn.classList.toggle('hidden');
            deleteBtn.classList.toggle('hidden');
        };

        // Acción de dar de baja
        deactivateBtn.onclick = () => deactivatePatient(patient.id, patient.name);

        // Acción de eliminar paciente
        deleteBtn.onclick = () => deletePatient(patient);
    }

    // Mostrar modal
    if (state.dom.patientHistoryModal) {
        state.dom.patientHistoryModal.classList.remove('hidden');
    }
}

// Cerrar modal de historial
export function closePatientHistoryModal() {
    if (state.dom.patientHistoryModal) {
        state.dom.patientHistoryModal.classList.add('hidden');
    }
    state.selectedPatient = null;
}

// Abrir modal de pacientes inactivos
export function openInactivePatientsModal() {
    const inactivePatients = patientProfiles.filter(p => p.isActive === false);

    renderInactivePatientsList(inactivePatients);

    if (state.dom.inactivePatientsModal) {
        state.dom.inactivePatientsModal.classList.remove('hidden');
    }
}

// Cerrar modal de inactivos
export function closeInactivePatientsModal() {
    if (state.dom.inactivePatientsModal) {
        state.dom.inactivePatientsModal.classList.add('hidden');
    }
}

// Crear nuevo paciente manualmente (Abrir Modal)
export function createNewPatient() {
    if (!state.dom.newPatientModal) return;
    state.dom.newPatientFirstName.value = '';
    state.dom.newPatientLastName.value = '';
    state.dom.newPatientModal.classList.remove('hidden');
    state.dom.newPatientFirstName.focus();
}
