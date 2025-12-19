/**
 * Header.js
 * Componente para gestionar la barra superior (Header)
 */

import { AuthManager } from '../managers/AuthManager.js';
import { ModalService } from '../utils/ModalService.js';
import { logoutUser } from '../firebase.js';
import { CalendarState } from '../modules/calendar/CalendarState.js';

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
                    <div>
                        <div class="font-bold text-gray-800">${AuthManager.getDisplayName()}</div>
                        <div class="text-xs text-gray-500 capitalize">${AuthManager.getRole()}</div>
                    </div>
                </div>
            `;
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
                openReportsBtn.classList.add('hidden');
            } else {
                openReportsBtn.classList.remove('hidden');
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

            // 2. Botón de Logout
            const logoutBtn = e.target.closest('#logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                if (await ModalService.confirm("Cerrar Sesión", "¿Estás seguro que deseas salir?", "Cerrar Sesión", "Cancelar")) {
                    await logoutUser();
                }
            }
        });
    }
};
