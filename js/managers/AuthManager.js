import { db } from '../firebase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    collection,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Lazy-load auth and db to ensure they are initialized
let _auth = null;
let _db = null;

function getAuthInstance() {
    if (!_auth && db?.app) {
        _auth = getAuth(db.app);
    }
    return _auth;
}

function getDbInstance() {
    // SIEMPRE intentar obtener una instancia fresca compatible con este módulo
    if (!_db && db?.app) {
        try {
            _db = getFirestore(db.app);
            console.log("🔄 AuthManager: Created local Firestore instance from db.app for compatibility (v10.7.1)");
        } catch (e) {
            console.warn("⚠️ AuthManager: Could not create local Firestore, using imported db", e);
            _db = db;
        }
    }
    return _db || db;
}

export const ROLES = {
    admin: {
        level: 3,
        permissions: [
            'view_all_patients',
            'view_all_appointments',
            'create_patient',
            'edit_any_patient',
            'delete_patient',
            'create_appointment',
            'edit_any_appointment',
            'delete_appointment',
            'view_all_payments',
            'edit_payments',
            'view_reports',
            'manage_users',
            'export_data',
            'switch_therapist_view'
        ]
    },
    therapist: {
        level: 2,
        permissions: [
            'view_own_patients',
            'create_patient',
            'edit_own_patient',
            'create_appointment',
            'edit_own_appointment',
            'view_own_payments',
            'edit_own_payments',
            'switch_therapist_view'
        ]
    },
    receptionist: {
        level: 1,
        permissions: [
            'view_all_patients',
            'view_all_appointments',
            'create_patient',
            'edit_patient',
            'create_appointment',
            'edit_own_appointment',
            'view_all_payments',
            'edit_payments',
            'view_reports',
            'export_data',
            'switch_therapist_view'
        ]
    }
};

export const AuthManager = {
    currentUser: null,
    selectedTherapist: null,

    async init() {
        return new Promise((resolve) => {
            onAuthStateChanged(getAuthInstance(), async (user) => {
                if (user) {
                    await this.initUser(user);
                } else {
                    this.clear();
                }
                resolve(this.currentUser);
            });
        });
    },

    async initUser(firebaseUser) {
        try {
            const userData = await this.getUserData(firebaseUser.uid);

            if (userData) {
                this.currentUser = { ...firebaseUser, ...userData };
            } else {
                // Fallback para usuarios legacy
                console.warn('Usuario sin perfil extendido, usando fallback');
                this.currentUser = {
                    ...firebaseUser,
                    role: 'admin',
                    therapist: 'diana',
                    displayName: firebaseUser.displayName || 'Usuario'
                };
            }

            // Inicializar filtro de terapeuta
            // Si el usuario tiene un terapeuta asignado, usar ese por defecto (incluso si es admin)
            // Si no tiene terapeuta asignado y puede cambiar vista, usar 'all'
            if (this.currentUser.therapist) {
                this.selectedTherapist = this.currentUser.therapist;
            } else if (this.can('switch_therapist_view')) {
                this.selectedTherapist = 'all';
            } else {
                this.selectedTherapist = 'diana'; // Fallback seguro
            }

            return this.currentUser;
        } catch (error) {
            console.error('Error al cargar perfil de usuario:', error);
            return null;
        }
    },

    clear() {
        this.currentUser = null;
        this.selectedTherapist = null;
    },

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

    async logout() {
        try {
            await signOut(getAuthInstance());
            this.clear();
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    },

    async getUserData(uid) {
        try {
            const database = getDbInstance();
            console.log("🔍 AuthManager: checking user data for", uid);

            // Usar doc importado del CDN 10.7.1 que debe coincidir con database
            const userRef = doc(database, "users", uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                console.log("✅ User profile found:", userDoc.data());
                return userDoc.data();
            } else {
                console.warn("⚠️ User profile document does not exist for UID:", uid);
            }
            return null;
        } catch (error) {
            console.error("❌ Error getting user data:", error);
            return null;
        }
    },

    async createOrUpdateUser(uid, userData) {
        if (!this.isAdmin()) {
            throw new Error("No autorizado");
        }

        const dataToSave = {
            ...userData,
            updatedAt: serverTimestamp()
        };

        if (!userData.createdAt) {
            dataToSave.createdAt = serverTimestamp();
        }

        await setDoc(doc(db, "users", uid), dataToSave, { merge: true });
    },

    can(permission) {
        if (!this.currentUser) return false;

        // Fallback para usuarios legacy
        if (!this.currentUser.role) return true;

        const role = ROLES[this.currentUser.role];
        return role && role.permissions.includes(permission);
    },

    isAdmin() {
        return this.currentUser?.role === 'admin' || !this.currentUser?.role;
    },

    isTherapist() {
        return this.currentUser?.role === 'therapist';
    },

    isReceptionist() {
        return this.currentUser?.role === 'receptionist';
    },

    canEditItem(item) {
        if (this.isAdmin()) return true;

        if (this.isTherapist()) {
            if (item.therapist) {
                return item.therapist === this.currentUser.therapist;
            }
            return false;
        }

        if (this.isReceptionist()) {
            return item.createdBy === this.currentUser.email;
        }

        return false;
    },

    canViewDetails(item) {
        if (this.isAdmin()) return true;
        if (this.isReceptionist()) return true; // Recepcionista ve todo (para cobrar/agendar)

        if (this.isTherapist()) {
            if (item.therapist) {
                return item.therapist === this.currentUser.therapist;
            }
            return false;
        }
        return false;
    },

    getDisplayName() {
        return this.currentUser?.displayName || this.currentUser?.email || 'Usuario';
    },

    getRole() {
        return this.currentUser?.role || 'admin';
    },

    getSelectedTherapist() {
        return this.selectedTherapist;
    },

    setSelectedTherapist(therapist) {
        console.log("🔧 setSelectedTherapist llamado con:", therapist);
        console.log("🔧 can('switch_therapist_view'):", this.can('switch_therapist_view'));
        if (this.can('switch_therapist_view')) {
            this.selectedTherapist = therapist;
            console.log("✅ selectedTherapist actualizado a:", this.selectedTherapist);
        } else {
            console.log("❌ No tiene permiso para cambiar vista de terapeuta");
        }
    }
};
