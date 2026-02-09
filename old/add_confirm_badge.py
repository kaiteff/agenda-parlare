#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agregar indicador de confirmación en vista Mañana"""

import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "js/patients.js"

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Agregando lógica de confirmBadge...")

# Buscar la sección donde se define timeStr
old_code = """            let timeStr = '';
            if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment) {
                timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }"""

new_code = """            let timeStr = '';
            let confirmBadge = '';
            if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment) {
                timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                if (viewMode === 'tomorrow') {
                    confirmBadge = patient.confirmed 
                        ? '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">✓ OK</span>'
                        : '<span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">⏳ Pendiente</span>';
                }
            }"""

content = content.replace(old_code, new_code)
print("[OK] confirmBadge agregado")

# Actualizar el HTML para mostrar el badge
old_html = """            patientEl.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="font-bold text-gray-800">${patient.name}</div>
                    ${timeStr ? `<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">🕒 ${timeStr}</div>` : ''}
                </div>"""

new_html = """            patientEl.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-gray-800">${patient.name}</div>
                        ${confirmBadge}
                    </div>
                    ${timeStr ? `<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">🕒 ${timeStr}</div>` : ''}
                </div>"""

content = content.replace(old_html, new_html)
print("[OK] HTML actualizado para mostrar badge")

# Guardar
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("\n[EXITO] Indicador de confirmacion agregado!")
print("Recarga la pagina para ver los cambios.")
