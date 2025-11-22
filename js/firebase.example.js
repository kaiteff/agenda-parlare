// firebase.example.js - Plantilla de configuración de Firebase
// INSTRUCCIONES:
// 1. Copia este archivo y renómbralo a "firebase.js"
// 2. Reemplaza los valores de ejemplo con tus credenciales reales de Firebase
// 3. NO compartas el archivo firebase.js en repositorios públicos

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase - REEMPLAZA CON TUS VALORES
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// ID de la aplicación (usado para rutas de Firestore)
export const appId = "TU_APP_ID";

// Rutas de colecciones
export const collectionPath = `/artifacts/${appId}/public/data/appointments`;
export const notificationsPath = `/artifacts/${appId}/public/data/notifications`;
export const patientProfilesPath = `/artifacts/${appId}/public/data/patientProfiles`;

// Estado global de datos
export let patientsData = [];
export let patientProfiles = [];

// Inicializar Firebase
export async function initializeFirebase(onAuthCallback) {
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Usuario autenticado:", user.uid);
                if (onAuthCallback) onAuthCallback(user);
            } else {
                console.log("Autenticando anónimamente...");
                await signInAnonymously(auth);
            }
        });

        return { app, auth, db };
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
        throw error;
    }
}

// Exportar instancias (se inicializan al cargar)
export const db = getFirestore();
export const userId = "anonymous";

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp };

// Función para actualizar datos de pacientes
export function updatePatientsData(data) {
    patientsData = data;
}

// Función para actualizar perfiles de pacientes
export function updatePatientProfiles(data) {
    patientProfiles = data;
}
