/**
 * AdminSettingsModal.js
 * Modal para la configuración de la clínica (Temas y Costos)
 */

import { SettingsManager } from '../../managers/SettingsManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { renderSaasReadyBanner, SAAS_READY_EXPLANATION } from '../../utils/saasReadyCopy.js';

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
        const existing = document.getElementById(this.id);
        if (existing) {
            existing.remove(); // Eliminar versión vieja para asegurar que cargue la nueva lógica
        }

        const html = `
            <div id="${this.id}" onclick="if(event.target===this) { this.classList.add('hidden'); this.style.display='none'; }" class="hidden fixed inset-0 z-[10000] flex md:items-center items-end justify-center bg-black bg-opacity-60 backdrop-blur-sm md:p-4 p-0">
                <div id="adminSettingsModalPanel" class="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-4xl md:h-[85vh] h-[92dvh] flex flex-col overflow-hidden animate-fade-in-up">
                    
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
                    <div class="px-6 border-b border-gray-100 bg-white flex gap-6">
                        <button id="tab-themes" class="py-4 text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all">Temas y Metodología</button>
                        <button id="tab-costs" class="py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all">Costos y Comisiones</button>
                        <button id="tab-reports" class="py-4 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-all">📊 Reporte Rápido</button>
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

                        <!-- TAB: REPORTS -->
                        <div id="content-reports" class="hidden space-y-6">
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
                            </div>
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
                this._renderThemes(SettingsManager.config.themes);
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
                this._renderThemes(SettingsManager.config.themes);
            }
        };

        window.removeSubtheme = (themeId, sIdx) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme) {
                theme.subthemes.splice(sIdx, 1);
                this._renderThemes(SettingsManager.config.themes);
            }
        };

        window.addSubSubtheme = (themeId, sIdx, val) => {
            if (!val.trim()) return;
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme && theme.subthemes[sIdx]) {
                if (!theme.subthemes[sIdx].items) theme.subthemes[sIdx].items = [];
                theme.subthemes[sIdx].items.push(val.trim());
                this._renderThemes(SettingsManager.config.themes);
            }
        };

        window.removeSubSubtheme = (themeId, sIdx, iIdx) => {
            const theme = SettingsManager.config.themes.find(t => t.id === themeId);
            if (theme && theme.subthemes[sIdx]) {
                theme.subthemes[sIdx].items.splice(iIdx, 1);
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

        const saasBanner = renderSaasReadyBanner(SAAS_READY_EXPLANATION.profileNote);
        const therapists = ['diana', 'sam', 'vero'];
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

    _collectBaseCostsForSave() {
        const therapists = ['diana', 'sam', 'vero'];
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
     * Configura event listeners
     */
    _setupListeners() {
        const tabThemes = document.getElementById('tab-themes');
        const tabCosts = document.getElementById('tab-costs');
        const tabReports = document.getElementById('tab-reports');
        const contThemes = document.getElementById('content-themes');
        const contCosts = document.getElementById('content-costs');
        const contReports = document.getElementById('content-reports');

        const tabs = [
            { btn: tabThemes, cont: contThemes },
            { btn: tabCosts, cont: contCosts },
            { btn: tabReports, cont: contReports }
        ];

        tabs.forEach(tab => {
            if (!tab.btn) return;
            tab.btn.onclick = () => {
                tabs.forEach(t => {
                    if (t.btn) {
                        t.btn.classList.remove('border-blue-600', 'text-blue-600');
                        t.btn.classList.add('border-transparent', 'text-gray-400');
                    }
                    if (t.cont) t.cont.classList.add('hidden');
                });
                tab.btn.classList.add('border-blue-600', 'text-blue-600');
                tab.btn.classList.remove('border-transparent', 'text-gray-400');
                tab.cont.classList.remove('hidden');
            };
        });

        // Botón para abrir el reporte completo
        const openFullReportBtn = document.getElementById('openFullReportBtn');
        if (openFullReportBtn) {
            openFullReportBtn.onclick = () => {
                this.close();
                // Simular click en el botón del header para disparar la lógica de reportes
                document.getElementById('openReportsBtn')?.click();
            };
        }

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
                baseCosts: this._collectBaseCostsForSave()
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
