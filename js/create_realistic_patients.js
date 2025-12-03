// create_realistic_patients.js - Generar 50 pacientes con citas recurrentes aleatorias
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// 25 nombres para Diana
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
    { firstName: 'Sergio', lastName: 'Cortés' },
    { firstName: 'Lorena', lastName: 'Navarro' },
    { firstName: 'Pablo', lastName: 'Domínguez' },
    { firstName: 'Verónica', lastName: 'Gil' },
    { firstName: 'Gustavo', lastName: 'Márquez' },
    { firstName: 'Isabel', lastName: 'Ramos' },
    { firstName: 'Andrés', lastName: 'Cabrera' },
    { firstName: 'Carmen', lastName: 'Molina' },
    { firstName: 'Luis', lastName: 'Santana' },
    { firstName: 'Alicia', lastName: 'Vázquez' },
    { firstName: 'Enrique', lastName: 'Pacheco' }
];

// 25 nombres para Sam
const samPatients = [
    { firstName: 'Valeria', lastName: 'Núñez' },
    { firstName: 'Rodrigo', lastName: 'Vega' },
    { firstName: 'Beatriz', lastName: 'Campos' },
    { firstName: 'Héctor', lastName: 'Luna' },
    { firstName: 'Adriana', lastName: 'Ríos' },
    { firstName: 'Ernesto', lastName: 'Aguilar' },
    { firstName: 'Lucía', lastName: 'Salazar' },
    { firstName: 'Raúl', lastName: 'Méndez' },
    { firstName: 'Gabriela', lastName: 'Paredes' },
    { firstName: 'Arturo', lastName: 'Delgado' },
    { firstName: 'Mariana', lastName: 'Rojas' },
    { firstName: 'Francisco', lastName: 'Ibarra' },
    { firstName: 'Natalia', lastName: 'Fuentes' },
    { firstName: 'Javier', lastName: 'Peña' },
    { firstName: 'Carolina', lastName: 'Soto' },
    { firstName: 'Óscar', lastName: 'Benítez' },
    { firstName: 'Diana', lastName: 'Cárdenas' },
    { firstName: 'Mauricio', lastName: 'Estrada' },
    { firstName: 'Sofía', lastName: 'Guerrero' },
    { firstName: 'Tomás', lastName: 'Lara' },
    { firstName: 'Paola', lastName: 'Montes' },
    { firstName: 'Ignacio', lastName: 'Ochoa' },
    { firstName: 'Cecilia', lastName: 'Ponce' },
    { firstName: 'Ramón', lastName: 'Quiroz' },
    { firstName: 'Daniela', lastName: 'Silva' }
];

// Horarios disponibles (9am - 8pm)
const availableHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Días de la semana (1=Lunes, 6=Sábado)
const weekDays = [1, 2, 3, 4, 5, 6];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

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

async function createRealisticPatients() {
    console.log("🚀 Iniciando creación de 50 pacientes con citas recurrentes aleatorias...");

    let createdCount = 0;
    let appointmentCount = 0;

    // Crear pacientes de Diana
    for (const patient of dianaPatients) {
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

            // Asignar día y hora aleatorios
            const dayOfWeek = getRandomElement(weekDays);
            const hour = getRandomElement(availableHours);
            const numWeeks = getRandomInt(4, 10); // Entre 4 y 10 semanas
            const cost = getRandomInt(600, 900); // Costo aleatorio entre 600 y 900

            // Crear citas recurrentes
            for (let week = 0; week < numWeeks; week++) {
                const appointmentDate = getNextDate(dayOfWeek, hour, week);

                const appointmentData = {
                    name: fullName,
                    therapist: 'diana',
                    date: appointmentDate.toISOString().slice(0, 16),
                    cost: cost.toString(),
                    isPaid: Math.random() > 0.7, // 30% pagadas
                    confirmed: Math.random() > 0.5, // 50% confirmadas
                    isCancelled: false,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'appointments'), appointmentData);
                appointmentCount++;
            }

            console.log(`  📅 ${numWeeks} citas creadas para ${fullName}`);

        } catch (error) {
            console.error(`❌ Error creando ${fullName}:`, error);
        }
    }

    // Crear pacientes de Sam
    for (const patient of samPatients) {
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

            // Asignar día y hora aleatorios
            const dayOfWeek = getRandomElement(weekDays);
            const hour = getRandomElement(availableHours);
            const numWeeks = getRandomInt(4, 10);
            const cost = getRandomInt(600, 900);

            // Crear citas recurrentes
            for (let week = 0; week < numWeeks; week++) {
                const appointmentDate = getNextDate(dayOfWeek, hour, week);

                const appointmentData = {
                    name: fullName,
                    therapist: 'sam',
                    date: appointmentDate.toISOString().slice(0, 16),
                    cost: cost.toString(),
                    isPaid: Math.random() > 0.7,
                    confirmed: Math.random() > 0.5,
                    isCancelled: false,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'appointments'), appointmentData);
                appointmentCount++;
            }

            console.log(`  📅 ${numWeeks} citas creadas para ${fullName}`);

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
        btn.onclick = createRealisticPatients;
    }
});
