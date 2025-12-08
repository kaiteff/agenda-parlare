/**
 * CalendarUI.js
 * Maneja la renderización del calendario y elementos visuales
 */

import { CalendarState } from './CalendarState.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { addDays, formatDateLocal } from '../../utils/dateUtils.js';

export const CalendarUI = {
    /**
     * Renderiza el calendario semanal
     * @param {Function} onEventClick - Callback al hacer click en un evento
     * @param {Function} onEmptySlotClick - Callback al hacer click en un slot vacío
     */
    renderCalendar(onEventClick, onEmptySlotClick) {
        try {
            // FIX: Use correct keys from CalendarState.dom
            const { calendarGrid: grid, currentMonthLabel: monthLabel } = CalendarState.dom;

            if (!grid) {
                console.error("CalendarUI: calendarGrid element not found in DOM state");
                return;
            }

            grid.innerHTML = '';

            const weekDays = [];
            for (let i = 0; i < 7; i++) {
                const day = addDays(CalendarState.currentDate, i);
                if (day.getDay() !== 0) { // Excluir domingos si es necesario
                    weekDays.push(day);
                }
            }

            const monthYear = CalendarState.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            if (monthLabel) monthLabel.textContent = monthYear;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Header Row
            const headerRow = document.createElement('div');
            headerRow.className = "grid grid-cols-7 sticky top-0 bg-white z-20 border-b-2 border-gray-200";

            const emptyCell = document.createElement('div');
            emptyCell.className = "p-3 border-r border-gray-200 text-center";
            emptyCell.innerHTML = '<div class="text-xs font-semibold text-gray-500 uppercase">Hora</div>';
            headerRow.appendChild(emptyCell);

            weekDays.forEach((dayDate) => {
                const dayHeader = document.createElement('div');
                const isToday = dayDate.getTime() === today.getTime();
                dayHeader.className = `p-3 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`;

                const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                dayHeader.innerHTML = `
                    <div class="text-xs font-semibold text-gray-500 uppercase">${dayName}</div>
                    <div class="text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-800'}">${dayNum}</div>
                `;
                headerRow.appendChild(dayHeader);
            });

            grid.appendChild(headerRow);

            // Time Slots
            for (let hour = 9; hour <= 20; hour++) {
                const row = document.createElement('div');
                const rowColor = hour % 2 === 0 ? 'bg-gray-50/50' : 'bg-white';
                row.className = `grid grid-cols-7 ${rowColor}`;

                const hourCell = document.createElement('div');
                hourCell.className = "p-2 border-r border-b border-gray-200 text-right";
                hourCell.innerHTML = `<span class="text-xs font-medium text-gray-500">${hour.toString().padStart(2, '0')}:00</span>`;
                row.appendChild(hourCell);

                weekDays.forEach((dayDate) => {
                    const isToday = dayDate.getTime() === today.getTime();
                    const cell = document.createElement('div');
                    cell.className = `h-16 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-blue-50/60 transition-colors relative group last:border-r-0 ${isToday ? 'bg-blue-50/40' : ''}`;

                    let dateStr;
                    try {
                        dateStr = formatDateLocal(dayDate);
                    } catch (err) {
                        console.error("Error formatting date", err);
                        dateStr = "";
                    }

                    // Filtrar eventos
                    const slotEvents = CalendarState.appointments.filter(p => {
                        const pDate = new Date(p.date);
                        let pDateStr;
                        try { pDateStr = formatDateLocal(pDate); } catch (e) { return false; }
                        return pDateStr === dateStr && pDate.getHours() === hour && !p.isCancelled;
                    });

                    const selectedTherapist = AuthManager.getSelectedTherapist();
                    const isViewAll = !selectedTherapist || selectedTherapist === 'all';

                    if (isViewAll) {
                        // VISTA TODOS
                        if (slotEvents.length > 0) {
                            const container = document.createElement('div');
                            container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5";

                            slotEvents.forEach(evt => {
                                const therapistName = (evt.therapist || 'diana') === 'diana' ? 'Diana' : 'Sam';
                                const bgColor = (evt.therapist || 'diana') === 'diana' ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-blue-100 text-blue-800 border-blue-200';

                                const chip = document.createElement('div');
                                chip.className = `flex-1 flex items-center justify-center text-[10px] font-bold rounded border ${bgColor} cursor-pointer hover:brightness-95 truncate`;
                                chip.textContent = `${therapistName} Ocupada`;
                                chip.title = `${therapistName}: ${evt.name}`;

                                chip.onclick = (e) => {
                                    e.stopPropagation();
                                    if (onEventClick) onEventClick(evt);
                                };
                                container.appendChild(chip);
                            });
                            cell.appendChild(container);
                        } else {
                            this.renderEmptySlot(cell, dateStr, hour, onEmptySlotClick);
                        }
                    } else {
                        // VISTA INDIVIDUAL
                        const matchingEvents = slotEvents.filter(p => {
                            const apptTherapist = p.therapist || 'diana';
                            return apptTherapist === selectedTherapist;
                        });

                        if (matchingEvents.length > 0) {
                            const container = document.createElement('div');
                            container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5 overflow-hidden";

                            matchingEvents.forEach(evt => {
                                const eventCard = document.createElement('div');
                                const isPaid = evt.isPaid;
                                const isConfirmed = evt.confirmed;
                                const heightClass = matchingEvents.length > 1 ? 'flex-1 min-h-0' : 'h-full';

                                eventCard.className = `${heightClass} rounded-md shadow-sm text-xs font-medium cursor-pointer transition-all hover:shadow-md px-1.5 py-0.5 flex flex-col justify-center ${isPaid ? 'bg-green-600 text-white' : 'bg-red-100 text-red-800 border border-red-200'}`;

                                eventCard.innerHTML = `
                                    <div class="flex items-center justify-between gap-1 w-full">
                                        <div class="truncate font-semibold flex-1 leading-tight">${evt.name}</div>
                                        ${isConfirmed ? `<div class="flex-shrink-0 ${isPaid ? 'bg-blue-500' : 'bg-blue-600'} text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px]" title="Confirmado">✓</div>` : ''}
                                    </div>
                                    ${matchingEvents.length === 1 ? `<div class="text-[10px] opacity-90 leading-tight">$${evt.cost || '0'}</div>` : ''}
                                `;

                                eventCard.onclick = (e) => {
                                    e.stopPropagation();
                                    if (onEventClick) onEventClick(evt);
                                };

                                container.appendChild(eventCard);
                            });

                            cell.appendChild(container);
                        } else {
                            this.renderEmptySlot(cell, dateStr, hour, onEmptySlotClick);
                        }
                    }

                    row.appendChild(cell);
                });

                grid.appendChild(row);
            }
        } catch (e) {
            console.error("Error Render:", e);
            this.updateStatus("Error Render: " + e.message);
        }
    },

    renderEmptySlot(cell, dateStr, hour, onClick) {
        const plusIcon = document.createElement('div');
        plusIcon.className = "hidden group-hover:flex absolute inset-0 items-center justify-center text-blue-200";
        plusIcon.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`;
        cell.appendChild(plusIcon);

        cell.onclick = () => {
            if (onClick) onClick(dateStr, hour);
        };
    },

    renderBusySlots(dateStr) {
        const { busySlotsContainer, busySlotsList } = CalendarState.dom;
        if (!busySlotsContainer || !busySlotsList) return;

        const currentFilter = AuthManager.getSelectedTherapist();
        const therapist = (currentFilter && currentFilter !== 'all') ? currentFilter : (AuthManager.currentUser?.therapist || 'diana');

        const busySlots = CalendarState.appointments.filter(p => {
            const apptTherapist = p.therapist || 'diana';
            if (apptTherapist !== therapist) return false;

            const pDate = new Date(p.date);
            let pDateStr;
            try { pDateStr = formatDateLocal(pDate); } catch (e) { return false; }
            return pDateStr === dateStr;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (busySlots.length === 0) {
            busySlotsContainer.classList.add('hidden');
            return;
        }

        busySlotsContainer.classList.remove('hidden');
        busySlotsList.innerHTML = '';

        busySlots.forEach(slot => {
            const slotDate = new Date(slot.date);
            const hour = slotDate.getHours();
            const minute = slotDate.getMinutes();
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            const slotEl = document.createElement('div');
            slotEl.className = "flex items-center justify-between bg-red-50 border border-red-200 rounded px-2 py-1.5";
            slotEl.innerHTML = `
                <span class="text-xs font-semibold text-red-700">${timeStr}</span>
                <span class="text-xs text-red-600 truncate ml-2">${slot.name}</span>
            `;
            busySlotsList.appendChild(slotEl);
        });
    },

    updateStatus(msg) {
        const { statusMsg } = CalendarState.dom;
        if (statusMsg) {
            statusMsg.textContent = msg;
            setTimeout(() => {
                statusMsg.textContent = '';
            }, 3000);
        }
    }
};
