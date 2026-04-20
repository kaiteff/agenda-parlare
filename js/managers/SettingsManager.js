/**
 * SettingsManager.js
 * Gestiona la configuración global de la clínica (Temas, Costos Base, etc.)
 */

import { db, doc, getDoc, setDoc, onSnapshot } from '../firebase.js';
import { AuthManager } from './AuthManager.js';

export const SettingsManager = {
    docPath: 'settings/clinicConfig',
    config: {
        themes: [],
        baseCosts: {}
    },
    subscribers: [],

    /**
     * Inicializa el manager y escucha cambios en tiempo real
     */
    async init() {
        console.log('⚙️ SettingsManager: Inicializando...');
        
        // Escuchar cambios en tiempo real
        onSnapshot(doc(db, this.docPath), (snapshot) => {
            if (snapshot.exists()) {
                this.config = snapshot.data();
                console.log('✅ SettingsManager: Configuración cargada', this.config);
                this._notify();
            } else {
                console.warn('⚠️ SettingsManager: No hay configuración en Firestore. Usando defaults.');
                this._createDefaultConfig();
            }
        });
    },

    /**
     * Suscribirse a cambios en la configuración
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.config);
    },

    _notify() {
        this.subscribers.forEach(cb => cb(this.config));
    },

    /**
     * Obtiene los temas filtrados por IDs (para pacientes)
     */
    getThemesByIds(ids = []) {
        if (!ids || ids.length === 0) return [];
        return (this.config.themes || []).filter(t => ids.includes(t.id));
    },

    /**
     * Guarda la configuración completa (Solo Admin)
     */
    async saveConfig(newConfig) {
        if (!AuthManager.isAdmin()) {
            throw new Error('No tienes permisos para modificar la configuración.');
        }

        try {
            await setDoc(doc(db, this.docPath), {
                ...this.config,
                ...newConfig,
                updatedAt: new Date().toISOString(),
                updatedBy: AuthManager.currentUser.uid
            });
            return { success: true };
        } catch (error) {
            console.error('❌ SettingsManager: Error al guardar config:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Crea una configuración inicial si no existe
     */
    async _createDefaultConfig() {
        const defaults = {
            themes: [
                { id: 'tema_r', name: 'Lenguaje: R', subthemes: ['Punta de lengua', 'Vibración', 'Palabras directas'] },
                { id: 'tema_soplo', name: 'Ejercicios de Soplo', subthemes: ['Control de aire', 'Potencia', 'Dirección'] }
            ],
            baseCosts: {
                diana: { cost: 500, fee: 250 },
                sam: { cost: 500, fee: 250 },
                vero: { cost: 500, fee: 250 }
            }
        };
        await this.saveConfig(defaults);
    }
};
