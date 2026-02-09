# Script completo para arreglar firebase.js con mejor manejo de errores y logging

$firebaseFile = "g:\My Drive\AG\js\firebase.js"

$newContent = @"
// firebase.js - Configuración de Firebase
// Este archivo contiene las credenciales reales y NO debe compartirse públicamente

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0",
  authDomain: "taconotaco-d94fc.firebaseapp.com",
  projectId: "taconotaco-d94fc",
  storageBucket: "taconotaco-d94fc.firebasestorage.app",
  messagingSenderId: "40563362456",
  appId: "1:40563362456:web:7b53f4f0bfcee93a92deed"
};

// ID de la aplicación (usado para rutas de Firestore)
export const appId = "taconotaco-d94fc";

// Rutas de colecciones
export const collectionPath = ``/artifacts/`${appId}/public/data/appointments``;
export const notificationsPath = ``/artifacts/`${appId}/public/data/notifications``;
export const patientProfilesPath = ``/artifacts/`${appId}/public/data/patientProfiles``;

// Estado global de datos
export let patientsData = [];
export let patientProfiles = [];

// Variables que se inicializarán después
export let db = null;
export let userId = null;

// Variable para almacenar la instancia de auth
let authInstance = null;

// Sistema de suscripción para cambios en patientsData
const patientsDataSubscribers = [];

// Función para suscribirse a cambios en patientsData
export function subscribeToPatientsData(callback) {
    patientsDataSubscribers.push(callback);
    if (patientsData.length > 0) {
        callback(patientsData);
    }
}

// Función para actualizar datos de pacientes y notificar a suscriptores
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

// Función para actualizar perfiles de pacientes
export function updatePatientProfiles(data) {
    patientProfiles = data;
}

// Inicializar Firebase
export async function initializeFirebase(onAuthCallback) {
    try {
        console.log("🔥 Inicializando Firebase...");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        authInstance = auth;
        db = getFirestore(app);

        console.log("✅ Firebase inicializado correctamente");
        console.log("🔐 authInstance:", authInstance ? "OK" : "NULL");

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("✅ Usuario autenticado:", user.email);
                if (onAuthCallback) onAuthCallback(user);
            } else {
                console.log("🔒 Usuario no autenticado");
                if (onAuthCallback) onAuthCallback(null);
            }
        });

        return { app, auth, db };
    } catch (error) {
        console.error("❌ Error inicializando Firebase:", error);
        throw error;
    }
}

// Función para login con email y password
export async function loginUser(email, password) {
    console.log("🔐 Intentando login...");
    console.log("📧 Email:", email);
    console.log("🔑 authInstance:", authInstance ? "OK" : "NULL");
    
    if (!authInstance) {
        console.error("❌ authInstance es null - Firebase no está inicializado");
        return { success: false, error: "Firebase no está inicializado. Por favor recarga la página." };
    }

    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        console.log("🔄 Llamando a signInWithEmailAndPassword...");
        const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        console.log("✅ Login exitoso:", userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("❌ Error en login:", error);
        console.error("❌ Código de error:", error.code);
        console.error("❌ Mensaje:", error.message);
        
        let friendlyMessage = error.message;
        if (error.code === "auth/user-not-found") {
            friendlyMessage = "No existe un usuario con ese correo electrónico.";
        } else if (error.code === "auth/wrong-password") {
            friendlyMessage = "Contraseña incorrecta.";
        } else if (error.code === "auth/invalid-email") {
            friendlyMessage = "El correo electrónico no es válido.";
        } else if (error.code === "auth/invalid-credential") {
            friendlyMessage = "Credenciales inválidas. Verifica tu correo y contraseña.";
        }
        
        return { success: false, error: friendlyMessage };
    }
}

// Función para logout
export async function logoutUser() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(authInstance);
        console.log("✅ Logout exitoso");
        return { success: true };
    } catch (error) {
        console.error("❌ Error en logout:", error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones de Firestore
export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp };
"@

Set-Content -Path $firebaseFile -Value $newContent -Encoding UTF8
Write-Host "✅ firebase.js actualizado con mejor logging y manejo de errores" -ForegroundColor Green
