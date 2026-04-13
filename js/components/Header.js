/**
 * Header.js
 * Componente para gestionar la barra superior (Header)
 */

import { SyncStatus } from '../services/SyncStatus.js';
import { AuthManager } from '../managers/AuthManager.js';
import { ModalService } from '../utils/ModalService.js';
import { logoutUser, db, collectionPath, collection, query, where, onSnapshot } from '../firebase.js';
import { CalendarState } from '../modules/calendar/CalendarState.js';
import { SyncService } from '../services/SyncService.js';

export const Header = {

    /**
     * Inicializa el componente Header
     */
    init() {
        console.log('📌 Inicializando Header...');
        this.render();
        this._setupListeners();
    },

    /**
     * Renderiza la información del usuario en el header
     */
    render() {
        this._renderUserInfo();
        this._renderSyncStatus(); // Nuevo indicador
        this._renderBatchSyncButton(); // Botón de sincronización manual
        this._renderTherapistSelector();
        this._setupReportButton();
    },

    /**
     * Renderiza la información del usuario (Nombre, Rol)
     */
    _renderUserInfo() {
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) {
            userInfoEl.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        ${AuthManager.getDisplayName().charAt(0)}
                    </div>
                    <div class="hidden md:block">
                        <div class="font-bold text-gray-800">${AuthManager.getDisplayName()}</div>
                        <div class="text-xs text-gray-500 capitalize">${AuthManager.getRole()}</div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderiza el indicador de sincronización
     */
    _renderSyncStatus() {
        const userInfoEl = document.getElementById('userInfo');
        if (!userInfoEl) return;

        // Crear contenedor si no existe
        let syncContainer = document.getElementById('syncStatusContainer');
        if (!syncContainer) {
            syncContainer = document.createElement('div');
            syncContainer.id = 'syncStatusContainer';
            syncContainer.className = 'ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 transition-all duration-300';
            userInfoEl.parentElement.insertBefore(syncContainer, userInfoEl.nextSibling);

            // Suscribirse a cambios
            SyncStatus.subscribe((state) => {
                this._updateSyncUI(state);
            });
        }
    },

    /**
     * Actualiza la UI del indicador según el estado
     */
    _updateSyncUI(state) {
        const container = document.getElementById('syncStatusContainer');
        if (!container) return;

        const STATES = SyncStatus.STATES;
        let html = '';
        let className = 'ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ';

        switch (state) {
            case STATES.OFFLINE:
                html = `
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 011.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path>
                    </svg>
                    <span class="text-xs text-red-500 font-bold hidden md:inline">Sin Conexión</span>
                `;
                className += 'bg-red-50 border-red-100 opacity-100';
                container.title = "Sin conexión a internet";
                break;
            case STATES.IDLE:
                html = `
                    <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span class="text-xs text-gray-400 font-medium hidden md:inline">Sincronizado</span>
                `;
                className += 'bg-gray-50 border-gray-100 opacity-50 hover:opacity-100';
                break;
            case STATES.SAVING:
                html = `
                    <svg class="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span class="text-xs text-blue-600 font-bold hidden md:inline">Guardando...</span>
                `;
                className += 'bg-blue-50 border-blue-100 shadow-sm';
                break;
            case STATES.SAVED:
                html = `
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span class="text-xs text-green-600 font-bold hidden md:inline">Guardado</span>
                `;
                className += 'bg-green-50 border-green-100 shadow-sm';
                break;
            case STATES.ERROR:
                html = `
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    <span class="text-xs text-red-600 font-bold hidden md:inline">Error al guardar</span>
                `;
                className += 'bg-red-50 border-red-100 cursor-pointer hover:bg-red-100';
                container.title = "Click para reintentar (verifica tu conexión)";
                break;
        }

        container.innerHTML = html;
        container.className = className;
    },

    /**
     * Renderiza el botón de sincronización manual (Batch)
     */
    _renderBatchSyncButton() {
        const userInfoEl = document.getElementById('userInfo');
        if (!userInfoEl) return;

        // Crear contenedor si no existe
        let batchSyncBtn = document.getElementById('batchSyncBtn');
        if (!batchSyncBtn) {
            batchSyncBtn = document.createElement('button');
            batchSyncBtn.id = 'batchSyncBtn';
            batchSyncBtn.className = 'ml-2 hidden items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-all shadow-sm active:scale-95';
            batchSyncBtn.title = "Sincronizar pagos pendientes con Excel";
            
            userInfoEl.parentElement.insertBefore(batchSyncBtn, userInfoEl.nextSibling);

            // Listener de click
            batchSyncBtn.onclick = async (e) => {
                e.preventDefault();
                batchSyncBtn.disabled = true;
                batchSyncBtn.classList.add('opacity-50', 'animate-pulse');
                
                await SyncService.syncAllPending();
                
                batchSyncBtn.disabled = false;
                batchSyncBtn.classList.remove('opacity-50', 'animate-pulse');
            };

            // Suscribirse a cambios en Firestore para actualizar el contador en tiempo real
            const q = query(
                collection(db, collectionPath),
                where('sheetSynced', '==', false),
                where('isPaid', '==', true)
            );

            onSnapshot(q, (snapshot) => {
                this._updateBatchSyncUI(snapshot.size);
            });
        }
    },

    /**
     * Actualiza el contador del botón de sincronización manual
     * @param {number} count 
     */
    _updateBatchSyncUI(count) {
        const btn = document.getElementById('batchSyncBtn');
        if (!btn) return;

        if (count > 0) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span class="text-xs font-bold">${count} pendiente${count > 1 ? 's' : ''}</span>
            `;
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    },

    /**
     * Renderiza y configura el selector de terapeutas (Solo Admin)
     */
    _renderTherapistSelector() {
        const selectorContainer = document.getElementById('therapistSelectorContainer');
        const selector = document.getElementById('therapistFilter');

        if (selectorContainer && selector) {
            if (AuthManager.can('switch_therapist_view')) {
                selectorContainer.classList.remove('hidden');
                selector.value = AuthManager.getSelectedTherapist();

                // Asignar evento de cambio
                selector.onchange = (e) => {
                    const newTherapist = e.target.value;
                    AuthManager.setSelectedTherapist(newTherapist);

                    // Recargar lista de pacientes (Sidebar)
                    // Usamos window.PatientManager temporalmente hasta refactorizar event bus
                    if (window.PatientManager && window.PatientManager.api) {
                        console.log("🔄 Recargando lista de pacientes...");
                        window.PatientManager.api.refreshList();
                    }

                    // Recargar calendario
                    if (typeof window.renderCalendar === 'function') {
                        console.log("🔄 Recargando calendario...");
                        window.renderCalendar();
                    }
                };
            } else {
                selectorContainer.classList.add('hidden');
            }
        }
    },

    /**
     * Configura el botón de reportes financieros
     * Usamos delegación de eventos para evitar perder el listener si el DOM cambia
     */
    _setupReportButton() {
        const openReportsBtn = document.getElementById('openReportsBtn');
        const user = AuthManager.currentUser;

        // Control de visibilidad
        if (openReportsBtn) {
            if (user?.role !== 'admin') {
                // Ocultar completamente para no admins
                openReportsBtn.style.display = 'none';
            } else {
                // Para admins, dejar que las clases CSS (hidden md:flex) controlen la visibilidad responsive
                openReportsBtn.style.display = '';
                // Asegurarnos que NO quitamos 'hidden' si está presente por defecto en el HTML para mobile
                // El bug anterior era: openReportsBtn.classList.remove('hidden'); -> Esto lo mostraba en mobile
            }
        }
    },

    /**
     * Lógica para abrir el reporte financiero
     */
    async _openFinancialReport() {
        try {
            console.log("🔄 Cargando módulo de reportes...");
            // Dynamic import para reducir bundle inicial
            const { FinancialReport } = await import('../modules/reports/FinancialReport.js');
            const { FinancialReportModal } = await import('../modules/reports/FinancialReportModal.js');
            // CalendarState ya importado arriba

            console.log("✅ Módulos cargados. Generando reporte...");

            // Lógica de roles
            const user = AuthManager.currentUser;
            const role = user?.role;
            const therapistId = user?.therapist;

            let appointmentsToProcess = CalendarState.appointments;

            // 1. Terapeuta (Sam): Solo ve sus citas (Backend enforcement)
            if (role === 'therapist') {
                appointmentsToProcess = appointmentsToProcess.filter(a =>
                    (a.therapist || 'diana').toLowerCase() === therapistId.toLowerCase()
                );
            }
            // 2. Admin (Diana): Filtro visual actual
            else if (role === 'admin' && AuthManager.can('switch_therapist_view')) {
                const currentView = AuthManager.getSelectedTherapist();
                if (currentView !== 'all') {
                    appointmentsToProcess = appointmentsToProcess.filter(a =>
                        (a.therapist || 'diana').toLowerCase() === currentView.toLowerCase()
                    );
                }
            }

            const report = FinancialReport.generateMonthlyReport(appointmentsToProcess, CalendarState.currentDate);
            console.log("📊 Reporte generado. Abriendo modal...");
            FinancialReportModal.render(report, role);

        } catch (error) {
            console.error("❌ Error abriendo reporte:", error);
            await ModalService.alert("Error", "No se pudo cargar el reporte financiero: " + error.message);
        }
    },


    /**
     * Configura listeners generales del header usanda delegación
     */
    _setupListeners() {
        // Usamos un flag para no adjuntar listeners múltiples veces
        if (this._listenersAttached) return;
        this._listenersAttached = true;

        console.log("👂 Configurando listeners globales del Header (Delegación)...");

        document.addEventListener('click', async (e) => {
            // 1. Botón de Reportes
            const reportBtn = e.target.closest('#openReportsBtn');
            if (reportBtn) {
                console.log("🖱️ Click detectado en botón de reportes (Delegación)");
                e.preventDefault();
                e.stopPropagation();
                await this._openFinancialReport();
                return; // Importante
            }

            // 1b. Botón de Corte de Caja
            const corteBtn = e.target.closest('#openCorteBtn');
            if (corteBtn) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const { CorteDeCaja } = await import('../modules/reports/CorteDeCaja.js');
                    CorteDeCaja.open();
                } catch (err) {
                    console.error("Error abriendo Corte de Caja:", err);
                }
                return;
            }

            // 1c. Botón Copiar Corte
            const corteCopyBtn = e.target.closest('#corteCopyBtn');
            if (corteCopyBtn) {
                e.preventDefault();
                try {
                    const { CorteDeCaja } = await import('../modules/reports/CorteDeCaja.js');
                    CorteDeCaja.copyToClipboard();
                } catch (err) {
                    console.error("Error copiando corte:", err);
                }
                return;
            }

            // 2. Botón de Logout
            const logoutBtn = e.target.closest('#logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                if (await ModalService.confirm("Cerrar Sesión", "¿Estás seguro que deseas salir?", "Cerrar Sesión", "Cancelar")) {
                    await logoutUser();
                }
                return;
            }

            // 3. Botón Menú Hamburguesa (Mobile)
            const mobileMenuBtn = e.target.closest('#mobileMenuBtn');
            const overlay = document.getElementById('sidebarOverlay');
            const sidebar = document.getElementById('mainSidebar');

            if (mobileMenuBtn && sidebar && overlay) {
                // Toggle sidebar
                const isClosed = sidebar.classList.contains('-translate-x-full');
                if (isClosed) {
                    sidebar.classList.remove('-translate-x-full');
                    overlay.classList.remove('hidden');
                } else {
                    sidebar.classList.add('-translate-x-full');
                    overlay.classList.add('hidden');
                }
            }

            // 4. Click en Overlay para cerrar sidebar
            if (e.target.id === 'sidebarOverlay') {
                const sidebar = document.getElementById('mainSidebar');
                if (sidebar) sidebar.classList.add('-translate-x-full');
                e.target.classList.add('hidden');
            }
        });
    }
};
