// patientService.js - Servicio para gestión de perfiles de pacientes
import { db, patientProfilesPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { validatePatientName } from '../utils/validators.js';

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
export async function createPatientProfile(name, firstName = '', lastName = '', therapist = 'diana') {
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
            isActive: true,
            dateAdded: serverTimestamp(),
            dateInactivated: null,
            lastSessionDate: null
        };

        console.log("🔍 createPatientProfile - db:", db);
        console.log("🔍 createPatientProfile - patientProfilesPath:", patientProfilesPath);
        console.log("🔍 createPatientProfile - profileData:", profileData);

        const docRef = await addDoc(collection(db, patientProfilesPath), profileData);
        console.log("✅ Documento creado con ID:", docRef.id);
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
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deactivatePatient(id, lastSessionDate = null) {
    try {
        const updateData = {
            isActive: false,
            dateInactivated: serverTimestamp()
        };

        if (lastSessionDate) {
            updateData.lastSessionDate = lastSessionDate;
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
            dateInactivated: null
        });
        return { success: true };
    } catch (error) {
        console.error("Error reactivando paciente:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Elimina permanentemente un perfil de paciente
 * @param {string} id - ID del perfil
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deletePatientProfile(id) {
    try {
        await deleteDoc(doc(db, patientProfilesPath, id));
        return { success: true };
    } catch (error) {
        console.error("Error eliminando perfil:", error);
        return { success: false, error: error.message };
    }
}
