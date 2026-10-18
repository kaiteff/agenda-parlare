/**
 * ClinicSelector.js
 * Pantalla post-login para usuarios platform_support.
 */

import { ClinicContext } from '../core/ClinicContext.js';
import { AuthManager } from '../managers/AuthManager.js';
import { logoutUser } from '../firebase.js';

export const ClinicSelector = {
    _container: null,
    _onSelected: null,

    /**
     * @param {() => void} onSelected - callback cuando ya hay clínica activa
     */
    async show(onSelected) {
        this._onSelected = onSelected;
        this._ensureContainer();

        const clinics = await ClinicContext.listClinics();
        this._render(clinics);
        this._container.classList.remove('hidden');
    },

    hide() {
        this._container?.classList.add('hidden');
    },

    _ensureContainer() {
        if (this._container) return;

        let el = document.getElementById('clinicSelectorContainer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'clinicSelectorContainer';
            el.className = 'hidden fixed inset-0 z-[20000] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4';
            document.body.appendChild(el);
        }
        this._container = el;
    },

    _render(clinics) {
        const userName = AuthManager.getDisplayName();
        const cards = clinics.map((c) => `
            <button type="button"
                data-clinic-id="${c.id}"
                class="clinic-pick-btn group w-full text-left p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-400/60 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-200 font-black text-lg">
                        ${(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-white text-lg truncate">${c.name || c.id}</p>
                        <p class="text-indigo-200/70 text-sm">${c.status === 'pilot' ? 'Fase piloto' : 'Activa'}</p>
                    </div>
                    <svg class="w-5 h-5 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
            </button>
        `).join('');

        this._container.innerHTML = `
            <div class="w-full max-w-md">
                <div class="text-center mb-8">
                    <img src="assets/parlare-logo.png" alt="Parláre" class="h-10 mx-auto mb-4 opacity-90" />
                    <p class="text-indigo-300 text-sm font-semibold uppercase tracking-widest">Parláre Support</p>
                    <h1 class="text-2xl font-black text-white mt-2">Selecciona la clínica</h1>
                    <p class="text-slate-400 text-sm mt-2">Hola, ${userName}. Elige dónde trabajarás en esta sesión.</p>
                </div>
                <div class="space-y-3 mb-6">${cards}</div>
                <button type="button" id="clinicSelectorLogout" class="w-full py-3 text-sm text-slate-400 hover:text-white transition-colors">
                    Cerrar sesión
                </button>
            </div>
        `;

        this._container.querySelectorAll('.clinic-pick-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const clinicId = btn.getAttribute('data-clinic-id');
                btn.disabled = true;
                await ClinicContext.setActiveClinic(clinicId);
                this.hide();
                if (this._onSelected) this._onSelected();
            });
        });

        this._container.querySelector('#clinicSelectorLogout')?.addEventListener('click', async () => {
            ClinicContext.clear();
            await logoutUser();
        });
    }
};
