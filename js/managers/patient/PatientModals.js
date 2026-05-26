/**
 * PatientModals.js
 * Gestión de modales de pacientes
 * 
 * Este módulo maneja:
 * - Modal de nuevo paciente
 * - Modal de historial del paciente
 * - Modal de pacientes inactivos
 * - Apertura/cierre de modales
 * - Renderizado de contenido de modales
 * 
 * NO maneja:
 * - Acciones CRUD (ver PatientActions.js)
 * - Filtrado (ver PatientFilters.js)
 * - Renderizado de lista principal (ver Sidebar.js)
 * 
 * @module PatientModals
 */

import { PatientState } from './PatientState.js';
import { PatientFilters } from './PatientFilters.js';
import { PatientActions } from './PatientActions.js';
import { patientsData, patientProfiles, db, collectionPath, collection, query, where, getDocs } from '../../firebase.js';
import { AuthManager } from '../AuthManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ScheduleManager } from '../ScheduleManager.js';
import { SettingsManager } from '../SettingsManager.js';
import { ToastService } from '../../utils/ToastService.js';
import { getReimbursementReceiptFromDom } from '../../services/patientService.js';
import { renderWhatsAppOptInBadge } from '../../utils/WhatsAppOptIn.js';
import { escapeHTML } from '../../utils/sanitize.js';

/**
 * Gestión de modales
 */
export const PatientModals = {

    /**
     * Cache de citas históricas cargadas bajo demanda en `openHistory`.
     * Se usa para que los re-renders en tiempo real (cuando llega un snapshot de
     * Firestore con el listener limitado a ventana 90 días) NO sobreescriban el
     * listado completo con la versión recortada del state local.
     *
     * Estructura: { patientId, patientName, appointments: [...], loadedAt: ts }
     * Se invalida en `closeHistory()`.
     */
    _historyCache: null,

    /**
     * Devuelve true si el cache aplica para el paciente dado (mismo id/nombre y
     * cargado en los últimos 5 minutos).
     */
    _isHistoryCacheValid(patient) {
        if (!this._historyCache || !patient) return false;
        const sameId = this._historyCache.patientId && this._historyCache.patientId === patient.id;
        const sameName = this._historyCache.patientName === patient.name;
        const isFresh = (Date.now() - (this._historyCache.loadedAt || 0)) < 5 * 60 * 1000;
        return (sameId || sameName) && isFresh;
    },

    /**
     * Devuelve las citas para mostrar en el modal de historial:
     *  - Base: cache completo cargado con `getDocs` en `openHistory` (sin límite de ventana).
     *  - Live overrides: cualquier cita del listener (estado local, ventana 90 días) reemplaza
     *    la del cache para el mismo `id` (así se reflejan cambios en tiempo real).
     *  - Live additions: cualquier cita del listener cuyo `id` no esté en el cache se agrega
     *    (cubre el caso de que se cree una cita nueva mientras el modal está abierto).
     *
     * Si el cache no es válido (paciente distinto, expirado), regresa el fallback.
     */
    getHistoryAppointments(patient, fallbackAppointments = []) {
        if (!this._isHistoryCacheValid(patient)) {
            return fallbackAppointments;
        }

        const liveById = new Map();
        for (const apt of (fallbackAppointments || [])) {
            if (apt && apt.id) liveById.set(apt.id, apt);
        }

        // Construir array final: cache + overrides en vivo, manteniendo orden cronológico desc.
        const merged = [];
        const seenIds = new Set();

        for (const apt of this._historyCache.appointments) {
            const fresh = (apt && apt.id) ? liveById.get(apt.id) : null;
            merged.push(fresh || apt);
            if (apt && apt.id) seenIds.add(apt.id);
        }

        // Agregar citas en vivo que el cache no tenía (e.g. cita nueva creada mientras estaba abierto)
        for (const apt of (fallbackAppointments || [])) {
            if (apt && apt.id && !seenIds.has(apt.id)) {
                merged.push(apt);
            }
        }

        merged.sort((a, b) => new Date(b.date) - new Date(a.date));
        return merged;
    },

    /**
     * Bloquea o libera el scroll del body según modales abiertos (coordina con calendario y bottom nav).
     * @param {boolean} lock
     * @private
     */
    _syncBodyScroll(lock) {
        if (lock) {
            document.body.classList.add('overflow-hidden');
            return;
        }
        const patientModalIds = ['newPatientModal', 'patientHistoryModal', 'inactivePatientsModal', 'sessionNoteModal'];
        const patientOpen = patientModalIds.some((id) => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
        const eventOpen = document.getElementById('eventModal') && !document.getElementById('eventModal').classList.contains('hidden');
        const receptionOpen = document.getElementById('receptionControlModal') && !document.getElementById('receptionControlModal').classList.contains('hidden');
        const moreSheetOpen = document.getElementById('mobileMoreSheet') && !document.getElementById('mobileMoreSheet').classList.contains('hidden');
        if (!patientOpen && !eventOpen && !receptionOpen && !moreSheetOpen) {
            document.body.classList.remove('overflow-hidden');
        }
    },

    // ==========================================
    // MODAL DE NUEVO PACIENTE
    // ==========================================

    /**
     * Abre el modal para crear un nuevo paciente
     */
    openNewPatient() {
        let modal = document.getElementById('newPatientModal');

        if (!modal) {
            console.error('❌ PatientModals: CRITICAL - Modal de nuevo paciente no encontrado');
            return;
        }

        const { dom } = PatientState;

        // Actualizar referencia
        dom.newPatientModal = modal;

        // Limpiar inputs
        const firstNameInput = document.getElementById('newPatientFirstName');
        const lastNameInput = document.getElementById('newPatientLastName');
        const therapistInput = document.getElementById('newPatientTherapist');
        const costInput = document.getElementById('newPatientDefaultCost');
        const clinicFeeInput = document.getElementById('newPatientClinicFee');
        const parentNameInput = document.getElementById('newPatientParentName');
        const phoneInput = document.getElementById('newPatientPhone');
        const countryCodeInput = document.getElementById('newPatientCountryCode');

        // Configurar terapeuta primero para obtener costos
        let targetTherapist = 'diana';
        if (therapistInput) {
            const selectedTherapist = AuthManager.getSelectedTherapist();
            if (selectedTherapist && selectedTherapist !== 'all') {
                targetTherapist = selectedTherapist;
            } else if (AuthManager.isTherapist() && !AuthManager.isAdmin()) {
                targetTherapist = AuthManager.currentUser.therapist;
            }
            therapistInput.value = targetTherapist;
        }

        // Obtener costos según terapeuta
        const defaults = AuthManager.getTherapistDefaults(targetTherapist);

        if (firstNameInput) firstNameInput.value = '';
        if (lastNameInput) lastNameInput.value = '';
        if (costInput) costInput.value = defaults.cost;
        if (clinicFeeInput) clinicFeeInput.value = defaults.clinicFee.toFixed(2);
        if (parentNameInput) parentNameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (countryCodeInput) countryCodeInput.value = '52'; // Default Mexico
        const birthdayInput = document.getElementById('newPatientBirthday');
        if (birthdayInput) birthdayInput.value = '';

        // MEJORA: Escuchar cambios en el selector de terapeuta para actualizar costos sugeridos
        if (therapistInput) {
            therapistInput.onchange = () => {
                const newTherapist = therapistInput.value;
                const newDefaults = AuthManager.getTherapistDefaults(newTherapist);
                if (costInput) costInput.value = newDefaults.cost;
                if (clinicFeeInput) clinicFeeInput.value = newDefaults.clinicFee.toFixed(2);
                console.log(`💡 Costos actualizados para ${newTherapist}: $${newDefaults.cost} / $${newDefaults.clinicFee}`);
            };
        }

        // Mover al body para evitar problemas de stacking context
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }

        // Forzar visualización usando clases y estilos estándar
        requestAnimationFrame(() => {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.style.zIndex = '9999';
            this._syncBodyScroll(true);

            if (firstNameInput) {
                setTimeout(() => firstNameInput.focus(), 50);
            }

            console.log('✅ PatientModals: Modal de nuevo paciente abierto');
        });

        // VALIDACIÓN: Avisar si escriben 52 al inicio
        if (phoneInput) {
            phoneInput.oninput = (e) => {
                const val = e.target.value;
                const countryCode = document.getElementById('newPatientCountryCode')?.value || '52';
                if (countryCode === '52' && val.startsWith('52')) {
                    ToastService.info("💡 Detectamos un '52' al inicio. El país ya está seleccionado, recuerda usar solo los 10 dígitos.", 3000);
                }
            };
        }
    },

    /**
     * Cierra el modal de nuevo paciente
     */
    closeNewPatient() {
        const modals = document.querySelectorAll('#newPatientModal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
        });
        this._syncBodyScroll(false);
        console.log('✅ PatientModals: Modal de nuevo paciente cerrado (' + modals.length + ' instancias)');
    },

    // ==========================================
    // MODAL DE HISTORIAL DEL PACIENTE
    // ==========================================

    /**
     * Abre el modal de historial de un paciente
     * 
     * @param {Object} patient - Datos del paciente
     */
    async openHistory(patient) {
        const { dom } = PatientState;

        // PREVENCIÓN DE CONFLICTOS:
        const scheduleModal = document.getElementById('scheduleNewPatientModal');
        if (scheduleModal) {
            const style = window.getComputedStyle(scheduleModal);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && !scheduleModal.classList.contains('hidden')) {
                console.warn("🚫 PatientModals: Bloqueando apertura de historial porque Schedule Modal está abierto.");
                return;
            }
        }

        if (!dom.patientHistoryModal) {
            console.warn('⚠️ PatientModals: Modal de historial no encontrado');
            return;
        }

        // Forzar visualización de la estructura del modal
        dom.patientHistoryModal.classList.remove('hidden');
        dom.patientHistoryModal.style.display = 'flex';
        dom.patientHistoryModal.style.zIndex = '9500';
        this._syncBodyScroll(true);

        // Guardar paciente seleccionado
        PatientState.setSelectedPatient(patient);

        // DETERMINAR PERMISOS FINANCIEROS (Admin y Recepción ven todo, Terapeutas solo lo propio)
        const canViewFinancials = AuthManager.isAdmin() || 
                                AuthManager.currentUser?.role === 'receptionist' || 
                                (patient.therapist === AuthManager.currentUser.therapist);

        // Ocultar/Mostrar tarjeta de finanzas
        const financeCard = document.getElementById('patientFinanceCard');
        if (financeCard) {
            if (canViewFinancials) {
                financeCard.classList.remove('hidden');
            } else {
                financeCard.classList.add('hidden');
            }
        }

        // Poner estado cargando inicial
        const therapistName = patient.therapist === 'diana' ? 'Diana' : patient.therapist === 'sam' ? 'Sam' : patient.therapist || 'No asignado';
        if (dom.patientHistoryTitle) {
            dom.patientHistoryTitle.innerHTML = `
                <div class="flex flex-col gap-2 w-full min-w-0 pr-14 md:pr-0">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-11 h-11 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-white">
                            ${escapeHTML(patient.name.charAt(0))}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-base md:text-lg font-extrabold text-gray-900 leading-tight truncate">${escapeHTML(patient.name)}</div>
                            <div class="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                Cargando expediente...
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const statsContainer = dom.patientHistoryModal.querySelector('.stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            `;
        }

        if (dom.patientHistoryList) {
            dom.patientHistoryList.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <span class="text-sm text-gray-400">Cargando citas...</span>
                </div>
            `;
        }

        // Configurar botones de acción iniciales
        this._setupHistoryActions(patient);

        // Botón de cerrar
        const closeBtn = document.getElementById('closePatientHistoryBtn');
        if (closeBtn) closeBtn.onclick = () => this.closeHistory();

        // Cargar citas completas bajo demanda (todas las históricas, sin límite de ventana).
        let appointments = [];
        try {
            const q = query(
                collection(db, collectionPath),
                where('name', '==', patient.name)
            );
            const snap = await getDocs(q);
            snap.forEach((doc) => {
                appointments.push({ id: doc.id, ...doc.data() });
            });
            // Ordenar de más reciente a más antigua
            appointments.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Cachear para que los re-renders en vivo no recorten a ventana 90 días
            this._historyCache = {
                patientId: patient.id,
                patientName: patient.name,
                appointments,
                loadedAt: Date.now()
            };
        } catch (err) {
            console.error("Error al cargar historial bajo demanda:", err);
            ToastService.error("Error al obtener el historial completo. Mostrando datos locales.");
            appointments = (PatientState.appointments || []).filter(apt => apt.name === patient.name);
            this._historyCache = null; // No cachear en fallback
        }

        // Calcular estadísticas con los datos reales completos
        const now = new Date();
        const attended = appointments.filter(apt => apt.isPaid && !apt.isCancelled).length;
        const cancelled = appointments.filter(apt => apt.isCancelled).length;
        const totalPast = appointments.filter(apt => new Date(apt.date) < now).length;
        
        // Calcular engagement (tasa de asistencia)
        const engagementRate = totalPast > 0 ? Math.round((attended / totalPast) * 100) : 100;
        const engagementColor = engagementRate > 80 ? 'bg-green-500' : engagementRate > 50 ? 'bg-orange-500' : 'bg-red-500';

        const { totalPaid, totalPending } = PatientFilters.calculatePaymentTotals(appointments);

        // Actualizar título final
        if (dom.patientHistoryTitle) {
            // Lógica de alerta de citas por agotarse (menos de 14 días para la última cita)
            const futureApts = appointments.filter(a => !a.isCancelled && new Date(a.date) >= now);
            futureApts.sort((a,b) => new Date(b.date) - new Date(a.date));
            const lastAptDate = futureApts.length > 0 ? new Date(futureApts[0].date) : null;
            
            const fourteenDaysFromNow = new Date();
            fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
            
            const isEndingSoon = lastAptDate && lastAptDate < fourteenDaysFromNow;
            const hasNoFuture = !lastAptDate;

            const recurrenceAlert = (isEndingSoon || hasNoFuture) ? `
                <div id="patientRecurrenceAlert" class="flex items-center gap-1.5 py-1.5 px-2.5 bg-red-50 border border-red-100 rounded-lg w-full max-w-full">
                    <span class="flex h-2 w-2 flex-shrink-0 rounded-full bg-red-600"></span>
                    <span class="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">
                        ${hasNoFuture ? 'Sin citas programadas' : 'Recurrencia por agotarse'}
                    </span>
                </div>
            ` : '';

            dom.patientHistoryTitle.innerHTML = `
                <div class="flex flex-col gap-2 w-full min-w-0 pr-14 md:pr-0">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-11 h-11 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-white">
                            ${escapeHTML(patient.name.charAt(0))}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-base md:text-lg font-extrabold text-gray-900 leading-tight truncate">${escapeHTML(patient.name)}</div>
                            <div class="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full ${patient.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}"></span>
                                Terapeuta ${therapistName}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        ${renderWhatsAppOptInBadge(patient)}
                        <button id="patientWelcomeBtn" class="flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-lg border border-green-200 hover:bg-green-200 transition-colors touch-manipulation" title="Enviar plantilla bienvenida_con_optin">
                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Bienvenida
                        </button>
                    </div>
                    ${recurrenceAlert}
                </div>
            `;
        }

        // Renderizar estadísticas visuales
        if (statsContainer) {
            // Encontrar última cita real (no cancelada y ya pasada)
            const pastAttended = appointments
                .filter(a => new Date(a.date) < now && !a.isCancelled)
                .sort((a,b) => new Date(b.date) - new Date(a.date));
            const lastSession = pastAttended.length > 0 ? new Date(pastAttended[0].date).toLocaleDateString() : 'N/A';

            statsContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <!-- Engagement Premium -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <div class="relative z-10">
                            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Engagement</div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-3xl font-black text-gray-900">${engagementRate}%</span>
                                <div class="w-10 h-10 rounded-full flex items-center justify-center ${engagementColor.replace('bg-', 'text-')} bg-opacity-10 border border-current">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                </div>
                            </div>
                            <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div class="${engagementColor} h-full transition-all duration-1000" style="width: ${engagementRate}%"></div>
                            </div>
                            <div class="mt-3 flex justify-between text-[10px] font-bold">
                                <span class="text-green-600">✓ ${attended} Éxito</span>
                                <span class="text-red-400">✗ ${cancelled} Canc.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Financial Status -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group ${totalPending > 0 ? 'ring-2 ring-red-100' : ''}">
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Balance</div>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-semibold text-gray-500 uppercase">Pagado</span>
                                <span class="text-xl font-black text-green-600">$${totalPaid}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-semibold text-gray-500 uppercase">Pendiente</span>
                                <span class="text-xl font-black ${totalPending > 0 ? 'text-red-500 animate-pulse' : 'text-gray-300'}">$${totalPending}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Last Activity -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Actividad</div>
                        <div class="text-xs font-semibold text-gray-500 mb-1">Última sesión:</div>
                        <div class="text-lg font-black text-gray-800 mb-3">${lastSession}</div>
                        <div class="flex items-center gap-2">
                             <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase border border-indigo-100">
                                Total: ${appointments.length} citas
                             </span>
                        </div>
                    </div>

                    <!-- Next Step -->
                    <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-200 text-white">
                        <div class="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-3">Próximo Paso</div>
                        ${appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).length > 0 ? `
                            <div class="text-xs font-medium text-blue-100 mb-1">Siguiente cita:</div>
                            <div class="text-lg font-bold leading-tight">
                                ${new Date(appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})} 
                                <span class="opacity-75 font-normal">@ ${new Date(appointments.filter(a => new Date(a.date) >= now && !a.isCancelled).sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).getHours()}:00</span>
                            </div>
                        ` : `
                            <div class="text-xs font-medium text-blue-100 mb-1">Sin cita próxima</div>
                            <button id="scheduleFromHistoryBtn" class="mt-2 w-full py-2 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">Agendar Ahora</button>
                        `}
                    </div>
                </div>
            `;
        }

        // Actualizar totales de la parte inferior (antiguos dom)
        if (dom.patientTotalPaid) dom.patientTotalPaid.textContent = `$${totalPaid}`;
        if (dom.patientTotalPending) dom.patientTotalPending.textContent = `$${totalPending}`;

        // Renderizar lista de citas
        this._renderPatientAppointments(appointments, canViewFinancials);

        // Configurar botones de acción
        this._setupHistoryActions(patient);

        // Botón de cerrar
        const closeBtn = document.getElementById('closePatientHistoryBtn');
        if (closeBtn) closeBtn.onclick = () => this.closeHistory();

        // Mostrar modal
        dom.patientHistoryModal.classList.remove('hidden');

        // INFO DE DEBUG (Solo para ayudarte a ver por qué fallan los permisos)
        const debugEl = document.getElementById('authDebugInfo');
        if (debugEl && AuthManager.currentUser) {
            debugEl.innerHTML = `
                <span>UID: ${AuthManager.currentUser.uid.substring(0,6)}...</span>
                <span>ROLE: ${AuthManager.currentUser.role}</span>
            `;
            debugEl.classList.remove('hidden');
        }

        // console.log('✅ PatientModals: Modal de historial abierto para', patient.name);
    },

    /**
     * Cierra el modal de historial
     */
    closeHistory() {
        const { dom } = PatientState;

        if (dom.patientHistoryModal) {
            dom.patientHistoryModal.classList.add('hidden');
            dom.patientHistoryModal.style.display = 'none';
        }
        this._syncBodyScroll(false);

        // Invalidar cache de historial al cerrar (la próxima apertura re-consultará Firestore)
        this._historyCache = null;

        // Ocultar sección de edición si estaba visible
        if (dom.patientEditSection) {
            dom.patientEditSection.classList.add('hidden');
        }

        // Ocultar botones de acción
        if (dom.deactivatePatientBtn) dom.deactivatePatientBtn.classList.add('hidden');
        if (dom.deletePatientBtn) dom.deletePatientBtn.classList.add('hidden');

        PatientState.setSelectedPatient(null);

        console.log('✅ PatientModals: Modal de historial cerrado');
    },

    /**
     * Renderiza la lista de citas en el modal de historial con agrupamiento inteligente
     * @private
     * @param {Array<Object>} appointments - Lista de citas
     * @param {boolean} canViewFinancials - Si el usuario puede ver costos
     */
    _renderPatientAppointments(appointments, canViewFinancials = true) {
        const { dom } = PatientState;

        if (!dom.patientHistoryList) return;

        if (appointments.length === 0) {
            dom.patientHistoryList.innerHTML = `
                <p class="text-sm text-gray-400 text-center py-4">
                    No hay citas registradas
                </p>
            `;
            return;
        }

        const now = new Date();

        // 1. Clasificar citas
        const pendingPay = [];
        const upcoming = [];
        const history = [];

        appointments.forEach(apt => {
            const aptDate = new Date(apt.date);

            if (apt.isCancelled) {
                // Canceladas van al historial siempre
                history.push(apt);
            } else if (aptDate >= now) {
                // Futuras van a próximas
                upcoming.push(apt);
            } else if (!apt.isPaid) {
                // Pasadas y NO pagadas van a Pendientes de Pago
                pendingPay.push(apt);
            } else {
                // Pasadas y Pagadas van a Historial
                history.push(apt);
            }
        });

        // 2. Ordenar grupos
        // Pendientes de pago: Más recientes primero
        pendingPay.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Próximas: La MÁS CERCANA arriba (ascendente)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Historial: Más recientes primero (descendente)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 3. Renderizar
        dom.patientHistoryList.innerHTML = '';

        const renderSection = (title, items, iconClass, titleColor) => {
            if (items.length === 0) return;

            const sectionHeader = document.createElement('div');
            sectionHeader.className = `flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-gray-100 ${titleColor}`;
            sectionHeader.innerHTML = `
                <div class="${iconClass}"></div>
                <h5 class="text-xs font-bold uppercase tracking-wide">${title} (${items.length})</h5>
            `;
            dom.patientHistoryList.appendChild(sectionHeader);

            items.forEach(apt => this._createAppointmentCard(apt, canViewFinancials));
        };

        // Orden de visualización:
        // 1. Pendientes de pago (Urgente)
        if (pendingPay.length > 0) {
            renderSection('⚠️ Pendientes de Pago', pendingPay, 'w-2 h-2 rounded-full bg-red-500', 'text-red-600');
        }

        // 2. Próximas Citas (Relevante)
        if (upcoming.length > 0) {
            renderSection('📅 Próximas Citas', upcoming, 'w-2 h-2 rounded-full bg-blue-500', 'text-blue-600');
        }

        // 3. Historial (Referencia)
        if (history.length > 0) {
            renderSection('🗄️ Historial / Pagadas', history, 'w-2 h-2 rounded-full bg-gray-400', 'text-gray-500');
        }
    },

    /**
     * Crea el elemento DOM para una tarjeta de cita
     * @private
     */
    _createAppointmentCard(apt, canViewFinancials) {
        const { dom } = PatientState;
        const aptDate = new Date(apt.date);
        const dateStr = aptDate.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = aptDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isPast = aptDate < new Date();

        let statusClass = 'bg-white border-gray-200'; // Default
        let statusText = '';
        let statusTextColor = '';

        if (apt.isCancelled) {
            if (apt.justified) {
                statusClass = 'bg-emerald-50 border-emerald-200 opacity-80';
                statusText = '💚 Justificada';
                statusTextColor = 'text-emerald-700 font-bold';
            } else {
                statusClass = 'bg-red-50 border-red-200 opacity-75';
                statusText = '❌ Cancelada';
                statusTextColor = 'text-red-600';
            }
        } else if (apt.isPaid) {
            statusClass = 'bg-green-50 border-green-200';
            statusText = '✓ Pagada';
            statusTextColor = 'text-green-600';
        } else if (isPast) { // Pendiente de pago
            statusClass = 'bg-orange-50 border-l-4 border-l-orange-400 border-y border-r border-orange-200 shadow-sm';
            statusText = '⚠️ Pendiente Pago';
            statusTextColor = 'text-orange-600';
        } else { // Futura
            statusClass = 'bg-blue-50 border-blue-200';
            statusText = '📅 Próxima';
            statusTextColor = 'text-blue-600';
        }

        // Si está confirmada, añadir distintivo extra visual
        if (!isPast && !apt.isCancelled && apt.confirmed) {
            statusText += ' (Confirmada)';
        }

        const aptEl = document.createElement('div');
        aptEl.className = `p-3 rounded-lg border mb-2 transition-all hover:shadow-md cursor-pointer ${statusClass}`;

        // Al hacer click, abrir edición
        aptEl.onclick = () => {
            // Abrir modal de edición si es posible
            if (window.calendarManagerRef) {
                // Acceso difícil a CalendarModal.openEditModal sin importar
                // Dejar que el usuario use los botones de acción por ahora
            }
        };

        const showPayBtn = canViewFinancials && !apt.isPaid && !apt.isCancelled;
        const showConfirmBtn = !apt.isCancelled && !isPast;

        // Costo solo si canViewFinancials
        const costHtml = canViewFinancials ?
            `<div class="text-gray-600 font-medium">Costo: <span class="text-gray-800">$${apt.cost}</span></div>`
            : '<div></div>'; // Spacer

        // INDICADOR DE BITÁCORA: Si ya tiene progreso guardado (legacy) o marcado como nota protegida
        const hasProgress = apt.hasClinicalNote || (apt.clinicalProgress && (apt.clinicalProgress.generalNote || (apt.clinicalProgress.themes && Object.keys(apt.clinicalProgress.themes).length > 0)));

        let footerHtml = '';
        if (canViewFinancials || showConfirmBtn) {
            footerHtml = `
                <div class="flex items-center justify-between text-xs mt-2 border-t pt-2 border-gray-400 border-opacity-10">
                    ${costHtml}
                    <div class="flex gap-2">
                         ${AuthManager.currentUser?.role !== 'receptionist' ? `
                             <button type="button" 
                                     class="note-btn px-2 py-1 ${hasProgress ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'} rounded hover:opacity-90 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors" 
                                     title="Bitácora de Sesión"
                                     data-apt-id="${apt.id}">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                ${hasProgress ? 'Bitácora ✔' : 'Bitácora'}
                             </button>
                         ` : ''}

                         ${showConfirmBtn ? `
                            <button type="button" 
                                    class="confirm-btn px-2 py-1 ${apt.confirmed ? 'bg-gray-100 text-gray-600 border border-gray-300' : 'bg-blue-600 text-white'} rounded hover:opacity-90 text-xs font-bold shadow-sm flex items-center gap-1 transition-colors" 
                                    title="${apt.confirmed ? 'Quitar confirmación' : 'Confirmar asistencia'}"
                                    data-id="${apt.id}" 
                                    data-status="${apt.confirmed}">
                                ${apt.confirmed ? '<span class="text-[10px] pointer-events-none">❌</span>' : '<span class="text-[10px] pointer-events-none">✓</span> Confirmar'}
                            </button>
                        ` : ''}
                        
                        ${showPayBtn ? `
                                <div class="flex gap-1">
                                    <button type="button"
                                            class="whatsapp-payment-btn p-1.5 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 transition-colors"
                                            title="Enviar Recordatorio de Pago"
                                            data-apt-id="${apt.id}">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </button>
                                    <button type="button"
                                            class="pay-btn px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1"
                                            data-id="${apt.id}">
                                        <span class="pointer-events-none">$</span> Pagar
                                    </button>
                                </div>
                            ` : ''}
                    </div>
                </div>
            `;
        }

        // Info de WhatsApp
        let whatsappHtml = '';
        if (apt.lastReminderSentAt) {
            const waDate = apt.lastReminderSentAt.toDate ? apt.lastReminderSentAt.toDate() : new Date(apt.lastReminderSentAt);
            const waTime = waDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const waType = apt.lastReminderType === 'AUTO_CRON' ? '🤖' : '📱';
            const waBy = apt.lastReminderBy || 'Manual';
            whatsappHtml = `
                <div class="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100" title="Enviado por: ${waBy} (${waTime})">
                    <span>${waType}</span>
                    <span>${waTime}</span>
                </div>
            `;
        }

        // Justificante Médico en Historial
        let justificationHtml = '';
        if (apt.justified && apt.justificationUrl) {
            justificationHtml = `
                <div class="flex items-center justify-between text-xs mt-2 border-t pt-2 border-emerald-200/50">
                    <div class="text-emerald-800 font-medium flex items-center gap-1.5 min-w-0">
                        <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span class="truncate block text-[10px] text-emerald-700" title="${apt.justificationFileName || 'Comprobante'}">${apt.justificationFileName || 'Comprobante Médico'}</span>
                    </div>
                    <button type="button" 
                            class="px-2 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 flex-shrink-0"
                            onclick="event.stopPropagation(); window.open('${apt.justificationUrl}', '_blank')">
                        Ver Justificante 📄
                    </button>
                </div>
            `;
        }

        aptEl.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    <div class="text-sm font-bold text-gray-800 tracking-tight">
                        ${dateStr} <span class="font-normal text-gray-500 mx-1">|</span> ${timeStr}
                    </div>
                    ${whatsappHtml}
                </div>
                <div class="text-[10px] uppercase font-bold tracking-wider ${statusTextColor}">
                    ${statusText}
                </div>
            </div>
            ${footerHtml}
            ${justificationHtml}
        `;

        dom.patientHistoryList.appendChild(aptEl);
    },

    /**
     * Configura los botones de acción del modal de historial
     * @private
     * @param {Object} patient - Datos del paciente
     */
    _setupHistoryActions(patient) {
        const { dom } = PatientState;

        // Ocultar inicialmente
        if (dom.deactivatePatientBtn) dom.deactivatePatientBtn.classList.add('hidden');
        if (dom.deletePatientBtn) dom.deletePatientBtn.classList.add('hidden');
        if (dom.patientEditSection) dom.patientEditSection.classList.add('hidden');

        // Solo Admin y Yari pueden editar perfiles (o el terapeuta dueño)
        const canEditProfile = AuthManager.isAdmin() || 
                              AuthManager.currentUser?.role === 'receptionist' || 
                              (patient.therapist === AuthManager.currentUser?.therapist);

        if (dom.editPatientBtn) {
            if (canEditProfile) {
                dom.editPatientBtn.classList.remove('hidden');
                dom.editPatientBtn.onclick = () => {
                    const opening = dom.patientEditSection?.classList.contains('hidden');
                    dom.deactivatePatientBtn?.classList.toggle('hidden');
                    dom.deletePatientBtn?.classList.toggle('hidden');
                    dom.patientEditSection?.classList.toggle('hidden');
                    const alertEl = document.getElementById('patientRecurrenceAlert');
                    if (opening) {
                        alertEl?.classList.add('hidden');
                        dom.patientEditSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        alertEl?.classList.remove('hidden');
                    }
                };
            } else {
                dom.editPatientBtn.classList.add('hidden');
            }
        }

        // Selector de terapeuta
        if (dom.editPatientTherapist) {
            dom.editPatientTherapist.value = patient.therapist || 'diana';
        }

        // Input de costo y cuota
        if (dom.editPatientCost) {
            dom.editPatientCost.value = patient.defaultCost || 0;
        }
        if (document.getElementById('editPatientClinicFee')) {
            document.getElementById('editPatientClinicFee').value = patient.clinicFee || 250;
        }
        if (document.getElementById('editPatientPhone')) {
            let phoneVal = patient.phone || '';
            let countryVal = patient.countryCode || '52';

            // RETROCOMPATIBILIDAD: Si el teléfono guardado incluye el 52 (legacy)
            if (countryVal === '52' && phoneVal.startsWith('52') && phoneVal.length > 10) {
                phoneVal = phoneVal.substring(2);
            } else if (phoneVal.startsWith(countryVal) && phoneVal.length > 8) {
                phoneVal = phoneVal.substring(countryVal.length);
            }

            document.getElementById('editPatientPhone').value = phoneVal;
            
            // Cargar el selector de país
            if (document.getElementById('editPatientCountryCode')) {
                document.getElementById('editPatientCountryCode').value = countryVal;
            }

            // VALIDACIÓN: Avisar si escriben 52 al inicio
            document.getElementById('editPatientPhone').oninput = (e) => {
                const val = e.target.value;
                const currentCountry = document.getElementById('editPatientCountryCode')?.value || '52';
                if (currentCountry === '52' && val.startsWith('52')) {
                    ToastService.info("💡 Detectamos un '52' al inicio. El país ya está seleccionado, recuerda usar solo los 10 dígitos.", 3000);
                }
            };
        }
        if (document.getElementById('editPatientWantsWhatsapp')) {
            document.getElementById('editPatientWantsWhatsapp').checked = patient.wantsWhatsapp !== false;
        }
        if (document.getElementById('editPatientParentName')) {
            document.getElementById('editPatientParentName').value = patient.parentName || '';
        }
        if (document.getElementById('editPatientBirthday')) {
            document.getElementById('editPatientBirthday').value = patient.birthday || '';
        }

        const receipt = patient.reimbursementReceipt || {};
        const editReceiptAuto = document.getElementById('editPatientReimbursementAuto');
        const editReceiptTutor = document.getElementById('editPatientReimbursementTutorName');
        if (editReceiptAuto) editReceiptAuto.checked = receipt.autoGenerate === true;
        if (editReceiptTutor) editReceiptTutor.value = receipt.tutorName || '';

        // Renderizar sección de Temas (Solo Admin o si ya tiene temas)
        const themesSection = document.getElementById('adminPatientThemesSection');
        const themesList = document.getElementById('editPatientThemesList');
        if (themesSection && themesList) {
            if (AuthManager.currentUser?.role !== 'receptionist') {
                themesSection.classList.remove('hidden');
                const allThemes = SettingsManager.config.themes || [];
                const patientThemes = patient.assignedThemes || [];
                const patientSubthemes = patient.assignedSubthemes || []; // Nuevo: guardar subtemas específicos
                
                const renderThemes = () => {
                    themesList.innerHTML = allThemes.map(theme => {
                        const isChecked = patientThemes.includes(theme.id);
                        const subthemes = theme.subthemes || [];
                        
                        return `
                        <div class="theme-group border border-gray-100 rounded-xl p-2 bg-gray-50/30">
                            <label class="flex items-center gap-2 p-1 cursor-pointer group">
                                <input type="checkbox" name="patientTheme" value="${theme.id}" ${isChecked ? 'checked' : ''} 
                                    class="theme-checkbox w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 transition-all">
                                <span class="text-xs font-black text-gray-700 group-hover:text-blue-600">${theme.name}</span>
                            </label>
                            
                            <!-- Subtemas desglosados (Solo si el tema está activo) -->
                            <div class="subthemes-container ml-6 mt-2 space-y-1 ${isChecked ? '' : 'hidden'}">
                                ${subthemes.map(st => `
                                    <label class="flex items-center gap-2 cursor-pointer py-0.5 group/st">
                                        <input type="checkbox" name="patientSubtheme" value="${theme.id}:${st.name}" 
                                            ${patientSubthemes.includes(`${theme.id}:${st.name}`) ? 'checked' : ''}
                                            class="w-3 h-3 text-indigo-500 rounded border-gray-300">
                                        <span class="text-[10px] font-bold text-gray-500 group-hover/st:text-indigo-600">${st.name}</span>
                                    </label>
                                `).join('')}
                                
                                ${AuthManager.isAdmin() ? `
                                <!-- Botón para añadir subtema express -->
                                <button type="button" class="add-subtheme-btn flex items-center gap-1 text-[9px] font-black text-blue-400 hover:text-blue-600 uppercase pt-1 transition-colors" data-theme-id="${theme.id}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                    Añadir Subtema
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        `;
                    }).join('');

                    if (AuthManager.isAdmin()) {
                        // Añadir botón de "Nuevo Tema" express
                        const addNewBtn = document.createElement('button');
                        addNewBtn.type = 'button';
                        addNewBtn.className = "col-span-1 sm:col-span-2 mt-2 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2";
                        addNewBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> + Nuevo Tema de Trabajo`;
                        addNewBtn.onclick = () => PatientModals._handleCreateQuickTheme();
                        themesList.appendChild(addNewBtn);
                    }

                    // Re-bind toggles
                    themesList.querySelectorAll('.theme-checkbox').forEach(cb => {
                        cb.onchange = (e) => {
                            const container = e.target.closest('.theme-group').querySelector('.subthemes-container');
                            if (e.target.checked) {
                                container.classList.remove('hidden');
                            } else {
                                container.classList.add('hidden');
                                container.querySelectorAll('input').forEach(stCb => stCb.checked = false);
                            }
                        };
                    });

                    // Bind Add Subtheme buttons
                    themesList.querySelectorAll('.add-subtheme-btn').forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            const themeId = e.currentTarget.dataset.themeId;
                            PatientModals._handleCreateQuickSubtheme(themeId);
                        };
                    });
                };

                renderThemes();
                
                if (allThemes.length === 0) {
                     themesList.innerHTML = '<p class="text-[10px] text-gray-400 italic col-span-2">No hay temas creados. Pulsa el botón inferior para añadir uno.</p>';
                }
            } else {
                themesSection.classList.add('hidden');
            }
        }

        // Botón de guardar cambios
        if (dom.savePatientEditBtn) {
            dom.savePatientEditBtn.onclick = async () => {
                const newTherapist = dom.editPatientTherapist.value;
                const newCost = dom.editPatientCost ? parseFloat(dom.editPatientCost.value) : 0;
                const newClinicFee = document.getElementById('editPatientClinicFee') ? parseFloat(document.getElementById('editPatientClinicFee').value) : 250;
                const newPhone = document.getElementById('editPatientPhone')?.value.trim() || '';
                const countryCode = document.getElementById('editPatientCountryCode')?.value || '52';
                const newParentName = document.getElementById('editPatientParentName')?.value.trim() || '';
                const wantsWhatsapp = document.getElementById('editPatientWantsWhatsapp')?.checked !== false;
                const birthday = document.getElementById('editPatientBirthday')?.value || '';

                // Recoger temas seleccionados
                const selectedThemes = Array.from(document.querySelectorAll('input[name="patientTheme"]:checked')).map(cb => cb.value);
                const selectedSubthemes = Array.from(document.querySelectorAll('input[name="patientSubtheme"]:checked')).map(cb => cb.value);

                const success = await PatientActions.updatePatientProfile(
                    patient.id,
                    {
                        therapist: newTherapist,
                        defaultCost: newCost,
                        clinicFee: newClinicFee,
                        phone: newPhone,
                        countryCode: countryCode,
                        parentName: newParentName,
                        wantsWhatsapp: wantsWhatsapp,
                        assignedThemes: selectedThemes,
                        assignedSubthemes: selectedSubthemes,
                        birthday: birthday,
                        reimbursementReceipt: getReimbursementReceiptFromDom('editPatient')
                    },
                    patient.name
                );

                if (success) {
                    await ModalService.alert("Éxito", 'Perfil actualizado correctamente', "success");
                    this.closeHistory();
                }
            };
        }

        // Botón de desactivar
        if (dom.deactivatePatientBtn) {
            dom.deactivatePatientBtn.onclick = async () => {
                await PatientActions.deactivatePatient(patient.id, patient.name);
            };
        }

        // Botón de eliminar
        if (dom.deletePatientBtn) {
            dom.deletePatientBtn.onclick = async () => {
                await PatientActions.deletePatient(patient.id, patient.name);
            };
        }

        // Botón de Bienvenida
        const welcomeBtn = document.getElementById('patientWelcomeBtn');
        if (welcomeBtn) {
            welcomeBtn.onclick = async () => {
                const { WhatsAppMessaging } = await import('../../services/WhatsAppMessaging.js');
                
                // Intentar detectar el horario recurrente (Día y Hora)
                const now = new Date();
                const futureApts = (PatientState.appointments || [])
                    .filter(a => a.name === patient.name && !a.isCancelled && new Date(a.date) >= now)
                    .sort((a,b) => new Date(a.date) - new Date(b.date));
                
                let scheduleStr = "horario pendiente";
                if (futureApts.length > 0) {
                    const firstApt = new Date(futureApts[0].date);
                    const day = firstApt.toLocaleDateString('es-MX', { weekday: 'long' });
                    const hour = firstApt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    scheduleStr = `los ${day} a las ${hour}`;
                }

                // Enviamos el mensaje de bienvenida con el horario detectado
                WhatsAppMessaging.sendMessage({
                    name: patient.name,
                    therapist: patient.therapist,
                    schedule: scheduleStr
                }, 'welcome_optin');
                await PatientActions.updatePatientProfile(patient.id, {
                    recurrentOptIn: 'pending',
                    wantsWhatsapp: false
                }, patient.name);
                const badge = document.getElementById('patientWhatsAppOptInBadge');
                if (badge) {
                    badge.outerHTML = renderWhatsAppOptInBadge({ ...patient, recurrentOptIn: 'pending', wantsWhatsapp: false });
                }
            };
        }

        // Botón de agendar desde analítica
        const scheduleBtn = document.getElementById('scheduleFromHistoryBtn');
        if (scheduleBtn) {
            scheduleBtn.onclick = () => {
                this.closeHistory();
                const { ScheduleManager } = import('../../managers/ScheduleManager.js');
                ScheduleManager.openModal(
                    patient.id, 
                    patient.name, 
                    patient.therapist, 
                    patient.defaultCost
                );
            };
        }

        // Delegación de clicks para botones dentro de las tarjetas (Bitácora, Pagar, Confirmar)
        if (dom.patientHistoryList) {
            dom.patientHistoryList.onclick = async (e) => {
                const noteBtn = e.target.closest('.note-btn');
                if (noteBtn) {
                    e.stopPropagation();
                    const aptId = noteBtn.dataset.aptId;
                    const appointment = PatientState.appointments.find(a => a.id === aptId);
                    if (appointment) this.openSessionNote(appointment, patient);
                    return;
                }

                // Botón de WhatsApp Pago
                const waPayBtn = e.target.closest('.whatsapp-payment-btn');
                if (waPayBtn) {
                    e.stopPropagation();
                    const aptId = waPayBtn.dataset.aptId;
                    const apt = (PatientState.appointments || []).find(a => a.id === aptId);
                    if (apt) {
                        const { WhatsAppMessaging } = await import('../../services/WhatsAppMessaging.js');
                        WhatsAppMessaging.sendMessage(apt, 'payment');
                    }
                    return;
                }

                const payBtn = e.target.closest('.pay-btn');
                if (payBtn) {
                    // Logic already handled in PatientActions or similar, 
                    // but usually these specific handlers are set up elsewhere.
                    // For now, let's keep focusing on Bitácora.
                }
            };
        }
    },

    /**
     * Abre el modal de bitácora de sesión
     */
    async openSessionNote(appointment, patient) {
        if (AuthManager.currentUser?.role === 'receptionist') {
            ToastService.error("No tienes permisos para ver/editar la bitácora clínica.");
            return;
        }

        const modal = document.getElementById('sessionNoteModal');
        if (!modal) return;

        console.log('📝 Abriendo bitácora para cita:', appointment.id);

        // INTENTAR RECUPERAR NOTA PROTEGIDA (Paso de Privacidad)
        let clinicalProgress = appointment.clinicalProgress || {};
        try {
            const { db, doc, getDoc } = await import('../../firebase.js');
            const noteSnap = await getDoc(doc(db, 'clinicalNotes', appointment.id));
            if (noteSnap.exists()) {
                console.log("🔐 Nota protegida encontrada para esta sesión.");
                clinicalProgress = noteSnap.data().clinicalProgress || {};
            } else if (appointment.clinicalProgress) {
                console.log("📜 Usando nota legacy de la cita.");
            }
        } catch (err) {
            console.warn("⚠️ Error recuperando nota protegida (posible restricción de seguridad):", err);
        }

        // Referencias
        const dateEl = document.getElementById('sessionNoteDate');
        const themesList = document.getElementById('sessionThemesList');
        const generalNoteInput = document.getElementById('sessionGeneralNote');
        const saveBtn = document.getElementById('saveSessionNoteBtn');
        const searchInput = document.getElementById('themeSearchInput');
        const closeBtn = document.getElementById('closeSessionNoteBtn');
        const cancelBtn = document.getElementById('cancelSessionNoteBtn');

        // Logic para cerrar
        const closeThis = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            this._syncBodyScroll(false);
        };
        if (closeBtn) closeBtn.onclick = closeThis;
        if (cancelBtn) cancelBtn.onclick = closeThis;
        modal.onclick = (e) => {
            if (e.target === modal) closeThis();
        };

        // Reset UI
        if (dateEl) {
            const dateStr = new Date(appointment.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            dateEl.textContent = `${dateStr} @ ${new Date(appointment.date).getHours()}:00`;
        }
        if (generalNoteInput) generalNoteInput.value = clinicalProgress.generalNote || '';
        if (searchInput) searchInput.value = '';

        // Renderizar temas específicos del paciente
        const renderThemesList = (filter = '') => {
            this._renderSessionThemes(clinicalProgress, patient, filter);
        };

        // Estado local temporal para los botones
        const currentProgress = clinicalProgress.themes || {};
        
        // Buscador
        if (searchInput) {
            searchInput.oninput = (e) => renderThemesList(e.target.value);
        }

        // Guardar
        if (saveBtn) {
            saveBtn.onclick = async () => {
                saveBtn.disabled = true;
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
                
                // Recoger datos de los inputs de la bitácora
                const themesData = {};
                modal.querySelectorAll('.achievement-cb').forEach(cb => {
                    const tId = cb.dataset.theme;
                    const stName = cb.dataset.subtheme;
                    const note = modal.querySelector(`.subtheme-note[data-theme="${tId}"][data-subtheme="${stName}"]`)?.value || '';
                    
                    if (!themesData[tId]) themesData[tId] = {};
                    themesData[tId][stName] = {
                        achieved: cb.checked,
                        note: note
                    };
                });

                const updatedProgress = {
                    themes: themesData,
                    generalNote: generalNoteInput.value.trim()
                };

                const therapistKey = appointment.therapist || AuthManager.currentUser?.therapist || 'diana';
                const success = await PatientActions.updateAppointmentNote(appointment.id, updatedProgress, therapistKey);

                if (success) {
                    ToastService.success('Bitácora guardada correctamente');
                    modal.classList.add('hidden');
                    appointment.clinicalProgress = updatedProgress;
                    appointment.hasClinicalNote = true;
                    this.openHistory(patient); 
                }

                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            };
        }

        renderThemesList();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        this._syncBodyScroll(true);
    },

    // ==========================================
    // MODAL DE PACIENTES INACTIVOS
    // ==========================================

    /**
     * Abre el modal de pacientes inactivos
     */
    openInactivePatients() {
        const { dom, patients } = PatientState;

        if (!dom.inactivePatientsModal) {
            console.warn('⚠️ PatientModals: Modal de inactivos no encontrado');
            return;
        }

        // Obtener pacientes inactivos
        const inactivePatients = patients.filter(p => p.isActive === false);

        // Renderizar lista
        this._renderInactivePatients(inactivePatients);

        dom.inactivePatientsModal.classList.remove('hidden');
        dom.inactivePatientsModal.style.display = 'flex';
        dom.inactivePatientsModal.style.zIndex = '9800';
        this._syncBodyScroll(true);

        console.log('✅ PatientModals: Modal de inactivos abierto');
    },

    /**
     * Cierra el modal de pacientes inactivos
     */
    closeInactivePatients() {
        const { dom } = PatientState;

        if (dom.inactivePatientsModal) {
            dom.inactivePatientsModal.classList.add('hidden');
            dom.inactivePatientsModal.style.display = 'none';
        }
        this._syncBodyScroll(false);

        console.log('✅ PatientModals: Modal de inactivos cerrado');
    },

    /**
     * Renderiza la lista de pacientes inactivos
     * @private
     * @param {Array<Object>} patients - Lista de pacientes inactivos
     */
    _renderInactivePatients(patients) {
        const { dom } = PatientState;

        if (!dom.inactivePatientsList) return;

        if (patients.length === 0) {
            dom.inactivePatientsList.innerHTML = `
                <p class="text-sm text-gray-400 text-center py-4">
                    No hay pacientes inactivos
                </p>
            `;
            return;
        }

        // Ordenar alfabéticamente
        const sortedPatients = [...patients].sort((a, b) =>
            a.name.localeCompare(b.name, 'es')
        );

        dom.inactivePatientsList.innerHTML = '';

        sortedPatients.forEach(patient => {
            const patientEl = document.createElement('div');
            patientEl.className = 'p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2 flex items-center justify-between';

            // Calcular deuda
            const pendingApts = PatientFilters.getPendingPayments(patient.name);
            const totalDebt = pendingApts.reduce((sum, apt) => sum + (parseFloat(apt.cost) || 0), 0);

            const debtHtml = totalDebt > 0
                ? `<div class="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1 mt-1 w-fit">
                     <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                     Deuda: $${totalDebt}
                   </div>`
                : '';

            const legacyHtml = patient.legacyData
                ? `<div class="mt-1 text-xs text-gray-500 bg-gray-100 p-1.5 rounded border border-gray-200">
                     <div class="font-medium text-gray-700 mb-0.5">Recordatorio:</div>
                     <div class="flex items-center gap-2">
                        <span>📅 ${patient.legacyData.usualDay} ${patient.legacyData.usualTime}</span>
                        <span>💰 $${patient.legacyData.lastCost}</span>
                     </div>
                   </div>`
                : '';

            patientEl.innerHTML = `
                <div>
                    <div class="font-semibold text-gray-800">${escapeHTML(patient.name)}</div>
                    <div class="text-xs text-gray-500">
                        Terapeuta: ${patient.therapist === 'diana' ? 'Diana' : 'Sam'}
                    </div>
                    ${debtHtml}
                    ${legacyHtml}
                </div>
                <button 
                    class="reactivate-btn px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm h-fit"
                    data-id="${escapeHTML(patient.id)}"
                    data-name="${escapeHTML(patient.name)}">
                    ✓ Reactivar
                </button>
            `;

            dom.inactivePatientsList.appendChild(patientEl);
        });
    },

    // ==========================================
    // UTILIDADES
    // ==========================================

    /**
     * Cierra todos los modales
     */
    closeAll() {
        this.closeNewPatient();
        this.closeHistory();
        this.closeInactivePatients();
        console.log('✅ PatientModals: Todos los modales cerrados');
    },

    /**
     * Helper para renderizar los botones de status en la bitácora
     */
    _renderStatusButtons(themeId, itemName, currentStatus) {
        // Escapar comillas en itemName por si contienen caracteres especiales
        const safeName = itemName.replace(/'/g, "\\'");
        return `
            <div class="flex gap-1">
                <button onclick="window.setSubthemeStatus('${themeId}', '${safeName}', 'done', this)" class="sub-status-btn w-6 h-6 flex items-center justify-center rounded-lg ${currentStatus === 'done' ? 'bg-green-500 text-white' : 'bg-white text-gray-300 hover:text-green-500'} transition-all" title="Hecho">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <button onclick="window.setSubthemeStatus('${themeId}', '${safeName}', 'progress', this)" class="sub-status-btn w-6 h-6 flex items-center justify-center rounded-lg ${currentStatus === 'progress' ? 'bg-orange-500 text-white' : 'bg-white text-gray-300 hover:text-orange-500'} transition-all" title="En progreso">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
            </div>
        `;
    },

    /**
     * Helper para crear un tema rápido desde el modal de edición
     * @private
     */
    async _handleCreateQuickTheme() {
        const { ModalService } = await import('../../utils/ModalService.js');
        const { SettingsManager } = await import('../SettingsManager.js');
        const { ToastService } = await import('../../utils/ToastService.js');

        const name = await ModalService.prompt("Nuevo Tema", "¿Cómo se llama el nuevo tema de trabajo?", "Ej: Deglución Atípica");
        if (!name) return;

        const subName = await ModalService.prompt("Sub-tema inicial", `Añade un primer sub-tema para "${name}" (Opcional)`, "Ej: General");
        
        const newTheme = {
            id: 'tema_' + name.toLowerCase().trim().replace(/\s+/g, '_'),
            name: name,
            subthemes: subName ? [{ name: subName, items: [] }] : []
        };

        const currentThemes = SettingsManager.config.themes || [];
        if (currentThemes.some(t => t.id === newTheme.id)) {
            ToastService.error("Ese tema ya existe.");
            return;
        }

        SettingsManager.config.themes = [...currentThemes, newTheme];
        const success = await SettingsManager.saveConfig();
        
        if (success) {
            ToastService.success("Tema creado y guardado en el catálogo global.");
            const patient = PatientState.selectedPatient;
            if (patient) PatientModals._setupHistoryActions(patient);
        }
    },

    /**
     * Helper para crear un sub-tema rápido dentro de un tema existente
     * @private
     */
    async _handleCreateQuickSubtheme(themeId) {
        const { ModalService } = await import('../../utils/ModalService.js');
        const { SettingsManager } = await import('../SettingsManager.js');
        const { ToastService } = await import('../../utils/ToastService.js');

        const name = await ModalService.prompt("Nuevo Sub-tema", `¿Cómo se llama el nuevo sub-tema para este grupo?`, "Ej: Fonema /rr/");
        if (!name) return;

        const allThemes = SettingsManager.config.themes || [];
        const theme = allThemes.find(t => t.id === themeId);
        
        if (!theme) return;

        if (!theme.subthemes) theme.subthemes = [];
        
        if (theme.subthemes.some(st => st.name.toLowerCase() === name.toLowerCase())) {
            ToastService.error("Este sub-tema ya existe en este grupo.");
            return;
        }

        theme.subthemes.push({ name: name, items: [] });
        const success = await SettingsManager.saveConfig();

        if (success) {
            ToastService.success(`Sub-tema "${name}" añadido correctamente.`);
            const patient = PatientState.selectedPatient;
            if (patient) PatientModals._setupHistoryActions(patient);
        }
    },

    /**
     * Renderiza los temas en la bitácora de sesión con subtemas
     * @private
     */
    _renderSessionThemes(clinicalProgress, patient, filter = '') {
        const themesList = document.getElementById('sessionThemesList');
        if (!themesList) return;


        const allThemes = SettingsManager.config.themes || [];
        const assignedThemeIds = patient.assignedThemes || [];
        const assignedSubthemes = patient.assignedSubthemes || []; 
        
        const patientThemes = allThemes.filter(t => assignedThemeIds.includes(t.id));

        if (patientThemes.length === 0) {
            themesList.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">No hay temas asignados. Ve a "Editar Perfil" para asignar un plan de trabajo.</p>';
            return;
        }

        const searchLower = filter.toLowerCase();

        themesList.innerHTML = patientThemes.map(theme => {
            const filteredSubthemes = theme.subthemes.filter(st => {
                const isAssigned = assignedSubthemes.includes(`${theme.id}:${st.name}`);
                const matchesSearch = !filter || st.name.toLowerCase().includes(searchLower) || theme.name.toLowerCase().includes(searchLower);
                return isAssigned && matchesSearch;
            });

            if (filter && filteredSubthemes.length === 0 && !theme.name.toLowerCase().includes(searchLower)) return '';

            // Si no hay subtemas específicos asignados, mostramos todos los del tema (fallback útil)
            const subthemesToShow = filteredSubthemes.length > 0 ? filteredSubthemes : theme.subthemes.filter(st => !filter || st.name.toLowerCase().includes(searchLower) || theme.name.toLowerCase().includes(searchLower));

            return `
                <div class="theme-block bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <h5 class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">${theme.name}</h5>
                    <div class="grid grid-cols-1 gap-2">
                        ${subthemesToShow.map(st => `
                            <div class="subtheme-item bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-[10px] font-bold text-gray-600">${st.name}</span>
                                    <div class="flex items-center gap-1">
                                        <input type="checkbox" data-theme="${theme.id}" data-subtheme="${st.name}" 
                                            ${clinicalProgress.themes?.[theme.id]?.[st.name]?.achieved ? 'checked' : ''}
                                            class="achievement-cb w-3 h-3 text-green-500 rounded border-gray-300">
                                        <span class="text-[8px] font-black text-green-600 uppercase">Logrado</span>
                                    </div>
                                </div>
                                <input type="text" placeholder="Observación específica..." 
                                    value="${clinicalProgress.themes?.[theme.id]?.[st.name]?.note || ''}"
                                    data-theme="${theme.id}" data-subtheme="${st.name}"
                                    class="subtheme-note w-full bg-gray-50 border-none rounded p-1 text-[10px] focus:ring-1 focus:ring-indigo-100 outline-none">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
};
