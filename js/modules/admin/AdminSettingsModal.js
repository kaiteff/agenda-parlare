/**
 * AdminSettingsModal.js
 * Modal para la configuración de la clínica (Temas y Costos)
 */

import { SettingsManager } from '../../managers/SettingsManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { renderSaasReadyBanner, SAAS_READY_EXPLANATION } from '../../utils/saasReadyCopy.js';
import { AuthManager } from '../../managers/AuthManager.js';
import {
    EDITABLE_STAFF_ROSTER,
    PERMISSION_GROUPS,
    ROLE_BASE_PERMISSIONS,
    computeEffectivePermissions,
    getDefaultStaffPermissions
} from '../../config/staffPermissions.js';

export const AdminSettingsModal = {
    id: 'adminSettingsModal',
    _modalInitialized: false,
    _renderedTabs: new Set(),
    _activeTabId: 'themes',
    _overlayClickHandler: null,

    /**
     * Abre el modal de configuración
     */
    async open() {
        if (!this._modalInitialized) {
            this.render();
            this._setupListeners();
            this._modalInitialized = true;
        }

        const modal = document.getElementById(this.id);
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        this._renderedTabs.clear();
        this._applyPermissionsTabVisibility();
        this._bindTabs();
        this._activateTab('themes');

        // Mostrar el shell al instante; contenido pesado en el siguiente frame
        requestAnimationFrame(() => {
            this._ensureTabRendered('themes');
        });
    },

    /**
     * Cierra el modal
     */
    close() {
        const modal = document.getElementById(this.id);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    },

    /**
     * Renderiza el HTML base del modal
     */
    render() {
        if (document.getElementById(this.id)) return;

        const html = `
            <div id="${this.id}" class="hidden fixed inset-0 z-[10000] flex md:items-center items-end justify-center bg-black/60 md:p-4 p-0">
                <div id="adminSettingsModalPanel" class="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-4xl md:h-[85vh] h-[92dvh] flex flex-col overflow-hidden">
                    
                    <!-- Pull Handle for Mobile -->
                    <div class="flex md:hidden justify-center pt-3 pb-1 flex-shrink-0 bg-gray-50/50">
                        <span class="w-10 h-1 rounded-full bg-gray-200"></span>
                    </div>
                    
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-gray-800">Panel de Configuración</h3>
                                <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Control Maestro de la Clínica</p>
                            </div>
                        </div>
                        <button id="closeAdminSettingsBtn" onclick="document.getElementById('adminSettingsModal').classList.add('hidden'); document.getElementById('adminSettingsModal').style.display='none';" class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <!-- Tabs Navigation -->
                    <div class="px-6 border-b border-gray-100 bg-white flex gap-4 overflow-x-auto scroller">
                        <button id="tab-themes" class="py-4 text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all whitespace-nowrap">Temas y Metodología</button>
                        <button id="tab-costs" class="py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all whitespace-nowrap">Costos y Comisiones</button>
                        <button id="tab-reports" class="py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all whitespace-nowrap">📊 Reporte Rápido</button>
                        <button id="tab-permissions" class="hidden py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all whitespace-nowrap">👥 Equipo y permisos</button>
                    </div>

                    <!-- Content Area -->
                    <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30 scroller">
                        
                        <!-- TAB: THEMES -->
                        <div id="content-themes" class="space-y-6">
                            <div class="flex justify-between items-center">
                                <h4 class="font-bold text-gray-700">Catálogo de Temas de Trabajo</h4>
                                <button id="addThemeBtn" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                    Nuevo Tema
                                </button>
                            </div>
                            <div id="themesList" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <p class="text-sm text-gray-400 col-span-full py-8 text-center">Cargando temas…</p>
                            </div>
                        </div>

                        <!-- TAB: COSTS -->
                        <div id="content-costs" class="hidden space-y-6">
                            <h4 class="font-bold text-gray-700">Configuración de Cuotas Base</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="costsList">
                                <p class="text-sm text-gray-400 col-span-full py-6 text-center">Abre esta pestaña para cargar costos.</p>
                            </div>
                            <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                                <svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <p class="text-xs text-amber-800 leading-relaxed font-medium">
                                    Estos valores se usarán automáticamente cuando crees un nuevo paciente. 
                                    Los pacientes ya existentes conservarán sus costos actuales a menos que los edites individualmente.
                                </p>
                            </div>
                        </div>

                        <!-- TAB: REPORTS -->
                        <div id="content-reports" class="hidden space-y-6">
                            <p class="text-sm text-gray-400 py-8 text-center">Abre esta pestaña para ver reportes.</p>
                        </div>

                        <!-- TAB: PERMISSIONS -->
                        <div id="content-permissions" class="hidden space-y-6">
                            <div class="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex gap-3">
                                <span class="text-xl">🔐</span>
                                <div class="text-xs text-violet-900 leading-relaxed">
                                    <p class="font-bold mb-1">Gestión de Accesos y Equipo</p>
                                    <p>Aquí puedes crear nuevas cuentas para el equipo y gestionar permisos. Los permisos en Firestore están ahora vinculados a Custom Claims en el servidor, garantizando máxima seguridad (S-005).</p>
                                </div>
                            </div>
                            
                            <!-- Formulario Registrar Miembro -->
                            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mt-4">
                                <h4 class="font-bold text-gray-800 mb-4">Registrar Nuevo Miembro</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                                        <input type="text" id="newStaffName" placeholder="Ej. Laura G." class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                                        <input type="email" id="newStaffEmail" placeholder="laura@parlare.mx" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Rol</label>
                                        <select id="newStaffRole" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" onchange="document.getElementById('newStaffTherapistId').disabled = this.value !== 'therapist'">
                                            <option value="therapist">Terapeuta</option>
                                            <option value="receptionist">Recepción</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Identificador (Solo Terapeutas)</label>
                                        <input type="text" id="newStaffTherapistId" placeholder="Ej. laura" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none">
                                    </div>
                                </div>
                                <div class="mt-4 flex justify-between items-center">
                                    <div id="newStaffResult" class="text-xs font-bold text-emerald-600"></div>
                                    <button id="btnCreateStaff" type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all">Crear Usuario</button>
                                </div>
                            </div>
                            
                            <h4 class="font-bold text-gray-700 mt-6 border-t border-gray-200 pt-6">Configuración de Privilegios</h4>
                            <div id="staffPermissionsList" class="space-y-4"></div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div id="adminSettingsModalFooter" class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                        <button id="cancelAdminSettingsBtn" onclick="document.getElementById('adminSettingsModal').classList.add('hidden'); document.getElementById('adminSettingsModal').style.display='none';" class="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
                        <button id="saveAllSettingsBtn" class="px-8 py-2.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                             <span>Guardar Todos los Cambios</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('dynamic-modals-root') || document.body;
        const div = document.createElement('div');
        div.innerHTML = html;
        container.appendChild(div.firstElementChild);
    },

    _applyPermissionsTabVisibility() {
        const tabPermissions = document.getElementById('tab-permissions');
        if (tabPermissions) {
            tabPermissions.classList.toggle('hidden', !AuthManager.canManageStaffPermissions());
        }
    },

    _tabMeta() {
        return [
            { id: 'themes', btn: document.getElementById('tab-themes'), cont: document.getElementById('content-themes') },
            { id: 'costs', btn: document.getElementById('tab-costs'), cont: document.getElementById('content-costs') },
            { id: 'reports', btn: document.getElementById('tab-reports'), cont: document.getElementById('content-reports') },
            { id: 'permissions', btn: document.getElementById('tab-permissions'), cont: document.getElementById('content-permissions') }
        ].filter((t) => t.btn && t.cont && !t.btn.classList.contains('hidden'));
    },

    _activateTab(tabId) {
        this._activeTabId = tabId;
        this._tabMeta().forEach((t) => {
            const active = t.id === tabId;
            if (t.btn) {
                t.btn.classList.toggle('border-blue-600', active);
                t.btn.classList.toggle('text-blue-600', active);
                t.btn.classList.toggle('border-transparent', !active);
                t.btn.classList.toggle('text-gray-400', !active);
            }
            if (t.cont) t.cont.classList.toggle('hidden', !active);
        });
    },

    _ensureTabRendered(tabId) {
        if (this._renderedTabs.has(tabId)) return;

        const config = SettingsManager.config;
        if (tabId === 'themes') {
            this._renderThemes(config.themes || []);
        } else if (tabId === 'costs') {
            this._renderCosts(config.baseCosts || {});
        } else if (tabId === 'permissions') {
            this._renderStaffPermissions(config.staffPermissions || getDefaultStaffPermissions());
        } else if (tabId === 'reports') {
            this._renderReportsTab();
        }

        this._renderedTabs.add(tabId);
    },

    _renderReportsTab() {
        const contentReports = document.getElementById('content-reports');
        if (!contentReports) return;

        if (!AuthManager.canViewClinicFinancials()) {
            contentReports.innerHTML = `
                <div class="bg-gray-100 border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-600">
                    Los reportes financieros consolidados solo están disponibles para la administradora de la clínica.
                </div>`;
            return;
        }

        if (document.getElementById('openFullReportBtn')) return;

        contentReports.innerHTML = `
            <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-100">
                <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                        <h4 class="text-2xl font-black">Reportes Financieros</h4>
                        <p class="text-blue-100 text-sm font-medium">Analiza la utilidad neta y el rendimiento de la clínica.</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button id="openFullReportBtn" class="flex items-center justify-center gap-3 p-4 bg-white text-blue-700 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-lg active:scale-95">
                        <span>Abrir Reporte Mensual</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </button>
                    <div class="p-4 bg-blue-500 bg-opacity-20 border border-white border-opacity-20 rounded-2xl flex flex-col justify-center text-center">
                        <div class="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1 opacity-80">Siguiente Corte</div>
                        <div class="text-sm font-bold">Fin de Mes Automático</div>
                    </div>
                </div>
            </div>`;

        const openFullReportBtn = document.getElementById('openFullReportBtn');
        if (openFullReportBtn) {
            openFullReportBtn.onclick = () => {
                if (!AuthManager.canViewClinicFinancials()) {
                    ToastService.warning('Solo la administradora puede abrir reportes consolidados.');
                    return;
                }
                this.close();
                document.getElementById('openReportsBtn')?.click();
            };
        }
    },

    /**
     * @deprecated Usar _ensureTabRendered por pestaña (lazy). Mantenido por compatibilidad interna.
     */
    _loadData() {
        this._applyPermissionsTabVisibility();
        this._ensureTabRendered(this._activeTabId || 'themes');
        this._bindTabs();
    },

    /**
     * Re-render de temas en el siguiente frame (evita bloquear UI al editar chips).
     */
    _scheduleThemesRender() {
        if (this._themesRenderPending) return;
        this._themesRenderPending = true;
        requestAnimationFrame(() => {
            this._themesRenderPending = false;
            this._renderThemes(SettingsManager.config.themes || []);
        });
    },

    /**
     * Renderiza la lista de temas
     */
    _renderThemes(themes) {
        const container = document.getElementById('themesList');
        if (!container) return;

        container.innerHTML = themes.map(theme => `
            <div class="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm group relative">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                         <input type="text" value="${theme.name}" class="text-lg font-black text-gray-800 bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none w-full transition-all" onchange="window.updateThemeName('${theme.id}', this.value)">
                    </div>
                    <button class="ml-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100" onclick="window.removeTheme('${theme.id}')" title="Eliminar Tema Completo">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>

                <!-- Subthemes Container -->
                <div class="space-y-4">
                    ${(theme.subthemes || []).map((sub, sIdx) => `
                        <div class="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sección / Subtema</span>
                                <button class="text-red-300 hover:text-red-500 text-xs" onclick="window.removeSubtheme('${theme.id}', ${sIdx})">Eliminar Sección</button>
                            </div>
                            <input type="text" value="${sub.name}" class="text-sm font-bold text-gray-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-full" onchange="window.updateSubthemeName('${theme.id}', ${sIdx}, this.value)">
                            
                            <!-- Sub-subthemes (Items) -->
                            <div class="flex flex-wrap gap-1.5">
                                ${(sub.items || []).map((item, iIdx) => `
                                    <span class="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-blue-600 text-[10px] font-bold rounded-lg border border-blue-50 shadow-sm group/item">
                                        ${item}
                                        <button class="hover:text-red-500 opacity-50 hover:opacity-100" onclick="window.removeSubSubtheme('${theme.id}', ${sIdx}, ${iIdx})">×</button>
                                    </span>
                                `).join('')}
                            </div>

                            <!-- Add Sub-subtheme -->
                            <div class="relative">
                                <input type="text" placeholder="Agregar actividad o detalle..." 
                                       class="w-full bg-white border-none rounded-lg pl-3 pr-8 py-1.5 text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                                       onkeydown="if(event.key==='Enter'){ window.addSubSubtheme('${theme.id}', ${sIdx}, this.value); this.value=''; }">
                                <button class="absolute right-2 top-1.5 text-blue-400 hover:text-blue-600" onclick="const input=this.previousElementSibling; window.addSubSubtheme('${theme.id}', ${sIdx}, input.value); input.value='';">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}

                    <!-- Add New Subtheme Section -->
                    <button onclick="window.addSubtheme('${theme.id}', 'Nueva Sección')" class="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all">
                        + Agregar Nueva Sección
                    </button>
                </div>
            </div>
        `).join('');

        // Tareas temporales en window para que los botones onclick funcionen
        window.updateThemeName = (id, val) => {
            const theme = SettingsManager.config.themes.find(t => t.id === id);
            if (theme) theme.name = val;
        };

        window.removeTheme = async (id) => {
            if (await ModalService.confirm("¿Eliminar Tema?", "Se borrará este tema y todos sus subtemas del catálogo global.", "Eliminar", "Cancelar")) {
                SettingsManager.config.themes = SettingsManager.config.themes.filter(t => t.id !== id);
                this._scheduleThemesRender();
            }
        };

        window.updateSubthemeName = (themeId, sIdx, val) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme && theme.subthemes[sIdx]) theme.subthemes[sIdx].name = val;
        };

        window.addSubtheme = (themeId, name) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme) {
                if (!theme.subthemes) theme.subthemes = [];
                theme.subthemes.push({ name: name, items: [] });
                this._scheduleThemesRender();
            }
        };

        window.removeSubtheme = (themeId, sIdx) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme) {
                theme.subthemes.splice(sIdx, 1);
                this._scheduleThemesRender();
            }
        };

        window.addSubSubtheme = (themeId, sIdx, val) => {
            if (!val.trim()) return;
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme && theme.subthemes[sIdx]) {
                if (!theme.subthemes[sIdx].items) theme.subthemes[sIdx].items = [];
                theme.subthemes[sIdx].items.push(val.trim());
                this._scheduleThemesRender();
            }
        };

        window.removeSubSubtheme = (themeId, sIdx, iIdx) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme && theme.subthemes[sIdx]) {
                theme.subthemes[sIdx].items.splice(iIdx, 1);
                this._scheduleThemesRender();
            }
        };
    },

    /**
     * Renderiza los costos base
     */
    _renderCosts(costs) {
        const container = document.getElementById('costsList');
        if (!container) return;

        const saasBanner = renderSaasReadyBanner(SAAS_READY_EXPLANATION.profileNote);
        const therapists = window.StaffManager ? window.StaffManager.getTherapists().map(t => t.id) : ['diana', 'sam', 'vero'];
        container.innerHTML = saasBanner + therapists.map(id => {
            const data = costs[id] || { cost: 500, fee: 250 };
            return `
                <div class="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase text-sm">${id.charAt(0)}</div>
                        <h5 class="font-black text-gray-800 capitalize">${id}</h5>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Costo Sugerido ($)</label>
                            <input type="number" value="${data.cost}" class="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" onchange="window.updateBaseCost('${id}', 'cost', this.value)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cuota Parláre Sugerida ($)</label>
                            <input type="number" value="${data.fee}" class="w-full bg-emerald-50 text-emerald-700 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-100 outline-none" onchange="window.updateBaseCost('${id}', 'fee', this.value)">
                        </div>
                        <div class="border-t border-dashed border-gray-200 pt-4 space-y-3 opacity-50">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Perfil profesional</span>
                                <span class="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">SaaS Ready</span>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cédula Profesional</label>
                                <input type="text" id="therapist_${id}_license" value="${(data.professionalLicense || '').replace(/"/g, '&quot;')}" disabled
                                    placeholder="Pendiente de activación SaaS"
                                    class="w-full bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium cursor-not-allowed">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Institución de Egreso</label>
                                <input type="text" id="therapist_${id}_institution" value="${(data.graduationInstitution || '').replace(/"/g, '&quot;')}" disabled
                                    placeholder="Pendiente de activación SaaS"
                                    class="w-full bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium cursor-not-allowed">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        window.updateBaseCost = (id, key, val) => {
            if (!SettingsManager.config.baseCosts[id]) SettingsManager.config.baseCosts[id] = {};
            SettingsManager.config.baseCosts[id][key] = parseFloat(val);
        };
    },

    _renderStaffPermissions(staffPermissions) {
        const container = document.getElementById('staffPermissionsList');
        if (!container) return;

        const allOptions = PERMISSION_GROUPS.flatMap((g) => g.options);

        container.innerHTML = EDITABLE_STAFF_ROSTER.map((member) => {
            const entry = staffPermissions[member.email] || { grants: [], denies: [] };
            const effective = computeEffectivePermissions(
                { email: member.email, role: member.role },
                { [member.email]: entry }
            );

            const groupsHtml = PERMISSION_GROUPS.map((group) => `
                <div class="mt-4">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">${group.label}</p>
                    <div class="space-y-2">
                        ${group.options.map((opt) => {
                            const checked = effective.has(opt.id);
                            const inBase = (ROLE_BASE_PERMISSIONS[member.role] || []).includes(opt.id);
                            return `
                                <label class="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/80 cursor-pointer touch-manipulation min-h-[44px]">
                                    <input type="checkbox"
                                        class="staff-perm-cb w-5 h-5 mt-0.5 rounded border-gray-300 text-violet-600"
                                        data-email="${member.email}"
                                        data-role="${member.role}"
                                        data-perm="${opt.id}"
                                        data-in-base="${inBase ? '1' : '0'}"
                                        ${checked ? 'checked' : ''}>
                                    <span class="text-sm text-gray-800 leading-snug">
                                        ${opt.label}
                                        ${inBase ? '<span class="block text-[10px] text-gray-400 font-medium">Incluido por defecto en su rol</span>' : ''}
                                    </span>
                                </label>`;
                        }).join('')}
                    </div>
                </div>
            `).join('');

            return `
                <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm" data-staff-card="${member.email}">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black">${member.displayName.charAt(0)}</div>
                        <div>
                            <h5 class="font-black text-gray-800">${member.displayName}</h5>
                            <p class="text-[10px] text-gray-400 uppercase font-bold">${member.role === 'receptionist' ? 'Recepción' : 'Terapeuta'}</p>
                        </div>
                    </div>
                    ${groupsHtml}
                </div>`;
        }).join('');
    },

    _collectStaffPermissionsForSave() {
        const staffPermissions = JSON.parse(JSON.stringify(
            SettingsManager.config.staffPermissions || getDefaultStaffPermissions()
        ));
        const allOptions = PERMISSION_GROUPS.flatMap((g) => g.options);

        EDITABLE_STAFF_ROSTER.forEach((member) => {
            const base = new Set(ROLE_BASE_PERMISSIONS[member.role] || []);
            const grants = [];
            const denies = [];

            allOptions.forEach((opt) => {
                const cb = document.querySelector(
                    `.staff-perm-cb[data-email="${member.email}"][data-perm="${opt.id}"]`
                );
                const want = cb?.checked === true;
                const hasBase = base.has(opt.id);
                if (want && !hasBase) grants.push(opt.id);
                if (!want && hasBase) denies.push(opt.id);
            });

            staffPermissions[member.email] = { grants, denies };
        });

        return staffPermissions;
    },

    _collectBaseCostsForSave() {
        const therapists = window.StaffManager ? window.StaffManager.getTherapists().map(t => t.id) : ['diana', 'sam', 'vero'];
        const baseCosts = JSON.parse(JSON.stringify(SettingsManager.config.baseCosts || {}));

        therapists.forEach(id => {
            if (!baseCosts[id]) baseCosts[id] = { cost: 500, fee: 250 };
            const licenseEl = document.getElementById(`therapist_${id}_license`);
            const institutionEl = document.getElementById(`therapist_${id}_institution`);
            baseCosts[id].professionalLicense = licenseEl?.value?.trim() ?? baseCosts[id].professionalLicense ?? '';
            baseCosts[id].graduationInstitution = institutionEl?.value?.trim() ?? baseCosts[id].graduationInstitution ?? '';
        });

        return baseCosts;
    },

    /**
     * Enlaza clics de pestañas. Debe ejecutarse después de _loadData() para incluir
     * «Equipo y permisos» (el botón arranca con class hidden en el HTML).
     */
    _bindTabs() {
        this._tabMeta().forEach((tab) => {
            tab.btn.onclick = () => {
                this._activateTab(tab.id);
                requestAnimationFrame(() => this._ensureTabRendered(tab.id));
            };
        });
    },

    /**
     * Configura event listeners (una sola vez)
     */
    _setupListeners() {
        this._bindTabs();

        const closeModals = () => this.close();
        document.getElementById('closeAdminSettingsBtn').onclick = closeModals;
        document.getElementById('cancelAdminSettingsBtn').onclick = closeModals;

        const modalOverlay = document.getElementById(this.id);
        if (modalOverlay && !this._overlayClickHandler) {
            this._overlayClickHandler = (e) => {
                if (e.target === modalOverlay) closeModals();
            };
            modalOverlay.addEventListener('click', this._overlayClickHandler);
        }

        // Nuevo Tema
        document.getElementById('addThemeBtn').onclick = () => {
            const newId = 'tema_' + Date.now();
            SettingsManager.config.themes.push({
                id: newId,
                name: 'Nuevo Tema',
                subthemes: []
            });
            this._scheduleThemesRender();
            // Hacer scroll al final
            setTimeout(() => {
                const list = document.getElementById('themesList');
                list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
                list.lastElementChild.querySelector('input').focus();
            }, 100);
        };

        // Crear Nuevo Staff
        const btnCreateStaff = document.getElementById('btnCreateStaff');
        if (btnCreateStaff) {
            btnCreateStaff.onclick = async () => {
                const name = document.getElementById('newStaffName').value.trim();
                const email = document.getElementById('newStaffEmail').value.trim();
                const role = document.getElementById('newStaffRole').value;
                let therapistId = document.getElementById('newStaffTherapistId').value.trim();

                if (!name || !email) {
                    ToastService.warning('Nombre y correo son obligatorios.');
                    return;
                }
                
                if (role !== 'therapist') {
                    therapistId = 'all';
                } else if (!therapistId) {
                    ToastService.warning('Para terapeutas, el identificador es obligatorio (ej. laura).');
                    return;
                }

                btnCreateStaff.disabled = true;
                btnCreateStaff.innerHTML = 'Creando...';
                document.getElementById('newStaffResult').innerHTML = '';
                
                try {
                    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js');
                    const functions = getFunctions();
                    const manageStaffUser = httpsCallable(functions, 'manage_staff_user');
                    
                    const res = await manageStaffUser({
                        name, email, role, therapistId, password: 'Parlare2026*'
                    });
                    
                    if (res.data.success) {
                        ToastService.success('Usuario creado correctamente.');
                        document.getElementById('newStaffResult').innerHTML = '✅ Creado. Contraseña por defecto: <b>Parlare2026*</b>';
                        document.getElementById('newStaffName').value = '';
                        document.getElementById('newStaffEmail').value = '';
                        document.getElementById('newStaffTherapistId').value = '';
                    } else {
                        ToastService.error('Error al crear usuario.');
                    }
                } catch (e) {
                    console.error(e);
                    ToastService.error('Error de permisos o red: ' + e.message);
                }
                
                btnCreateStaff.disabled = false;
                btnCreateStaff.innerHTML = 'Crear Usuario';
            };
        }

        // Guardar Todo
        document.getElementById('saveAllSettingsBtn').onclick = async () => {
            const btn = document.getElementById('saveAllSettingsBtn');
            btn.disabled = true;
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            const payload = {
                themes: SettingsManager.config.themes,
                baseCosts: this._collectBaseCostsForSave()
            };
            if (AuthManager.canManageStaffPermissions()) {
                payload.staffPermissions = this._collectStaffPermissionsForSave();
            }

            const result = await SettingsManager.saveConfig(payload);

            if (result.success) {
                ToastService.success('Configuración guardada correctamente');
                AuthManager.refreshPermissions();
                window.dispatchEvent(new CustomEvent('parlare:permissions-changed'));
                this.close();
            } else {
                ToastService.error('Error al guardar: ' + result.error);
            }

            btn.disabled = false;
            btn.innerHTML = '<span>Guardar Todos los Cambios</span>';
        };
    }
};
