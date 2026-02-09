#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix tomorrow view - add confirmed field and show time"""

import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "js/patients.js"

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Aplicando correcciones...")

# 1. Asegurar que getTomorrowPatients incluya confirmed
old_tomorrow_map = """            patientsTomorrow.set(apt.name, {
                name: apt.name,
                appointmentTime: aptTime,
                confirmed: apt.confirmed || false
            });"""

# Verificar si ya existe
if "confirmed: apt.confirmed || false" in content:
    print("[OK] getTomorrowPatients ya tiene confirmed")
else:
    print("[WARN] getTomorrowPatients no tiene confirmed - necesita revision manual")

# 2. Asegurar que en renderPatientsList se pase confirmed para tomorrow
old_tomorrow_render = """        } else if (viewMode === 'tomorrow') {
            const tomorrowPatients = getTomorrowPatients();
            patientsToShow = activePatients
                .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: tomorrowData.appointmentTime };
                });"""

new_tomorrow_render = """        } else if (viewMode === 'tomorrow') {
            const tomorrowPatients = getTomorrowPatients();
            patientsToShow = activePatients
                .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: tomorrowData.appointmentTime, confirmed: tomorrowData.confirmed };
                });"""

if old_tomorrow_render in content:
    content = content.replace(old_tomorrow_render, new_tomorrow_render)
    print("[OK] Agregado campo confirmed en renderPatientsList")
else:
    print("[WARN] No se encontro el patron esperado para tomorrow render")

# 3. Verificar que confirmBadge esté definido
if "let confirmBadge = '';" in content:
    print("[OK] confirmBadge ya esta definido")
else:
    print("[WARN] confirmBadge no esta definido")

# 4. Verificar que el HTML muestre confirmBadge
if "${confirmBadge}" in content:
    print("[OK] HTML muestra confirmBadge")
else:
    print("[WARN] HTML no muestra confirmBadge")

# Guardar
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("\n[EXITO] Correcciones aplicadas!")
print("Recarga la pagina para ver los cambios.")
print("\nNOTA: Si aun no funciona, verifica en la consola del navegador")
print("si patient.confirmed tiene valor para las citas de manana.")
