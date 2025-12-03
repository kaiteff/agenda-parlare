// generate_test_data.js - Generar datos de prueba para Diana y Sam
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const THERAPISTS = {
    diana: {
        id: 'diana',
        name: 'Diana',
        patients: [
            { firstName: 'María', lastName: 'González', dayOfWeek: 1, hour: 9 },
            { firstName: 'Juan', lastName: 'Pérez', dayOfWeek: 1, hour: 10 },
            { firstName: 'Ana', lastName: 'Martínez', dayOfWeek: 1, hour: 11 },
            { firstName: 'Carlos', lastName: 'López', dayOfWeek: 1, hour: 14 },
            { firstName: 'Laura', lastName: 'Rodríguez', dayOfWeek: 1, hour: 15 },
            { firstName: 'Pedro', lastName: 'Sánchez', dayOfWeek: 2, hour: 9 },
            { firstName: 'Sofia', lastName: 'Ramírez', dayOfWeek: 2, hour: 10 },
            { firstName: 'Diego', lastName: 'Torres', dayOfWeek: 2, hour: 11 },
            { firstName: 'Valentina', lastName: 'Flores', dayOfWeek: 2, hour: 14 },
            { firstName: 'Mateo', lastName: 'Rivera', dayOfWeek: 2, hour: 15 },
            { firstName: 'Isabella', lastName: 'Gómez', dayOfWeek: 3, hour: 9 },
            { firstName: 'Santiago', lastName: 'Díaz', dayOfWeek: 3, hour: 10 },
            { firstName: 'Camila', lastName: 'Vargas', dayOfWeek: 3, hour: 11 },
            { firstName: 'Sebastián', lastName: 'Castro', dayOfWeek: 3, hour: 14 },
            { firstName: 'Lucía', lastName: 'Ortiz', dayOfWeek: 3, hour: 15 },
            { firstName: 'Nicolás', lastName: 'Ruiz', dayOfWeek: 4, hour: 9 },
            { firstName: 'Emma', lastName: 'Morales', dayOfWeek: 4, hour: 10 },
            { firstName: 'Matías', lastName: 'Jiménez', dayOfWeek: 4, hour: 11 },
            { firstName: 'Mía', lastName: 'Herrera', dayOfWeek: 4, hour: 14 },
            { firstName: 'Lucas', lastName: 'Medina', dayOfWeek: 4, hour: 15 }
        ]
    },
    sam: {
        id: 'sam',
        name: 'Sam',
        patients: [
            { firstName: 'Alejandro', lastName: 'Navarro', dayOfWeek: 1, hour: 9 },
            { firstName: 'Daniela', lastName: 'Reyes', dayOfWeek: 1, hour: 10 },
            { firstName: 'Gabriel', lastName: 'Romero', dayOfWeek: 1, hour: 11 },
            { firstName: 'Victoria', lastName: 'Silva', dayOfWeek: 1, hour: 14 },
            { firstName: 'Andrés', lastName: 'Mendoza', dayOfWeek: 1, hour: 15 },
            { firstName: 'Martina', lastName: 'Gutiérrez', dayOfWeek: 2, hour: 9 },
            { firstName: 'Felipe', lastName: 'Aguilar', dayOfWeek: 2, hour: 10 },
            { firstName: 'Renata', lastName: 'Vega', dayOfWeek: 2, hour: 11 },
            { firstName: 'Emiliano', lastName: 'Cortés', dayOfWeek: 2, hour: 14 },
            { firstName: 'Paula', lastName: 'Ramos', dayOfWeek: 2, hour: 15 },
            { firstName: 'Joaquín', lastName: 'Paredes', dayOfWeek: 3, hour: 9 },
            { firstName: 'Valeria', lastName: 'Luna', dayOfWeek: 3, hour: 10 },
            { firstName: 'Tomás', lastName: 'Campos', dayOfWeek: 3, hour: 11 },
            { firstName: 'Antonella', lastName: 'Peña', dayOfWeek: 3, hour: 14 },
            { firstName: 'Benjamín', lastName: 'Ríos', dayOfWeek: 3, hour: 15 },
            { firstName: 'Catalina', lastName: 'Molina', dayOfWeek: 4, hour: 9 },
            { firstName: 'Maximiliano', lastName: 'Cabrera', dayOfWeek: 4, hour: 10 },
            { firstName: 'Julieta', lastName: 'Carrillo', dayOfWeek: 4, hour: 11 },
            { firstName: 'Agustín', lastName: 'Fuentes', dayOfWeek: 4, hour: 14 },
            { firstName: 'Florencia', lastName: 'Núñez', dayOfWeek: 4, hour: 15 }
        ]
    }
};

function getNextDate(dayOfWeek, hour, weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay();

    // Calcular días hasta el próximo día de la semana deseado
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Si ya pasó esta semana, ir a la siguiente

    // Agregar el offset de semanas
    daysUntil += (weekOffset * 7);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    targetDate.setHours(hour, 0, 0, 0);

    return targetDate;
}

export async function generateTestData() {
    console.log('🎲 Generando datos de prueba...');

    const patientProfilesRef = collection(db, 'patientProfiles');
    const appointmentsRef = collection(db, 'appointments');

    let totalPatients = 0;
    let totalAppointments = 0;

    for (const [therapistKey, therapistData] of Object.entries(THERAPISTS)) {
        console.log(`\n👤 Creando pacientes para ${therapistData.name}...`);

        for (const patientData of therapistData.patients) {
            const fullName = `${patientData.firstName} ${patientData.lastName}`;

            // Crear perfil de paciente
            const profileDoc = await addDoc(patientProfilesRef, {
                name: fullName,
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                therapist: therapistData.id,
                isActive: true,
                dateAdded: serverTimestamp(),
                dateInactivated: null,
                lastSessionDate: null
            });

            totalPatients++;
            console.log(`  ✅ ${fullName} (${therapistData.id})`);

            // Crear 8 citas (una por semana)
            for (let week = 0; week < 8; week++) {
                const appointmentDate = getNextDate(patientData.dayOfWeek, patientData.hour, week);

                await addDoc(appointmentsRef, {
                    name: fullName,
                    date: appointmentDate.toISOString(),
                    cost: 500,
                    therapist: therapistData.id,
                    isPaid: week < 2, // Las primeras 2 semanas ya pagadas
                    confirmed: week === 0, // Solo la primera semana confirmada
                    isCancelled: false,
                    createdAt: serverTimestamp()
                });

                totalAppointments++;
            }
        }
    }

    console.log(`\n✅ Datos de prueba generados exitosamente!`);
    console.log(`   📊 Total pacientes: ${totalPatients}`);
    console.log(`   📅 Total citas: ${totalAppointments}`);
    console.log(`   👥 Diana: 20 pacientes, 160 citas`);
    console.log(`   👥 Sam: 20 pacientes, 160 citas`);
}
