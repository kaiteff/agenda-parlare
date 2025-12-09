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
 * Elimina permanentemente un perfil de paciente y sus citas FUTURAS asociadas
 * Las citas pasadas se conservan para registro histórico/financiero
 * 
 * @param {string} id - ID del perfil
 * @param {string} patientName - Nombre del paciente (para buscar y eliminar citas)
 * @returns {Promise<Object>} - Resultado { success, error }
 */
export async function deletePatientProfile(id, patientName) {
    try {
        const batch = writeBatch(db);

        // 1. Eliminar perfil
        const profileRef = doc(db, patientProfilesPath, id);
        batch.delete(profileRef);

        // 2. Eliminar citas FUTURAS asociadas (si se proporciona nombre)
        if (patientName) {
            // Obtener fecha actual en formato ISO para comparar
            const now = new Date().toISOString();

            // Consultar TODAS las citas del paciente (sin filtro de fecha para evitar error de índice)
            const q = query(
                collection(db, collectionPath),
                where("name", "==", patientName)
            );

            const querySnapshot = await getDocs(q);
            let deletedCount = 0;

            querySnapshot.forEach((docSnapshot) => {
                const appointment = docSnapshot.data();
                // Filtrar localmente: solo eliminar si la fecha es futura
                if (appointment.date >= now) {
                    batch.delete(docSnapshot.ref);
                    deletedCount++;
                }
            });

            console.log(`🗑️ Preparando eliminación de ${deletedCount} citas futuras para ${patientName}`);
        }

        // Ejecutar batch
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error eliminando perfil y citas futuras:", error);
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
