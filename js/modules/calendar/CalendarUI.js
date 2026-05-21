/**
 * CalendarUI.js
 * Maneja la renderización del calendario y elementos visuales
 */

import { CalendarState } from './CalendarState.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { addDays, formatDateLocal, formatTime12h, formatTime12hCompact } from '../../utils/dateUtils.js';
import { buildCalendarSlotIndex, getEventsForSlot } from './CalendarSlotIndex.js';
import { CalendarData } from './CalendarData.js';
import { ModalService } from '../../utils/ModalService.js';
import { WhatsAppMessaging } from '../../services/WhatsAppMessaging.js';

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

            const isDayMode = CalendarState.viewMode === 'day';
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

            const gridWrapper = document.getElementById('calendarScrollWrap') || grid.closest('.overflow-x-auto');
            grid.classList.remove('calendar-week-fit');
            if (gridWrapper) gridWrapper.classList.remove('calendar-week-fit');

            if (isMobile) {
                grid.classList.remove('min-w-[700px]');
                grid.classList.add('w-full');
                if (isDayMode) {
                    grid.classList.remove('calendar-week-fit');
                    if (gridWrapper) {
                        gridWrapper.classList.remove('calendar-week-fit');
                        gridWrapper.classList.remove('overflow-x-auto');
                    }
                } else {
                    grid.classList.add('calendar-week-fit');
                    if (gridWrapper) {
                        gridWrapper.classList.add('calendar-week-fit');
                        gridWrapper.classList.remove('overflow-x-auto');
                    }
                }
            } else if (isDayMode) {
                if (gridWrapper) gridWrapper.classList.remove('overflow-x-auto');
                grid.classList.remove('min-w-[700px]');
                grid.classList.add('w-full');
            } else {
                if (gridWrapper) gridWrapper.classList.add('overflow-x-auto');
                grid.classList.add('min-w-[700px]');
                grid.classList.remove('w-full');
                grid.classList.remove('calendar-week-fit');
            }

            const rowGridClass = isMobile
                ? (isDayMode ? 'cal-grid-day' : 'cal-grid-week')
                : (isDayMode ? 'grid grid-cols-2' : 'grid grid-cols-7');
            const weekMobileCompact = isMobile && !isDayMode;

            const allWeekDays = [];
            for (let i = 0; i < 7; i++) {
                const day = addDays(CalendarState.currentDate, i);
                if (day.getDay() !== 0) { // Excluir domingos si es necesario
                    allWeekDays.push(day);
                }
            }

            if (CalendarState.selectedDayIndex >= allWeekDays.length) {
                CalendarState.selectedDayIndex = 0;
            }

            const weekDays = isDayMode
                ? [allWeekDays[CalendarState.selectedDayIndex]]
                : allWeekDays;

            const visibleDateStrs = new Set();
            weekDays.forEach((dayDate) => {
                try {
                    visibleDateStrs.add(formatDateLocal(dayDate));
                } catch (_) { /* skip */ }
            });
            const slotIndex = buildCalendarSlotIndex(CalendarState.appointments, visibleDateStrs);

            const monthYear = CalendarState.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            if (monthLabel) monthLabel.textContent = monthYear;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (isDayMode) {
                const daySelector = document.createElement('div');
                daySelector.className = "flex justify-between items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200 gap-1 mb-3 mx-1";
                const shortDayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                allWeekDays.forEach((dayDate, idx) => {
                    const isActive = idx === CalendarState.selectedDayIndex;
                    const btn = document.createElement('button');
                    btn.type = "button";
                    btn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition-all touch-manipulation ${
                        isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'text-gray-500 hover:bg-gray-100'
                    }`;
                    btn.textContent = `${shortDayNames[idx]} ${dayDate.getDate()}`;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        CalendarState.selectedDayIndex = idx;
                        this.renderCalendar(onEventClick, onEmptySlotClick);
                    };
                    daySelector.appendChild(btn);
                });
                grid.appendChild(daySelector);
            }

            // Header Row
            const headerRow = document.createElement('div');
            headerRow.className = `${rowGridClass} calendar-header-row sticky top-0 bg-white border-b-2 border-gray-200`;

            const emptyCell = document.createElement('div');
            emptyCell.className = `border-r border-gray-200 text-center sticky-corner ${isMobile ? 'py-1.5 px-0.5' : 'p-3'}`;
            emptyCell.innerHTML = isMobile
                ? '<div class="text-[9px] font-semibold text-gray-500 uppercase leading-tight">Hr</div>'
                : '<div class="text-xs font-semibold text-gray-500 uppercase">Hora</div>';
            headerRow.appendChild(emptyCell);

            weekDays.forEach((dayDate) => {
                const dayHeader = document.createElement('div');
                const isToday = dayDate.getTime() === today.getTime();
                const headerPad = isMobile && !isDayMode ? 'p-1' : 'p-3';
                dayHeader.className = `${headerPad} text-center border-r border-gray-200 last:border-r-0 min-w-0 ${isToday ? 'bg-blue-50' : ''}`;

                const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                let dateStr = "";
                try { dateStr = formatDateLocal(dayDate); } catch(e) {}

                const blockBtn = isMobile && !isDayMode
                    ? ''
                    : `<button class="day-block-btn text-gray-300 hover:text-red-500 transition-colors" title="Bloquear Día Completo" data-date="${dateStr}">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </button>`;

                dayHeader.innerHTML = isMobile && !isDayMode
                    ? `<div class="cal-day-header-name text-[10px] font-semibold text-gray-500 uppercase leading-tight">${dayName.slice(0, 3)}</div>
                       <div class="cal-day-header-num text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}">${dayNum}</div>`
                    : `<div class="flex items-center justify-center gap-1">
                        <div class="text-xs font-semibold text-gray-500 uppercase">${dayName}</div>
                        ${blockBtn}
                    </div>
                    <div class="text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-800'}">${dayNum}</div>`;
                headerRow.appendChild(dayHeader);
            });

            grid.appendChild(headerRow);
            
            // Listener para el botón de "Bloquear Día"
            headerRow.addEventListener('click', async (e) => {
                const btn = e.target.closest('.day-block-btn');
                if (!btn) return;
                
                const dDate = btn.dataset.date;
                const selectedTherapist = AuthManager.getSelectedTherapist();
                let therapistToBlock = selectedTherapist;

                // Si está en vista 'all', preguntar a quién
                if (!selectedTherapist || selectedTherapist === 'all') {
                    const ans = prompt("¿A qué terapeuta quieres bloquear en este día? (diana, sam, vero)", "diana");
                    if (!ans) return;
                    
                    const lowerAns = ans.toLowerCase().trim();
                    if (['diana', 'sam', 'vero'].includes(lowerAns)) {
                        therapistToBlock = lowerAns;
                    } else {
                        ModalService.alert("Error", "Terapeuta no válido. Debe ser diana, sam o vero.", "error");
                        return;
                    }
                }

                if (await ModalService.confirm("Bloquear Día", `¿Quieres bloquear todo el día ${dDate} para la agenda de ${therapistToBlock}?`)) {
                    await CalendarData.createEvent({
                        name: "⛔ Día Inhábil/Vacaciones",
                        date: dDate + "T08:00:00", // Hora neutra para pasar validaciones
                        cost: 0,
                        isSchoolVisit: true,
                        isFullDayBlock: true,
                        therapist: therapistToBlock
                    });
                }
            });

            // Time Slots starting at 8 AM
            for (let hour = 8; hour <= 20; hour++) {
                const row = document.createElement('div');
                const rowColor = hour % 2 === 0 ? 'bg-gray-50/50' : 'bg-white';
                const isCurrentHour = new Date().getHours() === hour;
                row.className = `${rowGridClass} ${rowColor} ${isCurrentHour ? 'current-hour-row' : ''} relative`;

                const hourCell = document.createElement('div');
                const hourPad = isMobile ? 'py-1 px-0.5' : 'p-2';
                hourCell.className = `${hourPad} border-r border-b border-gray-200 text-right sticky-column ${isCurrentHour ? 'current-hour-cell' : ''}`;
                const hourLabel = isMobile ? formatTime12hCompact(hour) : formatTime12h(hour);
                const hourTextSize = isMobile ? 'text-[10px] leading-tight' : 'text-xs';
                hourCell.innerHTML = `<span class="${hourTextSize} font-medium ${isCurrentHour ? 'text-blue-600' : 'text-gray-500'}">${hourLabel}</span>`;
                row.appendChild(hourCell);

                weekDays.forEach((dayDate) => {
                    const isToday = dayDate.getTime() === today.getTime();
                    const cell = document.createElement('div');
                    const cellPad = weekMobileCompact ? 'p-0.5' : 'p-1';
                    cell.className = `h-16 border-r border-b border-gray-100 ${cellPad} cursor-pointer hover:bg-blue-50/60 transition-colors relative group last:border-r-0 min-w-0 overflow-hidden ${isToday ? 'bg-blue-50/40' : ''}`;

                    let dateStr;
                    try {
                        dateStr = formatDateLocal(dayDate);
                    } catch (err) {
                        console.error("Error formatting date", err);
                        dateStr = "";
                    }

                    const slotEvents = getEventsForSlot(slotIndex, dateStr, hour);

                    const selectedTherapist = AuthManager.getSelectedTherapist();
                    const isViewAll = !selectedTherapist || selectedTherapist === 'all';

                    if (isViewAll) {
                        if (slotEvents.length > 0) {
                            const container = document.createElement('div');
                            container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5";
                            
                            // 🔒 ORDEN FIJO: Diana siempre arriba, Sam al medio, Vero abajo
                            const THERAPIST_ORDER = { diana: 0, sam: 1, vero: 2 };
                            const sortedEvents = [...slotEvents].sort((a, b) => {
                                const aOrder = THERAPIST_ORDER[(a.therapist || 'diana').toLowerCase()] ?? 99;
                                const bOrder = THERAPIST_ORDER[(b.therapist || 'diana').toLowerCase()] ?? 99;
                                return aOrder - bOrder;
                            });
                            
                            sortedEvents.forEach(evt => {
                                const tKey = evt.therapist || 'diana';
                                const therapistName = tKey.charAt(0).toUpperCase() + tKey.slice(1);
                                let bgColor = '';
                                if (evt.isPaid) bgColor = 'bg-green-100 text-green-800 border-green-200';
                                else if (evt.isFullDayBlock || evt.isHourlyBlock) bgColor = 'bg-gray-900 text-white border-gray-950 shadow-md';
                                else if (evt.isCancelled) bgColor = 'bg-red-50 text-red-700 border-red-200 opacity-60';
                                else {
                                    if (tKey === 'diana') bgColor = 'bg-pink-100 text-pink-800 border-pink-200';
                                    else if (tKey === 'sam') bgColor = 'bg-blue-100 text-blue-800 border-blue-200';
                                    else bgColor = 'bg-purple-100 text-purple-800 border-purple-200';
                                }
                                const chip = document.createElement('div');
                                const canEdit = AuthManager.canEditItem(evt) || AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist';
                                const chipSize = weekMobileCompact ? 'cal-event-chip text-[9px]' : 'text-[10px]';
                                chip.className = `flex-1 flex items-center justify-center ${chipSize} font-bold rounded border ${bgColor} transition-all truncate px-0.5 gap-0.5 min-w-0 ${canEdit ? 'cursor-pointer hover:brightness-95' : 'cursor-default opacity-70 grayscale-[20%]'}`;
                                if (canEdit) {
                                    chip.draggable = true;
                                    chip.ondragstart = (e) => { e.dataTransfer.setData("text/plain", evt.id); chip.style.opacity = '0.5'; };
                                    chip.ondragend = (e) => { chip.style.opacity = '1'; };
                                }
                                const canViewDetails = AuthManager.canViewDetails(evt);
                                const tInitial = tKey.charAt(0).toUpperCase();
                                const pInitial = evt.planningTherapist ? evt.planningTherapist.charAt(0).toUpperCase() : null;
                                
                                let content = "";
                                if (evt.isPaid) {
                                    content = `[${tInitial}] Pagado`;
                                } else if (evt.isFullDayBlock || evt.isHourlyBlock) {
                                    content = `[${tInitial}] Bloqueado`;
                                } else if (evt.isCancelled) {
                                    content = `<span class="line-through">[${tInitial}] ${therapistName}</span> <span class="text-[7px] font-black">X ${evt.cancelledBy || '?'}</span>`;
                                } else if (weekMobileCompact) {
                                    const firstName = canViewDetails && evt.name
                                        ? evt.name.split(/\s+/)[0]
                                        : therapistName.slice(0, 3);
                                    content = canViewDetails ? `${tInitial}·${firstName}` : `${tInitial}`;
                                } else {
                                    // INDICADOR DE RELEVO: Tachamos la original si hay planeadora diferente
                                    if (pInitial && pInitial !== tInitial) {
                                        content = `<span class="line-through opacity-40 text-red-500 mr-0.5">${pInitial}</span><span class="text-blue-600">/</span>[${tInitial}] ${therapistName}`;
                                    } else {
                                        content = canViewDetails ? `[${tInitial}] ${therapistName}` : `[${tInitial}] Ocupado`;
                                    }
                                }

                                if (evt.confirmed && canViewDetails && !evt.isCancelled) {
                                    content += weekMobileCompact
                                        ? '✓'
                                        : ' <span class="bg-white/30 rounded-full w-3 h-3 flex items-center justify-center text-[8px]" title="Confirmado">✓</span>';
                                }
                                chip.innerHTML = content;
                                chip.onclick = (e) => { e.stopPropagation(); if (onEventClick) onEventClick(evt); };
                                container.appendChild(chip);
                            });
                            cell.appendChild(container);
                        } else {
                            this.renderEmptySlot(cell, dateStr, hour, onEmptySlotClick);
                        }
                    } else {
                        const matchingEvents = slotEvents.filter(p => (p.therapist || 'diana') === selectedTherapist);
                        if (matchingEvents.length > 0) {
                            const container = document.createElement('div');
                            container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5 overflow-hidden";
                            matchingEvents.forEach(evt => {
                                const canView = AuthManager.canViewDetails(evt);
                                const eventCard = document.createElement('div');
                                const isPaid = evt.isPaid;
                                const heightClass = matchingEvents.length > 1 ? 'flex-1 min-h-0' : 'h-full';
                                let cardClasses = '';
                                if (!canView) {
                                    cardClasses = 'bg-gray-100 text-gray-700 cursor-default';
                                } else if (evt.isCancelled) {
                                    cardClasses = 'bg-red-50 text-red-600 border-l-4 border-l-red-600 opacity-60';
                                } else if (evt.isFullDayBlock || evt.isHourlyBlock) {
                                    cardClasses = 'bg-gray-900 text-white shadow-lg border-gray-950';
                                } else if (isPaid) {
                                    cardClasses = 'bg-gradient-to-r from-green-500 to-green-600 text-white';
                                } else {
                                    cardClasses = 'bg-white border-l-4 border-l-red-500 text-gray-700';
                                }
                                
                                const cardText = weekMobileCompact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-2 py-1';
                                eventCard.className = `${heightClass} rounded-lg ${cardText} font-medium flex flex-col justify-center min-w-0 overflow-hidden ${cardClasses} cursor-pointer transition-all`;
                                if (canView) {
                                    eventCard.draggable = true;
                                    eventCard.ondragstart = (e) => { e.dataTransfer.setData("text/plain", evt.id); eventCard.style.opacity = '0.5'; };
                                    eventCard.ondragend = (e) => { eventCard.style.opacity = '1'; };
                                }
                                eventCard.onclick = (e) => { e.stopPropagation(); if (onEventClick) onEventClick(evt); };
                                const tInitial = (evt.therapist || 'diana').charAt(0).toUpperCase();
                                const pInitial = evt.planningTherapist ? evt.planningTherapist.charAt(0).toUpperCase() : null;
                                
                                const nameContent = evt.isCancelled 
                                    ? `<div class="truncate font-semibold flex-1 leading-tight flex items-center gap-1"><span class="line-through">${evt.name}</span> <span class="text-[9px] font-black uppercase bg-red-100 px-1 rounded">X ${evt.cancelledBy || '?'}</span></div>`
                                    : (pInitial && pInitial !== tInitial) 
                                        ? `<div class="truncate font-semibold flex-1 leading-tight"><span class="line-through opacity-50 text-[10px] mr-1">${pInitial}</span><span class="text-red-500 mr-1">/</span>${evt.name}</div>`
                                        : `<div class="truncate font-semibold flex-1 leading-tight">${evt.name}</div>`;
                                    
                                eventCard.innerHTML = `<div class="flex items-center justify-between gap-1 w-full">${nameContent}${evt.confirmed && canView && !evt.isCancelled ? '✓' : ''}</div>`;
                                container.appendChild(eventCard);
                            });
                            cell.appendChild(container);
                        } else {
                            this.renderEmptySlot(cell, dateStr, hour, onEmptySlotClick);
                        }
                    }

                    cell.ondragover = (e) => { e.preventDefault(); cell.classList.add('bg-blue-100'); };
                    cell.ondragleave = (e) => cell.classList.remove('bg-blue-100');
                    cell.ondrop = async (e) => {
                        e.preventDefault();
                        cell.classList.remove('bg-blue-100');
                        const evtId = e.dataTransfer.getData("text/plain");
                        const evt = CalendarState.appointments.find(a => a.id === evtId);
                        if (!evt || !AuthManager.canEditItem(evt)) return;
                        const [year, month, day] = dateStr.split('-');
                        const newDateObj = new Date(year, month - 1, day, hour, 0, 0);
                        if (await ModalService.confirm('Mover Cita', `¿Mover a ${evt.name}?`)) {
                            await CalendarData.updateEvent(evt.id, { ...evt, date: newDateObj.toISOString() });
                        }
                    };
                    row.appendChild(cell);
                });

                // Línea de tiempo REFINADA (ANCLAJE GARANTIZADO)
                if (isCurrentHour) {
                    const now = new Date();
                    const percent = (now.getMinutes() / 60) * 100;
                    const indicator = document.createElement('div');
                    indicator.className = "live-time-line";
                    // Solo seteamos el top dinámico, el resto viene de index.css (incluyendo width: 100%)
                    indicator.style.top = `${percent}%`;
                    row.appendChild(indicator);
                }

                grid.appendChild(row);
            }
        } catch (e) {
            console.error("Error Render:", e);
            this.updateStatus("Error Render: " + e.message);
        }

        if (CalendarState.scrollToWorkHoursOnNextRender) {
            CalendarState.scrollToWorkHoursOnNextRender = false;
            setTimeout(() => {
                const container = document.getElementById('calendarScrollWrap')?.closest('.scroller')
                    || CalendarState.dom.calendarGrid?.closest('.scroller');
                if (container) {
                    // h-16 por fila; 8:00 y 9:00 → scroll para dejar ~10:00 visible
                    container.scrollTop = 128;
                }
            }, 150);
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
        // Feature "Ocupación del día" eliminada por solicitud del usuario
        // para reducir carga visual redundante.
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
