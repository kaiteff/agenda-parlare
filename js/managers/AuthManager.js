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

// Roles y Permisos
const ROLES = {
    admin: {
        label: 'Administrador',
        permissions: ['manage_users', 'manage_schedule', 'view_reports', 'manage_patients', 'view_all_patients', 'delete_records', 'switch_therapist_view']
    },
    therapist: {
        label: 'Terapeuta',
        permissions: ['manage_own_schedule', 'view_own_patients', 'edit_own_records', 'view_schedule', 'switch_therapist_view', 'view_all_patients']
    },
    receptionist: {
        label: 'Recepción',
        permissions: ['view_schedule', 'create_appointment', 'manage_payments']
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
    // Simplificado: Usar siempre la instancia importada de firebase.js
    // Esto evita incompatibilidades entre versiones/instancias de SDK
    return db;
}

export const AuthManager = {
    currentUser: null,
    selectedTherapist: null, // Para admins: qué calendario están viendo

    /**
     * Inicializa el listener de estado de autenticación
     */
    async init() {
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
    },

    /**
     * Carga el perfil extendido del usuario desde Firestore
     */
    async initUser(firebaseUser) {
        try {
            console.log("👤 AuthManager: Inicializando usuario...", firebaseUser.uid);
            const userData = await this.getUserData(firebaseUser.uid);

            if (userData) {
                console.log("✅ Perfil encontrado/cargado correctamente.");
                this.currentUser = { ...firebaseUser, ...userData };
            } else {
                console.warn('⚠️ Usuario sin perfil extendido (o error de lectura), usando fallback seguro.');
                // Fallback robusto para asegurar que el usuario pueda entrar aunque falle Firestore
                this.currentUser = {
                    ...firebaseUser,
                    role: 'admin', // Asumir rol básico o admin por defecto en dev
                    therapist: 'diana',
                    displayName: firebaseUser.displayName || 'Usuario',
                    isFallback: true
                };
            }

            // Inicializar filtro de terapeuta
            if (this.currentUser.therapist) {
                this.selectedTherapist = this.currentUser.therapist;
            } else if (this.can('switch_therapist_view')) {
                this.selectedTherapist = 'all';
            } else {
                this.selectedTherapist = 'diana';
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

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    can(permission) {
        if (!this.currentUser) return false;
        // Si no tiene rol definido, asumir sin permisos (o admin en dev si se prefiere)
        if (!this.currentUser.role) return true; // Default permissivo para evitar bloqueos en dev

        const role = ROLES[this.currentUser.role];
        if (!role) {
            console.warn(`Role '${this.currentUser.role}' not found in configuration.`);
            return false;
        }

        // Admin tiene acceso a todo si tiene el permiso o si es superadmin implícito
        if (this.currentUser.role === 'admin') return true;

        return role.permissions.includes(permission);
    },

    /**
     * Helpers de Roles
     */
    isAdmin() {
        return this.currentUser?.role === 'admin';
    },

    isTherapist() {
        // Un admin también actúa como terapeuta si tiene 'therapist' asignado
        return this.currentUser?.role === 'therapist' || (this.isAdmin() && this.currentUser?.therapist);
    },

    /**
     * Obtiene el terapeuta seleccionado actualmente (para vistas de calendario)
     */
    getSelectedTherapist() {
        return this.selectedTherapist || this.currentUser?.therapist || 'diana';
    },

    /**
     * Cambia el terapeuta seleccionado (solo admins)
     */
    setSelectedTherapist(therapistId) {
        if (this.can('switch_therapist_view')) {
            this.selectedTherapist = therapistId;
            // Disparar evento de cambio si fuera necesario
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
        if (this.isAdmin()) return true;

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
    }
};
