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
import { ToastService } from '../utils/ToastService.js';
import { MobileNav } from '../utils/MobileNav.js';

export const Header = {

    /**
     * Inyecta el HTML base del Header
     */
    inject(container = document.getElementById('appContent')) {
        if (!container || document.querySelector('header')) return;
        
        const header = document.createElement('header');
        header.id = 'mainHeader';
        header.className = 'bg-white border-b border-gray-200 h-16 flex-shrink-0 z-[100] shadow-sm relative';
        header.innerHTML = `
            <div class="h-full px-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <button type="button" id="mobileMenuBtn" class="md:hidden p-2 -ml-2 text-gray-600 hover:text-blue-600 rounded-lg touch-target touch-manipulation" aria-label="Abrir menú de pacientes">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                    <div id="userInfo" class="flex items-center gap-3"></div>
                </div>

                <div class="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-2 pointer-events-none">
                    <img src="assets/parlare-logo.png" alt="Parláre" class="h-8 w-auto object-contain opacity-95" height="32" />
                </div>
                <div class="md:hidden flex-1 flex justify-center min-w-0 pointer-events-none px-8">
                    <img src="assets/parlare-logo.png" alt="Parláre" class="h-7 w-auto max-h-8 object-contain" height="28" />
                </div>

                <div class="flex items-center gap-2 md:gap-3">
                    <!-- Admin Settings (Cog) -->
                    <button id="adminSettingsBtn" class="hidden items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors ring-1 ring-blue-100" title="Configuración de Clínica">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>

                    <!-- Notification Bell -->
                    <div class="relative">
                        <button id="notificationBell" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            <span id="notificationBadge" class="hidden absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">0</span>
                        </button>
                        <div id="notificationList" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] transform origin-top-right transition-all">
                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 class="text-sm font-bold text-gray-700">Notificaciones</h3>
                                <button id="markAllReadBtn" class="text-xs text-blue-600 hover:text-blue-800 font-medium">Marcar todo leído</button>
                            </div>
                            <div id="notificationItems" class="max-h-64 overflow-y-auto"></div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <button id="openCorteBtn" class="hidden md:flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 rounded-lg transition-colors" title="Corte de Caja">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </button>

                    <button id="openReportsBtn" class="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg transition-colors" title="Reportes">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </button>

                    <button id="openSupportVaultBtn" class="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm" title="Soporte">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </button>

                    <div id="therapistSelectorContainer" class="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
                        <select id="therapistFilter" class="bg-transparent text-sm font-medium text-gray-700 outline-none border-none py-1 cursor-pointer">
                            <option value="diana">Diana</option>
                            <option value="sam">Sam</option>
                            <option value="vero">Vero</option>
                            <option value="all">Todas</option>
                        </select>
                    </div>

                    <button id="googleSyncBtn" class="hidden md:flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border">
                        <div id="syncIndicator" class="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                        <span id="syncStatusText">Google Sync</span>
                    </button>

                    <button id="forceSyncAllBtn" class="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all hidden" title="Nuke Total — Borrar y reconstruir TODO Google Calendar desde Firebase">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        <span>Nuke</span>
                    </button>

                    <button id="logoutBtn" class="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>
        `;
        container.prepend(header);
        console.log('✅ Header: Inyectado estructuralmente');
    },

    init() {
        console.group('📌 Inicializando Header');
        this.inject();
        this.render();
        this._setupListeners();
        console.groupEnd();
    },

    /**
     * Renderiza la información del usuario en el header
     */
    render() {
        this._renderUserInfo();
        this._renderSyncStatus(); // Nuevo indicador
        this._renderBatchSyncButton(); // Botón de sincronización manual
        this._renderGoogleSyncStatus(); // Estado de Google Auth
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
     * Renderiza y monitorea el estado de Google Auth Sync
     */
    _renderGoogleSyncStatus() {
        import('../utils/GoogleSyncUI.js').then((m) => m.GoogleSyncUI.initPolling());
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
        const mobileWrap = document.getElementById('calendarTherapistFilterWrap');
        const mobileSelector = document.getElementById('therapistFilterMobile');

        const applyTherapistChange = (newTherapist) => {
            AuthManager.setSelectedTherapist(newTherapist);
            if (selector) selector.value = newTherapist;
            if (mobileSelector) mobileSelector.value = newTherapist;
            if (window.PatientManager) window.PatientManager.render();
            if (typeof window.renderCalendar === 'function') window.renderCalendar();
        };

        if (selectorContainer && selector) {
            if (AuthManager.can('switch_therapist_view')) {
                selectorContainer.classList.remove('hidden');
                selectorContainer.classList.add('md:flex');
                if (mobileWrap) mobileWrap.classList.remove('hidden');

                const currentUser = AuthManager.currentUser;
                const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'receptionist';

                const optionsHtml = !isStaff
                    ? (() => {
                        const myId = currentUser?.therapist || 'diana';
                        const myName = myId.charAt(0).toUpperCase() + myId.slice(1);
                        return `<option value="${myId}">${myName}</option><option value="all">Todas</option>`;
                    })()
                    : `<option value="diana">Diana</option><option value="sam">Sam</option><option value="vero">Vero</option><option value="all">Todas</option>`;

                selector.innerHTML = optionsHtml;
                if (mobileSelector) mobileSelector.innerHTML = optionsHtml;

                const selected = AuthManager.getSelectedTherapist();
                selector.value = selected;
                if (mobileSelector) mobileSelector.value = selected;

                selector.onchange = (e) => applyTherapistChange(e.target.value);
                if (mobileSelector) {
                    mobileSelector.onchange = (e) => applyTherapistChange(e.target.value);
                }

                // Mostrar botón de configuración si es admin
                const adminSettingsBtn = document.getElementById('adminSettingsBtn');
                if (adminSettingsBtn && AuthManager.isAdmin()) {
                    adminSettingsBtn.classList.remove('hidden');
                    adminSettingsBtn.classList.add('flex');
                }

            } else {
                selectorContainer.classList.add('hidden');
                selectorContainer.classList.remove('md:flex');
                if (mobileWrap) mobileWrap.classList.add('hidden');
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
            else if ((role === 'admin' || role === 'receptionist') && AuthManager.can('switch_therapist_view')) {
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
            console.log('🖱️ Click global detectado en:', e.target);
            const reportBtn = e.target.closest('#openReportsBtn');
            if (reportBtn) {
                console.log("🖱️ Click detectado en botón de reportes (Delegación)");
                e.preventDefault();
                e.stopPropagation();
                await this._openFinancialReport();
                return; // Importante
            }

            // 1b. Botón de Corte de Caja (Header & Sidebar)
            const corteBtn = e.target.closest('#openCorteBtn') || e.target.closest('#sidebarCorteBtn');
            if (corteBtn) {
                e.preventDefault();
                e.stopPropagation();
                // Si es del sidebar, lo cerramos
                if (corteBtn.id === 'sidebarCorteBtn') {
                    document.getElementById('mainSidebar')?.classList.add('-translate-x-full');
                    document.getElementById('sidebarOverlay')?.classList.add('hidden');
                }
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

            // 2. Botón de Logout (Header & Sidebar)
            const logoutBtn = e.target.closest('#logoutBtn') || e.target.closest('#sidebarLogoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                if (await ModalService.confirm("Cerrar Sesión", "¿Estás seguro que deseas salir?", "Cerrar Sesión", "Cancelar")) {
                    await logoutUser();
                }
                return;
            }

            // 3. Botón Menú Hamburguesa (Mobile) → lista de pacientes
            const mobileMenuBtn = e.target.closest('#mobileMenuBtn');
            if (mobileMenuBtn) {
                e.preventDefault();
                MobileNav.showPatients();
                return;
            }

            // 5. Google Sync (header desktop + fila en menú Más móvil)
            const googleSyncTrigger =
                e.target.closest('#googleSyncBtn') || e.target.closest('#mobileMoreGoogleSync');
            if (googleSyncTrigger) {
                e.preventDefault();
                e.stopPropagation();
                const { GoogleSyncUI } = await import('../utils/GoogleSyncUI.js');
                await GoogleSyncUI.handleClick(googleSyncTrigger);
                return;
            }

            // 6. Botón Nuke Total (Solo Soporte) → borra TODO Google Calendar y recrea desde Firebase
            const forceSyncAllBtn = e.target.closest('#forceSyncAllBtn');
            if (forceSyncAllBtn) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const { GoogleCalendarService } = await import('../services/google/GoogleCalendarService.js');
                    const { db, collection, getDocs } = await import('../firebase.js');
                    
                    const confirmed = await ModalService.confirm(
                        "💣 Nuke Total — Solo Soporte",
                        "Esto borrará <strong>ABSOLUTAMENTE TODOS</strong> los eventos de Google Calendar (los 3 calendarios) y los recreará limpios desde Firebase.<br><br><small>⏱️ Puede tardar varios minutos dependiendo del número de citas.</small>",
                        "Sí, Nuke Total",
                        "Cancelar"
                    );
                    
                    if (confirmed) {
                        forceSyncAllBtn.disabled = true;
                        forceSyncAllBtn.classList.add('opacity-50', 'animate-pulse');
                        
                        // Obtener TODAS las citas de Firebase (no solo las de la semana visible)
                        const { collectionPath } = await import('../firebase.js');
                        const snapshot = await getDocs(collection(db, collectionPath));
                        const allAppointments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        
                        await GoogleCalendarService.nukeAndRebuildAll(allAppointments);
                        
                        forceSyncAllBtn.disabled = false;
                        forceSyncAllBtn.classList.remove('opacity-50', 'animate-pulse');
                    }
                } catch (err) {
                    console.error("Nuke Total failed:", err);
                    ToastService.error("Error en el Nuke Total: " + err.message);
                    document.getElementById('forceSyncAllBtn')?.classList.remove('opacity-50', 'animate-pulse');
                    document.getElementById('forceSyncAllBtn') && (document.getElementById('forceSyncAllBtn').disabled = false);
                }
                return;
            }


            // 7. Botón Configuración Admin
            const adminSettingsBtn = e.target.closest('#adminSettingsBtn');
            if (adminSettingsBtn) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const { AdminSettingsModal } = await import('../modules/admin/AdminSettingsModal.js');
                    AdminSettingsModal.open();
                } catch (err) {
                    console.error("Error abriendo Configuración:", err);
                }
                return;
            }

            // 8. Botón Bóveda de Soporte (Daniel Only)
            const supportBtn = e.target.closest('#openSupportVaultBtn');
            if (supportBtn) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const { SupportVault } = await import('../modules/support/SupportVault.js');
                    SupportVault.open();
                } catch (err) {
                    console.error("Error abriendo Bóveda de Soporte:", err);
                }
                return;
            }
        });
    }
};
