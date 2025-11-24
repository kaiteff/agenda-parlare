import { patientsData } from '../firebase.js';

// Obtener pacientes con citas hoy
export function getTodayPatients() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate < tomorrow && !apt.isCancelled;
    });

    const patientsToday = new Map();
    todayAppointments.forEach(apt => {
        const existing = patientsToday.get(apt.name);
        const aptTime = new Date(apt.date);

        if (!existing || aptTime < existing.appointmentTime) {
            patientsToday.set(apt.name, {
                name: apt.name,
                appointmentTime: aptTime,
                confirmed: apt.confirmed || false
            });
        }
    });

    return Array.from(patientsToday.values())
        .sort((a, b) => a.appointmentTime - b.appointmentTime);
}

// Obtener pacientes con citas mañana
export function getTomorrowPatients() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowAppointments = patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= tomorrow && aptDate < dayAfter && !apt.isCancelled;
    });

    const patientsTomorrow = new Map();
    tomorrowAppointments.forEach(apt => {
        const existing = patientsTomorrow.get(apt.name);
        const aptTime = new Date(apt.date);

        if (!existing || aptTime < existing.appointmentTime) {
            patientsTomorrow.set(apt.name, {
                name: apt.name,
                appointmentTime: aptTime,
                confirmed: apt.confirmed || false
            });
        }
    });

    return Array.from(patientsTomorrow.values())
        .sort((a, b) => a.appointmentTime - b.appointmentTime);
}

// Obtener pagos pendientes de un paciente
export function getPendingPayments(patientName) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return patientsData.filter(apt => {
        const aptDate = new Date(apt.date);
        return apt.name === patientName &&
            aptDate < today &&
            !apt.isPaid &&
            !apt.isCancelled;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}
