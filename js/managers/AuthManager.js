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
        permissions: ['manage_users', 'manage_schedule', 'view_reports', 'manage_patients', 'view_all_patients', 'delete_records', 'switch_therapist_view', 'manage_blocks']
    },
    therapist: {
        label: 'Terapeuta',
        permissions: ['manage_own_schedule', 'view_own_patients', 'edit_own_records', 'view_schedule', 'switch_therapist_view']
    },
    receptionist: {
        label: 'Recepción',
        permissions: ['view_schedule', 'create_appointment', 'manage_payments', 'manage_schedule', 'view_all_patients', 'edit_own_records', 'switch_therapist_view', 'manage_blocks']
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

// Mapeo manual de seguridad y perfiles de costo (Fallback)
const AUTHORIZED_USERS = {
    'lopezcarpio7@gmail.com': { 
        role: 'therapist', therapist: 'diana', displayName: 'Diana',
        defaultCost: 800, defaultClinicFee: 250 
    },
    'sammygtz90@gmail.com': { 
        role: 'therapist', therapist: 'sam', displayName: 'Sam',
        defaultCost: 800, defaultClinicFee: 250 
    },
    'sanchezverooo21@gmail.com': { 
        role: 'therapist', therapist: 'vero', displayName: 'Vero',
        defaultCost: 800, defaultClinicFee: 400 
    },
    'yaritzajocgo@gmail.com': { 
        role: 'receptionist', therapist: 'all', displayName: 'Yari',
        defaultCost: 800, defaultClinicFee: 250 
    },
    'rodriguezd.danielrob@gmail.com': { 
        role: 'admin', therapist: 'all', displayName: 'Daniel (Admin)',
        defaultCost: 800, defaultClinicFee: 250 
    }
};

export const AuthManager = {
    // ... (anterior)
    
    /**
     * Obtiene los costos por defecto de un terapeuta
     */
    getTherapistDefaults(therapistId) {
        const id = (therapistId || 'diana').toLowerCase();
        // Buscar en el mapeo de usuarios el que corresponda a ese ID de terapeuta
        const profile = Object.values(AUTHORIZED_USERS).find(u => u.therapist === id);
        return {
            cost: profile?.defaultCost || 800,
            clinicFee: profile?.defaultClinicFee || 250
        };
    },
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
            let userData = await this.getUserData(firebaseUser.uid);

            // Si no hay datos en Firestore, buscar en nuestro mapeo manual por Email
            if (!userData && firebaseUser.email) {
                console.log("🔍 Buscando en mapeo manual para:", firebaseUser.email);
                userData = AUTHORIZED_USERS[firebaseUser.email.toLowerCase()];
            }

            if (userData) {
                console.log("✅ Perfil encontrado/cargado correctamente.");
                this.currentUser = { ...firebaseUser, ...userData };
            } else {
                console.warn('⚠️ Usuario sin perfil extendido (o error de lectura), usando fallback seguro.');
                // Fallback RESTRICTIVO por seguridad
                this.currentUser = {
                    ...firebaseUser,
                    role: 'therapist', // Por seguridad, si no lo conocemos, es rol básico
                    therapist: 'diana',
                    displayName: firebaseUser.displayName || 'Usuario',
                    isFallback: true
                };
            }

            // Inicializar filtro de terapeuta: PRIORIDAD AL SUYO (incluso si es Admin)
            if (this.currentUser.therapist && this.currentUser.therapist !== 'all') {
                this.selectedTherapist = this.currentUser.therapist;
            } else if (this.currentUser.role === 'receptionist' || this.isAdmin()) {
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
        if (this.selectedTherapist) return this.selectedTherapist;
        if (this.currentUser?.role === 'admin' || this.currentUser?.role === 'receptionist') return 'all';
        return this.currentUser?.therapist || 'diana';
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
        // Admin y Recepción pueden ver detalles de todos
        if (this.isAdmin() || this.currentUser?.role === 'receptionist') return true;

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
