// patientService.js - Servicio para gestión de perfiles de pacientes
import { db, patientProfilesPath, collectionPath, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase.js';
import { query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { validatePatientName, normalizeName } from '../utils/validators.js';
import { AuthManager } from '../managers/AuthManager.js';
import { ModalService } from '../utils/ModalService.js';
import { escapeHTML } from '../utils/sanitize.js';

/**
 * Busca un perfil de paciente por nombre
 * @param {string} name - Nombre del paciente
 * @param {Array} profiles - Lista de perfiles
 * @returns {Object|null} - Perfil encontrado o null
 */
/**
 * Lee campos preparatorios de recibo de reembolso desde el DOM (aunque estén disabled).
 * @param {'newPatient'|'editPatient'} prefix
 */
export function getReimbursementReceiptFromDom(prefix) {
    return {
        autoGenerate: document.getElementById(`${prefix}ReimbursementAuto`)?.checked === true,
        tutorName: document.getElementById(`${prefix}ReimbursementTutorName`)?.value?.trim() || ''
    };
}

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
            name: normalizeName(name),
            firstName: normalizeName(firstName),
            lastName: normalizeName(lastName),
            therapist: therapist,
            phone: options.phone || '',
            countryCode: options.countryCode || '52', // Nuevo campo
            isActive: true,
            dateAdded: serverTimestamp(),
            dateInactivated: null,
            lastSessionDate: null,
            defaultCost: options.defaultCost || 0,
            clinicFee: options.clinicFee !== undefined
                ? options.clinicFee
                : AuthManager.getTherapistDefaults(therapist).clinicFee,
            parentName: options.parentName || '',
            wantsWhatsapp: options.wantsWhatsapp !== false,
            recurrentOptIn: options.recurrentOptIn || 'pending',
            birthday: options.birthday || '',
            reimbursementReceipt: {
                autoGenerate: options.reimbursementReceipt?.autoGenerate === true,
                tutorName: options.reimbursementReceipt?.tutorName || ''
            },
            treatmentType: options.treatmentType || 'regular',
            evaluationStage: options.treatmentType === 'evaluation' ? 1 : null,
            evaluationMeta: options.treatmentType === 'evaluation' ? {
                plannedSessions: options.evaluationMeta?.plannedSessions ?? 3,
                optionalExtraEvaluation: options.evaluationMeta?.optionalExtraEvaluation === true,
                schedulingNotes: options.evaluationMeta?.schedulingNotes || ''
            } : null
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
 * Cancela (elimina) citas futuras de un paciente a partir de hoy.
 * Busca por patientId/profileId Y por nombre exacto (por si citas viejas no tienen id).
 * @param {string} patientName - Nombre del paciente
 * @param {string} [patientId] - ID del perfil (recomendado)
 * @returns {Promise<number>} - Número de citas eliminadas
 */
export async function cancelFutureAppointments(patientName, patientId = null) {
    try {
        // Medianoche local → ISO naive México (alineado con TimeManager / citas sin Z)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}T00:00`;

        const seen = new Set();
        const toDelete = [];

        const collect = (querySnapshot) => {
            querySnapshot.forEach((docSnapshot) => {
                if (seen.has(docSnapshot.id)) return;
                const appointment = docSnapshot.data();
                if (appointment.isCancelled) return;
                if (appointment.date >= todayIso) {
                    seen.add(docSnapshot.id);
                    toDelete.push(docSnapshot.ref);
                }
            });
        };

        if (patientId) {
            const byPatientId = await getDocs(query(
                collection(db, collectionPath),
                where('patientId', '==', patientId)
            ));
            collect(byPatientId);

            const byProfileId = await getDocs(query(
                collection(db, collectionPath),
                where('profileId', '==', patientId)
            ));
            collect(byProfileId);
        }

        if (patientName) {
            const byName = await getDocs(query(
                collection(db, collectionPath),
                where('name', '==', patientName)
            ));
            collect(byName);
        }

        // Firestore batch máx. 500
        let deletedCount = 0;
        for (let i = 0; i < toDelete.length; i += 450) {
            const chunk = toDelete.slice(i, i + 450);
            const batch = writeBatch(db);
            chunk.forEach((ref) => batch.delete(ref));
            await batch.commit();
            deletedCount += chunk.length;
        }

        if (deletedCount > 0) {
            console.log(`🗑️ Se eliminaron ${deletedCount} citas futuras/hoy para ${patientName || patientId}`);
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
export async function ensurePatientProfile(patientName, firstName = '', lastName = '', patientProfiles = [], options = {}) {
    const existing = patientProfiles.find(p => p.name === patientName);

    if (existing) {
        if (existing.isActive === false) {
            const inactivatedDate = existing.dateInactivated?.toDate?.() || new Date(existing.dateInactivated);
            const dateStr = inactivatedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            if (await ModalService.confirm(
                "Paciente Inactivo",
                `⚠️ <strong>${escapeHTML(patientName)}</strong> está dado/a de baja desde el ${dateStr}.<br><br>¿Desea reactivar y agendar?`,
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
    const result = await createPatientProfile(
        normalizeName(patientName), 
        normalizeName(firstName), 
        normalizeName(lastName), 
        options.therapist || 'diana', 
        options
    );
    if (!result.success) throw new Error(result.error);
    return { id: result.id, ...result.data };
}
