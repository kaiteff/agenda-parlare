// appointmentService.js - Servicio para gestión de citas
import { db, collectionPath, notificationsPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { validateAppointment } from '../utils/validators.js';
import { Logger } from '../utils/Logger.js';
import { AuditService } from './AuditService.js';
import { AuthManager } from '../managers/AuthManager.js';

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

        const result = await (async () => {
            if (action === 'create') return await GoogleCalendarService.createEvent(data);
            if (action === 'update') return await GoogleCalendarService.updateEvent(data);
            if (action === 'delete') return await GoogleCalendarService.deleteEvent(data.id, data.googleEventId, data.therapist);
            return { success: false };
        })();

        // Si se creó un evento y devolvió un ID de Google, lo guardamos en el documento
        if (result.success && result.googleEventId && (action === 'create' || action === 'update')) {
            const docRef = doc(db, collectionPath, data.id);
            await updateDoc(docRef, { googleEventId: result.googleEventId });
            log.debug(`googleEventId [${result.googleEventId}] guardado en Firestore.`);
        }
    } catch (err) {
        log.warn('Calendar sync error (non-blocking):', err.message);
    }
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

        const docRef = await addDoc(collection(db, collectionPath), {
            ...appointmentData,
            name: appointmentData.name.trim(),
            date: appointmentData.date,
            cost: appointmentData.cost || 0,
            therapist: appointmentData.therapist || 'diana', // Default a diana si no se especifica
            isPaid: false,
            confirmed: false,
            isCancelled: false,
            sheetSynced: true, // Por defecto sincronizado hasta que ocurra un evento (pago/cancelación)
            createdAt: serverTimestamp(),
            createdBy: AuthManager.currentUser?.email || 'unknown',
            updatedBy: AuthManager.currentUser?.email || 'unknown'
        });

        const newId = docRef.id;
        log.success(`Cita creada [${newId}] para ${appointmentData.name}`);

        // Bitácora de Auditoría
        await AuditService.log('CREATE', 'APPOINTMENT', newId, { 
            patientName: appointmentData.name, 
            date: appointmentData.date,
            therapist: appointmentData.therapist 
        });

        // Crear notificación interna
        _createNotification(
            'Nueva Cita',
            `Se agendó cita para ${appointmentData.name} el ${new Date(appointmentData.date).toLocaleString()}`,
            'success',
            { appointmentId: newId, patientName: appointmentData.name, therapist: appointmentData.therapist }
        );

        // Sync a Google Calendar (no bloquea)
        _syncToCalendar('create', { ...appointmentData, id: newId });

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

        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            ...updateData,
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

        // Sync a Google Calendar con datos COMPLETOS (no solo el delta)
        _syncToCalendar('update', mergedData);

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
export async function deleteAppointment(id, googleEventId = null, therapist = 'all') {
    try {
        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
        log.info(`Cita eliminada permanentemente [${id}]`);

        // Bitácora de Auditoría
        await AuditService.log('DELETE_PERMANENT', 'APPOINTMENT', id, { 
            therapist: therapist 
        });

        _createNotification('Cita Eliminada', 'Se ha eliminado una cita permanentemente', 'warning');

        _syncToCalendar('delete', { id, googleEventId, therapist }); 
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
export async function cancelAppointment(id, existingAppointments = []) {
    try {
        const appointment = existingAppointments.find(a => a.id === id) || {};
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            isCancelled: true,
            cancelledAt: serverTimestamp(),
            updatedBy: AuthManager.currentUser?.email || 'unknown'
        });
        log.info(`Cita cancelada [${id}]`);

        // Bitácora de Auditoría
        await AuditService.log('CANCEL', 'APPOINTMENT', id, { 
            patientName: appointment.name,
            therapist: appointment.therapist 
        });

        _createNotification(
            'Cita Cancelada',
            'Se ha cancelado una cita',
            'warning',
            { appointmentId: id, therapist: appointment.therapist }
        );

        _syncToCalendar('delete', { id, googleEventId: appointment.googleEventId, therapist: appointment.therapist });
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
            const appointment = existingAppointments.find(a => a.id === id);
            _createNotification(
                '💰 Pago Registrado',
                `Se registró pago de $${appointment?.cost || 0} para ${appointment?.name}`,
                'payment',
                { appointmentId: id, patientName: appointment?.name, recipient: 'manager' }
            );
        }

        // Re-sync Google Calendar con estado actualizado
        const existing = existingAppointments.find(a => a.id === id);
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
export async function toggleConfirmationStatus(id, currentStatus, existingAppointments = []) {
    try {
        const newStatus = !currentStatus;
        const docRef = doc(db, collectionPath, id);
        const updateData = { confirmed: newStatus };
        if (newStatus) updateData.confirmedAt = serverTimestamp();
        await updateDoc(docRef, updateData);
        log.info(`Cita [${id}] confirmación: ${newStatus}`);

        // Re-sync Google Calendar con estado actualizado
        const existing = existingAppointments.find(a => a.id === id);
        if (existing) _syncToCalendar('update', { ...existing, confirmed: newStatus });

        return { success: true, newState: newStatus };
    } catch (error) {
        log.error("Error cambiando confirmación:", error);
        return { success: false, error: error.message };
    }
}
