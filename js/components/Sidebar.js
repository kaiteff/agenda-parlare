/**
 * Sidebar.js
 * Gestiona la estructura de la lista de pacientes y sus acciones.
 */

export const Sidebar = {
    inject(container = document.getElementById('appContent')) {
        if (!container) return;
        
        // El Sidebar debe ir antes del <main>
        const aside = document.createElement('aside');
        aside.id = 'mainSidebar';
        aside.className = 'absolute md:relative z-50 w-80 md:w-96 h-full bg-white border-r border-gray-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out';
        
        aside.innerHTML = `
            <!-- Header & Search -->
            <div class="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div id="patientsHeader"></div>
                <div class="relative mt-3 group">
                    <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="searchInput" placeholder="Buscar paciente..." class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                </div>
            </div>

            <!-- List Content -->
            <div id="patientsList" class="flex-1 overflow-y-auto p-2 space-y-2 scroller">
                <!-- Injected by PatientManager -->
            </div>

            <!-- Footer Actions -->
            <div class="p-3 border-t border-gray-200 bg-gray-50">
                <button id="viewInactivePatientsBtn" class="w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Ver Papelera / Inactivos
                </button>
                
                <!-- Mobile Actions (Hidden on Desktop) -->
                <div class="md:hidden mt-2 space-y-2">
                    <button id="sidebarLogoutBtn" class="w-full flex items-center justify-center gap-2 px-3 py-4 text-sm font-bold text-white bg-red-600 rounded-xl shadow-lg active:scale-95">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        <span>Cerrar Sesión</span>
                    </button>
                    <button id="sidebarCorteBtn" class="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span>💰 Corte de Caja</span>
                    </button>
                </div>
            </div>
        `;
        
        // Insertar después del overlay o al principio de appContent
        container.prepend(aside);
        console.log('✅ Sidebar: Inyectado con éxito');
    }
};
