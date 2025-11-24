// data.js - manejo de datos y listeners
import { db, patientProfilesPath, patientsData, patientProfiles, collection, onSnapshot, query, collectionPath, subscribeToPatientsData } from './firebase.js';
import { updatePatientProfiles } from './utils.js'; // assuming utils will export this helper

// Exportar variables para que otros módulos las usen
export let patientsDataLocal = patientsData; // alias
export let patientProfilesLocal = patientProfiles;

// Listener de perfiles (mantener actualizado patientProfilesLocal)
export function initPatientProfilesListener() {
    console.log('🏥 data.js: Iniciando listener de perfiles');
    const profilesColRef = collection(db, patientProfilesPath);
    const profilesQuery = query(profilesColRef);
    onSnapshot(profilesQuery, (snapshot) => {
        const profiles = [];
        snapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        // actualizar variable exportada
        patientProfilesLocal = profiles;
        updatePatientProfiles(profiles);
    }, (error) => {
        console.error('Error Patient Profiles: ' + error.message);
    });
}

// Suscripción a cambios en citas (actualiza patientsDataLocal)
export function initPatientsDataListener() {
    console.log('🏥 data.js: Suscribiendo a datos de citas');
    subscribeToPatientsData(() => {
        // patientsData is imported from firebase.js and kept up‑to‑date there
        patientsDataLocal = patientsData; // refresh reference
    });
}
