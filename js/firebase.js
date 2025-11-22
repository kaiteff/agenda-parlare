// firebase.js - Configuración y funciones base de Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase - NUEVAS CREDENCIALES REGENERADAS
const firebaseConfig = {
    apiKey: "AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0",
    authDomain: "taconotaco-d94fc.firebaseapp.com",
    projectId: "taconotaco-d94fc",
    storageBucket: "taconotaco-d94fc.firebasestorage.app",
    messagingSenderId: "40563362456",
    appId: "1:40563362456:web:7b53f4f0bfcee93a92deed"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID de la aplicación
export const appId = "taconotaco-d94fc";

// Rutas de colecciones
export const collectionPath = `/artifacts/${appId}/public/data/appointments`;
export const notificationsPath = `/artifacts/${appId}/public/data/notifications`;
export const patientProfilesPath = `/artifacts/${appId}/public/data/patientProfiles`;

// Estado global de datos
export let patientsData = [];
export let patientProfiles = [];

// Suscriptores para cambios en patientsData
const patientsDataSubscribers = [];

// Variable para el usuario actual
export let userId = null;

// Inicializar Firebase con autenticación
export async function initializeFirebase(onAuthCallback) {
    try {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("Usuario autenticado:", user.email);
            } else {
                userId = null;
                console.log("Usuario no autenticado");
            }
            if (onAuthCallback) onAuthCallback(user);
        });

        return { app, auth, db };
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
        throw error;
    }
}

// Funciones de autenticación
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Error login:", error);
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Error logout:", error);
        return { success: false, error: error.message };
    }
}

// Exportar instancias
export { db, auth };

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, getDocs, setDoc };

// Función para actualizar datos de pacientes
export function updatePatientsData(data) {
    patientsData = data;
    notifyPatientsDataSubscribers();
}

// Función para actualizar perfiles de pacientes
export function updatePatientProfiles(data) {
    patientProfiles = data;
}

// Función para suscribirse a cambios en patientsData
export function subscribeToPatientsData(callback) {
    patientsDataSubscribers.push(callback);
}

// Notificar a todos los suscriptores
function notifyPatientsDataSubscribers() {
    patientsDataSubscribers.forEach(cb => cb(patientsData));
}
