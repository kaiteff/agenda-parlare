/**
 * Sidebar.js
 * Gestiona la estructura de la lista de pacientes y sus acciones.
 */

export const Sidebar = {
    /**
     * Inyecta el HTML base del Sidebar
     */
    inject(container = document.getElementById('appContent')) {
        if (!container || document.getElementById('mainSidebar')) return;
        
        const aside = document.createElement('aside');
        aside.id = 'mainSidebar';
        aside.className = 'absolute md:relative z-50 w-80 md:w-96 h-full bg-white border-r border-gray-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out';
        
        aside.innerHTML = `
            <div class="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div id="patientsHeader"></div>
                <div class="relative mt-3 group">
                    <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="searchInput" placeholder="Buscar paciente..." class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                </div>
            </div>

            <div id="patientsList" class="flex-1 overflow-y-auto p-2 space-y-2 scroller">
            </div>

            <div class="p-3 border-t border-gray-200 bg-gray-50">
                <button id="viewInactivePatientsBtn" class="w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Ver Papelera / Inactivos
                </button>
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

        if (searchInput) {
            searchInput.oninput = (e) => {
                const query = e.target.value;
                // PatientFilters ya está en PatientManager
                import('../managers/patient/PatientFilters.js').then(m => {
                    const { PatientState } = m.PatientFilters; // Wait, better use proper imports
                    // ... 
                });
                // Pero más fácil: disparar el render del manager
                if (window.PatientManager) {
                    window.PatientManager.render();
                }
            };
        }

        if (viewInactiveBtn) {
            viewInactiveBtn.onclick = () => {
                import('../managers/patient/PatientModals.js').then(m => {
                    m.PatientModals.openInactivePatients();
                });
            };
        }
    },

    /**
     * Renderiza la lista de pacientes filtrada
     */
    render() {
        const listContainer = document.getElementById('patientsList');
        const headerContainer = document.getElementById('patientsHeader');
        
        if (!listContainer || !headerContainer) return;

        // Importar dependencias para el renderizado
        import('../managers/patient/PatientState.js').then(({ PatientState }) => {
            import('../managers/patient/PatientFilters.js').then(({ PatientFilters }) => {
                const filtered = PatientFilters.applyAll(PatientState.patients);
                const activeCount = filtered.filter(p => p.isActive !== false).length;

                // 1. Renderizar Header del Sidebar
                headerContainer.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-bold text-gray-800">Pacientes</h2>
                            <p class="text-xs text-gray-500 font-medium">${activeCount} activos</p>
                        </div>
                        <button id="addNewPatientBtn" class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all active:scale-95" title="Nuevo Paciente">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                `;

                // Asignar evento al botón de nuevo paciente
                const addBtn = document.getElementById('addNewPatientBtn');
                if (addBtn) {
                    addBtn.onclick = () => {
                        import('../managers/patient/PatientModals.js').then(m => m.PatientModals.openNewPatient());
                    };
                }

                // 2. Renderizar Lista
                if (filtered.length === 0) {
                    listContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-12 text-center">
                            <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <p class="text-sm font-medium text-gray-400">No se encontraron pacientes</p>
                        </div>
                    `;
                    return;
                }

                const html = filtered.map(patient => this._generatePatientCard(patient)).join('');
                listContainer.innerHTML = html;
            });
        });
    },

    /**
     * Genera el HTML para una tarjeta de paciente
     * @private
     */
    _generatePatientCard(p) {
        const isSelected = false; // Implementar lógica de selección si es necesario
        const statusColor = p.totalPending > 0 ? 'bg-orange-500' : 'bg-green-500';
        
        return `
            <div onclick="window.openPatientHistoryById('${p.id}')" 
                 class="group p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all duration-200">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                        ${p.name.charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <h3 class="font-bold text-gray-800 truncate pr-2">${p.name}</h3>
                            <div class="w-2 h-2 rounded-full ${statusColor} shadow-sm"></div>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            ${p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('es-MX', {day:'numeric', month:'short'}) : 'Sin citas'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
