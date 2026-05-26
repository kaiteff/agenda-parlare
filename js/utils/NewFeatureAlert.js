/**
 * NewFeatureAlert.js
 * Modal de bienvenida premium que muestra las últimas actualizaciones de la plataforma
 */
import { BRAND } from './brandAssets.js';

export const NewFeatureAlert = {
    STORAGE_KEY: 'parlare_onboarding_v9_3',
    // Claves antiguas en localStorage que ya no se usan y deben limpiarse.
    LEGACY_KEYS: ['parlare_onboarding_v8_0', 'parlare_onboarding_v9_0', 'parlare_onboarding_v9_1', 'parlare_onboarding_v9_2'],
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

        const launchDate = new Date('2026-05-26T00:00:00');
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
                <div class="p-6 md:p-8 bg-gradient-to-tr from-cyan-600 via-blue-600 to-fuchsia-600 text-white text-center shrink-0">
                    <img src="${BRAND.logoSrc}" alt="${BRAND.logoAlt}" class="h-14 w-auto mx-auto mb-3 object-contain bg-white/90 rounded-xl px-3 py-2" />
                    <h2 class="text-xl md:text-2xl font-bold">Novedades en Parláre</h2>
                    <p class="text-blue-100 text-xs font-semibold mt-1 uppercase tracking-wider">Actualización · 26 Mayo 2026</p>
                </div>
                <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scroller">
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-slate-50 rounded-2xl border border-indigo-200 shadow-sm">
                        <span class="text-xl shrink-0">🚀</span>
                        <div>
                            <h3 class="font-bold text-indigo-900 text-sm">Copiloto Colaborativo de cancelaciones <span class="text-[9px] uppercase tracking-wider bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded ml-1">Solo Yari/Diana</span></h3>
                            <p class="text-xs text-indigo-950/80 mt-1 leading-relaxed">Cuando se cancela una cita <strong>entre 8 y 24 horas antes</strong>, aparece automáticamente un <strong>banner flotante arriba a la derecha</strong> con un contador de <strong>8 minutos</strong>. Mientras corre el contador, la celda cancelada en la agenda <strong>brilla en ámbar/esmeralda con un ⚡</strong> para que la veas de inmediato. Tienes 3 botones:</p>
                            <ul class="text-xs text-indigo-950/80 mt-2 ml-3 space-y-1 list-disc">
                                <li><strong>🚀 Automático</strong> — Salta el contador y lanza ya las ofertas por WhatsApp a pacientes que tienen cita más tarde ese día con la misma terapeuta.</li>
                                <li><strong>⏸️ Pausar</strong> — Aborta el envío. Úsalo si vas a llenar tú el hueco a mano.</li>
                                <li><strong>🔍 Manual</strong> — Abre la lista de candidatos con teléfono y botón directo de WhatsApp por si prefieres llamar.</li>
                            </ul>
                            <p class="text-xs text-indigo-950/80 mt-2 leading-relaxed">Si no haces nada en 8 min, el sistema envía las ofertas solo. El primero que responda "Sí, adelantar" se queda con el espacio. Las terapeutas <strong>no ven este banner</strong> para no distraerlas.</p>
                            <div class="mt-2 px-3 py-2 bg-white/70 border border-indigo-200 rounded-lg text-[11px] text-indigo-900 leading-snug">
                                <strong>💡 Tip:</strong> Detalle completo en <em>Manual de Ayuda → Copiloto Colaborativo</em>.
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm">
                        <span class="text-xl shrink-0">🏖️</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Vacaciones / Día Completo — modal premium <span class="text-[9px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded ml-1">Nuevo</span></h3>
                            <p class="text-xs text-amber-950/80 mt-1 leading-relaxed">Al tocar el <strong>🔒 candado</strong> del día se abre un modal mucho más bonito y útil. <strong>Atajos rápidos «Hoy / Esta semana / Próxima semana / 2 semanas»</strong> rellenan las fechas con un toque. Las <strong>tarjetas de tipo</strong> (Vacaciones · Médica · Capacitación · Personal · Otro) se destacan en azul cuando las seleccionas. Una <strong>tarjeta de resumen</strong> te dice exactamente «Tipo · Terapeuta · rango · N días hábiles · horario» antes de confirmar, y un <strong>banner verde</strong> te avisa cuando no hay citas afectadas. Si las hay, ves nombre y hora para reagendar. <em>Vero y Sam solo pueden bloquear su propia agenda; Diana y Yari pueden bloquear a cualquiera.</em></p>
                            <div class="mt-2 px-3 py-2 bg-white/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-snug">
                                <strong>📝 Pruébalo en 3 toques:</strong> 🔒 candado del día → atajo <em>«Próxima semana»</em> → tipo <em>«🏥 Médica»</em>. Mira el resumen indigo y la barra verde. <strong>Paso a paso completo</strong> en <em>Manual de Ayuda → Tipos de Sesión y Bloqueos</em>.
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-amber-50 rounded-2xl border-l-4 border-amber-500">
                        <span class="text-xl shrink-0">⚠️</span>
                        <div>
                            <h3 class="font-bold text-amber-900 text-sm">Regla de Oro destacada en el Manual</h3>
                            <p class="text-xs text-amber-950/80 mt-1 leading-relaxed"><strong>«Lo que no está en la app de Parláre, no existe.»</strong> Nunca edites citas directamente en Google Calendar. Ábrelo en <strong>Manual de Ayuda</strong> para ver el banner completo y los flujos críticos.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <span class="text-xl shrink-0">🔍</span>
                        <div>
                            <h3 class="font-bold text-emerald-900 text-sm">Búsqueda de pacientes a prueba de iPhone</h3>
                            <p class="text-xs text-emerald-950/80 mt-1 leading-relaxed">Si antes en iPhone no salía un paciente recién creado: ahora la pestaña <strong>Todos</strong> se activa sola al escribir y la búsqueda detecta dictado por voz, paste y autocompletado del teclado. Sin acentos ni mayúsculas obligatorias.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <span class="text-xl shrink-0">🔔</span>
                        <div>
                            <h3 class="font-bold text-rose-900 text-sm">Campana de notificaciones funcionando en celular</h3>
                            <p class="text-xs text-rose-950/80 mt-1 leading-relaxed">El panel de notificaciones ya se despliega correctamente en el iPhone (antes quedaba escondido). Toca la <strong>🔔 campana</strong> arriba a la derecha para ver alertas y seguimientos pendientes.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <span class="text-xl shrink-0">🎯</span>
                        <div>
                            <h3 class="font-bold text-blue-900 text-sm">Pestañas unificadas en Confirmaciones</h3>
                            <p class="text-xs text-blue-950/80 mt-1 leading-relaxed">Eliminamos los botones duplicados «Hoy / Mañana» dentro del panel de Confirmaciones. Ahora <strong>solo manda la pestaña principal</strong> arriba de la lista de pacientes y el dashboard se sincroniza solo. Más limpio, menos confusión.</p>
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
