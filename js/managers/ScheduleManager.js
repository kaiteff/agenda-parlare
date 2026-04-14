/**
 * ScheduleManager.js
 * Maneja la lógica del modal de "Agendar Primera Cita" con soporte Multiselección y Recurrencia Automática
 */

import { PatientState } from './patient/PatientState.js';
import { AuthManager } from './AuthManager.js';
import { isSlotFree } from '../utils/validators.js';
import { GoogleAuthService } from '../services/google/GoogleAuthService.js';
import { createAppointment } from '../services/appointmentService.js';
import { getStartOfWeek } from '../utils/dateUtils.js';
import { ModalService } from '../utils/ModalService.js';
import { ToastService } from '../utils/ToastService.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.create('ScheduleMgr');

export const ScheduleManager = {
    // Estado interno
    state: {
        patientId: null,
        patientName: null,
        therapist: null,
        currentWeekStart: null,
        selectedSlots: [], // ARRAY para multiselección
        recurrenceType: 'none', // 'none', 'weekly', 'biweekly'
        sessionsCount: 1 // Por defecto 1 (si no es recurrente)
    },

    // Referencias DOM
    dom: {},

    /**
     * Inicializa el manager
     */
    init() {
        this._initDOM();
        this._setupListeners();
        log.info('Inicializado');
        window.ScheduleManager = this;
    },

    /**
     * Inicializa referencias DOM
     */
    _initDOM() {
        this.dom = {
            modal: document.getElementById('scheduleNewPatientModal'),
            patientName: document.getElementById('schedulePatientName'),
            weekLabel: document.getElementById('currentScheduleWeekLabel'),
            slotsGrid: document.getElementById('slotsGrid'),
            prevBtn: document.getElementById('prevWeekScheduleBtn'),
            nextBtn: document.getElementById('nextWeekScheduleBtn'),
            confirmBtn: document.getElementById('confirmScheduleBtn'),
            costInput: document.getElementById('scheduleCostInput'),
            recurrenceInputs: document.getElementsByName('recurrenceType'),
            sessionsCountContainer: document.getElementById('sessionsCountContainer'),
            sessionsCountInput: document.getElementById('sessionsCount')
        };
    },

    /**
     * Configura los event listeners
     */
    _setupListeners() {
        if (this.dom.prevBtn) this.dom.prevBtn.onclick = () => this._changeWeek(-1);
        if (this.dom.nextBtn) this.dom.nextBtn.onclick = () => this._changeWeek(1);
        if (this.dom.confirmBtn) this.dom.confirmBtn.onclick = () => this._confirmSchedule();

        const closeBtn = document.getElementById('closeScheduleNewPatientModalBtn');
        if (closeBtn) closeBtn.onclick = () => this.closeModal();

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
                this.state.sessionsCount = parseInt(e.target.value) || 1;
            });
        }
    },

    /**
     * Abre el modal
     */
    openModal(patientId, patientName, therapist, defaultCost = 0) {
        this.state.patientId = patientId;
        this.state.patientName = patientName;
        this.state.therapist = therapist || 'diana';
        this.state.currentWeekStart = getStartOfWeek(new Date());
        this.state.selectedSlots = [];
        this.state.recurrenceType = 'none';
        this.state.sessionsCount = 1;

        if (this.dom.patientName) this.dom.patientName.textContent = `Paciente: ${patientName}`;
        if (this.dom.confirmBtn) {
            this.dom.confirmBtn.disabled = true;
            this.dom.confirmBtn.textContent = 'Seleccione Horario';
        }

        let finalCost = defaultCost;
        if (!finalCost || finalCost === 0) {
            const profile = PatientState.patients.find(p => p.id === patientId || p.name === patientName);
            finalCost = profile?.defaultCost || 800;
        }
        if (this.dom.costInput) this.dom.costInput.value = finalCost;

        if (this.dom.recurrenceInputs) {
            Array.from(this.dom.recurrenceInputs).forEach(input => {
                if (input.value === 'none') input.checked = true;
            });
        }
        this._updateRecurrenceUI();

        if (this.dom.modal) {
            if (this.dom.modal.parentNode !== document.body) document.body.appendChild(this.dom.modal);
            requestAnimationFrame(() => {
                this._renderSlots();
                this.dom.modal.classList.remove('hidden');
                this.dom.modal.style.display = 'flex';
                this.dom.modal.style.zIndex = '9999';
            });
        }
    },

    closeModal() {
        if (this.dom.modal) {
            this.dom.modal.classList.add('hidden');
            this.dom.modal.style.display = 'none';
        }
    },

    _changeWeek(offset) {
        const newDate = new Date(this.state.currentWeekStart);
        newDate.setDate(newDate.getDate() + (offset * 7));
        if (newDate < getStartOfWeek(new Date())) return;
        this.state.currentWeekStart = newDate;
        this._renderSlots();
    },

    _updateRecurrenceUI() {
        const type = this.state.recurrenceType;
        
        if (type === 'weekly') {
            this.state.sessionsCount = 30; // ~7 meses
            if (this.dom.sessionsCountInput) {
                this.dom.sessionsCountInput.value = 30;
                this.dom.sessionsCountInput.disabled = false; // Permitir cambiar si quiere más de 30 sesiones
            }
        } else if (type === 'biweekly') {
            this.state.sessionsCount = 6; // 3 meses (6 quincenas aprox)
            if (this.dom.sessionsCountInput) {
                this.dom.sessionsCountInput.value = 6;
                this.dom.sessionsCountInput.disabled = false;
            }
        } else {
            this.state.sessionsCount = 1;
            if (this.dom.sessionsCountInput) {
                this.dom.sessionsCountInput.disabled = false;
            }
        }

        if (this.dom.sessionsCountContainer) {
            this.state.recurrenceType !== 'none' 
                ? this.dom.sessionsCountContainer.classList.remove('hidden')
                : this.dom.sessionsCountContainer.classList.add('hidden');
        }
        
        this._updateConfirmButton();
    },

    _renderSlots() {
        if (!this.dom.slotsGrid || !this.dom.weekLabel) return;

        const startOfWeek = this.state.currentWeekStart;
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 5); // Hasta Sábado

        this.dom.weekLabel.textContent = `${startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
        this.dom.slotsGrid.innerHTML = '';

        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        for (let i = 0; i < 6; i++) {
            const currentDayDate = new Date(startOfWeek);
            currentDayDate.setDate(currentDayDate.getDate() + i);

            const dayColumn = document.createElement('div');
            dayColumn.className = 'flex flex-col gap-2';

            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center p-2 bg-gray-50 rounded-lg border border-gray-100 mb-2';
            dayHeader.innerHTML = `<div class="font-bold text-gray-700 text-xs">${days[i]}</div><div class="text-[10px] text-gray-500">${currentDayDate.getDate()}</div>`;
            dayColumn.appendChild(dayHeader);

            const slots = this._getDailySlots(currentDayDate);

            if (slots.length === 0) {
                const noSlots = document.createElement('div');
                noSlots.className = 'text-[10px] text-gray-400 text-center py-4 italic';
                noSlots.textContent = 'N/A';
                dayColumn.appendChild(noSlots);
            } else {
                slots.forEach(slot => {
                    const slotBtn = document.createElement('button');
                    // Verificar si está en la lista de seleccionados
                    const isSelected = this.state.selectedSlots.some(s => s.getTime() === slot.date.getTime());

                    if (!slot.isFree) {
                        slotBtn.className = 'w-full py-2 rounded text-[10px] font-medium bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed';
                        slotBtn.textContent = slot.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        slotBtn.disabled = true;
                    } else {
                        slotBtn.className = `w-full py-2 rounded text-[10px] font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 scale-105' : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'}`;
                        slotBtn.textContent = slot.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        slotBtn.onclick = () => this._toggleSlot(slot.date);
                    }
                    dayColumn.appendChild(slotBtn);
                });
            }
            this.dom.slotsGrid.appendChild(dayColumn);
        }
    },

    _getDailySlots(date) {
        const slots = [];
        const startHour = 8;
        const endHour = 21;
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        for (let hour = startHour; hour < endHour; hour++) {
            if (isToday && hour <= now.getHours()) continue;
            const slotDate = new Date(date);
            slotDate.setHours(hour, 0, 0, 0);
            const isFree = isSlotFree(slotDate, PatientState.appointments || [], null, this.state.therapist);
            slots.push({ date: slotDate, isFree });
        }
        return slots;
    },

    _toggleSlot(slotDate) {
        const index = this.state.selectedSlots.findIndex(s => s.getTime() === slotDate.getTime());
        if (index > -1) {
            this.state.selectedSlots.splice(index, 1);
        } else {
            this.state.selectedSlots.push(slotDate);
        }
        this._renderSlots();
        this._updateConfirmButton();
    },

    _updateConfirmButton() {
        if (!this.dom.confirmBtn) return;
        
        const count = this.state.selectedSlots.length;
        if (count === 0) {
            this.dom.confirmBtn.disabled = true;
            this.dom.confirmBtn.textContent = 'Seleccione Horario';
            return;
        }

        this.dom.confirmBtn.disabled = false;
        const recText = this.state.recurrenceType === 'weekly' ? ' semanales' : this.state.recurrenceType === 'biweekly' ? ' quincenales' : '';
        this.dom.confirmBtn.textContent = `Agendar ${count} cita${count > 1 ? 's' : ''}${recText}`;
    },

    async _confirmSchedule() {
        if (this.state.selectedSlots.length === 0 || !this.state.patientName) return;

        const cost = this.dom.costInput ? parseFloat(this.dom.costInput.value) || 0 : 0;
        if (cost <= 0) {
            await ModalService.alert("Costo Inválido", "Por favor, ingrese un costo válido.", "warning");
            return;
        }

        try {
            this.dom.confirmBtn.disabled = true;
            this.dom.confirmBtn.textContent = 'Agendando...';

            let createdTotal = 0;
            const patientData = PatientState.patients.find(p => p.id === this.state.patientId);
            const clinicFee = patientData?.clinicFee || (this.state.therapist === 'vero' ? 400 : 250);

            // Bucle por cada horario seleccionado (Multidía)
            for (const baseDate of this.state.selectedSlots) {
                const count = this.state.sessionsCount;

                for (let i = 0; i < count; i++) {
                    const aptDate = new Date(baseDate);
                    if (this.state.recurrenceType === 'weekly') aptDate.setDate(aptDate.getDate() + (i * 7));
                    else if (this.state.recurrenceType === 'biweekly') aptDate.setDate(aptDate.getDate() + (i * 14));

                    // Verificar disponibilidad futura
                    if (!isSlotFree(aptDate, PatientState.appointments || [], null, this.state.therapist)) {
                         console.warn(`Slot ocupado saltado: ${aptDate.toISOString()}`);
                         continue; 
                    }

                    const appointmentData = {
                        name: this.state.patientName,
                        patientId: this.state.patientId,
                        date: aptDate.toISOString(),
                        cost: cost,
                        therapist: this.state.therapist,
                        clinicFee: clinicFee,
                        confirmed: false,
                        isPaid: false,
                        isCancelled: false
                    };

                    const result = await createAppointment(appointmentData, PatientState.appointments);
                    if (result.success) createdTotal++;
                }
            }

            await ToastService.success(`¡Éxito! Se agendaron ${createdTotal} citas en total.`);
            this.closeModal();

        } catch (error) {
            log.error('Error al agendar:', error);
            await ModalService.alert("Error", error.message, "error");
            this.dom.confirmBtn.disabled = false;
            this._updateConfirmButton();
        }
    }
};
