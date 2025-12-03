// firebase.js - ConfiguraciÃ³n de Firebase
// Este archivo contiene las credenciales reales y NO debe compartirse pÃºblicamente

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ConfiguraciÃ³n de Firebase
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
export const collectionPath = 'appointments';
export const notificationsPath = `/artifacts/${appId}/public/data/notifications`;
export const patientProfilesPath = 'patientProfiles';

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
    if (patientsData.length > 0) {
        callback(patientsData);
    }
}

// FunciÃ³n para actualizar datos de pacientes y notificar a suscriptores
export function updatePatientsData(data) {
    patientsData = data;
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
        console.log("ðŸ”¥ Inicializando Firebase...");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        authInstance = auth;
        db = getFirestore(app);

        console.log("âœ… Firebase inicializado correctamente");
        console.log("ðŸ” authInstance:", authInstance ? "OK" : "NULL");

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("âœ… Usuario autenticado:", user.email);
                if (onAuthCallback) onAuthCallback(user);
            } else {
                console.log("ðŸ”’ Usuario no autenticado");
                if (onAuthCallback) onAuthCallback(null);
            }
        });

        return { app, auth, db };
    } catch (error) {
        console.error("âŒ Error inicializando Firebase:", error);
        throw error;
    }
}

// FunciÃ³n para login con email y password
export async function loginUser(email, password) {
    console.log("ðŸ” Intentando login...");
    console.log("ðŸ“§ Email:", email);
    console.log("ðŸ”‘ authInstance:", authInstance ? "OK" : "NULL");
    
    if (!authInstance) {
        console.error("âŒ authInstance es null - Firebase no estÃ¡ inicializado");
        return { success: false, error: "Firebase no estÃ¡ inicializado. Por favor recarga la pÃ¡gina." };
    }

    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        console.log("ðŸ”„ Llamando a signInWithEmailAndPassword...");
        const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        console.log("âœ… Login exitoso:", userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("âŒ Error en login:", error);
        console.error("âŒ CÃ³digo de error:", error.code);
        console.error("âŒ Mensaje:", error.message);
        
        let friendlyMessage = error.message;
        if (error.code === "auth/user-not-found") {
            friendlyMessage = "No existe un usuario con ese correo electrÃ³nico.";
        } else if (error.code === "auth/wrong-password") {
            friendlyMessage = "ContraseÃ±a incorrecta.";
        } else if (error.code === "auth/invalid-email") {
            friendlyMessage = "El correo electrÃ³nico no es vÃ¡lido.";
        } else if (error.code === "auth/invalid-credential") {
            friendlyMessage = "Credenciales invÃ¡lidas. Verifica tu correo y contraseÃ±a.";
        }
        
        return { success: false, error: friendlyMessage };
    }
}

// FunciÃ³n para logout
export async function logoutUser() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(authInstance);
        console.log("âœ… Logout exitoso");
        return { success: true };
    } catch (error) {
        console.error("âŒ Error en logout:", error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp };
