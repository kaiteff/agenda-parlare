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
        if (result.success) {
            const appointment = CalendarState.appointments.find(a => a.id === id);

            if (appointment) {
                if (result.newState === true) {
                    // PAGO POSITIVO
                    console.log("💰 CalendarData: Marcado como PAGADO, enviando a Sheets...", appointment);
                    SheetService.logPayment({
                        date: appointment.date,
                        patientName: appointment.name,
                        amount: Math.abs(appointment.cost || 0),
                        status: "Pagado",
                        therapist: appointment.therapist
                    }).catch(err => console.error("Error sheet logging:", err));
                } else {
                    // PAGO NEGATIVO (ANULACIÓN)
                    console.log("💰 CalendarData: Marcado como ANULADO, enviando corrección a Sheets...", appointment);
                    SheetService.logPayment({
                        date: appointment.date,
                        patientName: appointment.name,
                        // Enviamos negativo para restar
                        amount: -Math.abs(appointment.cost || 0),
                        status: "ANULADO",
                        therapist: appointment.therapist
                    }).catch(err => console.error("Error sheet logging (reversal):", err));
                }
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
