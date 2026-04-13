/**
 * SyncService.js
 * Servicio para gestionar la sincronización por lotes (Batch Sync)
 */

import { db, collectionPath, collection, query, where, getDocs, updateDoc, doc } from '../firebase.js';
import { SheetService } from './google/SheetService.js';
import { Logger } from '../utils/Logger.js';
import { ToastService } from '../utils/ToastService.js';

const log = Logger.create('SyncService');

export const SyncService = {
    
    /**
     * Obtiene todas las citas que están pendientes de sincronizar con Sheets
     * @returns {Promise<Array>} Lista de citas pendientes
     */
    async getPendingSyncs() {
        try {
            const q = query(
                collection(db, collectionPath),
                where('sheetSynced', '==', false),
                where('isPaid', '==', true) // Solo las pagadas (o podrías incluir canceladas si es necesario)
            );
            
            const snapshot = await getDocs(q);
            const pending = [];
            snapshot.forEach(doc => {
                pending.push({ id: doc.id, ...doc.data() });
            });
            return pending;
        } catch (error) {
            log.error("Error obteniendo pendientes de sync:", error);
            return [];
        }
    },

    /**
     * Ejecuta la sincronización de todos los elementos pendientes
     * @returns {Promise<Object>} Resultado del proceso { success, count, errors }
     */
    async syncAllPending() {
        const pending = await this.getPendingSyncs();
        
        if (pending.length === 0) {
            ToastService.info("No hay pagos pendientes de sincronizar.");
            return { success: true, count: 0 };
        }

        log.info(`Iniciando sincronización batch de ${pending.length} elementos...`);
        ToastService.info(`Sincronizando ${pending.length} pagos...`);

        let successCount = 0;
        let errorCount = 0;

        for (const apt of pending) {
            try {
                // Para batch sync, no queremos alerts por cada uno, así que usamos un log silencioso
                const success = await SheetService.logPayment({
                    date: apt.date,
                    patientName: apt.name,
                    amount: apt.cost || 0,
                    status: "Pagado",
                    therapist: apt.therapist,
                    clinicFee: apt.clinicFee || 250 // Deberíamos haber guardado el clinicFee en la cita
                });

                if (success) {
                    await updateDoc(doc(db, collectionPath, apt.id), {
                        sheetSynced: true
                    });
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                log.error(`Error sincronizando cita ${apt.id}:`, err);
                errorCount++;
            }
        }

        if (successCount > 0) {
            ToastService.success(`Sincronizados ${successCount} pagos con éxito.`);
        }
        
        if (errorCount > 0) {
            ToastService.error(`${errorCount} pagos no pudieron sincronizarse. Revisa la conexión.`);
        }

        return {
            success: errorCount === 0,
            count: successCount,
            errors: errorCount
        };
    }
};
