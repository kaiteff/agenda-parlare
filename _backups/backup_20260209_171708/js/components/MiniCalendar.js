import { getStartOfWeek, addDays, getWeekNumber } from '../utils/dateUtils.js';

export class MiniCalendar {
    constructor(config) {
        this.container = config.container;
        this.monthLabel = config.monthLabel;
        this.onDateSelect = config.onDateSelect; // Callback(date)
        this.onWeekSelect = config.onWeekSelect; // Callback(date)

        this.currentMonth = new Date();
        this.currentWeekStart = getStartOfWeek(new Date());
    }

    setWeekStart(date) {
        this.currentWeekStart = getStartOfWeek(date);
        this.render();
    }

    setMonth(date) {
        this.currentMonth = new Date(date);
        this.render();
    }

    prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.render();
    }

    render() {
        if (!this.container || !this.monthLabel) return;

        const month = this.currentMonth.getMonth();
        const year = this.currentMonth.getFullYear();

        this.monthLabel.textContent = this.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        this.monthLabel.className = "capitalize font-bold text-gray-800";

        this.container.innerHTML = '';

        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDayOfWeek = today.getDay();
        const currentWeekEnd = addDays(this.currentWeekStart, 6);

        // Header sin Domingo
        const weekNumHeader = document.createElement('div');
        weekNumHeader.className = "text-xs font-medium text-gray-300 text-center py-1";
        weekNumHeader.textContent = '#';
        this.container.appendChild(weekNumHeader);

        const days = ['L', 'M', 'M', 'J', 'V', 'S'];
        days.forEach((d, index) => {
            // index 0 es Lunes (1), index 5 es Sábado (6)
            const isCurrentDayColumn = (index + 1) === todayDayOfWeek;
            const el = document.createElement('div');
            el.className = `text-xs font-medium text-center py-1 ${isCurrentDayColumn ? 'text-blue-600 font-bold bg-blue-50/30' : 'text-gray-400'}`;
            el.textContent = d;
            this.container.appendChild(el);
        });

        const currentWeekNumber = getWeekNumber(this.currentWeekStart);
        let isFirstVisibleDay = true;

        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            const dayOfWeek = date.getDay(); // 0=D, 1=L...

            if (dayOfWeek === 0) continue; // Saltar Domingos

            const weekNum = getWeekNumber(date);
            const isCurrentWeek = weekNum === currentWeekNumber;

            // Si es Lunes O es el primer día visible que vamos a pintar
            if (dayOfWeek === 1 || isFirstVisibleDay) {

                if (isFirstVisibleDay) {
                    // Padding logic
                    // dayOfWeek: 1=L, 2=M...
                    // Padding = dayOfWeek - 1
                    const padding = dayOfWeek - 1;

                    this._renderWeekNum(weekNum, isCurrentWeek, date);

                    for (let p = 0; p < padding; p++) {
                        this.container.appendChild(document.createElement('div'));
                    }
                    isFirstVisibleDay = false;
                } else {
                    this._renderWeekNum(weekNum, isCurrentWeek, date);
                }
            }

            // Renderizar día
            const el = document.createElement('div');
            el.className = "text-sm w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-gray-100 transition-colors mx-auto";
            el.textContent = i;

            const isSameDayColumn = todayDayOfWeek === dayOfWeek;

            if (date.getTime() === today.getTime()) {
                el.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
                el.id = 'todayInMiniCalendar';
            } else if (isSameDayColumn) {
                el.classList.add('bg-blue-50/30');
            }

            if (date >= this.currentWeekStart && date <= currentWeekEnd) {
                if (!el.classList.contains('bg-blue-600')) {
                    el.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
                }
            }

            el.onclick = () => {
                if (this.onDateSelect) this.onDateSelect(date);
            };

            this.container.appendChild(el);
        }
    }

    _renderWeekNum(weekNum, isCurrentWeek, date) {
        const weekEl = document.createElement('div');
        weekEl.className = `text-[10px] flex items-center justify-center cursor-pointer hover:bg-blue-100 rounded transition-colors ${isCurrentWeek ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-300'}`;
        weekEl.textContent = weekNum;
        weekEl.onclick = () => {
            if (this.onWeekSelect) this.onWeekSelect(date);
        };
        this.container.appendChild(weekEl);
    }
}
