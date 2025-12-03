/**
 * PatientModals.js
 * Gestión de modales de pacientes
 * 
 * Este módulo maneja:
 * - Modal de nuevo paciente
 * - Modal de historial del paciente
 * - Modal de pacientes inactivos
 * - Apertura/cierre de modales
 * - Renderizado de contenido de modales
 * 
 * NO maneja:
 * - Acciones CRUD (ver PatientActions.js)
 * - Filtrado (ver PatientFilters.js)
 * - Renderizado de lista principal (ver PatientUI.js)
 * 
 * @module PatientModals
 */

import { PatientState } from './PatientState.js';
import { PatientFilters } from './PatientFilters.js';
import { PatientActions } from './PatientActions.js';
import { patientsData, patientProfiles } from '../../firebase.js';
import { AuthManager } from '../AuthManager.js';

/**
 * Gestión de modales
 */
export const PatientModals = {

    // ==========================================
    // MODAL DE NUEVO PACIENTE
    // ==========================================

    /**
     * Abre el modal para crear un nuevo paciente
     */
    openNewPatient() {
        const { dom } = PatientState;

        if (!dom.newPatientModal) {
            console.warn('⚠️ PatientModals: Modal de nuevo paciente no encontrado');
            return;
        }

        // Limpiar inputs
        if (dom.newPatientFirstName) dom.newPatientFirstName.value = '';
        if (dom.newPatientLastName) dom.newPatientLastName.value = '';

        // Establecer terapeuta por defecto
        if (dom.newPatientTherapist) {
            const selectedTherapist = AuthManager.getSelectedTherapist();
            if (selectedTherapist && selectedTherapist !== 'all') {
                dom.newPatientTherapist.value = selectedTherapist;
            } else if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
                dom.newPatientTherapist.value = AuthManager.currentUser.therapist;
            } else {
                dom.newPatientTherapist.value = 'diana';
            }
        }

        // Mostrar modal
        dom.newPatientModal.classList.remove('hidden');

        // Focus en primer input
        setTimeout(() => {
            dom.newPatientFirstName?.focus();
        }, 100);

        console.log('✅ PatientModals: Modal de nuevo paciente abierto');
    },

    /**
     * Cierra el modal de nuevo paciente
     */
    closeNewPatient() {
        const { dom } = PatientState;

        if (dom.newPatientModal) {
            dom.newPatientModal.classList.add('hidden');
        }

        console.log('✅ PatientModals: Modal de nuevo paciente cerrado');
    },

    // ==========================================
    // MODAL DE HISTORIAL DEL PACIENTE
    // ==========================================

    /**
     * Abre el modal de historial de un paciente
     * 
     * @param {Object} patient - Datos del paciente
     */
    openHistory(patient) {
        const { dom } = PatientState;

        if (!dom.patientHistoryModal) {
            console.warn('⚠️ PatientModals: Modal de historial no encontrado');
            return;
        }

        // Guardar paciente seleccionado
        PatientState.setSelectedPatient(patient);

        // Obtener todas las citas del paciente
        const appointments = patientsData.filter(apt => apt.name === patient.name);

        // Calcular estadísticas
        const now = new Date();
        const completed = appointments.filter(apt => new Date(apt.date) < now);
        const upcoming = appointments.filter(apt => new Date(apt.date) >= now);

        const { totalPaid, totalPending } = PatientFilters.calculatePaymentTotals(appointments);

        // Actualizar título
        if (dom.patientHistoryTitle) {
            dom.patientHistoryTitle.innerHTML = `
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Historial de ${patient.name}
            `;
        }

        // Actualizar totales
        if (dom.patientTotalPaid) dom.patientTotalPaid.textContent = `$${totalPaid}`;
        if (dom.patientTotalPending) dom.patientTotalPending.textContent = `$${totalPending}`;

        // Actualizar estadísticas
        if (dom.patientTotalAppointments) dom.patientTotalAppointments.textContent = appointments.length;
        if (dom.patientCompletedAppointments) dom.patientCompletedAppointments.textContent = completed.length;
        if (dom.patientUpcomingAppointments) dom.patientUpcomingAppointments.textContent = upcoming.length;

        // Renderizar lista de citas
        this._renderPatientAppointments(appointments);

        // Configurar botones de acción
        this._setupHistoryActions(patient);

        // Mostrar modal
        dom.patientHistoryModal.classList.remove('hidden');

        console.log('✅ PatientModals: Modal de historial abierto para', patient.name);
    },

    /**
     * Cierra el modal de historial
     */
    closeHistory() {
        const { dom } = PatientState;

        if (dom.patientHistoryModal) {
            dom.patientHistoryModal.classList.add('hidden');
        }

        // Ocultar sección de edición si estaba visible
        if (dom.patientEditSection) {
            dom.patientEditSection.classList.add('hidden');
        }

        // Ocultar botones de acción
        if (dom.deactivatePatientBtn) dom.deactivatePatientBtn.classList.add('hidden');
        if (dom.deletePatientBtn) dom.deletePatientBtn.classList.add('hidden');

        PatientState.setSelectedPatient(null);

        console.log('✅ PatientModals: Modal de historial cerrado');
    },

    /**
     * Renderiza la lista de citas en el modal de historial
     * @private
     * @param {Array<Object>} appointments - Lista de citas
     */
    _renderPatientAppointments(appointments) {
        const { dom } = PatientState;

        if (!dom.patientHistoryList) return;

        if (appointments.length === 0) {
            dom.patientHistoryList.innerHTML = `
                <p class="text-sm text-gray-400 text-center py-4">
                    No hay citas registradas
                </p>
            `;
            return;
        }

        // Ordenar por fecha (más reciente primero)
        const sortedAppointments = [...appointments].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        dom.patientHistoryList.innerHTML = '';

        sortedAppointments.forEach(apt => {
            const aptDate = new Date(apt.date);
            const dateStr = aptDate.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const timeStr = aptDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const isPast = aptDate < new Date();
            const statusClass = apt.isCancelled ? 'bg-red-50 border-red-200' :
                apt.isPaid ? 'bg-green-50 border-green-200' :
                    isPast ? 'bg-orange-50 border-orange-200' :
                        'bg-blue-50 border-blue-200';

            const statusText = apt.isCancelled ? '❌ Cancelada' :
                apt.isPaid ? '✓ Pagada' :
                    isPast ? '⏳ Pendiente' :
                        '📅 Próxima';

            const aptEl = document.createElement('div');
            aptEl.className = `p-3 rounded-lg border ${statusClass} mb-2`;
            aptEl.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm font-semibold text-gray-800">
                        ${dateStr} - ${timeStr}
                    </div>
                    <div class="text-xs font-bold ${apt.isCancelled ? 'text-red-600' : apt.isPaid ? 'text-green-600' : 'text-orange-600'}">
                        ${statusText}
                    </div>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <div class="text-gray-600">
                        Costo: <span class="font-semibold">$${apt.cost}</span>
                    </div>
                    ${!apt.isPaid && !apt.isCancelled && isPast ? `
                        <button onclick="quickMarkAsPaid('${apt.id}')" 
                                class="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs">
                            ✓ Marcar como pagado
                        </button>
                    ` : ''}
                </div>
            `;

            dom.patientHistoryList.appendChild(aptEl);
        });
    },

    /**
     * Configura los botones de acción del modal de historial
     * @private
     * @param {Object} patient - Datos del paciente
     */
    _setupHistoryActions(patient) {
        const { dom } = PatientState;

        // Ocultar inicialmente
        if (dom.deactivatePatientBtn) dom.deactivatePatientBtn.classList.add('hidden');
        if (dom.deletePatientBtn) dom.deletePatientBtn.classList.add('hidden');
        if (dom.patientEditSection) dom.patientEditSection.classList.add('hidden');

        // Botón de editar
        if (dom.editPatientBtn) {
            dom.editPatientBtn.onclick = () => {
                dom.deactivatePatientBtn?.classList.toggle('hidden');
                dom.deletePatientBtn?.classList.toggle('hidden');
                dom.patientEditSection?.classList.toggle('hidden');
            };
        }

        // Selector de terapeuta
        if (dom.editPatientTherapist) {
            dom.editPatientTherapist.value = patient.therapist || 'diana';
        }

        // Botón de guardar cambios de terapeuta
        if (dom.savePatientEditBtn) {
            dom.savePatientEditBtn.onclick = async () => {
                const newTherapist = dom.editPatientTherapist.value;
                const success = await PatientActions.updatePatientTherapist(
                    patient.id,
                    newTherapist,
                    patient.name
                );

                if (success) {
                    alert('Terapeuta actualizado correctamente');
                    this.closeHistory();
                }
            };
        }

        // Botón de desactivar
        if (dom.deactivatePatientBtn) {
            dom.deactivatePatientBtn.onclick = async () => {
                await PatientActions.deactivatePatient(patient.id, patient.name);
            };
        }

        // Botón de eliminar
        if (dom.deletePatientBtn) {
            dom.deletePatientBtn.onclick = async () => {
                await PatientActions.deletePatient(patient.id, patient.name);
            };
        }
    },

    // ==========================================
    // MODAL DE PACIENTES INACTIVOS
    // ==========================================

    /**
     * Abre el modal de pacientes inactivos
     */
    openInactive() {
        const { dom } = PatientState;

        if (!dom.inactivePatientsModal) {
            console.warn('⚠️ PatientModals: Modal de inactivos no encontrado');
            return;
        }

        // Obtener pacientes inactivos
        const inactivePatients = patientProfiles.filter(p => p.isActive === false);

        // Renderizar lista
        this._renderInactivePatients(inactivePatients);

        // Mostrar modal
        dom.inactivePatientsModal.classList.remove('hidden');

        console.log('✅ PatientModals: Modal de inactivos abierto');
    },

    /**
     * Cierra el modal de pacientes inactivos
     */
    closeInactive() {
        const { dom } = PatientState;

        if (dom.inactivePatientsModal) {
            dom.inactivePatientsModal.classList.add('hidden');
        }

        console.log('✅ PatientModals: Modal de inactivos cerrado');
    },

    /**
     * Renderiza la lista de pacientes inactivos
     * @private
     * @param {Array<Object>} patients - Lista de pacientes inactivos
     */
    _renderInactivePatients(patients) {
        const { dom } = PatientState;

        if (!dom.inactivePatientsList) return;

        if (patients.length === 0) {
            dom.inactivePatientsList.innerHTML = `
                <p class="text-sm text-gray-400 text-center py-4">
                    No hay pacientes inactivos
                </p>
            `;
            return;
        }

        // Ordenar alfabéticamente
        const sortedPatients = [...patients].sort((a, b) =>
            a.name.localeCompare(b.name, 'es')
        );

        dom.inactivePatientsList.innerHTML = '';

        sortedPatients.forEach(patient => {
            const patientEl = document.createElement('div');
            patientEl.className = 'p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2 flex items-center justify-between';

            patientEl.innerHTML = `
                <div>
                    <div class="font-semibold text-gray-800">${patient.name}</div>
                    <div class="text-xs text-gray-500">
                        Terapeuta: ${patient.therapist === 'diana' ? 'Diana' : 'Sam'}
                    </div>
                </div>
                <button 
                    onclick="reactivatePatientFromList('${patient.id}', '${patient.name}')"
                    class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    ✓ Reactivar
                </button>
            `;

            dom.inactivePatientsList.appendChild(patientEl);
        });
    },

    // ==========================================
    // UTILIDADES
    // ==========================================

    /**
     * Cierra todos los modales
     */
    closeAll() {
        this.closeNewPatient();
        this.closeHistory();
        this.closeInactive();
        console.log('✅ PatientModals: Todos los modales cerrados');
    }
};
