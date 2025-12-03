// fix_existing_data.js - Corregir datos existentes sin therapist
import { db } from './firebase.js';
import { collection, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function fixExistingData() {
    console.log('🔧 Corrigiendo datos existentes sin therapist...');

    // Esperar a que db esté inicializado
    let retries = 0;
    while (!db && retries < 10) {
        console.log('⏳ Esperando inicialización de Firebase...');
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
    }

    if (!db) {
        throw new Error('Firebase no se inicializó correctamente');
    }

    console.log('✅ Firebase inicializado, procediendo...');

    // Corregir perfiles de pacientes
    const profilesRef = collection(db, 'patientProfiles');
    const profilesSnapshot = await getDocs(profilesRef);

    let profilesFixed = 0;
    for (const profileDoc of profilesSnapshot.docs) {
        const data = profileDoc.data();
        if (!data.therapist || data.therapist === undefined) {
            await updateDoc(doc(db, 'patientProfiles', profileDoc.id), {
                therapist: 'diana'
            });
            console.log(`  ✅ Perfil actualizado: ${data.name} -> diana`);
            profilesFixed++;
        }
    }

    // Corregir citas
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsSnapshot = await getDocs(appointmentsRef);

    let appointmentsFixed = 0;
    for (const apptDoc of appointmentsSnapshot.docs) {
        const data = apptDoc.data();
        if (!data.therapist || data.therapist === undefined) {
            await updateDoc(doc(db, 'appointments', apptDoc.id), {
                therapist: 'diana'
            });
            console.log(`  ✅ Cita actualizada: ${data.name} (${new Date(data.date).toLocaleDateString()}) -> diana`);
            appointmentsFixed++;
        }
    }

    console.log(`\n✅ Corrección completada!`);
    console.log(`   📊 Perfiles corregidos: ${profilesFixed}`);
    console.log(`   📅 Citas corregidas: ${appointmentsFixed}`);
}
