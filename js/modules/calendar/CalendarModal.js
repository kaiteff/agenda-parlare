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

        // Reset/Default Therapist
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = AuthManager.currentUser?.therapist || 'diana';
        }

        // Reset buttons
        dom.saveBtn.classList.remove('hidden');
        dom.deleteBtn.classList.add('hidden');
        dom.payBtn.classList.add('hidden');
        dom.confirmBtn.classList.add('hidden');
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

        // Set Therapist
        if (dom.appointmentTherapistInput) {
            dom.appointmentTherapistInput.value = ev.therapist || 'diana';
        }

        // Buttons
        dom.saveBtn.classList.remove('hidden');
        dom.deleteBtn.classList.remove('hidden');
        dom.payBtn.classList.remove('hidden');
        dom.confirmBtn.classList.remove('hidden');
        dom.cancelBtn.classList.remove('hidden');

        // Confirm button state
        dom.confirmBtn.innerHTML = ev.confirmed ? '❌ Quitar Confirmación' : '✓ Confirmar Asistencia';
        dom.confirmBtn.className = ev.confirmed
            ? "col-span-2 bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors flex items-center justify-center gap-2 mb-1 text-sm font-medium"
            : "col-span-2 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center justify-center gap-2 mb-1";

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

        const dateObj = new Date(dateStr);

        if (!isWithinWorkingHours(dateObj)) {
            await ModalService.alert("Horario Inválido", "La cita debe estar entre las 8:00 y las 20:00", "warning");
            return;
        }

        if (!isNotSunday(dateObj)) {
            await ModalService.alert("Día Inválido", "No se pueden agendar citas los domingos", "warning");
            return;
        }

        try {
            // Ensure profile
            const profile = await ensurePatientProfile(
                name,
                dom.patientFirstNameInput.value,
                dom.patientLastNameInput.value,
                PatientState.patients
            );

            // Should also update profile therapist if needed? 
            // For now, we prefer the explicit selection for the appointment.
            // But if it's a new patient, we might want to save the therapist preference? 
            // ensurePatientProfile doesn't seem to take therapist as arg easily without modifying it.
            // Let's stick to appointment-level assignment for now.

            const appointmentData = {
                name: profile.name,
                patientId: profile.id,
                date: dateStr,
                cost: cost,
                therapist: therapist
            };

            if (CalendarState.selectedEventId) {
                // Update
                await CalendarData.updateEvent(CalendarState.selectedEventId, appointmentData);
            } else {
                // Create
                if (dom.isRecurringCheckbox.checked) {
                    const dates = CalendarSuggestions.generateRecurringDates();
                    // Create multiple
                    for (const date of dates) {
                        const offset = date.getTimezoneOffset() * 60000;
                        const iso = (new Date(date - offset)).toISOString().slice(0, 16);
                        if (!checkSlotConflict(iso, CalendarState.appointments)) {
                            await CalendarData.createEvent({ ...appointmentData, date: iso });
                        }
                    }
                } else {
                    console.log("   - Creando cita única...");
                    if (checkSlotConflict(dateStr, CalendarState.appointments)) {
                        console.log("   - Conflicto detectado");
                        if (!await ModalService.confirm("Conflicto de Horario", "Ya hay una cita en este horario.<br>¿Deseas agregarla de todas formas?", "Agregar igualmente", "Cancelar")) return;
                    }
                    const result = await CalendarData.createEvent(appointmentData);
                    console.log("   - Resultado createEvent:", result);
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
            if (currentSelectedDate) {
                isSelected = currentSelectedDate.getDate() === slotDate.getDate() &&
                    currentSelectedDate.getMonth() === slotDate.getMonth() &&
                    currentSelectedDate.getHours() === hour;
            }

            const btn = document.createElement('button');
            const timeStr = formatTime12h(hour);

            if (isSelected) {
                // Estilo seleccionado (Verde o Azul fuerte)
                btn.className = "bg-blue-600 text-white font-bold py-2 rounded shadow-md ring-2 ring-blue-300 transition-all transform scale-105";
                btn.textContent = timeStr + " ✓";
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
        if (hiddenInput) {
            hiddenInput.value = localISOTime;
            // Disparar evento change si es necesario
            // hiddenInput.dispatchEvent(new Event('change'));
        }

        // Re-render para mostrar selección
        this.renderDailySlots(dateObj);
    }
};
