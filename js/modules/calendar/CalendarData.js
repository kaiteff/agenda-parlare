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
        const existingEvt = CalendarState.appointments.find(a => a.id === id);
        const result = await updateAppointment(id, data, CalendarState.appointments);
        
        // Si la cita se movió de horario (cambió la fecha)
        if (result.success && data.date && existingEvt && existingEvt.date !== data.date) {
            // Si la cita ya estaba pagada, tenemos que anularla de la fecha/hora anterior 
            // y reportarla en la nueva.
            if (existingEvt.isPaid) {
                console.log("💰 CalendarData: Cita movida y estaba pagada. Actualizando en Sheets...", existingEvt.name);
                
                try {
                    // 1. Anular el de la fecha anterior (Hacemos await para evitar conflictos de concurrencia en la API de Google)
                    await SheetService.logPayment({
                        date: existingEvt.date,
                        patientName: existingEvt.name,
                        amount: -Math.abs(existingEvt.cost || 0),
                        status: "REPROGRAMADO - ANULADO",
                        therapist: existingEvt.therapist
                    });
                    
                    // 2. Registrar en la fecha nueva
                    await SheetService.logPayment({
                        date: data.date,
                        patientName: existingEvt.name,
                        amount: Math.abs(existingEvt.cost || 0),
                        status: "Pagado",
                        therapist: existingEvt.therapist
                    });
                } catch (err) {
                    console.error("Error sincronizando cambios de fecha en Sheets:", err);
                }
            }
        }

        return result;
    },

    async deleteEvent(id) {
        return await deleteAppointment(id);
    },

    async togglePayment(id, currentStatus) {
        const result = await togglePaymentStatus(id, currentStatus, CalendarState.appointments);

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
        const result = await toggleConfirmationStatus(id, currentStatus, CalendarState.appointments);
        
        if (result.success) {
            const evt = CalendarState.appointments.find(a => a.id === id);
            if (evt) {
                const newStatus = !currentStatus; // toggleConfirmationStatus returns the new status object, but here we just need the logic
                // Actually toggleConfirmationStatus returns { success: true } usually
                // We better rely on the calculated new status
                
                SheetService.logAttendance({
                    date: evt.date,
                    patientName: evt.name,
                    status: newStatus ? "CONFIRMADO" : "PENDIENTE",
                    therapist: evt.therapist
                }).catch(e => console.error("Error logging confirmation:", e));
            }
        }
        return result;
    },

    async cancelEvent(id) {
        // Get event before cancelling to have data for log
        const evt = CalendarState.appointments.find(a => a.id === id);
        
        const result = await cancelAppointment(id);
        
        if (result.success && evt) {
             SheetService.logAttendance({
                date: evt.date,
                patientName: evt.name,
                status: "CANCELADO",
                therapist: evt.therapist
            }).catch(e => console.error("Error logging cancellation:", e));
        }

        return result;
    }
};
