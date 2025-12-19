// appointmentService.js - Servicio para gestión de citas
import { db, collectionPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { validateAppointment } from '../utils/validators.js';

/**
 * Crea una nueva cita
 * @param {Object} appointmentData - Datos de la cita
 * @param {Array} existingAppointments - Citas existentes para validación
 * @returns {Promise<Object>} - Resultado de la operación { success, id, error }
 */
export async function createAppointment(appointmentData, existingAppointments) {
    try {
        // Validar datos
        const validation = validateAppointment(appointmentData, existingAppointments);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('\n') };
        }

        const docRef = await addDoc(collection(db, collectionPath), {
            name: appointmentData.name.trim(),
            date: appointmentData.date,
            cost: appointmentData.cost || 0,
            therapist: appointmentData.therapist || 'diana', // Default a diana si no se especifica
            isPaid: false,
            confirmed: false,
            isCancelled: false,
            createdAt: serverTimestamp()
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creando cita:", error);
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
        // Si se actualiza fecha o nombre, validar
        if (updateData.date || updateData.name) {
            const validation = validateAppointment({ ...updateData, id }, existingAppointments);
            if (!validation.valid) {
                return { success: false, error: validation.errors.join('\n') };
            }
        }

        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error("Error actualizando cita:", error);
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
        return { success: true };
    } catch (error) {
        console.error("Error eliminando cita:", error);
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
        return { success: true };
    } catch (error) {
        console.error("Error cancelando cita:", error);
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
        return { success: true, newState: newStatus };
    } catch (error) {
        console.error("Error cambiando estado de pago:", error);
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
        return { success: true, newState: newStatus };
    } catch (error) {
        console.error("Error cambiando confirmación:", error);
        return { success: false, error: error.message };
    }
}
