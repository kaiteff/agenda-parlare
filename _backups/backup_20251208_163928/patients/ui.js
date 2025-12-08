import { state } from './state.js';
import { getTodayPatients, getTomorrowPatients, getPendingPayments } from './filters.js';
import { patientProfiles, patientsData } from '../firebase.js';

// Renderizar lista de pacientes activos
export function renderPatientsList() {
    try {
        if (!state.dom.patientsList) return;

        const activePatients = patientProfiles.filter(p => p.isActive !== false);

        // Aplicar filtro según modo
        let patientsToShow;
        if (state.viewMode === 'today') {
            const todayPatients = getTodayPatients();
            patientsToShow = activePatients
                .filter(p => todayPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const todayData = todayPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: todayData.appointmentTime, confirmed: todayData.confirmed };
                });
        } else if (state.viewMode === 'tomorrow') {
            const tomorrowPatients = getTomorrowPatients();
            patientsToShow = activePatients
                .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: tomorrowData.appointmentTime, confirmed: tomorrowData.confirmed };
                })
                .sort((a, b) => a.nextAppointment - b.nextAppointment);
        } else {
            patientsToShow = activePatients;
        }

        const patientsWithTotals = patientsToShow.map(profile => {
            const appointments = patientsData.filter(apt => apt.name === profile.name);
            let totalPaid = 0;
            let totalPending = 0;

            appointments.forEach(apt => {
                if (apt.isCancelled) return;
                const cost = parseFloat(apt.cost) || 0;
                if (apt.isPaid) {
                    totalPaid += cost;
                } else {
                    totalPending += cost;
                }
            });

            return {
                ...profile,
                totalPaid,
                totalPending,
                appointmentCount: appointments.length
            };
        });

        // Ordenar
        if (state.viewMode === 'today') {
            patientsWithTotals.sort((a, b) => {
                if (a.nextAppointment && b.nextAppointment) {
                    return a.nextAppointment - b.nextAppointment;
                }
                return 0;
            });
        } else if (state.viewMode === 'tomorrow') {
            patientsWithTotals.sort((a, b) => {
                if (a.nextAppointment && b.nextAppointment) {
                    return a.nextAppointment - b.nextAppointment;
                }
                return 0;
            });
        } else {
            patientsWithTotals.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        }

        // Actualizar header
        updatePatientsHeader(patientsWithTotals.length);

        if (patientsWithTotals.length === 0) {
            state.dom.patientsList.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">${state.viewMode === 'today' ? 'No hay citas para hoy' : state.viewMode === 'tomorrow' ? 'No hay citas para mañana' : 'No hay pacientes activos'}</p>`;
            return;
        }

        state.dom.patientsList.innerHTML = '';

        patientsWithTotals.forEach(patient => {
            const patientEl = document.createElement('div');
            patientEl.className = 'p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-b-0';

            const pendingRatio = patient.totalPending / (patient.totalPaid + patient.totalPending);
            const pendingColor = pendingRatio > 0.5 ? 'text-red-600 font-semibold' : 'text-orange-600';

            // Obtener pagos pendientes
            const pendingPayments = getPendingPayments(patient.name);

            let timeStr = '';
            let confirmBadge = '';
            if ((state.viewMode === 'today' || state.viewMode === 'tomorrow') && patient.nextAppointment) {
                timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                if (state.viewMode === 'tomorrow') {
                    const confirmText = patient.confirmed ? '✓ OK' : '⏳ Pendiente';
                    const confirmClass = patient.confirmed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700';

                    confirmBadge = `<button 
                        onclick="event.stopPropagation(); window.toggleConfirmationFromList('${patient.name}')" 
                        class="text-[10px] ${confirmClass} px-1.5 py-0.5 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer"
                        title="Click para ${patient.confirmed ? 'desconfirmar' : 'confirmar'}"
                    >${confirmText}</button>`;
                }
            }

            patientEl.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-gray-800">${patient.name}</div>
                        ${confirmBadge}
                    </div>
                    ${timeStr ? `<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">🕒 ${timeStr}</div>` : ''}
                </div>
                
                <div class="flex items-center justify-between text-xs mt-2">
                    <div class="text-gray-500">
                        <span class="font-medium text-gray-700">${patient.totalPaid}</span> pagadas
                    </div>
                    <div class="${pendingColor}">
                        <span class="font-bold">${patient.totalPending}</span> pendientes
                    </div>
                </div>

                ${pendingPayments.length > 0 ? `
                    <div class="mt-3 pt-2 border-t border-gray-100">
                        <div class="text-xs font-semibold text-orange-700 mb-1">Pagos pendientes:</div>
                        ${pendingPayments.slice(0, 2).map(apt => {
                const aptDate = new Date(apt.date);
                const dateStr = aptDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                return `
                                <div class="flex items-center justify-between py-1">
                                    <span class="text-xs text-orange-800">${dateStr} - $${apt.cost}</span>
                                    <button onclick="event.stopPropagation(); window.quickMarkAsPaid('${apt.id}')" 
                                            class="px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs">
                                        ✓ Pagado
                                    </button>
                                </div>
                            `;
            }).join('')}
                        
                        ${pendingPayments.length > 2 ?
                        `<div class="text-xs text-orange-600 text-center mt-1">+${pendingPayments.length - 2} más (click para ver)</div>`
                        : ''}
                    </div>
                ` : ''}
            `;

            // Usar window.openPatientHistoryModal que será expuesto por modals.js
            patientEl.onclick = () => window.openPatientHistoryModal(patient);
            state.dom.patientsList.appendChild(patientEl);
        });
    } catch (e) {
        console.error("Error rendering patients list:", e);
    }
}

// Actualizar header con toggle
export function updatePatientsHeader(count) {
    if (!state.dom.patientsHeader) return;

    const totalActive = patientProfiles.filter(p => p.isActive !== false).length;
    const todayCount = getTodayPatients().length;
    const tomorrowCount = getTomorrowPatients().length;

    state.dom.patientsHeader.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-600">
                    ${state.viewMode === 'today' ? `HOY (${count})` : state.viewMode === 'tomorrow' ? `MAÑANA (${count})` : `ACTIVOS (${count})`}
                </span>
                <button id="btnNewPatient" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors flex items-center gap-1" title="Crear nuevo paciente">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Nuevo
                </button>
            </div>
            <div class="flex gap-1">
                <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors ${state.viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">
                    Hoy (${todayCount})
                </button>
                <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors ${state.viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                    Mañana (${tomorrowCount})
                </button>
                <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors ${state.viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">
                    Todos (${totalActive})
                </button>
            </div>
        </div>
    `;

    document.getElementById('btnViewToday')?.addEventListener('click', () => { state.viewMode = 'today'; renderPatientsList(); });
    document.getElementById('btnViewTomorrow')?.addEventListener('click', () => { state.viewMode = 'tomorrow'; renderPatientsList(); });
    document.getElementById('btnViewAll')?.addEventListener('click', () => { state.viewMode = 'all'; renderPatientsList(); });

    const newPatientBtn = document.getElementById('btnNewPatient');
    if (newPatientBtn) {
        newPatientBtn.onclick = window.createNewPatient;
    }
}

// Renderizar citas del paciente (Historial)
export function renderPatientAppointments(appointments) {
    const appointmentsList = state.dom.patientAppointmentsList;
    if (!appointmentsList) return;

    appointmentsList.innerHTML = '';

    if (appointments.length === 0) {
        appointmentsList.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">No hay citas registradas</p>';
        return;
    }

    // Ordenar por fecha descendente
    const sorted = appointments.sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(apt => {
        const aptDate = new Date(apt.date);
        const dateStr = aptDate.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const isPast = aptDate < new Date();
        const isPaid = apt.isPaid;
        const isConfirmed = apt.confirmed;
        const isCancelled = apt.isCancelled;

        const aptEl = document.createElement('div');
        aptEl.className = `p-3 rounded-lg border ${isCancelled ? 'bg-gray-100 border-gray-300' : isPaid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`;

        aptEl.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        ${isCancelled ? '❌' : isPast ? '✅' : '📅'} ${dateStr}
                        ${isConfirmed && !isCancelled ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Confirmado</span>' : ''}
                        ${isCancelled ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">CANCELADA (No cobra)</span>' : ''}
                    </div>
                    <div class="text-xs text-gray-600 mt-1">
                        Costo: <span class="font-semibold">$${apt.cost || '0'}</span>
                    </div>
                </div>
                <div class="text-xs font-bold ${isCancelled ? 'text-gray-500' : isPaid ? 'text-green-700' : 'text-orange-700'}">
                    ${isCancelled ? 'CANCELADA' : isPaid ? 'PAGADO' : 'PENDIENTE'}
                    ${!isPaid && !isCancelled ? `<button onclick="event.stopPropagation(); window.quickMarkAsPaid('${apt.id}')" class="ml-2 px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs">✓ Pagado</button>` : ''}
                    ${isCancelled ? `<button onclick="event.stopPropagation(); window.rescheduleAppointment('${apt.id}')" class="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">📅 Reagendar</button>` : ''}
                </div>
            </div>
        `;

        appointmentsList.appendChild(aptEl);
    });
}

// Renderizar lista de pacientes inactivos
export function renderInactivePatientsList(inactivePatients) {
    const inactiveList = state.dom.inactivePatientsList;
    if (!inactiveList) return;

    inactiveList.innerHTML = '';

    if (inactivePatients.length === 0) {
        inactiveList.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">No hay pacientes dados de baja</p>';
    } else {
        inactivePatients.sort((a, b) => a.name.localeCompare(b.name, 'es'));

        inactivePatients.forEach(patient => {
            const inactivatedDate = patient.dateInactivated?.toDate?.() || new Date(patient.dateInactivated);
            const lastSession = patient.lastSessionDate?.toDate?.() || (patient.lastSessionDate ? new Date(patient.lastSessionDate) : null);

            const patientEl = document.createElement('div');
            patientEl.className = 'p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors';

            patientEl.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="font-semibold text-gray-800 mb-2">${patient.name}</div>
                        <div class="text-xs text-gray-600 space-y-1">
                            ${lastSession ? `<div>📅 Última sesión: ${lastSession.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : '<div class="text-gray-400">Sin sesiones registradas</div>'}
                            <div>🚫 Inactivo desde: ${inactivatedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                    </div>
                    <button 
                        onclick="window.reactivatePatient('${patient.id}', '${patient.name}')"
                        class="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors ml-4">
                        Reactivar
                    </button>
                </div>
            `;

            inactiveList.appendChild(patientEl);
        });
    }
}
