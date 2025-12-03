// ui.js - UI rendering and event handling
import { viewMode, patientsList, patientsHeader, patientHistoryModal, inactivePatientsModal, newPatientModal, newPatientFirstName, newPatientLastName, saveNewPatientBtn, closeNewPatientModalBtn, selectedPatient } from './data.js';
import { getTodayPatients, getTomorrowPatients, getPendingPayments } from './filters.js';
import { toggleConfirmationFromList } from './utils.js';

// Actualizar header con contadores y botones
export function updatePatientsHeader(count) {
    if (!patientsHeader) return;
    const totalActive = window.patientProfiles ? window.patientProfiles.filter(p => p.isActive !== false).length : 0;
    const todayCount = getTodayPatients().length;
    const tomorrowCount = getTomorrowPatients().length;
    patientsHeader.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">Hoy (${todayCount})</button>
                <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">Mañana (${tomorrowCount})</button>
                <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">Todos (${totalActive})</button>
            </div>
        </div>
    `;
    document.getElementById('btnViewToday')?.addEventListener('click', () => { viewMode = 'today'; renderPatientsList(); });
    document.getElementById('btnViewTomorrow')?.addEventListener('click', () => { viewMode = 'tomorrow'; renderPatientsList(); });
    document.getElementById('btnViewAll')?.addEventListener('click', () => { viewMode = 'all'; renderPatientsList(); });
}

// Renderizar lista de pacientes activos
export function renderPatientsList() {
    if (!patientsList) return;
    const activePatients = window.patientProfiles ? window.patientProfiles.filter(p => p.isActive !== false) : [];
    let patientsToShow;
    if (viewMode === 'today') {
        const todayPatients = getTodayPatients();
        patientsToShow = activePatients.filter(p => todayPatients.some(tp => tp.name === p.name))
            .map(p => {
                const data = todayPatients.find(tp => tp.name === p.name);
                return { ...p, nextAppointment: data.appointmentTime, confirmed: data.confirmed };
            });
    } else if (viewMode === 'tomorrow') {
        const tomorrowPatients = getTomorrowPatients();
        patientsToShow = activePatients.filter(p => tomorrowPatients.some(tp => tp.name === p.name))
            .map(p => {
                const data = tomorrowPatients.find(tp => tp.name === p.name);
                return { ...p, nextAppointment: data.appointmentTime, confirmed: data.confirmed };
            });
    } else {
        patientsToShow = activePatients;
    }

    const patientsWithTotals = patientsToShow.map(profile => {
        const appointments = window.patientsData.filter(apt => apt.name === profile.name);
        let totalPaid = 0, totalPending = 0;
        appointments.forEach(apt => {
            if (apt.isCancelled) return;
            const cost = parseFloat(apt.cost) || 0;
            if (apt.isPaid) totalPaid += cost; else totalPending += cost;
        });
        return { ...profile, totalPaid, totalPending, appointmentCount: appointments.length };
    });

    if (viewMode === 'today') {
        patientsWithTotals.sort((a, b) => (a.nextAppointment && b.nextAppointment) ? a.nextAppointment - b.nextAppointment : 0);
    } else if (viewMode === 'tomorrow') {
        patientsWithTotals.sort((a, b) => (a.nextAppointment && b.nextAppointment) ? a.nextAppointment - b.nextAppointment : 0);
    } else {
        patientsWithTotals.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    updatePatientsHeader(patientsWithTotals.length);
    if (patientsWithTotals.length === 0) {
        patientsList.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">${viewMode === 'today' ? 'No hay citas para hoy' : viewMode === 'tomorrow' ? 'No hay citas para mañana' : 'No hay pacientes activos'}</p>`;
        return;
    }
    patientsList.innerHTML = '';
    patientsWithTotals.forEach(patient => {
        const patientEl = document.createElement('div');
        patientEl.className = 'p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-b-0';
        let timeStr = '';
        let confirmBadge = '';
        if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment) {
            timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            if (viewMode === 'tomorrow') {
                const confirmText = patient.confirmed ? '✓ OK' : '⏳ Pendiente';
                const confirmClass = patient.confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
                confirmBadge = `<button onclick="event.stopPropagation(); toggleConfirmationFromList('${patient.name}')" class="text-[10px] ${confirmClass} px-1.5 py-0.5 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer" title="Click para ${patient.confirmed ? 'desconfirmar' : 'confirmar'}">${confirmText}</button>`;
            }
        }
        patientEl.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    <div class="font-bold text-gray-800">${patient.name}</div>
                    ${confirmBadge}
                </div>
                ${timeStr ? `<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">🕒 ${timeStr}</div>` : ''}
            </div>`;
        patientEl.onclick = () => openPatientHistoryModal(patient);
        patientsList.appendChild(patientEl);
    });
}

// Inicializar UI (event listeners for modal etc.)
export function initUI() {
    // Botón nuevo paciente
    const newPatientBtn = document.getElementById('btnNewPatient');
    if (newPatientBtn) newPatientBtn.onclick = window.createNewPatient;
    // Cerrar modal nuevo paciente
    if (closeNewPatientModalBtn) closeNewPatientModalBtn.onclick = () => newPatientModal.classList.add('hidden');
    // Guardar nuevo paciente
    if (saveNewPatientBtn) saveNewPatientBtn.onclick = window.handleSaveNewPatient;
    // Otros listeners pueden añadirse aquí
}
