const fs = require('fs');

// 1. ReceptionControl
const rcPath = 'd:/agbc/Ag_Pa/js/modules/reception/ReceptionControl.js';
let rc = fs.readFileSync(rcPath, 'utf8');
rc = rc.replace(
    /\s*\/\/ TAMBIÉN: Añadir al Sidebar[\s\S]*?sidebarReceptionBtn[\s\S]*?\}\);\s*\n\s*\}\s*\n\s*\}/,
    '\n            // Móvil: Control Maestro solo en menú «Más» (MobileBottomNav)\n        }\n    }'
);
fs.writeFileSync(rcPath, rc);

// 2. PatientModals title block
const pmPath = 'd:/agbc/Ag_Pa/js/managers/patient/PatientModals.js';
let pm = fs.readFileSync(pmPath, 'utf8');
const titleStart = pm.indexOf('dom.patientHistoryTitle.innerHTML = `');
const titleEnd = pm.indexOf('            `;\n        }\n\n        // Inyectar bloque de Analítica Visual');
if (titleStart === -1 || titleEnd === -1) {
    console.error('title block not found');
    process.exit(1);
}

const newTitle = `dom.patientHistoryTitle.innerHTML = \`
                <div class="flex flex-col gap-2 w-full min-w-0">
                    <motion class="flex items-center gap-3 min-w-0">
                        <div class="w-11 h-11 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-white">
                            \${patient.name.charAt(0)}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-base md:text-lg font-extrabold text-gray-900 leading-tight truncate">\${patient.name}</motion>
                            <div class="text-xs text-gray-500 font-medium flex items-center gap-1 truncate">
                                <span class="w-2 h-2 flex-shrink-0 rounded-full \${patient.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}"></span>
                                Terapeuta \${therapistName}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" id="patientWelcomeBtn" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-lg border border-green-200 hover:bg-green-200 transition-colors touch-manipulation" title="Enviar Mensaje de Bienvenida">
                            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382"/></svg>
                            Bienvenida
                        </button>
                    </div>
                    \${(isEndingSoon || hasNoFuture) ? \`
                <div id="patientRecurrenceAlert" class="flex items-center gap-1.5 py-1.5 px-2.5 bg-red-50 border border-red-100 rounded-lg w-full">
                    <span class="flex h-2 w-2 flex-shrink-0 rounded-full bg-red-600"></span>
                    <span class="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">
                        \${hasNoFuture ? 'Sin citas programadas' : 'Recurrencia por agotarse'}
                    </span>
                </div>
            \` : ''}
                </div>
            \``;

pm = pm.slice(0, titleStart) + newTitle.replace(/<\/?motion>/g, (x) => (x.includes('/') ? '</div>' : '<div')) + pm.slice(titleEnd);

pm = pm.replace(
    /const recurrenceAlert = \(isEndingSoon \|\| hasNoFuture\) \? `[\s\S]*?` : '';\n\n            const therapistName/,
    'const therapistName'
);

if (!pm.includes('alertEl')) {
    pm = pm.replace(
        'dom.editPatientBtn.onclick = () => {',
        `dom.editPatientBtn.onclick = () => {
                    const alertEl = document.getElementById('patientRecurrenceAlert');
                    if (alertEl) alertEl.classList.add('hidden');`
    );
}
if (!pm.includes('scrollIntoView')) {
    pm = pm.replace(
        "dom.patientEditSection.classList.remove('hidden');",
        `dom.patientEditSection.classList.remove('hidden');
                    dom.patientEditSection.scrollIntoView({ behavior: 'smooth', block: 'start' });`
    );
}

fs.writeFileSync(pmPath, pm);

// 3. PatientModalsHTML
const htmlPath = 'd:/agbc/Ag_Pa/js/managers/patient/PatientModalsHTML.js';
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(
    'flex justify-between items-start gap-3 bg-white flex-shrink-0">',
    'flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-3 bg-white flex-shrink-0 relative">'
);
html = html.replace(
    'class="flex items-center gap-3 min-w-0 flex-1" id="patientHistoryTitle"',
    'id="patientHistoryTitle" class="min-w-0 w-full md:flex-1 md:pr-16"'
);
html = html.replace('id="authDebugInfo" class="hidden text-[8px]', 'id="authDebugInfo" class="hidden md:flex text-[8px]');
html = html.replace(
    'class="flex items-center gap-0.5 flex-shrink-0">',
    'class="flex items-center gap-0.5 flex-shrink-0 absolute top-3 right-3 md:relative md:top-auto md:right-auto z-30">'
);
fs.writeFileSync(htmlPath, html);

// 4. CSS
const cssPath = 'd:/agbc/Ag_Pa/index.css';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('#calendarGrid .grid > div:not(.sticky-column)')) {
    css = css.replace(
        `.sticky-column {
    position: sticky !important;
    left: 0;
    z-index: 10;
    background-color: white;
    box-shadow: 2px 0 4px -2px rgba(0,0,0,0.1);
}`,
        `.sticky-column {
    position: sticky !important;
    left: 0;
    z-index: 30 !important;
    background-color: white !important;
    box-shadow: 4px 0 8px -2px rgba(0,0,0,0.12);
    min-width: 4.5rem;
}

#calendarGrid .grid > div:not(.sticky-column):not(.sticky-corner) {
    position: relative;
    z-index: 1;
}

#calendarGrid .absolute.inset-0 {
    z-index: 2;
}`
    );
    css = css.replace(
        'top: 0;\n    z-index: 30 !important;\n    background-color: white;\n    box-shadow: 2px 2px 4px',
        'top: 0;\n    z-index: 40 !important;\n    background-color: white;\n    box-shadow: 2px 2px 4px'
    );
}
if (!css.includes('patientEditSection')) {
    css += `\n@media (max-width: 767px) {\n    #patientHistoryModal #patientEditSection { scroll-margin-top: 5rem; }\n}\n`;
}
fs.writeFileSync(cssPath, css);

console.log('done');
