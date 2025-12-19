/**
 * Sidebar.js
 * Componente para gestionar la barra lateral (Lista de Pacientes)
 */

import { PatientState } from '../managers/patient/PatientState.js';
import { PatientFilters } from '../managers/patient/PatientFilters.js';
import { PatientModals } from '../managers/patient/PatientModals.js';
import { PatientActions } from '../managers/patient/PatientActions.js';
import { formatTime12h } from '../utils/dateUtils.js';
import { ModalService } from '../utils/ModalService.js';

export const Sidebar = {

    /**
     * Inicializa el componente Sidebar
     */
    init() {
        console.log('📌 Inicializando Sidebar...');
        this._setupListeners();
    },

    /**
     * Configura los listeners de eventos para la Sidebar
     * @private
     */
    _setupListeners() {
        const { dom } = PatientState;

        // 1. Delegación de eventos para la LISTA DE PACIENTES (Clicks en tarjetas)
        if (dom.patientsList) {
            dom.patientsList.addEventListener('click', (e) => {
                const card = e.target.closest('.patient-card');

                // Si es un click en badges de deuda, no abrir historial inmediatamente (opcional)
                // Pero por ahora mantenemos comportamiento: click en card -> historial

                if (card) {
                    const patientId = card.dataset.patientId;
                    const patient = PatientState.patients.find(p => p.id === patientId);
                    if (patient) {
                        PatientModals.openHistory(patient);
                    }
                }
            });
        }

        // 2. HEADER DEL SIDEBAR (Botón agregar, Salir de inactivos)
        if (dom.patientsHeader) {
            dom.patientsHeader.addEventListener('click', (e) => {
                const addBtn = e.target.closest('#addPatientBtn');
                const exitInactiveBtn = e.target.closest('#exitInactiveModeBtn');

                if (addBtn) {
                    PatientModals.openNewPatient();
                } else if (exitInactiveBtn) {
                    PatientState.setViewMode('today');
                    this.render(); // Re-renderizar
                }
            });
        }

        // 3. Búsqueda en tiempo real
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', () => {
                this.render();
            });
        }

        // 4. Footer del Sidebar (Ver inactivos)
        if (dom.viewInactivePatientsBtn) {
            dom.viewInactivePatientsBtn.onclick = () => {
                PatientModals.openInactivePatients();
            };
        }

        console.log('  ✅ Sidebar listeners configurados');
    },

    /**
     * Renderiza la lista completa de pacientes
     */
    async render() {
        const { dom, viewMode } = PatientState;
        if (!dom.patientsList) return;

        try {
            const filters = PatientFilters;
            const searchTerm = (dom.searchInput?.value || '').toLowerCase();
            const showInactive = viewMode === 'inactive';

            // 1. Filtrar pacientes
            let filteredPatients = filters.filterBySelectedTherapist(PatientState.patients || []);

            // Filtro activo/inactivo
            filteredPatients = filteredPatients.filter(p => (p.isActive !== false) !== showInactive);

            const filteredCount = filteredPatients.length;

            // Filtro de búsqueda
            if (searchTerm) {
                filteredPatients = filteredPatients.filter(p =>
                    p.name.toLowerCase().includes(searchTerm)
                );
            }

            // 2. Ordenar alfabéticamente
            filteredPatients.sort((a, b) => a.name.localeCompare(b.name));

            // 3. Preparar items (headers y pacientes)
            let itemsToRender = [];

            if (!searchTerm && !showInactive) {
                const todayPatients = filters.getToday();
                const tomorrowPatients = filters.getTomorrow();
                const todayNames = new Set(todayPatients.map(p => p.name));
                const tomorrowNames = new Set(tomorrowPatients.map(p => p.name));

                // Sección HOY
                if (todayPatients.length > 0) {
                    itemsToRender.push({ type: 'header', label: 'Citas de Hoy', count: todayPatients.length, isToday: true });
                    itemsToRender.push(...todayPatients.map(p => ({ ...p, type: 'patient', isToday: true })));
                }

                // Sección MAÑANA
                if (tomorrowPatients.length > 0) {
                    itemsToRender.push({ type: 'header', label: 'Citas de Mañana', count: tomorrowPatients.length });
                    itemsToRender.push(...tomorrowPatients.map(p => ({ ...p, type: 'patient' })));
                }

                // Sección RESTO
                const remainingPatients = filteredPatients.filter(p => !todayNames.has(p.name) && !tomorrowNames.has(p.name));
                if (remainingPatients.length > 0) {
                    if (itemsToRender.length > 0) {
                        itemsToRender.push({ type: 'header', label: 'Todos los Pacientes', count: remainingPatients.length });
                    }
                    itemsToRender.push(...remainingPatients.map(p => ({ ...p, type: 'patient' })));
                } else if (itemsToRender.length === 0) {
                    // Si no hay hoy/mañana pero hay pacientes
                    itemsToRender = filteredPatients.map(p => ({ ...p, type: 'patient' }));
                }

            } else {
                itemsToRender = filteredPatients.map(p => ({ ...p, type: 'patient' }));
            }

            // 4. Renderizar al DOM
            dom.patientsList.innerHTML = '';

            if (itemsToRender.length === 0) {
                this._renderEmptyState(dom.patientsList, searchTerm);
            } else {
                this._renderItems(dom.patientsList, itemsToRender);
            }

            // 5. Actualizar header
            this._updateHeader(filteredCount);

        } catch (error) {
            console.error('❌ Sidebar: Error renderizando lista:', error);
        }
    },

    /**
     * Renderiza el encabezado del sidebar
     * @private
     */
    _updateHeader(currentCount) {
        const { dom, viewMode, activeCount, inactiveCount } = PatientState;
        if (!dom.patientsHeader) return;

        const isInactiveMode = viewMode === 'inactive';
        const countToShow = (currentCount !== undefined) ? currentCount : activeCount;

        let html = '';
        if (isInactiveMode) {
            html = `
                <div class="flex justify-between items-center bg-gray-100 p-2 rounded mb-2">
                    <h2 class="text-sm font-bold text-gray-700">Papelera (${inactiveCount})</h2>
                    <button id="exitInactiveModeBtn" class="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-white rounded border hover:bg-gray-50 transition-colors">
                        Volver a Todos
                    </button>
                </div>
            `;
        } else {
            html = `
                <div class="flex justify-between items-end mb-2">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800 tracking-tight">Pacientes</h2>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">${countToShow} activos</p>
                    </div>
                    <button id="addPatientBtn" class="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-md transition-all transform active:scale-95 group" title="Nuevo Paciente">
                        <svg class="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                </div>
            `;
        }
        dom.patientsHeader.innerHTML = html;
    },

    _renderEmptyState(container, searchTerm) {
        if (searchTerm) {
            container.innerHTML = `
                <div class="text-center py-10 px-4">
                    <div class="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <p class="text-sm text-gray-500 font-medium">No se encontraron pacientes para "${searchTerm}"</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center py-10 px-4">
                    <div class="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <h3 class="text-gray-900 font-bold mb-1">Sin Pacientes</h3>
                    <p class="text-xs text-gray-500 mb-4">Comienza registrando tu primer paciente.</p>
                </div>
            `;
        }
    },

    _renderItems(container, items) {
        let htmlContent = '';
        items.forEach(item => {
            if (item.type === 'header') {
                htmlContent += `
                    <div class="sticky top-0 bg-white/95 backdrop-blur-sm px-2 py-2 border-b border-gray-100 z-10 flex items-center justify-between mt-2 first:mt-0">
                        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider ${item.isToday ? 'text-blue-600' : ''}">${item.label}</h3>
                        <span class="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${item.count}</span>
                    </div>
                `;
            } else {
                htmlContent += this._createCard(item);
            }
        });
        container.innerHTML = htmlContent;
    },

    _createCard(patient) {
        const pendingApts = PatientFilters.getPendingPayments(patient.name);
        const hasDebt = pendingApts.length > 0;
        const totalDebt = pendingApts.reduce((sum, apt) => sum + (parseFloat(apt.cost) || 0), 0);

        const selectedCardClass = (PatientState.selectedPatientId === patient.id)
            ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500'
            : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md';

        const debtBadge = hasDebt
            ? `<div class="absolute top-2 right-2 z-10 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1 shadow-sm" title="Pago pendiente: $${totalDebt}">
                 <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                 $${totalDebt}
               </div>`
            : '';

        let timeBadge = '';
        let statusColor = 'bg-gray-200';

        if (patient.isToday && patient.appointmentTime) {
            timeBadge = `
                <div class="mt-2 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-100/50 px-2 py-1 rounded inline-block">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ${formatTime12h(patient.appointmentTime)}
                </div>
            `;
            statusColor = patient.confirmed ? 'bg-green-500' : 'bg-blue-500';
        }

        return `
            <div data-patient-id="${patient.id}"
                 class="patient-card group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${selectedCardClass} mb-2 active:scale-[0.98]">
                
                ${debtBadge}

                <div class="flex items-center gap-3">
                    <div class="relative flex-shrink-0">
                        <div class="w-10 h-10 rounded-full ${statusColor} text-white flex items-center justify-center text-sm font-bold shadow-sm">
                            ${patient.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${patient.therapist === 'sam' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'} text-[8px] font-bold flex items-center justify-center border border-white" title="${patient.therapist === 'sam' ? 'Sam' : 'Diana'}">${patient.therapist === 'sam' ? 'S' : 'D'}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate pr-14">
                            ${patient.name}
                        </h4>
                        ${timeBadge}
                    </div>
                </div>
            </div>
        `;
    }
};
