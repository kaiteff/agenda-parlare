/**
 * NewFeatureAlert.js
 * Modal de bienvenida premium que muestra las últimas actualizaciones de la plataforma
 */
import { BRAND } from './brandAssets.js';

export const NewFeatureAlert = {
    STORAGE_KEY: 'parlare_onboarding_v9_11',
    LEGACY_KEYS: [
        'parlare_onboarding_v8_0',
        'parlare_onboarding_v9_0',
        'parlare_onboarding_v9_1',
        'parlare_onboarding_v9_2',
        'parlare_onboarding_v9_3',
        'parlare_onboarding_v9_4',
        'parlare_onboarding_v9_5',
        'parlare_onboarding_v9_6',
        'parlare_onboarding_v9_7',
        'parlare_onboarding_v9_8',
        'parlare_onboarding_v9_9',
        'parlare_onboarding_v9_10',
    ],
    MAX_DAYS_VISIBLE: 2,

    _cleanupLegacyKeys() {
        try {
            this.LEGACY_KEYS.forEach((key) => {
                if (localStorage.getItem(key) !== null) {
                    localStorage.removeItem(key);
                    console.log(`[NewFeatureAlert] Limpieza: clave legacy «${key}» eliminada de localStorage.`);
                }
            });
        } catch (_) { /* localStorage bloqueado: noop */ }
    },

    init() {
        this._cleanupLegacyKeys();

        const alreadySeen = localStorage.getItem(this.STORAGE_KEY);
        if (alreadySeen) return;

        const launchDate = new Date('2026-07-15T00:00:00');
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - launchDate) / (1000 * 60 * 60 * 24));
        if (diffDays > this.MAX_DAYS_VISIBLE) {
            console.log(`[NewFeatureAlert] Pop-up omitido (excedió el límite de ${this.MAX_DAYS_VISIBLE} días de vigencia). Las novedades viven ahora en el Manual de Ayuda.`);
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
                <div class="p-6 md:p-8 bg-gradient-to-tr from-cyan-600 via-teal-600 to-indigo-700 text-white text-center shrink-0">
                    <img src="${BRAND.logoSrc}" alt="${BRAND.logoAlt}" class="h-14 w-auto mx-auto mb-3 object-contain bg-white/90 rounded-xl px-3 py-2" />
                    <h2 class="text-xl md:text-2xl font-bold">Novedades en Parláre</h2>
                    <p class="text-cyan-100 text-xs font-semibold mt-1 uppercase tracking-wider">Actualización · 15 Julio 2026</p>
                </div>
                <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scroller">
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 rounded-2xl border border-sky-300 shadow-sm">
                        <span class="text-xl shrink-0">📱</span>
                        <div>
                            <h3 class="font-bold text-sky-950 text-sm">Celular horizontal (landscape) <span class="text-[9px] uppercase tracking-wider bg-sky-200 text-sky-950 px-1.5 py-0.5 rounded ml-1">Nuevo</span></h3>
                            <ul class="text-xs text-sky-950/85 mt-2 ml-3 space-y-1 list-disc">
                                <li>Si giras el teléfono, sigue la barra <strong>Agenda · Pacientes · Más</strong> abajo.</li>
                                <li>La lista de pacientes queda más angosta; la agenda tiene más espacio.</li>
                                <li>En vista <strong>Día</strong>, el nombre del día ya no se queda pegado encima de las citas al scrollear.</li>
                                <li>Control Maestro, Corte y Google Sync: menú <strong>Más</strong> (como en vertical).</li>
                            </ul>
                            <p class="text-[11px] text-sky-800 mt-1.5 italic">Manual → Agenda — vista Día / Semana.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 rounded-2xl border border-gray-400 shadow-sm">
                        <span class="text-xl shrink-0">📅</span>
                        <div>
                            <h3 class="font-bold text-gray-900 text-sm">Hora Inhábil y Google Calendar <span class="text-[9px] uppercase tracking-wider bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded ml-1">Sam · Diana · Vero</span></h3>
                            <ul class="text-xs text-gray-800/90 mt-2 ml-3 space-y-1 list-disc">
                                <li>Si bloqueas <strong>una hora</strong> en Parláre, en Google Calendar ya sale <strong>solo ese día</strong> — no toda la semana.</li>
                                <li>Si aún ves bloques viejos en Google: bórralos <strong>una vez</strong> (serie completa) y sincroniza desde Parláre.</li>
                                <li>La agenda de Parláre siempre manda: bloquea aquí, no en Google Calendar.</li>
                            </ul>
                            <p class="text-[11px] text-gray-700 mt-1.5 italic">Manual → Tipos de Sesión y Bloqueos → Inhabilitar Hora.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 rounded-2xl border border-rose-300 shadow-sm">
                        <span class="text-xl shrink-0">⚠️</span>
                        <div>
                            <h3 class="font-bold text-rose-900 text-sm">Control Maestro — hoy sin confirmar <span class="text-[9px] uppercase tracking-wider bg-rose-200 text-rose-950 px-1.5 py-0.5 rounded ml-1">Yari</span></h3>
                            <ul class="text-xs text-rose-950/85 mt-2 ml-3 space-y-1 list-disc">
                                <li>Citas de <strong>hoy</strong> que el papá no confirmó — filtro + banner.</li>
                                <li>Rosa con pulso si faltan <strong>≤2 h</strong> (WhatsApp manual).</li>
                            </ul>
                            <p class="text-[11px] text-rose-800 mt-1.5 italic">Manual → Mensajes de WhatsApp → Control Maestro.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 rounded-2xl border border-indigo-300 shadow-sm">
                        <span class="text-xl shrink-0">🧒</span>
                        <div>
                            <h3 class="font-bold text-indigo-900 text-sm">Alta paciente en evaluación <span class="text-[9px] uppercase tracking-wider bg-indigo-200 text-indigo-950 px-1.5 py-0.5 rounded ml-1">Diana / Yari</span></h3>
                            <ul class="text-xs text-indigo-950/85 mt-2 ml-3 space-y-1 list-disc">
                                <li>En <strong>Nuevo Paciente</strong>, elige <strong>Proceso de evaluación</strong> (con permiso).</li>
                                <li>Al agendar, cada cita lleva etapa: Entrevista, Evaluación, Entrega.</li>
                            </ul>
                            <p class="text-[11px] text-indigo-800 mt-1.5 italic">Manual → Pacientes.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-amber-50 rounded-2xl border-l-4 border-amber-500">
                        <span class="text-xl shrink-0">⚠️</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Regla de Oro</h3>
                            <p class="text-xs text-amber-950/80 mt-1 leading-relaxed"><strong>«Lo que no está en Parláre, no existe.»</strong> No edites citas en Google Calendar. Todo movimiento va en esta app.</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 md:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 pb-safe-bottom">
                    <button type="button" id="dismissOnboardingBtn" class="px-4 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl touch-manipulation">Cerrar aviso</button>
                    <button type="button" id="closeOnboardingBtn" class="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md active:scale-95 text-sm touch-manipulation">¡No volver a mostrar!</button>
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
