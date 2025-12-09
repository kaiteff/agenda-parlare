/**
 * CalendarModal.js
 * Maneja la lógica de los modales de creación y edición de citas
 */

import { CalendarState } from './CalendarState.js';
import { CalendarData } from './CalendarData.js';
import { CalendarUI } from './CalendarUI.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { PatientState } from '../../managers/patient/PatientState.js';
import { ensurePatientProfile } from '../../services/patientService.js';
import { validateAppointment, checkSlotConflict, isWithinWorkingHours, isNotSunday } from '../../utils/validators.js';
import { addDays, formatTime12h, formatDateLocal } from '../../utils/dateUtils.js';

export const CalendarModal = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const dom = CalendarState.dom;
        if (dom.saveBtn) dom.saveBtn.onclick = () => this.handleSave();
        if (dom.deleteBtn) dom.deleteBtn.onclick = () => this.handleDelete();
        if (dom.payBtn) dom.payBtn.onclick = () => this.handlePaymentToggle();
        if (dom.cancelBtn) dom.cancelBtn.onclick = () => this.handleCancel();
        if (dom.patientSearchInput) dom.patientSearchInput.oninput = (e) => this.populatePatientSuggestions(e.target.value);
        if (dom.isRecurringCheckbox) dom.isRecurringCheckbox.onchange = () => {
            dom.recurringSection.classList.toggle('hidden', !dom.isRecurringCheckbox.checked);
            if (dom.isRecurringCheckbox.checked) this.generateRecurringDates();
        };
        if (dom.recurringOptions) dom.recurringOptions.onchange = () => this.generateRecurringDates();
        if (dom.appointmentDateInput) dom.appointmentDateInput.onchange = (e) => {
            if (dom.isRecurringCheckbox.checked) this.generateRecurringDates();
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

        // Reset buttons
        dom.saveBtn.classList.remove('hidden');
        dom.deleteBtn.classList.add('hidden');
        dom.payBtn.classList.add('hidden');
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

        // Buttons
        dom.saveBtn.classList.remove('hidden');
        dom.deleteBtn.classList.remove('hidden');
        dom.payBtn.classList.remove('hidden');
        dom.cancelBtn.classList.remove('hidden');

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
        this.generateRescheduleOptions(date);

        // Recurrence (hide for edit)
        dom.isRecurringCheckbox.checked = false;
        dom.recurringSection.classList.add('hidden');

        CalendarUI.renderBusySlots(localISOTime.split('T')[0]);
        dom.eventModal.classList.remove('hidden');
    },

    closeModal() {
        CalendarState.dom.eventModal.classList.add('hidden');
        CalendarState.selectedEventId = null;
    },

    populatePatientSuggestions(query) {
        const { patientSuggestions, patientFirstNameInput, patientLastNameInput } = CalendarState.dom;
        if (!patientSuggestions) return;

        // Debug
        // console.log(`🔍 Buscando "${query}" en ${PatientState.patients.length} pacientes`);

        patientSuggestions.innerHTML = '';
        if (query.length < 2) {
            patientSuggestions.classList.add('hidden');
            return;
        }

        const matches = PatientState.patients.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) && p.isActive
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
                    patientSuggestions.classList.add('hidden');
                    this.analyzeAndSuggest(p.name);
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

    analyzeAndSuggest(patientName) {
        const suggestionBox = document.getElementById('schedulingSuggestion');
        if (suggestionBox) suggestionBox.remove();
        if (!patientName) return;

        const history = CalendarState.appointments.filter(p => p.name === patientName && !p.isCancelled);
        if (history.length < 1) return;

        const hasFuture = history.some(p => new Date(p.date) > new Date());
        if (hasFuture) return;

        // Find pattern
        const patterns = {};
        history.forEach(apt => {
            const d = new Date(apt.date);
            const key = `${d.getDay()}-${d.getHours()}`;
            patterns[key] = (patterns[key] || 0) + 1;
        });

        let bestPattern = null;
        let maxCount = 0;
        for (const [key, count] of Object.entries(patterns)) {
            if (count > maxCount) {
                maxCount = count;
                bestPattern = key;
            }
        }

        if (bestPattern) {
            const [dayOfWeek, hour] = bestPattern.split('-').map(Number);
            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const today = new Date();
            let nextDate = new Date();
            nextDate.setHours(hour, 0, 0, 0);
            let daysToAdd = (dayOfWeek + 7 - today.getDay()) % 7;
            if (daysToAdd === 0 && nextDate < today) daysToAdd = 7;
            nextDate.setDate(today.getDate() + daysToAdd);

            if (checkSlotConflict(nextDate.toISOString(), CalendarState.appointments)) {
                nextDate.setDate(nextDate.getDate() + 7);
            }

            const timeStr = formatTime12h(hour);
            const container = CalendarState.dom.patientSearchInput.parentNode;
            const div = document.createElement('div');
            div.id = 'schedulingSuggestion';
            div.className = "mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-fade-in";
            div.innerHTML = `
                <div class="text-xs text-indigo-800">
                    <span class="font-bold">💡 Sugerencia:</span> Suele venir los <span class="font-semibold">${days[dayOfWeek]} a las ${timeStr}</span>.
                </div>
                <button type="button" class="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors shadow-sm">
                    Usar y Repetir
                </button>
            `;

            div.querySelector('button').onclick = () => {
                const offset = nextDate.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(nextDate - offset)).toISOString().slice(0, 16);
                CalendarState.dom.appointmentDateInput.value = localISOTime;
                if (CalendarState.dom.isRecurringCheckbox) {
                    CalendarState.dom.isRecurringCheckbox.checked = true;
                    CalendarState.dom.recurringSection.classList.remove('hidden');
                    this.generateRecurringDates();
                }
                CalendarUI.renderBusySlots(localISOTime.split('T')[0]);
                div.remove();
            };
            container.appendChild(div);
        }
    },

    generateRecurringDates() {
        const { appointmentDateInput, recurringOptions, recurringDatesList } = CalendarState.dom;
        if (!appointmentDateInput.value) return;

        const baseDate = new Date(appointmentDateInput.value);
        const frequency = recurringOptions.value; // 'weekly' or 'biweekly'
        const count = 4;
        const dates = [];

        recurringDatesList.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const d = new Date(baseDate);
            const daysToAdd = i * (frequency === 'weekly' ? 7 : 14);
            d.setDate(d.getDate() + daysToAdd);
            dates.push(d);

            const li = document.createElement('li');
            const isConflict = checkSlotConflict(d.toISOString(), CalendarState.appointments);
            li.className = `text-xs flex justify-between items-center p-1 rounded ${isConflict ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`;
            li.innerHTML = `
                <span>${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                ${isConflict ? '<span class="font-bold text-red-600">Ocupado</span>' : '<span class="text-green-600">Disponible</span>'}
            `;
            recurringDatesList.appendChild(li);
        }
        return dates;
    },

    generateRescheduleOptions(currentDate) {
        const { rescheduleOptions } = CalendarState.dom;
        rescheduleOptions.innerHTML = '';

        // 1. Opciones "Hoy y esta Semana" (Slots disponibles próximos)
        this.addAvailableSlotsSuggestions(rescheduleOptions);

        // 2. Opciones "Prox Semana y 2 Semanas" (Smart Check)
        const nextWeek = addDays(currentDate, 7);
        const next2Weeks = addDays(currentDate, 14);

        if (!checkSlotConflict(nextWeek.toISOString(), CalendarState.appointments)) {
            rescheduleOptions.appendChild(this.createRescheduleChip('Misma hora prox. semana', nextWeek));
        }

        if (!checkSlotConflict(next2Weeks.toISOString(), CalendarState.appointments)) {
            rescheduleOptions.appendChild(this.createRescheduleChip('En 2 semanas', next2Weeks));
        }
    },

    addAvailableSlotsSuggestions(container) {
        // Busca 2 slots libres HOY y 2 slots libres MAÑANA dentro del horario laboral
        const now = new Date();
        const candidates = [];

        // Función helper para buscar huecos
        const findSlots = (baseDate, labelPrefix) => {
            const startHour = 9;
            const endHour = 19;
            const currentHour = baseDate.getDate() === now.getDate() ? Math.max(startHour, now.getHours() + 1) : startHour;

            for (let h = currentHour; h <= endHour; h++) {
                if (candidates.length >= 4) break; // Limite de sugerencias totales

                const d = new Date(baseDate);
                d.setHours(h, 0, 0, 0);

                // Ignorar pasado
                if (d <= now) continue;

                // Verificar conflicto (usando ISOString local manual para asegurar fecha correcta)
                const offset = d.getTimezoneOffset() * 60000;
                const iso = (new Date(d - offset)).toISOString();

                if (!checkSlotConflict(iso, CalendarState.appointments)) {
                    candidates.push({ date: d, label: `${labelPrefix} ${formatTime12h(h)}` });
                }
            }
        };

        // Buscar Hoy
        findSlots(now, 'Hoy');

        // Buscar Mañana (si hoy hay pocos)
        if (candidates.length < 3) {
            const tomorrow = addDays(now, 1);
            if (isNotSunday(tomorrow)) {
                findSlots(tomorrow, 'Mañana');
            } else {
                // Si mañana es domingo, buscar lunes
                const monday = addDays(now, 2);
                findSlots(monday, 'Lunes');
            }
        }

        // Renderizar sugerencias verdes
        candidates.slice(0, 3).forEach(cand => {
            const chip = this.createRescheduleChip(cand.label, cand.date, 'green');
            container.appendChild(chip);
        });
    },

    createRescheduleChip(label, dateObj, color = 'blue') {
        const chip = document.createElement('div');
        const bgClass = color === 'green' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';

        chip.className = `${bgClass} px-3 py-1 rounded-full text-xs cursor-pointer border transition-colors whitespace-nowrap`;
        chip.textContent = label;
        chip.onclick = () => {
            const offset = dateObj.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
            CalendarState.dom.appointmentDateInput.value = localISOTime;
            CalendarUI.renderBusySlots(localISOTime.split('T')[0]);
        };
        return chip;
    },

    async handleSave() {
        const dom = CalendarState.dom;
        const name = dom.patientSearchInput.value.trim();
        const dateStr = dom.appointmentDateInput.value;
        const cost = parseFloat(dom.costInput.value) || 0;

        if (!name || !dateStr) {
            alert("Por favor completa nombre y fecha");
            return;
        }

        const dateObj = new Date(dateStr);

        if (!isWithinWorkingHours(dateObj)) {
            alert("La cita debe estar entre las 9:00 y las 20:00");
            return;
        }

        if (!isNotSunday(dateObj)) {
            alert("No se pueden agendar citas los domingos");
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

            const appointmentData = {
                name: profile.name,
                patientId: profile.id,
                date: dateStr,
                cost: cost,
                therapist: profile.therapist || AuthManager.currentUser?.therapist || 'diana'
            };

            if (CalendarState.selectedEventId) {
                // Update
                await CalendarData.updateEvent(CalendarState.selectedEventId, appointmentData);
            } else {
                // Create
                if (dom.isRecurringCheckbox.checked) {
                    const dates = this.generateRecurringDates();
                    // Create multiple
                    for (const date of dates) {
                        const offset = date.getTimezoneOffset() * 60000;
                        const iso = (new Date(date - offset)).toISOString().slice(0, 16);
                        if (!checkSlotConflict(iso, CalendarState.appointments)) {
                            await CalendarData.createEvent({ ...appointmentData, date: iso });
                        }
                    }
                } else {
                    if (checkSlotConflict(dateStr, CalendarState.appointments)) {
                        if (!confirm("Ya hay una cita en este horario. ¿Deseas agregarla de todas formas?")) return;
                    }
                    await CalendarData.createEvent(appointmentData);
                }
            }
            this.closeModal();
        } catch (e) {
            console.error(e);
            alert("Error al guardar: " + e.message);
        }
    },

    async handleDelete() {
        if (!CalendarState.selectedEventId) return;
        if (confirm("¿Eliminar esta cita?")) {
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

    async handleCancel() {
        if (!CalendarState.selectedEventId) return;

        if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) return;

        await CalendarData.cancelEvent(CalendarState.selectedEventId);

        if (confirm("Cita cancelada. ¿Deseas agendar una nueva cita para este paciente ahora?")) {
            // Switch to create mode with same patient
            CalendarState.selectedEventId = null;
            const dom = CalendarState.dom;

            dom.modalTitle.textContent = 'Nueva Cita';
            dom.saveBtn.classList.remove('hidden');
            dom.deleteBtn.classList.add('hidden');
            dom.payBtn.classList.add('hidden');
            dom.cancelBtn.classList.add('hidden');

            // Suggest next week same time
            if (dom.appointmentDateInput.value) {
                const current = new Date(dom.appointmentDateInput.value);
                const nextWeek = new Date(current);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const offset = nextWeek.getTimezoneOffset() * 60000;
                const iso = (new Date(nextWeek - offset)).toISOString().slice(0, 16);
                dom.appointmentDateInput.value = iso;
            }
        } else {
            this.closeModal();
        }
    }
};
