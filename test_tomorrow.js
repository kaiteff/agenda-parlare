// Test file - Tomorrow view implementation

// Step 1: Change showOnlyToday to viewMode
let viewMode = 'today'; // 'today', 'tomorrow', 'all'

// Step 2: getTomorrowPatients function
function getTomorrowPatients() {
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

console.log("Syntax check passed");
