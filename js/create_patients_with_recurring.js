// create_patients_with_recurring.js - Generar 30 pacientes con citas recurrentes
import { db, collection, addDoc, serverTimestamp } from './firebase.js';

// Nombres para Diana (15 pacientes)
const dianaPatients = [
    { firstName: 'Roberto', lastName: 'Sánchez' },
    { firstName: 'Patricia', lastName: 'Ramírez' },
    { firstName: 'Fernando', lastName: 'Torres' },
    { firstName: 'Claudia', lastName: 'Morales' },
    { firstName: 'Ricardo', lastName: 'Jiménez' },
    { firstName: 'Mónica', lastName: 'Vargas' },
    { firstName: 'Alberto', lastName: 'Castro' },
    { firstName: 'Silvia', lastName: 'Ortiz' },
    { firstName: 'Jorge', lastName: 'Ruiz' },
    { firstName: 'Elena', lastName: 'Flores' },
    { firstName: 'Miguel', lastName: 'Herrera' },
    { firstName: 'Rosa', lastName: 'Medina' },
    { firstName: 'Daniel', lastName: 'Guzmán' },
    { firstName: 'Teresa', lastName: 'Reyes' },
    { firstName: 'Sergio', lastName: 'Cortés' }
];

// Nombres para Sam (15 pacientes)
const samPatients = [
    { firstName: 'Valeria', lastName: 'Núñez' },
    { firstName: 'Rodrigo', lastName: 'Vega' },
    { firstName: 'Beatriz', lastName: 'Campos' },
    { firstName: 'Héctor', lastName: 'Luna' },
    { firstName: 'Adriana', lastName: 'Ríos' },
    { firstName: 'Ernesto', lastName: 'Aguilar' },
    { firstName: 'Lucía', lastName: 'Salazar' },
    { firstName: 'Raúl', lastName: 'Mendez' },
    { firstName: 'Gabriela', lastName: 'Paredes' },
    { firstName: 'Arturo', lastName: 'Delgado' },
    { firstName: 'Mariana', lastName: 'Rojas' },
    { firstName: 'Francisco', lastName: 'Ibarra' },
    { firstName: 'Natalia', lastName: 'Fuentes' },
    { firstName: 'Javier', lastName: 'Peña' },
    { firstName: 'Carolina', lastName: 'Soto' }
];

// Horarios disponibles (9am - 8pm, excluyendo los ya ocupados)
const availableHours = [9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Días de la semana (1=Lunes, 6=Sábado)
const weekDays = [1, 2, 3, 4, 5, 6];

function getNextDate(dayOfWeek, hour, weeksFromNow = 0) {
    const today = new Date();
    const currentDay = today.getDay(); // 0=Domingo, 1=Lunes, etc.

    // Calcular días hasta el próximo día deseado
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Si ya pasó esta semana, ir a la siguiente

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil + (weeksFromNow * 7));
    targetDate.setHours(hour, 0, 0, 0);

    return targetDate;
}

async function createPatientsWithRecurring() {
    console.log("🚀 Iniciando creación de 30 pacientes con citas recurrentes...");

    let createdCount = 0;
    let appointmentCount = 0;

    // Crear pacientes de Diana
    for (let i = 0; i < dianaPatients.length; i++) {
        const patient = dianaPatients[i];
        const fullName = `${patient.firstName} ${patient.lastName}`;

        try {
            // Crear perfil
            const profileData = {
                name: fullName,
                firstName: patient.firstName,
                lastName: patient.lastName,
                therapist: 'diana',
                isActive: true,
                dateAdded: serverTimestamp(),
                dateInactivated: null,
                lastSessionDate: null
            };

            await addDoc(collection(db, 'patientProfiles'), profileData);
            console.log(`✅ Perfil creado: ${fullName} (Diana)`);
            createdCount++;

            // Asignar un día y hora únicos
            const dayOfWeek = weekDays[i % weekDays.length];
            const hour = availableHours[i % availableHours.length];
            const cost = 700 + (Math.floor(i / 3) * 50); // Variar costos: 700, 750, 800, etc.

            // Crear 8 citas recurrentes (una por semana)
            for (let week = 0; week < 8; week++) {
                const appointmentDate = getNextDate(dayOfWeek, hour, week);

                const appointmentData = {
                    name: fullName,
                    therapist: 'diana',
                    date: appointmentDate.toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
                    cost: cost.toString(),
                    isPaid: false,
                    confirmed: false,
                    isCancelled: false,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'appointments'), appointmentData);
                appointmentCount++;
            }

            console.log(`  📅 8 citas creadas para ${fullName}`);

        } catch (error) {
            console.error(`❌ Error creando ${fullName}:`, error);
        }
    }

    // Crear pacientes de Sam
    for (let i = 0; i < samPatients.length; i++) {
        const patient = samPatients[i];
        const fullName = `${patient.firstName} ${patient.lastName}`;

        try {
            // Crear perfil
            const profileData = {
                name: fullName,
                firstName: patient.firstName,
                lastName: patient.lastName,
                therapist: 'sam',
                isActive: true,
                dateAdded: serverTimestamp(),
                dateInactivated: null,
                lastSessionDate: null
            };

            await addDoc(collection(db, 'patientProfiles'), profileData);
            console.log(`✅ Perfil creado: ${fullName} (Sam)`);
            createdCount++;

            // Asignar un día y hora únicos
            const dayOfWeek = weekDays[i % weekDays.length];
            const hour = availableHours[(i + 5) % availableHours.length]; // Offset para evitar colisiones con Diana
            const cost = 700 + (Math.floor(i / 3) * 50);

            // Crear 8 citas recurrentes
            for (let week = 0; week < 8; week++) {
                const appointmentDate = getNextDate(dayOfWeek, hour, week);

                const appointmentData = {
                    name: fullName,
                    therapist: 'sam',
                    date: appointmentDate.toISOString().slice(0, 16),
                    cost: cost.toString(),
                    isPaid: false,
                    confirmed: false,
                    isCancelled: false,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'appointments'), appointmentData);
                appointmentCount++;
            }

            console.log(`  📅 8 citas creadas para ${fullName}`);

        } catch (error) {
            console.error(`❌ Error creando ${fullName}:`, error);
        }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   👥 ${createdCount} pacientes creados`);
    console.log(`   📅 ${appointmentCount} citas creadas`);
    console.log(`\n🔄 Recarga la página para ver los cambios`);
}

// Ejecutar al hacer clic en el botón
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('createPatientsBtn');
    if (btn) {
        btn.onclick = createPatientsWithRecurring;
    }
});
