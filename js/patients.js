// patients.js - Sistema completo de gestión de pacientes

import { db, patientProfilesPath, patientsData, patientProfiles, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, updatePatientProfiles, collectionPath, subscribeToPatientsData } from './firebase.js';
import { renderCalendar } from './calendar.js';
import { isSlotFree } from './utils/validators.js';
import { createPatientProfile, deactivatePatient as deactivatePatientService, reactivatePatient as reactivatePatientService, deletePatientProfile as deletePatientProfileService } from './services/patientService.js';

// Referencias DOM
let patientsList, patientsHeader, patientHistoryModal, inactivePatientsModal;
let selectedPatient = null;
let showOnlyToday = true; // Filtro: mostrar solo pacientes de hoy por defecto

// Inicializar sistema de pacientes
// Inicializar sistema de pacientes
export function initPatients() {
    patientsList = document.getElementById('patientsList');
    patientsHeader = document.getElementById('patientsHeader');
    patientHistoryModal = document.getElementById('patientHistoryModal');
    inactivePatientsModal = document.getElementById('inactivePatientsModal');

    setupEventListeners();
    setupPatientProfilesListener();

    // Suscribirse a cambios en citas para actualizar contadores y orden
    subscribeToPatientsData(() => {
        console.log("🏥 patients.js: Recibida actualización de datos de citas");
        renderPatientsList();
    });
}

// Listener de perfiles
function setupPatientProfilesListener() {
    console.log("🏥 patients.js: Iniciando listener de perfiles");
    const profilesColRef = collection(db, patientProfilesPath);
    const profilesQuery = query(profilesColRef);

    onSnapshot(profilesQuery, (snapshot) => {
        const profiles = [];
        snapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        updatePatientProfiles(profiles);
        renderPatientsList();
    }, (error) => {
        console.error("Error Patient Profiles: " + error.message);
    });
}

// Obtener pacientes con citas hoy
function getTodayPatients() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate < tomorrow;
    });

    const patientsToday = new Map();
    todayAppointments.forEach(apt => {
        const existing = patientsToday.get(apt.name);
        const aptTime = new Date(apt.date);

        if (!existing || aptTime < existing.appointmentTime) {
            patientsToday.set(apt.name, {
                name: apt.name,
                appointmentTime: aptTime
            });
        }
    });

    return Array.from(patientsToday.values())
        .sort((a, b) => a.appointmentTime - b.appointmentTime);
}

// Obtener pagos pendientes de un paciente
function getPendingPayments(patientName) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return apt.name === patientName &&
            aptDate < today &&
            !apt.isPaid;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Marcar pago pendiente como pagado rápidamente
window.quickMarkAsPaid = async function (appointmentId) {
    try {
        await updateDoc(doc(db, collectionPath, appointmentId), {
            isPaid: true
        });
    } catch (e) {
        alert("Error al marcar como pagado: " + e.message);
    }
};

// Actualizar header con toggle
function updatePatientsHeader(count) {
    if (!patientsHeader) return;

    const totalActive = patientProfiles.filter(p => p.isActive !== false).length;
    const todayCount = getTodayPatients().length;

    patientsHeader.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-600">
                    ${showOnlyToday ? `HOY (${count})` : `ACTIVOS (${count})`}
                </span>
                <button id="btnNewPatient" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors flex items-center gap-1" title="Crear nuevo paciente">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Nuevo
                </button>
            </div>
            <button id="toggleViewBtn" 
                    class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                ${showOnlyToday ? `Ver Todos (${totalActive})` : `Solo Hoy (${todayCount})`}
            </button>
        </div>
    `;

    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) {
        toggleBtn.onclick = togglePatientView;
    }

    const newPatientBtn = document.getElementById('btnNewPatient');
    if (newPatientBtn) {
        newPatientBtn.onclick = window.createNewPatient;
    }
}

// Toggle entre vista Hoy y Todos
function togglePatientView() {
    showOnlyToday = !showOnlyToday;
    renderPatientsList();
}

// Crear nuevo paciente manualmente
window.createNewPatient = async function () {
    console.log("createNewPatient called");
    console.log("patientProfiles:", patientProfiles);
    const name = prompt("Nombre del nuevo paciente:");
    if (!name || !name.trim()) return;

    const cleanName = name.trim();
    const existing = patientProfiles.find(p => p.name.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
        if (existing.isActive !== false) {
            alert(`El paciente "${existing.name}" ya existe en la lista de activos.`);
            if (showOnlyToday) togglePatientView(); // Cambiar vista para mostrarlo
            return;
        } else {
            if (confirm(`El paciente "${existing.name}" está en la lista de bajas. ¿Desea reactivarlo?`)) {
                await reactivatePatient(existing.id, existing.name);
                return;
            }
        }
    }

    try {
        const result = await createPatientProfile(cleanName);
        if (result.success) {
            alert(`Paciente "${cleanName}" creado exitosamente.`);
            if (showOnlyToday) {
                togglePatientView(); // Cambiar a "Ver Todos" para que el usuario vea al nuevo paciente
            }
        } else {
            alert("Error al crear paciente: " + result.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
};

// Renderizar lista de pacientes activos
function renderPatientsList() {
    try {
        if (!patientsList) return;

        const activePatients = patientProfiles.filter(p => p.isActive !== false);

        // Aplicar filtro según modo
        let patientsToShow;
        if (showOnlyToday) {
            const todayPatients = getTodayPatients();
            patientsToShow = activePatients
                .filter(p => todayPatients.some(tp => tp.name === p.name))
                .map(p => {
                    const todayData = todayPatients.find(tp => tp.name === p.name);
                    return { ...p, nextAppointment: todayData.appointmentTime };
                });
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

        // Ordenar: por hora si es "Hoy", alfabético si es "Todos"
        if (showOnlyToday) {
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
            patientsList.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">${showOnlyToday ? 'No hay citas para hoy' : 'No hay pacientes activos'}</p>`;
            return;
        }

        patientsList.innerHTML = '';

        patientsWithTotals.forEach(patient => {
            const patientEl = document.createElement('div');
            patientEl.className = 'p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-b-0';

            const pendingRatio = patient.totalPending / (patient.totalPaid + patient.totalPending);
            const pendingColor = pendingRatio > 0.5 ? 'text-red-600 font-semibold' : 'text-orange-600';

            // Obtener pagos pendientes
            const pendingPayments = getPendingPayments(patient.name);

            let timeStr = '';
            if (showOnlyToday && patient.nextAppointment) {
                timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            patientEl.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="font-bold text-gray-800">${patient.name}</div>
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
                                    <button onclick="event.stopPropagation(); quickMarkAsPaid('${apt.id}')" 
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

            patientEl.onclick = () => openPatientHistoryModal(patient);
            patientsList.appendChild(patientEl);
        });
    } catch (e) {
        console.error("Error rendering patients list:", e);
        alert("Error rendering patients list: " + e.message);
    }
}

// Abrir modal de historial
function openPatientHistoryModal(patient) {
    selectedPatient = patient;

    const appointments = patientsData.filter(apt => apt.name === patient.name);

    // Calcular estadísticas
    const now = new Date();
    const completed = appointments.filter(apt => new Date(apt.date) < now);
    const upcoming = appointments.filter(apt => new Date(apt.date) >= now);

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

    // Actualizar título
    document.getElementById('patientHistoryTitle').innerHTML = `
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Historial de ${patient.name}
    `;

    // Actualizar totales
    document.getElementById('patientTotalPaid').textContent = `$${totalPaid}`;
    document.getElementById('patientTotalPending').textContent = `$${totalPending}`;

    // Actualizar estadísticas
    document.getElementById('patientTotalAppointments').textContent = appointments.length;
    document.getElementById('patientCompletedAppointments').textContent = completed.length;
    document.getElementById('patientUpcomingAppointments').textContent = upcoming.length;

    // Renderizar lista de citas
    renderPatientAppointments(appointments);

    // Botón de dar de baja
    const deactivateBtn = document.getElementById('deactivatePatientBtn');
    const deleteBtn = document.getElementById('deletePatientBtn');
    const editBtn = document.getElementById('editPatientBtn');
    // Ocultar inicialmente los botones de baja y eliminar
    deactivateBtn.classList.add('hidden');
    deleteBtn.classList.add('hidden');
    // Al hacer clic en Editar, mostrar opciones
    editBtn.onclick = () => {
        deactivateBtn.classList.toggle('hidden');
        deleteBtn.classList.toggle('hidden');
    };
    // Acción de dar de baja
    deactivateBtn.onclick = () => deactivatePatient(patient.id, patient.name);
    // Acción de eliminar paciente (elimina perfil y citas)
    deleteBtn.onclick = async () => {
        if (!confirm(`¿Eliminar definitivamente a ${patient.name}? Esta acción no se puede revertir.`)) return;
        try {
            // Eliminar perfil
            await deleteDoc(doc(db, patientProfilesPath, patient.id));
            // Eliminar citas asociadas
            const patientApts = patientsData.filter(a => a.name === patient.name);
            for (const apt of patientApts) {
                await deleteDoc(doc(db, collectionPath, apt.id));
            }
            closePatientHistoryModal();
            alert(`${patient.name} ha sido eliminado.`);
        } catch (e) {
            console.error('Error al eliminar paciente:', e);
            alert('Error al eliminar paciente: ' + e.message);
        }
    };

    // Mostrar modal
    patientHistoryModal.classList.remove('hidden');
}

// Renderizar citas del paciente
function renderPatientAppointments(appointments) {
    const appointmentsList = document.getElementById('patientAppointmentsList');
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
                    ${!isPaid && !isCancelled ? `<button onclick="event.stopPropagation(); quickMarkAsPaid('${apt.id}')" class="ml-2 px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs">✓ Pagado</button>` : ''}
                    ${isCancelled ? `<button onclick="event.stopPropagation(); rescheduleAppointment('${apt.id}')" class="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">📅 Reagendar</button>` : ''}
                </div>
            </div>
        `;

        appointmentsList.appendChild(aptEl);
    });
}

// Dar de baja paciente
// Dar de baja paciente
async function deactivatePatient(profileId, patientName) {
    if (!confirm(`¿Está seguro de dar de baja a ${patientName}?\n\nEl historial se preservará pero el paciente no aparecerá en la lista activa.`)) {
        return;
    }

    try {
        // Obtener última cita
        const patientAppointments = patientsData.filter(apt => apt.name === patientName);
        const sortedApts = patientAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastSession = sortedApts.length > 0 ? sortedApts[0].date : null;

        // Usar servicio
        const result = await deactivatePatientService(profileId, lastSession ? new Date(lastSession) : null);

        if (result.success) {
            closePatientHistoryModal();
            alert(`${patientName} ha sido dado de baja exitosamente.`);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error("Error deactivating patient:", e);
        alert("Error al dar de baja: " + e.message);
    }
}

// Cerrar modal de historial
window.closePatientHistoryModal = function () {
    patientHistoryModal.classList.add('hidden');
    selectedPatient = null;
};

// Reagendar cita cancelada
window.rescheduleAppointment = async function (appointmentId) {
    const appointment = patientsData.find(a => a.id === appointmentId);
    if (!appointment) return;

    const newDateStr = prompt(`Reagendar cita de ${appointment.name}\n\nIngrese la nueva fecha y hora (formato: YYYY-MM-DD HH:MM):`);
    if (!newDateStr) return;

    try {
        const newDate = new Date(newDateStr.replace(' ', 'T'));
        if (isNaN(newDate.getTime())) {
            alert('Fecha inválida. Use el formato: YYYY-MM-DD HH:MM');
            return;
        }

        await updateDoc(doc(db, collectionPath, appointmentId), {
            date: newDate.toISOString(),
            isCancelled: false,
            cancelledAt: null
        });

        alert(`Cita reagendada para ${newDate.toLocaleString('es-ES')}`);
    } catch (e) {
        console.error('Error al reagendar:', e);
        alert('Error al reagendar: ' + e.message);
    }
};

// Abrir modal de pacientes inactivos
function openInactivePatientsModal() {
    const inactivePatients = patientProfiles.filter(p => p.isActive === false);

    const inactiveList = document.getElementById('inactivePatientsList');
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
                        onclick="reactivatePatient('${patient.id}', '${patient.name}')"
                        class="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors ml-4">
                        Reactivar
                    </button>
                </div>
            `;

            inactiveList.appendChild(patientEl);
        });
    }

    inactivePatientsModal.classList.remove('hidden');
}

// Cerrar modal de inactivos
window.closeInactivePatientsModal = function () {
    inactivePatientsModal.classList.add('hidden');
};

// Reactivar paciente
// Reactivar paciente
window.reactivatePatient = async function (profileId, patientName) {
    if (!confirm(`¿Desea reactivar a ${patientName}?`)) return;

    try {
        const result = await reactivatePatientService(profileId);
        if (result.success) {
            alert(`${patientName} ha sido reactivado exitosamente.`);
            openInactivePatientsModal(); // Refrescar lista
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error("Error reactivating patient:", e);
        alert("Error al reactivar: " + e.message);
    }
};

// Crear o asegurar perfil de paciente
// Crear o asegurar perfil de paciente
export async function ensurePatientProfile(patientName) {
    const existing = patientProfiles.find(p => p.name === patientName);

    if (existing) {
        // Si está inactivo, preguntar si reactivar
        if (existing.isActive === false) {
            const inactivatedDate = existing.dateInactivated?.toDate?.() || new Date(existing.dateInactivated);
            const dateStr = inactivatedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            if (confirm(`⚠️ ${patientName} está dado/a de baja desde el ${dateStr}.\n\n¿Desea reactivar y agendar?`)) {
                const result = await reactivatePatientService(existing.id);
                if (!result.success) throw new Error(result.error);
                return existing;
            } else {
                throw new Error("Paciente inactivo - operación cancelada");
            }
        }
        return existing;
    }

    // Crear nuevo perfil usando servicio
    const result = await createPatientProfile(patientName);
    if (!result.success) throw new Error(result.error);
    return { id: result.id, ...result.data };
}

// Reagendar cita cancelada - Sistema de modal
let currentRescheduleAppointmentId = null;

window.rescheduleAppointment = function (appointmentId) {
    currentRescheduleAppointmentId = appointmentId;
    const appointment = patientsData.find(a => a.id === appointmentId);
    if (!appointment) return;

    document.getElementById('rescheduleModalTitle').textContent = `Reagendar cita de ${appointment.name}`;
    document.getElementById('rescheduleModal').classList.remove('hidden');
    document.getElementById('rescheduleOptions').classList.remove('hidden');
    document.getElementById('rescheduleSlots').classList.add('hidden');
};

window.closeRescheduleModal = function () {
    document.getElementById('rescheduleModal').classList.add('hidden');
    currentRescheduleAppointmentId = null;
};

window.backToRescheduleOptions = function () {
    document.getElementById('rescheduleOptions').classList.remove('hidden');
    document.getElementById('rescheduleSlots').classList.add('hidden');
};

window.showTodaySlots = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
        const slotTime = new Date(today);
        slotTime.setHours(hour, 0, 0, 0);

        if (isSlotFree(slotTime, patientsData) && slotTime > new Date()) {
            slots.push(slotTime);
        }
    }

    renderRescheduleSlots(slots, 'Horarios disponibles hoy');
};

window.showWeekSlots = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = [];
    for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);

        if (date.getDay() === 0) continue;

        for (let hour = 9; hour <= 20; hour++) {
            const slotTime = new Date(date);
            slotTime.setHours(hour, 0, 0, 0);

            if (isSlotFree(slotTime, patientsData) && slotTime > new Date()) {
                slots.push(slotTime);
            }
        }
    }

    renderRescheduleSlots(slots, 'Horarios disponibles esta semana');
};

function renderRescheduleSlots(slots, title) {
    document.getElementById('rescheduleOptions').classList.add('hidden');
    document.getElementById('rescheduleSlots').classList.remove('hidden');

    const slotsList = document.getElementById('rescheduleSlotsList');
    slotsList.innerHTML = '';

    if (slots.length === 0) {
        slotsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No hay horarios disponibles</p>';
        return;
    }

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-sm font-bold text-gray-700 mb-3';
    titleEl.textContent = title;
    slotsList.appendChild(titleEl);

    slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = 'w-full p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left';

        const dateStr = slot.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = slot.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        btn.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-semibold text-gray-800 capitalize">${dateStr}</div>
                    <div class="text-sm text-gray-600">${timeStr}</div>
                </div>
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        `;

        btn.onclick = async () => {
            if (!currentRescheduleAppointmentId) return;

            try {
                // Obtener cita actual
                const currentApt = patientsData.find(a => a.id === currentRescheduleAppointmentId);
                let newCost = currentApt.cost;

                // Si el costo es 0 o inválido, intentar recuperar el último costo conocido del paciente
                if (!newCost || parseFloat(newCost) === 0) {
                    const patientHistory = patientsData.filter(p => p.name === currentApt.name && parseFloat(p.cost) > 0);
                    if (patientHistory.length > 0) {
                        // Ordenar por fecha más reciente
                        patientHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                        newCost = patientHistory[0].cost;
                    }
                }

                await updateDoc(doc(db, collectionPath, currentRescheduleAppointmentId), {
                    date: slot.toISOString(),
                    isCancelled: false,
                    cancelledAt: null,
                    cost: newCost || currentApt.cost // Usar el nuevo costo recuperado o mantener el original
                });

                closeRescheduleModal();
                alert(`Cita reagendada para ${dateStr} a las ${timeStr}${newCost && newCost !== currentApt.cost ? `\n(Costo actualizado a $${newCost})` : ''}`);
            } catch (e) {
                console.error('Error al reagendar:', e);
                alert('Error al reagendar: ' + e.message);
            }
        };

        slotsList.appendChild(btn);
    });
}

// Event listeners
function setupEventListeners() {
    // Botón "Ver Dados de Baja" en la sección de pacientes
    const viewInactiveBtn = document.getElementById('viewInactivePatientsBtn');
    if (viewInactiveBtn) {
        viewInactiveBtn.onclick = openInactivePatientsModal;
    }
}
