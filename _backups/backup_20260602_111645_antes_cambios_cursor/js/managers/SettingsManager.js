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
    _settingsUnsub: null,

    /**
     * Inicializa el manager y escucha cambios en tiempo real
     */
    async init() {
        console.log('⚙️ SettingsManager: Inicializando...');
        if (this._settingsUnsub) return;

        // Escuchar cambios en tiempo real
        this._settingsUnsub = onSnapshot(doc(db, this.docPath), (snapshot) => {
            if (snapshot.exists()) {
                this.config = snapshot.data();

                // MIGRATION: Force update if themes are still in string-array format
                const needsMigration = this.config.themes && this.config.themes.some(t => t.subthemes && t.subthemes.length > 0 && typeof t.subthemes[0] === 'string');

                if (needsMigration) {
                    console.log('⚠️ SettingsManager: Ejecutando migración forzada para estructura 3D de temas...');
                    this._createDefaultConfig();
                    return;
                }

                // EMERGENCY FIX: Si la lista de temas está vacía, restaurar defaults
                if (!this.config.themes || this.config.themes.length === 0) {
                    console.log('🔄 Restaurando temas por defecto (Estaban vacíos)...');
                    this._createDefaultConfig();
                    return;
                }

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
                { 
                    id: 'tema_articulacion', 
                    name: 'Articulación', 
                    subthemes: [
                        { name: 'Punto y modo de articulación', items: [] },
                        { name: 'Vibración múltiple', items: [] },
                        { name: 'Discriminación fonética', items: [] }
                    ] 
                },
                { 
                    id: 'tema_memoria', 
                    name: 'Memoria Auditiva Verbal', 
                    subthemes: [
                        { name: 'Retención de dígitos', items: [] },
                        { name: 'Repetición de pseudopalabras', items: [] },
                        { name: 'Recuerdo de instrucciones', items: [] }
                    ] 
                },
                { 
                    id: 'tema_comprension', 
                    name: 'Comprensión de Lenguaje', 
                    subthemes: [
                        { name: 'Órdenes simples', items: [] },
                        { name: 'Órdenes complejas', items: [] },
                        { name: 'Preguntas WH', items: [] }
                    ] 
                },
                { 
                    id: 'tema_morfosintaxis', 
                    name: 'Morfosintaxis', 
                    subthemes: [
                        { name: 'Estructuración de oraciones', items: [] },
                        { name: 'Uso de nexos', items: [] },
                        { name: 'Tiempos verbales', items: [] }
                    ] 
                },
                { 
                    id: 'tema_pragmatica', 
                    name: 'Pragmática de Lenguaje', 
                    subthemes: [
                        { name: 'Toma de turnos', items: [] },
                        { name: 'Mantenimiento del tópico', items: [] },
                        { name: 'Contacto visual', items: [] }
                    ] 
                },
                { 
                    id: 'tema_autismo', 
                    name: 'Autismo', 
                    subthemes: [
                        { name: 'Habilidades Sociales', items: [] },
                        { name: 'Flexibilidad Cognitiva', items: [] },
                        { name: 'Comunicación Funcional', items: [] }
                    ] 
                }
            ],
            baseCosts: {
                diana: { cost: 800, fee: 250, professionalLicense: '', graduationInstitution: '' },
                sam: { cost: 800, fee: 250, professionalLicense: '', graduationInstitution: '' },
                vero: { cost: 800, fee: 400, professionalLicense: '', graduationInstitution: '' }
            }
        };
        await this.saveConfig(defaults);
    },

    shutdown() {
        if (this._settingsUnsub) {
            this._settingsUnsub();
            this._settingsUnsub = null;
        }
    }
};
