import { db } from './firebase.js';
import { collection, getDocs, updateDoc, doc, serverTimestamp, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Lazy-load auth to ensure db is initialized first
let _auth = null;
function getAuthInstance() {
    if (!_auth && db?.app) {
        _auth = getAuth(db.app);
    }
    return _auth;
}

export async function createInitialUsers() {
    console.log("👤 Verificando/Creando usuario actual...");
    const user = getAuthInstance().currentUser;
    if (!user) {
        console.log("⚠️ No hay usuario logueado para crear perfil.");
        return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        console.log(`🆕 Creando perfil de ADMIN para ${user.email}`);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            role: 'admin',
            therapist: 'diana',
            name: user.displayName || 'Diana',
            displayName: user.displayName || 'Diana (Admin)',
            createdAt: serverTimestamp(),
            isActive: true
        });
        console.log("✅ Perfil de usuario creado.");
    } else {
        console.log("ℹ️ El perfil de usuario ya existe.");
    }
}

export async function runMigration() {
    console.log("🚀 Iniciando migración de datos a Multi-Terapeuta...");

    try {
        // 0. Crear Usuario Admin (Fase 1)
        await createInitialUsers();

        // 1. Migrar Perfiles de Pacientes (Fase 2)
        console.log("📦 Migrando perfiles de pacientes...");
        const profilesRef = collection(db, 'patientProfiles');
        const profilesSnapshot = await getDocs(profilesRef);

        let profilesCount = 0;
        const profilePromises = profilesSnapshot.docs.map(async (document) => {
            const data = document.data();
            // Solo actualizar si no tiene terapeuta asignado
            if (!data.therapist) {
                await updateDoc(doc(db, 'patientProfiles', document.id), {
                    therapist: 'diana',
                    assignedAt: serverTimestamp(),
                    migratedAt: serverTimestamp()
                });
                profilesCount++;
            }
        });

        await Promise.all(profilePromises);
        console.log(`✅ ${profilesCount} perfiles de pacientes actualizados a 'diana'.`);

        // 2. Migrar Citas (patientsData)
        console.log("📅 Migrando citas...");
        const appointmentsRef = collection(db, 'patientsData');
        const appointmentsSnapshot = await getDocs(appointmentsRef);

        let appointmentsCount = 0;
        const appointmentPromises = appointmentsSnapshot.docs.map(async (document) => {
            const data = document.data();
            if (!data.therapist) {
                await updateDoc(doc(db, 'patientsData', document.id), {
                    therapist: 'diana',
                    migratedAt: serverTimestamp()
                });
                appointmentsCount++;
            }
        });

        await Promise.all(appointmentPromises);
        console.log(`✅ ${appointmentsCount} citas actualizadas a 'diana'.`);

        console.log("🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE");
        // alert("Migración completada: Todo asignado a Diana."); // Comentado para no molestar

    } catch (error) {
        console.error("❌ Error durante la migración:", error);
        alert("Error en la migración. Revisa la consola.");
    }
}

// Exponer al window para ejecutar desde consola
window.runMigration = runMigration;
