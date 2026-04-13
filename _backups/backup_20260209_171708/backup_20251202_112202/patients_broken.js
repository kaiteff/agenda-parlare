// patients.js - Sistema modular de gestión de pacientes
// Este archivo actúa como punto de entrada y exporta las funciones públicas

import { initPatientsDom, setupEventListeners, setupPatientProfilesListener, setupPatientsDataListener } from './patients/init.js';
import { renderPatientsList } from './patients/ui.js';
import { quickMarkAsPaid, toggleConfirmationFromList, handleSaveNewPatient, deactivatePatient, reactivatePatient, rescheduleAppointment } from './patients/actions.js';
import { openPatientHistoryModal, closePatientHistoryModal, openInactivePatientsModal, closeInactivePatientsModal, createNewPatient } from './patients/modals.js';

// Inicializar sistema de pacientes
export function initPatients() {
    initPatientsDom();
    setupEventListeners();
    setupPatientProfilesListener();
    setupPatientsDataListener();
}

// Exportar funciones que necesitan estar disponibles globalmente (window)
// Estas son llamadas desde el HTML o desde otros módulos

// Exponer funciones al objeto window para que puedan ser llamadas desde HTML
window.quickMarkAsPaid = quickMarkAsPaid;
window.toggleConfirmationFromList = toggleConfirmationFromList;
window.closePatientHistoryModal = closePatientHistoryModal;
window.rescheduleAppointment = rescheduleAppointment;
window.closeInactivePatientsModal = closeInactivePatientsModal;
window.reactivatePatient = reactivatePatient;
window.createNewPatient = createNewPatient;
window.openPatientHistoryModal = openPatientHistoryModal;
window.openInactivePatientsModal = openInactivePatientsModal;

// Exportar para uso en otros módulos
export { renderPatientsList };
