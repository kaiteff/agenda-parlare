#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script para aplicar cambios de vista Mañana de forma segura"""

import re
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "js/patients.js"

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Aplicando cambios...")

# 1. showOnlyToday -> viewMode
content = content.replace(
    "let showOnlyToday = true; // Filtro: mostrar solo pacientes de hoy por defecto",
    "let viewMode = 'today'; // 'today', 'tomorrow', 'all'"
)
print("[OK] Cambio 1")

# 2. Agregar getTomorrowPatients
get_tomorrow_func = """
// Obtener pacientes con citas mañana
function getTomorrowPatients() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowAppointments = patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= tomorrow && aptDate < dayAfter && !apt.isCancelled;
    });

    const patientsTomorrow = new Map();
    tomorrowAppointments.forEach(apt => {
        const existing = patientsTomorrow.get(apt.name);
        const aptTime = new Date(apt.date);

        if (!existing || aptTime < existing.appointmentTime) {
            patientsTomorrow.set(apt.name, {
                name: apt.name,
                appointmentTime: aptTime,
                confirmed: apt.confirmed || false
            });
        }
    });

    return Array.from(patientsTomorrow.values())
        .sort((a, b) => a.appointmentTime - b.appointmentTime);
}

"""

if "function getTomorrowPatients" not in content:
    content = content.replace(
        "// Obtener pagos pendientes de un paciente",
        get_tomorrow_func + "// Obtener pagos pendientes de un paciente"
    )
    print("[OK] Cambio 2")

# 3. tomorrowCount
content = content.replace(
    "const todayCount = getTodayPatients().length;",
    "const todayCount = getTodayPatients().length;\n    const tomorrowCount = getTomorrowPatients().length;"
)
print("[OK] Cambio 3")

# 4. Título dinámico
content = content.replace(
    "${showOnlyToday ? `HOY (${count})` : `ACTIVOS (${count})`}",
    "${viewMode === 'today' ? `HOY (${count})` : viewMode === 'tomorrow' ? `MAÑANA (${count})` : `ACTIVOS (${count})`}"
)
print("[OK] Cambio 4")

# 5. Botones
old_buttons = """            <button id="toggleViewBtn" 
                    class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                ${showOnlyToday ? `Ver Todos (${totalActive})` : `Solo Hoy (${todayCount})`}
            </button>"""

new_buttons = """            <div class="flex gap-1">
                <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">
                    Hoy (${todayCount})
                </button>
                <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                    Mañana (${tomorrowCount})
                </button>
                <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">
                    Todos (${totalActive})
                </button>
            </div>"""

content = content.replace(old_buttons, new_buttons)
print("[OK] Cambio 5")

# 6. Event listeners
old_listeners = """    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) {
        toggleBtn.onclick = togglePatientView;
    }"""

new_listeners = """    document.getElementById('btnViewToday')?.addEventListener('click', () => { viewMode = 'today'; renderPatientsList(); });
    document.getElementById('btnViewTomorrow')?.addEventListener('click', () => { viewMode = 'tomorrow'; renderPatientsList(); });
    document.getElementById('btnViewAll')?.addEventListener('click', () => { viewMode = 'all'; renderPatientsList(); });"""

content = content.replace(old_listeners, new_listeners)
print("[OK] Cambio 6")

# 7. Eliminar togglePatientView
content = re.sub(
    r"// Toggle entre vista Hoy y Todos\r?\nfunction togglePatientView\(\) \{\r?\n    showOnlyToday = !showOnlyToday;\r?\n    renderPatientsList\(\);\r?\n\}\r?\n\r?\n",
    "",
    content
)
print("[OK] Cambio 7")

# 8. Reemplazar referencias showOnlyToday
content = content.replace(
    "if (showOnlyToday) togglePatientView();",
    "if (viewMode !== 'all') { viewMode = 'all'; renderPatientsList(); }"
)

content = re.sub(
    r"if \(showOnlyToday\) \{\r?\n\s+togglePatientView\(\);",
    "if (viewMode !== 'all') {\n                viewMode = 'all';\n                renderPatientsList();",
    content
)

content = content.replace("if (showOnlyToday) {", "if (viewMode === 'today') {")

content = content.replace(
    "showOnlyToday ? 'No hay citas para hoy' : 'No hay pacientes activos'",
    "viewMode === 'today' ? 'No hay citas para hoy' : viewMode === 'tomorrow' ? 'No hay citas para mañana' : 'No hay pacientes activos'"
)

content = content.replace(
    "if (showOnlyToday && patient.nextAppointment)",
    "if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment)"
)
print("[OK] Cambios 8-12")

# Guardar
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("\n[EXITO] Todos los cambios aplicados!")
print("Recarga la pagina para ver los cambios.")
