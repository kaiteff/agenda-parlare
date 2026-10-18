// appointmentService.js - Servicio para gestión de citas
import { db, collectionPath, notificationsPath, patientProfilesPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, getDoc, query, where } from '../firebase.js';
import { validateAppointment } from '../utils/validators.js';
import { Logger } from '../utils/Logger.js';
import { AuditService } from './AuditService.js';
import { AuthManager } from '../managers/AuthManager.js';
import { stampClinicId } from '../utils/clinicData.js';
import { ClinicContext } from '../core/ClinicContext.js';
import { applyEvaluationTagsIfNeeded } from '../config/evaluationStages.js';

const log = Logger.create('AptService');

// Helper para crear notificaciones internas
async function _createNotification(title, message, type = 'info', metadata = {}) {
    try {
        const notifData = {
            title,
            message,
            type,
            timestamp: serverTimestamp(),
            isRead: false,
            ...metadata
        };

        // Si no se especifica destinatario, intentamos deducirlo
        // 'manager' = Yari, 'therapist' = Sam/Diana/Vero
        if (!notifData.recipient) {
            if (['whatsapp_confirm', 'whatsapp_cancel', 'new_appointment', 'reschedule'].includes(type) || title.includes('Cita')) {
                notifData.recipient = 'therapist';
            } else if (type === 'payment' || title.includes('Pago')) {
                notifData.recipient = 'manager';
            }
        }

        await addDoc(collection(db, notificationsPath), notifData);
    } catch (error) {
        log.warn('Error creando notificación interna:', error);
    }
}

// Google Calendar sync (fire-and-forget, no bloquea el flujo principal)
async function _syncToCalendar(action, data) {
    try {
        const { GoogleCalendarService } = await import('./google/GoogleCalendarService.js');
        const { GoogleAuthService } = await import('./google/GoogleAuthService.js');
        const { ToastService } = await import('../utils/ToastService.js');

        // PRE-CHECK: Si no hay token válido, avisamos y abortamos sync (pero la cita ya se guardó en Firebase)
        if (!GoogleAuthService.isTokenValid()) {
            log.warn('Sync cancelado: Token de Google inválido o expirado.');
            ToastService.warn('⚠️ Cita guardada localmente, pero Google Calendar no se pudo actualizar (Token expirado/desconectado). Reconecta Google en el menú superior.');
            return;
        }

        const result = await (async () => {
            if (action === 'create') return await GoogleCalendarService.createEvent(data);
            if (action === 'update') return await GoogleCalendarService.updateEvent(data.current, data.previous);
            if (action === 'delete') return await GoogleCalendarService.deleteEvent(data.id, data.googleEventId, data.therapist, data);
            return { success: false };
        })();

        // Si falló por otra razón (network, error 500, etc)
        if (!result || (typeof result === 'object' && result.success === false) || result === false) {
             ToastService.warn('⚠️ Hubo un problema al sincronizar con Google Calendar. Verifica tu conexión.');
        }

        // Si se creó un evento y devolvió un ID de Google, lo guardamos en el documento
        if (result && result.success && result.googleEventId && (action === 'create' || action === 'update')) {
            const targetId = action === 'update' ? data.current.id : data.id;
            const docRef = doc(db, collectionPath, targetId);
            await updateDoc(docRef, { googleEventId: result.googleEventId });
            log.debug(`googleEventId [${result.googleEventId}] guardado en Firestore para cita [${targetId}].`);
        }
    } catch (err) {
        log.warn('Calendar sync error (non-blocking):', err.message);
    }
}

/**
 * Enriches appointment data with profileId, phone and evaluation tags from patient profile
 */
async function enrichWithProfileData(appointmentData) {
    let profileId = appointmentData.profileId || appointmentData.patientId || null;
    let phone = appointmentData.phone || null;
    let profileData = null;

    if (profileId) {
        try {
            const docSnap = await getDoc(doc(db, patientProfilesPath, profileId));
            if (docSnap.exists()) {
                profileData = { id: docSnap.id, ...docSnap.data() };
                if (!phone) phone = profileData.phone || null;
            }
        } catch (err) {
            log.warn('Error resolving patient profile by id:', err);
        }
    }

    const name = appointmentData.name?.trim();
    if (name && !profileData) {
        try {
            const q = query(
                collection(db, patientProfilesPath),
                where('name', '==', name)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                profileData = { id: docSnap.id, ...docSnap.data() };
                if (!profileId) profileId = docSnap.id;
                if (!phone) phone = profileData.phone || null;
            }
        } catch (err) {
            log.warn('Error resolving patient profile for enrichment:', err);
        }
    }

    let result = {
        ...appointmentData,
        profileId,
        phone
    };

    if (profileData) {
        result = applyEvaluationTagsIfNeeded(result, profileData);
        if (!result.patientId && profileData.id) {
            result.patientId = profileData.id;
        }
    }

    return result;
}

function resolveConfirmationMeta() {
    if (AuthManager.isClinicOwner()) {
        return { confirmedBy: 'diana', confirmedSource: 'app' };
    }
    const user = AuthManager.currentUser;
    const email = user?.email || 'unknown';
    return {
        confirmedBy: user?.displayName || email,
        confirmedSource: 'app'
    };
}

/**
 * Crea una nueva cita
 * @param {Object} appointmentData - Datos de la cita
 * @param {Array} existingAppointments - Citas existentes para validación
 * @returns {Promise<Object>} - Resultado de la operación { success, id, error }
 */
export async function createAppointment(appointmentData, existingAppointments) {
    try {
        // Validar datos
        const validation = validateAppointment(appointmentData, existingAppointments, appointmentData.therapist);
        if (!validation.valid) {
            log.warn('Validación fallida al crear cita:', validation.errors);
            return { success: false, error: validation.errors.join('\n') };
        }

        const enrichedData = await enrichWithProfileData(appointmentData);
        const payload = stampClinicId({
            ...enrichedData,
            name: enrichedData.name.trim(),
            date: enrichedData.date,
            cost: enrichedData.cost || 0,
            therapist: enrichedData.therapist || 'diana',
            isPaid: false,
            confirmed: false,
            isCancelled: false,
            sheetSynced: true,
            createdAt: serverTimestamp(),
            createdBy: AuthManager.currentUser?.email || 'unknown',
            updatedBy: AuthManager.currentUser?.email || 'unknown'
        }, ClinicContext.getActiveClinicId());

        const docRef = await addDoc(collection(db, collectionPath), payload);

        const newId = docRef.id;
        log.success(`Cita creada [${newId}] para ${enrichedData.name}`);

        // Bitácora de Auditoría
        const auditDetails = {
            patientName: enrichedData.name,
            date: enrichedData.date,
            therapist: enrichedData.therapist
        };
        if (enrichedData.isEvaluation) {
            auditDetails.evaluationStage = enrichedData.evaluationStage;
            auditDetails.stageName = enrichedData.stageName;
        }
        await AuditService.log('CREATE', 'APPOINTMENT', newId, auditDetails);

        // Crear notificación interna
        _createNotification(
            'Nueva Cita',
            `Se agendó cita para ${enrichedData.name} el ${new Date(enrichedData.date).toLocaleString()}`,
            'success',
            { appointmentId: newId, patientName: enrichedData.name, therapist: enrichedData.therapist }
        );

        // Sync a Google Calendar (no bloquea)
        _syncToCalendar('create', { ...enrichedData, id: newId });

        return { success: true, id: newId };
    } catch (error) {
        log.error("Error creando cita:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza una cita existente
 * @param {string} id - ID de la cita
 * @param {Object} updateData - Datos a actualizar
 * @param {Array} existingAppointments - Citas existentes para validación
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function updateAppointment(id, updateData, existingAppointments) {
    try {
        const existingData = existingAppointments.find(a => a.id === id) || {};
        const mergedData = { ...existingData, ...updateData, id };

        // Si se actualiza fecha o nombre, validar
        if (updateData.date || updateData.name) {
            const validation = validateAppointment(mergedData, existingAppointments, mergedData.therapist);
            if (!validation.valid) {
                log.warn('Validación fallida al actualizar cita:', validation.errors);
                return { success: false, error: validation.errors.join('\n') };
            }
        }

        let enrichedUpdateData = { ...updateData };
        if (updateData.name || updateData.patientId || updateData.profileId) {
            const enriched = await enrichWithProfileData(mergedData);
            enrichedUpdateData.profileId = enriched.profileId;
            enrichedUpdateData.phone = enriched.phone;
        }

        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            ...enrichedUpdateData,
            updatedAt: serverTimestamp(),
            updatedBy: AuthManager.currentUser?.email || 'unknown'
        });

        log.info(`Cita actualizada [${id}]`);

        // Bitácora de Auditoría con cambios legibles
        const fieldMap = {
            name: 'Nombre',
            date: 'Fecha/Hora',
            cost: 'Costo',
            isPaid: 'Estado de Pago',
            confirmed: 'Confirmación',
            therapist: 'Terapeuta',
            clinicFee: 'Comisión Parláre',
            isCancelled: 'Estado de Cancelación'
        };

        const readableChanges = Object.keys(updateData)
            .filter(key => fieldMap[key]) // Solo campos importantes
            .map(key => {
                const label = fieldMap[key];
                let val = updateData[key];
                if (key === 'isPaid') val = val ? 'Pagado' : 'Pendiente';
                if (key === 'confirmed') val = val ? 'Sí' : 'No';
                if (key === 'date') val = new Date(val).toLocaleString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
                return `${label} a "${val}"`;
            });

        await AuditService.log('UPDATE', 'APPOINTMENT', id, { 
            patientName: mergedData.name, 
            date: mergedData.date,
            therapist: mergedData.therapist,
            changes: readableChanges.length > 0 ? readableChanges : Object.keys(updateData) 
        });

        // Crear notificación interna
        const patientName = updateData.name ? updateData.name : 'un paciente';
        _createNotification(
            'Cita Actualizada',
            `Se actualizó la cita de ${patientName}`,
            'info',
            { appointmentId: id, patientName: updateData.name || null, therapist: mergedData.therapist }
        );

        // Sync a Google Calendar con datos COMPLETOS y ANTERIORES para evitar huérfanos
        _syncToCalendar('update', { current: mergedData, previous: existingData });

        return { success: true };
    } catch (error) {
        log.error("Error actualizando cita:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina una cita permanentemente
 * @param {string} id - ID de la cita
 * @returns {Promise<Object>} - Resultado { success, error }
 */
/**
 * Elimina una cita permanentemente
 * @param {string} id - ID de la cita
 * @param {Object} appointmentData - Objeto completo de la cita (para búsqueda huérfana en GCal)
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deleteAppointment(id, appointmentData = {}) {
    try {
        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
        log.info(`Cita eliminada permanentemente [${id}]`);

        // Bitácora de Auditoría
        await AuditService.log('DELETE_PERMANENT', 'APPOINTMENT', id, { 
            therapist: appointmentData.therapist || 'all' 
        });

        _createNotification('Cita Eliminada', 'Se ha eliminado una cita permanentemente', 'warning');

        // Pasar todo el objeto para permitir búsqueda huérfana si no hay googleEventId
        _syncToCalendar('delete', { 
            id, 
            googleEventId: appointmentData.googleEventId, 
            therapist: appointmentData.therapist,
            date: appointmentData.date,
            name: appointmentData.name
        }); 
        return { success: true };
    } catch (error) {
        log.error("Error eliminando cita:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Marca una cita como cancelada (Soft Delete)
 * @param {string} id - ID de la cita
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function cancelAppointment(id, existingAppointments = [], source = 'Manual') {
    try {
        const appointment = existingAppointments.find(a => a.id === id) || {};
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            isCancelled: true,
            cancelledAt: serverTimestamp(),
            cancelledBy: source,
            updatedBy: AuthManager.currentUser?.email || 'unknown'
        });
        log.info(`Cita cancelada [${id}]`);

        // Bitácora de Auditoría
        await AuditService.log('CANCEL', 'APPOINTMENT', id, {
            patientName: appointment.name,
            therapist: appointment.therapist,
            cancelledBy: source
        });

        _createNotification(
            'Cita Cancelada',
            'Se ha cancelado una cita',
            'warning',
            { appointmentId: id, therapist: appointment.therapist }
        );

        _syncToCalendar('delete', { 
            id, 
            googleEventId: appointment.googleEventId, 
            therapist: appointment.therapist,
            date: appointment.date,
            name: appointment.name
        });
        return { success: true };
    } catch (error) {
        log.error("Error cancelando cita:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Alterna el estado de pago de una cita
 * @param {string} id - ID de la cita
 * @param {boolean} currentStatus - Estado actual
 * @returns {Promise<Object>} - Resultado { success, newState, error }
 */
export async function togglePaymentStatus(id, currentStatus, existingAppointments = [], clinicFee = null) {
    try {
        const existing = existingAppointments.find(a => a.id === id);
        const newStatus = !currentStatus;
        const docRef = doc(db, collectionPath, id);
        
        const updateData = { 
            isPaid: newStatus,
            sheetSynced: false // Marcar como pendiente de sincronización
        };

        // Si se está marcando como pagado, guardar el clinicFee actual como snapshot
        if (newStatus && clinicFee !== null) {
            updateData.clinicFee = clinicFee;
        }

        await updateDoc(docRef, updateData);
        log.debug(`Cita [${id}] pago: ${newStatus} (Pendiente de Sync)`);

        // Bitácora de Auditoría
        await AuditService.log('PAYMENT', 'APPOINTMENT', id, { 
            isPaid: newStatus,
            amount: existing?.cost || 0
        });

        // Notificar a Yari (Manager) sobre el pago
        if (newStatus) {
            _createNotification(
                '💰 Pago Registrado',
                `Se registró pago de $${existing?.cost || 0} para ${existing?.name}`,
                'payment',
                { appointmentId: id, patientName: existing?.name, recipient: 'manager' }
            );
        }

        // Re-sync Google Calendar con estado actualizado
        if (existing) _syncToCalendar('update', { ...existing, isPaid: newStatus });

        return { success: true, newState: newStatus };
    } catch (error) {
        log.error("Error cambiando estado de pago:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Alterna el estado de confirmación de una cita
 * @param {string} id - ID de la cita
 * @param {boolean} currentStatus - Estado actual
 * @returns {Promise<Object>} - Resultado { success, newState, error }
 */
export async function toggleConfirmationStatus(id, currentStatus, existingAppointments = [], source = null) {
    try {
        const newStatus = !currentStatus;
        const docRef = doc(db, collectionPath, id);
        const existing = existingAppointments.find(a => a.id === id);

        const updateData = { confirmed: newStatus };
        if (newStatus) {
            updateData.confirmedAt = serverTimestamp();
            if (source) {
                updateData.confirmedBy = source;
                updateData.confirmedSource = 'app';
            } else {
                const meta = resolveConfirmationMeta();
                updateData.confirmedBy = meta.confirmedBy;
                updateData.confirmedSource = meta.confirmedSource;
            }
        } else {
            updateData.confirmedAt = null;
            updateData.confirmedBy = null;
            updateData.confirmedSource = null;
        }

        await updateDoc(docRef, updateData);
        log.info(`Cita [${id}] confirmación: ${newStatus} por ${updateData.confirmedBy || '—'}`);

        if (newStatus && existing?.isEvaluation) {
            await AuditService.log('APPOINTMENT_CONFIRMED', 'APPOINTMENT', id, {
                patientName: existing.name,
                confirmedBy: updateData.confirmedBy,
                confirmedSource: updateData.confirmedSource,
                evaluationStage: existing.evaluationStage,
                stageName: existing.stageName,
                message: 'Confirmado desde la app'
            });
        }

        // Re-sync Google Calendar con estado actualizado
        if (existing) _syncToCalendar('update', { ...existing, confirmed: newStatus });

        return { success: true, newState: newStatus };
    } catch (error) {
        log.error("Error cambiando confirmación:", error);
        return { success: false, error: error.message };
    }
}
