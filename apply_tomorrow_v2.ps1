# Script para aplicar cambios de vista "Mañana"
$ErrorActionPreference = "Stop"
$file = "js\patients.js"

Write-Host "Leyendo archivo..." -ForegroundColor Cyan
$content = Get-Content $file -Raw -Encoding UTF8

Write-Host "Aplicando cambios..." -ForegroundColor Cyan

# 1. showOnlyToday -> viewMode
$content = $content.Replace(
    "let showOnlyToday = true; // Filtro: mostrar solo pacientes de hoy por defecto",
    "let viewMode = 'today'; // 'today', 'tomorrow', 'all'"
)

# 2. Agregar getTomorrowPatients
$marker = "// Obtener pagos pendientes de un paciente"
$getTomorrowFunc = @'

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

'@

if ($content -notmatch "function getTomorrowPatients") {
    $content = $content.Replace($marker, $getTomorrowFunc + $marker)
    Write-Host "✓ getTomorrowPatients agregada" -ForegroundColor Green
}

# 3. tomorrowCount
$content = $content.Replace(
    "const todayCount = getTodayPatients().length;",
    "const todayCount = getTodayPatients().length;`r`n    const tomorrowCount = getTomorrowPatients().length;"
)

# 4. Título dinámico  
$content = $content.Replace(
    '${showOnlyToday ? `HOY (${count})` : `ACTIVOS (${count})`}',
    '${viewMode === ''today'' ? `HOY (${count})` : viewMode === ''tomorrow'' ? `MAÑANA (${count})` : `ACTIVOS (${count})`}'
)

# 5. Botones
$content = $content.Replace(
    @'
            <button id="toggleViewBtn" 
                    class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                ${showOnlyToday ? `Ver Todos (${totalActive})` : `Solo Hoy (${todayCount})`}
            </button>
'@,
    @'
            <div class="flex gap-1">
                <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">
                    Hoy (${todayCount})
                </button>
                <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                    Mañana (${tomorrowCount})
                </button>
                <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">
                    Todos (${totalActive})
                </button>
            </div>
'@
)

# 6. Event listeners
$content = $content.Replace(
    @'
    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) {
        toggleBtn.onclick = togglePatientView;
    }
'@,
    @'
    document.getElementById('btnViewToday')?.addEventListener('click', () => { viewMode = 'today'; renderPatientsList(); });
    document.getElementById('btnViewTomorrow')?.addEventListener('click', () => { viewMode = 'tomorrow'; renderPatientsList(); });
    document.getElementById('btnViewAll')?.addEventListener('click', () => { viewMode = 'all'; renderPatientsList(); });
'@
)

# 7. Eliminar togglePatientView
$content = $content -replace "// Toggle entre vista Hoy y Todos\r?\nfunction togglePatientView\(\) \{\r?\n    showOnlyToday = !showOnlyToday;\r?\n    renderPatientsList\(\);\r?\n\}\r?\n\r?\n", ""

# 8. Reemplazar referencias showOnlyToday
$content = $content.Replace("if (showOnlyToday) togglePatientView();", "if (viewMode !== 'all') { viewMode = 'all'; renderPatientsList(); }")
$content = $content -replace "if \(showOnlyToday\) \{\r?\n\s+togglePatientView\(\);", "if (viewMode !== 'all') {`r`n                viewMode = 'all';`r`n                renderPatientsList();"
$content = $content.Replace("if (showOnlyToday) {", "if (viewMode === 'today') {")
$content = $content.Replace("showOnlyToday ? 'No hay citas para hoy' : 'No hay pacientes activos'", "viewMode === 'today' ? 'No hay citas para hoy' : viewMode === 'tomorrow' ? 'No hay citas para mañana' : 'No hay pacientes activos'")
$content = $content.Replace("if (showOnlyToday && patient.nextAppointment)", "if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment)")

# Guardar
$content | Set-Content $file -Encoding UTF8 -NoNewline
Write-Host "`n✅ Cambios aplicados!" -ForegroundColor Green
