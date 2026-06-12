/**
 * Cola de pacientes especiales que deben 1..N sesiones (contador + matching futuro).
 * Ver PROPUESTA_COLA_PRIORIDAD_PACIENTES_ESPECIALES.md
 */

import { db, doc, getDoc, updateDoc, serverTimestamp } from '../firebase.js';
import { AuthManager } from '../managers/AuthManager.js';
import { TimeManager } from '../utils/TimeManager.js';
import {
    weekAnchorFromDate,
    inferOutsideHabitual
} from '../utils/schedulingQueueRules.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.create('SchedQueue');
const PROFILES = 'patientProfiles';

export const SchedulingQueueService = {
    currentWeekAnchor() {
        return weekAnchorFromDate(new Date());
    },

    /**
     * @param {string} profileId
     * @param {Object} opts
     * @param {string} opts.cancelledSlot - ISO naive de la cita cancelada
     * @param {string} opts.therapist
     * @param {boolean|null} opts.debtOutsideHabitual
     * @param {string} [opts.habitualSlot]
     */
    async markSessionOwed(profileId, opts) {
        if (!profileId) return { success: false, error: 'Sin perfil' };

        const ref = doc(db, PROFILES, profileId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false, error: 'Perfil no encontrado' };

        const data = snap.data();
        const prev = data.schedulingQueue || {};
        const cancelledSlot = TimeManager.toFirestore(opts.cancelledSlot || new Date());
        const habitualSlot =
            opts.habitualSlot ||
            prev.habitualSlot ||
            cancelledSlot;
        const referenceSlot = habitualSlot || cancelledSlot;

        let outside = opts.debtOutsideHabitual;
        if (outside === null || outside === undefined) {
            const inferred = inferOutsideHabitual(habitualSlot, cancelledSlot);
            outside = inferred === null ? null : inferred;
        }

        const sessionsOwed = Math.max(1, (Number(prev.sessionsOwed) || 0) + 1);

        const schedulingQueue = {
            active: true,
            isSpecialPatient: true,
            sessionsOwed,
            habitualSlot,
            referenceSlot,
            cancelledSlot,
            debtOutsideHabitual: outside === true ? true : outside === false ? false : null,
            therapist: (opts.therapist || data.therapist || 'diana').toLowerCase(),
            priority: prev.priority || 'normal',
            weekAnchor: this.currentWeekAnchor(),
            updatedAt: serverTimestamp(),
            addedBy: AuthManager.currentUser?.email || 'unknown'
        };
        if (!prev.addedAt) schedulingQueue.addedAt = serverTimestamp();

        await updateDoc(ref, { schedulingQueue });

        log.info(`Cola: ${data.name || profileId} sessionsOwed=${sessionsOwed}`);
        return { success: true, sessionsOwed };
    },

    async updateFromExpediente(profileId, { active, sessionsOwed, isSpecialPatient, priority, habitualSlot }) {
        if (!profileId) return { success: false };

        const ref = doc(db, PROFILES, profileId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false };

        const prev = snap.data().schedulingQueue || {};
        const owed = Math.max(0, parseInt(sessionsOwed, 10) || 0);
        const schedulingQueue = {
            ...prev,
            active: !!active && owed > 0,
            isSpecialPatient: isSpecialPatient !== false,
            sessionsOwed: owed,
            priority: priority === 'high' ? 'high' : 'normal',
            weekAnchor: active ? this.currentWeekAnchor() : prev.weekAnchor,
            therapist: snap.data().therapist || prev.therapist,
            updatedAt: serverTimestamp()
        };
        if (habitualSlot) {
            schedulingQueue.habitualSlot = TimeManager.toFirestore(habitualSlot);
            schedulingQueue.referenceSlot = schedulingQueue.habitualSlot;
        }
        if (!schedulingQueue.active) {
            schedulingQueue.sessionsOwed = owed;
        }

        await updateDoc(ref, { schedulingQueue });
        return { success: true };
    },

    /** Candidatos en cola activa para la semana (filtro en cliente). */
    listActivePatients(patients = []) {
        const anchor = this.currentWeekAnchor();
        return patients.filter((p) => {
            const q = p.schedulingQueue;
            if (!q?.active) return false;
            if ((q.sessionsOwed || 0) < 1) return false;
            if (q.weekAnchor && q.weekAnchor !== anchor) return false;
            return q.isSpecialPatient !== false;
        });
    }
};
