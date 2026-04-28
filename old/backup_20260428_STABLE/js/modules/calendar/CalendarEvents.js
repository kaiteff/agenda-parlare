/**
 * CalendarEvents.js
 * Coordina la inicialización, navegación y eventos principales del calendario
 */

import { CalendarState } from './CalendarState.js';
import { CalendarData } from './CalendarData.js';
import { CalendarUI } from './CalendarUI.js';
import { CalendarModal } from './CalendarModal.js';
import { MiniCalendar } from '../../components/MiniCalendar.js';
import { getStartOfWeek, addDays } from '../../utils/dateUtils.js';
import { WhatsAppDashboard } from '../../components/WhatsAppDashboard.js';

export const CalendarEvents = {
    miniCalendar: null,

    init() {
        console.log("CalendarEvents init started");
        this.cacheDOM();
        this.setupMiniCalendar();
        this.bindEvents();
        CalendarModal.init(); // Inicializar listeners del modal

        // Suscribirse a datos
        CalendarData.subscribe((data, metadata) => {
            const source = metadata.fromCache ? "caché local" : "servidor";
            CalendarUI.updateStatus(`${data.length} citas (${source})`);
            this.render();
            if (this.miniCalendar) this.miniCalendar.render();
            WhatsAppDashboard.render();
        });

        // Render inicial
        this.render();
        console.log("CalendarEvents init done");
    },

    cacheDOM() {
        const dom = CalendarState.dom;
        // Mapear IDs a CalendarState.dom
        const ids = [
            'calendarGrid', 'currentMonthLabel', 'prevWeekBtn', 'nextWeekBtn', 'todayBtn', 'statusMsg',
            'miniCalendarGrid', 'miniMonthLabel', 'miniPrevBtn', 'miniNextBtn',
            'eventModal', 'modalTitle', 'patientSearch', 'patientFirstName', 'patientLastName',
            'appointmentDate', 'cost', 'appointmentTherapist', 'saveBtn', 'waBtn', 'deleteBtn', 'payBtn', 'confirmBtn', 'confirmedAtLabel', 'cancelBtn',
            'rescheduleSection', 'rescheduleOptions', 'busySlotsContainer', 'busySlotsList',
            'patientSuggestions', 'isRecurring', 'recurringSection', 'recurringOptions', 'recurringDatesList',
            'patientCustomPhone', 'patientCountryCode'
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            // Mapeo de nombres específicos
            if (id === 'patientSearch') dom.patientSearchInput = el;
            else if (id === 'patientFirstName') dom.patientFirstNameInput = el;
            else if (id === 'patientLastName') dom.patientLastNameInput = el;
            else if (id === 'appointmentDate') dom.appointmentDateInput = el;
            else if (id === 'cost') dom.costInput = el;
            else if (id === 'appointmentTherapist') dom.appointmentTherapistInput = el;
            else if (id === 'patientCustomPhone') dom.phoneInput = el;
            else if (id === 'patientCountryCode') dom.countryCodeInput = el;
            else if (id === 'isRecurring') dom.isRecurringCheckbox = el;
            else if (id === 'mobileDatePickerBtn') dom.mobileDatePickerBtn = el;
            else if (id === 'calendarJumpInput') dom.calendarJumpInput = el;
            else dom[id] = el;
        });

        // Inicializar inicio de semana
        CalendarState.currentWeekStart = getStartOfWeek(new Date());
    },

    setupMiniCalendar() {
        const { miniCalendarGrid, miniMonthLabel, miniPrevBtn, miniNextBtn } = CalendarState.dom;
        if (miniCalendarGrid) {
            this.miniCalendar = new MiniCalendar({
                container: miniCalendarGrid,
                monthLabel: miniMonthLabel,
                onDateSelect: (date) => {
                    CalendarState.currentWeekStart = getStartOfWeek(date);
                    this.render();
                },
                onWeekSelect: (date) => {
                    CalendarState.currentWeekStart = getStartOfWeek(date);
                    this.render();
                }
            });
            this.miniCalendar.render();

            if (miniPrevBtn) miniPrevBtn.onclick = () => this.miniCalendar.prevMonth();
            if (miniNextBtn) miniNextBtn.onclick = () => this.miniCalendar.nextMonth();
        }
    },

    bindEvents() {
        const { prevWeekBtn, nextWeekBtn, todayBtn, mobileDatePickerBtn, calendarJumpInput } = CalendarState.dom;

        if (prevWeekBtn) prevWeekBtn.onclick = () => {
            CalendarState.currentWeekStart = addDays(CalendarState.currentWeekStart, -7);
            this.render();
        };

        if (nextWeekBtn) nextWeekBtn.onclick = () => {
            CalendarState.currentWeekStart = addDays(CalendarState.currentWeekStart, 7);
            this.render();
        };

        if (todayBtn) todayBtn.onclick = () => {
            CalendarState.currentWeekStart = getStartOfWeek(new Date());
            this.render();
            if (this.miniCalendar) {
                this.miniCalendar.currentMonth = new Date();
                this.miniCalendar.render();
            }
        };

        // Salto a fecha (Mobile)
        if (mobileDatePickerBtn && calendarJumpInput) {
            mobileDatePickerBtn.onclick = () => calendarJumpInput.showPicker ? calendarJumpInput.showPicker() : calendarJumpInput.click();
            
            calendarJumpInput.onchange = (e) => {
                const date = new Date(e.target.value + 'T00:00:00'); // Evitar desfase de zona horaria
                if (!isNaN(date.getTime())) {
                    CalendarState.currentWeekStart = getStartOfWeek(date);
                    this.render();
                    if (this.miniCalendar) {
                        this.miniCalendar.currentMonth = date;
                        this.miniCalendar.render();
                    }
                }
            };
        }

        // Cerrar modales al hacer click en el backdrop (el área oscura)
        window.addEventListener('click', (event) => {
            // 1. Modal de Calendario (Citas)
            if (event.target === CalendarState.dom.eventModal) {
                CalendarModal.closeModal();
            }
            
            // 2. Modal de Nuevo Paciente
            const newPatientModal = document.getElementById('newPatientModal');
            if (event.target === newPatientModal) {
                console.log('🚪 Cerrando NewPatientModal desde backdrop');
                newPatientModal.classList.add('hidden');
                newPatientModal.style.setProperty('display', 'none', 'important');
            }

            // 3. Otros modales comunes
            const patientHistoryModal = document.getElementById('patientHistoryModal');
            if (event.target === patientHistoryModal) {
                patientHistoryModal.classList.add('hidden');
                patientHistoryModal.style.setProperty('display', 'none', 'important');
            }

            const receptionControlModal = document.getElementById('receptionControlModal');
            if (event.target === receptionControlModal) {
                receptionControlModal.classList.add('hidden');
                receptionControlModal.style.setProperty('display', 'none', 'important');
            }

            // 4. Modal de Pacientes Inactivos
            const inactiveModal = document.getElementById('inactivePatientsModal');
            if (event.target === inactiveModal) {
                inactiveModal.classList.add('hidden');
            }
        });
    },

    render() {
        // Actualizar estado de fecha para UI
        CalendarState.setDate(CalendarState.currentWeekStart);

        CalendarUI.renderCalendar(
            (evt) => CalendarModal.openEditModal(evt),
            (dateStr, hour) => CalendarModal.openCreateModal(dateStr, hour)
        );
    }
};
