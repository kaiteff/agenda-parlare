/**
 * AuditService.js
 * Servicio para registrar acciones críticas (Auditoría)
 */

import { db, serverTimestamp, collection, addDoc, query, where, getDocs, deleteDoc, doc } from '../firebase.js';
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
    },

    /**
     * Elimina los logs más antiguos de X días (Por defecto 60 días)
     */
    async cleanupOldLogs(daysToKeep = 60) {
        if (!AuthManager.isAdmin()) return { success: false, msg: 'Acceso denegado' };
        try {
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - daysToKeep);
            
            const logsRef = collection(db, 'audit_logs');
            const q = query(logsRef, where('timestamp', '<', limitDate));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return { success: true, count: 0, msg: 'No hay logs antiguos para limpiar.' };

            let count = 0;
            for (const docSnap of snapshot.docs) {
                await deleteDoc(doc(db, 'audit_logs', docSnap.id));
                count++;
            }
            console.log(`🧹 Audit: Eliminados ${count} logs antiguos (antes de ${limitDate.toLocaleDateString()})`);
            return { success: true, count, msg: `Se limpiaron ${count} registros antiguos de la base de datos.` };
        } catch (error) {
            console.error('❌ Error limpiando logs:', error);
            return { success: false, msg: error.message };
        }
    }
};
