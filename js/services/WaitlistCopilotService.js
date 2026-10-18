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
    getDocs,
    onSnapshot
} from '../firebase.js';

const APPROVALS = 'collaborative_approvals';

export const COPILOT_DELAY_MS = 60 * 60 * 1000; // 60 minutos

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

        const q = query(
            collection(db, APPROVALS),
            where('status', '==', 'pending')
        );

        this._unsub = onSnapshot(q, (snap) => {
            this._handleApprovals(snap);
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

    async skipDelay(appointmentId) {
        await this._writeOverride(appointmentId, 'approved');
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
        await this._writeOverride(appointmentId, 'rejected');
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
        // No hacemos nada en este caso, la búsqueda manual no rechaza el Autopilot automáticamente.
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
            collection(db, 'appointments'),
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

    _handleApprovals(snap) {
        const activeIds = new Set();
        const now = Date.now();

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            activeIds.add(id);

            const createdAt = this._toMillis(data.createdAt) || now;
            const existing = this._pending.get(id);

            this._pending.set(id, {
                id,
                appointmentId: data.appointmentId,
                date: data.cancelledDate,
                therapist: data.therapist || 'diana',
                patientName: data.patientName || 'Paciente',
                cancelledAt: createdAt,
                localStatus: existing?.localStatus || 'waiting'
            });
        });

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

    async _writeOverride(appointmentId, status) {
        try {
            await setDoc(doc(db, APPROVALS, appointmentId), {
                status: status,
                approvedBy: status === 'approved' ? 'yari' : null,
                rejectedBy: status === 'rejected' ? 'yari' : null,
                [`${status}At`]: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.warn('[WaitlistCopilot] write override:', e);
            throw e;
        }
    }
};
