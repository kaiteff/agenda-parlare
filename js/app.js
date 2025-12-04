// app.js - Punto de entrada principal de la aplicación
import { initializeFirebase, loginUser, logoutUser } from './firebase.js';
import { initCalendar } from './calendar.js';
import { initNotifications } from './notifications.js';
// import { initPatients } from './patients.js'; // OLD - Replaced by PatientManager
import { PatientManager } from './managers/PatientManager.js';
import { AuthManager } from './managers/AuthManager.js';
import { ScheduleManager } from './managers/ScheduleManager.js';
// import { runMigration } from './migrate_data.js';

// Inicialización
// document.addEventListener('DOMContentLoaded', async () => {
// Ejecutar migración de datos (solo una vez)
// runMigration().catch(console.error);
// });

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

        // Actualizar UI de usuario (nombre, rol, selector)
        updateUserUI();

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

function updateUserUI() {
    // 1. Mostrar información del usuario
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    ${AuthManager.getDisplayName().charAt(0)}
                </div>
                <div>
                    <div class="font-bold text-gray-800">${AuthManager.getDisplayName()}</div>
                    <div class="text-xs text-gray-500 capitalize">${AuthManager.getRole()}</div>
                </div>
            </div>
        `;
    }

    // 2. Manejar selector de terapeuta
    const selectorContainer = document.getElementById('therapistSelectorContainer');
    const selector = document.getElementById('therapistFilter');

    if (selectorContainer && selector) {
        if (AuthManager.can('switch_therapist_view')) {
            selectorContainer.classList.remove('hidden');
            selector.value = AuthManager.getSelectedTherapist();

            // Asignar evento de cambio
            selector.onchange = (e) => {
                const newTherapist = e.target.value;
                AuthManager.setSelectedTherapist(newTherapist);

                // Recargar lista de pacientes si existe la función
                if (typeof window.renderPatientsList === 'function') {
                    console.log("🔄 Recargando lista de pacientes (OLD)...");
                    window.renderPatientsList();
                } else if (window.PatientManager) {
                    console.log("🔄 Recargando lista de pacientes (NEW)...");
                    window.PatientManager.api.refreshList();
                }

                // Recargar calendario
                if (typeof renderCalendar === 'function') {
                    console.log("🔄 Recargando calendario...");
                    renderCalendar();
                }
            };
        } else {
            selectorContainer.classList.add('hidden');
        }
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
        initCalendar();
    } catch (e) { console.error("❌ Error initCalendar:", e); }

    try {
        console.log("🚀 Inicializando Notifications...");
        initNotifications();
    } catch (e) { console.error("❌ Error initNotifications:", e); }

    try {
        console.log("🚀 Inicializando ScheduleManager...");
        ScheduleManager.init();
    } catch (e) { console.error("❌ Error ScheduleManager:", e); }

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

logoutBtn.addEventListener('click', async () => {
    if (confirm("¿Cerrar sesión?")) {
        await logoutUser();
    }
});

// Iniciar Firebase
initializeFirebase(handleAuthState);
