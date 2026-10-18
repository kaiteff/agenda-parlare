/**
 * SettingsManager.js
 * Gestiona la configuración global de la clínica (Temas, Costos Base, integraciones Google).
 * Modelo A: un documento por clinicId (`settings/centro_parlare`, etc.).
 */

import { db, doc, getDoc, setDoc, onSnapshot } from '../firebase.js';
import { AuthManager } from './AuthManager.js';
import { getDefaultStaffPermissions } from '../config/staffPermissions.js';
import { ClinicContext } from '../core/ClinicContext.js';
import {
    DEFAULT_CLINIC_ID,
    CENTRO_PARLARE_SHEET_IDS,
    DEFAULT_SHEET_TAB,
    LEGACY_SETTINGS_DOC,
    isSaasMulticlinicEnabled
} from '../core/clinicConstants.js';

export const SettingsManager = {
    config: {
        themes: [],
        baseCosts: {},
        integrations: {}
    },
    subscribers: [],
    _settingsUnsub: null,
    _clinicUnsub: null,
    _boundClinicId: null,

    get docPath() {
        if (!isSaasMulticlinicEnabled()) return LEGACY_SETTINGS_DOC;
        return ClinicContext.getSettingsDocPath();
    },

    /**
     * Inicializa el manager y escucha cambios en tiempo real
     */
    async init() {
        console.log('⚙️ SettingsManager: Inicializando...');
        if (!isSaasMulticlinicEnabled()) {
            return this._initLegacy();
        }
        if (this._clinicUnsub) return;

        this._clinicUnsub = ClinicContext.subscribe((clinicId) => {
            if (clinicId && clinicId !== this._boundClinicId) {
                this._bindSnapshot(clinicId);
            }
        });

        const clinicId = ClinicContext.getActiveClinicId();
        if (clinicId) {
            this._bindSnapshot(clinicId);
        }
    },

    /** Ruta producción Parláre — solo `settings/clinicConfig` (pre-SaaS). */
    async _initLegacy() {
        if (this._settingsUnsub) return;

        this._settingsUnsub = onSnapshot(doc(db, LEGACY_SETTINGS_DOC), (snapshot) => {
            if (snapshot.exists()) {
                this.config = snapshot.data();

                const needsMigration = this.config.themes?.some(
                    (t) => t.subthemes?.length > 0 && typeof t.subthemes[0] === 'string'
                );

                if (needsMigration) {
                    console.log('⚠️ SettingsManager: Ejecutando migración forzada para estructura 3D de temas...');
                    this._createDefaultConfigLegacy();
                    return;
                }

                if (!this.config.themes?.length) {
                    console.log('🔄 Restaurando temas por defecto (Estaban vacíos)...');
                    this._createDefaultConfigLegacy();
                    return;
                }

                console.log('✅ SettingsManager: Configuración cargada', this.config);
                if (!this.config.staffPermissions) {
                    this.config.staffPermissions = getDefaultStaffPermissions();
                }
                this._notifyLegacy();
            } else {
                console.warn('⚠️ SettingsManager: No hay configuración en Firestore. Usando defaults.');
                this._createDefaultConfigLegacy();
            }
        });
    },

    _notifyLegacy() {
        this.subscribers.forEach((cb) => cb(this.config));
    },

    async _createDefaultConfigLegacy() {
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

    _bindSnapshot(clinicId) {
        if (this._settingsUnsub) {
            this._settingsUnsub();
            this._settingsUnsub = null;
        }
        this._boundClinicId = clinicId;

        const path = ClinicContext.getSettingsDocPath(clinicId);
        console.log(`⚙️ SettingsManager: escuchando ${path}`);

        this._settingsUnsub = onSnapshot(doc(db, path), async (snapshot) => {
            if (snapshot.exists()) {
                this.config = snapshot.data();
                await this._afterConfigLoaded();
            } else if (clinicId === DEFAULT_CLINIC_ID) {
                await this._bootstrapFromLegacy();
            } else {
                console.warn(`⚙️ SettingsManager: sin config en ${path}. Usando defaults.`);
                this._applyDefaultIntegrations();
                this._notify();
            }
        });
    },

    async _bootstrapFromLegacy() {
        const legacyPath = ClinicContext.getLegacySettingsDocPath();
        try {
            const legacySnap = await getDoc(doc(db, legacyPath));
            if (legacySnap.exists()) {
                const data = legacySnap.data();
                this.config = {
                    ...data,
                    integrations: data.integrations || this._defaultIntegrations()
                };
                console.log('⚙️ SettingsManager: cargado desde clinicConfig legacy');
                await this._afterConfigLoaded();
                return;
            }
        } catch (e) {
            console.warn('SettingsManager: error leyendo legacy config', e);
        }
        console.warn('⚙️ SettingsManager: No hay configuración. Usando defaults.');
        await this._createDefaultConfig();
    },

    async _afterConfigLoaded() {
        const needsMigration = this.config.themes?.some(
            (t) => t.subthemes?.length > 0 && typeof t.subthemes[0] === 'string'
        );

        if (needsMigration) {
            console.log('⚙️ SettingsManager: migración temas 3D...');
            await this._createDefaultConfig();
            return;
        }

        if (!this.config.themes?.length) {
            console.log('🔄 Restaurando temas por defecto...');
            await this._createDefaultConfig();
            return;
        }

                if (!this.config.integrations?.google?.sheets) {
            this._applyDefaultIntegrations();
        }

        if (!this.config.staffPermissions) {
            this.config.staffPermissions = getDefaultStaffPermissions();
        }

        console.log('✅ SettingsManager: Configuración cargada', this.config);
        this._notify();
    },

    _defaultIntegrations() {
        return {
            google: {
                sheets: { ...CENTRO_PARLARE_SHEET_IDS },
                targetSheetName: DEFAULT_SHEET_TAB
            }
        };
    },

    _applyDefaultIntegrations() {
        if (!this.config.integrations) this.config.integrations = {};
        if (!this.config.integrations.google?.sheets) {
            this.config.integrations = {
                ...this.config.integrations,
                ...this._defaultIntegrations()
            };
        }
    },

    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.config);
    },

    _notify() {
        this.subscribers.forEach((cb) => cb(this.config));
        if (!isSaasMulticlinicEnabled()) return;
        import('../services/google/SheetService.js')
            .then(({ SheetService }) => SheetService.applyIntegrationsFromSettings(this.config))
            .catch(() => {});
    },

    getThemesByIds(ids = []) {
        if (!ids || ids.length === 0) return [];
        return (this.config.themes || []).filter((t) => ids.includes(t.id));
    },

    async saveConfig(newConfig) {
        if (!AuthManager.canManageClinicSettings()) {
            throw new Error('No tienes permisos para modificar la configuración.');
        }

        const path = this.docPath;
        try {
            const payload = {
                ...this.config,
                ...newConfig,
                updatedAt: new Date().toISOString(),
                updatedBy: AuthManager.currentUser.uid
            };
            if (isSaasMulticlinicEnabled()) {
                payload.clinicId = ClinicContext.getActiveClinicId();
            }
            await setDoc(doc(db, path), payload);
            return { success: true };
        } catch (error) {
            console.error('❌ SettingsManager: Error al guardar config:', error);
            return { success: false, error: error.message };
        }
    },

    async _createDefaultConfig() {
        const defaults = {
            clinicId: ClinicContext.getActiveClinicId() || DEFAULT_CLINIC_ID,
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
            },
            integrations: this._defaultIntegrations()
        };
        await this.saveConfig(defaults);
    },

    shutdown() {
        if (this._settingsUnsub) {
            this._settingsUnsub();
            this._settingsUnsub = null;
        }
        if (this._clinicUnsub) {
            this._clinicUnsub();
            this._clinicUnsub = null;
        }
        this._boundClinicId = null;
    }
};
