// utils.js - funciones auxiliares
import { db, collectionPath } from './firebase.js';
import { updateDoc, doc } from './firebase.js';

// Toggle confirmación desde la lista de pacientes (mismo que antes)
export async function toggleConfirmationFromList(patientName) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const tomorrowAppointments = window.patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return apt.name === patientName && aptDate >= tomorrow && aptDate < dayAfter && !apt.isCancelled;
        });
        if (tomorrowAppointments.length === 0) {
            alert('No se encontró cita para mañana');
            return;
        }
        const appointment = tomorrowAppointments[0];
        const newStatus = !appointment.confirmed;
        await updateDoc(doc(db, collectionPath, appointment.id), { confirmed: newStatus });
        console.log(`Cita ${newStatus ? 'confirmada' : 'desconfirmada'} para ${patientName}`);
    } catch (error) {
        console.error('Error al cambiar confirmación:', error);
        alert('Error al cambiar confirmación: ' + error.message);
    }
}
