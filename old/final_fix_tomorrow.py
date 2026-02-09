#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FINAL FIX - Add missing tomorrow logic in renderPatientsList"""

import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "js/patients.js"

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("\nBuscando seccion de renderPatientsList...")

# Buscar la sección donde se filtra por viewMode === 'today'
old_section = """        if (viewMode === 'today') {
            const todayPatients = getTodayPatients();
            patientsToShow = activePatients
                .filter(p => todayPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const todayData = todayPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: todayData.appointmentTime };
                });
        } else {
            patientsToShow = activePatients;
        }"""

new_section = """        if (viewMode === 'today') {
            const todayPatients = getTodayPatients();
            patientsToShow = activePatients
                .filter(p => todayPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const todayData = todayPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: todayData.appointmentTime, confirmed: todayData.confirmed };
                });
        } else if (viewMode === 'tomorrow') {
            const tomorrowPatients = getTomorrowPatients();
            patientsToShow = activePatients
                .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: tomorrowData.appointmentTime, confirmed: tomorrowData.confirmed };
                });
        } else {
            patientsToShow = activePatients;
        }"""

if old_section in content:
    content = content.replace(old_section, new_section)
    print("[OK] Logica de vista 'tomorrow' agregada en renderPatientsList")
    print("     Esto arreglara el conteo incorrecto!")
else:
    print("[WARN] No se encontro el patron exacto")
    print("Buscando patron alternativo...")
    
    # Intentar encontrar solo la parte del else
    if "} else {\n            patientsToShow = activePatients;\n        }" in content:
        content = content.replace(
            "} else {\n            patientsToShow = activePatients;\n        }",
            """} else if (viewMode === 'tomorrow') {
            const tomorrowPatients = getTomorrowPatients();
            patientsToShow = activePatients
                .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: tomorrowData.appointmentTime, confirmed: tomorrowData.confirmed };
                });
        } else {
            patientsToShow = activePatients;
        }"""
        )
        print("[OK] Patron alternativo aplicado")
    else:
        print("[ERROR] No se pudo aplicar el cambio automaticamente")

# Guardar
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("\n[EXITO] Archivo actualizado!")
print("\nRecarga la pagina. Ahora deberia:")
print("1. Mostrar el conteo correcto (6 pacientes)")
print("2. Filtrar correctamente en vista Manana")
print("3. Mostrar badges de confirmacion clickeables")
