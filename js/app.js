// app.js - Punto de entrada principal de la aplicación
import { initializeFirebase, loginUser, logoutUser } from './firebase.js';
import { CalendarManager } from './modules/calendar/CalendarManager.js';
import { initNotifications } from './notifications.js';
import { PatientManager } from './managers/PatientManager.js';
import { AuthManager } from './managers/AuthManager.js';
import { ScheduleManager } from './managers/ScheduleManager.js';
import { ModalService } from './utils/ModalService.js';
import { ToastService } from './utils/ToastService.js';
import { NetworkMonitor } from './services/NetworkMonitor.js';
import { Header } from './components/Header.js'; // Nuevo componente

// Referencias DOM
const loginContainer = document.getElementById('loginContainer');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn'); // Mantenemos ref para listener inicial si es necesario, pero Header.js lo maneja

// Inicializar aplicación
console.log("🚀 Iniciando Agenda Parlare...");

// Manejar estado de autenticación
async function handleAuthState(user) {
    if (user) {
        // Inicializar usuario con AuthManager
        const userData = await AuthManager.initUser(user);

        if (!userData) {
            console.error("❌ Usuario no autorizado");
            loginError.textContent = "Usuario no autorizado para acceder al sistema.";
            loginError.classList.remove('hidden');
            await logoutUser();
            return;
        }

        // Usuario logueado y autorizado
        console.log(`✅ Usuario autenticado: ${userData.displayName}`);
        console.log(`🔑 Rol: ${userData.role}`);
        console.log(`👤 Terapeuta: ${userData.therapist || 'N/A'}`);

        loginContainer.classList.add('hidden');
        appContent.classList.remove('hidden');

        // Inicializar Header (Maneja info usuario, selector, logout, reportes)
        Header.init();

        // Inicializar módulos si es necesario (idempotente)
        initializeModules();
    } else {
        // Usuario no logueado
        console.log("🔒 Usuario no autenticado");
        AuthManager.clear();

        loginContainer.classList.remove('hidden');
        appContent.classList.add('hidden');

        // Limpiar formulario
        loginForm.reset();
        loginError.classList.add('hidden');
    }
}

let modulesInitialized = false;

async function initializeModules() {
    if (modulesInitialized) return;
    modulesInitialized = true;

    // Inicializar módulos con manejo de errores
    try {
        console.log("🚀 Inicializando PatientManager...");
        await PatientManager.init();
    } catch (e) { console.error("❌ Error PatientManager.init():", e); }

    try {
        console.log("🚀 Inicializando Calendar...");
        CalendarManager.initCalendar();
    } catch (e) { console.error("❌ Error initCalendar:", e); }

    try {
        console.log("🚀 Inicializando Notifications...");
        initNotifications();
    } catch (e) { console.error("❌ Error initNotifications:", e); }

    try {
        console.log("🚀 Inicializando ScheduleManager...");
        ScheduleManager.init();
    } catch (e) { console.error("❌ Error ScheduleManager:", e); }

    try {
        ToastService.init();
    } catch (e) { console.error("❌ Error ToastService:", e); }

    try {
        NetworkMonitor.init();
    } catch (e) { console.error("❌ Error NetworkMonitor:", e); }

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
    } else {
        // Éxito: Forzar actualización de UI si tenemos el usuario
        if (result.user) {
            handleAuthState(result.user);
        }
        // Si no hay usuario en el result, esperamos al listener
    }
});

// Iniciar Firebase
initializeFirebase(handleAuthState);
