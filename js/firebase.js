// firebase.example.js - Plantilla de configuraciÃ³n de Firebase
// INSTRUCCIONES:
// 1. Copia este archivo y renÃ³mbralo a "firebase.js"
// 2. Reemplaza los valores de ejemplo con tus credenciales reales de Firebase
// 3. NO compartas el archivo firebase.js en repositorios pÃºblicos

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ConfiguraciÃ³n de Firebase - REEMPLAZA CON TUS VALORES
const firebaseConfig = {
  apiKey: "AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0",
  authDomain: "taconotaco-d94fc.firebaseapp.com",
  projectId: "taconotaco-d94fc",
  storageBucket: "taconotaco-d94fc.firebasestorage.app",
  messagingSenderId: "40563362456",
  appId: "1:40563362456:web:7b53f4f0bfcee93a92deed"
};

// ID de la aplicaciÃ³n (usado para rutas de Firestore)
export const appId = "taconotaco-d94fc";

// Rutas de colecciones
export const collectionPath = `/artifacts/${appId}/public/data/appointments`;
export const notificationsPath = `/artifacts/${appId}/public/data/notifications`;
export const patientProfilesPath = `/artifacts/${appId}/public/data/patientProfiles`;

// Estado global de datos
export let patientsData = [];
export let patientProfiles = [];

// Variables que se inicializarÃ¡n despuÃ©s
export let db = null;
export let userId = null;

// Variable para almacenar la instancia de auth
let authInstance = null;

// Sistema de suscripciÃ³n para cambios en patientsData
const patientsDataSubscribers = [];

// FunciÃ³n para suscribirse a cambios en patientsData
export function subscribeToPatientsData(callback) {
    patientsDataSubscribers.push(callback);
    // Llamar inmediatamente con los datos actuales si existen
    if (patientsData.length > 0) {
        callback(patientsData);
    }
}

// FunciÃ³n para actualizar datos de pacientes y notificar a suscriptores
export function updatePatientsData(data) {
    patientsData = data;
    // Notificar a todos los suscriptores
    patientsDataSubscribers.forEach(callback => {
        try {
            callback(data);
        } catch (error) {
            console.error("Error en suscriptor de patientsData:", error);
        }
    });
}

// FunciÃ³n para actualizar perfiles de pacientes
export function updatePatientProfiles(data) {
    patientProfiles = data;
}

// Inicializar Firebase
export async function initializeFirebase(onAuthCallback) {
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        authInstance = auth;
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("Usuario autenticado:", user.email);
                if (onAuthCallback) onAuthCallback(user);
            } else {
                console.log("Usuario no autenticado");
                if (onAuthCallback) onAuthCallback(null);
            }
        });

        return { app, auth, db };
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
        throw error;
    }
}

// FunciÃ³n para login con email y password
export async function loginUser(email, password) {
    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signInWithEmailAndPassword(authInstance, email, password);
        return { success: true };
    } catch (error) {
        console.error("Error en login:", error);
        return { success: false, error: error.message };
    }
}

// FunciÃ³n para logout
export async function logoutUser() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(authInstance);
        return { success: true };
    } catch (error) {
        console.error("Error en logout:", error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp };


