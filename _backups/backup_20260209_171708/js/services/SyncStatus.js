/**
 * SyncStatus.js
 * Servicio para gestionar el estado de sincronización global
 */

export const SyncStatus = {
    // Estados posibles
    STATES: {
        IDLE: 'idle',
        SAVING: 'saving',
        SAVED: 'saved',
        ERROR: 'error',
        ONLINE: 'online',
        OFFLINE: 'offline'
    },

    currentState: 'idle',
    listeners: [],

    /**
     * Suscribirse a cambios de estado
     * @param {Function} callback (newState) => {}
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Emitir estado actual inmediatamente al suscribirse
        callback(this.currentState);
    },

    /**
     * Notificar a todos los listeners
     */
    _notify() {
        this.listeners.forEach(cb => cb(this.currentState));
    },

    /**
     * Establecer estado: GUARDANDO
     */
    setSaving() {
        this.currentState = this.STATES.SAVING;
        this._notify();
    },

    /**
     * Establecer estado: GUARDADO (éxito)
     * Vuelve a IDLE después de un tiempo
     */
    setSaved() {
        this.currentState = this.STATES.SAVED;
        this._notify();

        // Volver a estado neutro después de 3 segundos
        setTimeout(() => {
            if (this.currentState === this.STATES.SAVED) {
                this.currentState = this.STATES.IDLE;
                this._notify();
            }
        }, 3000);
    },

    /**
     * Establecer estado: ERROR
     */
    setError() {
        this.currentState = this.STATES.ERROR;
        this._notify();
    },

    /**
     * Establecer estado: ONLINE (Restaurado)
     */
    setOnline() {
        if (this.currentState === this.STATES.OFFLINE) {
            this.currentState = this.STATES.IDLE;
            this._notify();
        }
    },

    /**
     * Establecer estado: OFFLINE
     */
    setOffline() {
        this.currentState = this.STATES.OFFLINE;
        this._notify();
    },

    /**
     * Obtener el estado actual
     */
    getState() {
        return this.currentState;
    }
};
