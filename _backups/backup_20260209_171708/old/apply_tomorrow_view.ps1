# Script para aplicar cambios de vista "Mañana" de forma segura
$file = "js\patients.js"
$content = Get-Content $file -Raw -Encoding UTF8

Write-Host "Aplicando cambios para vista Mañana..." -ForegroundColor Cyan

# 1. Cambiar showOnlyToday a viewMode
$content = $content -replace "let showOnlyToday = true; // Filtro: mostrar solo pacientes de hoy por defecto", "let viewMode = 'today'; // 'today', 'tomorrow', 'all'"
Write-Host "✓ Cambio 1: showOnlyToday -> viewMode" -ForegroundColor Green

# 2. Agregar getTomorrowPatients después de getTodayPatients
$getTomorrowFunction = @"

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
"@

$content = $content -replace "(\}\r?\n\r?\n// Obtener pagos pendientes de un paciente)", "$getTomorrowFunction`r`n`r`n// Obtener pagos pendientes de un paciente"
Write-Host "✓ Cambio 2: Agregada función getTomorrowPatients" -ForegroundColor Green

# 3. Agregar tomorrowCount en updatePatientsHeader
$content = $content -replace "(const todayCount = getTodayPatients\(\)\.length;)", "`$1`r`n    const tomorrowCount = getTomorrowPatients().length;"
Write-Host "✓ Cambio 3: Agregado tomorrowCount" -ForegroundColor Green

# 4. Cambiar título dinámico
$content = $content -replace "\$\{showOnlyToday \? ``HOY \(\$\{count\}\)`` : ``ACTIVOS \(\$\{count\}\)``\}", "`${viewMode === 'today' ? ``HOY (`${count})`` : viewMode === 'tomorrow' ? ``MAÑANA (`${count})`` : ``ACTIVOS (`${count})``}"
Write-Host "✓ Cambio 4: Título dinámico actualizado" -ForegroundColor Green

# 5. Reemplazar botón toggle por 3 botones
$oldButtons = @"
            <button id="toggleViewBtn" 
                    class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                \$\{showOnlyToday \? ``Ver Todos \(\$\{totalActive\}\)`` : ``Solo Hoy \(\$\{todayCount\}\)``\}
            </button>
"@

$newButtons = @"
            <div class="flex gap-1">
                <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors `${viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">
                    Hoy (`${todayCount})
                </button>
                <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors `${viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                    Mañana (`${tomorrowCount})
                </button>
                <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors `${viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">
                    Todos (`${totalActive})
                </button>
            </div>
"@

$content = $content -replace [regex]::Escape($oldButtons), $newButtons
Write-Host "✓ Cambio 5: Botones actualizados" -ForegroundColor Green

# 6. Reemplazar event listeners
$oldListeners = @"
    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) {
        toggleBtn.onclick = togglePatientView;
    }
"@

$newListeners = @"
    document.getElementById('btnViewToday')?.addEventListener('click', () => { viewMode = 'today'; renderPatientsList(); });
    document.getElementById('btnViewTomorrow')?.addEventListener('click', () => { viewMode = 'tomorrow'; renderPatientsList(); });
    document.getElementById('btnViewAll')?.addEventListener('click', () => { viewMode = 'all'; renderPatientsList(); });
"@

$content = $content -replace [regex]::Escape($oldListeners), $newListeners
Write-Host "✓ Cambio 6: Event listeners actualizados" -ForegroundColor Green

# 7. Eliminar togglePatientView
$content = $content -replace "// Toggle entre vista Hoy y Todos\r?\nfunction togglePatientView\(\) \{\r?\n    showOnlyToday = !showOnlyToday;\r?\n    renderPatientsList\(\);\r?\n\}\r?\n\r?\n", ""
Write-Host "✓ Cambio 7: Función togglePatientView eliminada" -ForegroundColor Green

# 8-12. Reemplazar todas las referencias showOnlyToday
$content = $content -replace "if \(showOnlyToday\) togglePatientView\(\);", "if (viewMode !== 'all') { viewMode = 'all'; renderPatientsList(); }"
$content = $content -replace "if \(showOnlyToday\) \{\r?\n\s+togglePatientView\(\);", "if (viewMode !== 'all') {`r`n                viewMode = 'all';`r`n                renderPatientsList();"
$content = $content -replace "if \(showOnlyToday\) \{", "if (viewMode === 'today') {"
$content = $content -replace "showOnlyToday \? 'No hay citas para hoy' : 'No hay pacientes activos'", "viewMode === 'today' ? 'No hay citas para hoy' : viewMode === 'tomorrow' ? 'No hay citas para mañana' : 'No hay pacientes activos'"
$content = $content -replace "if \(showOnlyToday && patient\.nextAppointment\)", "if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment)"
Write-Host "✓ Cambios 8-12: Referencias showOnlyToday actualizadas" -ForegroundColor Green

# Guardar archivo
$content | Set-Content $file -Encoding UTF8 -NoNewline
Write-Host "`n✅ Todos los cambios aplicados exitosamente!" -ForegroundColor Green
Write-Host "Recarga la página para ver los cambios." -ForegroundColor Yellow
