/**
 * CalendarData.js
 * Gestiona la capa de datos del calendario y la comunicación con Firebase
 */

import { db, collectionPath, collection, onSnapshot, query } from '../../firebase.js';
import { CalendarState } from './CalendarState.js';
import { createAppointment, updateAppointment, deleteAppointment, togglePaymentStatus, toggleConfirmationStatus, cancelAppointment } from '../../services/appointmentService.js';
import { SheetService } from '../../services/google/SheetService.js';

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
        const result = await togglePaymentStatus(id, currentStatus);

        // Si se marcó como pagado exitosamente, registrar en Sheets
        if (result.success && result.newState === true) {
            const appointment = CalendarState.appointments.find(a => a.id === id);
            if (appointment) {
                console.log("💰 CalendarData: Marcado como pagado, enviando a Sheets...", appointment);
                SheetService.logPayment({
                    date: appointment.date,
                    patientName: appointment.name,
                    amount: appointment.cost || 0,
                    therapist: appointment.therapist
                }).catch(err => console.error("Error background sheet logging:", err));
            }
        }
        return result;
    },

    async toggleConfirmation(id, currentStatus) {
        return await toggleConfirmationStatus(id, currentStatus);
    },

    async cancelEvent(id) {
        return await cancelAppointment(id);
    }
};
