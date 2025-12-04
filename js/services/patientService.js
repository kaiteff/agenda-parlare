// patientService.js - Servicio para gestión de perfiles de pacientes
import { db, patientProfilesPath, collectionPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, writeBatch } from '../firebase.js';
import { validatePatientName } from '../utils/validators.js';

// ... (rest of the file)

/**
 * Elimina permanentemente un perfil de paciente y sus citas asociadas
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

        // 2. Eliminar citas asociadas (si se proporciona nombre)
        if (patientName) {
            const q = query(collection(db, collectionPath), where("name", "==", patientName));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            console.log(`🗑️ Preparando eliminación de ${querySnapshot.size} citas para ${patientName}`);
        }

        // Ejecutar batch
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error eliminando perfil y citas:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Asegura que existe un perfil de paciente, creándolo si es necesario
 * Si el paciente está inactivo, pregunta si reactivar
 * @param {string} patientName - Nombre completo del paciente
 * @param {string} firstName - Nombre(s)
 * @param {string} lastName - Apellidos
 * @param {Array} patientProfiles - Lista de perfiles de pacientes
 * @returns {Promise<Object>} - Perfil del paciente
 */
export async function ensurePatientProfile(patientName, firstName = '', lastName = '', patientProfiles = []) {
    const existing = patientProfiles.find(p => p.name === patientName);

    if (existing) {
        // Si está inactivo, preguntar si reactivar
        if (existing.isActive === false) {
            const inactivatedDate = existing.dateInactivated?.toDate?.() || new Date(existing.dateInactivated);
            const dateStr = inactivatedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            if (confirm(`⚠️ ${patientName} está dado/a de baja desde el ${dateStr}.\n\n¿Desea reactivar y agendar?`)) {
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

