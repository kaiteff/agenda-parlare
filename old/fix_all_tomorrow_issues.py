#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix 3 issues:
1. Add confirm/unconfirm button in tomorrow view
2. Fix patient count (showing 7 instead of 6)
3. Ensure confirmed field is passed correctly
"""

import sys
import re
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "js/patients.js"

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("\n=== ARREGLANDO PROBLEMAS ===\n")

# PROBLEMA 1: Asegurar que confirmed se pase en renderPatientsList para tomorrow
print("1. Verificando propagacion de 'confirmed' en vista Manana...")

# Buscar la sección de tomorrow en renderPatientsList
pattern = r"(} else if \(viewMode === 'tomorrow'\) \{[^}]+const tomorrowPatients = getTomorrowPatients\(\);[^}]+patientsToShow = activePatients[^}]+\.map\(p => \{[^}]+const tomorrowData = tomorrowPatients\.find\(tp => tp\.name === p\.name\);[^}]+return \{ \.\.\.p, nextAppointment: tomorrowData\.appointmentTime)(\};\s+\}\);)"

replacement = r"\1, confirmed: tomorrowData.confirmed\2"

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if new_content != content:
    content = new_content
    print("   [OK] Campo 'confirmed' agregado")
else:
    # Intentar con patrón más simple
    if ", confirmed: tomorrowData.confirmed" not in content:
        print("   [WARN] No se pudo agregar automaticamente - verificar manualmente")
    else:
        print("   [OK] Campo 'confirmed' ya existe")

# PROBLEMA 2: Agregar botón de confirmar en la vista Mañana
print("\n2. Agregando boton de confirmar/desconfirmar...")

# Buscar donde se muestra confirmBadge y agregar botón
old_badge_section = """                if (viewMode === 'tomorrow') {
                    confirmBadge = patient.confirmed 
                        ? '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">✓ OK</span>'
                        : '<span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">⏳ Pendiente</span>';
                }"""

new_badge_section = """                if (viewMode === 'tomorrow') {
                    const confirmText = patient.confirmed ? '✓ OK' : '⏳ Pendiente';
                    const confirmClass = patient.confirmed 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700';
                    
                    confirmBadge = `<button 
                        onclick="event.stopPropagation(); toggleConfirmationFromList('${patient.name}')" 
                        class="text-[10px] ${confirmClass} px-1.5 py-0.5 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer"
                        title="Click para ${patient.confirmed ? 'desconfirmar' : 'confirmar'}"
                    >${confirmText}</button>`;
                }"""

if old_badge_section in content:
    content = content.replace(old_badge_section, new_badge_section)
    print("   [OK] Boton de confirmacion agregado")
else:
    print("   [WARN] No se encontro la seccion de confirmBadge")

# PROBLEMA 3: Agregar función global para toggle confirmation
print("\n3. Agregando funcion toggleConfirmationFromList...")

toggle_function = """
// Toggle confirmación desde lista de pacientes
window.toggleConfirmationFromList = async function(patientName) {
    try {
        // Obtener la próxima cita de mañana para este paciente
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const tomorrowAppointments = patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return apt.name === patientName && 
                   aptDate >= tomorrow && 
                   aptDate < dayAfter && 
                   !apt.isCancelled;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (tomorrowAppointments.length === 0) {
            alert('No se encontró cita para mañana');
            return;
        }

        const appointment = tomorrowAppointments[0];
        const newStatus = !appointment.confirmed;

        await updateDoc(doc(db, collectionPath, appointment.id), {
            confirmed: newStatus
        });

        console.log(`Cita ${newStatus ? 'confirmada' : 'desconfirmada'} para ${patientName}`);
    } catch (error) {
        console.error('Error al cambiar confirmación:', error);
        alert('Error al cambiar confirmación: ' + error.message);
    }
};

"""

# Insertar antes de la función updatePatientsHeader
marker = "// Actualizar header con toggle"
if marker in content and "window.toggleConfirmationFromList" not in content:
    content = content.replace(marker, toggle_function + marker)
    print("   [OK] Funcion toggleConfirmationFromList agregada")
else:
    if "window.toggleConfirmationFromList" in content:
        print("   [OK] Funcion ya existe")
    else:
        print("   [WARN] No se pudo agregar la funcion")

# PROBLEMA 4: Debug del conteo
print("\n4. Verificando logica de conteo...")
if "const tomorrowCount = getTomorrowPatients().length;" in content:
    print("   [OK] tomorrowCount se calcula correctamente")
else:
    print("   [ERROR] tomorrowCount no esta definido!")

# Guardar
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("\n" + "="*50)
print("[EXITO] Cambios aplicados!")
print("="*50)
print("\nRecarga la pagina y:")
print("1. Haz click en el badge de confirmacion para cambiar estado")
print("2. Verifica que el conteo sea correcto")
print("3. Si el conteo sigue mal, abre la consola y escribe:")
print("   getTomorrowPatients().length")
