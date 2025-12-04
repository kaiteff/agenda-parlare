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
import { AuthManager } from '../AuthManager.js';

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
            alert('Por favor ingrese nombre y apellidos.');
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
                alert(`Paciente "${fullName}" creado exitosamente.`);

                // Cerrar modal
                if (dom.newPatientModal) {
                    dom.newPatientModal.classList.add('hidden');
                }

                // Limpiar inputs
                if (dom.newPatientFirstName) dom.newPatientFirstName.value = '';
                if (dom.newPatientLastName) dom.newPatientLastName.value = '';

                // Cambiar a vista "Todos" si no está ahí
                if (PatientState.getViewMode() !== 'all') {
                    PatientState.setViewMode('all');
                }

                // Re-renderizar lista (será manejado por el listener de Firestore)
                console.log('✅ PatientActions: Paciente creado:', fullName);
                return true;
            } else {
                alert('Error al crear paciente: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al guardar paciente:', error);
            alert('Error: ' + error.message);
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
            alert('Error al marcar como pagado: ' + error.message);

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
                alert('No se encontró cita para hoy o mañana');
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
            return true;

        } catch (error) {
            console.error('❌ PatientActions: Error al cambiar confirmación:', error);
            alert('Error al cambiar confirmación: ' + error.message);
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
        if (!confirm(`¿Estás seguro de dar de baja a "${patientName}"?\n\nEl paciente quedará inactivo pero sus datos se conservarán.`)) {
            return false;
        }

        try {
            const result = await deactivatePatientService(profileId);

            if (result.success) {
                alert(`Paciente "${patientName}" dado de baja exitosamente.`);

                // Cerrar modal de historial
                if (PatientState.dom.patientHistoryModal) {
                    PatientState.dom.patientHistoryModal.classList.add('hidden');
                }

                console.log('✅ PatientActions: Paciente desactivado:', patientName);
                return true;
            } else {
                alert('Error al dar de baja: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al desactivar:', error);
            alert('Error: ' + error.message);
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
        if (!confirm(`¿Reactivar a "${patientName}"?`)) {
            return false;
        }

        try {
            const result = await reactivatePatientService(profileId);

            if (result.success) {
                alert(`Paciente "${patientName}" reactivado exitosamente.`);
                console.log('✅ PatientActions: Paciente reactivado:', patientName);
                return true;
            } else {
                alert('Error al reactivar: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al reactivar:', error);
            alert('Error: ' + error.message);
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
            alert('Solo los administradores pueden eliminar pacientes permanentemente.');
            return false;
        }

        if (!confirm(`⚠️ ADVERTENCIA ⚠️\n\n¿Estás COMPLETAMENTE SEGURO de eliminar PERMANENTEMENTE a "${patientName}"?\n\nEsta acción NO SE PUEDE DESHACER.\n\nSe eliminarán:\n- El perfil del paciente\n- TODO su historial de citas\n- Todos los registros de pagos\n\n¿Continuar?`)) {
            return false;
        }

        // Doble confirmación
        const confirmation = prompt(`Para confirmar, escribe el nombre completo del paciente:\n"${patientName}"`);

        if (confirmation !== patientName) {
            alert('Nombre incorrecto. Eliminación cancelada.');
            return false;
        }

        try {
            const result = await deletePatientProfile(profileId);

            if (result.success) {
                alert(`Paciente "${patientName}" eliminado permanentemente.`);

                // Cerrar modal
                if (PatientState.dom.patientHistoryModal) {
                    PatientState.dom.patientHistoryModal.classList.add('hidden');
                }

                console.log('✅ PatientActions: Paciente eliminado:', patientName);
                return true;
            } else {
                alert('Error al eliminar: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ PatientActions: Error al eliminar:', error);
            alert('Error: ' + error.message);
            return false;
        }
    },

    // ==========================================
    // ACTUALIZACIÓN DE TERAPEUTA
    // ==========================================

    /**
     * Actualiza el terapeuta asignado a un paciente
     * 
     * @param {string} profileId - ID del perfil del paciente
     * @param {string} newTherapist - Nuevo terapeuta ('diana' o 'sam')
     * @param {string} patientName - Nombre del paciente
     * @returns {Promise<boolean>} true si se actualizó correctamente
     */
    async updatePatientTherapist(profileId, newTherapist, patientName) {
        try {
            const { updateDoc, doc } = await import('../../firebase.js');

            await updateDoc(doc(db, 'patientProfiles', profileId), {
                therapist: newTherapist,
                updatedBy: AuthManager.currentUser?.email || 'unknown',
                updatedAt: new Date()
            });

            console.log(`✅ PatientActions: Terapeuta actualizado para ${patientName}: ${newTherapist}`);
            return true;

        } catch (error) {
            console.error('❌ PatientActions: Error al actualizar terapeuta:', error);
            alert('Error al actualizar terapeuta: ' + error.message);
            return false;
        }
    }
};
