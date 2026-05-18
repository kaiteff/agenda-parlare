import fs from 'fs';

const uiPath = 'd:/agbc/Ag_Pa/js/modules/calendar/CalendarUI.js';
let s = fs.readFileSync(uiPath, 'utf8');

if (s.includes('const isDayMode = CalendarState.viewMode')) {
    console.log('CalendarUI already patched');
} else {
    const search = `            grid.innerHTML = '';

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
            const headerRow = document.createElement('motion');
            headerRow.className = "grid grid-cols-7 sticky top-0 bg-white z-20 border-b-2 border-gray-200";`;

    const replace = `            grid.innerHTML = '';

            const isDayMode = CalendarState.viewMode === 'day';

            const gridWrapper = grid.closest('.overflow-x-auto');
            if (gridWrapper) {
                if (isDayMode) {
                    gridWrapper.classList.remove('overflow-x-auto');
                    grid.classList.remove('min-w-[700px]');
                    grid.classList.add('w-full');
                } else {
                    gridWrapper.classList.add('overflow-x-auto');
                    grid.classList.add('min-w-[700px]');
                    grid.classList.remove('w-full');
                }
            }

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

            const monthYear = CalendarState.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            if (monthLabel) monthLabel.textContent = monthYear;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (isDayMode) {
                const daySelector = document.createElement('motion');
                daySelector.className = "flex justify-between items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200 gap-1 mb-3 mx-1";

                const shortDayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                allWeekDays.forEach((dayDate, idx) => {
                    const isActive = idx === CalendarState.selectedDayIndex;
                    const btn = document.createElement('button');
                    btn.type = "button";
                    btn.className = \`flex-1 py-2 text-xs font-bold rounded-lg transition-all touch-manipulation \${
                        isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'text-gray-500 hover:bg-gray-100'
                    }\`;
                    btn.textContent = \`\${shortDayNames[idx]} \${dayDate.getDate()}\`;
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
            const headerRow = document.createElement('motion');
            headerRow.className = isDayMode
                ? "grid grid-cols-2 sticky top-0 bg-white z-20 border-b-2 border-gray-200"
                : "grid grid-cols-7 sticky top-0 bg-white z-20 border-b-2 border-gray-200";`;

    const searchFixed = search.replace(/createElement\('motion'\)/g, "createElement('div')");
    const replaceFixed = replace.replace(/createElement\('motion'\)/g, "createElement('div')");

    if (!s.includes(searchFixed)) {
        console.error('search block not found');
        process.exit(1);
    }
    s = s.replace(searchFixed, replaceFixed);
    fs.writeFileSync(uiPath, s);
    console.log('CalendarUI patched');
}

const htmlPath = 'd:/agbc/Ag_Pa/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/<\/?motion>/g, (m) => (m.startsWith('</') ? '</div>' : '<div'));
fs.writeFileSync(htmlPath, html);
console.log('done');
