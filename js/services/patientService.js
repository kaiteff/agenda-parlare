// patientService.js - Servicio para gestión de perfiles de pacientes
import { db, patientProfilesPath, collectionPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { validatePatientName } from '../utils/validators.js';
import { ModalService } from '../utils/ModalService.js';

/**
 * Busca un perfil de paciente por nombre
 * @param {string} name - Nombre del paciente
 * @param {Array} profiles - Lista de perfiles
 * @returns {Object|null} - Perfil encontrado o null
 */
export function findPatientByName(name, profiles) {
    if (!name) return null;
    return profiles.find(p => p.name.toLowerCase() === name.toLowerCase().trim());
}

/**
 * Crea un nuevo perfil de paciente
 * @param {string} name - Nombre completo del paciente
 * @param {string} firstName - Nombre(s)
 * @param {string} lastName - Apellidos
 * @param {string} therapist - ID del terapeuta asignado (opcional, default: 'diana')
 * @returns {Promise<Object>} - Resultado { success, id, data, error }
 */
export async function createPatientProfile(name, firstName = '', lastName = '', therapist = 'diana', options = {}) {
    try {
        const validation = validatePatientName(name);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const profileData = {
            name: name.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            therapist: therapist,
            phone: options.phone || '',
            isActive: true,
            dateAdded: serverTimestamp(),
            dateInactivated: null,
            lastSessionDate: null,
            defaultCost: options.defaultCost || 0,
            clinicFee: options.clinicFee !== undefined ? options.clinicFee : 250,
            parentName: options.parentName || '',
            wantsWhatsapp: options.wantsWhatsapp !== false
        };

        const docRef = await addDoc(collection(db, patientProfilesPath), profileData);
        return { success: true, id: docRef.id, data: profileData };
    } catch (error) {
        console.error("Error creando perfil:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Da de baja a un paciente (Soft Delete)
 * @param {string} id - ID del perfil
 * @param {Date} lastSessionDate - Fecha de última sesión (opcional)
 * @param {Object} legacyData - Datos de recordatorio (usualDay, usualTime, cost)
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deactivatePatient(id, lastSessionDate = null, legacyData = null) {
    try {
        const updateData = {
            isActive: false,
            dateInactivated: serverTimestamp()
        };

        if (lastSessionDate) {
            updateData.lastSessionDate = lastSessionDate;
        }

        if (legacyData) {
            updateData.legacyData = legacyData;
        }

        await updateDoc(doc(db, patientProfilesPath, id), updateData);
        return { success: true };
    } catch (error) {
        console.error("Error dando de baja:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Reactiva un paciente dado de baja
 * @param {string} id - ID del perfil
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function reactivatePatient(id) {
    try {
        await updateDoc(doc(db, patientProfilesPath, id), {
            isActive: true,
            dateInactivated: null,
            legacyData: null // Limpiar legacy data al reactivar
        });
        return { success: true };
    } catch (error) {
        console.error("Error reactivando paciente:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancela (elimina) citas futuras de un paciente a partir de hoy
 * @param {string} patientName - Nombre del paciente
 * @returns {Promise<number>} - Número de citas eliminadas
 */
export async function cancelFutureAppointments(patientName) {
    try {
        // Obtener fecha de hoy inicio del día para incluir hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const q = query(
            collection(db, collectionPath),
            where("name", "==", patientName)
        );

        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        let deletedCount = 0;

        querySnapshot.forEach((docSnapshot) => {
            const appointment = docSnapshot.data();
            // Filtrar localmente: eliminar si es >= hoy
            if (appointment.date >= todayIso) {
                batch.delete(docSnapshot.ref);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
            console.log(`🗑️ Se eliminaron ${deletedCount} citas futuras/hoy para ${patientName}`);
        }

        return deletedCount;
    } catch (error) {
        console.error("Error cancelando citas futuras:", error);
        throw error;
    }
}

/**
 * Elimina permanentemente un perfil de paciente y sus citas asocidas
 * @param {string} id - ID del perfil
 * @param {string} patientName - Nombre del paciente
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deletePatientProfile(id, patientName) {
    try {
        const batch = writeBatch(db);

        // 1. Eliminar perfil
        const profileRef = doc(db, patientProfilesPath, id);
        batch.delete(profileRef);

        // 2. Eliminar TODAS las citas futuras
        if (patientName) {
            await cancelFutureAppointments(patientName);
            // Nota: deletePatientProfile original eliminaba futuras.
            // Aquí reutilizamos cancelFutureAppointments pero ojo que es async separado.
            // Para consistencia con batch, deberíamos hacerlo todo en batch aquí si fuera crítico.
            // Pero cancelFutureAppointments ya hace su propio batch.
        }

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error eliminando perfil:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Asegura que existe un perfil de paciente, creándolo si es necesario
 * Si el paciente está inactivo, pregunta si reactivar
 * @param {string} patientName - Nombre completo del paciente
 * @param {string} firstName - Nombre(s)
 * @param {string} lastName - Apellidos
 * @param {string} patientProfiles - Lista de perfiles de pacientes
 * @returns {Promise<Object>} - Perfil del paciente
 */
export async function ensurePatientProfile(patientName, firstName = '', lastName = '', patientProfiles = []) {
    const existing = patientProfiles.find(p => p.name === patientName);

    if (existing) {
        // Si está inactivo, preguntar si reactivar
        if (existing.isActive === false) {
            const inactivatedDate = existing.dateInactivated?.toDate?.() || new Date(existing.dateInactivated);
            const dateStr = inactivatedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            if (await ModalService.confirm(
                "Paciente Inactivo",
                `⚠️ ${patientName} está dado/a de baja desde el ${dateStr}.<br><br>¿Desea reactivar y agendar?`,
                "Reactivar",
                "Cancelar"
            )) {
                const result = await reactivatePatient(existing.id);
                if (!result.success) throw new Error(result.error);
                return existing;
            } else {
                throw new Error("Paciente inactivo - operación cancelada");
            }
        }
        return existing;
    }

    // Crear nuevo perfil usando servicio
    const result = await createPatientProfile(patientName, firstName, lastName);
    if (!result.success) throw new Error(result.error);
    return { id: result.id, ...result.data };
}
