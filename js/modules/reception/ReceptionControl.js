/**
 * ReceptionControl.js
 * Módulo de Gestión Maestra para Recepción.
 * Permite ver a todos los pacientes, sus saldos y estados de cita de forma rápida.
 */

import { AuthManager } from '../../managers/AuthManager.js';
import { PatientState } from '../../managers/patient/PatientState.js';
import { PatientActions } from '../../managers/patient/PatientActions.js';
import { PatientFilters } from '../../managers/patient/PatientFilters.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { CalendarData } from '../calendar/CalendarData.js';
import { PatientModals } from '../../managers/patient/PatientModals.js';
import { WhatsAppMessaging } from '../../services/WhatsAppMessaging.js';

export const ReceptionControl = {
    isInitialized: false,

    async init() {
        if (this.isInitialized) return;

        // Solo inyectar si el usuario tiene permiso (Admin o Recepción)
        const canAccess = AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist';
        console.log(`🛡️ ReceptionControl Check: Role=${AuthManager.currentUser?.role}, Access=${canAccess}`);
        
        if (canAccess) {
            this.injectHTML();
            this.bindEvents();
            this.showControlBtn();
        } else {
            // SEGURIDAD MÁXIMA: Si no tiene permiso, asegurar que los botones no existan en el DOM
            const headerBtn = document.getElementById('openReceptionControlBtn');
            const sidebarBtn = document.getElementById('sidebarReceptionBtn');
            if (headerBtn) headerBtn.style.setProperty('display', 'none', 'important');
            if (sidebarBtn) {
                sidebarBtn.parentElement?.style.setProperty('display', 'none', 'important');
            }
        }
        
        this.isInitialized = true;
    },

    showControlBtn() {
        const headerBtns = document.querySelector('header .flex.items-center.gap-2') || document.querySelector('header .flex.items-center.gap-4');
        if (headerBtns) {
            const btnHtml = `
                <button id="openReceptionControlBtn" 
                    class="flex items-center gap-2 px-3 py-2 md:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-500/30">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    <span class="hidden md:inline">Control Maestro</span>
                </button>
            `;
            // Insertar antes del botón de Cerrar Sesión o al final
            const logoutBtn = document.getElementById('logoutBtn') || headerBtns.lastElementChild;
            if (logoutBtn) {
                logoutBtn.insertAdjacentHTML('beforebegin', btnHtml);
            } else {
                headerBtns.insertAdjacentHTML('beforeend', btnHtml);
            }
            
            document.getElementById('openReceptionControlBtn')?.addEventListener('click', () => this.open());
            
            // TAMBIÉN: Añadir al Sidebar para mayor facilidad en cel
            const sidebarBtnHtml = `
                <div class="px-2 py-4 border-b border-gray-100 md:hidden bg-indigo-50">
                    <button id="sidebarReceptionBtn" class="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        Abrir Control Maestro
                    </button>
                </div>
            `;
            const searchContainer = document.querySelector('#mainSidebar .p-4');
            if (searchContainer) {
                searchContainer.insertAdjacentHTML('beforebegin', sidebarBtnHtml);
                document.getElementById('sidebarReceptionBtn')?.addEventListener('click', () => {
                    // Cerrar sidebar primero
                    document.getElementById('mainSidebar').classList.add('-translate-x-full');
                    document.getElementById('sidebarOverlay').classList.add('hidden');
                    this.open();
                });
            }
        }
    },

    injectHTML() {
        const html = `
        <div id="receptionControlModal" onclick="if(event.target === this) document.getElementById('receptionControlModal').classList.add('hidden')" class="hidden fixed inset-0 z-[9900] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm sm:p-4">
            <div class="bg-white w-full h-full sm:rounded-2xl shadow-2xl sm:max-w-6xl sm:h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <!-- Header -->
                <div class="p-6 bg-indigo-600 text-white flex justify-between items-center bg-gradient-to-r from-indigo-600 to-blue-700">
                    <div>
                        <h2 class="text-2xl font-bold flex items-center gap-3">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                            </svg>
                            Control Maestro de Recepción
                        </h2>
                        <p class="text-indigo-100 text-sm">Gestión centralizada de pagos y asistencias</p>
                    </div>
                    <button id="closeReceptionControlBtn" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Filters Bar -->
                <div class="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
                    <div class="relative flex-1 min-w-[300px]">
                        <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" id="receptionSearchInput" placeholder="Buscar por nombre o mamá/papá..." class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    </div>
                    
                    <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border">
                        <button id="viewTodayBtn" class="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-indigo-600 text-white shadow-sm">☀️ Hoy</button>
                        <button id="viewTomorrowBtn" class="px-4 py-2 rounded-lg text-sm font-bold transition-all text-gray-600 hover:bg-gray-200">🌅 Mañana</button>
                        <button id="viewFutureBtn" class="px-4 py-2 rounded-lg text-sm font-bold transition-all text-gray-600 hover:bg-gray-200">🚀 Próximas</button>
                        <button id="viewAllBtn" class="px-4 py-2 rounded-lg text-sm font-bold transition-all text-gray-600 hover:bg-gray-200">👥 Todos</button>
                    </div>

                    <div class="flex items-center gap-2 border-l pl-4 ml-2">
                        <button id="filterDebtorsBtn" class="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:border-red-300 transition-all flex items-center gap-2 shadow-sm">
                            <span class="w-2 h-2 rounded-full bg-red-500"></span>
                            Solo con deuda
                        </button>
                        <button id="filterPendingBtn" class="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:border-orange-300 transition-all flex items-center gap-2 shadow-sm">
                            <span class="w-2 h-2 rounded-full bg-orange-400"></span>
                            Sin Confirmar
                        </button>
                    </div>

                    <!-- Filtro por Terapeuta (NUEVO) -->
                    <div class="flex items-center gap-1 bg-white p-1 rounded-xl border shadow-sm ml-2">
                        <button id="filterTherapist_all" class="filter-therapist-btn px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all bg-indigo-600 text-white shadow-sm" data-therapist="all">Todas</button>
                        <button id="filterTherapist_diana" class="filter-therapist-btn px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all text-gray-600 hover:bg-gray-100" data-therapist="diana">Diana</button>
                        <button id="filterTherapist_sam" class="filter-therapist-btn px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all text-gray-600 hover:bg-gray-100" data-therapist="sam">Sam</button>
                        <button id="filterTherapist_vero" class="filter-therapist-btn px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all text-gray-600 hover:bg-gray-100" data-therapist="vero">Vero</button>
                    </div>

                    <div class="ml-auto text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                        <span id="receptionCount" class="font-bold text-indigo-600">0</span> registros
                    </div>
                </div>

                <!-- Table Container with Horizontal Scroll for Mobile -->
                <div class="flex-1 overflow-auto scroller">
                    <div class="min-w-[800px] md:min-w-0">
                        <table class="w-full text-left">
                            <thead class="sticky top-0 bg-white z-10">
                                <tr class="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                                    <th class="px-4 md:px-6 py-3 md:py-4">Paciente / Responsable</th>
                                    <th class="px-4 md:px-6 py-3 md:py-4">Terapeuta</th>
                                    <th class="px-4 md:px-6 py-3 md:py-4">Estado Financiero</th>
                                    <th class="px-4 md:px-6 py-3 md:py-4">Próxima Cita</th>
                                    <th class="px-4 md:px-6 py-3 md:py-4 text-right">Fácil Gestión</th>
                                </tr>
                            </thead>
                            <tbody id="receptionTableBody" class="divide-y divide-gray-100">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    bindEvents() {
        document.getElementById('closeReceptionControlBtn')?.addEventListener('click', () => this.close());
        document.getElementById('receptionSearchInput')?.addEventListener('input', () => this.render());
        
        // Switch de Vistas
        ['viewToday', 'viewTomorrow', 'viewFuture', 'viewAll'].forEach(id => {
            document.getElementById(id + 'Btn')?.addEventListener('click', (e) => {
                // UI update
                ['viewTodayBtn', 'viewTomorrowBtn', 'viewFutureBtn', 'viewAllBtn'].forEach(btnId => {
                    const btn = document.getElementById(btnId);
                    if (btnId === id + 'Btn') {
                        btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
                        btn.classList.remove('text-gray-600', 'hover:bg-gray-200');
                    } else {
                        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
                        btn.classList.add('text-gray-600', 'hover:bg-gray-200');
                    }
                });
                this.currentView = id.replace('view', '').toLowerCase();
                this.render();
            });
        });

        document.getElementById('filterDebtorsBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isActive = btn.classList.toggle('active-filter-red');
            if (isActive) {
                btn.classList.replace('bg-white', 'bg-red-600');
                btn.classList.replace('text-gray-700', 'text-white');
                btn.classList.add('ring-2', 'ring-red-200', 'border-red-600');
            } else {
                btn.classList.replace('bg-red-600', 'bg-white');
                btn.classList.replace('text-white', 'text-gray-700');
                btn.classList.remove('ring-2', 'ring-red-200', 'border-red-600');
            }
            this.render();
        });

        document.getElementById('filterPendingBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isActive = btn.classList.toggle('active-filter-orange');
            if (isActive) {
                btn.classList.replace('bg-white', 'bg-orange-500');
                btn.classList.replace('text-gray-700', 'text-white');
                btn.classList.add('ring-2', 'ring-orange-200', 'border-orange-500');
            } else {
                btn.classList.replace('bg-orange-500', 'bg-white');
                btn.classList.replace('text-white', 'text-gray-700');
                btn.classList.remove('ring-2', 'ring-orange-200', 'border-orange-500');
            }
            this.render();
        });

        // Filtros de Terapeuta (NUEVO)
        document.querySelectorAll('.filter-therapist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const therapist = target.getAttribute('data-therapist');
                
                // UI
                document.querySelectorAll('.filter-therapist-btn').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
                    b.classList.add('text-gray-600', 'hover:bg-gray-100');
                });
                target.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
                target.classList.remove('text-gray-600', 'hover:bg-gray-100');

                this.selectedTherapist = therapist;
                this.render();
            });
        });
    },

    open() {
        document.getElementById('receptionControlModal').classList.remove('hidden');
        this.render();
    },

    close() {
        document.getElementById('receptionControlModal').classList.add('hidden');
    },

    async render() {
        const tbody = document.getElementById('receptionTableBody');
        const searchInput = document.getElementById('receptionSearchInput');
        const countSpan = document.getElementById('receptionCount');
        if (!tbody) return;

        const showOnlyDebtors = document.getElementById('filterDebtorsBtn').classList.contains('active-filter-red');
        const showOnlyPending = document.getElementById('filterPendingBtn').classList.contains('active-filter-orange');
        const therapistFilter = this.selectedTherapist || 'all';
        const query = searchInput.value.toLowerCase().trim();
        const activeView = this.currentView || 'today';

        const patients = PatientState.patients || [];
        const appointments = PatientState.appointments || [];
        
        const now = new Date();
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // Obtener info de la próxima sesión para el label del botón
            const nextSessionInfo = PatientFilters.getNextSessionInfo();
            const tomorrowBtn = document.getElementById('viewTomorrowBtn');
            if (tomorrowBtn) {
                tomorrowBtn.textContent = (nextSessionInfo.label === 'Mañana') ? '🌅 Mañana' : `📅 ${nextSessionInfo.label}`;
            }

            let filtered = patients.filter(p => {
                const matchesSearch = normalize(p.name).includes(normalize(query)) || 
                                   (p.parentName && normalize(p.parentName).includes(normalize(query)));
                
                if (!matchesSearch) return false;

                // Filtro por terapeuta (NUEVO)
                if (therapistFilter !== 'all' && (p.therapist || '').toLowerCase() !== therapistFilter) {
                    return false;
                }

                // Encontrar citas relevantes para este paciente en esta vista
                const pApts = appointments.filter(a => normalize(a.name) === normalize(p.name) && !a.isCancelled);
                
                if (activeView === 'today' || activeView === 'tomorrow') {
                    let start, end;
                    
                    if (activeView === 'today') {
                        start = todayStart;
                        end = todayEnd;
                    } else {
                        // Vista de "Próxima/Mañana" dinámica
                        start = new Date(nextSessionInfo.date);
                        start.setHours(0, 0, 0, 0);
                        end = new Date(nextSessionInfo.date);
                        end.setHours(23, 59, 59, 999);
                    }
                    
                    const hasAptInRange = pApts.some(a => {
                        const d = new Date(a.date);
                        return d >= start && d <= end;
                    });
                    if (!hasAptInRange) return false;
                } else if (activeView === 'future') {
                    const hasFutureApt = pApts.some(a => new Date(a.date) > tomorrowEnd);
                    if (!hasFutureApt) return false;
                }

            const pending = PatientFilters.getPendingPayments(p.name);
            const totalDebt = pending.reduce((sum, a) => sum + (a.cost || 0), 0);

            if (showOnlyDebtors && totalDebt === 0) return false;

            if (showOnlyPending) {
                const pendingConfirm = pApts.some(a => 
                    !a.confirmed && 
                    new Date(a.date) >= now && 
                    new Date(a.date) <= tomorrowEnd
                );
                if (!pendingConfirm) return false;
            }

            return true;
        });

        countSpan.textContent = filtered.length;
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-20 text-gray-400">Sin resultados</td></tr>';
            return;
        }

        filtered.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
            const pending = PatientFilters.getPendingPayments(p.name);
            const totalDebt = pending.reduce((sum, a) => sum + (a.cost || 0), 0);
            
            // Buscar próxima cita
            const upcoming = appointments
                .filter(a => a.name === p.name && !a.isCancelled && new Date(a.date) >= now)
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-indigo-50/30 transition-colors group text-sm md:text-base';

            const therapistColor = {
                'diana': 'text-pink-600 bg-pink-50',
                'sam': 'text-purple-600 bg-purple-50',
                'vero': 'text-emerald-600 bg-emerald-50'
            }[p.therapist?.toLowerCase()] || 'text-gray-600 bg-gray-50';

            tr.innerHTML = `
                <td class="px-4 md:px-6 py-3 md:py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-800 text-sm md:text-base">${p.name}</span>
                        <span class="text-[10px] md:text-xs text-gray-500">${p.parentName || 'Sin responsable'}</span>
                        <span class="text-[9px] md:text-[10px] text-gray-400 mt-0.5">${p.phone || ''}</span>
                    </div>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4">
                    <span class="text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 rounded ${therapistColor}">${p.therapist || 'Diana'}</span>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4">
                    ${totalDebt > 0 
                        ? `<div class="flex flex-col">
                             <span class="text-red-600 font-bold text-sm md:text-base">$${totalDebt}</span>
                             <span class="text-[9px] md:text-[10px] text-red-400">${pending.length} por pagar</span>
                           </div>`
                        : `<span class="text-emerald-600 text-[10px] md:text-xs font-bold flex items-center gap-1">
                             <svg class="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                             Al corriente
                           </span>`
                    }
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4">
                    ${upcoming 
                        ? `<div class="flex flex-col">
                             <span class="text-xs md:text-sm text-gray-700 font-medium">${this.formatDate(upcoming.date)}</span>
                             <span class="text-[9px] md:text-[10px] ${upcoming.confirmed ? 'text-emerald-600 font-bold' : 'text-orange-500 animate-pulse'} uppercase">
                                ${upcoming.confirmed ? '✅ Confirmada' : '⏳ Pendiente'}
                             </span>
                           </div>`
                        : `<span class="text-[10px] md:text-xs text-gray-400 italic">Sin próxima</span>`
                    }
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-right">
                        <button class="wa-btn p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm" title="Enviar WhatsApp">
                             <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                         </button>
                         ${upcoming && !upcoming.confirmed 
                            ? `<button class="confirm-btn p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Confirmar Asistencia">
                                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                               </button>` 
                            : ''
                        }
                        ${totalDebt > 0 
                            ? `<button class="pay-btn px-2 md:px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm text-[10px] md:text-xs font-bold" title="Pagar sesiones">
                                 PAGAR $${totalDebt}
                               </button>` 
                            : ''
                        }
                        <button class="history-btn p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="Ver Historial">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    </div>
                </td>
            `;

            // Binds de eventos
            tr.querySelector('.wa-btn')?.addEventListener('click', () => {
                const pseudoApt = upcoming || { 
                    name: p.name, 
                    patientId: p.id, 
                    date: new Date().toISOString(), 
                    therapist: p.therapist || 'diana' 
                };
                WhatsAppMessaging.sendMessage(pseudoApt, 'reminder');
            });
            tr.querySelector('.confirm-btn')?.addEventListener('click', () => this.handleConfirm(upcoming));
            tr.querySelector('.pay-btn')?.addEventListener('click', () => this.handlePayment(p, pending));
            tr.querySelector('.history-btn')?.addEventListener('click', () => {
                this.close();
                PatientModals.openHistory(p);
            });

            tbody.appendChild(tr);
        });
    },

    async handleConfirm(apt) {
        if (!apt) return;
        const ok = await ModalService.confirm('Confirmar Asistencia', `¿Confirmar asistencia de **${apt.name}** para el ${this.formatDate(apt.date)}?`, 'Confirmar');
        if (ok) {
            await PatientActions.toggleConfirmationDirect(apt.id, false);
            this.render();
        }
    },

    async handlePayment(patient, pendingApts) {
        const total = pendingApts.reduce((sum, a) => sum + (a.cost || 0), 0);
        const ok = await ModalService.confirm('Registrar Pago', `¿Marcar como pagadas las **${pendingApts.length} sesiones** de **${patient.name}** por un total de **$${total}**?`, 'SÍ, PAGADO', 'Cancelar', 'success');
        
        if (ok) {
            ToastService.info(`Procesando pago de ${patient.name}...`);
            let count = 0;
            for (const apt of pendingApts) {
                const success = await CalendarData.togglePayment(apt.id, false);
                if (success) count++;
            }
            ToastService.success(`Se registraron ${count} pagos correctamente.`);
            this.render();
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' hrs';
    }
};
