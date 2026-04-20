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

                // MIGRATION: Force update if themes are empty, or has old themes, or old costs
                const hasOldThemes = this.config.themes && this.config.themes.some(t => t.id === 'tema_r' || t.id === 'tema_soplo');
                const hasNoThemes = !this.config.themes || this.config.themes.length === 0;
                const hasOldCosts = this.config.baseCosts && this.config.baseCosts.vero && this.config.baseCosts.vero.fee !== 400;

                if (hasOldThemes || hasNoThemes || hasOldCosts) {
                    console.log('⚠️ SettingsManager: Ejecutando migración forzada para nuevos temas...');
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
                { id: 'tema_articulacion', name: 'Articulación', subthemes: ['Punto y modo de articulación', 'Vibración múltiple', 'Discriminación fonética'] },
                { id: 'tema_memoria', name: 'Memoria Auditiva Verbal', subthemes: ['Retención de dígitos', 'Repetición de pseudopalabras', 'Recuerdo de instrucciones'] },
                { id: 'tema_comprension', name: 'Comprensión de Lenguaje', subthemes: ['Órdenes simples', 'Órdenes complejas', 'Preguntas WH'] },
                { id: 'tema_morfosintaxis', name: 'Morfosintaxis', subthemes: ['Estructuración de oraciones', 'Uso de nexos', 'Tiempos verbales'] },
                { id: 'tema_pragmatica', name: 'Pragmática de Lenguaje', subthemes: ['Toma de turnos', 'Mantenimiento del tópico', 'Contacto visual'] }
            ],
            baseCosts: {
                diana: { cost: 800, fee: 250 },
                sam: { cost: 800, fee: 250 },
                vero: { cost: 800, fee: 400 }
            }
        };
        await this.saveConfig(defaults);
    }
};
