/**
 * ScheduleManager.js
 * Maneja la lógica del modal de "Agendar Primera Cita"
 * 
 * Responsabilidades:
 * - Mostrar horarios disponibles por día
 * - Manejar la selección de slots
 * - Gestionar la recurrencia (semanal/quincenal)
 * - Crear las citas correspondientes
 */

import { PatientState } from './patient/PatientState.js';
import { AuthManager } from './AuthManager.js';
import { isSlotFree } from '../utils/validators.js';
import { createAppointment } from '../services/appointmentService.js';
import { getStartOfWeek, addDays, formatDateLocal } from '../utils/dateUtils.js';

export const ScheduleManager = {
    // Estado interno
    state: {
        patientId: null,
        patientName: null,
        therapist: null,
        currentWeekStart: null,
        selectedSlot: null,
        recurrenceType: 'none', // 'none', 'weekly', 'biweekly'
        sessionsCount: 4
    },

    // Referencias DOM
    dom: {
        modal: document.getElementById('scheduleNewPatientModal'),
        patientName: document.getElementById('schedulePatientName'),
        weekLabel: document.getElementById('currentScheduleWeekLabel'),
        slotsGrid: document.getElementById('slotsGrid'),
        prevBtn: document.getElementById('prevWeekScheduleBtn'),
        nextBtn: document.getElementById('nextWeekScheduleBtn'),
        confirmBtn: document.getElementById('confirmScheduleBtn'),
        costDisplay: document.getElementById('scheduleCostDisplay'),
        recurrenceInputs: document.getElementsByName('recurrenceType'),
        sessionsCountContainer: document.getElementById('sessionsCountContainer'),
        sessionsCountInput: document.getElementById('sessionsCount')
    },

    /**
     * Inicializa el manager
     */
    init() {
        this._setupListeners();
        // Exponer globalmente para onclicks en HTML
        window.ScheduleManager = this;
    },

    /**
     * Configura los event listeners
     */
    _setupListeners() {
        if (this.dom.prevBtn) {
            this.dom.prevBtn.onclick = () => this._changeWeek(-1);
        }
        if (this.dom.nextBtn) {
            this.dom.nextBtn.onclick = () => this._changeWeek(1);
        }
        if (this.dom.confirmBtn) {
            this.dom.confirmBtn.onclick = () => this._confirmSchedule();
        }

        // Listeners para recurrencia
        if (this.dom.recurrenceInputs) {
            Array.from(this.dom.recurrenceInputs).forEach(input => {
                input.addEventListener('change', (e) => {
                    this.state.recurrenceType = e.target.value;
                    this._updateRecurrenceUI();
                });
            });
        }

        if (this.dom.sessionsCountInput) {
            this.dom.sessionsCountInput.addEventListener('change', (e) => {
                this.state.sessionsCount = parseInt(e.target.value) || 4;
            });
        }
    },

    /**
     * Abre el modal para un paciente específico
     * @param {string} patientId - ID del paciente
     * @param {string} patientName - Nombre del paciente
     * @param {string} therapist - Terapeuta asignado
     */
    openModal(patientId, patientName, therapist) {
        this.state.patientId = patientId;
        this.state.patientName = patientName;
        this.state.therapist = therapist || 'diana';
        this.state.currentWeekStart = getStartOfWeek(new Date());
        this.state.selectedSlot = null;
        this.state.recurrenceType = 'none';

        // Reset UI
        if (this.dom.patientName) this.dom.patientName.textContent = `Paciente: ${patientName}`;
        if (this.dom.confirmBtn) this.dom.confirmBtn.disabled = true;

        // Reset radio buttons
        if (this.dom.recurrenceInputs) {
            Array.from(this.dom.recurrenceInputs).forEach(input => {
                if (input.value === 'none') input.checked = true;
            });
        }
        this._updateRecurrenceUI();

        // Mostrar modal
        if (this.dom.modal) {
            this.dom.modal.classList.remove('hidden');
            this._renderSlots();
        }
    },

    /**
     * Cierra el modal
     */
    closeModal() {
        if (this.dom.modal) {
            this.dom.modal.classList.add('hidden');
        }
    },

    /**
     * Cambia la semana visualizada
     * @param {number} offset - Semanas a mover (+1 o -1)
     */
    _changeWeek(offset) {
        const newDate = new Date(this.state.currentWeekStart);
        newDate.setDate(newDate.getDate() + (offset * 7));

        // No permitir ir al pasado (semana anterior a la actual)
        const today = new Date();
        const startOfCurrentWeek = getStartOfWeek(today);

        if (newDate < startOfCurrentWeek) return;

        this.state.currentWeekStart = newDate;
        this._renderSlots();
    },

    /**
     * Actualiza la UI de recurrencia
     */
    _updateRecurrenceUI() {
        const isRecurrent = this.state.recurrenceType !== 'none';
        if (this.dom.sessionsCountContainer) {
            if (isRecurrent) {
                this.dom.sessionsCountContainer.classList.remove('hidden');
            } else {
                this.dom.sessionsCountContainer.classList.add('hidden');
            }
        }
    },

    /**
     * Renderiza los slots disponibles
     */
    _renderSlots() {
        if (!this.dom.slotsGrid || !this.dom.weekLabel) return;

        const startOfWeek = this.state.currentWeekStart;
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        // Actualizar label de semana
        const startStr = startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const endStr = endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        this.dom.weekLabel.textContent = `${startStr} - ${endStr}`;

        // Limpiar grid
        this.dom.slotsGrid.innerHTML = '';

        // Generar columnas por día (Lunes a Sábado)
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        for (let i = 0; i < 6; i++) {
            const currentDayDate = new Date(startOfWeek);
            currentDayDate.setDate(currentDayDate.getDate() + i);

            const dayColumn = document.createElement('div');
            dayColumn.className = 'flex flex-col gap-2';

            // Header del día
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center p-2 bg-gray-50 rounded-lg border border-gray-100 mb-2';
            dayHeader.innerHTML = `
                <div class="font-bold text-gray-700">${days[i]}</div>
                <div class="text-xs text-gray-500">${currentDayDate.getDate()}</div>
            `;
            dayColumn.appendChild(dayHeader);

            // Slots
            const slots = this._getDailySlots(currentDayDate);

            if (slots.length === 0) {
                const noSlots = document.createElement('div');
                noSlots.className = 'text-xs text-gray-400 text-center py-4 italic';
                noSlots.textContent = 'Sin disponibilidad';
                dayColumn.appendChild(noSlots);
            } else {
                slots.forEach(slot => {
                    const slotBtn = document.createElement('button');
                    const isSelected = this.state.selectedSlot &&
                        this.state.selectedSlot.getTime() === slot.date.getTime();

                    if (!slot.isFree) {
                        // Estilo para slot ocupado
                        slotBtn.className = `
                            w-full py-2 px-1 rounded text-sm font-medium
                            bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed
                        `;
                        slotBtn.textContent = slot.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        slotBtn.disabled = true;
                        slotBtn.title = "Horario ocupado";
                    } else {
                        // Estilo para slot libre
                        slotBtn.className = `
                            w-full py-2 px-1 rounded text-sm font-medium transition-all
                            ${isSelected
                                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'}
                        `;
                        slotBtn.textContent = slot.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        slotBtn.onclick = () => this._selectSlot(slot.date);
                    }

                    dayColumn.appendChild(slotBtn);
                });
            }

            this.dom.slotsGrid.appendChild(dayColumn);
        }
    },

    /**
     * Obtiene slots para un día específico con su estado
     * @param {Date} date - Fecha a consultar
     * @returns {Array<{date: Date, isFree: boolean}>} Lista de slots con estado
     */
    _getDailySlots(date) {
        const slots = [];
        const startHour = 9; // 9:00 AM
        const endHour = 20;  // 8:00 PM
        const now = new Date();

        // Si es hoy, no mostrar horas pasadas
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const currentHour = now.getHours();

        for (let hour = startHour; hour < endHour; hour++) {
            // Si es hoy y la hora ya pasó, saltar
            if (isToday && hour <= currentHour) continue;

            const slotDate = new Date(date);
            slotDate.setHours(hour, 0, 0, 0);

            // Verificar disponibilidad
            const appointments = PatientState.appointments || [];
            const isFree = isSlotFree(slotDate, appointments, null, this.state.therapist);

            slots.push({
                date: slotDate,
                isFree: isFree
            });
        }

        return slots;
    },

    /**
     * Maneja la selección de un slot
     * @param {Date} slotDate - Fecha seleccionada
     */
    _selectSlot(slotDate) {
        this.state.selectedSlot = slotDate;
        this._renderSlots(); // Re-render para actualizar estilos

        if (this.dom.confirmBtn) {
            this.dom.confirmBtn.disabled = false;
            this.dom.confirmBtn.textContent = `Agendar ${slotDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} ${slotDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        }
    },

    /**
     * Confirma y crea las citas
     */
    async _confirmSchedule() {
        if (!this.state.selectedSlot || !this.state.patientName) return;

        try {
            this.dom.confirmBtn.disabled = true;
            this.dom.confirmBtn.textContent = 'Agendando...';

            const appointmentsToCreate = [];
            const baseDate = this.state.selectedSlot;
            const count = this.state.recurrenceType === 'none' ? 1 : this.state.sessionsCount;

            // Generar fechas
            for (let i = 0; i < count; i++) {
                const aptDate = new Date(baseDate);

                if (this.state.recurrenceType === 'weekly') {
                    aptDate.setDate(aptDate.getDate() + (i * 7));
                } else if (this.state.recurrenceType === 'biweekly') {
                    aptDate.setDate(aptDate.getDate() + (i * 14));
                }

                // Verificar disponibilidad de cada slot futuro
                const appointments = PatientState.appointments || [];
                if (!isSlotFree(aptDate, appointments, null, this.state.therapist)) {
                    const dateStr = aptDate.toLocaleDateString('es-ES');
                    if (!confirm(`El horario del ${dateStr} está ocupado. ¿Desea continuar agendando las demás citas?`)) {
                        this.dom.confirmBtn.disabled = false;
                        this.dom.confirmBtn.textContent = 'Agendar Cita';
                        return;
                    }
                    continue; // Saltar esta fecha ocupada
                }

                appointmentsToCreate.push(aptDate);
            }

            // Crear citas
            let createdCount = 0;
            for (const date of appointmentsToCreate) {
                const appointmentData = {
                    name: this.state.patientName,
                    date: date.toISOString(),
                    cost: 0, // Costo por defecto, se puede editar después
                    therapist: this.state.therapist,
                    confirmed: false,
                    isPaid: false,
                    isCancelled: false
                };

                const result = await createAppointment(appointmentData, PatientState.appointments || []);
                if (result.success) createdCount++;
            }

            alert(`Se agendaron ${createdCount} citas exitosamente.`);
            this.closeModal();

        } catch (error) {
            console.error('Error al agendar citas:', error);
            alert('Error al agendar citas: ' + error.message);
            this.dom.confirmBtn.disabled = false;
            this.dom.confirmBtn.textContent = 'Agendar Cita';
        }
    }
};
