/**
 * CalendarData.js
 * Gestiona la capa de datos del calendario y la comunicación con Firebase
 */

import { db, collectionPath, patientProfilesPath, collection, onSnapshot, query } from '../../firebase.js';
import { CalendarState } from './CalendarState.js';
import { createAppointment, updateAppointment, deleteAppointment, togglePaymentStatus, toggleConfirmationStatus, cancelAppointment } from '../../services/appointmentService.js';
import { SheetService } from '../../services/google/SheetService.js';
import { getDocs, query as fsQuery, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Obtiene el clinicFee de un paciente desde Firestore.
 * @param {string} patientName
 * @returns {Promise<number>}
 */
async function getClinicFee(patientName) {
    try {
        const q = fsQuery(
            collection(db, patientProfilesPath),
            where('name', '==', patientName)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.clinicFee !== undefined) {
                return parseFloat(data.clinicFee);
            }
        }
    } catch (err) {
        console.error('Error obteniendo clinicFee en CalendarData:', err);
    }
    return 250; // Default
}

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
                    const clinicFee = await getClinicFee(existingEvt.name);

                    // 1. Anular el pago en la fecha/hora anterior con monto negativo
                    await SheetService.logPayment({
                        date: existingEvt.date,
                        patientName: existingEvt.name,
                        amount: -Math.abs(existingEvt.cost || 0),
                        status: "Pagado",
                        therapist: existingEvt.therapist,
                        clinicFee: clinicFee
                    });
                    
                    // 2. Registrar en la fecha nueva
                    await SheetService.logPayment({
                        date: data.date,
                        patientName: existingEvt.name,
                        amount: Math.abs(existingEvt.cost || 0),
                        status: "Pagado",
                        therapist: existingEvt.therapist,
                        clinicFee: clinicFee
                    });
                } catch (err) {
                    console.error("Error sincronizando cambios de fecha en Sheets:", err);
                }
            }
        }

        return result;
    },

    async deleteEvent(id) {
        const appointment = CalendarState.appointments.find(a => a.id === id);
        return await deleteAppointment(id, appointment?.googleEventId);
    },

    async togglePayment(id, currentStatus) {
        // 1. Obtener clinicFee primero para guardarlo en la DB
        const appointment = CalendarState.appointments.find(a => a.id === id);
        let clinicFee = 250;
        if (appointment) {
            clinicFee = await getClinicFee(appointment.name);
        }

        // 2. Ejecutar cambio de estado
        const result = await togglePaymentStatus(id, currentStatus, CalendarState.appointments, clinicFee);

        // Si se marcó como pagado exitosamente, registrar en Sheets
        if (result.success) {
            const appointment = CalendarState.appointments.find(a => a.id === id);

            if (appointment) {
                // Obtener clinicFee real del paciente desde Firestore
                getClinicFee(appointment.name).then(clinicFee => {
                    if (result.newState === true) {
                        // PAGO POSITIVO
                        console.log("💰 CalendarData: Marcado como PAGADO, enviando a Sheets...", appointment.name, '- clinicFee:', clinicFee);
                        SheetService.logPayment({
                            date: appointment.date,
                            patientName: appointment.name,
                            amount: Math.abs(appointment.cost || 0),
                            status: "Pagado",
                            therapist: appointment.therapist,
                            clinicFee: clinicFee
                        }).then(success => {
                            if (success) {
                                updateAppointment(id, { sheetSynced: true }, CalendarState.appointments);
                            }
                        }).catch(err => console.error("Error sheet logging:", err));
                    } else {
                        // PAGO NEGATIVO (ANULACIÓN)
                        console.log("💰 CalendarData: Marcado como ANULADO, enviando corrección a Sheets...", appointment.name, '- clinicFee:', clinicFee);
                        SheetService.logPayment({
                            date: appointment.date,
                            patientName: appointment.name,
                            amount: -Math.abs(appointment.cost || 0),
                            status: "ANULADO",
                            therapist: appointment.therapist,
                            clinicFee: clinicFee
                        }).then(success => {
                            if (success) {
                                updateAppointment(id, { sheetSynced: true }, CalendarState.appointments);
                            }
                        }).catch(err => console.error("Error sheet logging (reversal):", err));
                    }
                }).catch(err => console.error("Error obteniendo clinicFee para Sheets:", err));
            }
        }
        return result;
    },

    async toggleConfirmation(id, currentStatus) {
        const result = await toggleConfirmationStatus(id, currentStatus, CalendarState.appointments);
        // Confirmación no genera entrada financiera en Sheets
        return result;
    },

    async cancelEvent(id) {
        // Get event before cancelling to have data for log
        const evt = CalendarState.appointments.find(a => a.id === id);
        
        const result = await cancelAppointment(id, CalendarState.appointments);
        
        if (result.success && evt) {
             SheetService.logAttendance({
                date: evt.date,
                patientName: evt.name,
                status: "CANCELADO",
                therapist: evt.therapist
            }).then(success => {
                if (success) {
                    // Update the doc in Firestore (using the service)
                    updateAppointment(id, { sheetSynced: true }, CalendarState.appointments);
                }
            }).catch(e => console.error("Error logging cancellation:", e));
        }

        return result;
    }
};
