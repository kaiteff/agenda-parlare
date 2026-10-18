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
import { LoaderService } from './utils/LoaderService.js';

import { NetworkMonitor } from './services/NetworkMonitor.js';
import { Header } from './components/Header.js';
import { GoogleAuthService } from './services/google/GoogleAuthService.js';
import { SupportVault } from './modules/support/SupportVault.js';
import { WhatsAppDashboard } from './components/WhatsAppDashboard.js';
import { ReceptionControl } from './modules/reception/ReceptionControl.js';
import { ComponentManager } from './components/ComponentManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { NewFeatureAlert } from './utils/NewFeatureAlert.js';
import { WaitlistCopilotPanel } from './components/WaitlistCopilotPanel.js';
import { WaitlistCopilotService } from './services/WaitlistCopilotService.js';
import { AppLifecycle } from './services/AppLifecycle.js';
import { ClinicContext } from './core/ClinicContext.js';
import { ClinicSelector } from './components/ClinicSelector.js';
import { isSaasMulticlinicEnabled } from './core/clinicConstants.js';
import { initPhoneLandscapeWatch } from './utils/viewport.js';

const log = Logger.create('App');

// Celular landscape: clase en <html> + re-render agenda al girar
initPhoneLandscapeWatch(() => {
    if (typeof window !== 'undefined' && typeof window.renderCalendar === 'function') {
        window.renderCalendar();
    }
});

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
        if (user.uid === lastAuthenticatedUid && modulesInitialized) {
            return;
        }

        const userData = await AuthManager.initUser(user);

        if (!userData) {
            log.error("Usuario no autorizado");
            loginError.textContent = "Usuario no autorizado para acceder al sistema.";
            loginError.classList.remove('hidden');
            await logoutUser();
            return;
        }

        if (userData.role === 'platform_support' && !isSaasMulticlinicEnabled()) {
            log.warn('Login Support rechazado: SaaS multiclínica desactivado');
            loginError.textContent = 'El modo multiclínica aún no está activo en esta versión. Usa la agenda estándar de tu clínica.';
            loginError.classList.remove('hidden');
            await logoutUser();
            return;
        }

        if (!isSaasMulticlinicEnabled()) {
            await enterAppAfterClinic(userData);
            return;
        }

        await ClinicContext.init();

        if (ClinicContext.needsClinicPicker()) {
            loginContainer.classList.add('hidden');
            appContent.classList.add('hidden');
            await ClinicSelector.show(() => enterAppAfterClinic(userData));
            return;
        }

        if (!ClinicContext.getActiveClinicId()) {
            log.error('Sin clínica activa');
            loginError.textContent = 'No se pudo determinar la clínica. Contacta a soporte.';
            loginError.classList.remove('hidden');
            await logoutUser();
            return;
        }

        await enterAppAfterClinic(userData);
    } else {
        log.info("Usuario no autenticado");
        AppLifecycle.shutdown();
        modulesInitialized = false;
        headerInitialized = false;
        lastAuthenticatedUid = null;
        AuthManager.clear();
        if (isSaasMulticlinicEnabled()) {
            ClinicContext.clear();
            ClinicSelector.hide();
        }

        loginContainer.classList.remove('hidden');
        appContent.classList.add('hidden');
        loginForm.reset();
        loginError.classList.add('hidden');
    }
}

let modulesInitialized = false;
let headerInitialized = false;
let lastAuthenticatedUid = null;

async function enterAppAfterClinic(userData) {
    const uid = userData?.uid || AuthManager.currentUser?.uid;
    if (uid === lastAuthenticatedUid && modulesInitialized) {
        return;
    }

    lastAuthenticatedUid = uid;
    log.success(
        `Usuario: ${userData.displayName} (${userData.role}) — clínica: ${ClinicContext.getActiveClinicName()} — agenda: ${AuthManager.getSelectedTherapist()}`
    );

    loginContainer.classList.add('hidden');
    ClinicSelector.hide();
    appContent.classList.remove('hidden');

    const { StaffManager } = await import('./managers/StaffManager.js');
    await StaffManager.loadTherapists();

    if (!headerInitialized) {
        Header.init();
        headerInitialized = true;
    } else {
        Header.render();
    }
    initializeModules();
}

async function initializeModules() {
    if (modulesInitialized) return;
    modulesInitialized = true;

    // Inyectar toda la UI dinámica (Modales, Overlays, etc)
    await ComponentManager.init();

    log.group('Inicializando Módulos', { timestamp: new Date() });

    try {
        await Promise.all([
            initModule('PatientManager', () => PatientManager.init()),
            initModule('Calendar', () => CalendarManager.initCalendar()),
            initModule('Notifications', () => initNotifications()),
            initModule('ScheduleManager', () => ScheduleManager.init()),
            initModule('WhatsAppDashboard', () => WhatsAppDashboard.render()),
            initModule('ToastService', () => ToastService.init()),
            initModule('LoaderService', () => LoaderService.init()),
            initModule('NetworkMonitor', () => NetworkMonitor.init()),
            initModule('SettingsManager', () => SettingsManager.init())
        ]);

        // Support Vault - siempre init, controla visibilidad internamente
        await initModule('SupportVault', () => SupportVault.init());
        
        // Control de Recepción - Maestro
        await initModule('ReceptionControl', () => ReceptionControl.init());

        // Copiloto Colaborativo (Fase B) — banner + glow (suscripción en WaitlistCopilotPanel)
        await initModule('WaitlistCopilotPanel', () => WaitlistCopilotPanel.init());

        // Google Auth (async pero no bloqueante)
        GoogleAuthService.init()
            .then(() => log.success('GoogleAuthService listo'))
            .catch(e => log.error('GoogleAuthService error:', e));

        log.success("Todos los módulos inicializados");
        NewFeatureAlert.init(); // <-- NUEVO: Pop-up de bienvenida premium
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
    }
    // Éxito: onAuthStateChanged en firebase.js llama handleAuthState (evita doble init).
});

initializeFirebase(handleAuthState);
