/**
 * Alertas de recepción (opt-out WhatsApp, etc.)
 */
import {
    db,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp
} from '../firebase.js';

const COLLECTION = 'reception_alerts';

export const ReceptionAlertsService = {
    /**
     * Escucha alertas abiertas en tiempo real.
     * @param {(alerts: Array) => void} onData
     * @param {(err: Error) => void} [onError]
     * @returns {import('firebase/firestore').Unsubscribe}
     */
    subscribeOpen(onData, onError) {
        const q = query(
            collection(db, COLLECTION),
            where('status', '==', 'open'),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(
            q,
            (snap) => {
                const alerts = [];
                snap.forEach((d) => alerts.push({ id: d.id, ...d.data() }));
                onData(alerts);
            },
            (err) => {
                console.warn('[ReceptionAlerts] Listener:', err);
                if (onError) onError(err);
                onData([]);
            }
        );
    },

    async markResolved(alertId) {
        await updateDoc(doc(db, COLLECTION, alertId), {
            status: 'resolved',
            resolvedAt: serverTimestamp()
        });
    }
};
