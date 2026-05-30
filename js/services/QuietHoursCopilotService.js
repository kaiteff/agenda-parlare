/**
 * QuietHoursCopilotService.js
 * -------------------------------------------------------------
 * Cola de cancelaciones fuera de horario (22:00–07:00 MX).
 * El backend escribe en `quiet_hours_pending/{appointmentId}` y el cron
 * de las 8:00 AM libera las que sigan en `pending`. Yari puede:
 *   - Liberar ahora (`status: release_now` → trigger Firestore)
 *   - Pausar (`status: paused` → el cron no las toca)
 *   - Descartar tarjeta (borra el doc si está pausada)
 */

import {
    db,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from '../firebase.js';

const QUIET_HOURS = 'quiet_hours_pending';

export const QuietHoursCopilotService = {
    _pending: new Map(),
    _subscribers: new Set(),
    _unsub: null,

    start() {
        if (this._unsub) return;

        this._unsub = onSnapshot(
            collection(db, QUIET_HOURS),
            (snap) => this._handleSnapshot(snap),
            (err) => console.warn('[QuietHoursCopilot] Listener:', err)
        );
    },

    stop() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
        this._pending.clear();
        this._notify();
    },

    subscribe(callback) {
        this._subscribers.add(callback);
        callback(this._snapshot());
        return () => this._subscribers.delete(callback);
    },

    /** Dispara procesamiento inmediato vía trigger backend. */
    async releaseNow(appointmentId) {
        const item = this._pending.get(appointmentId);
        if (item) {
            item.localStatus = 'launching';
            this._notify();
        }
        await updateDoc(doc(db, QUIET_HOURS, appointmentId), {
            status: 'release_now',
            releaseRequestedAt: serverTimestamp(),
            source: 'frontend_copilot_panel'
        });
    },

    /** El cron de las 8 AM no procesará esta cancelación. */
    async pause(appointmentId) {
        await updateDoc(doc(db, QUIET_HOURS, appointmentId), {
            status: 'paused',
            pausedAt: serverTimestamp(),
            source: 'frontend_copilot_panel'
        });
        const item = this._pending.get(appointmentId);
        if (item) {
            item.localStatus = 'paused';
            this._notify();
        }
        setTimeout(() => {
            this._pending.delete(appointmentId);
            this._notify();
        }, 4000);
    },

    /** Quita la tarjeta (solo si está pausada o tras liberar). */
    async dismiss(appointmentId) {
        try {
            await deleteDoc(doc(db, QUIET_HOURS, appointmentId));
        } catch (e) {
            console.warn('[QuietHoursCopilot] dismiss:', e);
        }
        this._pending.delete(appointmentId);
        this._notify();
    },

    _handleSnapshot(snap) {
        const ids = new Set();
        snap.forEach((d) => {
            ids.add(d.id);
            const data = d.data();
            const status = data.status || 'pending';
            if (status === 'released') return;

            const existing = this._pending.get(d.id);
            this._pending.set(d.id, {
                kind: 'quiet',
                id: d.id,
                appointmentId: data.appointmentId || d.id,
                date: data.originalDate,
                therapist: data.therapist || 'diana',
                patientName: data.patientName || 'Paciente',
                status,
                localStatus: existing?.localStatus || (status === 'paused' ? 'paused' : 'waiting'),
                scheduledReleaseLabel: '8:00 AM'
            });
        });

        for (const id of [...this._pending.keys()]) {
            if (!ids.has(id)) this._pending.delete(id);
        }
        this._notify();
    },

    _snapshot() {
        return Array.from(this._pending.values()).sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db_ = b.date ? new Date(b.date).getTime() : 0;
            return da - db_;
        });
    },

    _notify() {
        const snap = this._snapshot();
        this._subscribers.forEach((cb) => {
            try { cb(snap); } catch (e) { console.warn('[QuietHoursCopilot] subscriber:', e); }
        });
    }
};
