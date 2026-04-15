/**
 * AuditService.js
 * Servicio para registrar acciones críticas (Auditoría)
 */

import { db, serverTimestamp, collection, addDoc } from '../firebase.js';
import { AuthManager } from '../managers/AuthManager.js';

export const AuditService = {
    /**
     * Registra un evento en la bitácora de auditoría
     * @param {string} action - Acción realizada (CREATE, UPDATE, DELETE, PAYMENT, etc)
     * @param {string} entityType - Tipo de entidad (APPOINTMENT, PATIENT)
     * @param {string} entityId - ID de la entidad
     * @param {Object} details - Detalles adicionales del cambio
     */
    async log(action, entityType, entityId, details = {}) {
        try {
            const user = AuthManager.currentUser;
            const logEntry = {
                timestamp: serverTimestamp(),
                action,
                entityType,
                entityId,
                details,
                userEmail: user?.email || 'system',
                userName: user?.displayName || 'Sistema',
                userRole: user?.role || 'unknown'
            };

            await addDoc(collection(db, 'audit_logs'), logEntry);
            console.log(`📝 Audit: [${action}] por ${logEntry.userName}`);
        } catch (error) {
            console.error('❌ Error al registrar log de auditoría:', error);
        }
    }
};
