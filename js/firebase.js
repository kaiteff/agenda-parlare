// firebase.js - Configuración y funciones base de Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, enableIndexedDbPersistence, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0",
    authDomain: "taconotaco-d94fc.firebaseapp.com",
    projectId: "taconotaco-d94fc",
    storageBucket: "taconotaco-d94fc.firebasestorage.app",
    messagingSenderId: "40563362456",
    appId: "1:40563362456:web:a69344a60f68527092deed"
};

// Variables globales
export let db, auth, userId;
export const appId = "default-app-id";
export const collectionPath = `/artifacts/${appId}/public/data/patients`;
export const notificationsPath = `/artifacts/${appId}/public/data/notifications`;
export const patientProfilesPath = `/artifacts/${appId}/public/data/patientProfiles`;

// Estado global de datos
export let patientsData = [];
export let patientProfiles = [];

// Inicializar Firebase
export async function initializeFirebase(onAuthCallback) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        try {
            await enableIndexedDbPersistence(db);
            console.log("✅ Persistencia Offline HABILITADA");
        } catch (err) {
            console.log("⚠️ Error Persistencia: " + err.message);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("✅ Usuario autenticado:", userId);
                if (onAuthCallback) onAuthCallback(user);
            } else {
                signInAnonymously(auth);
            }
        });
    } catch (e) {
        console.error("❌ Error Init Firebase: " + e.message);
    }
}

// Actualizar array de pacientes
export function updatePatientsData(newData) {
    console.log("🔥 firebase.js: updatePatientsData llamado con", newData.length, "citas");
    patientsData = newData;
    notifyPatientsDataSubscribers();
}

// Sistema de suscripción para cambios en patientsData
const patientsDataSubscribers = [];

export function subscribeToPatientsData(callback) {
    console.log("🔥 firebase.js: Nuevo suscriptor registrado");
    patientsDataSubscribers.push(callback);
    // Si ya hay datos, llamar inmediatamente
    if (patientsData.length > 0) {
        console.log("🔥 firebase.js: Enviando datos iniciales a suscriptor");
        callback(patientsData);
    }
}

function notifyPatientsDataSubscribers() {
    console.log("🔥 firebase.js: Notificando a", patientsDataSubscribers.length, "suscriptores");
    patientsDataSubscribers.forEach(cb => cb(patientsData));
}

// Actualizar array de perfiles
export function updatePatientProfiles(newProfiles) {
    patientProfiles = newProfiles;
}

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, getDocs, setDoc };
