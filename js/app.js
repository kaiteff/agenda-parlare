// app.js - Punto de entrada principal de la aplicación
import { Logger } from './utils/Logger.js';
import { initializeFirebase, loginUser, logoutUser } from './firebase.js';
import { CalendarManager } from './modules/calendar/CalendarManager.js';
import { initNotifications } from './notifications.js';
import { PatientManager } from './managers/PatientManager.js';
import { AuthManager } from './managers/AuthManager.js';
import { ScheduleManager } from './managers/ScheduleManager.js';
import { ModalService } from './utils/ModalService.js';
import { ToastService } from './utils/ToastService.js';
import { NetworkMonitor } from './services/NetworkMonitor.js';
import { Header } from './components/Header.js?v=2';
import { GoogleAuthService } from './services/google/GoogleAuthService.js';
import { SupportVault } from './modules/support/SupportVault.js';
import { WhatsAppDashboard } from './components/WhatsAppDashboard.js';
import { ReceptionControl } from './modules/reception/ReceptionControl.js';

const log = Logger.create('App');

// Referencias DOM
const loginContainer = document.getElementById('loginContainer');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

// Inicializar aplicación
log.info("Iniciando Agenda Parlare...");

// Manejar estado de autenticación
async function handleAuthState(user) {
    if (user) {
        const userData = await AuthManager.initUser(user);

        if (!userData) {
            log.error("Usuario no autorizado");
            loginError.textContent = "Usuario no autorizado para acceder al sistema.";
            loginError.classList.remove('hidden');
            await logoutUser();
            return;
        }

        log.success(`Usuario autenticado: ${userData.displayName} (${userData.role})`);

        loginContainer.classList.add('hidden');
        appContent.classList.remove('hidden');

        Header.init();
        initializeModules();
    } else {
        log.info("Usuario no autenticado");
        AuthManager.clear();

        loginContainer.classList.remove('hidden');
        appContent.classList.add('hidden');
        loginForm.reset();
        loginError.classList.add('hidden');
    }
}

let modulesInitialized = false;

async function initializeModules() {
    if (modulesInitialized) return;
    modulesInitialized = true;

    log.group('Inicializando Módulos', { timestamp: new Date() });

    try {
        await Promise.all([
            initModule('PatientManager', () => PatientManager.init()),
            initModule('Calendar', () => CalendarManager.initCalendar()),
            initModule('Notifications', () => initNotifications()),
            initModule('ScheduleManager', () => ScheduleManager.init()),
            initModule('WhatsAppDashboard', () => WhatsAppDashboard.render()),
            initModule('ToastService', () => ToastService.init()),
            initModule('NetworkMonitor', () => NetworkMonitor.init())
        ]);

        // Support Vault - siempre init, controla visibilidad internamente
        await initModule('SupportVault', () => SupportVault.init());
        
        // Control de Recepción - Maestro
        await initModule('ReceptionControl', () => ReceptionControl.init());

        // Google Auth (async pero no bloqueante)
        GoogleAuthService.init()
            .then(() => log.success('GoogleAuthService listo'))
            .catch(e => log.error('GoogleAuthService error:', e));

        log.success("Todos los módulos inicializados");
    } catch (error) {
        log.error("Error crítico inicializando módulos", error);
    }

    console.groupEnd();
}

async function initModule(name, fn) {
    try {
        await fn();
        log.info(`${name} OK`);
    } catch (e) {
        log.error(`Error en ${name}:`, e);
    }
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
        if (result.user) handleAuthState(result.user);
    }
});

initializeFirebase(handleAuthState);
