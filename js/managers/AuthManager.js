/**
 * AuthManager.js
 * Gestión de autenticación y permisos de usuario
 */

import { db } from '../firebase.js'; // Importar db principal
import {
    doc,
    getDoc,
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { SettingsManager } from './SettingsManager.js';
import { isSaasMulticlinicEnabled } from '../core/clinicConstants.js';
import {
    CLINIC_OWNER_EMAIL,
    ROLE_BASE_PERMISSIONS,
    computeEffectivePermissions,
    isClinicOwnerEmail
} from '../config/staffPermissions.js';

// Roles y Permisos (etiquetas UI; permisos reales en staffPermissions.js + clinicConfig)
const ROLES = {
    admin: {
        label: 'Administrador',
        permissions: ROLE_BASE_PERMISSIONS.admin
    },
    therapist: {
        label: 'Terapeuta',
        permissions: ROLE_BASE_PERMISSIONS.therapist
    },
    receptionist: {
        label: 'Recepción',
        permissions: ROLE_BASE_PERMISSIONS.receptionist
    },
    platform_support: {
        label: 'Parláre Support',
        permissions: ROLE_BASE_PERMISSIONS.platform_support
    }
};

let _auth = null;

function getAuthInstance() {
    if (!_auth && db && db.app) {
        _auth = getAuth(db.app);
    }
    return _auth || getAuth();
}

function getDbInstance() {
    return db;
}

// Mapeo manual de seguridad eliminado. Los roles provienen de Firebase Custom Claims (request.auth.token.role)

export const AuthManager = {
    // ... (anterior)
    
    /**
     * Obtiene los costos por defecto de un terapeuta (Dinámico desde SettingsManager)
     */
    getTherapistDefaults(therapistId) {
        const id = (therapistId || 'diana').toLowerCase();
        
        // 1. Intentar obtener desde SettingsManager (Configuración viva del panel)
        const config = SettingsManager.config?.baseCosts?.[id];
        if (config) {
            return {
                cost: config.cost || 800,
                clinicFee: config.fee || 250
            };
        }

        // 2. Fallback si no hay configuración en el panel
        if (id === 'vero') return { cost: 800, clinicFee: 400 };
        return { cost: 800, clinicFee: 250 };
    },
    currentUser: null,
    selectedTherapist: null, // Para admins: qué calendario están viendo
    _initUserInFlight: null,
    _initUserUid: null,

    /**
     * Inicializa el listener de estado de autenticación
     */
    async init() {
        SettingsManager.subscribe(() => {
            if (this.currentUser) {
                this.refreshPermissions();
                window.dispatchEvent(new CustomEvent('parlare:permissions-changed'));
            }
        });

        return new Promise((resolve) => {
            try {
                const auth = getAuthInstance();
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        await this.initUser(user);
                    } else {
                        this.currentUser = null;
                        this.selectedTherapist = null;
                    }
                    resolve(this.currentUser);
                });
            } catch (error) {
                console.error("AuthManager Init Error:", error);
                resolve(null);
            }
        });
    },

    /**
     * Inicia sesión (Login)
     * Nota: app.js usa loginUser de firebase.js, pero mantenemos esto por utilidad
     */
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(getAuthInstance(), email, password);
            const user = await this.initUser(userCredential.user);
            return { success: true, user };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Cierra sesión
     */
    async logout() {
        try {
            await signOut(getAuthInstance());
            this.clear(); // Limpiar estado interno también
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Limpia el estado local del AuthManager
     * (Llamado por app.js al detectar desconexión)
     */
    clear() {
        this.currentUser = null;
        this.selectedTherapist = null;
        this._initUserUid = null;
        this._initUserInFlight = null;
        import('../core/ClinicContext.js').then(({ ClinicContext }) => ClinicContext.clear()).catch(() => {});
    },

    /**
     * Carga el perfil extendido del usuario desde Firestore
     */
    async initUser(firebaseUser) {
        const uid = firebaseUser?.uid;
        if (!uid) return null;

        if (this._initUserUid === uid && this.currentUser?.uid === uid) {
            return this.currentUser;
        }
        if (this._initUserInFlight) {
            return this._initUserInFlight;
        }

        this._initUserInFlight = this._initUserCore(firebaseUser);
        try {
            return await this._initUserInFlight;
        } finally {
            this._initUserInFlight = null;
            this._initUserUid = uid;
        }
    },

    async _initUserCore(firebaseUser) {
        try {
            console.log("👤 AuthManager: Inicializando usuario...", firebaseUser.uid);
            // 1. Obtener Custom Claims del token (forzamos refresh durante migración/desarrollo)
            const tokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = tokenResult.claims || {};
            
            // 2. Obtener datos extra desde Firestore si existen
            const firestoreData = await this.getUserData(firebaseUser.uid) || {};

            let userData = {
                ...firestoreData,
                role: claims.role || firestoreData.role || 'therapist', // Fallback seguro
                therapist: claims.therapist || firestoreData.therapist || 'diana',
                displayName: firestoreData.displayName || firebaseUser.displayName || 'Usuario',
                isFallback: !claims.role
            };

            if (claims.role) {
                console.log("✅ Perfil cargado desde Custom Claims:", claims.role);
            } else {
                console.warn('⚠️ Usuario sin Custom Claims asignados, usando fallback.');
            }

            this.currentUser = { ...firebaseUser, ...userData, effectiveClaims: claims };

            this.refreshPermissions();

            // Vista de agenda: quien tenga permiso ve «Todas» por defecto (o última elección en sesión)
            if (this.canViewAllAgenda()) {
                const saved = sessionStorage.getItem('parlare_admin_therapist_view');
                // Use StaffManager dynamically for allowed therapists, including 'all'
                const dynamicAllowed = window.StaffManager ? window.StaffManager.getTherapists().map(t => t.id) : ['diana', 'sam', 'vero'];
                const allowed = [...dynamicAllowed, 'all'];
                this.selectedTherapist = allowed.includes(saved) ? saved : 'all';
            } else if (this.currentUser.therapist && this.currentUser.therapist !== 'all') {
                this.selectedTherapist = this.currentUser.therapist;
            } else {
                this.selectedTherapist = window.StaffManager ? window.StaffManager.getTherapists()[0]?.id || 'diana' : 'diana';
            }

            return this.currentUser;

        } catch (error) {
            console.error('❌ CRITICAL: Error fatal al inicializar usuario:', error);
            // En caso de error catastrófico, devolver un usuario mínimo para no bloquear el login
            this.currentUser = {
                ...firebaseUser,
                role: 'admin',
                therapist: 'diana',
                error: error.message
            };
            return this.currentUser;
        }
    },

    /**
     * Obtiene datos del usuario de Firestore
     */
    async getUserData(uid) {
        try {
            const database = getDbInstance();
            if (!database) {
                console.error("❌ AuthManager: Base de datos no disponible.");
                return null;
            }

            // Usar doc importado del CDN que DEBE ser compatible con la instancia db
            const userRef = doc(database, "users", uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                return userDoc.data();
            } else {
                console.warn("⚠️ User profile document does not exist for UID:", uid);
                return null;
            }
        } catch (error) {
            // Log detallado del error de compatibilidad común
            if (error.message && error.message.includes('Expected first argument to collection()')) {
                console.error("❌ ERROR CRÍTICO DE COMPATIBILIDAD FIREBASE: Las instancias de SDK no coinciden.", error);
            } else {
                console.error("❌ Error getting user data:", error);
            }
            return null;
        }
    },

    refreshPermissions() {
        if (!this.currentUser) return;
        const staffPermissions = SettingsManager.config?.staffPermissions || {};
        this.currentUser.effectivePermissions = Array.from(
            computeEffectivePermissions(this.currentUser, staffPermissions)
        );
    },

    _getEffectivePermissionSet() {
        if (!this.currentUser) return new Set();
        if (!this.currentUser.effectivePermissions) {
            this.refreshPermissions();
        }
        return new Set(this.currentUser.effectivePermissions || []);
    },

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    can(permission) {
        if (!this.currentUser) return false;
        if (!this.currentUser.role) return true;

        return this._getEffectivePermissionSet().has(permission);
    },

    /**
     * Verifica si el usuario tiene permitido crear/editar ausencias de una terapeuta específica
     */
    canManageBlockFor(therapistId) {
        if (!this.currentUser) return false;
        if (this.canViewAllAgenda()) return true;
        if (this.currentUser?.role === 'therapist') {
            const userTherapist = (this.currentUser.therapist || '').toLowerCase();
            const targetTherapist = (therapistId || '').toLowerCase();
            return userTherapist === targetTherapist;
        }
        return false;
    },

    /** Puede abrir el modal de vacaciones/ausencias (propia agenda o cualquiera si admin/recepción). */
    canOpenAbsenceModal() {
        if (!this.currentUser) return false;
        if (this.canViewAllAgenda()) return true;
        if (this.currentUser?.role === 'therapist') {
            const t = (this.currentUser.therapist || '').toLowerCase();
            return t && t !== 'all';
        }
        return false;
    },

    /**
     * Helpers de Roles
     */
    isAdmin() {
        return this.currentUser?.role === 'admin';
    },

    isClinicOwner() {
        return isClinicOwnerEmail(this.currentUser?.email);
    },

    canManageClinicSettings() {
        return this.can('manage_clinic_settings');
    },

    canManageStaffPermissions() {
        return this.can('manage_staff_permissions');
    },

    canViewClinicFinancials() {
        return this.can('view_clinic_financials');
    },

    canViewAllPatients() {
        return this.can('view_all_patients') || this.canViewAllAgenda();
    },

    isPlatformSupport() {
        return isSaasMulticlinicEnabled() && this.currentUser?.role === 'platform_support';
    },

    /** Admin, recepción, support o permiso explícito — ven toda la agenda. */
    canViewAllAgenda() {
        return this.can('view_all_agenda')
            || this.can('manage_schedule')
            || this.isPlatformSupport();
    },

    isTherapist() {
        // Un admin también actúa como terapeuta si tiene 'therapist' asignado
        return this.currentUser?.role === 'therapist' || (this.isAdmin() && this.currentUser?.therapist);
    },

    /**
     * Obtiene el terapeuta seleccionado actualmente (para vistas de calendario)
     */
    getSelectedTherapist() {
        if (this.selectedTherapist) return this.selectedTherapist;
        if (this.canViewAllAgenda()) return 'all';
        return this.currentUser?.therapist || 'diana';
    },

    /**
     * Cambia el terapeuta seleccionado (solo admins)
     */
    setSelectedTherapist(therapistId) {
        if (this.can('switch_therapist_view')) {
            this.selectedTherapist = therapistId;
            if (this.canViewAllAgenda()) {
                sessionStorage.setItem('parlare_admin_therapist_view', therapistId);
            }
            return true;
        }
        return false;
    },

    /**
     * Verifica si el usuario actual puede ver los detalles de un paciente/cita
     * Basado en asignación de terapeuta
     */
    canViewDetails(item) {
        if (!item) return false;
        // Admin y Recepción pueden ver detalles de todos
        if (this.canViewAllAgenda()) return true;

        const itemTherapist = item.therapist || 'diana'; // Default legacy
        const userTherapist = this.currentUser?.therapist;

        return itemTherapist === userTherapist;
    },

    /**
     * Verifica si puede editar item
     */
    canEditItem(item) {
        return this.canViewDetails(item);
    },

    /**
     * Helpers de UI (NUEVOS)
     */
    getDisplayName() {
        return this.currentUser?.displayName || this.currentUser?.email || 'Usuario';
    },

    getRole() {
        if (!this.currentUser?.role) return 'Usuario';
        return ROLES[this.currentUser.role]?.label || this.currentUser.role;
    },

    getEmail() {
        return this.currentUser?.email || '';
    },

    /** Exportado para documentación y panel admin. */
    CLINIC_OWNER_EMAIL
};
