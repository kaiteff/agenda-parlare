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
 * - Renderizado de lista (ver Sidebar.js → render())
 * - Filtrado (ver PatientFilters.js)
 * - Estado (ver PatientState.js)
 * 
 * @module PatientActions
 */

import { db, updateDoc, doc, collectionPath, patientProfilesPath, collection, query, where, getDocs, getDoc, serverTimestamp } from '../../firebase.js';
import { createPatientProfile, deactivatePatient as deactivatePatientService, reactivatePatient as reactivatePatientService, deletePatientProfile, getReimbursementReceiptFromDom } from '../../services/patientService.js';
import { PatientState } from './PatientState.js';
import { PatientFilters } from './PatientFilters.js';
import { PatientModals } from './PatientModals.js';
import { AuthManager } from '../AuthManager.js';
import { ScheduleManager } from '../ScheduleManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { SheetService } from '../../services/google/SheetService.js';
import { GoogleAuthService } from '../../services/google/GoogleAuthService.js';
import { escapeHTML } from '../../utils/sanitize.js';
// Redundant CDN imports removed for consistency

/**
 * Obtiene el clinicFee de un paciente consultando Firestore directamente.
 * Evita depender del estado en memoria (PatientState.patients) que puede estar filtrado por terapeuta.
 * @param {string} patientName
 * @param {string} [therapist] - Terapeuta para fallback desde config viva del panel
 * @returns {Promise<number>} clinicFee del paciente o cuota configurada del terapeuta
 */
async function _getClinicFeeForPatient(patientName, therapist = 'diana') {
    try {
        // Primero intentar desde el estado en memoria (más rápido)
        const fromState = PatientState.patients.find(
            p => p.name?.toLowerCase() === patientName?.toLowerCase()
        );
        if (fromState) {
            if (fromState.therapist) therapist = fromState.therapist;
            if (fromState.clinicFee !== undefined && fromState.clinicFee !== null) {
                return parseFloat(fromState.clinicFee);
            }
        }

        // Si no está en memoria, consultar Firestore directamente
        const q = query(
            collection(db, patientProfilesPath),
            where('name', '==', patientName)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const profileData = snap.docs[0].data();
            if (profileData.therapist) therapist = profileData.therapist;
            if (profileData.clinicFee !== undefined && profileData.clinicFee !== null) {
                console.log(`💰 clinicFee para "${patientName}" (Firestore): ${profileData.clinicFee}`);
                return parseFloat(profileData.clinicFee);
            }
        }

        const fallback = AuthManager.getTherapistDefaults(therapist).clinicFee;
        console.warn(`⚠️ No se encontró clinicFee para "${patientName}", usando config del terapeuta: ${fallback}`);
        return fallback;
    } catch (err) {
        console.error('❌ Error obteniendo clinicFee:', err);
        return AuthManager.getTherapistDefaults(therapist).clinicFee;
    }
}

/**
 * Formatea un nombre a "Proper Case" (Primera letra mayúscula, el resto minúscula)
 * @param {string} str 
 * @returns {string}
 */
function _toProperCase(str) {
    if (!str) return '';
    return str.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

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
        console.log('🚀 PatientActions: Iniciando guardado de nuevo paciente...');
        const { dom } = PatientState;

        const firstName = dom.newPatientFirstName?.value.trim();
        const lastName = dom.newPatientLastName?.value.trim();
        const therapist = dom.newPatientTherapist?.value || 'diana';
        const therapistDefaults = AuthManager.getTherapistDefaults(therapist);
        const defaultCost = dom.newPatientDefaultCost ? parseFloat(dom.newPatientDefaultCost.value) : 0;
        const parsedClinicFee = parseFloat(dom.newPatientClinicFee?.value);
        const clinicFee = Number.isFinite(parsedClinicFee) ? parsedClinicFee : therapistDefaults.clinicFee;
        const phone = dom.newPatientPhone?.value.trim() || '';
        const parentName = dom.newPatientParentName?.value.trim() || '';
        const wantsWhatsapp = document.getElementById('newPatientWantsWhatsapp')?.checked !== false;
        const birthday = document.getElementById('newPatientBirthday')?.value || '';

        // Validación
        if (!firstName || !lastName) {
            ToastService.warning("Por favor ingrese nombre y apellidos.");
            return false;
        }

        // Formatear a Proper Case
        const formattedFirstName = _toProperCase(firstName);
        const formattedLastName = _toProperCase(lastName);
        const fullName = `${formattedFirstName} ${formattedLastName}`.trim();

        // Obtener teléfono y país por separado
        const countryCode = document.getElementById('newPatientCountryCode')?.value || '52';
        let phoneDigits = phone.replace(/\D/g, '');

        // Si el usuario escribió el código de país por error al inicio (ej: 5233...), lo removemos
        // Solo si después de quitarlo quedan 10 dígitos (para México)
        if (countryCode === '52' && phoneDigits.startsWith('52') && phoneDigits.length > 10) {
            phoneDigits = phoneDigits.substring(2);
        } else if (phoneDigits.startsWith(countryCode) && phoneDigits.length > 8) {
             // Caso general para otros países si el número es largo
             phoneDigits = phoneDigits.substring(countryCode.length);
        }

        try {
            // Deshabilitar botón mientras guarda
            if (dom.saveNewPatientBtn) {
                if (dom.saveNewPatientBtn.disabled) return false; // Prevent double click
                dom.saveNewPatientBtn.disabled = true;
                dom.saveNewPatientBtn.textContent = 'Guardando...';
            }

            // Crear perfil (con datos extra)
            const result = await createPatientProfile(fullName, formattedFirstName, formattedLastName, therapist, { 
                defaultCost, 
                clinicFee, 
                phone: phoneDigits, 
                countryCode: countryCode, // Nuevo: Guardar por separado
                parentName: _toProperCase(parentName), 
                wantsWhatsapp,
                birthday,
                reimbursementReceipt: getReimbursementReceiptFromDom('newPatient')
            });

            if (result.success) {
                // Cerrar modal de nuevo paciente
                PatientModals.closeNewPatient();

                // Limpiar inputs
                if (dom.newPatientFirstName) dom.newPatientFirstName.value = '';
                if (dom.newPatientLastName) dom.newPatientLastName.value = '';
                const phoneInput = document.getElementById('newPatientPhone');
                if (phoneInput) phoneInput.value = '';

                // Cambiar a vista "Todos" si no está ahí
                if (PatientState.getViewMode() !== 'all') {
                    PatientState.setViewMode('all');
                }

                console.log('✅ PatientActions: Paciente creado:', fullName);

                const { PatientManager } = await import('../PatientManager.js');
                await PatientManager.refreshProfiles(true);

                // Abrir modal de agendar primera cita
                setTimeout(() => {
                    ScheduleManager.openModal(result.id, fullName, therapist, defaultCost);
                }, 300);

                return true;
            } else {
                ToastService.error('Error al crear paciente: ' + result.error);
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

            // 0. PRE-AUTH: Pedir token inmediatamente para evitar bloqueo de popup en móviles
            // Al hacerlo aquí, estamos dentro del "contexto de interacción del usuario" (click)
            try {
                // ToastService.info("DEBUG: Iniciando autenticación...");
                await GoogleAuthService.ensureToken();
                // ToastService.success("DEBUG: Auth OK");
            } catch (authErr) {
                console.error("❌ Auth pre-check failed:", authErr);
                ToastService.error("Error Auth: " + (authErr.message || JSON.stringify(authErr)));
                // Si falla el auth, no seguimos, pero el error ya fue manejado/logueado en el servicio
                // Dejamos que el bloque catch principal maneje la restauración de UI
                throw authErr;
            }

            // 1. Obtener datos para Sheet (antes o durante el update)
            const aptRef = doc(db, collectionPath, appointmentId);
            const aptSnap = await getDoc(aptRef);
            const aptData = aptSnap.exists() ? aptSnap.data() : null;

            if (!aptData) {
                ToastService.error("Error: No se encontró la cita.");
                return false;
            }

            // VALIDACIÓN: No permitir pagos de $0 (a menos que sea anulación)
            if (!aptData.isPaid && (aptData.cost === undefined || aptData.cost <= 0)) {
                ToastService.warning("⚠️ No se puede registrar un pago de $0. Edita la cita primero.");
                if (button) {
                    button.textContent = '$ Pagar';
                    button.disabled = false;
                }
                return false;
            }

            // CHECK: Toggle de Pago (Pagar o Anular)
            if (aptData.isPaid) {
                // CASO 1: YA ESTABA PAGADO -> ANULAR (REEMBOLSO EN SHEETS)

                if (!await ModalService.confirm("Anular Pago", `Esta cita ya está pagada. ¿Deseas <b>ANULAR</b> el pago?<br><br>Esto registrará un monto negativo en Excel para cancelar la suma.`)) {
                    // Restaurar botón si cancela
                    if (button) {
                        button.textContent = '✓ Pagado';
                        button.disabled = false;
                        button.classList.add('bg-green-700');
                    }
                    return true; // No hacemos cambios
                }

                // A. Actualizar DB (Quitar pagado)
                await updateDoc(aptRef, { isPaid: false });

                // B. Registrar Negativo en Sheets
                const cost = aptData.cost || 0;

                // Buscar Clinic Fee leyendo directo de Firestore para evitar desfase de estado en memoria
                const clinicFee = await _getClinicFeeForPatient(aptData.name, aptData.therapist);

                SheetService.logPayment({
                    date: aptData.date,
                    patientName: aptData.name,
                    amount: -Math.abs(cost), // Monto negativo (corrección)
                    status: "ANULADO",
                    therapist: aptData.therapist || 'diana',
                    clinicFee: clinicFee
                }).then(success => {
                    if (success) updateDoc(aptRef, { sheetSynced: true });
                }).catch(err => console.error("Error logging reversal:", err));

                // C. Feedback UI
                ToastService.info("Pago ANULADO correctamente");

                // Actualizar botón visualmente al estado "Por Pagar"
                if (button) {
                    button.textContent = 'Marcar Pagado';
                    button.classList.remove('bg-green-700', 'cursor-default');
                    button.classList.add('bg-green-600', 'hover:bg-green-700');
                    button.disabled = false;
                }

            } else {
                // CASO 2: NO ESTABA PAGADO -> PAGAR NORMAL

                await updateDoc(aptRef, { isPaid: true });

                const cost = aptData.cost || 0;

                // Buscar Clinic Fee leyendo directo de Firestore para evitar desfase de estado en memoria
                const clinicFee = await _getClinicFeeForPatient(aptData.name || '', aptData.therapist);

                SheetService.logPayment({
                    date: aptData.date || new Date().toISOString(),
                    patientName: aptData.name || 'Desconocido',
                    amount: Math.abs(cost),
                    status: "Pagado",
                    therapist: aptData.therapist || 'diana',
                    clinicFee: clinicFee
                }).then(success => {
                    if (success) updateDoc(aptRef, { sheetSynced: true });
                }).catch(err => console.error("Error logging payment:", err));

                ToastService.success("Pago registrado correctamente");

                if (button) {
                    button.textContent = '✓ Pagado!';
                    button.classList.remove('bg-green-600', 'hover:bg-green-700');
                    button.classList.add('bg-green-700', 'cursor-default'); // Visualmente 'disabled'
                    // No deshabilitamos 'true' para permitir anular después si se equivocó
                    button.disabled = false;
                }
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
            ToastService.success("Pago registrado correctamente");
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
                ToastService.info("No se encontró cita para hoy o mañana", 2000);
                return false;
            }

            const appointment = upcomingAppointments[0];
            const newStatus = !appointment.confirmed;

            // Actualizar en Firestore
            await updateDoc(doc(db, collectionPath, appointment.id), {
                confirmed: newStatus
            });

            // Log en Sheet
            SheetService.logAttendance({
                date: appointment.date,
                patientName: patientName,
                status: newStatus ? "CONFIRMADO" : "PENDIENTE",
                therapist: appointment.therapist
            }).catch(e => console.error("Error logging attendance:", e));

            const aptDate = new Date(appointment.date);
            const isToday = aptDate >= today && aptDate < tomorrow;
            const dayLabel = isToday ? 'hoy' : 'mañana';

            console.log(`✅ PatientActions: Cita de ${dayLabel} ${newStatus ? 'confirmada' : 'desconfirmada'} para ${patientName}`);

            ToastService.success(`Cita de ${dayLabel} ${newStatus ? 'CONFIRMADA' : 'Marcada como Pendiente'}`);

            // Forzar re-render de la lista para actualizar UI inmediatamente
            // El listener de Firestore también lo hará, pero esto asegura actualización inmediata
            const { Sidebar } = await import('../../components/Sidebar.js');
            setTimeout(() => Sidebar.render(), 100);

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
        // Calcular deuda pendiente antes de confirmar
        const pendingApts = PatientFilters.getPendingPayments(patientName);
        const totalDebt = pendingApts.reduce((sum, apt) => sum + (parseFloat(apt.cost) || 0), 0);

        let confirmMessage = `¿Estás seguro de dar de baja a "<strong>${escapeHTML(patientName)}</strong>"?<br><br>El paciente quedará inactivo pero sus datos se conservarán.`;

        if (totalDebt > 0) {
            confirmMessage += `<br><br><div class="bg-red-50 p-3 rounded border border-red-200 text-red-700 font-bold text-center">⚠️ ALERTA DE DEUDA ⚠️<br>Este paciente debe: $${totalDebt}</div>`;
        }

        if (!await ModalService.confirm(
            "Dar de baja",
            confirmMessage,
            "Dar de baja",
            "Cancelar"
        )) {
            return false;
        }

        try {
            // Recopilar info para recordatorio antes de borrar
            let legacyData = null;
            const appointments = PatientState.appointments || [];
            // Buscar última/próxima cita representativa para guardar costo y horario
            const recentApt = appointments
                .filter(a => a.name === patientName && !a.isCancelled)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // La más reciente o futura

            if (recentApt) {
                const dateObj = new Date(recentApt.date);
                const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                legacyData = {
                    usualDay: days[dateObj.getDay()],
                    usualTime: dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    lastCost: recentApt.cost
                };
            }

            // 1. Cancelar citas futuras
            const { cancelFutureAppointments } = await import('../../services/patientService.js');
            await cancelFutureAppointments(patientName);

            // 2. Desactivar perfil guardando recordatorio
            const result = await deactivatePatientService(profileId, null, legacyData);

            if (result.success) {
                ToastService.success(`Paciente "${patientName}" dado de baja exitosamente.`);

                // Cerrar modal de historial
                if (PatientState.dom.patientHistoryModal) {
                    PatientState.dom.patientHistoryModal.classList.add('hidden');
                }

                console.log('✅ PatientActions: Paciente desactivado:', patientName);
                const { PatientManager } = await import('../PatientManager.js');
                await PatientManager.refreshProfiles(true);
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
        if (!await ModalService.confirm("Reactivar Paciente", `¿Desea reactivar a "<strong>${escapeHTML(patientName)}</strong>"?`)) {
            return false;
        }

        try {
            const result = await reactivatePatientService(profileId);

            if (result.success) {
                ToastService.success(`Paciente "${patientName}" reactivado exitosamente.`);
                console.log('✅ PatientActions: Paciente reactivado:', patientName);
                const { PatientManager } = await import('../PatientManager.js');
                await PatientManager.refreshProfiles(true);
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
            `¿Estás COMPLETAMENTE SEGURO de eliminar PERMANENTEMENTE a "<strong>${escapeHTML(patientName)}</strong>"?<br><br>Esta acción NO SE PUEDE DESHACER.<br><br>Se eliminarán:<br>- El perfil del paciente<br>- TODO su historial de citas<br>- Todos los registros de pagos`,
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
                ToastService.success(`Paciente "${patientName}" eliminado permanentemente.`);

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
            const { writeBatch } = await import('../../firebase.js');

            // 1. Update Profile
            const profileUpdates = {
                updatedBy: AuthManager.currentUser?.email || 'unknown',
                updatedAt: new Date()
            };
            if (updates.therapist) profileUpdates.therapist = updates.therapist;
            if (updates.defaultCost !== undefined) profileUpdates.defaultCost = updates.defaultCost;
            if (updates.clinicFee !== undefined) profileUpdates.clinicFee = updates.clinicFee;
            if (updates.parentName !== undefined) profileUpdates.parentName = _toProperCase(updates.parentName);
            if (updates.wantsWhatsapp !== undefined) profileUpdates.wantsWhatsapp = updates.wantsWhatsapp;
            if (updates.recurrentOptIn !== undefined) profileUpdates.recurrentOptIn = updates.recurrentOptIn;
            if (updates.assignedThemes !== undefined) profileUpdates.assignedThemes = updates.assignedThemes;
            if (updates.assignedSubthemes !== undefined) profileUpdates.assignedSubthemes = updates.assignedSubthemes;
            if (updates.birthday !== undefined) profileUpdates.birthday = updates.birthday;
            if (updates.reimbursementReceipt !== undefined) {
                profileUpdates.reimbursementReceipt = {
                    autoGenerate: updates.reimbursementReceipt.autoGenerate === true,
                    tutorName: updates.reimbursementReceipt.tutorName || ''
                };
            }

            // Handle phone with country code (Normalizado)
            if (updates.phone !== undefined) {
                const countryCode = document.getElementById('editPatientCountryCode')?.value || '52';
                let phoneDigits = updates.phone.replace(/\D/g, '');
                
                // Limpieza: Si incluyeron el prefijo por error
                if (countryCode === '52' && phoneDigits.startsWith('52') && phoneDigits.length > 10) {
                    phoneDigits = phoneDigits.substring(2);
                } else if (phoneDigits.startsWith(countryCode) && phoneDigits.length > 8) {
                    phoneDigits = phoneDigits.substring(countryCode.length);
                }

                profileUpdates.phone = phoneDigits;
                profileUpdates.countryCode = countryCode;
            }

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

            // 3. Sincronizar cambios en Google Calendar para citas futuras
            const { GoogleCalendarService } = await import('../../services/google/GoogleCalendarService.js');
            const { CalendarState } = await import('../../modules/calendar/CalendarState.js');
            
            const futureApts = (CalendarState.appointments || []).filter(apt => 
                apt.name === patientName && 
                !apt.isCancelled && 
                new Date(apt.date) >= new Date()
            );

            if (futureApts.length > 0) {
                console.log(`📅 PatientActions: Sincronizando ${futureApts.length} citas con info actualizada de perfil...`);
                for (const apt of futureApts) {
                    await GoogleCalendarService.updateEvent(apt);
                }
            }

            console.log(`✅ PatientActions: Perfil actualizado para ${patientName}`);
            const { PatientManager } = await import('../PatientManager.js');
            await PatientManager.refreshProfiles(true);
            ToastService.success("Perfil actualizado correctamente");
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
            const newStatus = !currentStatus;
            const userName = AuthManager.currentUser?.displayName || AuthManager.currentUser?.email || 'unknown';
            
            const updateData = { 
                confirmed: newStatus,
                confirmedAt: newStatus ? serverTimestamp() : null,
                confirmedBy: newStatus ? userName : null
            };

            await updateDoc(doc(db, collectionPath, appointmentId), { ...updateData });
            console.log('✅ PatientActions: Confirmación alternada para', appointmentId, 'por', userName);
            ToastService.success(newStatus ? 'Asistencia CONFIRMADA' : 'Asistencia PENDIENTE');

            return true;
        } catch (error) {
            console.error('❌ PatientActions: Error al toggleconfirm:', error);
            return false;
        }
    },

    /**
     * Actualiza la bitácora / progreso clínico de una cita
     * MIGRACIÓN PRIVACIDAD: Ahora guarda en una colección independiente protegida 'clinicalNotes'
     * @param {string} appointmentId 
     * @param {Object} clinicalProgress 
     * @param {string} therapist - El terapeuta dueño de la nota
     */
    async updateAppointmentNote(appointmentId, clinicalProgress, therapist = 'diana') {
        try {
            const { db, doc, setDoc, updateDoc } = await import('../../firebase.js');
            
            // 1. Guardar en la nueva colección PROTEGIDA
            // Usamos el appointmentId como ID del documento para que sea fácil de encontrar
            const noteRef = doc(db, 'clinicalNotes', appointmentId);
            await setDoc(noteRef, {
                appointmentId: appointmentId,
                clinicalProgress: clinicalProgress,
                therapist: therapist, // CRÍTICO: Esto activa la regla de seguridad de Firestore
                updatedAt: new Date().toISOString(),
                updatedBy: AuthManager.currentUser?.email || 'unknown'
            }, { merge: true });

            // 2. Opcional: Marcar en la cita original que YA tiene bitácora (sin guardar el contenido sensible)
            // Esto sirve para mostrar el icono de "Bitácora ✓" sin exponer el texto
            const appointmentRef = doc(db, 'appointments', appointmentId);
            await updateDoc(appointmentRef, {
                hasClinicalNote: true,
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ PatientActions: Bitácora PROTEGIDA actualizada para', appointmentId);
            return true;
        } catch (error) {
            console.error('❌ PatientActions: Error al actualizar bitácora protegida:', error);
            ToastService.error("Error de permisos al guardar la nota.");
            return false;
        }
    }
};
