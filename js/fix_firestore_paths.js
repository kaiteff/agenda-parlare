// fix_firestore_paths.js - Script para corregir las rutas de Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Importar configuración de Firebase
import { db } from './js/firebase.js';

async function fixPaths() {
    console.log("🔧 Iniciando corrección de rutas de Firestore...");

    try {
        // === MIGRAR CITAS (APPOINTMENTS) ===
        const oldAppointmentsPath = "/artifacts/taconotaco-d94fc/public/data/appointments";
        const newAppointmentsPath = "appointments";

        console.log(`\n📂 Migrando CITAS desde: ${oldAppointmentsPath}`);
        const oldAppointmentsCol = collection(db, oldAppointmentsPath);
        const appointmentsSnapshot = await getDocs(oldAppointmentsCol);

        console.log(`📊 Encontradas ${appointmentsSnapshot.size} citas`);

        if (appointmentsSnapshot.size > 0) {
            for (const docSnap of appointmentsSnapshot.docs) {
                const data = docSnap.data();
                const docId = docSnap.id;

                console.log(`📝 Migrando cita: ${data.name} - ${data.date}`);

                // Crear en la nueva ubicación
                await setDoc(doc(db, newAppointmentsPath, docId), data);

                // Eliminar de la ubicación antigua
                await deleteDoc(doc(db, oldAppointmentsPath, docId));

                console.log(`✅ Cita migrada`);
            }
        } else {
            console.log("ℹ️ No hay citas en la ruta antigua");
        }

        // === MIGRAR PERFILES (PATIENT PROFILES) ===
        const oldProfilesPath = "/artifacts/taconotaco-d94fc/public/data/patientProfiles";
        const newProfilesPath = "patientProfiles";

        console.log(`\n📂 Migrando PERFILES desde: ${oldProfilesPath}`);
        const oldProfilesCol = collection(db, oldProfilesPath);
        const profilesSnapshot = await getDocs(oldProfilesCol);

        console.log(`📊 Encontrados ${profilesSnapshot.size} perfiles`);

        if (profilesSnapshot.size > 0) {
            for (const docSnap of profilesSnapshot.docs) {
                const data = docSnap.data();
                const docId = docSnap.id;

                console.log(`📝 Migrando perfil: ${data.name}`);

                // Crear en la nueva ubicación
                await setDoc(doc(db, newProfilesPath, docId), data);

                // Eliminar de la ubicación antigua
                await deleteDoc(doc(db, oldProfilesPath, docId));

                console.log(`✅ Perfil migrado`);
            }
        } else {
            console.log("ℹ️ No hay perfiles en la ruta antigua");
        }

        console.log("\n🎉 Migración completada exitosamente");
        console.log("🔄 Recarga la página para ver los cambios");
    } catch (error) {
        console.error("❌ Error durante la migración:", error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('fixPathsBtn');
    if (btn) {
        btn.onclick = fixPaths;
    }
});
