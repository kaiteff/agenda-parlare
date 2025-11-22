// app.js - Punto de entrada principal de la aplicación

import { initializeFirebase, loginUser, logoutUser } from './firebase.js';
import { initCalendar } from './calendar.js';
import { initNotifications } from './notifications.js';
import { initPatients } from './patients.js';

// Referencias DOM
const loginContainer = document.getElementById('loginContainer');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Inicializar aplicación
console.log("🚀 Iniciando Agenda Parlare...");

// Manejar estado de autenticación
function handleAuthState(user) {
    if (user) {
        // Usuario logueado
        console.log("✅ Usuario autenticado:", user.email);
        loginContainer.classList.add('hidden');
        appContent.classList.remove('hidden');

        // Inicializar módulos si es necesario (idempotente)
        initializeModules();
    } else {
        // Usuario no logueado
        console.log("🔒 Usuario no autenticado");
        loginContainer.classList.remove('hidden');
        appContent.classList.add('hidden');

        // Limpiar formulario
        loginForm.reset();
        loginError.classList.add('hidden');
    }
}

function initializeModules() {
    // Inicializar módulos con manejo de errores
    try {
        console.log("🚀 Inicializando Patients...");
        initPatients();
    } catch (e) { console.error("❌ Error initPatients:", e); }

    try {
        console.log("🚀 Inicializando Calendar...");
        initCalendar();
    } catch (e) { console.error("❌ Error initCalendar:", e); }

    try {
        console.log("🚀 Inicializando Notifications...");
        initNotifications();
    } catch (e) { console.error("❌ Error initNotifications:", e); }

    console.log("✅ Todos los módulos inicializados");
}

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    loginError.classList.add('hidden');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";

    const result = await loginUser(email, password);

    if (!result.success) {
        loginError.textContent = "Error: Credenciales incorrectas o usuario no encontrado.";
        loginError.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
    // Si es exitoso, el listener de onAuthStateChanged manejará la UI
});

logoutBtn.addEventListener('click', async () => {
    if (confirm("¿Cerrar sesión?")) {
        await logoutUser();
    }
});

// Iniciar Firebase
initializeFirebase(handleAuthState);
