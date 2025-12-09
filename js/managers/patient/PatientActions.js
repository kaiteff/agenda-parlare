/**
 * PatientActions.js
 * Acciones CRUD para pacientes
 * 
 * Este módulo maneja:
 * - Creación de pacientes
 * - Actualización de datos
 * - Desactivación/reactivación
 * - Eliminación
 * - Marcado de pagos
 * - Confirmación de citas
 * 
 * NO maneja:
 * - Renderizado (ver PatientUI.js)
 * - Filtrado (ver PatientFilters.js)
 * - Estado (ver PatientState.js)
 * 
 * @module PatientActions
 */

import { db, updateDoc, doc, collectionPath } from '../../firebase.js';
import { createPatientProfile, deactivatePatient as deactivatePatientService, reactivatePatient as reactivatePatientService, deletePatientProfile } from '../../services/patientService.js';
import { PatientState } from './PatientState.js';
import { PatientModals } from './PatientModals.js';
import { AuthManager } from '../AuthManager.js';
import { ScheduleManager } from '../ScheduleManager.js';
import { ModalService } from '../../utils/ModalService.js';

/**
 * Acciones del usuario sobre pacientes
 */
export const PatientActions = {

    // ==========================================
    // CREACIÓN DE PACIENTES
    // ==========================================

    /**
     * Guarda un nuevo paciente
     * Lee los datos del modal y crea el perfil en Firestore
     * 
     * @returns {Promise<boolean>} true si se guardó correctamente
     */
    async saveNewPatient() {
        const { dom } = PatientState;

        const firstName = dom.newPatientFirstName?.value.trim();
        const lastName = dom.newPatientLastName?.value.trim();
        const therapist = dom.newPatientTherapist?.value || 'diana';

        // Validación
        if (!firstName || !lastName) {
            await ModalService.alert("Campos requeridos", "Por favor ingrese nombre y apellidos.", "warning");
            return false;
        }

        const fullName = `${firstName} ${lastName}`.trim();

        try {
            // Deshabilitar botón mientras guarda
            if (dom.saveNewPatientBtn) {
                dom.saveNewPatientBtn.disabled = true;
                dom.saveNewPatientBtn.textContent = 'Guardando...';
            }

            // Crear perfil
            const result = await createPatientProfile(fullName, firstName, lastName, therapist);

            if (result.success) {
                // Cerrar modal de nuevo paciente
                PatientModals.closeNewPatient();

                // Limpiar inputs
                if (dom.newPatientFirstName) dom.newPatientFirstName.value = '';
                if (dom.newPatientLastName) dom.newPatientLastName.value = '';

                // Cambiar a vista "Todos" si no está ahí
                if (PatientState.getViewMode() !== 'all') {
                    PatientState.setViewMode('all');
                }

                console.log('✅ PatientActions: Paciente creado:', fullName);

                // Abrir modal de agendar primera cita
                setTimeout(() => {
                    ScheduleManager.openModal(result.id, fullName, therapist);
                }, 300);

                return true;
            } else {
                await ModalService.alert("Error", 'Error al crear paciente: ' + result.error, "error");
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al guardar paciente:', error);
            await ModalService.alert("Error", 'Error: ' + error.message, "error");
            return false;
        } finally {
            // Rehabilitar botón
            if (dom.saveNewPatientBtn) {
                dom.saveNewPatientBtn.disabled = false;
                dom.saveNewPatientBtn.textContent = 'Crear Paciente';
            }
        }
    },

    // ==========================================
    // MARCADO DE PAGOS
    // ==========================================

    /**
     * Marca una cita como pagada
     * 
     * @param {string} appointmentId - ID de la cita
     * @param {Event} event - Evento del click (opcional)
     * @returns {Promise<boolean>} true si se marcó correctamente
     */
    async markAsPaid(appointmentId, event = null) {
        const button = event?.target;

        try {
            // Actualizar UI del botón
            if (button) {
                button.textContent = '⏳ Guardando...';
                button.disabled = true;
            }

            // Actualizar en Firestore
            await updateDoc(doc(db, collectionPath, appointmentId), {
                isPaid: true
            });

            // Feedback visual
            if (button) {
                button.textContent = '✓ Pagado!';
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-green-700', 'cursor-default');
            }

            // Si el modal de historial está abierto, actualizarlo
            setTimeout(() => {
                const selectedPatient = PatientState.getSelectedPatient();
                if (selectedPatient &&
                    !PatientState.dom.patientHistoryModal?.classList.contains('hidden')) {
                    // Será manejado por PatientModals cuando lo creemos
                    if (window.openPatientHistoryModal) {
                        window.openPatientHistoryModal(selectedPatient);
                    }
                }
            }, 300);

            console.log('✅ PatientActions: Pago marcado:', appointmentId);
            return true;

        } catch (error) {
            console.error('❌ PatientActions: Error al marcar pago:', error);
            await ModalService.alert("Error", 'Error al marcar como pagado: ' + error.message, "error");

            // Restaurar botón
            if (button) {
                button.textContent = '✓ Pagado';
                button.disabled = false;
            }

            return false;
        }
    },

    // ==========================================
    // CONFIRMACIÓN DE CITAS
    // ==========================================

    /**
     * Alterna el estado de confirmación de una cita
     * Busca la próxima cita del paciente (hoy o mañana)
     * 
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se cambió correctamente
     */
    async toggleConfirmation(patientName) {
        try {
            // Obtener la próxima cita (hoy o mañana) para este paciente
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Buscar en patientsData global (será inyectado)
            const patientsData = window.patientsData || [];

            // Buscar citas de hoy o mañana
            const upcomingAppointments = patientsData.filter(apt => {
                const aptDate = new Date(apt.date);
                return apt.name === patientName &&
                    aptDate >= today &&
                    aptDate < dayAfterTomorrow &&
                    !apt.isCancelled;
            }).sort((a, b) => new Date(a.date) - new Date(b.date));

            if (upcomingAppointments.length === 0) {
                await ModalService.alert("Sin Cita", "No se encontró cita para hoy o mañana", "info");
                return false;
            }

            const appointment = upcomingAppointments[0];
            const newStatus = !appointment.confirmed;

            // Actualizar en Firestore
            await updateDoc(doc(db, collectionPath, appointment.id), {
                confirmed: newStatus
            });

            const aptDate = new Date(appointment.date);
            const isToday = aptDate >= today && aptDate < tomorrow;
            const dayLabel = isToday ? 'hoy' : 'mañana';

            console.log(`✅ PatientActions: Cita de ${dayLabel} ${newStatus ? 'confirmada' : 'desconfirmada'} para ${patientName}`);

            // Forzar re-render de la lista para actualizar UI inmediatamente
            // El listener de Firestore también lo hará, pero esto asegura actualización inmediata
            const { PatientUI } = await import('./PatientUI.js');
            setTimeout(() => {
                PatientUI.renderList();
            }, 100);

            return true;

        } catch (error) {
            console.error('❌ PatientActions: Error al cambiar confirmación:', error);
            await ModalService.alert("Error", 'Error al cambiar confirmación: ' + error.message, "error");
            return false;
        }
    },

    // ==========================================
    // DESACTIVACIÓN/REACTIVACIÓN
    // ==========================================

    /**
     * Desactiva un paciente (soft delete)
     * 
     * @param {string} profileId - ID del perfil del paciente
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se desactivó correctamente
     */
    async deactivatePatient(profileId, patientName) {
        if (!await ModalService.confirm(
            "Dar de baja",
            `¿Estás seguro de dar de baja a "<strong>${patientName}</strong>"?<br><br>El paciente quedará inactivo pero sus datos se conservarán.`,
            "Dar de baja",
            "Cancelar"
        )) {
            return false;
        }

        try {
            const result = await deactivatePatientService(profileId);

            if (result.success) {
                await ModalService.alert("Éxito", `Paciente "${patientName}" dado de baja exitosamente.`, "success");

                // Cerrar modal de historial
                if (PatientState.dom.patientHistoryModal) {
                    PatientState.dom.patientHistoryModal.classList.add('hidden');
                }

                console.log('✅ PatientActions: Paciente desactivado:', patientName);
                return true;
            } else {
                await ModalService.alert("Error", 'Error al dar de baja: ' + result.error, "error");
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al desactivar:', error);
            await ModalService.alert("Error", 'Error: ' + error.message, "error");
            return false;
        }
    },

    /**
     * Reactiva un paciente
     * 
     * @param {string} profileId - ID del perfil del paciente
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se reactivó correctamente
     */
    async reactivatePatient(profileId, patientName) {
        if (!await ModalService.confirm("Reactivar Paciente", `¿Desea reactivar a "<strong>${patientName}</strong>"?`)) {
            return false;
        }

        try {
            const result = await reactivatePatientService(profileId);

            if (result.success) {
                await ModalService.alert("Éxito", `Paciente "${patientName}" reactivado exitosamente.`, "success");
                console.log('✅ PatientActions: Paciente reactivado:', patientName);
                return true;
            } else {
                await ModalService.alert("Error", 'Error al reactivar: ' + result.error, "error");
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al reactivar:', error);
            await ModalService.alert("Error", 'Error: ' + error.message, "error");
            return false;
        }
    },

    // ==========================================
    // ELIMINACIÓN PERMANENTE
    // ==========================================

    /**
     * Elimina un paciente permanentemente
     * CUIDADO: Esta acción no se puede deshacer
     * 
     * @param {string} profileId - ID del perfil del paciente
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deletePatient(profileId, patientName) {
        // Verificar permisos
        if (!AuthManager.isAdmin()) {
            await ModalService.alert("Acceso Denegado", 'Solo los administradores pueden eliminar pacientes permanentemente.', "error");
            return false;
        }

        if (!await ModalService.confirm(
            "⚠️ ELIMINAR PACIENTE ⚠️",
            `¿Estás COMPLETAMENTE SEGURO de eliminar PERMANENTEMENTE a "<strong>${patientName}</strong>"?<br><br>Esta acción NO SE PUEDE DESHACER.<br><br>Se eliminarán:<br>- El perfil del paciente<br>- TODO su historial de citas<br>- Todos los registros de pagos`,
            "ELIMINAR DEFINITIVAMENTE",
            "Cancelar",
            "danger"
        )) {
            return false;
        }

        // Doble confirmación
        const confirmation = prompt(`Para confirmar, escribe el nombre completo del paciente:\n"${patientName}"`);

        if (confirmation !== patientName) {
            await ModalService.alert("Error", 'Nombre incorrecto. Eliminación cancelada.', "error");
            return false;
        }

        try {
            const result = await deletePatientProfile(profileId, patientName);

            if (result.success) {
                await ModalService.alert("Éxito", `Paciente "${patientName}" eliminado permanentemente.`, "success");

                // Cerrar modal
                if (PatientState.dom.patientHistoryModal) {
                    PatientState.dom.patientHistoryModal.classList.add('hidden');
                }

                console.log('✅ PatientActions: Paciente eliminado:', patientName);
                return true;
            } else {
                await ModalService.alert("Error", 'Error al eliminar: ' + result.error, "error");
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al eliminar:', error);
            await ModalService.alert("Error", 'Error: ' + error.message, "error");
            return false;
        }
    },

    // ==========================================
    // ACTUALIZACIÓN DE TERAPEUTA
    // ==========================================

    /**
     * Actualiza el perfil del paciente (terapeuta, costo, etc.)
     * 
     * @param {string} profileId - ID del perfil del paciente
     * @param {Object} updates - Objeto con los campos a actualizar { therapist, defaultCost }
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se actualizó correctamente
     */
    async updatePatientProfile(profileId, updates, patientName) {
        try {
            const { updateDoc, doc } = await import('../../firebase.js');
            const { collection, query, where, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

            // 1. Update Profile
            const profileUpdates = {
                updatedBy: AuthManager.currentUser?.email || 'unknown',
                updatedAt: new Date()
            };
            if (updates.therapist) profileUpdates.therapist = updates.therapist;
            if (updates.defaultCost !== undefined) profileUpdates.defaultCost = updates.defaultCost;

            await updateDoc(doc(db, 'patientProfiles', profileId), profileUpdates);

            // 2. Update Future Appointments with 0 Cost (if cost changed)
            if (updates.defaultCost && updates.defaultCost > 0) {
                const now = new Date().toISOString();

                // Query future appointments for this patient
                // NOTE: We query only by name to avoid "Index Required" error
                const q = query(
                    collection(db, 'appointments'),
                    where('name', '==', patientName)
                );

                const snapshot = await getDocs(q);
                const batch = writeBatch(db);
                let updateCount = 0;

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();

                    // Filter in memory: Future dates AND (cost missing or 0)
                    if (data.date >= now && (!data.cost || data.cost === 0)) {
                        batch.update(docSnap.ref, { cost: updates.defaultCost });
                        updateCount++;
                    }
                });

                if (updateCount > 0) {
                    await batch.commit();
                    console.log(`✅ Updated ${updateCount} future appointments with 0 cost to ${updates.defaultCost}`);
                }
            }

            console.log(`✅ PatientActions: Perfil actualizado para ${patientName}`);
            return true;

        } catch (error) {
            console.error('❌ PatientActions: Error al actualizar perfil:', error);
            await ModalService.alert("Error", 'Error al actualizar perfil: ' + error.message, "error");
            return false;
        }
    },

    /**
     * Alterna la confirmación directamente por ID
     * @param {string} appointmentId
     * @param {boolean} currentStatus
     */
    async toggleConfirmationDirect(appointmentId, currentStatus) {
        try {
            await updateDoc(doc(db, collectionPath, appointmentId), {
                confirmed: !currentStatus
            });
            console.log('✅ PatientActions: Confirmación alternada para', appointmentId);
            return true;
        } catch (error) {
            console.error('❌ PatientActions: Error al toggleconfirm:', error);
            return false;
        }
    }
};
