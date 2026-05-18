/**
 * NewFeatureAlert.js
 * Modal de bienvenida premium que muestra las últimas actualizaciones de la plataforma
 */
import { BRAND } from './brandAssets.js';

export const NewFeatureAlert = {
    STORAGE_KEY: 'parlare_onboarding_v9_0',

    init() {
        const alreadySeen = localStorage.getItem(this.STORAGE_KEY);
        if (alreadySeen) return;

        const launchDate = new Date('2026-05-18T00:00:00');
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - launchDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 3) {
            console.log('[NewFeatureAlert] Pop-up omitido (excedió el límite de 3 días de vigencia).');
            return;
        }

        setTimeout(() => this.show(), 1500);
    },

    show() {
        const modalId = 'onboardingNewFeaturesModal';
        const html = `
        <div id="${modalId}" role="dialog" aria-modal="true"
            class="fixed inset-0 z-[100000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4 animate-fade-in">
            <div class="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden text-gray-800 flex flex-col max-h-[92dvh] md:max-h-[90vh]">
                <div class="md:hidden flex justify-center pt-2.5 pb-0 shrink-0"><span class="w-10 h-1 rounded-full bg-gray-200"></span></div>
                <div class="p-6 md:p-8 bg-gradient-to-tr from-cyan-600 via-blue-600 to-fuchsia-600 text-white text-center shrink-0">
                    <img src="${BRAND.logoSrc}" alt="${BRAND.logoAlt}" class="h-14 w-auto mx-auto mb-3 object-contain bg-white/90 rounded-xl px-3 py-2" />
                    <h2 class="text-xl md:text-2xl font-bold">Novedades en Parláre</h2>
                    <p class="text-blue-100 text-xs font-semibold mt-1 uppercase tracking-wider">Mayo 2026</p>
                </div>
                <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scroller">
                    <div class="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <span class="text-xl shrink-0">🚦</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Consentimiento WhatsApp</h3>
                            <p class="text-xs text-amber-950/80 mt-1 leading-relaxed">Semáforo en la ficha del paciente: <strong>WhatsApp Activo</strong>, <strong>Pendiente</strong> o <strong>Seguimiento Manual</strong>. Los recordatorios automáticos solo salen si el padre acepta.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <span class="text-xl shrink-0">📅</span>
                        <div>
                            <h3 class="font-bold text-purple-900 text-sm">Modo «Un Día» en celular</h3>
                            <p class="text-xs text-purple-950/80 mt-1 leading-relaxed">Vista diaria con pestañas Lun–Sáb y toggle <strong>Día | Semana</strong> junto a «Hoy». Sin scroll horizontal en el teléfono.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <span class="text-xl shrink-0">📄</span>
                        <div>
                            <h3 class="font-bold text-blue-900 text-sm">Recibos de reembolso (PDF)</h3>
                            <p class="text-xs text-blue-950/80 mt-1 leading-relaxed">Al marcar una cita como pagada, el sistema puede generar el comprobante para la aseguradora (cuando esté activo en el paciente).</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 md:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 pb-safe-bottom">
                    <button type="button" id="dismissOnboardingBtn" class="px-4 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl touch-manipulation">Cerrar aviso</button>
                    <button type="button" id="closeOnboardingBtn" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md active:scale-95 text-sm touch-manipulation">¡No volver a mostrar!</button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const removeModal = () => {
            const el = document.getElementById(modalId);
            if (el) {
                el.classList.add('opacity-0');
                el.style.transition = 'opacity 0.2s ease-out';
                setTimeout(() => el.remove(), 200);
            }
        };

        document.getElementById('closeOnboardingBtn')?.addEventListener('click', () => {
            removeModal();
            localStorage.setItem(this.STORAGE_KEY, 'true');
        });
        document.getElementById('dismissOnboardingBtn')?.addEventListener('click', removeModal);
    }
};
