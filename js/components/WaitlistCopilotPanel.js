/**
 * WaitlistCopilotPanel.js
 * -------------------------------------------------------------
 * Banner flotante premium del «Copiloto Colaborativo» (Fase B).
 *
 * - Glassmorphism (backdrop-blur + bg semitransparente)
 * - Contador regresivo animado (10 min desde la cancelación)
 * - 3 acciones: 🚀 Automático · ⏸️ Pausar · 🔍 Búsqueda Manual
 *
 * Diseñado para anidar varios espacios libres simultáneamente
 * (stack vertical en escritorio, bottom-sheet apilable en móvil).
 */

import { WaitlistCopilotService } from '../services/WaitlistCopilotService.js';
import { AuthManager } from '../managers/AuthManager.js';

const CONTAINER_ID = 'waitlistCopilotContainer';
const MODAL_ID = 'waitlistCandidatesModal';

const THERAPIST_LABEL = {
    diana: 'Diana',
    sam: 'Sam',
    vero: 'Vero'
};

export const WaitlistCopilotPanel = {
    _initialized: false,
    _unsub: null,

    init() {
        if (this._initialized) return;

        // Solo recepción/admin necesita el copiloto
        const canSee = AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist';
        if (!canSee) return;

        this._ensureContainer();

        WaitlistCopilotService.start();
        this._unsub = WaitlistCopilotService.subscribe((items) => this.render(items));

        this._initialized = true;
    },

    destroy() {
        if (this._unsub) this._unsub();
        this._unsub = null;
        WaitlistCopilotService.stop();
        document.getElementById(CONTAINER_ID)?.remove();
        document.getElementById(MODAL_ID)?.remove();
        this._initialized = false;
    },

    _ensureContainer() {
        if (document.getElementById(CONTAINER_ID)) return;
        const wrap = document.createElement('div');
        wrap.id = CONTAINER_ID;
        wrap.className = [
            'fixed z-[9800] pointer-events-none',
            'top-[calc(var(--header-height,64px)+0.75rem)] right-3',
            'left-3 md:left-auto md:w-[26rem]',
            'flex flex-col gap-3'
        ].join(' ');
        document.body.appendChild(wrap);
    },

    render(items) {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '';
            this._lastSignature = '';
            return;
        }

        // Firma del conjunto: si solo cambió el contador, NO re-generamos HTML;
        // solo actualizamos los nodos `data-bind` (contador + barra).
        const signature = items.map(i => `${i.id}:${i.localStatus}`).join('|');
        const sameSet = signature === this._lastSignature;

        if (!sameSet) {
            this._lastSignature = signature;
            container.innerHTML = items.map((item) => this._cardHTML(item)).join('');
            items.forEach((item) => this._bindCard(item));
            return;
        }

        // Tick: actualizar solo contador + barra de progreso
        items.forEach((item) => {
            const card = container.querySelector(`[data-copilot-id="${item.id}"]`);
            if (!card) return;
            const countdownEl = card.querySelector('[data-bind="countdown"]');
            const progressEl = card.querySelector('[data-bind="progress"]');
            if (countdownEl) countdownEl.textContent = this._formatCountdown(item.remainingMs);
            if (progressEl) {
                const pct = Math.max(0, Math.min(100, (item.remainingMs / (10 * 60 * 1000)) * 100));
                progressEl.style.width = `${pct.toFixed(2)}%`;
            }
        });
    },

    _cardHTML(item) {
        const therapistName = THERAPIST_LABEL[item.therapist] || item.therapist;
        const timeLabel = this._formatTime(item.date);
        const countdown = this._formatCountdown(item.remainingMs);
        const progress = Math.max(0, Math.min(100, (item.remainingMs / (10 * 60 * 1000)) * 100));

        const statusBadge = (() => {
            if (item.localStatus === 'launching') {
                return '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-100 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">Lanzando…</span>';
            }
            if (item.localStatus === 'paused') {
                return '<span class="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-100 text-[10px] font-bold uppercase tracking-wider border border-slate-400/30">Autopilot en pausa</span>';
            }
            return '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30 animate-pulse">Esperando · 10 min</span>';
        })();

        const ctaDisabled = item.localStatus !== 'waiting';

        return `
        <div
            data-copilot-id="${item.id}"
            class="pointer-events-auto group relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/85 via-indigo-950/85 to-slate-900/85 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.5)] text-slate-100 animate-fade-in transition-all duration-300 hover:border-white/25 hover:shadow-[0_25px_70px_-12px_rgba(79,70,229,0.45)]">

            <!-- Glow decorativo de fondo -->
            <div aria-hidden="true" class="pointer-events-none absolute -inset-20 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.45),transparent_60%)]"></div>

            <div class="relative p-4">
                <!-- Cabecera -->
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200/90">Copiloto Colaborativo</p>
                            <h3 class="text-sm font-bold text-white truncate">Cita cancelada · ${timeLabel}</h3>
                            <p class="text-[11px] text-slate-300/90 truncate">${therapistName} · ${this._escape(item.patientName)}</p>
                        </div>
                    </div>
                    <button type="button" data-action="dismiss" aria-label="Ocultar"
                        class="shrink-0 w-7 h-7 rounded-lg text-slate-300/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Texto principal + contador -->
                <div class="mt-3 flex items-center justify-between gap-3">
                    <p class="text-xs text-slate-200/90 leading-relaxed">
                        Autopilot enviará ofertas por WhatsApp en:
                    </p>
                    ${statusBadge}
                </div>

                <div class="mt-2 flex items-baseline gap-2">
                    <span data-bind="countdown" class="font-mono tabular-nums text-3xl font-black bg-gradient-to-br from-white via-indigo-100 to-fuchsia-200 bg-clip-text text-transparent">${countdown}</span>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-300/80">min</span>
                </div>

                <!-- Barra de progreso animada -->
                <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div data-bind="progress" style="width:${progress.toFixed(2)}%"
                        class="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-[width] duration-700 ease-linear"></div>
                </div>

                <!-- Acciones -->
                <div class="mt-4 grid grid-cols-3 gap-2">
                    <button type="button" data-action="skip" ${ctaDisabled ? 'disabled' : ''}
                        class="group/btn relative overflow-hidden inline-flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-wide shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:scale-95">
                        <span class="text-base leading-none" aria-hidden="true">🚀</span>
                        <span class="leading-tight">Automático</span>
                    </button>

                    <button type="button" data-action="pause" ${ctaDisabled ? 'disabled' : ''}
                        class="inline-flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-wide border border-white/15 transition-all duration-300 hover:-translate-y-0.5 active:scale-95">
                        <span class="text-base leading-none" aria-hidden="true">⏸️</span>
                        <span class="leading-tight">Pausar</span>
                    </button>

                    <button type="button" data-action="manual" ${item.localStatus === 'paused' ? 'disabled' : ''}
                        class="inline-flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-100 text-[11px] font-bold uppercase tracking-wide border border-indigo-300/30 transition-all duration-300 hover:-translate-y-0.5 active:scale-95">
                        <span class="text-base leading-none" aria-hidden="true">🔍</span>
                        <span class="leading-tight">Manual</span>
                    </button>
                </div>

                <p class="mt-2 text-[10px] text-slate-400/80 leading-relaxed">
                    ${ctaDisabled ? 'Acción registrada. Esta tarjeta desaparecerá en unos segundos.' : 'Tienes 10 min para intervenir antes del envío automático.'}
                </p>
            </div>
        </div>`;
    },

    _bindCard(item) {
        const card = document.querySelector(`[data-copilot-id="${item.id}"]`);
        if (!card) return;

        card.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
            WaitlistCopilotService.dismissLocal(item.id);
        });

        card.querySelector('[data-action="skip"]')?.addEventListener('click', async () => {
            await WaitlistCopilotService.skipDelay(item.id);
            this._toast('🚀 Autopilot lanzado. Ofertas saliendo por WhatsApp…');
        });

        card.querySelector('[data-action="pause"]')?.addEventListener('click', async () => {
            await WaitlistCopilotService.pauseAutopilot(item.id);
            this._toast('⏸️ Autopilot pausado. Llena el espacio manualmente.');
        });

        card.querySelector('[data-action="manual"]')?.addEventListener('click', async () => {
            await WaitlistCopilotService.markManualSearch(item.id);
            this.openCandidatesModal(item);
        });
    },

    // ─────────────────── Modal de Búsqueda Manual ───────────────────

    async openCandidatesModal(item) {
        document.getElementById(MODAL_ID)?.remove();

        const therapistName = THERAPIST_LABEL[item.therapist] || item.therapist;
        const timeLabel = this._formatTime(item.date);

        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'fixed inset-0 z-[10100] flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-md p-0 md:p-4 animate-fade-in';
        modal.innerHTML = `
        <div class="bg-gradient-to-br from-white via-white to-indigo-50/50 w-full max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92dvh] md:max-h-[85vh] border border-indigo-100">

            <!-- Header -->
            <div class="relative p-5 md:p-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white overflow-hidden shrink-0">
                <div aria-hidden="true" class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-fuchsia-500/30 blur-3xl"></div>
                <div class="md:hidden flex justify-center pb-2 -mt-1"><span class="w-10 h-1 rounded-full bg-white/40"></span></div>
                <div class="relative flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/90">Búsqueda Manual</p>
                        <h2 class="text-lg md:text-xl font-bold mt-0.5">Candidatos para las ${timeLabel}</h2>
                        <p class="text-xs text-indigo-100/90 mt-1">${therapistName} · pacientes agendados más tarde hoy</p>
                    </div>
                    <button type="button" data-close
                        class="shrink-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center" aria-label="Cerrar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>

            <!-- Cuerpo -->
            <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-3 scroller">
                <div data-loading class="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 text-slate-500 text-sm">
                    <div class="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                    Buscando candidatos…
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 md:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 pb-safe-bottom">
                <p class="text-[11px] text-slate-500 leading-tight">El Autopilot sigue activo. Si llamas por teléfono y resuelves, presiona <strong>Pausar</strong> en el banner.</p>
                <button type="button" data-close
                    class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all">
                    Cerrar
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        document.body.classList.add('overflow-hidden');

        const close = () => {
            modal.remove();
            document.body.classList.remove('overflow-hidden');
        };
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
            if (e.target.closest('[data-close]')) close();
        });
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
                window.removeEventListener('keydown', escHandler);
            }
        };
        window.addEventListener('keydown', escHandler);

        // Cargar candidatos
        const body = modal.querySelector('.flex-1.overflow-y-auto');
        const candidates = await WaitlistCopilotService.getCandidates(item.id);

        if (!candidates || candidates.length === 0) {
            body.innerHTML = `
                <div class="text-center py-10 px-6">
                    <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <span class="text-2xl">🤷‍♀️</span>
                    </div>
                    <p class="font-bold text-slate-700">Sin candidatos elegibles</p>
                    <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">No hay pacientes con cita más tarde hoy para ${therapistName} (descartando &lt; 2 h de proximidad).</p>
                </div>`;
            return;
        }

        body.innerHTML = candidates.map((c) => this._candidateCardHTML(c, item)).join('');

        body.querySelectorAll('[data-call]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const phone = btn.dataset.call;
                if (phone) window.location.href = `tel:${phone}`;
            });
        });
        body.querySelectorAll('[data-whatsapp]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const phone = btn.dataset.whatsapp;
                const name = btn.dataset.name || '';
                const msg = encodeURIComponent(
                    `Hola ${name.split(' ')[0]}, te habla la clínica Parláre. Nos liberó un espacio hoy a las ${timeLabel} con ${therapistName}. ¿Te gustaría adelantar tu sesión?`
                );
                window.open(`https://wa.me/${this._normalizePhone(phone)}?text=${msg}`, '_blank');
            });
        });
    },

    _candidateCardHTML(c, freedItem) {
        const time = this._formatTime(c.date);
        const therapistName = THERAPIST_LABEL[c.therapist] || c.therapist;
        const phone = c.phone || '';
        const hasPhone = Boolean(phone);
        const optInBadge = (() => {
            const s = c.recurrentOptIn;
            if (s === 'accepted') return '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">WhatsApp ✓</span>';
            if (s === 'rejected') return '<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wide">Rechazó WA</span>';
            return '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">Sin opt-in</span>';
        })();

        return `
        <div class="group rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-slate-800 truncate">${this._escape(c.name || 'Paciente')}</p>
                        ${optInBadge}
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">Cita original: <strong>${time}</strong> · ${therapistName}</p>
                </div>
                <div class="shrink-0 text-right">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p class="text-xs font-mono text-slate-700">${this._escape(phone || '—')}</p>
                </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
                <button type="button" data-call="${this._escape(phone)}" ${!hasPhone ? 'disabled' : ''}
                    class="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold uppercase tracking-wide transition-all">
                    📞 Llamar
                </button>
                <button type="button" data-whatsapp="${this._escape(phone)}" data-name="${this._escape(c.name || '')}" ${!hasPhone ? 'disabled' : ''}
                    class="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wide shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5 active:scale-95">
                    💬 WhatsApp
                </button>
            </div>
        </div>`;
    },

    // ─────────────────── helpers ───────────────────

    _formatTime(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch { return '—'; }
    },

    _formatCountdown(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const ss = String(totalSeconds % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    },

    _escape(str) {
        return String(str ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    },

    _normalizePhone(phone) {
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length === 10) return `52${digits}`;
        return digits;
    },

    _toast(message) {
        import('../utils/ToastService.js')
            .then(({ ToastService }) => ToastService.show?.(message, 'success'))
            .catch(() => console.log('[Copilot]', message));
    }
};
