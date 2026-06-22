/**
 * CalendarModal.js
 * Maneja la lógica de los modales de creación y edición de citas
 */

import { CalendarState } from './CalendarState.js';
import { CalendarData } from './CalendarData.js';
import { CalendarUI } from './CalendarUI.js';
import { CalendarSuggestions } from './CalendarSuggestions.js';

import { AuthManager } from '../../managers/AuthManager.js';
import { PatientState } from '../../managers/patient/PatientState.js';
import { ensurePatientProfile } from '../../services/patientService.js';
import { validateAppointment, checkSlotConflict, isWithinWorkingHours, isNotSunday, isSlotFree, normalizeName } from '../../utils/validators.js';
import { addDays, formatTime12h } from '../../utils/dateUtils.js';
import { ModalService } from '../../utils/ModalService.js';
import { GoogleAuthService } from '../../services/google/GoogleAuthService.js';
import { WhatsAppMessaging } from '../../services/WhatsAppMessaging.js';
import { TimeManager } from '../../utils/TimeManager.js';
import { ToastService } from '../../utils/ToastService.js';
import { LoaderService } from '../../utils/LoaderService.js';
import { SchedulingQueueService } from '../../services/SchedulingQueueService.js';
import { isSameCalendarDay } from '../../utils/schedulingQueueRules.js';
import { PatientManager } from '../../managers/PatientManager.js';
import {
    buildFinancialFieldsForSave,
    buildPaymentExcelPreview,
    collectManualFinancialsFromDom,
    getProfileClinicFee,
    resolveEffectiveFinancials
} from '../../utils/appointmentFinancials.js';




export const CalendarModal = {
    _modalPatientProfile: null,
    _financialIsIntentionalOverride: false,
    _financialBaseline: null,
    _financialFieldsDirty: false,
    originalTherapistOnOpen: null,
    _cancelDebtContext: null,
    _awaitingRescheduleSave: false,
    init() {
        this.bindEvents();
        this.bindGridEvents();
        this.setupJustificationEvents();
    },

    bindEvents() {
        const dom = CalendarState.dom;
        if (dom.saveBtn) dom.saveBtn.onclick = () => this.handleSave();
        if (dom.deleteBtn) dom.deleteBtn.onclick = () => this.handleDelete();
        if (dom.payBtn) dom.payBtn.onclick = () => this.handlePaymentToggle();
        if (dom.confirmBtn) dom.confirmBtn.onclick = () => this.handleConfirmToggle();
        if (dom.cancelBtn) dom.cancelBtn.onclick = () => this.handleCancel();
        if (dom.waBtn) dom.waBtn.onclick = (e) => {
            e.preventDefault();
            const evt = CalendarState.appointments.find(a => a.id === CalendarState.selectedEventId);
            if (evt) WhatsAppMessaging.sendMessage(evt, 'reminder');
        };
        if (dom.patientSearchInput) {
            dom.patientSearchInput.oninput = (e) => this.populatePatientSuggestions(e.target.value);
            dom.patientSearchInput.onblur = (e) => {
                const normalized = normalizeName(e.target.value);
                if (normalized !== e.target.value) {
                    e.target.value = normalized;
                }
            };
        }
        if (dom.isRecurringCheckbox) dom.isRecurringCheckbox.onchange = () => {
            dom.recurringSection.classList.toggle('hidden', !dom.isRecurringCheckbox.checked);
            if (dom.isRecurringCheckbox.checked) CalendarSuggestions.generateRecurringDates();
        };
        if (dom.recurringOptions) dom.recurringOptions.onchange = () => CalendarSuggestions.generateRecurringDates();
        if (document.getElementById('recurringDuration')) {
            document.getElementById('recurringDuration').onchange = () => CalendarSuggestions.generateRecurringDates();
        }
        if (dom.appointmentDateInput) dom.appointmentDateInput.onchange = (e) => {
            if (dom.isRecurringCheckbox.checked) CalendarSuggestions.generateRecurringDates();
            CalendarUI.renderBusySlots(e.target.value.split('T')[0]);
        };

        // Radio buttons "Tipo de cita"
        const typeRadios = document.querySelectorAll('input[name="appointmentType"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isPatient = e.target.value === 'patient';
                const nameFields = document.getElementById('patientNameFields');
                const searchLabel = document.getElementById('patientSearchLabel');

                if (nameFields) nameFields.style.display = isPatient ? 'grid' : 'none';
                if (searchLabel) searchLabel.textContent = isPatient ? 'Paciente' : 'Nombre del Lugar / Escuela';
                if (dom.patientSearchInput) dom.patientSearchInput.placeholder = isPatient ? 'Buscar o escribir nombre...' : 'Escribe Nombre de Escuela o Actividad...';
                
                // Si cambiamos a paciente y hay múltiples fechas, dejamos solo 1
                if (isPatient && dom.appointmentDateInput && dom.appointmentDateInput.value.includes(',')) {
                    dom.appointmentDateInput.value = dom.appointmentDateInput.value.split(',')[0];
                    if (CalendarModal.currentGridDate) CalendarModal.renderDailySlots(CalendarModal.currentGridDate);
                }
            });
        });
    },

    openCreateModal(dateStr, hour) {
        const dom = CalendarState.dom;
        CalendarState.selectedEventId = null;
        CalendarState.originalEventDate = null;

        if (dom.modalTitle) dom.modalTitle.textContent = 'Nueva Cita';
        if (dom.patientSearchInput) dom.patientSearchInput.value = '';
        if (dom.patientFirstNameInput) {
            dom.patientFirstNameInput.value = '';
            dom.patientFirstNameInput.disabled = false;
        }
        if (dom.patientLastNameInput) {
            dom.patientLastNameInput.value = '';
            dom.patientLastNameInput.disabled = false;
        }
        const currentTherapist = dom.appointmentTherapistInput?.value || AuthManager.currentUser?.therapist || 'diana';
        const defaults = AuthManager.getTherapistDefaults(currentTherapist);
        if (dom.costInput) dom.costInput.value = defaults.cost;

        // Reset Phone (Enabled for new appointments)
        if (dom.phoneInput) {
            dom.phoneInput.value = '';
            dom.phoneInput.disabled = false;
        }
        if (dom.countryCodeInput) {
            dom.countryCodeInput.value = '52';
            dom.countryCodeInput.disabled = false;
        }

        // Reset Therapist and Type
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = AuthManager.currentUser?.therapist || 'diana';
        }
        const defaultRadio = document.querySelector('input[name="appointmentType"][value="patient"]');
        if (defaultRadio) defaultRadio.checked = true;
        // Trigger manual change to reset UI
        defaultRadio?.dispatchEvent(new Event('change'));

        // Reset buttons
        if (dom.saveBtn) dom.saveBtn.classList.remove('hidden');
        if (dom.waBtn) dom.waBtn.classList.add('hidden');
        if (dom.deleteBtn) dom.deleteBtn.classList.add('hidden');
        if (dom.payBtn) dom.payBtn.classList.add('hidden');
        if (dom.confirmBtn) dom.confirmBtn.classList.add('hidden');
        if (dom.confirmedAtLabel) dom.confirmedAtLabel.classList.add('hidden');
        if (dom.cancelBtn) dom.cancelBtn.classList.add('hidden');
        if (dom.rescheduleSection) dom.rescheduleSection.classList.add('hidden');

        // Recurrence reset
        if (dom.isRecurringCheckbox) dom.isRecurringCheckbox.checked = false;
        if (dom.recurringSection) dom.recurringSection.classList.add('hidden');
        if (dom.recurringDatesList) dom.recurringDatesList.innerHTML = '';

        // Set date
        const date = new Date(dateStr + 'T00:00:00');
        date.setHours(hour);
        const localISOTime = TimeManager.toFirestore(date);

        if (dom.appointmentDateInput) dom.appointmentDateInput.value = localISOTime;
        
        const selectedTherapist = AuthManager.getSelectedTherapist();
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = (selectedTherapist && selectedTherapist !== 'all') ? selectedTherapist : 'diana';
        }
        this.originalTherapistOnOpen = dom.appointmentTherapistInput.value;

        // SEGURIDAD: Solo Diana y Yari pueden inhabilitar horas
        const blockOption = document.querySelector('input[name="appointmentType"][value="block"]')?.closest('label');
        if (blockOption) {
            blockOption.style.display = AuthManager.can('manage_blocks') ? 'flex' : 'none';
        }

        CalendarUI.renderBusySlots(dateStr);
        // NEW: Render Custom Grid for Create Mode
        this.renderDailySlots(date);

        // Reset Financial Breakdown
        if (dom.financialBreakdownSection) dom.financialBreakdownSection.classList.add('hidden');
        if (dom.manualClinicFee) dom.manualClinicFee.value = '';
        if (dom.manualTherapistPay) dom.manualTherapistPay.value = '';
        if (dom.manualPlanningPay) dom.manualPlanningPay.value = '';
        if (dom.planningTherapist) dom.planningTherapist.value = '';
        this._modalPatientProfile = null;
        this._financialIsIntentionalOverride = false;
        this._updateFinancialHint(dom.appointmentTherapistInput?.value || 'diana');
        this._captureFinancialBaseline();

        dom.eventModal.classList.remove('hidden');
        dom.eventModal.style.setProperty('display', 'flex', 'important');
        dom.eventModal.style.setProperty('z-index', '9999', 'important');
        document.body.classList.add('overflow-hidden');
        dom.patientSearchInput.focus();
    },

    openEditModal(ev) {
        const dom = CalendarState.dom;
        if (!dom.eventModal) {
            console.error('❌ CalendarModal: No se encontró dom.eventModal');
            return;
        }

        CalendarState.selectedEventId = ev.id;
        CalendarState.originalEventDate = ev.date;

        if (dom.modalTitle) dom.modalTitle.textContent = 'Detalles de Cita';
        if (dom.patientSearchInput) dom.patientSearchInput.value = ev.name || '';

        // Split name (Safe assignment)
        const nameParts = (ev.name || '').split(' ');
        if (dom.patientFirstNameInput) {
            dom.patientFirstNameInput.value = nameParts[0] || '';
            dom.patientFirstNameInput.disabled = true;
        }
        if (dom.patientLastNameInput) {
            dom.patientLastNameInput.value = nameParts.slice(1).join(' ') || '';
            dom.patientLastNameInput.disabled = true;
        }

        // Date
        const date = new Date(ev.date);
        const localISOTime = TimeManager.toFirestore(date);

        if (dom.appointmentDateInput) dom.appointmentDateInput.value = localISOTime;

        // CORRECCIÓN: Si el costo es 0, intentar jalar del perfil
        let displayCost = ev.cost || 0;
        if (displayCost === 0) {
            const profile = PatientState.patients.find(p => p.id === ev.patientId || p.name === ev.name);
            displayCost = profile?.defaultCost || 800;
        }
        if (dom.costInput) dom.costInput.value = displayCost;

        // Set Therapist and Type
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = ev.therapist || 'diana';
            this.originalTherapistOnOpen = ev.therapist || 'diana';
        }

        // Phone Reference (Read-only if exists)
        const profile = PatientState.patients.find(p => p.id === ev.patientId || p.name === ev.name);
        if (dom.phoneInput && profile) {
            dom.phoneInput.value = profile.phone || '';
            dom.phoneInput.disabled = true;
        }
        if (dom.countryCodeInput && profile) {
            dom.countryCodeInput.value = profile.countryCode || '52';
            dom.countryCodeInput.disabled = true;
        }
        const isSchool = ev.isSchoolVisit === true || ev.name.toLowerCase().startsWith('escuela:');
        let radioValue = 'patient';
        if (ev.isHourlyBlock || ev.name.includes('⛔')) radioValue = 'block';
        else if (isSchool) radioValue = 'school';

        const typeRadio = document.querySelector(`input[name="appointmentType"][value="${radioValue}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            typeRadio.dispatchEvent(new Event('change'));
            
            // SEGURIDAD: Si el terapeuta no es el dueño, ocultar información sensible y botones
            const canEdit = AuthManager.canEditItem(ev);
            
            if (dom.saveBtn) dom.saveBtn.classList.toggle('hidden', !canEdit);
            if (dom.deleteBtn) dom.deleteBtn.classList.toggle('hidden', !canEdit);
            if (dom.payBtn) dom.payBtn.classList.toggle('hidden', !canEdit);
            if (dom.confirmBtn) dom.confirmBtn.classList.toggle('hidden', !canEdit);
            if (dom.cancelBtn) dom.cancelBtn.classList.toggle('hidden', !canEdit);

            // PRIVACIDAD: Ocultar Costo y Teléfono si no es dueño
            if (dom.costInput) {
                const costContainer = dom.costInput.closest('div');
                if (costContainer) costContainer.classList.toggle('hidden', !canEdit);
            }
            if (dom.phoneInput) {
                const phoneContainer = dom.phoneInput.closest('.mt-4'); // Contenedor de WhatsApp
                if (phoneContainer) phoneContainer.classList.toggle('hidden', !canEdit);
            }

            // Bloquear opción de Inhabilitar si no tiene permiso
            const blockOption = document.querySelector('input[name="appointmentType"][value="block"]')?.closest('label');
            if (blockOption) {
                blockOption.style.display = AuthManager.can('manage_blocks') ? 'flex' : 'none';
            }

            if (dom.waBtn) {
                dom.waBtn.classList.toggle('hidden', isSchool || !canEdit);
            }

            // Desglose financiero: perfil del paciente (override manual solo si es intencional)
            if (dom.financialBreakdownSection) {
                const therapistDefaults = AuthManager.getTherapistDefaults(ev.therapist || 'diana');
                this._modalPatientProfile = profile || null;
                const fin = resolveEffectiveFinancials(ev, profile, therapistDefaults);

                if (fin.showBreakdownSection) {
                    dom.financialBreakdownSection.classList.remove('hidden');
                } else {
                    dom.financialBreakdownSection.classList.add('hidden');
                }

                dom.manualClinicFee.value = fin.clinicFee;
                dom.manualTherapistPay.value = fin.therapistPay;
                dom.manualPlanningPay.value = fin.planningPay || '';
                dom.planningTherapist.value = fin.planningTherapist || '';
                this._financialIsIntentionalOverride = fin.isIntentionalOverride;
                this._updateFinancialHint(ev.therapist || 'diana', profile);
                this._captureFinancialBaseline();
            }
        }

        // Confirm button state
        dom.confirmBtn.innerHTML = ev.confirmed ? '❌ Quitar Confirmación' : '✓ Confirmar Asistencia';
        dom.confirmBtn.className = ev.confirmed
            ? "w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors flex items-center justify-center gap-2 mb-1 text-sm font-medium"
            : "w-full bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center justify-center gap-2 mb-1";

        // AUDITORÍA
        if (dom.appointmentAuditInfo) {
            dom.appointmentAuditInfo.classList.add('hidden');
            let hasAudit = false;

            // 1. Confirmación
            if (dom.confirmedAtLabel) {
                if (ev.confirmed) {
                    let ds = '';
                    if (ev.confirmedAt && ev.confirmedAt.toDate) ds = ev.confirmedAt.toDate().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
                    else if (ev.confirmedAt) ds = new Date(ev.confirmedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
                    
                    const span = dom.confirmedAtLabel.querySelector('span:last-child');
                    const confirmedBy = ev.confirmedBy ? ` por ${ev.confirmedBy}` : '';
                    if (span) span.textContent = ds ? `Confirmado${confirmedBy} el: ${ds}` : `Confirmado${confirmedBy}`;
                    dom.confirmedAtLabel.classList.remove('hidden');
                    hasAudit = true;
                } else {
                    dom.confirmedAtLabel.classList.add('hidden');
                }
            }

            // 2. Cancelación
            if (dom.cancelledByLabel) {
                if (ev.isCancelled) {
                    const source = ev.cancelledBy === 'WhatsApp' ? '🤖 WhatsApp' : (ev.cancelledBy || 'Manual');
                    const span = dom.cancelledByLabel.querySelector('span:last-child');
                    if (span) span.textContent = `Cancelado por: ${source}`;
                    dom.cancelledByLabel.classList.remove('hidden');
                    hasAudit = true;
                } else {
                    dom.cancelledByLabel.classList.add('hidden');
                }
            }

            // 3. Reagendamiento
            if (dom.rescheduledByLabel) {
                if (ev.rescheduledFromId) {
                    const source = ev.rescheduleSource || 'Manual';
                    const span = dom.rescheduledByLabel.querySelector('span:last-child');
                    if (span) span.textContent = `Reagendado por: ${source}`;
                    dom.rescheduledByLabel.classList.remove('hidden');
                    hasAudit = true;
                } else {
                    dom.rescheduledByLabel.classList.add('hidden');
                }
            }

            if (hasAudit) dom.appointmentAuditInfo.classList.remove('hidden');
        }

        // Pay button state
        dom.payBtn.textContent = ev.isPaid ? 'Marcar como No Pagado' : 'Marcar como Pagado';
        dom.payBtn.className = ev.isPaid
            ? "flex-1 bg-yellow-100 text-yellow-700 py-2 rounded-lg hover:bg-yellow-200 transition-colors font-semibold"
            : "flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 transition-colors font-semibold";

        // Cancel button state
        if (ev.isCancelled) {
            dom.cancelBtn.textContent = "Reactivar Cita";
            dom.cancelBtn.className = "flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg hover:bg-blue-200 transition-colors font-semibold";
        } else {
            dom.cancelBtn.textContent = "Cancelar Cita";
            dom.cancelBtn.className = "flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-semibold";
        }

        // JUSTIFICACIÓN MÉDICA (Solo si la cita está cancelada)
        if (dom.justificationSection) {
            if (ev.isCancelled) {
                dom.justificationSection.classList.remove('hidden');
                dom.isJustified.checked = ev.justified || false;
                
                // Si ya tiene un archivo subido
                if (ev.justificationUrl) {
                    dom.justificationUploadArea.classList.add('hidden');
                    dom.justificationFilePreview.classList.remove('hidden');
                    dom.justificationFileName.textContent = ev.justificationFileName || "Justificante Médico";
                    
                    dom.viewJustificationBtn.onclick = () => window.open(ev.justificationUrl, '_blank');
                    dom.removeJustificationBtn.onclick = async () => {
                        if (confirm("¿Estás seguro de quitar este justificante médico?")) {
                            LoaderService.show("Eliminando archivo...");
                            try {
                                const { ref, deleteObject, storage, doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
                                
                                // Eliminar de Storage
                                const fileRef = ref(storage, ev.justificationUrl);
                                await deleteObject(fileRef);
                                
                                // Limpiar Firestore
                                const docRef = doc(db, collectionPath, ev.id);
                                await updateDoc(docRef, {
                                    justificationUrl: null,
                                    justificationFileName: null,
                                    justified: false,
                                    justifiedAt: null,
                                    justifiedBy: null
                                });
                                
                                // Actualizar estado local
                                ev.justificationUrl = null;
                                ev.justificationFileName = null;
                                ev.justified = false;
                                ev.justifiedAt = null;
                                ev.justifiedBy = null;
                                
                                dom.isJustified.checked = false;
                                dom.justificationUploadArea.classList.remove('hidden');
                                dom.justificationFilePreview.classList.add('hidden');
                                ToastService.success("Justificante eliminado correctamente");
                            } catch (err) {
                                console.error("Error al borrar justificante:", err);
                                ToastService.error("No se pudo eliminar el archivo: " + err.message);
                            } finally {
                                LoaderService.hide();
                            }
                        }
                    };
                } else {
                    // Si no tiene archivo subido
                    dom.justificationUploadArea.classList.remove('hidden');
                    dom.justificationFilePreview.classList.add('hidden');
                }
            } else {
                dom.justificationSection.classList.add('hidden');
            }
        }

        // Smart Suggestion (Best Pattern)
        const canEdit = AuthManager.canEditItem(ev);
        if (canEdit) {
            CalendarSuggestions.analyzeAndSuggest(ev.name);
            // Generar opciones de reagendamiento si tiene permiso
            if (dom.rescheduleSection) {
                CalendarSuggestions.generateRescheduleOptions(date);
            }
        } else {
            const suggestionBox = document.getElementById('schedulingSuggestion');
            if (suggestionBox) suggestionBox.remove();
        }

        // Recurrence (Allow in edit)
        if (dom.isRecurringCheckbox) dom.isRecurringCheckbox.checked = false;
        if (dom.recurringSection) dom.recurringSection.classList.add('hidden');
        if (dom.recurringOptions) dom.recurringOptions.value = 'weekly';
        if (document.getElementById('recurringDuration')) document.getElementById('recurringDuration').value = '3';

        CalendarUI.renderBusySlots(localISOTime.split('T')[0]); // Mantiene compatibilidad si algo lo usa

        // NEW: Render Custom Daily Grid
        this.renderDailySlots(date);

        console.log('📬 Abriendo modal de edición para:', ev.name);
        
        // PRIVACIDAD ADICIONAL: Ocultar Reagendar si no tiene permiso
        if (dom.rescheduleSection) {
            dom.rescheduleSection.classList.toggle('hidden', !canEdit);
        }

        dom.eventModal.classList.remove('hidden');
        dom.eventModal.style.setProperty('display', 'flex', 'important');
        dom.eventModal.style.setProperty('z-index', '9999', 'important');
        document.body.classList.add('overflow-hidden');
    },

    closeModal() {
        const dom = CalendarState.dom;
        if (dom.eventModal) {
            dom.eventModal.classList.add('hidden');
            dom.eventModal.style.setProperty('display', 'none', 'important');
        }
        const patientModalIds = ['newPatientModal', 'patientHistoryModal', 'inactivePatientsModal', 'sessionNoteModal'];
        const patientOpen = patientModalIds.some((id) => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
        const otherModalOpen = document.getElementById('receptionControlModal') && !document.getElementById('receptionControlModal').classList.contains('hidden');
        const moreSheetOpen = document.getElementById('mobileMoreSheet') && !document.getElementById('mobileMoreSheet').classList.contains('hidden');
        if (!patientOpen && !otherModalOpen && !moreSheetOpen) {
            document.body.classList.remove('overflow-hidden');
        }
        if (this._awaitingRescheduleSave && this._cancelDebtContext?.isToday) {
            this._offerSessionDebtMark(this._cancelDebtContext).finally(() => {
                this._cancelDebtContext = null;
                this._awaitingRescheduleSave = false;
            });
        } else {
            this._cancelDebtContext = null;
            this._awaitingRescheduleSave = false;
        }
        CalendarState.selectedEventId = null;
        console.log('🚪 CalendarModal: Modal cerrado correctamente');
    },

    setupJustificationEvents() {
        const dom = CalendarState.dom;
        if (!dom.justificationDropZone || !dom.justificationFileInput) return;

        // 1. Clic para seleccionar archivo
        dom.justificationDropZone.onclick = (e) => {
            e.stopPropagation();
            dom.justificationFileInput.click();
        };

        // 2. Drag & Drop visual
        dom.justificationDropZone.ondragover = (e) => {
            e.preventDefault();
            dom.justificationDropZone.classList.add('bg-red-100', 'border-blue-400');
        };

        dom.justificationDropZone.ondragleave = () => {
            dom.justificationDropZone.classList.remove('bg-red-100', 'border-blue-400');
        };

        dom.justificationDropZone.ondrop = (e) => {
            e.preventDefault();
            dom.justificationDropZone.classList.remove('bg-red-100', 'border-blue-400');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleJustificationUpload(files[0]);
            }
        };

        // 3. Selección directa por input
        dom.justificationFileInput.onchange = (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleJustificationUpload(files[0]);
            }
        };

        // 4. Guardado instantáneo al cambiar checkbox "Justificado"
        if (dom.isJustified) {
            dom.isJustified.onchange = async () => {
                const eventId = CalendarState.selectedEventId;
                if (!eventId) return;
                const ev = CalendarState.appointments.find(a => a.id === eventId);
                if (!ev) return;

                const isChecked = dom.isJustified.checked;
                LoaderService.show("Guardando justificación...");
                try {
                    const { doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
                    const docRef = doc(db, collectionPath, eventId);
                    
                    const updateObj = {
                        justified: isChecked,
                        justifiedAt: isChecked ? new Date().toISOString() : null,
                        justifiedBy: isChecked ? (AuthManager.currentUser?.email || 'unknown') : null
                    };
                    await updateDoc(docRef, updateObj);
                    
                    ev.justified = isChecked;
                    ev.justifiedAt = updateObj.justifiedAt;
                    ev.justifiedBy = updateObj.justifiedBy;

                    ToastService.success(isChecked ? "Cita marcada como justificada (No Cobrar) 💚" : "Cita marcada como inasistencia regular ❌");
                } catch (err) {
                    console.error("Error al actualizar justificación:", err);
                    dom.isJustified.checked = !isChecked; // Revertir visualmente
                    ToastService.error("Error: " + err.message);
                } finally {
                    LoaderService.hide();
                }
            };
        }
    },

    async handleJustificationUpload(file) {
        const dom = CalendarState.dom;
        const eventId = CalendarState.selectedEventId;
        if (!eventId) return;

        const ev = CalendarState.appointments.find(a => a.id === eventId);
        if (!ev) return;

        // Validación de tamaño (Máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            ToastService.warn("El justificante supera el límite de 5MB");
            return;
        }

        LoaderService.show("Subiendo justificante médico...");
        try {
            const { storage, ref, uploadBytes, getDownloadURL, doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
            
            // Nombre de archivo con timestamp único
            const fileExtension = file.name.split('.').pop();
            const fileName = `justificantes/${eventId}_${Date.now()}.${fileExtension}`;
            const fileRef = ref(storage, fileName);

            // Subir archivo a Firebase Storage
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            // Guardar referencias en el documento de Firestore de la cita
            const docRef = doc(db, collectionPath, eventId);
            const updateObj = {
                justificationUrl: downloadUrl,
                justificationFileName: file.name,
                justified: true,
                justifiedAt: new Date().toISOString(),
                justifiedBy: AuthManager.currentUser?.email || 'unknown'
            };
            await updateDoc(docRef, updateObj);

            // Actualizar estado local en memoria
            ev.justificationUrl = downloadUrl;
            ev.justificationFileName = file.name;
            ev.justified = true;
            ev.justifiedAt = updateObj.justifiedAt;
            ev.justifiedBy = updateObj.justifiedBy;

            // Reflejar cambios visuales en el modal de forma interactiva
            dom.isJustified.checked = true;
            dom.justificationUploadArea.classList.add('hidden');
            dom.justificationFilePreview.classList.remove('hidden');
            dom.justificationFileName.textContent = file.name;

            // Re-vincular botones de ver y eliminar
            dom.viewJustificationBtn.onclick = () => window.open(downloadUrl, '_blank');
            dom.removeJustificationBtn.onclick = async () => {
                if (confirm("¿Estás seguro de quitar este justificante médico?")) {
                    LoaderService.show("Eliminando archivo...");
                    try {
                        const { deleteObject } = await import('../../firebase.js');
                        await deleteObject(fileRef);
                        await updateDoc(docRef, {
                            justificationUrl: null,
                            justificationFileName: null,
                            justified: false,
                            justifiedAt: null,
                            justifiedBy: null
                        });
                        ev.justificationUrl = null;
                        ev.justificationFileName = null;
                        ev.justified = false;
                        ev.justifiedAt = null;
                        ev.justifiedBy = null;

                        dom.isJustified.checked = false;
                        dom.justificationUploadArea.classList.remove('hidden');
                        dom.justificationFilePreview.classList.add('hidden');
                        ToastService.success("Justificante eliminado correctamente");
                    } catch (e) {
                        console.error("Error al eliminar justificante:", e);
                        ToastService.error("No se pudo eliminar: " + e.message);
                    } finally {
                        LoaderService.hide();
                    }
                }
            };

            ToastService.success("¡Justificante cargado y guardado correctamente! 🎉");
        } catch (error) {
            console.error("Error al subir justificante:", error);
            ToastService.error("Error al subir justificante: " + error.message);
        } finally {
            LoaderService.hide();
        }
    },

    populatePatientSuggestions(query) {
        const { patientSuggestions, patientFirstNameInput, patientLastNameInput, appointmentTherapistInput } = CalendarState.dom;
        if (!patientSuggestions) return;

        patientSuggestions.innerHTML = '';
        if (query.length < 2) {
            patientSuggestions.classList.add('hidden');
            return;
        }

        // Filtrar por terapeuta seleccionado en el modal
        const selectedTherapist = CalendarState.dom.appointmentTherapistInput?.value || AuthManager.getSelectedTherapist();
        const isViewAll = !selectedTherapist || selectedTherapist === 'all';

        const matches = PatientState.patients.filter(p => {
            if (p.isActive === false) return false;
            if (!p.name.toLowerCase().includes(query.toLowerCase())) return false;
            // Si hay terapeuta seleccionado, filtrar por ese terapeuta
            if (!isViewAll) {
                const patientTherapist = p.therapist || 'diana';
                if (patientTherapist !== selectedTherapist) return false;
            }
            return true;
        });

        if (matches.length > 0) {
            patientSuggestions.classList.remove('hidden');
            matches.forEach(p => {
                const div = document.createElement('div');
                div.className = "p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b last:border-b-0";
                div.textContent = p.name;
                div.onclick = () => {
                    CalendarState.dom.patientSearchInput.value = p.name;
                    patientFirstNameInput.value = p.firstName || '';
                    patientLastNameInput.value = p.lastName || '';
                    patientFirstNameInput.disabled = true;
                    patientLastNameInput.disabled = true;

                    CalendarModal._modalPatientProfile = p;
                    CalendarModal._financialIsIntentionalOverride = false;

                    // Auto-select therapist
                    if (appointmentTherapistInput) {
                        appointmentTherapistInput.value = p.therapist || 'diana';
                    }

                    if (CalendarState.dom.costInput) {
                        CalendarState.dom.costInput.value = p.defaultCost || 800;
                    }

                    CalendarModal._updateFinancialHint(p.therapist || 'diana', p);

                    // Auto-fill phone as reference
                    if (CalendarState.dom.phoneInput) {
                        CalendarState.dom.phoneInput.value = p.phone || '';
                        CalendarState.dom.phoneInput.disabled = true;
                    }
                    if (CalendarState.dom.countryCodeInput) {
                        CalendarState.dom.countryCodeInput.value = p.countryCode || '52';
                        CalendarState.dom.countryCodeInput.disabled = true;
                    }

                    patientSuggestions.classList.add('hidden');
                    CalendarSuggestions.analyzeAndSuggest(p.name);
                };
                patientSuggestions.appendChild(div);
            });
        } else {
            patientSuggestions.classList.add('hidden');
            patientFirstNameInput.disabled = false;
            patientLastNameInput.disabled = false;
            // Auto-fill if looks like a name
            const parts = query.split(' ');
            if (parts.length > 0) {
                patientFirstNameInput.value = parts[0];
                patientLastNameInput.value = parts.slice(1).join(' ');
            }
        }
    },


    async handleSave() {
        console.log("💾 handleSave invocado");
        LoaderService.show("Guardando cita...");
        try {
            await this._executeSave();
        } catch (e) {
            console.error(e);
            await ModalService.alert("Error", "Error al guardar: " + e.message, "error");
        } finally {
            LoaderService.hide();
        }
    },

    async _executeSave() {
        const dom = CalendarState.dom;

        const typeRadio = document.querySelector('input[name="appointmentType"]:checked')?.value;
        const isBlock = typeRadio === 'block';
        
        let name = dom.patientSearchInput.value.trim();
        if (isBlock && !name) name = "⛔ Hora Inhábil";
        
        const dateStr = dom.appointmentDateInput.value;
        const cost = parseFloat(dom.costInput.value) || 0;
        console.log("   - Datos:", { name, dateStr, cost, typeRadio });
        const therapist = dom.appointmentTherapistInput ? dom.appointmentTherapistInput.value : (AuthManager.currentUser?.therapist || 'diana');

        if (!name && !isBlock) {
            await ModalService.alert("Campos Incompletos", "Por favor completa nombre y fecha", "warning");
            return;
        }

        if (cost <= 0 && !isBlock) {
            await ModalService.alert("Costo Requerido", "Por favor ingresa un costo válido para la cita (mayor a 0).", "warning");
            // Highlight input
            if (dom.costInput) {
                dom.costInput.focus();
                dom.costInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
                dom.costInput.oninput = () => {
                    dom.costInput.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
                };
            }
            return;
        }

        try {
            const isSchoolVisit = typeRadio === 'school';
            const dateStrArray = dom.appointmentDateInput.value.split(','); // Para múltiples slots

            // Validar conflictos para todas las fechas seleccionadas
            for (const dateStr of dateStrArray) {
                const dateObj = new Date(dateStr);
                if (!isWithinWorkingHours(dateObj)) {
                    await ModalService.alert("Horario Inválido", "La cita debe estar entre las 8:00 y las 20:00", "warning");
                    return;
                }
                if (!isNotSunday(dateObj)) {
                    await ModalService.alert("Día Inválido", "No se pueden agendar citas los domingos", "warning");
                    return;
                }
                if (!CalendarState.selectedEventId || dateStrArray.length > 1) {
                     if (checkSlotConflict(dateStr, CalendarState.appointments, CalendarState.selectedEventId)) {
                        if (!await ModalService.confirm("Conflicto de Horario", `Ya hay una cita a las ${new Date(dateStr).toLocaleTimeString()}.<br>¿Deseas agregarla de todas formas?`, "Agregar igualmente", "Cancelar")) return;
                     }
                }
            }

            // Repartir el costo total equitativamente entre las horas seleccionadas
            const costPerSlot = cost / dateStrArray.length;

            let appointmentData = {
                cost: costPerSlot,
                therapist: therapist,
                isSchoolVisit: isSchoolVisit, // BUG FIX: block is not a school visit
                isHourlyBlock: isBlock,
                isFullDayBlock: false // we distinguish from full day
            };

            if (CalendarState.rescheduledFromId) {
                appointmentData.rescheduledFromId = CalendarState.rescheduledFromId;
                appointmentData.rescheduleSource = AuthManager.currentUser?.email || 'Manual';
            }

            if (isSchoolVisit || isBlock) {
                // No interactuar con pacientes, solo guardar el evento
                appointmentData.name = name;
                if (isSchoolVisit && !name.startsWith('Escuela:')) appointmentData.name = `Escuela: ${name}`;
                appointmentData.patientId = null;
            } else {
                // Flujo normal de paciente
                const therapistDefaults = AuthManager.getTherapistDefaults(therapist);
                const profile = await ensurePatientProfile(
                    name,
                    dom.patientFirstNameInput.value,
                    dom.patientLastNameInput.value,
                    PatientState.patients,
                    { clinicFee: therapistDefaults.clinicFee } // Pasar fee por defecto según terapeuta
                );
                appointmentData.name = profile.name;
                appointmentData.patientId = profile.id;

                const sectionOpen = dom.financialBreakdownSection
                    && !dom.financialBreakdownSection.classList.contains('hidden');
                const profileFin = resolveEffectiveFinancials(
                    { cost: costPerSlot },
                    profile,
                    therapistDefaults
                );
                const domClinic = parseFloat(dom.manualClinicFee?.value);
                const domSession = parseFloat(dom.manualTherapistPay?.value);
                const domPlanning = parseFloat(dom.manualPlanningPay?.value);
                const hasHiddenOverride = !sectionOpen && (
                    (Number.isFinite(domClinic) && domClinic !== profileFin.clinicFee)
                    || (Number.isFinite(domSession) && domSession !== profileFin.therapistPay)
                    || (Number.isFinite(domPlanning) && domPlanning > 0)
                    || !!dom.planningTherapist?.value
                );
                if (hasHiddenOverride) {
                    await ModalService.alert(
                        'Abre Ajuste Manual',
                        'Hay un desglose especial en esta cita pero el panel <strong>Ajuste Manual</strong> está cerrado.<br><br>'
                        + 'Ábrelo antes de <strong>Guardar cita</strong> para que se guarde Parláre / Sesión / Planeación.',
                        'warning'
                    );
                    return;
                }

                const manualFinancials = collectManualFinancialsFromDom(dom);
                Object.assign(
                    appointmentData,
                    buildFinancialFieldsForSave(manualFinancials, profile, therapistDefaults)
                );
            }

            if (CalendarState.selectedEventId) {
                const dateChanged = CalendarState.originalEventDate !== dateStrArray[0];

                // Update el primero
                await CalendarData.updateEvent(CalendarState.selectedEventId, { ...appointmentData, date: dateStrArray[0] });
                
                // Si cambió la fecha/hora, ofrecer avisar por WhatsApp
                if (dateChanged) {
                    const sendWA = await ModalService.confirm(
                        "Cita Reagendada",
                        "¿Deseas enviar un mensaje automático de confirmación del nuevo horario por WhatsApp?",
                        "Enviar WhatsApp",
                        "No, gracias"
                    );
                    if (sendWA) {
                        const updatedInfo = { ...appointmentData, date: dateStrArray[0], id: CalendarState.selectedEventId };
                        WhatsAppMessaging.sendMessage(updatedInfo, 'reschedule');
                    }
                }

                // Si seleccionó una segunda hora durante la edición, la creamos
                if (dateStrArray.length > 1) {
                    await CalendarData.createEvent({ ...appointmentData, date: dateStrArray[1] });
                }
            } else {
                // Create
                if (dom.isRecurringCheckbox.checked) {
                    await this._processRecurrenceCreation(appointmentData, dateStrArray);
                } else {
                    for (const dateStr of dateStrArray) {
                        await CalendarData.createEvent({ ...appointmentData, date: dateStr });
                    }
                }
            }
            if (this._awaitingRescheduleSave || CalendarState.rescheduledFromId) {
                this._cancelDebtContext = null;
                this._awaitingRescheduleSave = false;
            }
            CalendarState.rescheduledFromId = null;
            this._captureFinancialBaseline();
            this.closeModal();
            console.log("✅ Cita guardada y modal cerrado");
            ToastService.success("Cita guardada correctamente");
        } catch (e) {
            console.error(e);
            await ModalService.alert("Error", "Error al guardar: " + e.message, "error");
        }
    },

    async handleDelete() {
        if (!CalendarState.selectedEventId) return;
        if (await ModalService.confirm("Eliminar Cita", "¿Eliminar esta cita?", "Eliminar", "Cancelar", "danger")) {
            await CalendarData.deleteEvent(CalendarState.selectedEventId);
            this.closeModal();
        }
    },

    async handlePaymentToggle() {
        if (!CalendarState.selectedEventId) return;
        const dom = CalendarState.dom;
        const evt = CalendarState.appointments.find(a => a.id === CalendarState.selectedEventId);
        if (!evt) return;

        // B: bloquear si hay cambios sin guardar (costo o ajuste manual)
        if (this._financialFieldsDirty) {
            await ModalService.alert(
                'Guarda antes de registrar pago',
                'Cambiaste el <strong>costo</strong> o el <strong>Ajuste Manual</strong> pero aún no guardaste la cita.<br><br>'
                + '1. Pulsa <strong>Guardar cita</strong><br>'
                + '2. Vuelve a abrir la cita<br>'
                + '3. Luego <strong>Marcar como No Pagado</strong> o <strong>Pagado</strong>',
                'warning'
            );
            return;
        }

        const profile = this._modalPatientProfile
            || PatientState.patients.find(p => p.id === evt.patientId || p.name === evt.name);
        const therapistDefaults = AuthManager.getTherapistDefaults(evt.therapist || 'diana');
        const preview = buildPaymentExcelPreview(evt, profile, therapistDefaults);
        const markingUnpaid = evt.isPaid === true;
        const actionLabel = markingUnpaid ? 'No Pagado (ANULADO en Excel)' : 'Pagado';
        const planningLine = preview.planningPay > 0
            ? `<li><strong>Planeación${preview.planningTherapist ? ` (${preview.planningTherapist})` : ''}:</strong> $${preview.planningPay}</li>`
            : '';
        const annulNote = markingUnpaid
            ? '<p class="text-amber-800 text-xs mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2">'
                + 'La fila <strong>Pagado</strong> anterior permanece en Excel; se agrega una fila <strong>ANULADO</strong> de corrección. '
                + 'Después puedes marcar <strong>Pagado</strong> otra vez con el desglose correcto.</p>'
            : '';

        const confirmed = await ModalService.confirm(
            markingUnpaid ? 'Confirmar anulación en Excel' : 'Confirmar pago en Excel',
            `<p class="mb-2">Se registrará en <strong>App_Data</strong>:</p>`
            + `<ul class="text-sm space-y-1 list-disc ml-4">`
            + `<li><strong>Acción:</strong> ${actionLabel}</li>`
            + `<li><strong>Monto:</strong> $${preview.cost}${markingUnpaid ? ' (negativo en Excel)' : ''}</li>`
            + `<li><strong>Parláre:</strong> $${preview.clinicFee}</li>`
            + `<li><strong>Sesión (terapeuta):</strong> $${preview.therapistPay}</li>`
            + planningLine
            + `</ul>`
            + annulNote,
            markingUnpaid ? 'Sí, anular en Excel' : 'Sí, registrar pago',
            'Cancelar',
            markingUnpaid ? 'warning' : 'success'
        );

        if (!confirmed) return;

        await CalendarData.togglePayment(CalendarState.selectedEventId, evt.isPaid, null);
        this.closeModal();
    },

    async handleConfirmToggle() {
        if (!CalendarState.selectedEventId) return;
        const evt = CalendarState.appointments.find(a => a.id === CalendarState.selectedEventId);
        if (evt) {
            await CalendarData.toggleConfirmation(CalendarState.selectedEventId, evt.confirmed);
            this.closeModal();
        }
    },

    async handleCancel() {
        if (!CalendarState.selectedEventId) return;

        const eventId = CalendarState.selectedEventId;
        const appointment = CalendarState.appointments.find((a) => a.id === eventId);
        if (!appointment) return;

        if (!await ModalService.confirm("Cancelar Cita", "¿Estás seguro de que deseas cancelar esta cita?", "Sí, Cancelar", "No")) return;

        const userEmail = AuthManager.currentUser?.email || 'unknown';
        await CalendarData.cancelEvent(eventId, userEmail);

        const profile = PatientState.patients.find(
            (p) => p.id === appointment.patientId || p.name === appointment.name
        );
        const debtContext = {
            appointmentId: eventId,
            patientId: profile?.id || appointment.patientId,
            patientName: appointment.name,
            cancelledSlot: appointment.date,
            therapist: appointment.therapist,
            habitualSlot: profile?.schedulingQueue?.habitualSlot || null,
            isToday: isSameCalendarDay(appointment.date)
        };
        this._cancelDebtContext = debtContext;
        this._awaitingRescheduleSave = false;

        const sendWA = await ModalService.confirm(
            "Aviso por WhatsApp",
            "¿Deseas enviar un mensaje automático de cancelación al responsable?",
            "Enviar WhatsApp",
            "No, solo cancelar"
        );

        if (sendWA) {
            WhatsAppMessaging.sendMessage(appointment, 'cancel');
        }

        const reschedule = await ModalService.confirm(
            "Reagendar",
            "Cita cancelada.<br>¿Deseas agendar una nueva cita para este paciente ahora?",
            "Sí, Reagendar",
            "No, cerrar"
        );

        if (reschedule) {
            this._awaitingRescheduleSave = true;
            CalendarState.rescheduledFromId = eventId;
            CalendarState.selectedEventId = null;
            const dom = CalendarState.dom;

            dom.modalTitle.textContent = 'Nueva Cita';
            dom.saveBtn.classList.remove('hidden');
            dom.deleteBtn.classList.add('hidden');
            dom.payBtn.classList.add('hidden');
            dom.confirmBtn.classList.add('hidden');
            dom.cancelBtn.classList.add('hidden');

            if (dom.appointmentDateInput.value) {
                const current = new Date(dom.appointmentDateInput.value);
                const nextWeek = new Date(current);
                nextWeek.setDate(nextWeek.getDate() + 7);
                dom.appointmentDateInput.value = this._getLocalISOStringFormat(nextWeek);
                this.renderDailySlots(nextWeek);
            }
            return;
        }

        if (debtContext.isToday) {
            await this._offerSessionDebtMark(debtContext);
        }
        this._cancelDebtContext = null;
        this.closeModal();
    },

    async _offerSessionDebtMark(ctx) {
        if (!ctx?.patientId || String(ctx.patientId).length < 12) {
            const byName = PatientState.patients.find((p) => p.name === ctx.patientName);
            if (!byName?.id || String(byName.id).length < 12) return;
            ctx.patientId = byName.id;
        }

        const mark = await ModalService.confirm(
            'Sesión adeudada',
            '¿Marcar que este paciente <strong>debe una sesión</strong>?<br><span class="text-xs text-gray-500">Solo contador para recepción; no envía WhatsApp.</span>',
            'Sí, marcar',
            'No, gracias',
            'info'
        );
        if (!mark) return;

        const outside = await ModalService.confirm(
            'Horario habitual',
            '¿La cita cancelada era <strong>fuera</strong> del horario habitual (otro día u hora)?<br><br><span class="text-xs text-amber-800">Siempre suma 1 al contador. Si no estás segura, sigue con la siguiente pregunta.</span>',
            'Sí, otro horario',
            'No / habitual',
            'info'
        );

        const unsure = !outside
            ? await ModalService.confirm(
                  '¿No estás seguro/a?',
                  '¿Marcar como <strong>no seguro</strong> (igual cuenta en el contador)?',
                  'Marcar no seguro',
                  'Dejar como habitual',
                  'info'
              )
            : false;

        const debtOutsideHabitual = outside ? true : unsure ? null : false;

        try {
            const res = await SchedulingQueueService.markSessionOwed(ctx.patientId, {
                cancelledSlot: ctx.cancelledSlot,
                therapist: ctx.therapist,
                debtOutsideHabitual,
                habitualSlot: ctx.habitualSlot
            });
            if (res.success) {
                await PatientManager.refreshProfiles(true);
                await ModalService.alert(
                    'Contador actualizado',
                    `Marcado: debe <strong>${res.sessionsOwed}</strong> sesión(es) esta semana.`,
                    'success'
                );
            }
        } catch (e) {
            console.warn('[SchedQueue] markSessionOwed:', e);
            await ModalService.alert('No se pudo guardar', e.message || 'Error', 'error');
        }
    },

    // ─── NEW: Grid Logic ───────────────────────────────

    bindGridEvents() {
        // Se vinculan directamente al documento o se buscan al abrir, 
        // pero mejor vincularlos una vez si existen en index.html siempre.
        setTimeout(() => {
            const prevBtn = document.getElementById('prevDayBtn');
            const nextBtn = document.getElementById('nextDayBtn');
            const dateNav = document.getElementById('dateNavPicker');

            if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); this.shiftDay(-1); };
            if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); this.shiftDay(1); };
            if (dateNav) dateNav.onchange = (e) => this.renderDailySlots(e.target.value);

            // Update grid when therapist changes
            const dom = CalendarState.dom;
            if (dom.appointmentTherapistInput) {
                dom.appointmentTherapistInput.onchange = () => {
                    if (this.currentGridDate) this.renderDailySlots(this.currentGridDate);
                    this._updateFinancialHint(dom.appointmentTherapistInput.value);
                };
            }

            if (dom.toggleFinancialBtn) {
                dom.toggleFinancialBtn.onclick = (e) => {
                    e.preventDefault();
                    if (dom.financialBreakdownSection) {
                        const willShow = dom.financialBreakdownSection.classList.contains('hidden');
                        dom.financialBreakdownSection.classList.toggle('hidden');
                        if (willShow) {
                            this._prefillFinancialFromProfile();
                            this._updateFinancialHint(
                                dom.appointmentTherapistInput?.value || 'diana',
                                this._modalPatientProfile
                            );
                        }
                    }
                };
            }

            // LISTENERS PARA BALANCEO FINANCIERO EN TIEMPO REAL
            [dom.costInput, dom.manualClinicFee, dom.manualPlanningPay, dom.planningTherapist].forEach(el => {
                if (el) {
                    el.addEventListener('input', () => {
                        this.balanceFinancials();
                        this._checkFinancialDirty();
                    });
                    el.addEventListener('change', () => {
                        this.balanceFinancials();
                        this._checkFinancialDirty();
                    });
                }
            });
        }, 500); // Pequeño delay para asegurar DOM
    },

    _snapshotFinancialState() {
        const dom = CalendarState.dom;
        return JSON.stringify({
            cost: dom.costInput?.value ?? '',
            clinic: dom.manualClinicFee?.value ?? '',
            session: dom.manualTherapistPay?.value ?? '',
            planning: dom.manualPlanningPay?.value ?? '',
            pTherapist: dom.planningTherapist?.value ?? ''
        });
    },

    _captureFinancialBaseline() {
        this._financialBaseline = this._snapshotFinancialState();
        this._financialFieldsDirty = false;
    },

    _checkFinancialDirty() {
        if (!this._financialBaseline) return;
        this._financialFieldsDirty = this._snapshotFinancialState() !== this._financialBaseline;
    },

    _prefillFinancialFromProfile() {
        if (this._financialIsIntentionalOverride) return;

        const dom = CalendarState.dom;
        const therapist = dom.appointmentTherapistInput?.value || 'diana';
        const therapistDefaults = AuthManager.getTherapistDefaults(therapist);
        const profile = this._modalPatientProfile;
        const cost = parseFloat(dom.costInput?.value) || parseFloat(profile?.defaultCost) || therapistDefaults.cost;
        const clinicFee = getProfileClinicFee(profile, therapistDefaults);
        const planning = parseFloat(dom.manualPlanningPay?.value) || 0;
        const session = Math.max(0, cost - clinicFee - planning);

        if (dom.manualClinicFee) dom.manualClinicFee.value = clinicFee;
        if (dom.manualTherapistPay) dom.manualTherapistPay.value = session;
    },

    _updateFinancialHint(therapist = 'diana', profile = null) {
        const dom = CalendarState.dom;
        const hint = dom.financialParlareHint;
        if (!hint) return;

        const therapistDefaults = AuthManager.getTherapistDefaults(therapist);
        const suggested = getProfileClinicFee(profile, therapistDefaults);
        const sourceLabel = profile?.clinicFee != null ? 'perfil del paciente' : 'config del terapeuta';
        hint.textContent = `Sugerido: $${suggested} (${sourceLabel} — escribe solo si es distinto en esta cita)`;
        hint.classList.remove('hidden');

        if (dom.manualClinicFee) {
            dom.manualClinicFee.placeholder = `ej. ${suggested}`;
        }
    },

    /**
     * Balancea los montos financieros para que siempre sumen el total
     */
    balanceFinancials() {
        const dom = CalendarState.dom;
        const total = parseFloat(dom.costInput.value) || 0;
        const parlareRaw = dom.manualClinicFee?.value;
        const planningRaw = dom.manualPlanningPay?.value;
        const parlare = parlareRaw === '' || parlareRaw === undefined ? null : parseFloat(parlareRaw);
        const planning = planningRaw === '' || planningRaw === undefined ? 0 : (parseFloat(planningRaw) || 0);

        if (parlare === null && !planning) {
            if (dom.manualTherapistPay) dom.manualTherapistPay.value = '';
            return;
        }

        const parlareAmount = parlare ?? 0;
        const session = total - parlareAmount - planning;
        
        if (dom.manualTherapistPay) {
            dom.manualTherapistPay.value = session >= 0 ? session : 0;
        }
        
        // Actualizar etiqueta dinámica para que diga "Planeación (SAM)" por ejemplo
        const pTherapist = dom.planningTherapist.value;
        if (dom.labelPlanning) {
            dom.labelPlanning.textContent = pTherapist ? `PLANEACIÓN (${pTherapist.toUpperCase()})` : "PLANEACIÓN";
        }
    },

    shiftDay(offset) {
        if (!this.currentGridDate) this.currentGridDate = new Date();
        const newDate = new Date(this.currentGridDate);
        newDate.setDate(newDate.getDate() + offset);

        // Skip Sundays
        if (newDate.getDay() === 0) {
            newDate.setDate(newDate.getDate() + (offset > 0 ? 1 : -1));
        }

        this.renderDailySlots(newDate);
    },

    renderDailySlots(dateInput) {
        // Normalizar fecha
        let dateObj;
        if (typeof dateInput === 'string') {
            // Si viene de input date (YYYY-MM-DD), agregar T12:00:00 para evitar offset
            if (dateInput.includes('T')) {
                dateObj = new Date(dateInput);
            } else {
                dateObj = new Date(dateInput + 'T12:00:00');
            }
        } else {
            dateObj = new Date(dateInput);
        }

        this.currentGridDate = dateObj;

        // Actualizar Nav Picker (YYYY-MM-DD)
        const dateNav = document.getElementById('dateNavPicker');
        if (dateNav) {
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            dateNav.value = `${yyyy}-${mm}-${dd}`;
        }

        const grid = document.getElementById('dailySlotsGrid');
        const hiddenInput = document.getElementById('appointmentDate');
        if (!grid || !hiddenInput) return;

        grid.innerHTML = '';

        // Obtener la hora actual seleccionada (para resaltarla)
        const currentSelectedISO = hiddenInput.value;
        const currentSelectedDate = currentSelectedISO ? new Date(currentSelectedISO) : null;

        // Obtener el terapeuta seleccionado
        const tInput = CalendarState.dom.appointmentTherapistInput;
        const selectedTherapist = tInput ? tInput.value : (AuthManager.currentUser?.therapist || 'diana');

        // Rango de horas 8 a 20
        for (let hour = 8; hour <= 20; hour++) {
            const slotDate = new Date(dateObj);
            slotDate.setHours(hour, 0, 0, 0);

            // Verificar disponibilidad con utils
            // Pasar excludeId para que la cita actual no se bloquee a sí misma
            const isFree = isSlotFree(slotDate, CalendarState.appointments, CalendarState.selectedEventId, selectedTherapist);

            // Verificar si es la hora seleccionada actualmente
            let isSelected = false;
            let currentSelectedDateArray = currentSelectedISO ? currentSelectedISO.split(',').map(d => new Date(d)) : [];
            if (currentSelectedDateArray.length > 0) {
                isSelected = currentSelectedDateArray.some(d => 
                    d.getDate() === slotDate.getDate() &&
                    d.getMonth() === slotDate.getMonth() &&
                    d.getHours() === hour
                );
            }

            const btn = document.createElement('button');
            const timeStr = formatTime12h(hour);

            if (isSelected) {
                // Estilo seleccionado (Verde o Azul fuerte)
                btn.className = "bg-blue-600 text-white font-bold py-2 rounded shadow-md ring-2 ring-blue-300 transition-all transform scale-105";
                btn.textContent = timeStr + " ✓";
                btn.onclick = (e) => {
                    e.preventDefault();
                    this.selectSlot(slotDate);
                };
            } else if (!isFree) {
                // Ocupado
                btn.className = "bg-gray-100 text-gray-400 py-2 rounded cursor-not-allowed border border-gray-100 text-xs";
                btn.textContent = timeStr;
                btn.disabled = true;
            } else {
                // Libre
                btn.className = "bg-white text-gray-700 border border-gray-200 py-2 rounded hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium text-sm";
                btn.textContent = timeStr;
                btn.onclick = (e) => {
                    e.preventDefault();
                    this.selectSlot(slotDate);
                };
            }
            grid.appendChild(btn);
        }
    },

    selectSlot(dateObj) {
        // Actualizar hidden input con formato ISO local
        const localISOTime = TimeManager.toFirestore(dateObj);


        const hiddenInput = CalendarState.dom.appointmentDateInput || document.getElementById('appointmentDate');
        const isSchoolVisit = document.querySelector('input[name="appointmentType"]:checked')?.value === 'school';
        
        if (hiddenInput) {
            let selectedDates = hiddenInput.value ? hiddenInput.value.split(',') : [];
            
            if (!isSchoolVisit) {
                // Solo una hora permitida
                selectedDates = [localISOTime];
            } else {
                if (selectedDates.includes(localISOTime)) {
                    // Deseleccionar si hacemos click de nuevo
                    selectedDates = selectedDates.filter(d => d !== localISOTime);
                    if (selectedDates.length === 0) selectedDates = [localISOTime]; // always 1
                } else {
                    if (selectedDates.length < 2) {
                        const str1 = selectedDates[0];
                        const str2 = localISOTime;
                        const dateMatch = str1.substr(0, 10) === str2.substr(0, 10);
                        const hr1 = parseInt(str1.substr(11, 2), 10);
                        const hr2 = parseInt(str2.substr(11, 2), 10);

                        // Validate same day and adjacent hour
                        if (dateMatch && Math.abs(hr1 - hr2) === 1) {
                            selectedDates.push(localISOTime);
                            selectedDates.sort(); // Order chronologically
                        } else {
                            selectedDates = [localISOTime];
                        }
                    } else {
                        selectedDates = [localISOTime];
                    }
                }
            }
            hiddenInput.value = selectedDates.join(',');
        }

        // Re-render para mostrar selección
        this.renderDailySlots(dateObj);
    },

    openWhatsAppReminder(ev, dom) {
        const patientName = dom.patientFirstNameInput.value || (ev.name ? ev.name.split(' ')[0] : '');
        const apptDateStr = dom.appointmentDateInput.value.split(',')[0];
        if (!apptDateStr) return;
        
        const apptDate = new Date(apptDateStr);
        const dateStr = apptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        const therapist = dom.appointmentTherapistInput.value || 'diana';
        const therapistName = therapist.charAt(0).toUpperCase() + therapist.slice(1);
        
        const message = encodeURIComponent(`Hola ${patientName}, te recuerdo tu cita el día ${dateStr} a las ${timeStr} con ${therapistName}. ¡Te esperamos!`);
        
        let phoneStr = '';
        if (window.PatientState && window.PatientState.patients && ev.patientId) {
            const profile = window.PatientState.patients.find(p => p.id === ev.patientId);
            if (profile && profile.phone) {
                let digits = profile.phone.replace(/\D/g, '');
                if (!digits.startsWith('52') && digits.length === 10) {
                    digits = '52' + digits;
                }
                phoneStr = digits;
            }
        }
        const url = phoneStr ? `https://wa.me/${phoneStr}?text=${message}` : `https://wa.me/?text=${message}`;
        window.open(url, '_blank');
    },

    _getLocalISOStringFormat(dateObj) {
        return TimeManager.toFirestore(dateObj);
    },

    async _processRecurrenceCreation(appointmentData, dateStrArray) {
        const dom = CalendarState.dom;
        const mainDate = dom.appointmentDateInput.value.split(',')[0];
        dom.appointmentDateInput.value = mainDate; // temporal for CalendarSuggestions
        const dates = CalendarSuggestions.generateRecurringDates();
        dom.appointmentDateInput.value = dateStrArray.join(','); // restore
        
        for (const date of dates) {
            for (let i = 0; i < dateStrArray.length; i++) {
                const offsetObj = new Date(date);
                offsetObj.setHours(offsetObj.getHours() + i);
                const iso = TimeManager.toFirestore(offsetObj);

                if (!checkSlotConflict(iso, CalendarState.appointments)) {
                    await CalendarData.createEvent({ ...appointmentData, date: iso });
                }
            }
        }
    }
};
