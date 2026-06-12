/**
 * NetworkMonitor.js
 * Servicio para monitorear el estado de la conexión a internet
 */

import { SyncStatus } from './SyncStatus.js';
import { ToastService } from '../utils/ToastService.js';

export const NetworkMonitor = {
    isOnline: navigator.onLine,

    /**
     * Inicializa los listeners de red
     */
    init() {
        console.log('📡 Inicializando NetworkMonitor...');

        window.addEventListener('online', () => {
            console.log('📡 Conexión restaurada');
            this.isOnline = true;
            SyncStatus.setOnline();
            ToastService.success("Conexión a internet restaurada");
        });

        window.addEventListener('offline', () => {
            console.log('📡 Conexión perdida');
            this.isOnline = false;
            SyncStatus.setOffline();
            ToastService.error("Sin conexión a internet. Los cambios no se guardarán en Excel hasta que vuelvas a conectarte.", 5000);
        });

        // Estado inicial
        if (!this.isOnline) {
            SyncStatus.setOffline();
        } else {
            SyncStatus.setOnline(); // Asegura estado inicial correcto
        }
    },

    /**
     * Verifica si hay conexión
     * @returns {boolean}
     */
    checkConnection() {
        return this.isOnline;
    }
};
