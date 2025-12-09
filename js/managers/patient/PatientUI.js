/**
 * PatientUI.js
 * Gestión de UI y renderizado de pacientes
 * 
 * Este módulo es responsable de:
 * - Renderizar la lista de pacientes
 * - Renderizar el header con contadores
 * - Renderizar tarjetas individuales de pacientes
 * - Configurar event listeners de UI
 * 
 * NO maneja:
 * - Lógica de negocio (ver PatientActions.js)
 * - Filtrado de datos (ver PatientFilters.js)
 * - Estado (ver PatientState.js)
 * 
 * @module PatientUI
 */

import { PatientState } from './PatientState.js';
import { PatientFilters } from './PatientFilters.js';
import { AuthManager } from '../AuthManager.js';

/**
 * Gestión de UI y renderizado
 */
export const PatientUI = {

    // ==========================================
    // RENDERIZADO PRINCIPAL
    // ==========================================

    /**
     * Renderiza la lista completa de pacientes según el modo actual
     * Este es el método principal que coordina todo el renderizado
     */
    renderList() {
        const { dom, viewMode } = PatientState;
        if (!dom.patientsList) {
            console.warn('⚠️ PatientUI: DOM no inicializado');
            return;
        }

        try {
            // 1. Obtener pacientes activos filtrados por terapeuta
            const activePatients = PatientFilters.filterBySelectedTherapist(PatientState.patients);

            // 2. Aplicar filtro según modo de vista
            let patientsToShow;
            switch (viewMode) {
                case 'today':
                    patientsToShow = this._filterTodayPatients(activePatients);
                    break;
                case 'tomorrow':
                    patientsToShow = this._filterTomorrowPatients(activePatients);
                    break;
                default:
                    patientsToShow = activePatients;
            }

            // 3. Agregar totales de pagos
            const patientsWithTotals = PatientFilters.addPaymentTotals(patientsToShow);

            // 4. Para vista "all", agregar info de próximas citas confirmadas
            if (viewMode === 'all') {
                this._addUpcomingAppointmentInfo(patientsWithTotals);
            }

            // 5. Ordenar según el modo
            this._sortPatients(patientsWithTotals, viewMode);

            // 6. Actualizar header con contadores
            this._updateHeader(patientsWithTotals.length);

            // 7. Renderizar lista de pacientes
            this._renderPatientItems(patientsWithTotals);

        } catch (error) {
            console.error('❌ PatientUI: Error rendering list:', error);
            alert('Error al renderizar lista de pacientes: ' + error.message);
        }
    },

    // ==========================================
    // RENDERIZADO DE HEADER
    // ==========================================

    /**
     * Actualiza el header con contadores y botones
     * @private
     * @param {number} count - Cantidad de pacientes en la vista actual
     */
    _updateHeader(count) {
        const { dom, viewMode } = PatientState;
        if (!dom.patientsHeader) return;

        const totalActive = PatientFilters.filterBySelectedTherapist(PatientState.patients).length;
        const todayCount = PatientFilters.getToday().length;
        const tomorrowCount = PatientFilters.getTomorrow().length;

        const modeLabels = {
            'today': `HOY (${count})`,
            'tomorrow': `MAÑANA (${count})`,
            'all': `ACTIVOS (${count})`
        };

        dom.patientsHeader.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-600">
                        ${modeLabels[viewMode] || `ACTIVOS (${count})`}
                    </span>
                    <button id="btnNewPatient" onclick="event.stopPropagation(); event.preventDefault(); window.PatientManager.api.openNewPatient();" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors flex items-center gap-1" title="Crear nuevo paciente">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Nuevo
                    </button>
                </div>
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
            </div>
        `;

        // Adjuntar listeners a los botones
        this._attachHeaderListeners();
    },

    /**
     * Adjunta event listeners a los botones del header
     * @private
     */
    _attachHeaderListeners() {
        document.getElementById('btnViewToday')?.addEventListener('click', () => {
            PatientState.setViewMode('today');
            this.renderList();
        });

        document.getElementById('btnViewTomorrow')?.addEventListener('click', () => {
            PatientState.setViewMode('tomorrow');
            this.renderList();
        });

        document.getElementById('btnViewAll')?.addEventListener('click', () => {
            PatientState.setViewMode('all');
            this.renderList();
        });


    },

    // ==========================================
    // RENDERIZADO DE ITEMS
    // ==========================================

    /**
     * Renderiza la lista de tarjetas de pacientes
     * @private
     * @param {Array<Object>} patients - Lista de pacientes a renderizar
     */
    _renderPatientItems(patients) {
        const { dom, viewMode } = PatientState;

        if (patients.length === 0) {
            const emptyMessages = {
                'today': 'No hay citas para hoy',
                'tomorrow': 'No hay citas para mañana',
                'all': 'No hay pacientes activos'
            };

            dom.patientsList.innerHTML = `
                <p class="text-xs text-gray-400 text-center py-4">
                    ${emptyMessages[viewMode] || 'No hay pacientes'}
                </p>
            `;
            return;
        }

        dom.patientsList.innerHTML = '';

        patients.forEach(patient => {
            const patientEl = this._createPatientCard(patient, viewMode);
            dom.patientsList.appendChild(patientEl);
        });
    },

    /**
     * Crea una tarjeta individual de paciente
     * @private
     * @param {Object} patient - Datos del paciente
     * @param {string} viewMode - Modo de vista actual
     * @returns {HTMLElement} Elemento DOM de la tarjeta
     */
    _createPatientCard(patient, viewMode) {
        const patientEl = document.createElement('div');
        patientEl.className = 'p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-b-0';

        const pendingRatio = patient.totalPending / (patient.totalPaid + patient.totalPending);
        const pendingColor = pendingRatio > 0.5 ? 'text-red-600 font-semibold' : 'text-orange-600';

        // Obtener pagos pendientes
        const pendingPayments = PatientFilters.getPendingPayments(patient.name);

        // Generar badge de confirmación y hora
        let timeStr = '';
        let confirmBadge = '';

        // Para hoy/mañana: mostrar hora y confirmación
        if ((viewMode === 'today' || viewMode === 'tomorrow') && patient.nextAppointment) {
            timeStr = patient.nextAppointment.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const confirmText = patient.confirmed ? '✓ OK' : '⏳ Pendiente';
            const confirmClass = patient.confirmed
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700';

            confirmBadge = `<button
                onclick="event.stopPropagation(); toggleConfirmationFromList('${patient.name}')"
                class="text-[10px] ${confirmClass} px-1.5 py-0.5 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer"
                title="Click para ${patient.confirmed ? 'desconfirmar' : 'confirmar'}"
            >${confirmText}</button>`;
        }
        // Para "todos": mostrar solo si tiene cita próxima
        else if (viewMode === 'all' && patient.nextAppointment) {
            const aptDate = patient.nextAppointment;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Determinar si es hoy o mañana
            let dayLabel = '';
            if (aptDate >= today && aptDate < tomorrow) {
                dayLabel = 'Hoy';
            } else if (aptDate >= tomorrow && aptDate < dayAfterTomorrow) {
                dayLabel = 'Mañana';
            }

            if (dayLabel) {
                timeStr = aptDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Mostrar badge con estado de confirmación
                if (patient.confirmed) {
                    confirmBadge = `<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">✓ ${dayLabel}</span>`;
                } else {
                    // Mostrar en naranja si NO está confirmada (alerta para recepcionista)
                    confirmBadge = `<span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">⏳ ${dayLabel}</span>`;
                }
            }
        }

        const canViewDetails = AuthManager.canViewDetails(patient);

        patientEl.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    <div class="font-bold text-gray-800">
                        ${patient.name}
                    </div>
                    ${canViewDetails ? confirmBadge : confirmBadge.replace('<button', '<span').replace('</button>', '</span>').replace(/onclick=".*?"/, '')}
                </div>
                ${timeStr ? `<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">🕒 ${timeStr}</div>` : ''}
            </div>

            ${canViewDetails ? `
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
            ` : ''} 
        `;

        // Click handler para abrir historial (solo si tiene permisos)
        if (canViewDetails) {
            patientEl.onclick = () => {
                if (window.openPatientHistoryModal) {
                    window.openPatientHistoryModal(patient);
                }
            };
        } else {
            patientEl.classList.add('opacity-75');
            patientEl.classList.remove('cursor-pointer', 'hover:bg-blue-50');
            patientEl.classList.add('cursor-default');
        }

        return patientEl;
    },

    // ==========================================
    // MÉTODOS AUXILIARES PRIVADOS
    // ==========================================

    /**
     * Filtra pacientes activos que tienen cita hoy
     * @private
     */
    _filterTodayPatients(activePatients) {
        const todayPatients = PatientFilters.getToday();
        return activePatients
            .filter(p => todayPatients.some(tp => tp.name === p.name))
            .map(p => {
                const todayData = todayPatients.find(tp => tp.name === p.name);
                return {
                    ...p,
                    nextAppointment: todayData.appointmentTime,
                    confirmed: todayData.confirmed
                };
            });
    },

    /**
     * Filtra pacientes activos que tienen cita mañana
     * @private
     */
    _filterTomorrowPatients(activePatients) {
        const tomorrowPatients = PatientFilters.getTomorrow();
        return activePatients
            .filter(p => tomorrowPatients.some(tp => tp.name === p.name))
            .map(p => {
                const tomorrowData = tomorrowPatients.find(tp => tp.name === p.name);
                return {
                    ...p,
                    nextAppointment: tomorrowData.appointmentTime,
                    confirmed: tomorrowData.confirmed
                };
            })
            .sort((a, b) => a.nextAppointment - b.nextAppointment);
    },

    /**
     * Agrega información de próximas citas a los pacientes (para vista "all")
     * @private
     * @param {Array<Object>} patients - Lista de pacientes a enriquecer (se modifica in-place)
     */
    _addUpcomingAppointmentInfo(patients) {
        const now = new Date();
        const appointments = PatientState.appointments || [];

        patients.forEach(patient => {
            // Buscar próximas citas del paciente (no canceladas, futuras)
            const upcomingAppointments = appointments
                .filter(apt =>
                    apt.name === patient.name &&
                    new Date(apt.date) >= now &&
                    !apt.isCancelled
                )
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (upcomingAppointments.length > 0) {
                const nextApt = upcomingAppointments[0];
                patient.nextAppointment = new Date(nextApt.date);
                patient.confirmed = nextApt.confirmed || false;
            }
        });
    },

    /**
     * Ordena la lista de pacientes según el modo de vista
     * @private
     * @param {Array<Object>} patients - Lista a ordenar (se modifica in-place)
     * @param {string} mode - Modo de vista
     */
    _sortPatients(patients, mode) {
        if (mode === 'today' || mode === 'tomorrow') {
            patients.sort((a, b) => {
                if (a.nextAppointment && b.nextAppointment) {
                    return a.nextAppointment - b.nextAppointment;
                }
                return 0;
            });
        } else {
            patients.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        }
    }
};
