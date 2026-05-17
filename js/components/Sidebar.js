/**
 * Sidebar.js
 * Gestiona la estructura de la lista de pacientes y sus acciones.
 */

import { AuthManager } from '../managers/AuthManager.js';

export const Sidebar = {
    /**
     * Inyecta el HTML base del Sidebar
     */
    inject(container = document.getElementById('appContent')) {
        if (!container || document.getElementById('mainSidebar')) return;
        
        const aside = document.createElement('aside');
        aside.id = 'mainSidebar';
        aside.className = 'fixed inset-y-0 left-0 md:relative z-[60] w-80 md:w-96 h-full bg-white border-r border-gray-200 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.1)] transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out';
        
        aside.innerHTML = `
            <div class="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div id="patientsHeader"></div>
                <div class="relative mt-3 group">
                    <svg class="absolute left-3 top-3 md:top-2.5 w-5 h-5 md:w-4 md:h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="search" id="searchInput" placeholder="Buscar paciente..." autocomplete="off" enterkeyhint="search" class="w-full pl-10 md:pl-9 pr-4 py-3.5 md:py-2 text-base md:text-sm bg-gray-50 border border-gray-200 rounded-xl md:rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none touch-manipulation">
                </div>
                
                <!-- Pestañas de Tiempo -->
                <div class="flex p-1 bg-gray-100 rounded-lg mt-3" id="sidebarTabs">
                    <button type="button" data-tab="today" class="flex-1 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-[10px] font-bold uppercase rounded-md transition-all bg-white shadow-sm text-blue-600 touch-manipulation">Hoy</button>
                    <button type="button" data-tab="tomorrow" class="flex-1 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-[10px] font-bold uppercase rounded-md transition-all text-gray-500 hover:bg-white/50 touch-manipulation">Mañana</button>
                    <button type="button" data-tab="all" class="flex-1 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-[10px] font-bold uppercase rounded-md transition-all text-gray-500 hover:bg-white/50 touch-manipulation">Todos</button>
                </div>
            </div>

            <div id="patientsList" class="flex-1 overflow-y-auto p-2 space-y-2 scroller">
            </div>

            <div id="sidebarFooter" class="p-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-2 flex-shrink-0">
                <div class="grid grid-cols-3 gap-1">
                    <button id="viewInactivePatientsBtn" class="text-[9px] uppercase font-bold text-gray-400 hover:text-gray-600 flex flex-col items-center justify-center gap-1 py-2 transition-colors border border-transparent hover:border-gray-200 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Papelera
                    </button>
                    <button id="openHelpManualBtn" class="text-[9px] uppercase font-bold text-blue-500 hover:text-blue-700 flex flex-col items-center justify-center gap-1 py-2 transition-colors border border-transparent hover:border-blue-100 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        Manual
                    </button>
                    <button id="openSuggestionsBtn" class="text-[9px] uppercase font-bold text-orange-500 hover:text-orange-700 flex flex-col items-center justify-center gap-1 py-2 transition-colors border border-transparent hover:border-orange-100 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Sugerir
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-1">
                    ${AuthManager.isAdmin() ? `
                        <button id="sidebarCorteBtn" class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 transition-all active:scale-95 shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            Corte
                        </button>
                    ` : '<div class="hidden"></div>'}
                    
                    <button id="sidebarLogoutBtn" class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 transition-all active:scale-95 shadow-sm ${!AuthManager.isAdmin() ? 'col-span-2' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Salir
                    </button>
                </div>
            </div>
        `;
        
        container.prepend(aside);
    },

    /**
     * Inicializa los listeners de búsqueda y botones del Sidebar
     */
    init() {
        console.log('👂 Sidebar: Configurando listeners...');
        const searchInput = document.getElementById('searchInput');
        const viewInactiveBtn = document.getElementById('viewInactivePatientsBtn');
        const sidebarTabs = document.getElementById('sidebarTabs');

        if (searchInput) {
            searchInput.oninput = () => {
                this.render();
            };
        }

        if (sidebarTabs) {
            sidebarTabs.onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                const tab = btn.dataset.tab;
                this.activeTab = tab;
                
                // Actualizar UI de pestañas
                sidebarTabs.querySelectorAll('button').forEach(b => {
                    b.className = "flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all text-gray-500 hover:bg-white/50";
                });
                btn.className = "flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all bg-white shadow-sm text-blue-600";
                
                this.render();
            };
        }

        if (viewInactiveBtn) {
            viewInactiveBtn.onclick = () => {
                import('../managers/patient/PatientModals.js').then(m => {
                    m.PatientModals.openInactivePatients();
                });
            };
        }

        const helpBtn = document.getElementById('openHelpManualBtn');
        if (helpBtn) {
            helpBtn.onclick = () => {
                import('../modules/help/HelpManual.js').then(m => {
                    m.HelpManual.open();
                });
            };
        }

        const suggestBtn = document.getElementById('openSuggestionsBtn');
        if (suggestBtn) {
            suggestBtn.onclick = () => {
                import('../modules/help/SuggestionsModal.js').then(m => {
                    m.SuggestionsModal.open();
                });
            };
        }
        
        this.activeTab = 'today'; // Default
    },

    /**
     * Renderiza la lista de pacientes filtrada
     */
    async render() {
        const listContainer = document.getElementById('patientsList');
        const headerContainer = document.getElementById('patientsHeader');
        const searchInput = document.getElementById('searchInput');
        
        if (!listContainer || !headerContainer) return;

        try {
            // Importar dependencias en paralelo
            const [ { PatientState }, { PatientFilters } ] = await Promise.all([
                import('../managers/patient/PatientState.js'),
                import('../managers/patient/PatientFilters.js')
            ]);

            const query = searchInput ? searchInput.value : '';
            const tab = this.activeTab || 'today';
            
            let filtered = [];
            let activeCount = 0;

            // Obtener info de la próxima sesión para actualizar el label del botón (ej: "Lunes")
            const nextSessionInfo = PatientFilters.getNextSessionInfo();
            const tomorrowBtn = document.querySelector('[data-tab="tomorrow"]');
            if (tomorrowBtn) {
                tomorrowBtn.textContent = nextSessionInfo.label;
            }

            if (tab === 'today') {
                filtered = PatientFilters.getToday();
            } else if (tab === 'tomorrow') {
                filtered = nextSessionInfo.appointments;
            } else {
                filtered = PatientFilters.applyAll(PatientState.patients, query);
            }

            // Aplicar búsqueda incluso sobre hoy/mañana si hay query
            if (query && (tab === 'today' || tab === 'tomorrow')) {
                const q = query.toLowerCase();
                filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
            }

            activeCount = filtered.length;

            // 1. Renderizar Header del Sidebar
            headerContainer.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Pacientes</h2>
                        <p class="text-xs text-gray-500 font-medium">${activeCount} activos</p>
                    </div>
                    <div class="flex gap-2">
                        ${AuthManager.can('view_audit') ? `
                            <button id="viewAuditLogBtn" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all" title="Ver Bitácora de Auditoría">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                            </button>
                        ` : ''}
                        <button type="button" id="addNewPatientBtn" class="touch-target touch-manipulation p-2.5 md:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-lg shadow-sm transition-all active:scale-95" title="Nuevo Paciente" aria-label="Nuevo paciente">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                </div>
            `;

            // Asignar evento al botón de nuevo paciente
            const addBtn = document.getElementById('addNewPatientBtn');
            if (addBtn) {
                addBtn.onclick = () => {
                    import('../managers/patient/PatientModals.js').then(m => m.PatientModals.openNewPatient());
                };
            }

            // Asignar evento al botón de bitácora
            const auditBtn = document.getElementById('viewAuditLogBtn');
            if (auditBtn) {
                auditBtn.onclick = () => {
                    import('../modules/admin/AuditPanel.js').then(m => m.AuditPanel.open());
                };
            }

            // 2. Renderizar Lista
            if (filtered.length === 0) {
                listContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                        <svg class="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <p class="text-xs font-medium">No se encontraron pacientes</p>
                    </div>
                `;
                return;
            }

            const html = filtered.map(patient => this._generatePatientCard(patient)).join('');
            listContainer.innerHTML = html;

        } catch (err) {
            console.error("❌ Sidebar Render Error:", err);
        }
    },

    /**
     * Traduce IDs técnicos a nombres amigables
     */
    _formatStaffName(id) {
        if (!id) return '—';
        if (id === 'WhatsApp' || id === 'Robot Parláre') return '🤖 WA';
        
        const clean = id.split('@')[0].toLowerCase();
        const mapping = {
            'yaritzajocgo': '👱‍♀️ Yari',
            'lopezcarpio7': '👩‍⚕️ Diana',
            'sammygtz90': '👩‍⚕️ Sammy',
            'sam': '👩‍⚕️ Sammy',
            'vero': '👩‍⚕️ Vero',
            'daniel': '👨‍💻 Daniel'
        };
        
        return mapping[clean] || `🧑 ${clean}`;
    },

    /**
     * Genera el HTML para una tarjeta de paciente
     */
    _generatePatientCard(p) {
        const statusColor = p.isCancelled 
            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
            : (p.totalPending > 0 ? 'bg-orange-500' : 'bg-green-500');
        
        // Configuración de Tag de Terapeuta
        const tKey = (p.therapist || 'diana').toLowerCase();
        const pKey = (p.planningTherapist || '').toLowerCase();
        
        const getTClass = (key) => {
            if (key === 'sam') return 'bg-blue-100 text-blue-700 border-blue-200';
            if (key === 'vero') return 'bg-purple-100 text-purple-700 border-purple-200';
            return 'bg-pink-100 text-pink-700 border-pink-200';
        };

        const tLetter = tKey.charAt(0).toUpperCase();
        const pLetter = pKey ? pKey.charAt(0).toUpperCase() : null;
        
        // Formatear hora si existe (para vista Hoy/Mañana)
        let timeLabel = '';
        if (p.appointmentTime) {
            const time = new Date(p.appointmentTime);
            timeLabel = time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else if (p.lastVisit) {
            timeLabel = new Date(p.lastVisit).toLocaleDateString('es-MX', {day:'numeric', month:'short'});
        } else {
            timeLabel = 'Sin citas';
        }

        // HTML del tag de terapeuta (con soporte para relevo)
        let therapistTag = "";
        if (pLetter && pLetter !== tLetter) {
            therapistTag = `
                <div class="absolute -bottom-1 -right-2 flex items-center shadow-sm">
                    <span class="w-4 h-4 rounded-full text-[8px] font-black border-2 border-white flex items-center justify-center opacity-60 bg-gray-100 text-gray-500" title="Planeó: ${pKey}">
                        <span class="line-through decoration-gray-600 decoration-2">${pLetter}</span>
                    </span>
                    <span class="w-4 h-4 rounded-full text-[9px] font-black border-2 border-white flex items-center justify-center -ml-1 ${getTClass(tKey)}" title="Atiende: ${tKey}">${tLetter}</span>
                </div>
            `;
        } else {
            therapistTag = `<span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black border-2 border-white flex items-center justify-center shadow-sm ${getTClass(tKey)}" title="Terapeuta: ${tKey}">${tLetter}</span>`;
        }

        // Comprobar cumpleaños
        let birthdayIcon = '';
        if (p.birthday) {
            const today = new Date();
            const bDate = new Date(p.birthday);
            // Comparar solo mes y día (ignorando año)
            if (today.getMonth() === bDate.getMonth() && today.getDate() === bDate.getDate()) {
                birthdayIcon = ' <span class="animate-bounce inline-block ml-1" title="¡Hoy cumple años!">🎂</span>';
            }
        }

        const cancelLabel = p.isCancelled 
            ? `<span class="text-[8px] px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md ml-2 uppercase font-black tracking-tighter">X ${this._formatStaffName(p.cancelledBy)}</span>` 
            : '';

        let whatsAppStatus = '';
        if (p.confirmed) {
            whatsAppStatus = '<span class="text-[12px] ml-1.5" title="Asistencia confirmada">✅</span>';
        } else if (p.lastReminderSentAt && !p.isCancelled) {
            whatsAppStatus = '<span class="text-[12px] ml-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-help" title="Recordatorio enviado (Pendiente de confirmación)">📩</span>';
        }

        return `
            <div onclick="window.openPatientHistoryById('${p.id}')" 
                 class="group p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all duration-200 ${p.isCancelled ? 'opacity-70 bg-gray-50/50' : ''}">
                <div class="flex items-start gap-3">
                    <div class="relative w-10 h-10 rounded-full ${p.isCancelled ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-bold shrink-0">
                        ${p.name.charAt(0)}
                        ${therapistTag}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <h3 class="font-bold text-gray-800 truncate flex items-center">${p.name}${birthdayIcon}${whatsAppStatus}${cancelLabel}</h3>
                            <div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] ${p.isCancelled ? 'text-gray-400' : (p.appointmentTime ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium')}">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            ${p.isCancelled ? 'Cancelada' : timeLabel}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
