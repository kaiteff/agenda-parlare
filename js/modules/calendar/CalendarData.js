/**
 * CalendarData.js
 * Gestiona la capa de datos del calendario y la comunicación con Firebase
 */

import { db, collectionPath, patientProfilesPath, collection, onSnapshot, query, where } from '../../firebase.js';
import { CalendarState } from './CalendarState.js';
import { createAppointment, updateAppointment, deleteAppointment, togglePaymentStatus, toggleConfirmationStatus, cancelAppointment } from '../../services/appointmentService.js';
import { SheetService } from '../../services/google/SheetService.js';
import { getDocs, getDoc, doc, query as fsQuery, where as fsWhere } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuthManager } from '../../managers/AuthManager.js';
import { ToastService } from '../../utils/ToastService.js';
import { alignClinicFeeSnapshot, buildSheetFinancialPayload, resolveClinicFeeFromAppointment } from '../../utils/appointmentFinancials.js';

/**
 * Obtiene el clinicFee de un paciente desde Firestore.
 * @param {string} patientName
 * @returns {Promise<number>}
 */
async function getClinicFee(patientName, therapist = 'diana') {
    try {
        const q = fsQuery(
            collection(db, patientProfilesPath),
            fsWhere('name', '==', patientName)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.therapist) therapist = data.therapist;
            if (data.clinicFee !== undefined && data.clinicFee !== null) {
                return parseFloat(data.clinicFee);
            }
        }
    } catch (err) {
        console.error('Error obteniendo clinicFee en CalendarData:', err);
    }
    return AuthManager.getTherapistDefaults(therapist).clinicFee;
}

async function resolvePaymentFinancials(appointment) {
    const therapist = appointment?.therapist || 'diana';
    const therapistDefaults = AuthManager.getTherapistDefaults(therapist);
    const profileFee = appointment
        ? await getClinicFee(appointment.name, therapist)
        : therapistDefaults.clinicFee;
    return buildSheetFinancialPayload(appointment, profileFee, therapistDefaults);
}

async function fetchAppointmentForPayment(id, appointmentOverride = null) {
    if (appointmentOverride) {
        return { id, ...appointmentOverride };
    }

    try {
        const snap = await getDoc(doc(db, collectionPath, id));
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
    } catch (err) {
        console.error('Error leyendo cita para pago:', err);
    }

    const fromState = CalendarState.appointments.find(a => a.id === id);
    return fromState ? { ...fromState } : null;
}

export const CalendarData = {
    _subscribers: [],
    _unsubscribeSnapshot: null,
    _lastData: null,
    _lastMetadata: null,

    /**
     * Suscribe a cambios en la colección de citas
     * @param {Function} onUpdate - Callback cuando hay nuevos datos
     * @returns {Function} Unsubscribe function
     */
    subscribe(onUpdate) {
        if (!onUpdate) return () => {};

        // Agregar suscriptor
        this._subscribers.push(onUpdate);

        // Si ya tenemos datos previos, entregárselos de inmediato al nuevo suscriptor
        if (this._lastData) {
            try {
                onUpdate(this._lastData, this._lastMetadata || { fromCache: true });
            } catch (e) {
                console.error("Error al notificar suscriptor inicial:", e);
            }
        }

        // Si es el primer suscriptor, iniciar el listener real de Firestore
        if (this._subscribers.length === 1) {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 30);
            const end = new Date(today);
            end.setDate(today.getDate() + 61); // +61 para capturar el día 60 completo

            const getLocalDateStr = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const startDateStr = getLocalDateStr(start);
            const endDateStr = getLocalDateStr(end);

            const colRef = collection(db, collectionPath);
            
            let q;

            if (AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist') {
                q = query(
                    colRef,
                    where('date', '>=', startDateStr),
                    where('date', '<', endDateStr)
                );
            } else {
                const therapistId = AuthManager.currentUser?.therapist || 'diana';
                q = query(
                    colRef,
                    where('date', '>=', startDateStr),
                    where('date', '<', endDateStr),
                    where('therapist', '==', therapistId)
                );
            }

            console.log(`📡 CalendarData: Iniciando listener Firestore compartido (Rango ${startDateStr} - ${endDateStr}).`);

            this._unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const data = [];
                snapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });

                const fromCache = snapshot.metadata?.fromCache ? 'caché' : 'servidor';
                console.log(
                    `📡 CalendarData: ${data.length} citas (${fromCache}, ~${data.length} reads este snapshot)`
                );

                this._lastData = data;
                this._lastMetadata = snapshot.metadata;

                CalendarState.setAppointments(data);

                // Notificar a todos los suscriptores
                this._subscribers.forEach(cb => {
                    try {
                        cb(data, snapshot.metadata);
                    } catch (e) {
                        console.error("Error en callback de suscriptor de citas:", e);
                    }
                });
            }, (error) => {
                console.error("Error en listener compartido de Firestore:", error);
            });
        }

        // Retornar función para desuscribirse
        return () => {
            this._subscribers = this._subscribers.filter(cb => cb !== onUpdate);
            
            // Si ya no quedan suscriptores, apagar el listener real
            if (this._subscribers.length === 0 && this._unsubscribeSnapshot) {
                console.log("📡 CalendarData: Sin suscriptores. Apagando listener Firestore.");
                this._unsubscribeSnapshot();
                this._unsubscribeSnapshot = null;
                this._lastData = null;
                this._lastMetadata = null;
            }
        };
    },

    /** Cierra el listener compartido (logout). */
    shutdown() {
        this._subscribers = [];
        if (this._unsubscribeSnapshot) {
            this._unsubscribeSnapshot();
            this._unsubscribeSnapshot = null;
        }
        this._lastData = null;
        this._lastMetadata = null;
    },

    // Wrappers para servicios de citas

    async createEvent(data) {
        return await createAppointment(data, CalendarState.appointments);
    },

    async updateEvent(id, data) {
        const existingEvt = CalendarState.appointments.find(a => a.id === id);
        const result = await updateAppointment(id, data, CalendarState.appointments);
        
        // Si la cita se movió de horario (cambió la fecha)
        if (result.success && data.date && existingEvt && existingEvt.date !== data.date) {
            // Si la cita ya estaba pagada, tenemos que anularla de la fecha/hora anterior 
            // y reportarla en la nueva.
            if (existingEvt.isPaid) {
                console.log("💰 CalendarData: Cita movida y estaba pagada. Actualizando en Sheets...", existingEvt.name);
                
                try {
                    const mergedEvt = { ...existingEvt, ...data };
                    const financials = await resolvePaymentFinancials(mergedEvt);

                    // 1. Anular el pago en la fecha/hora anterior con monto negativo
                    await SheetService.logPayment({
                        date: existingEvt.date,
                        patientName: existingEvt.name,
                        amount: -Math.abs(existingEvt.cost || 0),
                        status: "Pagado",
                        therapist: existingEvt.therapist,
                        ...financials
                    });
                    
                    // 2. Registrar en la fecha nueva
                    await SheetService.logPayment({
                        date: data.date,
                        patientName: existingEvt.name,
                        amount: Math.abs(existingEvt.cost || 0),
                        status: "Pagado",
                        therapist: existingEvt.therapist,
                        ...financials
                    });
                } catch (err) {
                    console.error("Error sincronizando cambios de fecha en Sheets:", err);
                }
            }
        }

        return result;
    },

    async deleteEvent(id) {
        const appointment = CalendarState.appointments.find(a => a.id === id);
        return await deleteAppointment(id, appointment);
    },

    async togglePayment(id, currentStatus, appointmentOverride = null) {
        const appointment = await fetchAppointmentForPayment(id, appointmentOverride);

        const therapistKey = appointment?.therapist || 'diana';
        const therapistDefaults = AuthManager.getTherapistDefaults(therapistKey);
        const profileFee = appointment
            ? await getClinicFee(appointment.name, therapistKey)
            : therapistDefaults.clinicFee;

        const clinicFee = resolveClinicFeeFromAppointment(appointment, profileFee, therapistDefaults);
        const feeSnapshot = alignClinicFeeSnapshot(appointment, profileFee, therapistDefaults);

        const result = await togglePaymentStatus(id, currentStatus, CalendarState.appointments, clinicFee);

        if (result.success && appointment) {
            try {
                const financials = await resolvePaymentFinancials(appointment);

                if (result.newState === true) {
                    console.log("💰 CalendarData: Marcado como PAGADO, enviando a Sheets...", appointment.name, '- desglose:', financials);
                    const success = await SheetService.logPayment({
                        id,
                        date: appointment.date,
                        patientName: appointment.name,
                        amount: Math.abs(appointment.cost || 0),
                        status: "Pagado",
                        therapist: appointment.therapist,
                        ...financials
                    });
                    if (success) {
                        await updateAppointment(id, { sheetSynced: true, ...feeSnapshot }, CalendarState.appointments);
                    } else {
                        ToastService.warning(
                            'Pago guardado en Parláre. Excel no se actualizó (permisos o conexión). '
                            + 'Diana o Yari pueden sincronizar con el botón naranja «pendientes» en la barra superior.',
                            9000
                        );
                    }
                } else {
                    console.log("💰 CalendarData: Marcado como ANULADO, enviando corrección a Sheets...", appointment.name, '- desglose:', financials);
                    const success = await SheetService.logPayment({
                        id,
                        date: appointment.date,
                        patientName: appointment.name,
                        amount: -Math.abs(appointment.cost || 0),
                        status: "ANULADO",
                        therapist: appointment.therapist,
                        ...financials
                    });
                    if (success) {
                        await updateAppointment(id, { sheetSynced: true }, CalendarState.appointments);
                    } else {
                        ToastService.warning(
                            'Estado de pago actualizado en Parláre. La corrección en Excel no se envió. '
                            + 'Pide a Diana o Yari que sincronicen, o repite el paso con una cuenta que tenga acceso al Excel del terapeuta.',
                            9000
                        );
                    }
                }
            } catch (err) {
                console.error("Error sincronizando pago con Sheets:", err);
            }
        }
        return result;
    },

    async toggleConfirmation(id, currentStatus, source = null) {
        const result = await toggleConfirmationStatus(id, currentStatus, CalendarState.appointments, source);
        // Confirmación no genera entrada financiera en Sheets
        return result;
    },

    async cancelEvent(id, source = 'Manual') {
        // Get event before cancelling to have data for log
        const evt = CalendarState.appointments.find(a => a.id === id);
        
        const result = await cancelAppointment(id, CalendarState.appointments, source);
        
        if (result.success && evt) {
             SheetService.logAttendance({
                id: evt.id,
                date: evt.date,
                patientName: evt.name,
                status: "CANCELADO",
                therapist: evt.therapist
            }).then(success => {
                if (success) {
                    // Update the doc in Firestore (using the service)
                    updateAppointment(id, { sheetSynced: true }, CalendarState.appointments);
                }
            }).catch(e => console.error("Error logging cancellation:", e));
        }

        return result;
    },

    /**
     * Limpia citas duplicadas en Firestore (Versión Ultra-Agresiva)
     */
    async cleanupDuplicates() {
        const appointments = CalendarState.appointments;
        const seen = new Map();
        const duplicates = [];

        console.log(`🧹 Iniciando limpieza PROFUNDA entre ${appointments.length} citas...`);

        const { formatDateLocal } = await import('../../utils/dateUtils.js');
        
        appointments.forEach(apt => {
            if (apt.isFullDayBlock || apt.isSchoolVisit) return; 

            const pDate = new Date(apt.date);
            let pDateStr = "";
            try { 
                pDateStr = formatDateLocal(pDate); 
            } catch (e) { return; }

            const hour = pDate.getHours();
            const therapist = (apt.therapist || 'diana').toLowerCase();
            const nameNorm = (apt.name || '').toLowerCase().trim().replace(/\s+/g, '');

            // CLAVE ESPEJO (Igual a como se filtra en CalendarUI.js línea 154)
            const key = `${pDateStr}_${hour}_${therapist}_${nameNorm}`;

            if (seen.has(key)) {
                duplicates.push(apt);
            } else {
                seen.set(key, apt.id);
            }
        });

        if (duplicates.length === 0) {
            console.log("✅ No se encontraron traslapes usando la lógica de la UI.");
            return { total: 0 };
        }

        console.warn(`🚨 Se encontraron ${duplicates.length} traslapes visuales. Eliminando...`);

        let deleted = 0;
        for (const duo of duplicates) {
            try {
                // Borrar de Firestore
                const { deleteDoc, doc, db, collectionPath } = await import('../../firebase.js');
                await deleteDoc(doc(db, collectionPath, duo.id));
                
                // Borrar también de Google Calendar para erradicar el "fantasma"
                const { GoogleCalendarService } = await import('../../services/google/GoogleCalendarService.js');
                await GoogleCalendarService.deleteEvent(duo.id, duo.googleEventId || null, duo.therapist);

                deleted++;
            } catch (err) {
                console.error(`Error borrando duplicado ${duo.id}:`, err);
            }
        }

        console.log(`✅ Limpieza completada: ${deleted} duplicados eliminados.`);
        return { total: deleted, deletedIds: duplicates.map(d => d.id) };
    }
};
