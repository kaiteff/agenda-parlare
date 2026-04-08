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
import { validateAppointment, checkSlotConflict, isWithinWorkingHours, isNotSunday, isSlotFree } from '../../utils/validators.js';
import { addDays, formatTime12h } from '../../utils/dateUtils.js';
import { ModalService } from '../../utils/ModalService.js';
import { GoogleAuthService } from '../../services/google/GoogleAuthService.js';


export const CalendarModal = {
    init() {
        this.bindEvents();
        this.bindGridEvents();
    },

    bindEvents() {
        const dom = CalendarState.dom;
        if (dom.saveBtn) dom.saveBtn.onclick = () => this.handleSave();
        if (dom.deleteBtn) dom.deleteBtn.onclick = () => this.handleDelete();
        if (dom.payBtn) dom.payBtn.onclick = () => this.handlePaymentToggle();
        if (dom.confirmBtn) dom.confirmBtn.onclick = () => this.handleConfirmToggle();
        if (dom.cancelBtn) dom.cancelBtn.onclick = () => this.handleCancel();
        if (dom.patientSearchInput) dom.patientSearchInput.oninput = (e) => this.populatePatientSuggestions(e.target.value);
        if (dom.isRecurringCheckbox) dom.isRecurringCheckbox.onchange = () => {
            dom.recurringSection.classList.toggle('hidden', !dom.isRecurringCheckbox.checked);
            if (dom.isRecurringCheckbox.checked) CalendarSuggestions.generateRecurringDates();
        };
        if (dom.recurringOptions) dom.recurringOptions.onchange = () => CalendarSuggestions.generateRecurringDates();
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

        dom.modalTitle.textContent = 'Nueva Cita';
        dom.patientSearchInput.value = '';
        dom.patientFirstNameInput.value = '';
        dom.patientLastNameInput.value = '';
        dom.patientFirstNameInput.disabled = false;
        dom.patientLastNameInput.disabled = false;
        dom.costInput.value = '0';

        // Reset Therapist and Type
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = AuthManager.currentUser?.therapist || 'diana';
        }
        const defaultRadio = document.querySelector('input[name="appointmentType"][value="patient"]');
        if (defaultRadio) defaultRadio.checked = true;
        // Trigger manual change to reset UI
        defaultRadio?.dispatchEvent(new Event('change'));

        // Reset buttons
        dom.saveBtn.classList.remove('hidden');
        if (dom.waBtn) dom.waBtn.classList.add('hidden');
        dom.deleteBtn.classList.add('hidden');
        dom.payBtn.classList.add('hidden');
        dom.confirmBtn.classList.add('hidden');
        if (dom.confirmedAtLabel) dom.confirmedAtLabel.classList.add('hidden');
        dom.cancelBtn.classList.add('hidden');
        dom.rescheduleSection.classList.add('hidden');

        // Recurrence reset
        dom.isRecurringCheckbox.checked = false;
        dom.recurringSection.classList.add('hidden');
        dom.recurringDatesList.innerHTML = '';

        // Set date
        const date = new Date(dateStr + 'T00:00:00');
        date.setHours(hour);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        dom.appointmentDateInput.value = localISOTime;

        CalendarUI.renderBusySlots(dateStr);
        // NEW: Render Custom Grid for Create Mode
        this.renderDailySlots(date);

        dom.eventModal.classList.remove('hidden');
        dom.patientSearchInput.focus();
    },

    openEditModal(ev) {
        const dom = CalendarState.dom;
        CalendarState.selectedEventId = ev.id;
        CalendarState.originalEventDate = ev.date;

        dom.modalTitle.textContent = 'Detalles de Cita';
        dom.patientSearchInput.value = ev.name;

        // Split name
        const nameParts = ev.name.split(' ');
        dom.patientFirstNameInput.value = nameParts[0] || '';
        dom.patientLastNameInput.value = nameParts.slice(1).join(' ') || '';
        dom.patientFirstNameInput.disabled = true;
        dom.patientLastNameInput.disabled = true;

        // Date
        const date = new Date(ev.date);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        dom.appointmentDateInput.value = localISOTime;

        dom.costInput.value = ev.cost || 0;

        // Set Therapist and Type
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = ev.therapist || 'diana';
        }
        const isSchool = ev.isSchoolVisit === true || ev.name.toLowerCase().startsWith('escuela:');
        const typeRadio = document.querySelector(`input[name="appointmentType"][value="${isSchool ? 'school' : 'patient'}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            typeRadio.dispatchEvent(new Event('change'));
        }

        // Buttons
        dom.saveBtn.classList.remove('hidden');
        dom.deleteBtn.classList.remove('hidden');
        dom.payBtn.classList.remove('hidden');
        dom.confirmBtn.classList.remove('hidden');
        dom.cancelBtn.classList.remove('hidden');

        if (dom.waBtn) {
            if (isSchool) {
                dom.waBtn.classList.add('hidden');
            } else {
                dom.waBtn.classList.remove('hidden');
                dom.waBtn.onclick = (e) => {
                    e.preventDefault();
                    const patientName = dom.patientFirstNameInput.value || ev.name.split(' ')[0];
                    const apptDateStr = dom.appointmentDateInput.value.split(',')[0];
                    if (!apptDateStr) return;
                    
                    const apptDate = new Date(apptDateStr);
                    const dateStr = apptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                    const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const therapist = dom.appointmentTherapistInput.value || 'diana';
                    const therapistName = therapist.charAt(0).toUpperCase() + therapist.slice(1);
                    
                    let message = `Hola ${patientName}, te recuerdo tu cita el día ${dateStr} a las ${timeStr} con ${therapistName}. ¡Te esperamos!`;
                    message = encodeURIComponent(message);
                    
                    let phoneStr = '';
                    if (window.PatientState && window.PatientState.patients) {
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
                };
            }
        }

        // Confirm button state
        dom.confirmBtn.innerHTML = ev.confirmed ? '❌ Quitar Confirmación' : '✓ Confirmar Asistencia';
        dom.confirmBtn.className = ev.confirmed
            ? "w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors flex items-center justify-center gap-2 mb-1 text-sm font-medium"
            : "w-full bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center justify-center gap-2 mb-1";

        if (dom.confirmedAtLabel && ev.confirmed) {
            dom.confirmedAtLabel.classList.remove('hidden');
            let ds = '';
            if (ev.confirmedAt && ev.confirmedAt.toDate) { // Firestore Date
                ds = ev.confirmedAt.toDate().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
            } else if (ev.confirmedAt) { // ISO String
                ds = new Date(ev.confirmedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
            }
            dom.confirmedAtLabel.textContent = ds ? `Confirmado el: ${ds}` : 'Confirmado';
        } else if (dom.confirmedAtLabel) {
            dom.confirmedAtLabel.classList.add('hidden');
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

        // Reschedule
        dom.rescheduleSection.classList.remove('hidden');
        // Reschedule
        dom.rescheduleSection.classList.remove('hidden');
        CalendarSuggestions.generateRescheduleOptions(date);

        // Smart Suggestion (Best Pattern)
        CalendarSuggestions.analyzeAndSuggest(ev.name);

        // Recurrence (hide for edit)
        dom.isRecurringCheckbox.checked = false;
        dom.recurringSection.classList.add('hidden');

        CalendarUI.renderBusySlots(localISOTime.split('T')[0]); // Mantiene compatibilidad si algo lo usa

        // NEW: Render Custom Daily Grid
        this.renderDailySlots(date);

        dom.eventModal.classList.remove('hidden');
    },

    closeModal() {
        CalendarState.dom.eventModal.classList.add('hidden');
        CalendarState.selectedEventId = null;
    },

    populatePatientSuggestions(query) {
        const { patientSuggestions, patientFirstNameInput, patientLastNameInput, appointmentTherapistInput } = CalendarState.dom;
        if (!patientSuggestions) return;

        patientSuggestions.innerHTML = '';
        if (query.length < 2) {
            patientSuggestions.classList.add('hidden');
            return;
        }

        const matches = PatientState.patients.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) && p.isActive !== false
        );

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

                    // Set Cost
                    if (CalendarState.dom.costInput) {
                        CalendarState.dom.costInput.value = p.defaultCost || 0;
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

        // Ensure Google Token (Popup)
        try {
            await GoogleAuthService.ensureToken(false);
        } catch (authErr) {
            console.warn("Google Auth pre-check failed:", authErr);
        }

        const dom = CalendarState.dom;
        const name = dom.patientSearchInput.value.trim();
        const dateStr = dom.appointmentDateInput.value;
        const cost = parseFloat(dom.costInput.value) || 0;
        console.log("   - Datos:", { name, dateStr, cost });
        const therapist = dom.appointmentTherapistInput ? dom.appointmentTherapistInput.value : (AuthManager.currentUser?.therapist || 'diana');

        if (!name || !dateStr) {
            await ModalService.alert("Campos Incompletos", "Por favor completa nombre y fecha", "warning");
            return;
        }

        if (cost <= 0) {
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
            const isSchoolVisit = document.querySelector('input[name="appointmentType"]:checked')?.value === 'school';
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
                isSchoolVisit: isSchoolVisit
            };

            if (isSchoolVisit) {
                // No interactuar con pacientes, solo guardar el evento
                appointmentData.name = name.startsWith('Escuela:') ? name : `Escuela: ${name}`;
                appointmentData.patientId = null;
            } else {
                // Flujo normal de paciente
                const profile = await ensurePatientProfile(
                    name,
                    dom.patientFirstNameInput.value,
                    dom.patientLastNameInput.value,
                    PatientState.patients
                );
                appointmentData.name = profile.name;
                appointmentData.patientId = profile.id;
            }

            if (CalendarState.selectedEventId) {
                // Update el primero
                await CalendarData.updateEvent(CalendarState.selectedEventId, { ...appointmentData, date: dateStrArray[0] });
                
                // Si seleccionó una segunda hora durante la edición, la creamos
                if (dateStrArray.length > 1) {
                    await CalendarData.createEvent({ ...appointmentData, date: dateStrArray[1] });
                }
            } else {
                // Create
                if (dom.isRecurringCheckbox.checked) {
                    // Validar que solo funcione bien si es 1 hora seleccionada por ahora, o crear ambas recurrentes
                    // Para simplicidad, pasamos la primera para recurringDates, y si hay segunda le sumamos 1 hora
                    const mainDate = document.getElementById('appointmentDate').value.split(',')[0];
                    document.getElementById('appointmentDate').value = mainDate; // temporal
                    const dates = CalendarSuggestions.generateRecurringDates();
                    document.getElementById('appointmentDate').value = dateStrArray.join(','); // restaurar
                    
                    for (const date of dates) {
                        for (let i=0; i < dateStrArray.length; i++) {
                            const offsetObj = new Date(date);
                            offsetObj.setHours(offsetObj.getHours() + i); // Añadir 1 hr a la segunda
                            const offset = offsetObj.getTimezoneOffset() * 60000;
                            const iso = (new Date(offsetObj - offset)).toISOString().slice(0, 16);
                            if (!checkSlotConflict(iso, CalendarState.appointments)) {
                                await CalendarData.createEvent({ ...appointmentData, date: iso });
                            }
                        }
                    }
                } else {
                    for (const dateStr of dateStrArray) {
                        await CalendarData.createEvent({ ...appointmentData, date: dateStr });
                    }
                }
            }
            this.closeModal();
            console.log("✅ Cita guardada y modal cerrado");
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

        if (!await ModalService.confirm("Cancelar Cita", "¿Estás seguro de que deseas cancelar esta cita?", "Sí, Cancelar", "No")) return;

        const eventId = CalendarState.selectedEventId;
        // Logic moved to CalendarData
        await CalendarData.cancelEvent(eventId);

        const reschedule = await ModalService.confirm(
            "Reagendar",
            "Cita cancelada.<br>¿Deseas agendar una nueva cita para este paciente ahora?",
            "Sí, Reagendar",
            "No, cerrar"
        );

        if (reschedule) {
            // Switch to create mode with same patient
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
                const offset = nextWeek.getTimezoneOffset() * 60000;
                const iso = (new Date(nextWeek - offset)).toISOString().slice(0, 16);

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
                };
            }
        }, 500); // Pequeño delay para asegurar DOM
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
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);

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
    }
};
