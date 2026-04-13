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
import { ModalService } from '../../utils/ModalService.js';

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
        let modal = document.getElementById('newPatientModal');

        if (!modal) {
            console.error('❌ PatientModals: CRITICAL - Modal de nuevo paciente no encontrado');
            return;
        }

        const { dom } = PatientState;

        // Actualizar referencia
        dom.newPatientModal = modal;

        // Limpiar inputs
        const firstNameInput = document.getElementById('newPatientFirstName');
        const lastNameInput = document.getElementById('newPatientLastName');
        const therapistInput = document.getElementById('newPatientTherapist');
        const costInput = document.getElementById('newPatientDefaultCost');
        const clinicFeeInput = document.getElementById('newPatientClinicFee');

        if (firstNameInput) firstNameInput.value = '';
        if (lastNameInput) lastNameInput.value = '';
        if (costInput) costInput.value = '';
        if (clinicFeeInput) clinicFeeInput.value = '250.00';

        // Configurar terapeuta
        if (therapistInput) {
            const selectedTherapist = AuthManager.getSelectedTherapist();
            if (selectedTherapist && selectedTherapist !== 'all') {
                therapistInput.value = selectedTherapist;
            } else if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
                therapistInput.value = AuthManager.currentUser.therapist;
            } else {
                therapistInput.value = 'diana';
            }
        }

        // Mover al body para evitar problemas de stacking context
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }

        // Forzar visualización usando clases y estilos estándar
        requestAnimationFrame(() => {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.style.zIndex = '9999';

            // Asegurar que el input tenga foco
            if (firstNameInput) {
                setTimeout(() => firstNameInput.focus(), 50);
            }

            console.log('✅ PatientModals: Modal de nuevo paciente abierto (Standard Mode)');
        });
    },

    /**
     * Cierra el modal de nuevo paciente
     */
    closeNewPatient() {
        const modal = document.getElementById('newPatientModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
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

        // PREVENCIÓN DE CONFLICTOS:
        const scheduleModal = document.getElementById('scheduleNewPatientModal');
        if (scheduleModal) {
            const style = window.getComputedStyle(scheduleModal);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && !scheduleModal.classList.contains('hidden')) {
                console.warn("🚫 PatientModals: Bloqueando apertura de historial porque Schedule Modal está abierto.");
                return;
            }
        }

        if (!dom.patientHistoryModal) {
            console.warn('⚠️ PatientModals: Modal de historial no encontrado');
            return;
        }

        // Guardar paciente seleccionado
        PatientState.setSelectedPatient(patient);

        // DETERMINAR PERMISOS FINANCIEROS
        const canViewFinancials = AuthManager.isAdmin() || (patient.therapist === AuthManager.currentUser.therapist);

        // Ocultar/Mostrar tarjeta de finanzas
        const financeCard = document.getElementById('patientFinanceCard');
        if (financeCard) {
            if (canViewFinancials) {
                financeCard.classList.remove('hidden');
            } else {
                financeCard.classList.add('hidden');
            }
        }

        // Obtener todas las citas del paciente usando el estado actualizado
        const appointments = (PatientState.appointments || []).filter(apt => apt.name === patient.name);

        // Calcular estadísticas
        const now = new Date();
        const completed = appointments.filter(apt => new Date(apt.date) < now);
        const upcoming = appointments.filter(apt => new Date(apt.date) >= now);

        const { totalPaid, totalPending } = PatientFilters.calculatePaymentTotals(appointments);

        // Actualizar título
        if (dom.patientHistoryTitle) {
            const therapistName = patient.therapist === 'diana' ? 'Diana' : patient.therapist === 'sam' ? 'Sam' : patient.therapist || 'No asignado';
            dom.patientHistoryTitle.innerHTML = `
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                    <div>Historial de ${patient.name}</div>
                    <div class="text-xs text-gray-500 font-normal">Terapeuta: ${therapistName}</div>
                </div>
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
        this._renderPatientAppointments(appointments, canViewFinancials);

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
     * Renderiza la lista de citas en el modal de historial con agrupamiento inteligente
     * @private
     * @param {Array<Object>} appointments - Lista de citas
     * @param {boolean} canViewFinancials - Si el usuario puede ver costos
     */
    _renderPatientAppointments(appointments, canViewFinancials = true) {
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

        const now = new Date();

        // 1. Clasificar citas
        const pendingPay = [];
        const upcoming = [];
        const history = [];

        appointments.forEach(apt => {
            const aptDate = new Date(apt.date);

            if (apt.isCancelled) {
                // Canceladas van al historial siempre
                history.push(apt);
            } else if (aptDate >= now) {
                // Futuras van a próximas
                upcoming.push(apt);
            } else if (!apt.isPaid) {
                // Pasadas y NO pagadas van a Pendientes de Pago
                pendingPay.push(apt);
            } else {
                // Pasadas y Pagadas van a Historial
                history.push(apt);
            }
        });

        // 2. Ordenar grupos
        // Pendientes de pago: Más recientes primero
        pendingPay.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Próximas: La MÁS CERCANA arriba (ascendente)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Historial: Más recientes primero (descendente)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 3. Renderizar
        dom.patientHistoryList.innerHTML = '';

        const renderSection = (title, items, iconClass, titleColor) => {
            if (items.length === 0) return;

            const sectionHeader = document.createElement('div');
            sectionHeader.className = `flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-gray-100 ${titleColor}`;
            sectionHeader.innerHTML = `
                <div class="${iconClass}"></div>
                <h5 class="text-xs font-bold uppercase tracking-wide">${title} (${items.length})</h5>
            `;
            dom.patientHistoryList.appendChild(sectionHeader);

            items.forEach(apt => this._createAppointmentCard(apt, canViewFinancials));
        };

        // Orden de visualización:
        // 1. Pendientes de pago (Urgente)
        if (pendingPay.length > 0) {
            renderSection('⚠️ Pendientes de Pago', pendingPay, 'w-2 h-2 rounded-full bg-red-500', 'text-red-600');
        }

        // 2. Próximas Citas (Relevante)
        if (upcoming.length > 0) {
            renderSection('📅 Próximas Citas', upcoming, 'w-2 h-2 rounded-full bg-blue-500', 'text-blue-600');
        }

        // 3. Historial (Referencia)
        if (history.length > 0) {
            renderSection('🗄️ Historial / Pagadas', history, 'w-2 h-2 rounded-full bg-gray-400', 'text-gray-500');
        }
    },

    /**
     * Crea el elemento DOM para una tarjeta de cita
     * @private
     */
    _createAppointmentCard(apt, canViewFinancials) {
        const { dom } = PatientState;
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

        let statusClass = 'bg-white border-gray-200'; // Default
        let statusText = '';
        let statusTextColor = '';

        if (apt.isCancelled) {
            statusClass = 'bg-red-50 border-red-200 opacity-75';
            statusText = '❌ Cancelada';
            statusTextColor = 'text-red-600';
        } else if (apt.isPaid) {
            statusClass = 'bg-green-50 border-green-200';
            statusText = '✓ Pagada';
            statusTextColor = 'text-green-600';
        } else if (isPast) { // Pendiente de pago
            statusClass = 'bg-orange-50 border-l-4 border-l-orange-400 border-y border-r border-orange-200 shadow-sm';
            statusText = '⚠️ Pendiente Pago';
            statusTextColor = 'text-orange-600';
        } else { // Futura
            statusClass = 'bg-blue-50 border-blue-200';
            statusText = '📅 Próxima';
            statusTextColor = 'text-blue-600';
        }

        // Si está confirmada, añadir distintivo extra visual
        if (!isPast && !apt.isCancelled && apt.confirmed) {
            statusText += ' (Confirmada)';
        }

        const aptEl = document.createElement('div');
        aptEl.className = `p-3 rounded-lg border mb-2 transition-all hover:shadow-md cursor-pointer ${statusClass}`;

        // Al hacer click, abrir edición
        aptEl.onclick = () => {
            // Abrir modal de edición si es posible
            if (window.calendarManagerRef) {
                // Acceso difícil a CalendarModal.openEditModal sin importar
                // Dejar que el usuario use los botones de acción por ahora
            }
        };

        const showPayBtn = canViewFinancials && !apt.isPaid && !apt.isCancelled;
        const showConfirmBtn = !apt.isCancelled && !isPast;

        // Costo solo si canViewFinancials
        const costHtml = canViewFinancials ?
            `<div class="text-gray-600 font-medium">Costo: <span class="text-gray-800">$${apt.cost}</span></div>`
            : '<div></div>'; // Spacer

        let footerHtml = '';
        if (canViewFinancials || showConfirmBtn) {
            footerHtml = `
                <div class="flex items-center justify-between text-xs mt-2 border-t pt-2 border-gray-400 border-opacity-10">
                    ${costHtml}
                    <div class="flex gap-2">
                         ${showConfirmBtn ? `
                            <button type="button" 
                                    class="confirm-btn px-2 py-1 ${apt.confirmed ? 'bg-gray-100 text-gray-600 border border-gray-300' : 'bg-blue-600 text-white'} rounded hover:opacity-90 text-xs font-bold shadow-sm flex items-center gap-1 transition-colors" 
                                    title="${apt.confirmed ? 'Quitar confirmación' : 'Confirmar asistencia'}"
                                    data-id="${apt.id}" 
                                    data-status="${apt.confirmed}">
                                ${apt.confirmed ? '<span class="text-[10px] pointer-events-none">❌</span>' : '<span class="text-[10px] pointer-events-none">✓</span> Confirmar'}
                            </button>
                        ` : ''}
                        
                        ${showPayBtn ? `
                                <button type="button"
                                        class="pay-btn px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1"
                                        data-id="${apt.id}">
                                    <span class="pointer-events-none">$</span> Pagar
                                </button>
                            ` : ''}
                    </div>
                </div>
            `;
        }

        aptEl.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="text-sm font-bold text-gray-800 tracking-tight">
                    ${dateStr} <span class="font-normal text-gray-500 mx-1">|</span> ${timeStr}
                </div>
                <div class="text-[10px] uppercase font-bold tracking-wider ${statusTextColor}">
                    ${statusText}
                </div>
            </div>
            ${footerHtml}
        `;

        dom.patientHistoryList.appendChild(aptEl);
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

        // Input de costo y cuota
        if (dom.editPatientCost) {
            dom.editPatientCost.value = patient.defaultCost || 0;
        }
        if (document.getElementById('editPatientClinicFee')) {
            document.getElementById('editPatientClinicFee').value = patient.clinicFee || 250;
        }
        if (document.getElementById('editPatientPhone')) {
            document.getElementById('editPatientPhone').value = patient.phone || '';
        }

        // Botón de guardar cambios
        if (dom.savePatientEditBtn) {
            dom.savePatientEditBtn.onclick = async () => {
                const newTherapist = dom.editPatientTherapist.value;
                const newCost = dom.editPatientCost ? parseFloat(dom.editPatientCost.value) : 0;
                const newClinicFee = document.getElementById('editPatientClinicFee') ? parseFloat(document.getElementById('editPatientClinicFee').value) : 250;
                const newPhone = document.getElementById('editPatientPhone')?.value.trim() || '';

                const success = await PatientActions.updatePatientProfile(
                    patient.id,
                    {
                        therapist: newTherapist,
                        defaultCost: newCost,
                        clinicFee: newClinicFee,
                        phone: newPhone
                    },
                    patient.name
                );

                if (success) {
                    await ModalService.alert("Éxito", 'Perfil actualizado correctamente', "success");
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
    openInactivePatients() {
        const { dom, patients } = PatientState;

        if (!dom.inactivePatientsModal) {
            console.warn('⚠️ PatientModals: Modal de inactivos no encontrado');
            return;
        }

        // Obtener pacientes inactivos
        const inactivePatients = patients.filter(p => p.isActive === false);

        // Renderizar lista
        this._renderInactivePatients(inactivePatients);

        // Mostrar modal
        dom.inactivePatientsModal.classList.remove('hidden');

        console.log('✅ PatientModals: Modal de inactivos abierto');
    },

    /**
     * Cierra el modal de pacientes inactivos
     */
    closeInactivePatients() {
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

            // Calcular deuda
            const pendingApts = PatientFilters.getPendingPayments(patient.name);
            const totalDebt = pendingApts.reduce((sum, apt) => sum + (parseFloat(apt.cost) || 0), 0);

            const debtHtml = totalDebt > 0
                ? `<div class="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1 mt-1 w-fit">
                     <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                     Deuda: $${totalDebt}
                   </div>`
                : '';

            const legacyHtml = patient.legacyData
                ? `<div class="mt-1 text-xs text-gray-500 bg-gray-100 p-1.5 rounded border border-gray-200">
                     <div class="font-medium text-gray-700 mb-0.5">Recordatorio:</div>
                     <div class="flex items-center gap-2">
                        <span>📅 ${patient.legacyData.usualDay} ${patient.legacyData.usualTime}</span>
                        <span>💰 $${patient.legacyData.lastCost}</span>
                     </div>
                   </div>`
                : '';

            patientEl.innerHTML = `
                <div>
                    <div class="font-semibold text-gray-800">${patient.name}</div>
                    <div class="text-xs text-gray-500">
                        Terapeuta: ${patient.therapist === 'diana' ? 'Diana' : 'Sam'}
                    </div>
                    ${debtHtml}
                    ${legacyHtml}
                </div>
                <button 
                    class="reactivate-btn px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm h-fit"
                    data-id="${patient.id}"
                    data-name="${patient.name}">
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
        this.closeInactivePatients();
        console.log('✅ PatientModals: Todos los modales cerrados');
    }
};
