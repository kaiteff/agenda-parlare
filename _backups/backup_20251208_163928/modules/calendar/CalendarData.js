/**
 * CalendarData.js
 * Gestiona la capa de datos del calendario y la comunicación con Firebase
 */

import { db, collectionPath, collection, onSnapshot, query } from '../../firebase.js';
import { CalendarState } from './CalendarState.js';
import { createAppointment, updateAppointment, deleteAppointment, togglePaymentStatus, toggleConfirmationStatus, cancelAppointment } from '../../services/appointmentService.js';

export const CalendarData = {
    /**
     * Suscribe a cambios en la colección de citas
     * @param {Function} onUpdate - Callback cuando hay nuevos datos
     * @returns {Function} Unsubscribe function
     */
    subscribe(onUpdate) {
        const colRef = collection(db, collectionPath);
        const q = query(colRef);

        return onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });

            CalendarState.setAppointments(data);

            if (onUpdate) onUpdate(data, snapshot.metadata);
        }, (error) => {
            console.error("Error Snapshot:", error);
        });
    },

    // Wrappers para servicios de citas

    async createEvent(data) {
        return await createAppointment(data, CalendarState.appointments);
    },

    async updateEvent(id, data) {
        return await updateAppointment(id, data, CalendarState.appointments);
    },

    async deleteEvent(id) {
        return await deleteAppointment(id);
    },

    async togglePayment(id, currentStatus) {
        return await togglePaymentStatus(id, currentStatus);
    },

    async toggleConfirmation(id, currentStatus) {
        return await toggleConfirmationStatus(id, currentStatus);
    },

    async cancelEvent(id) {
        return await cancelAppointment(id);
    }
};
