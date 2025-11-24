// AuthManager.js - Sistema de autenticación y permisos
// Gestiona usuarios, roles y permisos del sistema

import { db, collection, doc, getDoc, getDocs, query, where } from '../firebase.js';

/**
 * Definición de roles del sistema
 */
export const ROLES = {
    admin: {
        name: 'Administrador',
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
        ],
        canSwitchTherapist: true,
        defaultView: 'all'
    },

    therapist: {
        name: 'Terapeuta',
        level: 2,
        permissions: [
            'view_own_patients',
            'create_patient',
            'edit_own_patient',
            'create_appointment',
            'edit_own_appointment',
            'view_own_payments',
            'edit_own_payments'
        ],
        canSwitchTherapist: false,
        defaultView: 'own'
    },

    receptionist: {
        name: 'Recepcionista',
        level: 1,
        permissions: [
            'view_all_patients',
            'view_all_appointments',
            'create_patient',
            'edit_patient',
            'create_appointment',
            'edit_own_appointment', // Solo lo que ella creó
            'view_all_payments',
            'edit_payments',
            'view_reports',
            'export_data',
            'switch_therapist_view'
        ],
        canSwitchTherapist: true,
        defaultView: 'all'
    }
};

/**
 * Configuración de usuarios del sistema
 * NOTA: En producción, esto debería estar en Firebase
 */
const USER_CONFIG = {
    'diana@parlare.com': {
        role: 'admin',
        therapist: 'diana',
        name: 'Diana',
        displayName: 'Diana (Jefa)'
    },
    'sam@parlare.com': {
        role: 'therapist',
        therapist: 'sam',
        name: 'Sam',
        displayName: 'Sam (Terapeuta)'
    },
    'recepcion@parlare.com': {
        role: 'receptionist',
        therapist: null,
        name: 'Recepcionista',
        displayName: 'Recepcionista'
    }
};

/**
 * Manager de autenticación y permisos
 */
export const AuthManager = {
    currentUser: null,
    selectedTherapist: null, // Para filtrar vista

    /**
     * Inicializa el usuario después del login
     * @param {Object} firebaseUser - Usuario de Firebase Auth
     */
    async initUser(firebaseUser) {
        if (!firebaseUser) {
            this.currentUser = null;
            this.selectedTherapist = null;
            return null;
        }

        const email = firebaseUser.email;
        const userConfig = USER_CONFIG[email];

        if (!userConfig) {
            console.error(`❌ Usuario no configurado: ${email}`);
            return null;
        }

        // Construir objeto de usuario completo
        this.currentUser = {
            uid: firebaseUser.uid,
            email: email,
            ...userConfig,
            roleData: ROLES[userConfig.role]
        };

        // Configurar vista por defecto
        if (this.currentUser.roleData.canSwitchTherapist) {
            this.selectedTherapist = 'all';
        } else {
            this.selectedTherapist = this.currentUser.therapist;
        }

        console.log(`✅ Usuario inicializado: ${this.currentUser.displayName} (${this.currentUser.role})`);
        console.log(`📊 Vista: ${this.selectedTherapist}`);

        return this.currentUser;
    },

    /**
     * Verifica si el usuario tiene un permiso específico
     * @param {string} permission - Nombre del permiso
     * @returns {boolean}
     */
    can(permission) {
        if (!this.currentUser) return false;
        return this.currentUser.roleData.permissions.includes(permission);
    },

    /**
     * Verifica si el usuario es administrador
     * @returns {boolean}
     */
    isAdmin() {
        return this.currentUser?.role === 'admin';
    },

    /**
     * Verifica si el usuario es terapeuta
     * @returns {boolean}
     */
    isTherapist() {
        return this.currentUser?.role === 'therapist';
    },

    /**
     * Verifica si el usuario es recepcionista
     * @returns {boolean}
     */
    isReceptionist() {
        return this.currentUser?.role === 'receptionist';
    },

    /**
     * Verifica si el usuario puede editar un item específico
     * @param {Object} item - Item a verificar (paciente, cita, etc.)
     * @returns {boolean}
     */
    canEditItem(item) {
        if (!this.currentUser) return false;

        // Admin puede editar todo
        if (this.isAdmin()) return true;

        // Terapeuta solo puede editar sus propios items
        if (this.isTherapist()) {
            return item.therapist === this.currentUser.therapist;
        }

        // Recepcionista solo puede editar lo que ella creó
        if (this.isReceptionist()) {
            return item.createdBy === this.currentUser.email;
        }

        return false;
    },

    /**
     * Verifica si el usuario puede ver un item específico
     * @param {Object} item - Item a verificar
     * @returns {boolean}
     */
    canViewItem(item) {
        if (!this.currentUser) return false;

        // Admin y Recepcionista pueden ver todo
        if (this.isAdmin() || this.isReceptionist()) return true;

        // Terapeuta solo ve sus items
        if (this.isTherapist()) {
            return item.therapist === this.currentUser.therapist;
        }

        return false;
    },

    /**
     * Cambia el terapeuta seleccionado para filtrar vista
     * @param {string} therapist - 'diana', 'sam', o 'all'
     */
    setSelectedTherapist(therapist) {
        if (!this.currentUser) return;

        // Solo admin y recepcionista pueden cambiar
        if (!this.currentUser.roleData.canSwitchTherapist) {
            console.warn('⚠️ Usuario no puede cambiar de terapeuta');
            return;
        }

        this.selectedTherapist = therapist;
        console.log(`🔄 Vista cambiada a: ${therapist}`);
    },

    /**
     * Obtiene el terapeuta actual para filtros
     * @returns {string}
     */
    getSelectedTherapist() {
        return this.selectedTherapist || 'all';
    },

    /**
     * Obtiene información del usuario actual
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    },

    /**
     * Limpia el estado de autenticación
     */
    clear() {
        this.currentUser = null;
        this.selectedTherapist = null;
        console.log('🔒 Sesión cerrada');
    },

    /**
     * Obtiene el nombre para mostrar del usuario
     * @returns {string}
     */
    getDisplayName() {
        return this.currentUser?.displayName || 'Usuario';
    },

    /**
     * Obtiene el rol del usuario
     * @returns {string}
     */
    getRole() {
        return this.currentUser?.role || 'guest';
    },

    /**
     * Verifica si hay un usuario autenticado
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }
};

// Exponer globalmente para debugging (solo en desarrollo)
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}

export default AuthManager;
