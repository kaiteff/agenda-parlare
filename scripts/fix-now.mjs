import fs from 'fs';

const tag = 'di' + 'v';

// PatientModals.js
let pm = fs.readFileSync('d:/agbc/Ag_Pa/js/managers/patient/PatientModals.js', 'utf8');
pm = pm.replace(/<\/?motion>/g, (m) => (m.startsWith('</') ? `</${tag}>` : `<${tag}`));
pm = pm.replace('flex flex-col gap-1 w-full', 'flex flex-col gap-2 w-full min-w-0 pr-14 md:pr-0');
pm = pm.replace(
  /(<div class="flex items-center gap-3)(?!\s+min-w-0)">/,
  '$1 min-w-0">'
);
pm = pm.replace(
  'w-12 h-12 rounded-full bg-blue-100',
  'w-11 h-11 flex-shrink-0 rounded-full bg-blue-100'
);
pm = pm.replace('text-xl shadow-sm', 'text-lg shadow-sm');
pm = pm.replace('<motion class="flex-1">', `<${tag} class="min-w-0 flex-1">`).replace(/<motion/g, `<${tag}`);
pm = pm.replace(
  'text-lg font-extrabold text-gray-900 leading-tight',
  'text-base md:text-lg font-extrabold text-gray-900 leading-tight truncate'
);
pm = pm.replace('Terapeuta: ${therapistName.toUpperCase()}', 'Terapeuta ${therapistName}');
pm = pm.replace(
  /\n                    <\/motion>\n                    <\/motion>\n                    <div class="flex items-center gap-2">/,
  `\n                    </${tag}>\n                    <${tag} class="flex flex-wrap items-center gap-2">`
);
pm = pm.replace(/<\/?motion>/g, (m) => (m.startsWith('</') ? `</${tag}>` : `<${tag}`));
fs.writeFileSync('d:/agbc/Ag_Pa/js/managers/patient/PatientModals.js', pm);

// ReceptionControl.js
let rc = fs.readFileSync('d:/agbc/Ag_Pa/js/modules/reception/ReceptionControl.js', 'utf8');
rc = rc.replace(
  /\s*\/\/ TAMBIÉN: Añadir al Sidebar[\s\S]*?sidebarReceptionBtn[\s\S]*?\}\);\s*\n\s*\}\s*\n\s*\}/,
  '\n            // Móvil: Control Maestro solo en menú «Más»\n        }\n    }'
);
fs.writeFileSync('d:/agbc/Ag_Pa/js/modules/reception/ReceptionControl.js', rc);

// PatientModalsHTML.js
let html = fs.readFileSync('d:/agbc/Ag_Pa/js/managers/patient/PatientModalsHTML.js', 'utf8');
html = html.replace(
  'flex justify-between items-start gap-3 bg-white flex-shrink-0',
  'flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-3 bg-white flex-shrink-0 relative'
);
html = html.replace(
  'class="flex items-center gap-3 min-w-0 flex-1" id="patientHistoryTitle"',
  'id="patientHistoryTitle" class="min-w-0 w-full md:flex-1"'
);
html = html.replace('id="authDebugInfo" class="hidden text-[8px]', 'id="authDebugInfo" class="hidden md:flex text-[8px]');
html = html.replace(
  'class="flex items-center gap-0.5 flex-shrink-0">',
  'class="flex items-center gap-0.5 flex-shrink-0 absolute top-3 right-3 md:relative md:top-auto md:right-auto z-30 bg-white/95 md:bg-transparent rounded-full md:rounded-none shadow-sm md:shadow-none pl-0.5">'
);
fs.writeFileSync('d:/agbc/Ag_Pa/js/managers/patient/PatientModalsHTML.js', html);

console.log('ok');
