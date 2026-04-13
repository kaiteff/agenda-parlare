import { db, updateDoc, doc, collectionPath, patientsData, patientProfiles, deleteDoc, patientProfilesPath } from '../firebase.js';
import { togglePaymentStatus, cancelAppointment } from '../services/appointmentService.js';
import { deactivatePatient as deactivatePatientService, reactivatePatient as reactivatePatientService, createPatientProfile } from '../services/patientService.js';
import { state } from './state.js';
import { renderPatientsList } from './ui.js';

// Marcar pago pendiente como pagado rápidamente
export async function quickMarkAsPaid(appointmentId) {
    // Obtener el botón que disparó el evento
    const button = event?.target;

    // Feedback visual inmediato
    if (button) {
        const originalText = button.textContent;
        button.textContent = '⏳ Guardando...';
        button.disabled = true;
    }

    try {
        await updateDoc(doc(db, collectionPath, appointmentId), {
            isPaid: true
        });

        // Feedback de éxito
        if (button) {
            button.textContent = '✓ Pagado!';
            button.classList.remove('bg-green-600', 'hover:bg-green-700');
            button.classList.add('bg-green-700', 'cursor-default');
        }

        // Esperar un momento para que Firebase actualice los listeners
        setTimeout(() => {
            // Si el modal de historial está abierto, actualizarlo
            if (state.selectedPatient && !state.dom.patientHistoryModal.classList.contains('hidden')) {
                window.openPatientHistoryModal(state.selectedPatient);
            }
            // La lista de pacientes se actualizará automáticamente por el listener de Firebase
        }, 300);

    } catch (e) {
        console.error("Error al marcar como pagado:", e);
        alert("Error al marcar como pagado: " + e.message);

        // Restaurar botón en caso de error
        if (button) {
            button.textContent = '✓ Pagado';
            button.disabled = false;
        }
    }
}

// Toggle confirmación desde lista de pacientes
export async function toggleConfirmationFromList(patientName) {
    try {
        // Obtener la próxima cita de mañana para este paciente
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const tomorrowAppointments = patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return apt.name === patientName &&
                aptDate >= tomorrow &&
                aptDate < dayAfter &&
                !apt.isCancelled;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (tomorrowAppointments.length === 0) {
            alert('No se encontró cita para mañana');
            return;
        }

        const appointment = tomorrowAppointments[0];
        const newStatus = !appointment.confirmed;

        await updateDoc(doc(db, collectionPath, appointment.id), {
            confirmed: newStatus
        });

        console.log(`Cita ${newStatus ? 'confirmada' : 'desconfirmada'} para ${patientName}`);
    } catch (error) {
        console.error('Error al cambiar confirmación:', error);
        alert('Error al cambiar confirmación: ' + error.message);
    }
}

// Manejar guardado del nuevo paciente
export async function handleSaveNewPatient() {
    const firstName = state.dom.newPatientFirstName.value.trim();
    const lastName = state.dom.newPatientLastName.value.trim();

    if (!firstName || !lastName) {
        alert("Por favor ingrese nombre y apellidos.");
        return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const existing = patientProfiles.find(p => p.name.toLowerCase() === fullName.toLowerCase());

    if (existing) {
        if (existing.isActive !== false) {
            alert(`El paciente "${existing.name}" ya existe en la lista de activos.`);
            if (state.viewMode !== 'all') { state.viewMode = 'all'; renderPatientsList(); }
            state.dom.newPatientModal.classList.add('hidden');
            return;
        } else {
            if (confirm(`El paciente "${existing.name}" está en la lista de bajas. ¿Desea reactivarlo?`)) {
                await reactivatePatient(existing.id, existing.name);
                state.dom.newPatientModal.classList.add('hidden');
                return;
            }
        }
    }

    try {
        state.dom.saveNewPatientBtn.disabled = true;
        state.dom.saveNewPatientBtn.textContent = "Guardando...";

        const result = await createPatientProfile(fullName, firstName, lastName);

        if (result.success) {
            alert(`Paciente "${fullName}" creado exitosamente.`);
            state.dom.newPatientModal.classList.add('hidden');
            if (state.viewMode !== 'all') {
                state.viewMode = 'all';
                renderPatientsList();
            }
        } else {
            alert("Error al crear paciente: " + result.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        state.dom.saveNewPatientBtn.disabled = false;
        state.dom.saveNewPatientBtn.textContent = "Crear Paciente";
    }
}

// Dar de baja paciente
export async function deactivatePatient(profileId, patientName) {
    // 1. Análisis de Citas
    const now = new Date();
    const patientAppointments = patientsData.filter(apt => apt.name === patientName && !apt.isCancelled);

    const pendingDebts = patientAppointments.filter(apt => {
        const d = new Date(apt.date);
        return d < now && !apt.isPaid;
    });

    const futureAppointments = patientAppointments.filter(apt => {
        const d = new Date(apt.date);
        return d > now;
    });

    // 2. Confirmación Inicial
    let message = `¿Está seguro de dar de baja a ${patientName}?\n\n`;
    if (futureAppointments.length > 0) {
        message += `⚠️ Se CANCELARÁN ${futureAppointments.length} citas futuras programadas.\n`;
    }
    if (pendingDebts.length > 0) {
        const totalDebt = pendingDebts.reduce((sum, apt) => sum + (parseFloat(apt.cost) || 0), 0);
        message += `⚠️ Tiene ${pendingDebts.length} citas pasadas sin pagar (Total: $${totalDebt}).\n`;
    }
    message += `\nEl historial se preservará pero el paciente no aparecerá en la lista activa.`;

    if (!confirm(message)) return;

    try {
        // 3. Manejo de Adeudos
        if (pendingDebts.length > 0) {
            const payDebts = confirm(`El paciente tiene adeudos pendientes.\n¿Desea marcar estas ${pendingDebts.length} citas como PAGADAS antes de dar de baja?`);
            if (payDebts) {
                for (const apt of pendingDebts) {
                    await togglePaymentStatus(apt.id, false); // false = current status (pending), so it toggles to true (paid)
                }
            }
        }

        // 4. Cancelación de Citas Futuras
        if (futureAppointments.length > 0) {
            for (const apt of futureAppointments) {
                await cancelAppointment(apt.id);
            }
        }

        // 5. Desactivación del Perfil
        const sortedApts = patientAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastSession = sortedApts.length > 0 ? sortedApts[0].date : null;

        const result = await deactivatePatientService(profileId, lastSession ? new Date(lastSession) : null);

        if (result.success) {
            window.closePatientHistoryModal();
            alert(`${patientName} ha sido dado de baja exitosamente.\nSe cancelaron ${futureAppointments.length} citas futuras.`);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error("Error deactivating patient:", e);
        alert("Error al dar de baja: " + e.message);
    }
}

// Reactivar paciente
export async function reactivatePatient(profileId, patientName) {
    if (!confirm(`¿Desea reactivar a ${patientName}?`)) return;

    try {
        const result = await reactivatePatientService(profileId);
        if (result.success) {
            alert(`${patientName} ha sido reactivado exitosamente.`);
            window.openInactivePatientsModal(); // Refrescar lista
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error("Error reactivating patient:", e);
        alert("Error al reactivar: " + e.message);
    }
}

// Reagendar cita cancelada
export async function rescheduleAppointment(appointmentId) {
    const appointment = patientsData.find(a => a.id === appointmentId);
    if (!appointment) return;

    const newDateStr = prompt(`Reagendar cita de ${appointment.name}\n\nIngrese la nueva fecha y hora (formato: YYYY-MM-DD HH:MM):`);
    if (!newDateStr) return;

    try {
        const newDate = new Date(newDateStr.replace(' ', 'T'));
        if (isNaN(newDate.getTime())) {
            alert('Fecha inválida. Use el formato: YYYY-MM-DD HH:MM');
            return;
        }

        await updateDoc(doc(db, collectionPath, appointmentId), {
            date: newDate.toISOString(),
            isCancelled: false,
            cancelledAt: null
        });

        alert(`Cita reagendada para ${newDate.toLocaleString('es-ES')}`);
    } catch (e) {
        console.error('Error al reagendar:', e);
        alert('Error al reagendar: ' + e.message);
    }
}

// Eliminar paciente definitivamente
export async function deletePatient(patient) {
    if (!confirm(`¿Eliminar definitivamente a ${patient.name}? Esta acción no se puede revertir.`)) return;
    try {
        // Eliminar perfil
        await deleteDoc(doc(db, patientProfilesPath, patient.id));
        // Eliminar citas asociadas
        const patientApts = patientsData.filter(a => a.name === patient.name);
        for (const apt of patientApts) {
            await deleteDoc(doc(db, collectionPath, apt.id));
        }
        window.closePatientHistoryModal();
        alert(`${patient.name} ha sido eliminado.`);
    } catch (e) {
        console.error('Error al eliminar paciente:', e);
        alert('Error al eliminar paciente: ' + e.message);
    }
}
