/**
 * WaitlistCopilotService.js
 * -------------------------------------------------------------
 * Frontend del «Copiloto Colaborativo» (Fase B / Waitlist Autopilot).
 *
 * Contrato con el backend (`functions/space_optimizer.py`):
 *   - El trigger `on_appointment_cancelled_trigger` detecta cancelaciones
 *     en ventana 8-24 h y hace un polling de 30 s sobre `copilot_overrides`
 *     durante 480 s (8 min de margen manual). Este límite viene del tope
 *     de Google Cloud Functions para triggers Firestore (540 s); se dejó
 *     un margen de 1 min para Twilio/Sheets tras procesar candidatos.
 *
 *   El frontend escribe en la colección `copilot_overrides/{appointmentId}`
 *   con uno de los siguientes valores en `action`:
 *     - 'skip_delay': lanzar ofertas WhatsApp YA (Autopilot inmediato).
 *     - 'pause': cancelar Autopilot; Yari llenará el espacio a mano.
 *     - 'manual_search': Yari abrió la búsqueda manual; sigue habiendo
 *        delay automático mientras tanto.
 *
 *   El backend lee ese documento en cada ciclo de polling (cada 30 s) y
 *   respeta la decisión. Por eso `COPILOT_DELAY_MS` DEBE coincidir con el
 *   `total_wait` del backend, o el banner mostrará tiempo restante falso
 *   y las pausas tardías se perderían silenciosamente.
 */

import {
    db,
    collection,
    query,
    where,
    doc,
    setDoc,
    serverTimestamp,
    getDocs
} from '../firebase.js';
import { CalendarData } from '../modules/calendar/CalendarData.js';

const APPOINTMENTS = 'appointments';
const OVERRIDES = 'copilot_overrides';

// 8 minutos en milisegundos — DEBE coincidir con `total_wait = 480` en
// `functions/space_optimizer.py:174`. Cambiar uno sin cambiar el otro rompe
// la UX (banner dice "te quedan X min" pero el backend ya terminó hace rato).
export const COPILOT_DELAY_MS = 8 * 60 * 1000;

// Ventana de antelación: 8 h a 24 h antes de la cita
const MIN_HOURS_BEFORE = 8;
const MAX_HOURS_BEFORE = 24;

export const WaitlistCopilotService = {
    /** Cancelaciones en delay actualmente visibles para Yari. */
    _pending: new Map(),

    /** Suscriptores que reciben actualizaciones del estado. */
    _subscribers: new Set(),

    /** Unsubscribe de Firestore. */
    _unsub: null,

    /** Timer del contador regresivo (1 s). */
    _tickTimer: null,

    /**
     * Inicia el listener de cancelaciones. Idempotente.
     */
    start() {
        if (this._unsub) return;

        // 28 may 2026: reutilizar el listener compartido de CalendarData (~90 días).
        // Antes había un segundo onSnapshot solo de canceladas → duplicaba lecturas al login.
        this._unsub = CalendarData.subscribe((appointments) => {
            this._handleAppointments(appointments);
        });

        this._tickTimer = setInterval(() => this._tick(), 1000);
    },

    stop() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
        if (this._tickTimer) {
            clearInterval(this._tickTimer);
            this._tickTimer = null;
        }
        this._pending.clear();
        this._subscribers.clear();
        this._notify();
    },

    /**
     * Recibe callbacks `(pending: Array<PendingItem>) => void`.
     * Devuelve función para des-suscribirse.
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        callback(this._snapshot());
        return () => this._subscribers.delete(callback);
    },

    /**
     * Salta el delay (ver `COPILOT_DELAY_MS`) y dispara Autopilot YA.
     */
    async skipDelay(appointmentId) {
        await this._writeOverride(appointmentId, 'skip_delay');
        const item = this._pending.get(appointmentId);
        if (item) {
            item.localStatus = 'launching';
            this._notify();
        }
    },

    /**
     * Aborta el Autopilot para este espacio. Yari lo llenará a mano.
     */
    async pauseAutopilot(appointmentId) {
        await this._writeOverride(appointmentId, 'pause');
        const item = this._pending.get(appointmentId);
        if (item) {
            item.localStatus = 'paused';
            this._notify();
        }
        // Quitar del banner pasados 4 s para que Yari vea la confirmación
        setTimeout(() => {
            this._pending.delete(appointmentId);
            this._notify();
        }, 4000);
    },

    /**
     * Marca que Yari abrió la búsqueda manual (solo trazabilidad).
     */
    async markManualSearch(appointmentId) {
        try {
            await this._writeOverride(appointmentId, 'manual_search');
        } catch (_) { /* trazabilidad opcional, ignorar fallos */ }
    },

    /**
     * Descarta el banner de un espacio sin tomar acción (UI only).
     */
    dismissLocal(appointmentId) {
        this._pending.delete(appointmentId);
        this._notify();
    },

    /**
     * Devuelve los IDs de citas activas que están en delay (para el glow del calendario).
     * @returns {Set<string>} Set de `appointmentId`.
     */
    getGlowingAppointmentIds() {
        const ids = new Set();
        for (const [id, item] of this._pending.entries()) {
            if (item.localStatus !== 'paused') ids.add(id);
        }
        return ids;
    },

    /**
     * Busca candidatos del mismo día / mismo terapeuta / más tarde.
     * Para el modal de Búsqueda Manual.
     *
     * @param {string} appointmentId
     * @returns {Promise<Array<Object>>}
     */
    async getCandidates(appointmentId) {
        const item = this._pending.get(appointmentId);
        if (!item) return [];
        return this.getCandidatesForSlot({
            id: appointmentId,
            therapist: item.therapist,
            date: item.date
        });
    },

    /**
     * Candidatos para búsqueda manual (día o quiet hours).
     * @param {{ id: string, therapist: string, date: string }} slot
     */
    async getCandidatesForSlot(slot) {
        if (!slot?.date || !slot?.therapist) return [];

        const therapist = slot.therapist;
        const cancelledDate = new Date(slot.date);

        // Misma día (hasta 23:59), citas > cancelledDate
        const dayEnd = new Date(cancelledDate);
        dayEnd.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, APPOINTMENTS),
            where('therapist', '==', therapist),
            where('date', '>', slot.date),
            where('date', '<=', dayEnd.toISOString())
        );

        try {
            const snap = await getDocs(q);
            const candidates = [];
            snap.forEach((d) => {
                const data = d.data();
                if (data.isCancelled || data.isPaid) return;
                if (data.isFullDayBlock || data.isHourlyBlock) return;
                // Misma regla de proximidad del backend: mínimo 2 h de diferencia
                const candDate = new Date(data.date);
                const diffHours = (candDate - cancelledDate) / (1000 * 60 * 60);
                if (diffHours < 2) return;
                candidates.push({ id: d.id, ...data });
            });
            // De más tarde a más temprano para comprimir agenda
            candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
            return candidates;
        } catch (e) {
            console.warn('[WaitlistCopilot] getCandidates:', e);
            return [];
        }
    },

    // ─────────────────────── internos ───────────────────────

    _handleAppointments(appointments) {
        const now = Date.now();
        const activeIds = new Set();

        for (const data of appointments) {
            const id = data.id;
            if (!data.isCancelled) {
                continue;
            }

            if (!data.date) continue;
            const aptDate = new Date(data.date);
            const hoursBefore = (aptDate - new Date()) / (1000 * 60 * 60);
            if (hoursBefore < MIN_HOURS_BEFORE || hoursBefore > MAX_HOURS_BEFORE) {
                continue;
            }

            const cancelledAt = this._toMillis(data.cancelledAt) || now;
            const elapsed = now - cancelledAt;
            if (elapsed >= COPILOT_DELAY_MS) {
                continue;
            }

            activeIds.add(id);
            const existing = this._pending.get(id);
            this._pending.set(id, {
                id,
                date: data.date,
                therapist: data.therapist || 'diana',
                patientName: data.name || 'Paciente',
                cancelledAt,
                cancelledBy: data.cancelledBy || null,
                localStatus: existing?.localStatus || 'waiting'
            });
        }

        for (const id of [...this._pending.keys()]) {
            if (!activeIds.has(id)) this._pending.delete(id);
        }
        this._notify();
    },

    _tick() {
        const now = Date.now();
        let changed = false;
        for (const [id, item] of this._pending.entries()) {
            const elapsed = now - item.cancelledAt;
            if (elapsed >= COPILOT_DELAY_MS && item.localStatus !== 'paused') {
                this._pending.delete(id);
                changed = true;
            }
        }
        if (changed) this._notify();
        // Tick "silencioso" cada segundo para refrescar contadores en suscriptores
        if (this._pending.size > 0) this._notify();
    },

    _toMillis(ts) {
        if (!ts) return null;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'string') return new Date(ts).getTime();
        return null;
    },

    _snapshot() {
        const now = Date.now();
        return Array.from(this._pending.values())
            .map((item) => ({
                ...item,
                remainingMs: Math.max(0, item.cancelledAt + COPILOT_DELAY_MS - now)
            }))
            .sort((a, b) => a.remainingMs - b.remainingMs);
    },

    _notify() {
        const snap = this._snapshot();
        this._subscribers.forEach((cb) => {
            try { cb(snap); } catch (e) { console.warn('[WaitlistCopilot] subscriber:', e); }
        });
    },

    async _writeOverride(appointmentId, action) {
        try {
            await setDoc(doc(db, OVERRIDES, appointmentId), {
                appointmentId,
                action,
                createdAt: serverTimestamp(),
                source: 'frontend_copilot_panel'
            });
        } catch (e) {
            console.warn('[WaitlistCopilot] write override:', e);
            throw e;
        }
    }
};
