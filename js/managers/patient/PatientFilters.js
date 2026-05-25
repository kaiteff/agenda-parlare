/**
 * PatientFilters.js
 * Funciones puras de filtrado de pacientes
 * 
 * Este módulo contiene:
 * - Filtros por fecha (hoy, mañana)
 * - Filtros por terapeuta
 * - Cálculos de pagos pendientes
 * - Agrupación de datos
 * 
 * IMPORTANTE: Todas las funciones aquí son PURAS
 * - No modifican estado global
 * - No tienen efectos secundarios
 * - Mismo input = mismo output
 * - Fáciles de testear
 * 
 * @module PatientFilters
 */

import { PatientState } from './PatientState.js';
import { AuthManager } from '../AuthManager.js';
import { getDayNameES } from '../../utils/dateUtils.js';

/**
 * Funciones de filtrado para pacientes
 */
export const PatientFilters = {
    /**
     * Aplica todos los filtros activos (Búsqueda + Terapeuta)
     * @param {Array<Object>} patients - Lista de pacientes del estado
     * @param {string} query - Texto de búsqueda
     * @returns {Array<Object>} Pacientes filtrados
     */
    applyAll(patients, query = '') {
        let filtered = this.filterBySelectedTherapist(patients || []);

        if (query && query.trim() !== '') {
            const normalize = (s) => (s || '')
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
            const q = normalize(query);
            const digits = q.replace(/\D/g, '');

            filtered = filtered.filter((p) => {
                if (normalize(p.name).includes(q)) return true;
                if (digits && p.phone && String(p.phone).replace(/\D/g, '').includes(digits)) return true;
                return false;
            });
        }

        return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },


    // ==========================================
    // FILTROS POR FECHA
    // ==========================================

    /**
     * Obtiene pacientes con citas hoy
     * Respeta el filtro de terapeuta seleccionado
     * 
     * @returns {Array<Object>} Lista de pacientes con cita hoy, ordenados por hora
     */
    getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const selectedTherapist = AuthManager.getSelectedTherapist();

        const todayAppointments = (PatientState.appointments || []).filter(apt => {
            const aptDate = new Date(apt.date);

            // Buscar el dueño real (Perfil) con normalización extrema
            const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedAptName = normalize(apt.name);
            const patientProfile = (PatientState.patients || []).find(p => 
                normalize(p.name) === normalizedAptName
            );
            const ownerTherapist = patientProfile ? patientProfile.therapist : apt.therapist;

            // FILTRADO LÓGICO
            let matchesTherapist = true;
            
            // PRIORIDAD: Para la agenda diaria (Hoy/Mañana), manda el terapeuta de la CITA
            // Si Diana tiene una cita, debe verla en su agenda sin importar de quién sea el paciente.
            const attendingTherapist = apt.therapist || 'diana';

            if (selectedTherapist && selectedTherapist !== 'all') {
                matchesTherapist = (attendingTherapist === selectedTherapist);
            } 
            else if (!AuthManager.can('view_all_patients')) {
                const userTherapist = AuthManager.currentUser?.therapist;
                matchesTherapist = (attendingTherapist === userTherapist);
            }

            return aptDate >= today &&
                aptDate < tomorrow &&
                matchesTherapist;
        });

        return this._groupByPatient(todayAppointments);
    },

    /**
     * Obtiene pacientes con citas mañana
     * Respeta el filtro de terapeuta seleccionado
     * 
     * @returns {Array<Object>} Lista de pacientes con cita mañana, ordenados por hora
     */
    getTomorrow() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const selectedTherapist = AuthManager.getSelectedTherapist();

        const tomorrowAppointments = (PatientState.appointments || []).filter(apt => {
            const aptDate = new Date(apt.date);

            // Buscar el dueño real (Perfil) con normalización extrema
            const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedAptName = normalize(apt.name);
            const patientProfile = (PatientState.patients || []).find(p => 
                normalize(p.name) === normalizedAptName
            );
            const ownerTherapist = patientProfile ? patientProfile.therapist : apt.therapist;

            // FILTRADO LÓGICO
            let matchesTherapist = true;
            
            // PRIORIDAD: Para la agenda diaria (Hoy/Mañana), manda el terapeuta de la CITA
            const attendingTherapist = apt.therapist || 'diana';

            if (selectedTherapist && selectedTherapist !== 'all') {
                matchesTherapist = (attendingTherapist === selectedTherapist);
            } else if (!AuthManager.can('view_all_patients')) {
                const userTherapist = AuthManager.currentUser?.therapist;
                matchesTherapist = (attendingTherapist === userTherapist);
            }

            return aptDate >= tomorrow &&
                aptDate < dayAfter &&
                matchesTherapist;
        });

        return this._groupByPatient(tomorrowAppointments);
    },

    /**
     * Busca la próxima fecha con citas (después de hoy)
     * y devuelve la información necesaria para la pestaña del sidebar.
     * 
     * @returns {Object} { date: Date, label: string, appointments: Array }
     */
    getNextSessionInfo() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedTherapist = AuthManager.getSelectedTherapist();
        const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        let currentDate = new Date(today);
        let foundAppointments = [];
        let dayCount = 0;

        // Buscar en los próximos 30 días
        while (foundAppointments.length === 0 && dayCount < 30) {
            dayCount++;
            currentDate.setDate(currentDate.getDate() + 1);
            
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setDate(dayEnd.getDate() + 1);

            // Primero verificamos si hay citas ACTIVAS ese día
            const activeAppointments = (PatientState.appointments || []).filter(apt => {
                const aptDate = new Date(apt.date);
                const patientProfile = (PatientState.patients || []).find(p => 
                    normalize(p.name) === normalize(apt.name)
                );
                // PRIORIDAD: Terapeuta de la cita para la agenda
                const attendingTherapist = apt.therapist || 'diana';

                let matchesTherapist = true;
                if (selectedTherapist && selectedTherapist !== 'all') {
                    matchesTherapist = (attendingTherapist === selectedTherapist);
                } else if (!AuthManager.can('view_all_patients')) {
                    const userTherapist = AuthManager.currentUser?.therapist;
                    matchesTherapist = (attendingTherapist === userTherapist);
                }

                return aptDate >= dayStart &&
                    aptDate < dayEnd &&
                    !apt.isCancelled &&
                    matchesTherapist;
            });

            // Si hay citas activas, entonces capturamos TODAS las citas de ese día (incluyendo canceladas)
            if (activeAppointments.length > 0) {
                foundAppointments = (PatientState.appointments || []).filter(apt => {
                    const aptDate = new Date(apt.date);
                    const patientProfile = (PatientState.patients || []).find(p => 
                        normalize(p.name) === normalize(apt.name)
                    );
                    const attendingTherapist = apt.therapist || 'diana';

                    let matchesTherapist = true;
                    if (selectedTherapist && selectedTherapist !== 'all') {
                        matchesTherapist = (attendingTherapist === selectedTherapist);
                    } else if (!AuthManager.can('view_all_patients')) {
                        const userTherapist = AuthManager.currentUser?.therapist;
                        matchesTherapist = (attendingTherapist === userTherapist);
                    }

                    return aptDate >= dayStart &&
                        aptDate < dayEnd &&
                        matchesTherapist;
                });
            }
        }

        // Si encontramos el día, ahora filtramos para la info de retorno
        // Queremos saber si el día TIENE citas activas para que sea un día válido de "Próxima Sesión"
        // Pero una vez encontrado, queremos devolver TODAS las citas (incluyendo canceladas)
        // La lógica anterior ya buscó hasta encontrar un día con citas (activas o no)
        // Para ser consistentes con lo que pide el usuario (ver cancelados), 
        // simplemente devolvemos lo que encontramos.


        // Si no se encontró nada, devolver mañana vacío
        if (foundAppointments.length === 0) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return {
                date: tomorrow,
                label: 'Mañana',
                appointments: []
            };
        }

        // Determinar el label
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let label = '';
        if (currentDate.getTime() === tomorrow.getTime()) {
            label = 'Mañana';
        } else {
            // Nombre del día (ej: "Lunes")
            label = getDayNameES(currentDate);
        }

        return {
            date: currentDate,
            label: label,
            appointments: this._groupByPatient(foundAppointments)
        };
    },

    // ==========================================
    // FILTROS POR TERAPEUTA
    // ==========================================

    /**
     * Filtra pacientes activos según el terapeuta seleccionado
     * 
     * @param {Array<Object>} patients - Lista de pacientes a filtrar
     * @returns {Array<Object>} Pacientes filtrados
     */
    filterBySelectedTherapist(patients) {
        const selectedTherapist = AuthManager.getSelectedTherapist();

        return patients.filter(p => {
            const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normName = normalize(p.name);
            
            if (p.name?.startsWith('⛔') || 
                normName.includes('inhabil') || 
                normName.includes('vacaciones') || 
                normName.includes('bloqueo')) {
                return false;
            }

            // 1. Si hay un filtro específico seleccionado arriba
            if (selectedTherapist && selectedTherapist !== 'all') {
                return p.therapist === selectedTherapist;
            }

            // 2. Si es "Todas", aplicar permisos
            if (AuthManager.can('view_all_patients')) {
                return true;
            }

            // Si es terapeuta normal, solo sus pacientes
            const userTherapist = AuthManager.currentUser?.therapist;
            return p.therapist === userTherapist;
        });
    },

    // ==========================================
    // CÁLCULOS DE PAGOS
    // ==========================================

    /**
     * Obtiene citas con pago pendiente de un paciente
     * @param {string} patientName - Nombre del paciente
     * @returns {Array<Object>} Lista de citas con pago pendiente
     */
    getPendingPayments(patientName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (PatientState.appointments || [])
            .filter(apt => {
                const aptDate = new Date(apt.date);
                // Usar canViewDetails es suficiente aquí
                const matchesTherapist = AuthManager.canViewDetails(apt);

                return apt.name === patientName &&
                    (aptDate < today || (aptDate.toDateString() === today.toDateString())) && // Incuye hoy y pasadas
                    !apt.isPaid &&
                    !apt.isCancelled &&
                    matchesTherapist;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Calcula totales de pagos para una lista de citas
     * @param {Array<Object>} appointments - Lista de citas
     * @returns {Object} { totalPaid: number, totalPending: number }
     */
    calculatePaymentTotals(appointments) {
        let totalPaid = 0;
        let totalPending = 0;
        const now = new Date();

        appointments.forEach(apt => {
            if (apt.isCancelled) return;

            const cost = parseFloat(apt.cost) || 0;
            if (apt.isPaid) {
                totalPaid += cost;
            } else {
                // Solo contar como deuda si la fecha es anterior a ahora
                if (new Date(apt.date) < now) {
                    totalPending += cost;
                }
            }
        });

        return { totalPaid, totalPending };
    },

    // ==========================================
    // MÉTODOS PRIVADOS (HELPERS)
    // ==========================================

    /**
     * Agrupa citas por paciente, tomando solo la primera cita del día
     * Y asegura enlazar con el ID correcto del perfil del paciente
     * @private
     */

    _groupByPatient(appointments) {
        const patientsMap = new Map();
        // Obtener lista completa de perfiles para cruzar IDs
        const allPatients = PatientState.patients || [];

        appointments.forEach(apt => {
            // EXCLUIR BLOQUES Y DÍAS INHÁBILES (No son pacientes reales)
            const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normName = normalize(apt.name);

            if (apt.name?.startsWith('⛔') || 
                normName.includes('inhabil') || 
                normName.includes('vacaciones') || 
                normName.includes('bloqueo') ||
                apt.isFullDayBlock || 
                apt.isHourlyBlock) {
                return;
            }
            const existing = patientsMap.get(apt.name);
            const aptTime = new Date(apt.date);

            const isNewCancelled = !!apt.isCancelled;
            const isExistingCancelled = existing ? !!existing.isCancelled : false;

            let shouldReplace = false;
            if (!existing) {
                shouldReplace = true;
            } else if (!isNewCancelled && isExistingCancelled) {
                // Preferir la cita activa sobre la cancelada si son el mismo día
                shouldReplace = true;
            } else if (isNewCancelled === isExistingCancelled && aptTime < existing.appointmentTime) {
                // Si ambos tienen el mismo estado, preferir la más temprana
                shouldReplace = true;
            }

            if (shouldReplace) {
                // Buscar el perfil real usando normalización para evitar fallos por acentos/espacios
                const patientProfile = allPatients.find(p => normalize(p.name) === normalize(apt.name));

                // CRUCIAL: Si el paciente está INACTIVO, no mostrarlo en listas de Hoy/Mañana
                if (patientProfile && patientProfile.isActive === false) {
                    return;
                }

                const realPatientId = patientProfile ? patientProfile.id : (apt.patientId || null);

                patientsMap.set(apt.name, {
                    name: apt.name,
                    appointmentTime: aptTime,
                    confirmed: apt.confirmed || false,
                    lastReminderSentAt: apt.lastReminderSentAt || null,
                    isCancelled: !!apt.isCancelled,
                    cancelledBy: apt.cancelledBy || null,
                    // LÓGICA DE RELEVO: 
                    // therapist -> Quién atiende hoy (el de la cita)
                    // planningTherapist -> Quién es el dueño/planeador (el del perfil)
                    therapist: apt.therapist || (patientProfile ? patientProfile.therapist : 'diana'),
                    planningTherapist: patientProfile ? patientProfile.therapist : null,
                    id: realPatientId,
                    hasProfile: !!patientProfile
                });
            }
        });

        return Array.from(patientsMap.values())
            .sort((a, b) => a.appointmentTime - b.appointmentTime);
    }
};
