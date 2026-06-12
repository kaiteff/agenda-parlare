/**
 * AppLifecycle.js — Apaga listeners Firestore al cerrar sesión.
 * Sin esto, `modulesInitialized` bloquea re-init y los snapshots siguen activos.
 */

import { CalendarData } from '../modules/calendar/CalendarData.js';
import { PatientManager } from '../managers/PatientManager.js';
import { WaitlistCopilotService } from './WaitlistCopilotService.js';
import { QuietHoursCopilotService } from './QuietHoursCopilotService.js';
import { WaitlistCopilotPanel } from '../components/WaitlistCopilotPanel.js';
import { Header } from '../components/Header.js';
import { SettingsManager } from '../managers/SettingsManager.js';
import { shutdownNotifications } from '../notifications.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.create('AppLifecycle');

export const AppLifecycle = {
    shutdown() {
        log.info('Apagando listeners (logout)...');
        try { WaitlistCopilotPanel.destroy?.(); } catch (e) { log.warn('Copiloto panel:', e); }
        try { WaitlistCopilotService.stop?.(); } catch (e) { log.warn('Copiloto service:', e); }
        try { QuietHoursCopilotService.stop?.(); } catch (e) { log.warn('Quiet hours:', e); }
        try { PatientManager._teardownListeners?.(); } catch (e) { log.warn('PatientManager:', e); }
        try { CalendarData.shutdown?.(); } catch (e) { log.warn('CalendarData:', e); }
        try { Header.shutdown?.(); } catch (e) { log.warn('Header:', e); }
        try { SettingsManager.shutdown?.(); } catch (e) { log.warn('Settings:', e); }
        try { shutdownNotifications?.(); } catch (e) { log.warn('Notifications:', e); }
        log.success('Listeners apagados');
    }
};
