/**
 * ClinicContext.js
 * Contexto de clínica activa (Modelo A — multitenancy).
 */

import { db, collection, getDocs, doc, getDoc } from '../firebase.js';
import {
    DEFAULT_CLINIC_ID,
    ACTIVE_CLINIC_STORAGE_KEY,
    CLINICS_COLLECTION,
    LEGACY_SETTINGS_DOC,
    isSaasMulticlinicEnabled
} from './clinicConstants.js';
import { AuthManager } from '../managers/AuthManager.js';

export const ClinicContext = {
    activeClinicId: null,
    activeClinic: null,
    _clinicsCache: null,
    _subscribers: [],

    /**
     * Resuelve la clínica del usuario staff (no platform_support).
     */
    getUserClinicId() {
        return AuthManager.currentUser?.clinicId || DEFAULT_CLINIC_ID;
    },

    /**
     * ¿Debe elegir clínica tras login?
     */
    needsClinicPicker() {
        if (!isSaasMulticlinicEnabled()) return false;
        return AuthManager.isPlatformSupport() && !this.getStoredClinicId();
    },

    getStoredClinicId() {
        try {
            return sessionStorage.getItem(ACTIVE_CLINIC_STORAGE_KEY) || null;
        } catch {
            return null;
        }
    },

    /**
     * Inicializa contexto tras AuthManager.initUser.
     * Staff → clinicId fijo; support → sessionStorage o pendiente selector.
     */
    async init() {
        if (!isSaasMulticlinicEnabled()) {
            this.activeClinicId = DEFAULT_CLINIC_ID;
            this.activeClinic = { id: DEFAULT_CLINIC_ID, name: 'Centro Parláre', status: 'active' };
            return this.activeClinicId;
        }

        if (AuthManager.isPlatformSupport()) {
            const stored = this.getStoredClinicId();
            if (stored) {
                await this.setActiveClinic(stored, { persist: false });
            } else {
                this.activeClinicId = null;
                this.activeClinic = null;
            }
            return this.activeClinicId;
        }

        const clinicId = this.getUserClinicId();
        await this.setActiveClinic(clinicId, { persist: false });
        return this.activeClinicId;
    },

    async setActiveClinic(clinicId, { persist = true } = {}) {
        if (!clinicId) {
            this.activeClinicId = null;
            this.activeClinic = null;
            this._notify();
            return null;
        }

        this.activeClinicId = clinicId;
        this.activeClinic = await this._loadClinicDoc(clinicId);

        if (persist && AuthManager.isPlatformSupport()) {
            try {
                sessionStorage.setItem(ACTIVE_CLINIC_STORAGE_KEY, clinicId);
            } catch { /* ignore */ }
        }

        this._notify();
        return this.activeClinicId;
    },

    clear() {
        this.activeClinicId = null;
        this.activeClinic = null;
        this._clinicsCache = null;
        try {
            sessionStorage.removeItem(ACTIVE_CLINIC_STORAGE_KEY);
        } catch { /* ignore */ }
        this._notify();
    },

    getActiveClinicId() {
        if (!isSaasMulticlinicEnabled()) return null;
        return this.activeClinicId || (AuthManager.isPlatformSupport() ? null : DEFAULT_CLINIC_ID);
    },

    getActiveClinicName() {
        return this.activeClinic?.name || 'Centro Parláre';
    },

    isSupportMode() {
        return isSaasMulticlinicEnabled() && AuthManager.isPlatformSupport() && !!this.activeClinicId;
    },

    subscribe(callback) {
        this._subscribers.push(callback);
        if (this.activeClinicId) {
            callback(this.activeClinicId, this.activeClinic);
        }
        return () => {
            this._subscribers = this._subscribers.filter((cb) => cb !== callback);
        };
    },

    _notify() {
        const id = this.activeClinicId;
        const clinic = this.activeClinic;
        this._subscribers.forEach((cb) => {
            try {
                cb(id, clinic);
            } catch (e) {
                console.error('ClinicContext subscriber error:', e);
            }
        });
    },

    /**
     * Lista clínicas activas para el selector (platform_support).
     */
    async listClinics() {
        if (this._clinicsCache) return this._clinicsCache;

        try {
            const snap = await getDocs(collection(db, CLINICS_COLLECTION));
            const list = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((c) => c.status !== 'disabled')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            if (list.length > 0) {
                this._clinicsCache = list;
                return list;
            }
        } catch (e) {
            console.warn('ClinicContext: no se pudo leer colección clinics, usando fallback.', e);
        }

        // Fallback hasta que exista el doc en Firestore (Fase 0 bootstrap)
        this._clinicsCache = [{
            id: DEFAULT_CLINIC_ID,
            name: 'Centro Parláre',
            status: 'active',
            slug: DEFAULT_CLINIC_ID
        }];
        return this._clinicsCache;
    },

    async _loadClinicDoc(clinicId) {
        try {
            const snap = await getDoc(doc(db, CLINICS_COLLECTION, clinicId));
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
        } catch (e) {
            console.warn(`ClinicContext: error cargando clinics/${clinicId}`, e);
        }

        if (clinicId === DEFAULT_CLINIC_ID) {
            return {
                id: DEFAULT_CLINIC_ID,
                name: 'Centro Parláre',
                status: 'active',
                slug: DEFAULT_CLINIC_ID
            };
        }
        return { id: clinicId, name: clinicId, status: 'active' };
    },

    /**
     * Ruta de settings por clínica. Fallback a clinicConfig legacy para Parláre.
     */
    getSettingsDocPath(clinicId = this.getActiveClinicId()) {
        const id = clinicId || DEFAULT_CLINIC_ID;
        if (id === DEFAULT_CLINIC_ID) {
            return `settings/${DEFAULT_CLINIC_ID}`;
        }
        return `settings/${id}`;
    },

    getLegacySettingsDocPath() {
        return LEGACY_SETTINGS_DOC;
    }
};
