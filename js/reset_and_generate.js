// reset_and_generate.js - Borrar todo y generar 50 pacientes con citas aleatorias
import { db } from './firebase.js';
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 25 nombres para Diana
const dianaNames = [
    ['Roberto', 'Sánchez'], ['Patricia', 'Ramírez'], ['Fernando', 'Torres'],
    ['Claudia', 'Morales'], ['Ricardo', 'Jiménez'], ['Mónica', 'Vargas'],
    ['Alberto', 'Castro'], ['Silvia', 'Ortiz'], ['Jorge', 'Ruiz'],
    ['Elena', 'Flores'], ['Miguel', 'Herrera'], ['Rosa', 'Medina'],
    ['Daniel', 'Guzmán'], ['Teresa', 'Reyes'], ['Sergio', 'Cortés'],
    ['Lorena', 'Navarro'], ['Pablo', 'Domínguez'], ['Verónica', 'Gil'],
    ['Gustavo', 'Márquez'], ['Isabel', 'Ramos'], ['Andrés', 'Cabrera'],
    ['Carmen', 'Molina'], ['Luis', 'Santana'], ['Alicia', 'Vázquez'],
    ['Enrique', 'Pacheco']
];

// 25 nombres para Sam
const samNames = [
    ['Valeria', 'Núñez'], ['Rodrigo', 'Vega'], ['Beatriz', 'Campos'],
    ['Héctor', 'Luna'], ['Adriana', 'Ríos'], ['Ernesto', 'Aguilar'],
    ['Lucía', 'Salazar'], ['Raúl', 'Méndez'], ['Gabriela', 'Paredes'],
    ['Arturo', 'Delgado'], ['Mariana', 'Rojas'], ['Francisco', 'Ibarra'],
    ['Natalia', 'Fuentes'], ['Javier', 'Peña'], ['Carolina', 'Soto'],
    ['Óscar', 'Benítez'], ['Diana', 'Cárdenas'], ['Mauricio', 'Estrada'],
    ['Sofía', 'Guerrero'], ['Tomás', 'Lara'], ['Paola', 'Montes'],
    ['Ignacio', 'Ochoa'], ['Cecilia', 'Ponce'], ['Ramón', 'Quiroz'],
    ['Daniela', 'Silva']
];

const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const weekDays = [1, 2, 3, 4, 5, 6]; // Lunes a Sábado

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getNextDate(dayOfWeek, hour, weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay();

    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    daysUntil += (weekOffset * 7);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    targetDate.setHours(hour, 0, 0, 0);

    return targetDate;
}

export async function resetAndGenerate() {
    console.log('⏳ Esperando inicialización de Firebase...');

    // Esperar a que db esté inicializado
    let retries = 0;
    while (!db && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
    }

    if (!db) {
        throw new Error('Firebase no se inicializó. Recarga la página e intenta de nuevo.');
    }

    console.log('✅ Firebase listo');
    console.log('🗑️ PASO 1: Borrando todos los datos existentes...');

    // Borrar perfiles
    const profilesRef = collection(db, 'patientProfiles');
    const profilesSnapshot = await getDocs(profilesRef);
    let deletedProfiles = 0;
    for (const profileDoc of profilesSnapshot.docs) {
        await deleteDoc(doc(db, 'patientProfiles', profileDoc.id));
        deletedProfiles++;
    }
    console.log(`   ✅ ${deletedProfiles} perfiles borrados`);

    // Borrar citas
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsSnapshot = await getDocs(appointmentsRef);
    let deletedAppointments = 0;
    for (const apptDoc of appointmentsSnapshot.docs) {
        await deleteDoc(doc(db, 'appointments', apptDoc.id));
        deletedAppointments++;
    }
    console.log(`   ✅ ${deletedAppointments} citas borradas`);

    console.log('\n🎲 PASO 2: Generando 50 pacientes con citas aleatorias...');

    const newProfilesRef = collection(db, 'patientProfiles');
    const newAppointmentsRef = collection(db, 'appointments');

    let totalPatients = 0;
    let totalAppointments = 0;

    // Crear pacientes de Diana
    console.log('\n👤 Creando 25 pacientes para Diana...');
    for (const [firstName, lastName] of dianaNames) {
        const fullName = `${firstName} ${lastName}`;

        // Crear perfil
        await addDoc(newProfilesRef, {
            name: fullName,
            firstName,
            lastName,
            therapist: 'diana',
            isActive: true,
            dateAdded: serverTimestamp(),
            dateInactivated: null,
            lastSessionDate: null
        });

        totalPatients++;

        // Horario aleatorio
        const day = weekDays[rand(0, weekDays.length - 1)];
        const hour = hours[rand(0, hours.length - 1)];
        const numWeeks = rand(4, 10);
        const cost = rand(600, 900);

        // Crear citas recurrentes
        for (let week = 0; week < numWeeks; week++) {
            const appointmentDate = getNextDate(day, hour, week);

            await addDoc(newAppointmentsRef, {
                name: fullName,
                date: appointmentDate.toISOString().slice(0, 16),
                cost: cost.toString(),
                therapist: 'diana',
                isPaid: Math.random() > 0.7,
                confirmed: Math.random() > 0.5,
                isCancelled: false,
                createdAt: serverTimestamp()
            });

            totalAppointments++;
        }

        console.log(`  ✅ ${fullName} - ${numWeeks} citas`);
    }

    // Crear pacientes de Sam
    console.log('\n👤 Creando 25 pacientes para Sam...');
    for (const [firstName, lastName] of samNames) {
        const fullName = `${firstName} ${lastName}`;

        // Crear perfil
        await addDoc(newProfilesRef, {
            name: fullName,
            firstName,
            lastName,
            therapist: 'sam',
            isActive: true,
            dateAdded: serverTimestamp(),
            dateInactivated: null,
            lastSessionDate: null
        });

        totalPatients++;

        // Horario aleatorio
        const day = weekDays[rand(0, weekDays.length - 1)];
        const hour = hours[rand(0, hours.length - 1)];
        const numWeeks = rand(4, 10);
        const cost = rand(600, 900);

        // Crear citas recurrentes
        for (let week = 0; week < numWeeks; week++) {
            const appointmentDate = getNextDate(day, hour, week);

            await addDoc(newAppointmentsRef, {
                name: fullName,
                date: appointmentDate.toISOString().slice(0, 16),
                cost: cost.toString(),
                therapist: 'sam',
                isPaid: Math.random() > 0.7,
                confirmed: Math.random() > 0.5,
                isCancelled: false,
                createdAt: serverTimestamp()
            });

            totalAppointments++;
        }

        console.log(`  ✅ ${fullName} - ${numWeeks} citas`);
    }

    console.log(`\n✅ ¡COMPLETADO!`);
    console.log(`   📊 Total pacientes: ${totalPatients}`);
    console.log(`   📅 Total citas: ${totalAppointments}`);
    console.log(`   👥 Diana: 25 pacientes`);
    console.log(`   👥 Sam: 25 pacientes`);
}
