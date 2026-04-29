import { db, serverTimestamp, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from '../firebase.js';
import { AuthManager } from '../managers/AuthManager.js';
import { SheetService } from './google/SheetService.js';

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

            // 1. Guardar en Firestore (Vista rápida 60 días)
            await addDoc(collection(db, 'audit_logs'), logEntry);
            
            // 2. Guardar en Google Sheets (Archivo Permanente)
            // No esperamos a que termine para no bloquear la UI
            SheetService.logAudit({ ...logEntry, timestamp: new Date() }).catch(err => {
                console.warn('⚠️ Error enviando log a Sheets:', err);
            });

            console.log(`📝 Audit: [${action}] por ${logEntry.userName}`);
        } catch (error) {
            console.error('❌ Error al registrar log de auditoría:', error);
        }
    },

    /**
     * Exporta todos los logs actuales a la hoja de cálculo
     */
    async exportToSheets() {
        if (!AuthManager.isAdmin()) return { success: false, msg: 'Acceso denegado' };
        try {
            const logsRef = collection(db, 'audit_logs');
            const q = query(logsRef, orderBy('timestamp', 'asc'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return { success: true, msg: 'No hay logs para exportar.' };

            console.log(`📤 Exportando ${snapshot.size} logs a Google Sheets...`);
            let exported = 0;
            for (const docSnap of snapshot.docs) {
                const logData = docSnap.data();
                const success = await SheetService.logAudit(logData);
                if (success) exported++;
            }

            return { success: true, msg: `Se exportaron ${exported} registros a la hoja permanente de Excel.` };
        } catch (error) {
            console.error('❌ Error exportando logs:', error);
            return { success: false, msg: error.message };
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
