/**
 * AdminSettingsModal.js
 * Modal para la configuración de la clínica (Temas y Costos)
 */

import { SettingsManager } from '../../managers/SettingsManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';

export const AdminSettingsModal = {
    id: 'adminSettingsModal',

    /**
     * Abre el modal de configuración
     */
    async open() {
        this.render();
        const modal = document.getElementById(this.id);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Cargar datos iniciales
        this._loadData();
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
            <div id="${this.id}" onclick="if(event.target===this) { this.classList.add('hidden'); this.style.display='none'; }" class="hidden fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
                    
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
                    <div class="px-6 border-b border-gray-100 bg-white flex gap-6">
                        <button id="tab-themes" class="py-4 text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all">Temas y Metodología</button>
                        <button id="tab-costs" class="py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all">Costos y Comisiones</button>
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
                                <!-- Themes cards -->
                            </div>
                        </div>

                        <!-- TAB: COSTS -->
                        <div id="content-costs" class="hidden space-y-6">
                            <h4 class="font-bold text-gray-700">Configuración de Cuotas Base</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="costsList">
                                <!-- Cost cards for each therapist -->
                            </div>
                            <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                                <svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <p class="text-xs text-amber-800 leading-relaxed font-medium">
                                    Estos valores se usarán automáticamente cuando crees un nuevo paciente. 
                                    Los pacientes ya existentes conservarán sus costos actuales a menos que los edites individualmente.
                                </p>
                            </div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
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

        this._setupListeners();
    },

    /**
     * Carga los datos actuales del SettingsManager
     */
    _loadData() {
        const config = SettingsManager.config;
        this._renderThemes(config.themes || []);
        this._renderCosts(config.baseCosts || {});
    },

    /**
     * Renderiza la lista de temas
     */
    _renderThemes(themes) {
        const container = document.getElementById('themesList');
        if (!container) return;

        container.innerHTML = themes.map(theme => `
            <div class="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative">
                <div class="flex justify-between items-start mb-4">
                    <input type="text" value="${theme.name}" class="text-base font-black text-gray-800 bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-full mr-8" onchange="window.updateThemeName('${theme.id}', this.value)">
                    <button class="absolute top-4 right-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" onclick="window.removeTheme('${theme.id}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ">Subtemas / Actividades</label>
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${(theme.subthemes || []).map((sub, idx) => `
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 group/sub">
                                ${sub}
                                <button class="hover:text-red-500" onclick="window.removeSubtheme('${theme.id}', ${idx})">×</button>
                            </span>
                        `).join('')}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" placeholder="Agregar subtema..." class="flex-1 bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-200" onkeydown="if(event.key==='Enter'){ window.addSubtheme('${theme.id}', this.value); this.value=''; }">
                        <button class="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all" onclick="const input=this.previousElementSibling; window.addSubtheme('${theme.id}', input.value); input.value='';">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
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
                this._renderThemes(SettingsManager.config.themes);
            }
        };

        window.addSubtheme = (themeId, val) => {
            if (!val.trim()) return;
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme) {
                if (!theme.subthemes) theme.subthemes = [];
                theme.subthemes.push(val.trim());
                this._renderThemes(SettingsManager.config.themes);
            }
        };

        window.removeSubtheme = (themeId, idx) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme) {
                theme.subthemes.splice(idx, 1);
                this._renderThemes(SettingsManager.config.themes);
            }
        };
    },

    /**
     * Renderiza los costos base
     */
    _renderCosts(costs) {
        const container = document.getElementById('costsList');
        if (!container) return;

        const therapists = ['diana', 'sam', 'vero'];
        container.innerHTML = therapists.map(id => {
            const data = costs[id] || { cost: 500, fee: 250 };
            return `
                <div class="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase text-sm">${id.charAt(0)}</div>
                        <h5 class="font-black text-gray-800 capitalize">${id}</h5>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Costo Default ($)</label>
                            <input type="number" value="${data.cost}" class="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" onchange="window.updateBaseCost('${id}', 'cost', this.value)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cuota Parláre ($)</label>
                            <input type="number" value="${data.fee}" class="w-full bg-emerald-50 text-emerald-700 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-100 outline-none" onchange="window.updateBaseCost('${id}', 'fee', this.value)">
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

    /**
     * Configura event listeners
     */
    _setupListeners() {
        const tabThemes = document.getElementById('tab-themes');
        const tabCosts = document.getElementById('tab-costs');
        const contThemes = document.getElementById('content-themes');
        const contCosts = document.getElementById('content-costs');

        const switchTab = (activeTab, inactiveTab, activeCont, inactiveCont) => {
            activeTab.classList.add('border-blue-600', 'text-blue-600');
            activeTab.classList.remove('border-transparent', 'text-gray-400');
            inactiveTab.classList.remove('border-blue-600', 'text-blue-600');
            inactiveTab.classList.add('border-transparent', 'text-gray-400');
            activeCont.classList.remove('hidden');
            inactiveCont.classList.add('hidden');
        };

        tabThemes.onclick = () => switchTab(tabThemes, tabCosts, contThemes, contCosts);
        tabCosts.onclick = () => switchTab(tabCosts, tabThemes, contCosts, contThemes);

        // Cerrar modal
        const closeModals = () => this.close();
        document.getElementById('closeAdminSettingsBtn').onclick = closeModals;
        document.getElementById('cancelAdminSettingsBtn').onclick = closeModals;
        
        // Cerrar al clickear fuera
        const modalOverlay = document.getElementById(this.id);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModals();
        });

        // Nuevo Tema
        document.getElementById('addThemeBtn').onclick = () => {
            const newId = 'tema_' + Date.now();
            SettingsManager.config.themes.push({
                id: newId,
                name: 'Nuevo Tema',
                subthemes: []
            });
            this._renderThemes(SettingsManager.config.themes);
            // Hacer scroll al final
            setTimeout(() => {
                const list = document.getElementById('themesList');
                list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
                list.lastElementChild.querySelector('input').focus();
            }, 100);
        };

        // Guardar Todo
        document.getElementById('saveAllSettingsBtn').onclick = async () => {
            const btn = document.getElementById('saveAllSettingsBtn');
            btn.disabled = true;
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            const result = await SettingsManager.saveConfig({
                themes: SettingsManager.config.themes,
                baseCosts: SettingsManager.config.baseCosts
            });

            if (result.success) {
                ToastService.success('Configuración guardada correctamente');
                this.close();
            } else {
                ToastService.error('Error al guardar: ' + result.error);
            }

            btn.disabled = false;
            btn.innerHTML = '<span>Guardar Todos los Cambios</span>';
        };
    }
};
