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
import { ScheduleManager } from '../ScheduleManager.js';
import { SettingsManager } from '../SettingsManager.js';

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
        const parentNameInput = document.getElementById('newPatientParentName');
        const phoneInput = document.getElementById('newPatientPhone');
        const countryCodeInput = document.getElementById('newPatientCountryCode');

        // Configurar terapeuta primero para obtener costos
        let targetTherapist = 'diana';
        if (therapistInput) {
            const selectedTherapist = AuthManager.getSelectedTherapist();
            if (selectedTherapist && selectedTherapist !== 'all') {
                targetTherapist = selectedTherapist;
            } else if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
                targetTherapist = AuthManager.currentUser.therapist;
            }
            therapistInput.value = targetTherapist;
        }

        // Obtener costos según terapeuta
        const defaults = AuthManager.getTherapistDefaults(targetTherapist);

        if (firstNameInput) firstNameInput.value = '';
        if (lastNameInput) lastNameInput.value = '';
        if (costInput) costInput.value = defaults.cost;
        if (clinicFeeInput) clinicFeeInput.value = defaults.clinicFee.toFixed(2);
        if (parentNameInput) parentNameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (countryCodeInput) countryCodeInput.value = '52'; // Default Mexico

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
        const modals = document.querySelectorAll('#newPatientModal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
        });
        console.log('✅ PatientModals: Modal de nuevo paciente cerrado (' + modals.length + ' instancias)');
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

        // DETERMINAR PERMISOS FINANCIEROS (Admin y Recepción ven todo, Terapeutas solo lo propio)
        const canViewFinancials = AuthManager.isAdmin() || 
                                AuthManager.currentUser?.role === 'receptionist' || 
                                (patient.therapist === AuthManager.currentUser.therapist);

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
        const attended = appointments.filter(apt => apt.isPaid && !apt.isCancelled).length;
        const cancelled = appointments.filter(apt => apt.isCancelled).length;
        const totalPast = appointments.filter(apt => new Date(apt.date) < now).length;
        
        // Calcular engagement (tasa de asistencia)
        const engagementRate = totalPast > 0 ? Math.round((attended / totalPast) * 100) : 100;
        const engagementColor = engagementRate > 80 ? 'bg-green-500' : engagementRate > 50 ? 'bg-orange-500' : 'bg-red-500';

        const { totalPaid, totalPending } = PatientFilters.calculatePaymentTotals(appointments);

        // Actualizar título con alerta de recurrencia
        if (dom.patientHistoryTitle) {
            // Lógica de alerta de citas por agotarse (menos de 14 días para la última cita)
            const futureApts = appointments.filter(a => !a.isCancelled && new Date(a.date) >= now);
            futureApts.sort((a,b) => new Date(b.date) - new Date(a.date));
            const lastAptDate = futureApts.length > 0 ? new Date(futureApts[0].date) : null;
            
            const fourteenDaysFromNow = new Date();
            fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
            
            const isEndingSoon = lastAptDate && lastAptDate < fourteenDaysFromNow;
            const hasNoFuture = !lastAptDate;

            const recurrenceAlert = (isEndingSoon || hasNoFuture) ? `
                <div class="mt-1 flex items-center gap-1.5 py-1 px-2 bg-red-50 border border-red-100 rounded-md animate-pulse">
                    <span class="flex h-2 w-2 rounded-full bg-red-600"></span>
                    <span class="text-[10px] font-black text-red-600 uppercase tracking-tighter">
                        ${hasNoFuture ? 'SIN CITAS PROGRAMADAS' : 'RECURRENCIA POR AGOTARSE'}
                    </span>
                </div>
            ` : '';

            const therapistName = patient.therapist === 'diana' ? 'Diana' : patient.therapist === 'sam' ? 'Sam' : patient.therapist || 'No asignado';
            dom.patientHistoryTitle.innerHTML = `
                <div class="flex flex-col gap-1 w-full">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl shadow-sm border border-white">
                            ${patient.name.charAt(0)}
                        </div>
                        <div class="flex-1">
                            <div class="text-lg font-extrabold text-gray-900 leading-tight">${patient.name}</div>
                            <div class="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full ${patient.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}"></span>
                                Terapeuta: ${therapistName.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    ${recurrenceAlert}
                </div>
            `;
        }

        // Inyectar bloque de Analítica Visual
        const statsContainer = dom.patientHistoryModal.querySelector('.stats-container');
        if (statsContainer) {
            // Encontrar última cita real (no cancelada y ya pasada)
            const pastAttended = appointments
                .filter(a => new Date(a.date) < now && !a.isCancelled)
                .sort((a,b) => new Date(b.date) - new Date(a.date));
            const lastSession = pastAttended.length > 0 ? new Date(pastAttended[0].date).toLocaleDateString() : 'N/A';

            statsContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <!-- Engagement Premium -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <div class="relative z-10">
                            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Engagement</div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-3xl font-black text-gray-900">${engagementRate}%</span>
                                <div class="w-10 h-10 rounded-full flex items-center justify-center ${engagementColor.replace('bg-', 'text-')} bg-opacity-10 border border-current">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                </div>
                            </div>
                            <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div class="${engagementColor} h-full transition-all duration-1000" style="width: ${engagementRate}%"></div>
                            </div>
                            <div class="mt-3 flex justify-between text-[10px] font-bold">
                                <span class="text-green-600">✓ ${attended} Éxito</span>
                                <span class="text-red-400">✗ ${cancelled} Canc.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Financial Status -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group ${totalPending > 0 ? 'ring-2 ring-red-100' : ''}">
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Balance</div>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-semibold text-gray-500 uppercase">Pagado</span>
                                <span class="text-xl font-black text-green-600">$${totalPaid}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-semibold text-gray-500 uppercase">Pendiente</span>
                                <span class="text-xl font-black ${totalPending > 0 ? 'text-red-500 animate-pulse' : 'text-gray-300'}">$${totalPending}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Last Activity -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Actividad</div>
                        <div class="text-xs font-semibold text-gray-500 mb-1">Última sesión:</div>
                        <div class="text-lg font-black text-gray-800 mb-3">${lastSession}</div>
                        <div class="flex items-center gap-2">
                             <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase border border-indigo-100">
                                Total: ${appointments.length} citas
                             </span>
                        </div>
                    </div>

                    <!-- Next Step -->
                    <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-200 text-white">
                        <div class="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-3">Próximo Paso</div>
                        ${appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).length > 0 ? `
                            <div class="text-xs font-medium text-blue-100 mb-1">Siguiente cita:</div>
                            <div class="text-lg font-bold leading-tight">
                                ${new Date(appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})} 
                                <span class="opacity-75 font-normal">@ ${new Date(appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).getHours()}:00</span>
                            </div>
                        ` : `
                            <div class="text-xs font-medium text-blue-100 mb-1">Sin cita próxima</div>
                            <button id="scheduleFromHistoryBtn" class="mt-2 w-full py-2 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">Agendar Ahora</button>
                        `}
                    </div>
                </div>
            `;
        }

        // Actualizar totales de la parte inferior (antiguos dom)
        if (dom.patientTotalPaid) dom.patientTotalPaid.textContent = `$${totalPaid}`;
        if (dom.patientTotalPending) dom.patientTotalPending.textContent = `$${totalPending}`;

        // Renderizar lista de citas
        this._renderPatientAppointments(appointments, canViewFinancials);

        // Configurar botones de acción
        this._setupHistoryActions(patient);

        // Mostrar modal
        dom.patientHistoryModal.classList.remove('hidden');

        // INFO DE DEBUG (Solo para ayudarte a ver por qué fallan los permisos)
        const debugEl = document.getElementById('authDebugInfo');
        if (debugEl && AuthManager.currentUser) {
            debugEl.innerHTML = `
                <span>UID: ${AuthManager.currentUser.uid.substring(0,6)}...</span>
                <span>ROLE: ${AuthManager.currentUser.role}</span>
            `;
            debugEl.classList.remove('hidden');
        }

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

        // INDICADOR DE BITÁCORA: Si ya tiene progreso guardado
        const hasProgress = apt.clinicalProgress && (apt.clinicalProgress.generalNote || (apt.clinicalProgress.themes && Object.keys(apt.clinicalProgress.themes).length > 0));

        let footerHtml = '';
        if (canViewFinancials || showConfirmBtn) {
            footerHtml = `
                <div class="flex items-center justify-between text-xs mt-2 border-t pt-2 border-gray-400 border-opacity-10">
                    ${costHtml}
                    <div class="flex gap-2">
                         <button type="button" 
                                 class="note-btn px-2 py-1 ${hasProgress ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'} rounded hover:opacity-90 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors" 
                                 title="Bitácora de Sesión"
                                 data-apt-id="${apt.id}">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            ${hasProgress ? 'Bitácora ✔' : 'Bitácora'}
                         </button>

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

        // Solo Admin y Yari pueden editar perfiles (o el terapeuta dueño)
        const canEditProfile = AuthManager.isAdmin() || 
                              AuthManager.currentUser?.role === 'receptionist' || 
                              (patient.therapist === AuthManager.currentUser?.therapist);

        if (dom.editPatientBtn) {
            if (canEditProfile) {
                dom.editPatientBtn.classList.remove('hidden');
                dom.editPatientBtn.onclick = () => {
                    dom.deactivatePatientBtn?.classList.toggle('hidden');
                    dom.deletePatientBtn?.classList.toggle('hidden');
                    dom.patientEditSection?.classList.toggle('hidden');
                };
            } else {
                dom.editPatientBtn.classList.add('hidden');
            }
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
        if (document.getElementById('editPatientWantsWhatsapp')) {
            document.getElementById('editPatientWantsWhatsapp').checked = patient.wantsWhatsapp !== false;
        }
        if (document.getElementById('editPatientParentName')) {
            document.getElementById('editPatientParentName').value = patient.parentName || '';
        }

        // Renderizar sección de Temas (Solo Admin o si ya tiene temas)
        const themesSection = document.getElementById('adminPatientThemesSection');
        const themesList = document.getElementById('editPatientThemesList');
        if (themesSection && themesList) {
            if (AuthManager.isAdmin()) {
                themesSection.classList.remove('hidden');
                const allThemes = SettingsManager.config.themes || [];
                const patientThemes = patient.assignedThemes || [];
                
                themesList.innerHTML = allThemes.map(theme => `
                    <label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-50">
                        <input type="checkbox" name="patientTheme" value="${theme.id}" ${patientThemes.includes(theme.id) ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300">
                        <span class="text-xs font-bold text-gray-700">${theme.name}</span>
                    </label>
                `).join('');
                
                if (allThemes.length === 0) {
                     themesList.innerHTML = '<p class="text-[10px] text-gray-400 italic col-span-2">No hay temas creados en la configuración.</p>';
                }
            } else {
                themesSection.classList.add('hidden');
            }
        }

        // Botón de guardar cambios
        if (dom.savePatientEditBtn) {
            dom.savePatientEditBtn.onclick = async () => {
                const newTherapist = dom.editPatientTherapist.value;
                const newCost = dom.editPatientCost ? parseFloat(dom.editPatientCost.value) : 0;
                const newClinicFee = document.getElementById('editPatientClinicFee') ? parseFloat(document.getElementById('editPatientClinicFee').value) : 250;
                const newPhone = document.getElementById('editPatientPhone')?.value.trim() || '';
                const countryCode = document.getElementById('editPatientCountryCode')?.value || '52';
                const newParentName = document.getElementById('editPatientParentName')?.value.trim() || '';
                const wantsWhatsapp = document.getElementById('editPatientWantsWhatsapp')?.checked !== false;

                // Recoger temas seleccionados
                const selectedThemes = Array.from(document.querySelectorAll('input[name="patientTheme"]:checked')).map(cb => cb.value);

                const success = await PatientActions.updatePatientProfile(
                    patient.id,
                    {
                        therapist: newTherapist,
                        defaultCost: newCost,
                        clinicFee: newClinicFee,
                        phone: newPhone,
                        countryCode: countryCode,
                        parentName: newParentName,
                        wantsWhatsapp: wantsWhatsapp,
                        assignedThemes: selectedThemes
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

        // Botón de agendar desde analítica
        const scheduleBtn = document.getElementById('scheduleFromHistoryBtn');
        if (scheduleBtn) {
            scheduleBtn.onclick = () => {
                this.closeHistory();
                ScheduleManager.openModal(
                    patient.id, 
                    patient.name, 
                    patient.therapist, 
                    patient.defaultCost
                );
            };
        }

        // Delegación de clicks para botones dentro de las tarjetas (Bitácora, Pagar, Confirmar)
        if (dom.patientHistoryList) {
            dom.patientHistoryList.onclick = async (e) => {
                const noteBtn = e.target.closest('.note-btn');
                if (noteBtn) {
                    e.stopPropagation();
                    const aptId = noteBtn.dataset.aptId;
                    const appointment = PatientState.appointments.find(a => a.id === aptId);
                    if (appointment) this.openSessionNote(appointment, patient);
                    return;
                }

                const payBtn = e.target.closest('.pay-btn');
                if (payBtn) {
                    // Logic already handled in PatientActions or similar, 
                    // but usually these specific handlers are set up elsewhere.
                    // For now, let's keep focusing on Bitácora.
                }
            };
        }
    },

    /**
     * Abre el modal de bitácora de sesión
     */
    openSessionNote(appointment, patient) {
        const modal = document.getElementById('sessionNoteModal');
        if (!modal) return;

        console.log('📝 Abriendo bitácora para cita:', appointment.id);

        // Referencias
        const dateEl = document.getElementById('sessionNoteDate');
        const themesList = document.getElementById('sessionThemesList');
        const generalNoteInput = document.getElementById('sessionGeneralNote');
        const saveBtn = document.getElementById('saveSessionNoteBtn');
        const searchInput = document.getElementById('themeSearchInput');

        // Reset UI
        if (dateEl) {
            const dateStr = new Date(appointment.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            dateEl.textContent = `${dateStr} @ ${new Date(appointment.date).getHours()}:00`;
        }
        if (generalNoteInput) generalNoteInput.value = appointment.clinicalProgress?.generalNote || '';
        if (searchInput) searchInput.value = '';

        const renderThemesList = (filter = '') => {
            const assignedIds = patient.assignedThemes || [];
            const themes = SettingsManager.getThemesByIds(assignedIds);
            const progress = appointment.clinicalProgress?.themes || {};

            if (themes.length === 0) {
                themesList.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">No hay temas asignados para este paciente.</p>';
                return;
            }

            const searchLower = filter.toLowerCase();

            themesList.innerHTML = themes.map(theme => {
                const subthemes = theme.subthemes || [];
                const filteredSubs = subthemes.filter(sub => sub.toLowerCase().includes(searchLower) || theme.name.toLowerCase().includes(searchLower));
                
                if (filter && filteredSubs.length === 0) return ''; // Ocultar si no hay matches

                return `
                    <div class="border-b border-gray-50 pb-3 last:border-0">
                        <div class="flex items-center gap-2 mb-2">
                             <div class="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                             <h5 class="text-sm font-black text-gray-800">${theme.name}</h5>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3">
                            ${subthemes.map(sub => {
                                const currentStatus = progress[theme.id]?.[sub] || 'none';
                                const isMatch = !filter || sub.toLowerCase().includes(searchLower) || theme.name.toLowerCase().includes(searchLower);
                                
                                return `
                                    <div class="flex items-center justify-between p-2 rounded-xl border ${isMatch ? 'border-gray-100 bg-gray-50/50' : 'opacity-30'} transition-all">
                                        <span class="text-xs font-bold text-gray-600">${sub}</span>
                                        <div class="flex gap-1">
                                            <button onclick="window.setSubthemeStatus('${theme.id}', '${sub}', 'done', this)" class="sub-status-btn w-6 h-6 flex items-center justify-center rounded-lg ${currentStatus === 'done' ? 'bg-green-500 text-white' : 'bg-white text-gray-300 hover:text-green-500'} transition-all" title="Hecho">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                            </button>
                                            <button onclick="window.setSubthemeStatus('${theme.id}', '${sub}', 'progress', this)" class="sub-status-btn w-6 h-6 flex items-center justify-center rounded-lg ${currentStatus === 'progress' ? 'bg-orange-500 text-white' : 'bg-white text-gray-300 hover:text-orange-500'} transition-all" title="En progreso">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Estado local temporal para los botones
        const currentProgress = JSON.parse(JSON.stringify(appointment.clinicalProgress?.themes || {}));
        
        window.setSubthemeStatus = (themeId, subName, status, btn) => {
            if (!currentProgress[themeId]) currentProgress[themeId] = {};
            
            if (currentProgress[themeId][subName] === status) {
                delete currentProgress[themeId][subName]; // Toggle off
            } else {
                currentProgress[themeId][subName] = status;
            }

            // Re-renderizar solo para actualizar colores (u optimizar botones)
            renderThemesList(searchInput.value);
        };

        // Buscador
        searchInput.oninput = (e) => renderThemesList(e.target.value);

        // Guardar
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            const updatedProgress = {
                themes: currentProgress,
                generalNote: generalNoteInput.value.trim()
            };

            const success = await PatientActions.updateAppointmentNote(appointment.id, updatedProgress);

            if (success) {
                ToastService.success('Bitácora guardada correctamente');
                modal.classList.add('hidden');
                // IMPORTANTE: Actualizar localmente la cita para no tener que refrescar todo
                appointment.clinicalProgress = updatedProgress;
                this.openHistory(patient); // Refrescar la vista del historial
            }

            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span>Guardar Bitácora</span>';
        };

        renderThemesList();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
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
