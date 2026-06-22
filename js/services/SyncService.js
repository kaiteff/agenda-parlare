/**
 * SyncService.js
 * Servicio para gestionar la sincronización por lotes (Batch Sync)
 */

import { db, collectionPath, collection, query, where, getDocs, updateDoc, doc, patientProfilesPath } from '../firebase.js';
import { SheetService } from './google/SheetService.js';
import { Logger } from '../utils/Logger.js';
import { ToastService } from '../utils/ToastService.js';
import { AuthManager } from '../managers/AuthManager.js';
import { alignClinicFeeSnapshot, buildSheetFinancialPayload } from '../utils/appointmentFinancials.js';

const log = Logger.create('SyncService');

async function getProfileClinicFeeForPatient(patientName, therapist = 'diana') {
    try {
        const q = query(collection(db, patientProfilesPath), where('name', '==', patientName));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.therapist) therapist = data.therapist;
            if (data.clinicFee !== undefined && data.clinicFee !== null) {
                return parseFloat(data.clinicFee);
            }
        }
    } catch (err) {
        log.error('Error leyendo clinicFee del perfil:', err);
    }
    return AuthManager.getTherapistDefaults(therapist).clinicFee;
}

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
                const therapistDefaults = AuthManager.getTherapistDefaults(apt.therapist);
                const profileFee = await getProfileClinicFeeForPatient(apt.name, apt.therapist);
                const financials = buildSheetFinancialPayload(apt, profileFee, therapistDefaults);
                const feeSnapshot = alignClinicFeeSnapshot(apt, profileFee, therapistDefaults);

                const success = await SheetService.logPayment({
                    id: apt.id,
                    date: apt.date,
                    patientName: apt.name,
                    amount: apt.cost || 0,
                    status: "Pagado",
                    therapist: apt.therapist,
                    ...financials
                });

                if (success) {
                    await updateDoc(doc(db, collectionPath, apt.id), {
                        sheetSynced: true,
                        ...feeSnapshot
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
