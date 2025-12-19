/**
 * CalendarSuggestions.js
 * Lógica para sugerencias inteligentes y opciones de reagendamiento
 */

import { CalendarState } from './CalendarState.js';
import { CalendarUI } from './CalendarUI.js';
import { checkSlotConflict, isNotSunday } from '../../utils/validators.js';
import { addDays, formatTime12h } from '../../utils/dateUtils.js';

export const CalendarSuggestions = {

    /**
     * Analiza el historial del paciente y sugiere un horario habitual
     */
    analyzeAndSuggest(patientName) {
        // Logs para depuración
        console.log(`🔍 Sugerencias: Analizando para "${patientName}"...`);

        const suggestionBox = document.getElementById('schedulingSuggestion');
        if (suggestionBox) suggestionBox.remove();
        if (!patientName) return;

        // Verificar historial
        const history = CalendarState.appointments.filter(p => p.name === patientName && !p.isCancelled);
        console.log(`🔍 Sugerencias: ${history.length} citas previas encontradas.`);

        if (history.length < 1) return;

        // Si ya tiene cita futura, quizás no necesite sugerencia (o sí, para agendar otra)
        // La lógica original evitaba sugerir si ya había cita futura, pero quizás el usuario quiere agendar MÁS
        // const hasFuture = history.some(p => new Date(p.date) > new Date());
        // if (hasFuture) return; 
        // Comentado para permitir sugerencias seguidas

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

        console.log('🔍 Sugerencias: Mejor patrón encontrado:', bestPattern, 'con', maxCount, 'ocurrencias');

        if (bestPattern) {
            const [dayOfWeek, hour] = bestPattern.split('-').map(Number);
            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const today = new Date();
            let nextDate = new Date();
            nextDate.setHours(hour, 0, 0, 0);

            // Calcular días hasta el próximo día de la semana habitual
            let daysToAdd = (dayOfWeek + 7 - today.getDay()) % 7;
            if (daysToAdd === 0 && nextDate < today) daysToAdd = 7;

            nextDate.setDate(today.getDate() + daysToAdd);

            // Verificar conflicto en la fecha sugerida
            let conflict = checkSlotConflict(nextDate.toISOString(), CalendarState.appointments);

            // Si hay conflicto, intentar la semana siguiente
            if (conflict) {
                console.log('🔍 Sugerencias: Conflicto en primera fecha sugerida, intentando semana siguiente...');
                nextDate.setDate(nextDate.getDate() + 7);
                conflict = checkSlotConflict(nextDate.toISOString(), CalendarState.appointments);
            }

            // Si sigue habiendo conflicto, buscar otra semana más
            if (conflict) {
                console.log('🔍 Sugerencias: Conflicto persistente, abortando sugerencia.');
                return;
            }

            const timeStr = formatTime12h(hour);

            // Intentar encontrar el contenedor visualmente correcto
            const input = CalendarState.dom.patientSearchInput;
            const container = input.closest('.relative') || input.parentNode;

            const div = document.createElement('div');
            div.id = 'schedulingSuggestion';
            div.className = "mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-fade-in shadow-sm relative z-50";
            div.innerHTML = `
                <div class="text-xs text-indigo-800">
                    <span class="font-bold">💡 Sugerencia:</span> Suele venir los <span class="font-semibold">${days[dayOfWeek]} a las ${timeStr}</span>.
                </div>
                <button type="button" class="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap ml-2">
                    Usar
                </button>
            `;

            div.querySelector('button').onclick = () => {
                const offset = nextDate.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(nextDate - offset)).toISOString().slice(0, 16);
                CalendarState.dom.appointmentDateInput.value = localISOTime;

                // Activar recurrencia automáticamente si el patrón es fuerte (>1 vez)
                if (maxCount > 1 && CalendarState.dom.isRecurringCheckbox) {
                    CalendarState.dom.isRecurringCheckbox.checked = true;
                    CalendarState.dom.recurringSection.classList.remove('hidden');
                    this.generateRecurringDates();
                }

                CalendarUI.renderBusySlots(localISOTime.split('T')[0]);
                div.remove();
            };

            console.log('✅ Sugerencias: Mostrando sugerencia en UI');
            container.appendChild(div);
        } else {
            console.log('🔍 Sugerencias: No hay patrón claro.');
        }
    },

    /**
     * Genera lista de fechas recurrentes
     */
    generateRecurringDates() {
        const { appointmentDateInput, recurringOptions, recurringDatesList } = CalendarState.dom;
        if (!appointmentDateInput.value) return [];

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

            // Verificación de conflicto para cada fecha recurrente
            const offset = d.getTimezoneOffset() * 60000;
            const iso = (new Date(d - offset)).toISOString();

            const isConflict = checkSlotConflict(iso, CalendarState.appointments);

            li.className = `text-xs flex justify-between items-center p-1 rounded ${isConflict ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`;
            li.innerHTML = `
                <span>${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                ${isConflict ? '<span class="font-bold text-red-600">Ocupado</span>' : '<span class="text-green-600">Disponible</span>'}
            `;
            recurringDatesList.appendChild(li);
        }
        return dates;
    },

    /**
     * Genera opciones para reagendar (Chips)
     */
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
        // Busca slots libres HOY y slots libres MAÑANA dentro del horario laboral
        const now = new Date();
        const candidates = [];

        // Función helper para buscar huecos
        const findSlots = (baseDate, labelPrefix) => {
            const startHour = 9;
            const endHour = 20; // Extendido hasta las 20:00
            const currentHour = baseDate.getDate() === now.getDate() ? Math.max(startHour, now.getHours() + 1) : startHour;

            for (let h = currentHour; h <= endHour; h++) {
                // Si NO es hoy, limitamos la cantidad por día para no saturar 
                // pero si ES hoy, queremos mostrar todas las posibles
                const isToday = baseDate.getDate() === now.getDate();
                if (!isToday && candidates.length >= 8) break;

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

        // Buscar Hoy (Todas las disponibles)
        findSlots(now, 'Hoy');

        // Buscar Mañana (si hay espacio en sugerencias)
        if (candidates.length < 5) { // Si hoy hay pocas, mostramos mañana
            const tomorrow = addDays(now, 1);
            if (isNotSunday(tomorrow)) {
                findSlots(tomorrow, 'Mañana');
            } else {
                // Si mañana es domingo, buscar lunes
                const monday = addDays(now, 2);
                findSlots(monday, 'Lunes');
            }
        }

        // Renderizar sugerencias verdes (Máximo 8 chips para no llenar pantalla)
        candidates.slice(0, 8).forEach(cand => {
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
    }
};
