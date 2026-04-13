export const state = {
    viewMode: 'today', // 'today', 'tomorrow', 'all'
    selectedPatient: null,
    dom: {
        patientsList: null,
        patientsHeader: null,
        patientHistoryModal: null,
        inactivePatientsModal: null,
        newPatientModal: null,
        newPatientFirstName: null,
        newPatientLastName: null,
        saveNewPatientBtn: null,
        closeNewPatientModalBtn: null,
        // History Modal Elements
        patientHistoryTitle: null,
        patientTotalPaid: null,
        patientTotalPending: null,
        patientTotalAppointments: null,
        patientCompletedAppointments: null,
        patientUpcomingAppointments: null,
        patientAppointmentsList: null,
        deactivateBtn: null,
        deleteBtn: null,
        editBtn: null,
        // Inactive Modal Elements
        inactivePatientsList: null
    }
};
