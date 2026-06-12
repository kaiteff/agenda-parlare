/**
 * SupportVault.js
 * Panel exclusivo para Soporte Técnico / Daniel.
 * Muestra bitácora de sugerencias y diagnósticos del sistema.
 */

import { db, collection, query, orderBy, limit, getDocs } from '../../firebase.js';
import { ModalService } from '../../utils/ModalService.js';
import { AuthManager } from '../../managers/AuthManager.js';

export const SupportVault = {
    /**
     * Inicializa el módulo y controla la visibilidad según el usuario
     */
    async init() {
        console.log('🛡️ SupportVault: Inicializando...');
        this._checkVisibility();
    },

    _checkVisibility() {
        const email = AuthManager.getEmail();
        const isDaniel = email === 'rodriguezd.danielrob@gmail.com';
        
        const btn = document.getElementById('openSupportVaultBtn');
        if (btn) {
            if (isDaniel) {
                btn.classList.remove('hidden');
                btn.classList.add('md:flex');
            } else {
                btn.classList.add('hidden');
                btn.classList.remove('md:flex');
            }
        }
    },

    async open() {
        const modalId = 'supportVaultModal';
        if (document.getElementById(modalId)) return;

        // Mostrar cargando
        const loadingHtml = `
            <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div class="bg-white w-full max-w-2xl rounded-3xl p-10 flex flex-col items-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
                    <p class="text-purple-900 font-bold">Cargando Bóveda de Soporte...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);

        try {
            // Cargar logs de sugerencias
            const q = query(collection(db, 'support_suggestions'), orderBy('acceptedAt', 'desc'), limit(30));
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(d => d.data());

            // Remover cargando
            document.getElementById(modalId)?.remove();

            const html = `
            <div id="${modalId}" onclick="if(event.target===this) this.remove()" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div class="bg-slate-900 w-full max-w-3xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 animate-scale-up">
                    
                    <!-- Header -->
                    <div class="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex justify-between items-center shrink-0 border-b border-white/10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-purple-500/20 rounded-xl">
                                <svg class="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Bóveda de Soporte</h2>
                                <p class="text-purple-300 text-xs font-medium">Diagnósticos y Auditoría de IA</p>
                            </div>
                        </div>
                        <button id="closeSupportVaultBtn" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto p-6 scroller">
                        <div class="space-y-4">
                            <h3 class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Sugerencias Inteligentes Aceptadas (Últimas 30)</h3>
                            
                            ${logs.length === 0 ? `
                                <div class="p-10 text-center text-slate-500 italic text-sm">
                                    No hay registros de sugerencias aceptadas aún.
                                </div>
                            ` : logs.map(log => `
                                <div class="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-all group">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="text-purple-400 font-bold text-sm">${log.patientName}</span>
                                        <span class="text-[10px] text-slate-500">${new Date(log.acceptedAt).toLocaleString()}</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="text-xs text-slate-300">
                                            <div class="text-slate-500 uppercase text-[9px] font-bold mb-1">Horario Sugerido</div>
                                            <div class="font-medium">${new Date(log.suggestedDate).toLocaleString('es-MX', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div class="text-xs text-slate-300">
                                            <div class="text-slate-500 uppercase text-[9px] font-bold mb-1">Aceptado por</div>
                                            <div class="font-medium text-blue-400">${log.acceptedBy.split('@')[0]}</div>
                                        </div>
                                    </div>
                                    <div class="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                                        <span class="text-[10px] px-2 py-0.5 bg-slate-700 rounded text-slate-400">Patrón: ${log.patternCount} citas previas</span>
                                        <span class="text-[10px] text-green-500 font-bold">✅ EXITOSO</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 bg-slate-900 border-t border-slate-700 flex justify-center shrink-0">
                        <p class="text-slate-600 text-[9px] font-bold uppercase tracking-widest">Acceso restringido a Soporte Técnico Parláre</p>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('closeSupportVaultBtn').onclick = () => {
                document.getElementById(modalId)?.remove();
            };

        } catch (error) {
            console.error("Error en Bóveda:", error);
            document.getElementById(modalId)?.remove();
            ModalService.alert("Error de Acceso", "No se pudieron cargar los datos de soporte.");
        }
    }
};
