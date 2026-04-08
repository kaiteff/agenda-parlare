// appointmentService.js - Servicio para gestión de citas
import { db, collectionPath, notificationsPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { validateAppointment } from '../utils/validators.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.create('AptService');

// Helper para crear notificaciones internas
async function _createNotification(title, message, type = 'info', metadata = {}) {
    try {
        await addDoc(collection(db, notificationsPath), {
            title,
            message,
            type,
            timestamp: serverTimestamp(),
            isRead: false,
            ...metadata
        });
    } catch (error) {
        log.warn('Error creando notificación interna:', error);
    }
}

// Google Calendar sync (fire-and-forget, no bloquea el flujo principal)
async function _syncToCalendar(action, data) {
    try {
        const { GoogleCalendarService } = await import('./google/GoogleCalendarService.js');

        const success = await (async () => {
            if (action === 'create') return await GoogleCalendarService.createEvent(data);
            if (action === 'update') return await GoogleCalendarService.updateEvent(data);
            if (action === 'delete') return await GoogleCalendarService.deleteEvent(data);
            return false;
        })();

        if (success) {
            log.debug(`Calendar sync (${action}) exitoso`);
        } else {
            log.warn(`Calendar sync (${action}) falló o no estaba habilitado`);
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
            createdAt: serverTimestamp()
        });

        const newId = docRef.id;
        log.success(`Cita creada [${newId}] para ${appointmentData.name}`);

        // Crear notificación interna
        _createNotification(
            'Nueva Cita',
            `Se agendó cita para ${appointmentData.name} el ${new Date(appointmentData.date).toLocaleString()}`,
            'success',
            { appointmentId: newId, patientName: appointmentData.name }
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
            updatedAt: serverTimestamp()
        });

        log.info(`Cita actualizada [${id}]`);

        // Crear notificación interna
        const patientName = updateData.name ? updateData.name : 'un paciente';
        _createNotification(
            'Cita Actualizada',
            `Se actualizó la cita de ${patientName}`,
            'info',
            { appointmentId: id, patientName: updateData.name || null }
        );

        // Sync a Google Calendar (no bloquea)
        _syncToCalendar('update', { ...updateData, id });

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
export async function deleteAppointment(id) {
    try {
        await deleteDoc(doc(db, collectionPath, id));
        log.info(`Cita eliminada permanentemente [${id}]`);

        _createNotification('Cita Eliminada', 'Se ha eliminado una cita permanentemente', 'warning');

        _syncToCalendar('delete', id);
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
export async function cancelAppointment(id) {
    try {
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            isCancelled: true,
            cancelledAt: serverTimestamp()
        });
        log.info(`Cita cancelada [${id}]`);

        _createNotification(
            'Cita Cancelada',
            'Se ha cancelado una cita',
            'warning',
            { appointmentId: id }
        );

        _syncToCalendar('delete', id);
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
export async function togglePaymentStatus(id, currentStatus) {
    try {
        const newStatus = !currentStatus;
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, { isPaid: newStatus });
        log.debug(`Cita [${id}] pago: ${newStatus}`);
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
export async function toggleConfirmationStatus(id, currentStatus) {
    try {
        const newStatus = !currentStatus;
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, { confirmed: newStatus });
        log.debug(`Cita [${id}] confirmada: ${newStatus}`);
        return { success: true, newState: newStatus };
    } catch (error) {
        log.error("Error cambiando confirmación:", error);
        return { success: false, error: error.message };
    }
}
