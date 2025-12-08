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
            'appointmentDate', 'cost', 'saveBtn', 'deleteBtn', 'payBtn', 'cancelBtn',
            'rescheduleSection', 'rescheduleOptions', 'busySlotsContainer', 'busySlotsList',
            'patientSuggestions', 'isRecurring', 'recurringSection', 'recurringOptions', 'recurringDatesList'
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            // Mapeo de nombres específicos
            if (id === 'patientSearch') dom.patientSearchInput = el;
            else if (id === 'patientFirstName') dom.patientFirstNameInput = el;
            else if (id === 'patientLastName') dom.patientLastNameInput = el;
            else if (id === 'appointmentDate') dom.appointmentDateInput = el;
            else if (id === 'cost') dom.costInput = el;
            else if (id === 'isRecurring') dom.isRecurringCheckbox = el;
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
        const { prevWeekBtn, nextWeekBtn, todayBtn } = CalendarState.dom;

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

        // Cerrar modal al hacer click fuera
        window.onclick = (event) => {
            if (event.target === CalendarState.dom.eventModal) {
                CalendarModal.closeModal();
            }
        };
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
