/**
 * SuggestionsModal.js
 * Modal para recolectar sugerencias y parches de los usuarios.
 */

import { db, collection, addDoc, serverTimestamp } from '../../firebase.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { ToastService } from '../../utils/ToastService.js';

export const SuggestionsModal = {
    open() {
        const modalId = 'suggestionsModal';
        if (document.getElementById(modalId)) return;

        const html = `
        <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                
                <!-- Header -->
                <div class="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-white/20 rounded-xl">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">Buzón de Sugerencias</h2>
                            <p class="text-amber-100 text-xs font-medium">Ayúdanos a mejorar Parláre</p>
                        </div>
                    </div>
                    <button id="closeSuggestionsBtn" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-8">
                    <p class="text-gray-600 text-sm mb-6 leading-relaxed">
                        ¿Tienes una idea para una nueva función o encontraste algo que podemos mejorar? <br>
                        <span class="font-bold text-orange-600">Escríbela aquí abajo.</span> Las revisamos semanalmente para lanzar mini-parches.
                    </p>

                    <form id="suggestionForm" class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Tu Sugerencia</label>
                            <textarea id="suggestionText" required
                                class="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all resize-none text-gray-800 placeholder-gray-400"
                                placeholder="Ej: Me gustaría que el calendario tuviera vista mensual..."></textarea>
                        </div>

                        <button type="submit" id="submitSuggestionBtn"
                            class="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <span>🚀 Enviar Sugerencia</span>
                        </button>
                    </form>
                </div>

                <!-- Footer -->
                <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-center shrink-0">
                    <p class="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Tus ideas construyen Parláre</p>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Bind events
        document.getElementById('closeSuggestionsBtn').onclick = () => this._close();
        
        const form = document.getElementById('suggestionForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = document.getElementById('suggestionText').value.trim();
            if (!text) return;

            const btn = document.getElementById('submitSuggestionBtn');
            btn.disabled = true;
            btn.innerHTML = `<span>Enviando...</span>`;

            try {
                await addDoc(collection(db, 'suggestions'), {
                    text: text,
                    user: AuthManager.currentUser?.email || 'Anónimo',
                    role: AuthManager.currentUser?.role || 'Desconocido',
                    createdAt: serverTimestamp(),
                    status: 'pending' // pending, reviewing, implemented
                });

                ToastService.success('¡Sugerencia enviada! Gracias por ayudarnos.');
                this._close();
            } catch (err) {
                console.error("❌ Error enviando sugerencia:", err);
                ToastService.error('No se pudo enviar la sugerencia. Intenta de nuevo.');
                btn.disabled = false;
                btn.innerHTML = `<span>🚀 Enviar Sugerencia</span>`;
            }
        };
    },

    _close() {
        const el = document.getElementById('suggestionsModal');
        if (el) el.remove();
    }
};
