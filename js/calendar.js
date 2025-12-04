// calendar.js - Lógica del calendario y gestión de citas

import { db, userId, collectionPath, notificationsPath, patientsData, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, updatePatientsData, patientProfiles, subscribeToPatientsData } from './firebase.js';
import { ensurePatientProfile, findPatientByName, createPatientProfile, reactivatePatient } from './services/patientService.js';
import { getStartOfWeek, addDays, formatDateLocal, getWeekNumber } from './utils/dateUtils.js';
import { isSlotFree, checkSlotConflict, validateAppointment } from './utils/validators.js';
import { createAppointment, updateAppointment, deleteAppointment, togglePaymentStatus, toggleConfirmationStatus, cancelAppointment } from './services/appointmentService.js';
import { MiniCalendar } from './components/MiniCalendar.js';
import { AuthManager } from './managers/AuthManager.js';
import { PatientState } from './managers/patient/PatientState.js';

// Estado del calendario
let currentWeekStart = getStartOfWeek(new Date());
let miniCalendarMonth = new Date();
let selectedEventId = null;
let originalEventDate = null;
let miniCalendar;

// Referencias DOM
let calendarGrid, currentMonthLabel, prevWeekBtn, nextWeekBtn, todayBtn;
let miniCalendarGrid, miniMonthLabel, miniPrevBtn, miniNextBtn;
let eventModal, modalTitle, patientSearchInput, patientFirstNameInput, patientLastNameInput, appointmentDateInput, costInput;
let saveBtn, deleteBtn, payBtn, cancelBtn, rescheduleSection, rescheduleOptions;
let busySlotsContainer, busySlotsList, statusMsg;
let patientSuggestions, isRecurringCheckbox, recurringSection, recurringOptions, recurringDatesList;

// Inicializar referencias DOM
export function initCalendar() {
    console.log("initCalendar started");
    // Exponer renderCalendar globalmente
    window.renderCalendar = renderCalendar;

    try {
        calendarGrid = document.getElementById('calendarGrid');
        currentMonthLabel = document.getElementById('currentMonthLabel');
        prevWeekBtn = document.getElementById('prevWeekBtn');
        nextWeekBtn = document.getElementById('nextWeekBtn');
        todayBtn = document.getElementById('todayBtn');
        statusMsg = document.getElementById('statusMsg');

        miniCalendarGrid = document.getElementById('miniCalendarGrid');
        miniMonthLabel = document.getElementById('miniMonthLabel');
        miniPrevBtn = document.getElementById('miniPrevBtn');
        miniNextBtn = document.getElementById('miniNextBtn');

        eventModal = document.getElementById('eventModal');
        modalTitle = document.getElementById('modalTitle');
        patientSearchInput = document.getElementById('patientSearch');
        patientFirstNameInput = document.getElementById('patientFirstName');
        patientLastNameInput = document.getElementById('patientLastName');
        appointmentDateInput = document.getElementById('appointmentDate');
        costInput = document.getElementById('cost');
        saveBtn = document.getElementById('saveBtn');
        deleteBtn = document.getElementById('deleteBtn');
        payBtn = document.getElementById('payBtn');
        cancelBtn = document.getElementById('cancelBtn');
        rescheduleSection = document.getElementById('rescheduleSection');
        rescheduleOptions = document.getElementById('rescheduleOptions');
        busySlotsContainer = document.getElementById('busySlotsContainer');
        busySlotsList = document.getElementById('busySlotsList');

        // Nuevas referencias
        patientSuggestions = document.getElementById('patientSuggestions');
        isRecurringCheckbox = document.getElementById('isRecurring');
        recurringSection = document.getElementById('recurringSection');
        recurringOptions = document.getElementById('recurringOptions');
        recurringDatesList = document.getElementById('recurringDatesList');

        if (!calendarGrid) throw new Error("calendarGrid missing");
        if (!miniCalendarGrid) throw new Error("miniCalendarGrid missing");

        setupEventListeners();
        console.log("setupEventListeners done");
        setupListener();
        console.log("setupListener done");

    } catch (e) {
        console.error("Error in initCalendar:", e);
        if (statusMsg) statusMsg.textContent = "Error Init: " + e.message;
    }
}

// Populate Patient Suggestions
function populatePatientSuggestions() {
    if (!patientSuggestions) return;
    patientSuggestions.innerHTML = '';

    console.log("🔍 populatePatientSuggestions - Perfiles disponibles:", (PatientState?.patients || patientProfiles).length);
    if ((PatientState?.patients || patientProfiles).length > 0) {
        console.log("🔍 Nombres en perfiles:", (PatientState?.patients || patientProfiles).map(p => p.name));
    }

    const now = new Date();

    // Obtener terapeuta seleccionado
    const selectedTherapist = AuthManager.getSelectedTherapist();

    // Filtrar perfiles por terapeuta (usar PatientState si está disponible)
    const profiles = PatientState?.patients || patientProfiles;
    const filteredProfiles = profiles.filter(p => {
        if (selectedTherapist && selectedTherapist !== 'all') {
            return p.therapist === selectedTherapist;
        }
        if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
            return p.therapist === AuthManager.currentUser.therapist;
        }
        return true;
    });

    // Filtrar citas por terapeuta (usar PatientState si está disponible)
    const appointments = PatientState?.appointments || patientsData;
    const filteredAppointments = appointments.filter(apt => {
        if (selectedTherapist && selectedTherapist !== 'all') {
            return apt.therapist === selectedTherapist;
        }
        return true; // Si es 'all' o admin, consideramos todas las citas para sugerencias
    });

    // Obtener nombres únicos filtrados
    const profileNames = new Set(filteredProfiles.map(p => p.name));
    const appointmentNames = new Set(filteredAppointments.map(p => p.name));
    const allNames = new Set([...profileNames, ...appointmentNames]);

    const patientsList = Array.from(allNames);

    const patientsWithFutureAppointments = new Set(
        filteredAppointments
            .filter(p => new Date(p.date) > now && !p.isCancelled)
            .map(p => p.name)
    );

    const availablePatients = patientsList.filter(name => !patientsWithFutureAppointments.has(name)).sort();
    const scheduledPatients = patientsList.filter(name => patientsWithFutureAppointments.has(name)).sort();

    availablePatients.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        patientSuggestions.appendChild(option);
    });

    scheduledPatients.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        patientSuggestions.appendChild(option);
    });
}

// Analizar historial y sugerir horario
function analyzeAndSuggest(patientName) {
    const suggestionBox = document.getElementById('schedulingSuggestion');
    if (suggestionBox) suggestionBox.remove();

    if (!patientName) return;

    // Buscar citas pasadas no canceladas
    const history = patientsData.filter(p => p.name === patientName && !p.isCancelled);
    if (history.length < 1) return; // Necesitamos al menos una cita para sugerir

    // Verificar si ya tiene citas futuras
    const hasFuture = history.some(p => new Date(p.date) > new Date());
    if (hasFuture) return;

    // Encontrar patrón (Día de semana + Hora)
    const patterns = {};
    history.forEach(apt => {
        const d = new Date(apt.date);
        const key = `${d.getDay()}-${d.getHours()}`; // ej: "1-17" (Lunes 5pm)
        patterns[key] = (patterns[key] || 0) + 1;
    });

    // Encontrar el más frecuente
    let bestPattern = null;
    let maxCount = 0;
    for (const [key, count] of Object.entries(patterns)) {
        if (count > maxCount) {
            maxCount = count;
            bestPattern = key;
        }
    }

    if (bestPattern) {
        const [dayOfWeek, hour] = bestPattern.split('-').map(Number);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Calcular próxima fecha disponible
        const today = new Date();
        let nextDate = new Date();
        nextDate.setHours(hour, 0, 0, 0);

        // Avanzar hasta el día correcto
        let daysToAdd = (dayOfWeek + 7 - today.getDay()) % 7;
        if (daysToAdd === 0 && nextDate < today) daysToAdd = 7; // Si es hoy pero ya pasó la hora
        nextDate.setDate(today.getDate() + daysToAdd);

        // Verificar conflicto
        let isConflict = checkSlotConflict(nextDate.toISOString());
        // Si hay conflicto, buscar la siguiente semana
        if (isConflict) {
            nextDate.setDate(nextDate.getDate() + 7);
        }

        const dateStr = nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;

        // Crear elemento de sugerencia
        const container = document.getElementById('patientSearch').parentNode;
        const div = document.createElement('div');
        div.id = 'schedulingSuggestion';
        div.className = "mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-fade-in";
        div.innerHTML = `
            <div class="text-xs text-indigo-800">
                <span class="font-bold">💡 Sugerencia:</span> Suele venir los <span class="font-semibold">${days[dayOfWeek]} a las ${timeStr}</span>.
            </div>
            <button type="button" class="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors shadow-sm">
                Usar y Repetir
            </button>
        `;

        div.querySelector('button').onclick = () => {
            // Aplicar fecha
            const offset = nextDate.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(nextDate - offset)).toISOString().slice(0, 16);
            appointmentDateInput.value = localISOTime;

            // Activar recurrencia
            if (isRecurringCheckbox) {
                isRecurringCheckbox.checked = true;
                recurringSection.classList.remove('hidden');
                generateRecurringDates();
            }

            // Renderizar slots ocupados para la nueva fecha
            renderBusySlots(localISOTime.split('T')[0]);

            div.remove();
        };

        container.appendChild(div);
    }
}

// Generate Recurring Dates
function generateRecurringDates() {
    recurringDatesList.innerHTML = '';
    const startDateStr = appointmentDateInput.value;
    if (!startDateStr) return;

    const startDate = new Date(startDateStr);
    const dates = [];

    // Determinar terapeuta
    const currentFilter = AuthManager.getSelectedTherapist();
    const therapist = (currentFilter && currentFilter !== 'all') ? currentFilter : (AuthManager.currentUser?.therapist || 'diana');

    for (let i = 1; i <= 4; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + (i * 7));

        const isBusy = checkSlotConflict(nextDate.toISOString(), patientsData, null, therapist);

        dates.push({
            date: nextDate,
            isBusy: !!isBusy,
            conflictName: isBusy ? isBusy.name : null
        });
    }

    if (dates.length === 0) {
        recurringOptions.classList.add('hidden');
        return;
    }

    recurringOptions.classList.remove('hidden');

    dates.forEach((item, index) => {
        const dateStr = item.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = item.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = `flex items-center gap-2 p-2 rounded border ${item.isBusy ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'}`;

        if (item.isBusy) {
            div.innerHTML = `
                    <span class="text-red-500 text-xs font-bold">⚠ Ocupado</span>
                    <span class="text-xs text-gray-600 line-through">${dateStr} ${timeStr}</span>
                    <span class="text-xs text-gray-400">(${item.conflictName})</span>
                `;
        } else {
            div.innerHTML = `
                    <input type="checkbox" id="recurring_date_${index}" value="${item.date.toISOString()}" checked class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                    <label for="recurring_date_${index}" class="text-sm text-gray-700 cursor-pointer select-none">
                        ${dateStr} <span class="font-bold">${timeStr}</span>
                    </label>
                `;
        }
        recurringDatesList.appendChild(div);
    });
}

// Modal functions
function openCreateModal(dateStr, hour) {
    selectedEventId = null;
    originalEventDate = null;
    modalTitle.textContent = "Nueva Cita";

    const hStr = hour.toString().padStart(2, '0');
    appointmentDateInput.value = `${dateStr}T${hStr}:00`;
    patientSearchInput.value = '';
    patientFirstNameInput.value = '';
    patientLastNameInput.value = '';
    costInput.value = '';

    patientSearchInput.disabled = false;
    patientFirstNameInput.disabled = false;
    patientLastNameInput.disabled = false;
    appointmentDateInput.disabled = false;
    costInput.disabled = false;
    saveBtn.classList.remove('hidden');
    deleteBtn.classList.add('hidden');
    payBtn.classList.add('hidden');
    rescheduleSection.classList.add('hidden');

    if (recurringSection) {
        recurringSection.classList.remove('hidden');
        isRecurringCheckbox.checked = false;
        recurringOptions.classList.add('hidden');
    }

    populatePatientSuggestions();
    saveBtn.textContent = "Agendar";
    renderBusySlots(dateStr);
    eventModal.classList.remove('hidden');
}

function openEditModal(ev) {
    selectedEventId = ev.id;
    originalEventDate = ev.date;
    modalTitle.textContent = "Detalles de Cita";

    // Split name for inputs
    const parts = ev.name.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    patientSearchInput.value = ev.name;
    patientFirstNameInput.value = firstName;
    patientLastNameInput.value = lastName;
    appointmentDateInput.value = ev.date;
    costInput.value = ev.cost;

    const evDate = new Date(ev.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(evDate);
    eventDay.setHours(0, 0, 0, 0);

    const isPastDay = eventDay < today;

    // Siempre deshabilitar campos de nombre en modo edición para evitar duplicados
    patientSearchInput.disabled = true;
    patientFirstNameInput.disabled = true;
    patientLastNameInput.disabled = true;

    appointmentDateInput.disabled = isPastDay;
    costInput.disabled = isPastDay;

    deleteBtn.classList.remove('hidden');
    payBtn.classList.remove('hidden');
    rescheduleSection.classList.remove('hidden');

    if (recurringSection) {
        recurringSection.classList.add('hidden');
    }

    payBtn.textContent = ev.isPaid ? "Marcar Pendiente" : "Marcar Pagado";
    payBtn.className = `flex-1 py-2 rounded-lg font-medium transition-colors text-xs ${ev.isPaid ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`;
    payBtn.onclick = () => togglePayment(ev.id, ev.isPaid);

    let confirmBtn = document.getElementById('confirmBtn');
    if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirmBtn';
        payBtn.parentNode.insertBefore(confirmBtn, payBtn);
    }
    confirmBtn.className = `flex-1 py-2 rounded-lg font-medium transition-colors text-xs ml-2 ${ev.confirmed ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`;
    confirmBtn.innerHTML = ev.confirmed ?
        `<span class="flex items-center justify-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Confirmado</span>` :
        `Confirmar Asistencia`;
    confirmBtn.onclick = () => toggleConfirmation(ev.id, !!ev.confirmed);

    if (isPastDay) {
        saveBtn.classList.add('hidden');
        deleteBtn.classList.add('hidden');
        rescheduleSection.classList.add('hidden');
        confirmBtn.classList.add('hidden');
        modalTitle.textContent = "Detalles (Solo Lectura)";
    } else {
        saveBtn.classList.remove('hidden');
        deleteBtn.classList.remove('hidden');
        rescheduleSection.classList.remove('hidden');
        confirmBtn.classList.remove('hidden');
        saveBtn.textContent = "Guardar Cambios";
        generateRescheduleOptions(ev.date);
    }

    busySlotsContainer.classList.add('hidden');
    eventModal.classList.remove('hidden');
}

// CRUD Operations
async function saveEvent() {
    const firstName = patientFirstNameInput.value.trim();
    const lastName = patientLastNameInput.value.trim();
    const name = `${firstName} ${lastName}`.trim();
    const date = appointmentDateInput.value;
    const cost = costInput.value;

    if (!firstName || !lastName || !date) return alert("Faltan datos (Nombre, Apellidos o Fecha)");

    // Validar que el costo sea obligatorio y mayor a 0
    if (!cost || parseFloat(cost) <= 0) {
        costInput.focus();
        return alert("⚠️ El costo es obligatorio y debe ser mayor a 0");
    }

    // Determinar el terapeuta para esta cita
    // Si hay un filtro seleccionado (y no es 'all'), usar ese. Si no, usar el del usuario actual.
    const currentFilter = AuthManager.getSelectedTherapist();
    const therapist = (currentFilter && currentFilter !== 'all') ? currentFilter : (AuthManager.currentUser?.therapist || 'diana');

    // Verificar si el paciente ya tiene cita esta semana (solo para citas nuevas)
    if (!selectedEventId) {
        const selectedDate = new Date(date);
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const existingAppointmentsThisWeek = patientsData.filter(apt => {
            if (apt.name !== name || apt.isCancelled) return false;
            const aptDate = new Date(apt.date);
            return aptDate >= startOfWeek && aptDate < endOfWeek;
        });

        if (existingAppointmentsThisWeek.length > 0) {
            const existingApt = existingAppointmentsThisWeek[0];
            const existingDate = new Date(existingApt.date);
            const dayName = existingDate.toLocaleDateString('es-ES', { weekday: 'long' });
            const dateStr = existingDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            const timeStr = existingDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const confirmed = confirm(
                `⚠️ ADVERTENCIA: CITA DUPLICADA\n\n` +
                `El paciente "${name}" ya tiene una cita esta semana:\n\n` +
                `📅 ${dayName}, ${dateStr}\n` +
                `🕒 ${timeStr}\n\n` +
                `¿Deseas agendar otra cita de todas formas?`
            );

            if (!confirmed) {
                return; // Cancelar la creación de la cita
            }
        }
    }

    const conflict = checkSlotConflict(date, patientsData, selectedEventId, therapist);
    if (conflict) {
        const conflictTime = new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return alert(`⚠️ HORARIO OCUPADO\n\nLa hora ${conflictTime} ya está agendada para:\n"${conflict.name}"\n\nPor favor selecciona otro horario disponible.`);
    }

    try {
        await ensurePatientProfile(name, firstName, lastName);

        if (selectedEventId) {
            // Edición
            const result = await updateAppointment(selectedEventId, { name, date, cost }, patientsData);
            if (!result.success) throw new Error(result.error);

            if (originalEventDate && originalEventDate !== date) {
                await addDoc(collection(db, notificationsPath), {
                    patientName: name,
                    oldDate: originalEventDate,
                    newDate: date,
                    timestamp: serverTimestamp(),
                    isRead: false,
                    createdBy: userId
                });
            }
        } else {
            // Creación
            const appointmentsToCreate = [{ name, date, cost }];

            if (isRecurringCheckbox && isRecurringCheckbox.checked) {
                const checkboxes = recurringDatesList.querySelectorAll('input[type="checkbox"]:checked');
                checkboxes.forEach(cb => {
                    appointmentsToCreate.push({
                        name,
                        date: cb.value,
                        cost,
                        therapist: therapist
                    });
                });
            }

            // Add therapist to the main appointment too
            appointmentsToCreate[0].therapist = therapist;

            const results = await Promise.all(appointmentsToCreate.map(appt => createAppointment(appt, patientsData)));

            const errors = results.filter(r => !r.success);
            if (errors.length > 0) {
                if (errors.length === results.length) {
                    throw new Error(errors[0].error);
                }
                alert(`⚠️ Atención: Se crearon ${results.length - errors.length} citas, pero ${errors.length} fallaron.`);
            }
        }
        closeModal();
    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    }
}

async function deleteEvent() {
    if (!selectedEventId) return;

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="deleteActionModal">
            <div class="bg-white rounded-xl p-6 w-96 shadow-2xl transform transition-all scale-100">
                <h3 class="text-xl font-bold text-gray-800 mb-4">¿Qué deseas hacer?</h3>
                <p class="text-gray-600 mb-6">Puedes reagendar esta cita para otro momento o cancelarla definitivamente.</p>
                
                <div class="flex flex-col gap-3">
                    <button id="btnReschedule" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Reagendar Cita
                    </button>
                    
                    <button id="btnCancelAppt" class="w-full bg-red-100 text-red-700 py-3 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        Cancelar Cita
                    </button>
                    
                    <button id="btnBack" class="w-full text-gray-500 py-2 font-medium hover:text-gray-700 mt-2">
                        Volver
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('deleteActionModal');

    document.getElementById('btnReschedule').onclick = () => {
        modal.remove();
        closeModal();
        if (window.rescheduleAppointment) {
            window.rescheduleAppointment(selectedEventId);
        }
    };

    document.getElementById('btnCancelAppt').onclick = async () => {
        if (confirm('¿Estás seguro de cancelar esta cita? Quedará en el historial como cancelada.')) {
            const result = await cancelAppointment(selectedEventId);
            if (result.success) {
                modal.remove();
                closeModal();
            } else {
                alert("Error al cancelar: " + result.error);
            }
        }
    };

    document.getElementById('btnBack').onclick = () => {
        modal.remove();
    };
}

async function togglePayment(id, currentStatus) {
    const result = await togglePaymentStatus(id, currentStatus);
    if (result.success) {
        if (selectedEventId === id) {
            const payBtn = document.getElementById('payBtn');
            if (payBtn) {
                payBtn.textContent = result.newState ? "Marcar Pendiente" : "Marcar Pagado";
                payBtn.className = `flex-1 py-2 rounded-lg font-medium transition-colors text-xs ${result.newState ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`;
                payBtn.onclick = () => togglePayment(id, result.newState);
            }
        }
    } else {
        alert("Error: " + result.error);
    }
}

async function toggleConfirmation(id, currentStatus) {
    const result = await toggleConfirmationStatus(id, currentStatus);
    if (result.success) {
        if (selectedEventId === id) {
            const confirmBtn = document.getElementById('confirmBtn');
            if (confirmBtn) {
                confirmBtn.className = `flex-1 py-2 rounded-lg font-medium transition-colors text-xs ml-2 ${result.newState ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`;
                confirmBtn.innerHTML = result.newState ?
                    `<span class="flex items-center justify-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Confirmado</span>` :
                    `Confirmar Asistencia`;
                confirmBtn.onclick = () => toggleConfirmation(id, result.newState);
            }
        }
        // Refresh calendar to show confirmation status in cells
        renderCalendar();
    } else {
        alert("Error: " + result.error);
    }
}

// Event listeners
function setupEventListeners() {
    // Inicializar Mini Calendario
    miniCalendar = new MiniCalendar({
        container: miniCalendarGrid,
        monthLabel: miniMonthLabel,
        onDateSelect: (date) => {
            currentWeekStart = getStartOfWeek(date);
            renderCalendar();
            miniCalendar.setWeekStart(currentWeekStart);
        },
        onWeekSelect: (date) => {
            currentWeekStart = getStartOfWeek(date);
            renderCalendar();
            miniCalendar.setWeekStart(currentWeekStart);
        }
    });

    // Render inicial
    miniCalendar.render();

    prevWeekBtn.onclick = () => {
        currentWeekStart = addDays(currentWeekStart, -7);
        renderCalendar();
        miniCalendar.setWeekStart(currentWeekStart);
    };

    nextWeekBtn.onclick = () => {
        currentWeekStart = addDays(currentWeekStart, 7);
        renderCalendar();
        miniCalendar.setWeekStart(currentWeekStart);
    };

    todayBtn.onclick = () => {
        currentWeekStart = getStartOfWeek(new Date());
        renderCalendar();

        miniCalendar.setMonth(new Date());
        miniCalendar.setWeekStart(currentWeekStart);

        // Flash animation en el día de hoy
        setTimeout(() => {
            const todayEl = document.getElementById('todayInMiniCalendar');
            if (todayEl) {
                todayEl.classList.add('animate-pulse');
                setTimeout(() => {
                    todayEl.classList.remove('animate-pulse');
                }, 1500);
            }
        }, 100);
    };

    miniPrevBtn.onclick = () => miniCalendar.prevMonth();
    miniNextBtn.onclick = () => miniCalendar.nextMonth();

    // Suscribirse a cambios en los datos para actualizar el calendario
    subscribeToPatientsData(() => {
        renderCalendar();
    });

    saveBtn.onclick = saveEvent;
    deleteBtn.onclick = deleteEvent;
    cancelBtn.onclick = closeModal;

    patientSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        analyzeAndSuggest(val);

        // Auto-fill inputs if name matches existing
        if (val) {
            const parts = val.split(' ');
            if (parts.length > 0) {
                patientFirstNameInput.value = parts[0];
                patientLastNameInput.value = parts.slice(1).join(' ');
            }
        }
    });

    appointmentDateInput.addEventListener('change', () => {
        const selectedDateTime = appointmentDateInput.value;
        if (selectedDateTime) {
            const dateOnly = selectedDateTime.split('T')[0];
            renderBusySlots(dateOnly);

            if (isRecurringCheckbox && isRecurringCheckbox.checked) {
                generateRecurringDates();
            }
        }
    });

    if (isRecurringCheckbox) {
        isRecurringCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                generateRecurringDates();
                recurringOptions.classList.remove('hidden');
                setTimeout(() => {
                    recurringOptions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else {
                recurringOptions.classList.add('hidden');
            }
        });
    }
}

// Funciones de utilidad locales
function updateStatus(msg) {
    if (statusMsg) statusMsg.textContent = msg;
}

// Listener de Firestore para citas
function setupListener() {
    const colRef = collection(db, collectionPath);
    const q = query(colRef);

    onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        updatePatientsData(data);

        const source = snapshot.metadata.fromCache ? "caché local" : "servidor";
        updateStatus(`${data.length} citas (${source})`);
        renderCalendar();
        if (miniCalendar) miniCalendar.render();
    }, (error) => {
        console.error("Error Snapshot: " + error.message);
    });
}

// Renderizar calendario semanal
export function renderCalendar() {
    try {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const day = addDays(currentWeekStart, i);
            if (day.getDay() !== 0) {
                weekDays.push(day);
            }
        }

        const monthYear = currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (currentMonthLabel) currentMonthLabel.textContent = monthYear;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const headerRow = document.createElement('div');
        headerRow.className = "grid grid-cols-7 sticky top-0 bg-white z-20 border-b-2 border-gray-200";

        const emptyCell = document.createElement('div');
        emptyCell.className = "p-3 border-r border-gray-200 text-center";
        emptyCell.innerHTML = '<div class="text-xs font-semibold text-gray-500 uppercase">Hora</div>';
        headerRow.appendChild(emptyCell);

        weekDays.forEach((dayDate) => {
            const dayHeader = document.createElement('div');
            const isToday = dayDate.getTime() === today.getTime();
            dayHeader.className = `p-3 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`;

            const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = dayDate.getDate();
            dayHeader.innerHTML = `
            <div class="text-xs font-semibold text-gray-500 uppercase">${dayName}</div>
            <div class="text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-800'}">${dayNum}</div>
        `;
            headerRow.appendChild(dayHeader);
        });

        calendarGrid.appendChild(headerRow);

        for (let hour = 9; hour <= 20; hour++) {
            const row = document.createElement('div');
            const rowColor = hour % 2 === 0 ? 'bg-gray-50/50' : 'bg-white';
            row.className = `grid grid-cols-7 ${rowColor}`;

            const hourCell = document.createElement('div');
            hourCell.className = "p-2 border-r border-b border-gray-200 text-right";
            hourCell.innerHTML = `<span class="text-xs font-medium text-gray-500">${hour.toString().padStart(2, '0')}:00</span>`;
            row.appendChild(hourCell);

            weekDays.forEach((dayDate) => {
                const isToday = dayDate.getTime() === today.getTime();
                const cell = document.createElement('div');
                cell.className = `h-16 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-blue-50/60 transition-colors relative group last:border-r-0 ${isToday ? 'bg-blue-50/40' : ''}`;

                let dateStr;
                try {
                    dateStr = formatDateLocal(dayDate);
                } catch (err) {
                    console.error("Error formatting date", err);
                    dateStr = "";
                }

                // Buscar TODAS las citas en este horario (para soportar colisiones en vista 'Todos')
                const slotEvents = patientsData.filter(p => {
                    const pDate = new Date(p.date);
                    let pDateStr;
                    try { pDateStr = formatDateLocal(pDate); } catch (e) { return false; }
                    return pDateStr === dateStr && pDate.getHours() === hour && !p.isCancelled;
                });



                const selectedTherapist = AuthManager.getSelectedTherapist();
                // console.log("Renderizando celda con filtro:", selectedTherapist); // Debug opcional
                const isViewAll = !selectedTherapist || selectedTherapist === 'all';

                // --- LÓGICA DE RENDERIZADO ---

                if (isViewAll) {
                    // === VISTA "TODOS" (Resumen Visual) ===
                    if (slotEvents.length > 0) {
                        const container = document.createElement('div');
                        container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5"; // Stack vertical

                        slotEvents.forEach(evt => {
                            const therapistName = (evt.therapist || 'diana') === 'diana' ? 'Diana' : 'Sam';
                            const bgColor = (evt.therapist || 'diana') === 'diana' ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-blue-100 text-blue-800 border-blue-200';

                            const chip = document.createElement('div');
                            chip.className = `flex-1 flex items-center justify-center text-[10px] font-bold rounded border ${bgColor} cursor-pointer hover:brightness-95 truncate`;
                            chip.textContent = `${therapistName} Ocupada`;
                            chip.title = `${therapistName}: ${evt.name}`; // Tooltip con el nombre real

                            chip.onclick = (e) => {
                                e.stopPropagation();
                                openEditModal(evt);
                            };
                            container.appendChild(chip);
                        });
                        cell.appendChild(container);
                    } else {
                        // Slot vacío en vista Todos
                        renderEmptySlot(cell, dateStr, hour);
                    }

                } else {
                    // === VISTA INDIVIDUAL (Detalle Completo) ===
                    // Filtrar eventos específicos para el terapeuta seleccionado
                    const matchingEvents = slotEvents.filter(p => {
                        const apptTherapist = p.therapist || 'diana';
                        return apptTherapist === selectedTherapist;
                    });

                    if (matchingEvents.length > 0) {
                        // Contenedor para múltiples citas (stack vertical)
                        const container = document.createElement('div');
                        container.className = "absolute inset-0 flex flex-col gap-0.5 p-0.5 overflow-hidden";

                        matchingEvents.forEach(evt => {
                            const eventCard = document.createElement('div');
                            const isPaid = evt.isPaid;
                            const isConfirmed = evt.confirmed;

                            // Ajustar altura si hay múltiples
                            const heightClass = matchingEvents.length > 1 ? 'flex-1 min-h-0' : 'h-full';

                            eventCard.className = `${heightClass} rounded-md shadow-sm text-xs font-medium cursor-pointer transition-all hover:shadow-md px-1.5 py-0.5 flex flex-col justify-center ${isPaid ? 'bg-green-600 text-white' : 'bg-red-100 text-red-800 border border-red-200'}`;

                            eventCard.innerHTML = `
                                <div class="flex items-center justify-between gap-1 w-full">
                                    <div class="truncate font-semibold flex-1 leading-tight">${evt.name}</div>
                                    ${isConfirmed ? `<div class="flex-shrink-0 ${isPaid ? 'bg-blue-500' : 'bg-blue-600'} text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px]" title="Confirmado">✓</div>` : ''}
                                </div>
                                ${matchingEvents.length === 1 ? `<div class="text-[10px] opacity-90 leading-tight">$${evt.cost || '0'}</div>` : ''}
                            `;

                            eventCard.onclick = (e) => {
                                e.stopPropagation();
                                openEditModal(evt);
                            };

                            container.appendChild(eventCard);
                        });

                        cell.appendChild(container);
                    } else {
                        // Slot vacío en vista Individual
                        renderEmptySlot(cell, dateStr, hour);
                    }
                }

                row.appendChild(cell);
            });

            calendarGrid.appendChild(row);
        }
    } catch (e) {
        console.error("Error Render:", e);
        updateStatus("Error Render: " + e.message);
    }
}

// Helper para renderizar slot vacío
function renderEmptySlot(cell, dateStr, hour) {
    const now = new Date();
    // Reconstruir fecha del slot para comparar
    // Nota: dateStr viene formateado, necesitamos el objeto fecha base del día
    // Como optimización, podríamos pasar el objeto dayDate, pero aquí usaremos lógica simple visual

    const hoverText = document.createElement('div');
    hoverText.className = "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none";
    hoverText.innerHTML = `<span class="text-xs font-medium text-gray-400">Disponible</span>`;
    cell.appendChild(hoverText);

    cell.onclick = () => {
        openCreateModal(dateStr, hour);
    };
}

// Helper functions for modals
function renderBusySlots(dateStr) {
    // Determinar terapeuta
    const currentFilter = AuthManager.getSelectedTherapist();
    const therapist = (currentFilter && currentFilter !== 'all') ? currentFilter : (AuthManager.currentUser?.therapist || 'diana');

    const busySlots = patientsData.filter(p => {
        // Filtrar por terapeuta
        const apptTherapist = p.therapist || 'diana';
        if (apptTherapist !== therapist) return false;

        const pDate = new Date(p.date);
        let pDateStr;
        try { pDateStr = formatDateLocal(pDate); } catch (e) { return false; }
        return pDateStr === dateStr;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (busySlots.length === 0) {
        busySlotsContainer.classList.add('hidden');
        return;
    }

    busySlotsContainer.classList.remove('hidden');
    busySlotsList.innerHTML = '';

    busySlots.forEach(slot => {
        const slotDate = new Date(slot.date);
        const hour = slotDate.getHours();
        const minute = slotDate.getMinutes();
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const slotEl = document.createElement('div');
        slotEl.className = "flex items-center justify-between bg-red-50 border border-red-200 rounded px-2 py-1.5";
        slotEl.innerHTML = `
            <span class="text-xs font-semibold text-red-700">${timeStr}</span>
            <span class="text-xs text-red-600 truncate ml-2">${slot.name}</span>
        `;
        busySlotsList.appendChild(slotEl);
    });
}

function generateRescheduleOptions(currentDateStr) {
    rescheduleOptions.innerHTML = '';
    const current = new Date(currentDateStr);

    // Generate reschedule suggestions for next 7 days
    for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(current);
        futureDate.setDate(futureDate.getDate() + i);

        if (futureDate.getDay() === 0) continue; // Skip Sundays

        // Obtener el terapeuta de la cita original para buscar slots libres en SU calendario
        const appointment = patientsData.find(p => p.id === selectedEventId);
        const therapist = appointment ? appointment.therapist : (AuthManager.currentUser?.therapist || 'diana');

        if (isSlotFree(futureDate, patientsData, selectedEventId, therapist)) {
            const label = futureDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            createRescheduleChip(label, futureDate);
        }
    }
}

function createRescheduleChip(label, dateObj) {
    const btn = document.createElement('button');
    btn.className = 'px-3 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-600 border-blue-100 hover:brightness-95 transition-all';
    const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    btn.textContent = `${label} (${timeStr})`;
    btn.onclick = async () => {
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
        appointmentDateInput.value = localISOTime;
        if (selectedEventId) {
            await saveEvent();
        }
    };
    rescheduleOptions.appendChild(btn);
}

function closeModal() {
    eventModal.classList.add('hidden');
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) confirmBtn.remove();
    busySlotsContainer.classList.add('hidden');
    originalEventDate = null;
}
