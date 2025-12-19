import { db } from '../firebase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Lazy-load auth to ensure db is initialized first
let _auth = null;
function getAuthInstance() {
    if (!_auth && db?.app) {
        _auth = getAuth(db.app);
    }
    return _auth;
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
            'edit_own_payments'
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
            if (this.can('switch_therapist_view')) {
                this.selectedTherapist = 'all';
            } else {
                this.selectedTherapist = this.currentUser.therapist;
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
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                return userDoc.data();
            }
            return null;
        } catch (error) {
            console.error("Error getting user data:", error);
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
        if (this.can('switch_therapist_view')) {
            this.selectedTherapist = therapist;
        }
    }
};
