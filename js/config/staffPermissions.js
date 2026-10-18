/**
 * Catálogo de permisos del equipo — Fase 1 (UI + clinicConfig).
 * Fase 2 futura: custom claims Firebase (ver PERMISOS_EQUIPO_FASE1.md).
 */

/** Dueña de clínica — única con dinero consolidado por defecto. */
export const CLINIC_OWNER_EMAIL = 'lopezcarpio7@gmail.com';

/** Permisos que la dueña siempre conserva (no editables en panel). */
export const OWNER_LOCKED_PERMISSIONS = [
    'view_clinic_financials',
    'manage_clinic_settings',
    'manage_staff_permissions'
];

/** Equipo editable desde Configuración (sin dueña ni soporte técnico). */
export const EDITABLE_STAFF_ROSTER = [
    {
        email: 'sammygtz90@gmail.com',
        displayName: 'Sam',
        role: 'therapist',
        therapist: 'sam'
    },
    {
        email: 'sanchezverooo21@gmail.com',
        displayName: 'Vero',
        role: 'therapist',
        therapist: 'vero'
    },
    {
        email: 'yaritzajocgo@gmail.com',
        displayName: 'Yari',
        role: 'receptionist',
        therapist: 'all'
    }
];

/** Permisos base por rol (antes de grants/denies en Firestore). */
export const ROLE_BASE_PERMISSIONS = {
    admin: [
        'manage_clinic_settings',
        'manage_users',
        'manage_staff_permissions',
        'manage_schedule',
        'manage_patients',
        'view_all_patients',
        'delete_records',
        'switch_therapist_view',
        'manage_blocks',
        'view_all_agenda',
        'view_audit',
        'view_reception_control',
        'manage_payments'
    ],
    therapist: [
        'manage_own_schedule',
        'view_own_patients',
        'edit_own_records',
        'view_schedule',
        'view_own_session_pay'
    ],
    receptionist: [
        'view_schedule',
        'view_all_agenda',
        'create_appointment',
        'manage_payments',
        'manage_schedule',
        'view_all_patients',
        'edit_own_records',
        'switch_therapist_view',
        'manage_blocks',
        'view_audit',
        'view_reception_control',
        'delete_records',
        'manage_patients'
    ],
    platform_support: [
        'view_schedule',
        'view_all_agenda',
        'create_appointment',
        'manage_schedule',
        'view_all_patients',
        'edit_own_records',
        'switch_therapist_view',
        'manage_blocks',
        'view_audit',
        'view_reception_control',
        'manage_payments'
    ]
};

/** Grupos mostrados en el panel de Diana. */
export const PERMISSION_GROUPS = [
    {
        id: 'agenda',
        label: 'Agenda',
        options: [
            { id: 'view_all_agenda', label: 'Ver agendas de todas las terapeutas' },
            { id: 'switch_therapist_view', label: 'Cambiar filtro de terapeuta' },
            { id: 'manage_schedule', label: 'Crear y editar citas de cualquier terapeuta' },
            { id: 'manage_blocks', label: 'Registrar vacaciones y bloqueos' }
        ]
    },
    {
        id: 'patients',
        label: 'Pacientes',
        options: [
            { id: 'view_all_patients', label: 'Ver todos los pacientes en la lista' },
            { id: 'manage_patients', label: 'Editar expedientes y dar de baja' },
            { id: 'create_evaluation_patient', label: 'Crear paciente en proceso de evaluación' },
            { id: 'delete_records', label: 'Eliminar pacientes permanentemente' }
        ]
    },
    {
        id: 'reception',
        label: 'Recepción',
        options: [
            { id: 'view_reception_control', label: 'Abrir Control Maestro' },
            { id: 'view_audit', label: 'Ver bitácora de WhatsApp' },
            { id: 'manage_payments', label: 'Registrar pagos en citas' }
        ]
    }
];

export function isClinicOwnerEmail(email) {
    return (email || '').toLowerCase() === CLINIC_OWNER_EMAIL;
}

export function getDefaultStaffPermissions() {
    const staffPermissions = {};
    EDITABLE_STAFF_ROSTER.forEach((member) => {
        staffPermissions[member.email] = { grants: [], denies: [] };
    });
    return staffPermissions;
}

/**
 * Calcula permisos efectivos para un usuario.
 * @param {{ email?: string, role?: string }} user
 * @param {Record<string, { grants?: string[], denies?: string[] }>} staffPermissions
 */
export function computeEffectivePermissions(user, staffPermissions = {}) {
    const email = (user?.email || '').toLowerCase();
    const role = user?.role || 'therapist';
    const base = new Set(ROLE_BASE_PERMISSIONS[role] || ROLE_BASE_PERMISSIONS.therapist);

    const entry = staffPermissions[email];
    (entry?.grants || []).forEach((p) => base.add(p));
    (entry?.denies || []).forEach((p) => base.delete(p));

    if (isClinicOwnerEmail(email)) {
        OWNER_LOCKED_PERMISSIONS.forEach((p) => base.add(p));
        ROLE_BASE_PERMISSIONS.admin.forEach((p) => base.add(p));
    }

    return base;
}

export function permissionAppliesToRole(permissionId, role) {
    const base = new Set(ROLE_BASE_PERMISSIONS[role] || []);
    return !base.has(permissionId);
}
