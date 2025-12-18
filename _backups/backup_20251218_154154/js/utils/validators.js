// validators.js - Validaciones centralizadas
// Funciones de validación para citas y datos de la aplicación

/**
 * Verifica si un slot de tiempo está libre
 * @param {Date} dateObj - Fecha y hora a verificar
 * @param {Array} appointments - Lista de citas
 * @param {string} excludeId - ID de cita a excluir (opcional, para edición)
 * @returns {boolean} - true si el slot está libre
 */
/**
 * Verifica si un slot de tiempo está libre
 * @param {Date} dateObj - Fecha y hora a verificar
 * @param {Array} appointments - Lista de citas
 * @param {string} excludeId - ID de cita a excluir (opcional, para edición)
 * @param {string} therapist - ID del terapeuta (opcional)
 * @returns {boolean} - true si el slot está libre
 */
export function isSlotFree(dateObj, appointments, excludeId = null, therapist = null) {
    const time = dateObj.getTime();
    return !appointments.some(p => {
        if (excludeId && p.id === excludeId) return false;
        if (p.isCancelled) return false;

        // Si se especifica terapeuta, solo considerar citas de ese terapeuta
        // Si la cita no tiene terapeuta, se asume 'diana' (compatibilidad hacia atrás)
        const apptTherapist = p.therapist || 'diana';
        const targetTherapist = therapist || 'diana';

        if (apptTherapist !== targetTherapist) return false;

        const pDate = new Date(p.date);
        const pTime = pDate.getTime();
        // Considera ocupado si hay una cita dentro de 1 hora
        return Math.abs(pTime - time) < 3600000;
    });
}

/**
 * Verifica si hay conflicto de horario para una cita
 * @param {string} dateTimeStr - Fecha y hora en formato ISO
 * @param {Array} appointments - Lista de citas
 * @param {string} excludeId - ID de cita a excluir (opcional)
 * @param {string} therapist - ID del terapeuta (opcional)
 * @returns {Object|null} - Cita en conflicto o null si no hay conflicto
 */
export function checkSlotConflict(dateTimeStr, appointments, excludeId = null, therapist = null) {
    const selectedTime = new Date(dateTimeStr).getTime();
    return appointments.find(p => {
        if (excludeId && p.id === excludeId) return false;
        if (p.isCancelled) return false;

        const apptTherapist = p.therapist || 'diana';
        const targetTherapist = therapist || 'diana';

        if (apptTherapist !== targetTherapist) return false;

        const pTime = new Date(p.date).getTime();
        return Math.abs(pTime - selectedTime) < 3600000;
    });
}

/**
 * Valida los datos de una cita
 * @param {string} name - Nombre del paciente
 * @param {string} date - Fecha de la cita
 * @param {string|number} cost - Costo de la cita
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function validateAppointmentData(name, date, cost) {
    const errors = [];

    if (!name || name.trim() === '') {
        errors.push('El nombre del paciente es requerido');
    }

    if (!date) {
        errors.push('La fecha es requerida');
    } else {
        const appointmentDate = new Date(date);
        if (isNaN(appointmentDate.getTime())) {
            errors.push('La fecha no es válida');
        }
    }

    if (cost !== undefined && cost !== null && cost !== '') {
        const costNum = parseFloat(cost);
        if (isNaN(costNum) || costNum < 0) {
            errors.push('El costo debe ser un número positivo');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida el nombre de un paciente
 * @param {string} name - Nombre a validar
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validatePatientName(name) {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'El nombre es requerido' };
    }

    if (name.trim().length < 2) {
        return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
    }

    if (name.length > 100) {
        return { valid: false, error: 'El nombre es demasiado largo' };
    }

    return { valid: true, error: null };
}

/**
 * Valida que una fecha no sea en el pasado
 * @param {string|Date} date - Fecha a validar
 * @returns {boolean} - true si la fecha es futura o hoy
 */
export function isFutureOrToday(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return checkDate >= today;
}

/**
 * Valida que una fecha esté dentro del horario laboral (9:00 - 20:00)
 * @param {string|Date} date - Fecha a validar
 * @returns {boolean} - true si está dentro del horario
 */
export function isWithinWorkingHours(date) {
    const checkDate = new Date(date);
    const hour = checkDate.getHours();
    return hour >= 9 && hour <= 20;
}

/**
 * Valida que una fecha no sea domingo
 * @param {string|Date} date - Fecha a validar
 * @returns {boolean} - true si no es domingo
 */
export function isNotSunday(date) {
    const checkDate = new Date(date);
    return checkDate.getDay() !== 0;
}

/**
 * Validación completa de una cita
 * @param {Object} appointmentData - Datos de la cita
 * @param {Array} existingAppointments - Citas existentes
 * @param {string} therapist - ID del terapeuta (opcional)
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function validateAppointment(appointmentData, existingAppointments, therapist = null) {
    const { name, date, cost, id } = appointmentData;
    const errors = [];

    // Validar datos básicos
    const basicValidation = validateAppointmentData(name, date, cost);
    if (!basicValidation.valid) {
        errors.push(...basicValidation.errors);
    }

    if (date) {
        const appointmentDate = new Date(date);

        // Validar que no sea domingo
        if (!isNotSunday(appointmentDate)) {
            errors.push('No se pueden agendar citas los domingos');
        }

        // Validar horario laboral
        if (!isWithinWorkingHours(appointmentDate)) {
            errors.push('La cita debe estar entre las 9:00 y las 20:00');
        }

        // Validar conflictos
        const conflict = checkSlotConflict(date, existingAppointments, id, therapist);
        if (conflict) {
            const conflictTime = new Date(date).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            errors.push(`El horario ${conflictTime} ya está ocupado por ${conflict.name}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
