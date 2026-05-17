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




export const CalendarModal = {
    originalTherapistOnOpen: null,
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

            // CARGAR DESGLOSE FINANCIERO SI EXISTE
            if (dom.financialBreakdownSection) {
                if (ev.manualClinicFee || ev.manualTherapistPay || ev.manualPlanningPay) {
                    dom.financialBreakdownSection.classList.remove('hidden');
                    dom.manualClinicFee.value = ev.manualClinicFee || '';
                    dom.manualTherapistPay.value = ev.manualTherapistPay || '';
                    dom.manualPlanningPay.value = ev.manualPlanningPay || '';
                    dom.planningTherapist.value = ev.planningTherapist || '';
                } else {
                    dom.financialBreakdownSection.classList.add('hidden');
                    dom.manualClinicFee.value = '';
                    dom.manualTherapistPay.value = '';
                    dom.manualPlanningPay.value = '';
                    dom.planningTherapist.value = '';
                }
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

                    // Auto-select therapist
                    if (appointmentTherapistInput) {
                        appointmentTherapistInput.value = p.therapist || 'diana';
                    }

                    if (CalendarState.dom.costInput) {
                        CalendarState.dom.costInput.value = p.defaultCost || 800;
                    }

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
                isSchoolVisit: isSchoolVisit || isBlock,
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
                appointmentData.clinicFee = profile.clinicFee || therapistDefaults.clinicFee;

                // AGREGAR DATOS FINANCIEROS MANUALES SI EXISTEN
                if (dom.manualClinicFee && dom.manualClinicFee.value) appointmentData.manualClinicFee = parseFloat(dom.manualClinicFee.value);
                if (dom.manualTherapistPay && dom.manualTherapistPay.value) appointmentData.manualTherapistPay = parseFloat(dom.manualTherapistPay.value);
                if (dom.manualPlanningPay && dom.manualPlanningPay.value) appointmentData.manualPlanningPay = parseFloat(dom.manualPlanningPay.value);
                if (dom.planningTherapist && dom.planningTherapist.value) appointmentData.planningTherapist = dom.planningTherapist.value;
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
            CalendarState.rescheduledFromId = null;
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
        const evt = CalendarState.appointments.find(a => a.id === CalendarState.selectedEventId);
        if (evt) {
            await CalendarData.togglePayment(CalendarState.selectedEventId, evt.isPaid);
            this.closeModal();
        }
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

        // ⚠️ CRÍTICO: capturar eventId ANTES de cualquier await.
        // Si durante el confirm dialog algo llama closeModal() (botón X, backdrop),
        // selectedEventId se pone null — y sin esta captura anticipada el cancel falla.
        const eventId = CalendarState.selectedEventId;

        if (!await ModalService.confirm("Cancelar Cita", "¿Estás seguro de que deseas cancelar esta cita?", "Sí, Cancelar", "No")) return;
        
        // 1. Ejecutar cancelación en base de datos
        const userEmail = AuthManager.currentUser?.email || 'Manual';
        await CalendarData.cancelEvent(eventId, userEmail);

        // 2. Preguntar si quiere avisar por WhatsApp
        const sendWA = await ModalService.confirm(
            "Aviso por WhatsApp",
            "¿Deseas enviar un mensaje automático de cancelación al responsable?",
            "Enviar WhatsApp",
            "No, solo cancelar"
        );

        if (sendWA) {
            const appointment = CalendarState.appointments.find(a => a.id === eventId);
            if (appointment) WhatsAppMessaging.sendMessage(appointment, 'cancel');
        }

        const reschedule = await ModalService.confirm(
            "Reagendar",
            "Cita cancelada.<br>¿Deseas agendar una nueva cita para este paciente ahora?",
            "Sí, Reagendar",
            "No, cerrar"
        );

        if (reschedule) {
            // Switch to create mode with same patient
            CalendarState.rescheduledFromId = eventId;
            CalendarState.selectedEventId = null;
            const dom = CalendarState.dom;

            dom.modalTitle.textContent = 'Nueva Cita';
            dom.saveBtn.classList.remove('hidden');
            dom.deleteBtn.classList.add('hidden');
            dom.payBtn.classList.add('hidden');
            dom.confirmBtn.classList.add('hidden');
            dom.cancelBtn.classList.add('hidden');

            // Suggest next week same time
            if (dom.appointmentDateInput.value) {
                const current = new Date(dom.appointmentDateInput.value);
                const nextWeek = new Date(current);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const iso = this._getLocalISOStringFormat(nextWeek);

                dom.appointmentDateInput.value = iso;

                // Update Grid UI
                this.renderDailySlots(nextWeek);
            }
        } else {
            this.closeModal();
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
                    
                    // Si cambia el terapeuta, mostrar el desglose para ajuste manual
                    if (dom.financialBreakdownSection) {
                        dom.financialBreakdownSection.classList.remove('hidden');
                        
                        // AUTO-SELECCIONAR PLANEADOR (La original)
                        if (dom.planningTherapist && !dom.planningTherapist.value) {
                            dom.planningTherapist.value = this.originalTherapistOnOpen;
                        }

                        // Sugerir valores basados en el costo actual
                        const cost = parseFloat(dom.costInput.value) || 0;
                        const t = dom.appointmentTherapistInput.value;
                        const defaults = AuthManager.getTherapistDefaults(t);
                        
                        if (dom.manualClinicFee) dom.manualClinicFee.value = defaults.clinicFee;
                        this.balanceFinancials();
                    }
                };
            }

            if (dom.toggleFinancialBtn) {
                dom.toggleFinancialBtn.onclick = (e) => {
                    e.preventDefault();
                    if (dom.financialBreakdownSection) {
                        dom.financialBreakdownSection.classList.toggle('hidden');
                        
                        // Si se abre y está vacío, sugerir valores
                        if (!dom.financialBreakdownSection.classList.contains('hidden') && !dom.manualClinicFee.value) {
                            const cost = parseFloat(dom.costInput.value) || 0;
                            const t = dom.appointmentTherapistInput.value;
                            const defaults = AuthManager.getTherapistDefaults(t);
                            if (dom.manualClinicFee) dom.manualClinicFee.value = defaults.clinicFee;
                            if (dom.manualTherapistPay) dom.manualTherapistPay.value = cost - defaults.clinicFee;
                        }
                    }
                };
            }

            // LISTENERS PARA BALANCEO FINANCIERO EN TIEMPO REAL
            [dom.costInput, dom.manualClinicFee, dom.manualPlanningPay, dom.planningTherapist].forEach(el => {
                if (el) {
                    el.addEventListener('input', () => this.balanceFinancials());
                    el.addEventListener('change', () => this.balanceFinancials());
                }
            });
        }, 500); // Pequeño delay para asegurar DOM
    },

    /**
     * Balancea los montos financieros para que siempre sumen el total
     */
    balanceFinancials() {
        const dom = CalendarState.dom;
        const total = parseFloat(dom.costInput.value) || 0;
        const parlrare = parseFloat(dom.manualClinicFee.value) || 0;
        const planning = parseFloat(dom.manualPlanningPay.value) || 0;
        
        // Sesión = Total - Parláre - Planeación
        const session = total - parlrare - planning;
        
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
