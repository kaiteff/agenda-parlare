/**
 * NewFeatureAlert.js
 * Modal de bienvenida premium que muestra las últimas actualizaciones de la plataforma
 */
import { BRAND } from './brandAssets.js';

export const NewFeatureAlert = {
    STORAGE_KEY: 'parlare_onboarding_v9_5',
    // Claves antiguas en localStorage que ya no se usan y deben limpiarse.
    LEGACY_KEYS: [
        'parlare_onboarding_v8_0',
        'parlare_onboarding_v9_0',
        'parlare_onboarding_v9_1',
        'parlare_onboarding_v9_2',
        'parlare_onboarding_v9_3',
        'parlare_onboarding_v9_4',
    ],
    // Vigencia del pop-up: pasados N días desde launchDate, deja de mostrarse
    // y el contenido importante vive solo en HelpManual.js.
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

        const launchDate = new Date('2026-06-02T00:00:00');
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
                <div class="p-6 md:p-8 bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white text-center shrink-0">
                    <img src="${BRAND.logoSrc}" alt="${BRAND.logoAlt}" class="h-14 w-auto mx-auto mb-3 object-contain bg-white/90 rounded-xl px-3 py-2" />
                    <h2 class="text-xl md:text-2xl font-bold">Novedades en Parláre</h2>
                    <p class="text-orange-100 text-xs font-semibold mt-1 uppercase tracking-wider">Actualización · 2 Junio 2026</p>
                </div>
                <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scroller">
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-violet-50 via-amber-50 to-orange-50 rounded-2xl border border-amber-300 shadow-sm">
                        <span class="text-xl shrink-0">🟣</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Deben sesión — pacientes especiales <span class="text-[9px] uppercase tracking-wider bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded ml-1">Yari</span></h3>
                            <p class="text-xs text-amber-950/85 mt-1 leading-relaxed">Contador de sesiones por recuperar <strong>esta semana</strong> — <em>no</em> es deuda en pesos (eso sigue siendo el filtro rojo).</p>
                            <ul class="text-xs text-amber-950/85 mt-2 ml-3 space-y-1 list-disc">
                                <li><strong>Cancelar cita de hoy</strong> → opcional «¿debe sesión?» (+1 al contador).</li>
                                <li><strong>Reagendar y guardar</strong> → no suma deuda por esa cancelación.</li>
                                <li><strong>Control Maestro</strong> → botón ámbar <strong>Deben sesión</strong>.</li>
                                <li><strong>Expediente</strong> → bloque «Cola sesión» al editar perfil.</li>
                            </ul>
                            <p class="text-[11px] text-amber-800 mt-1.5 italic">Detalle en Manual → Mensajes de WhatsApp.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl border border-amber-300 shadow-sm">
                        <span class="text-xl shrink-0">🏖️</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Vacaciones con citas afectadas — ahora con acciones <span class="text-[9px] uppercase tracking-wider bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded ml-1">Nuevo</span></h3>
                            <p class="text-xs text-amber-950/85 mt-1 leading-relaxed">Al bloquear vacaciones y haber niños agendados, eliges qué hacer:</p>
                            <ul class="text-xs text-amber-950/85 mt-2 ml-3 space-y-1 list-disc">
                                <li><strong>Solo bloquear</strong> — tú coordinas con las familias por fuera.</li>
                                <li><strong>Cancelar en Parláre</strong> — marca las citas canceladas en la app <em>(sin WhatsApp automático al papá)</em>.</li>
                                <li><strong>Pasar a otra terapeuta</strong> — Diana, Sam o Vero; la app cambia solo las que caben a la <strong>misma hora y día</strong>. Si quien cubre ya tiene paciente, te muestra <strong>otros huecos libres de esa terapeuta ese día</strong> para que coordines con el papá.</li>
                            </ul>
                            <div class="mt-2 px-3 py-2 bg-white/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-snug">
                                <strong>📱 En celular:</strong> <em>Más → Vacaciones / Ausencia</em> (Vero y Sam incluidos) o el candado 🔒 en el día.
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-slate-50 rounded-2xl border border-indigo-200 shadow-sm">
                        <span class="text-xl shrink-0">🚀</span>
                        <div>
                            <h3 class="font-bold text-indigo-900 text-sm">Copiloto Colaborativo <span class="text-[9px] uppercase tracking-wider bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded ml-1">Yari / Diana</span></h3>
                            <p class="text-xs text-indigo-950/80 mt-1 leading-relaxed">Cancelación entre 8 y 24 h antes → banner con contador de <strong>8 minutos</strong> y celda brillando con ⚡. Botones: Automático, Pausar o Manual. Si no actúas, el sistema ofrece el hueco por WhatsApp.</p>
                            <p class="text-[11px] text-indigo-800 mt-1.5 italic">Detalle en Manual → Copiloto Colaborativo.</p>
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
                    <button type="button" id="closeOnboardingBtn" class="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md active:scale-95 text-sm touch-manipulation">¡No volver a mostrar!</button>
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
