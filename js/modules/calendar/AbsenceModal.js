/**
 * AbsenceModal.js
 * Controlador para la gestión premium de ausencias y vacaciones de terapeutas
 */

import { CalendarState } from './CalendarState.js';
import { CalendarData } from './CalendarData.js';
import { CalendarUI } from './CalendarUI.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { LoaderService } from '../../utils/LoaderService.js';
import { formatDateLocal } from '../../utils/dateUtils.js';
import { escapeHTML } from '../../utils/sanitize.js';
import { db, collectionPath, writeBatch, doc, collection } from '../../firebase.js';

export const AbsenceModal = {
    initialized: false,
    conflictedAppointments: [],

    init() {
        if (this.initialized) return;
        this.bindEvents();
        this.populateHours();
        this.initialized = true;
    },

    bindEvents() {
        const modal = document.getElementById('absenceModal');
        if (!modal) return;

        const startInput = document.getElementById('absenceStartDate');
        const endInput = document.getElementById('absenceEndDate');
        const allDayCheckbox = document.getElementById('absenceAllDay');
        const therapistSelect = document.getElementById('absenceTherapist');
        const startHourSelect = document.getElementById('absenceStartHour');
        const endHourSelect = document.getElementById('absenceEndHour');
        const saveBtn = document.getElementById('absenceSaveBtn');

        // Check for conflicts on input changes
        const triggerConflictCheck = () => this.checkConflicts();
        
        if (startInput) startInput.onchange = triggerConflictCheck;
        if (endInput) endInput.onchange = triggerConflictCheck;
        if (therapistSelect) therapistSelect.onchange = triggerConflictCheck;
        if (startHourSelect) startHourSelect.onchange = triggerConflictCheck;
        if (endHourSelect) endHourSelect.onchange = triggerConflictCheck;

        if (allDayCheckbox) {
            allDayCheckbox.onchange = (e) => {
                const selects = document.getElementById('absenceTimeRangeSelects');
                if (selects) {
                    selects.classList.toggle('hidden', e.target.checked);
                }
                this.checkConflicts();
            };
        }

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) this.close();
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    populateHours() {
        const startSelect = document.getElementById('absenceStartHour');
        const endSelect = document.getElementById('absenceEndHour');
        if (!startSelect || !endSelect) return;

        startSelect.innerHTML = '';
        endSelect.innerHTML = '';

        for (let hour = 8; hour <= 20; hour++) {
            const label = hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
            
            const startOpt = document.createElement('option');
            startOpt.value = hour;
            startOpt.textContent = label;
            startSelect.appendChild(startOpt);

            const endOpt = document.createElement('option');
            endOpt.value = hour + 1;
            endOpt.textContent = hour + 1 === 12 ? '12:00 PM' : hour + 1 > 12 ? `${hour + 1 - 12}:00 PM` : `${hour + 1}:00 AM`;
            endSelect.appendChild(endOpt);
        }
        
        // Defaults: 8 AM to 1 PM
        startSelect.value = 8;
        endSelect.value = 13;
    },

    open(initialDateStr) {
        this.init();

        const modal = document.getElementById('absenceModal');
        if (!modal) {
            console.error('absenceModal element not found in DOM.');
            return;
        }

        // Setup dates
        const todayStr = initialDateStr || new Date().toISOString().split('T')[0];
        document.getElementById('absenceStartDate').value = todayStr;
        document.getElementById('absenceEndDate').value = todayStr;

        // Reset notes and all-day check
        document.getElementById('absenceNote').value = '';
        const allDayCheckbox = document.getElementById('absenceAllDay');
        if (allDayCheckbox) {
            allDayCheckbox.checked = true;
            document.getElementById('absenceTimeRangeSelects').classList.add('hidden');
        }

        // Default type
        const vacationRadio = document.querySelector('input[name="absenceType"][value="vacation"]');
        if (vacationRadio) vacationRadio.checked = true;

        // Restriction/Permission for therapists (Vero / Sam)
        const therapistSelect = document.getElementById('absenceTherapist');
        const userRole = AuthManager.currentUser?.role;
        const userTherapist = AuthManager.currentUser?.therapist;

        if (therapistSelect) {
            if (userRole === 'therapist' && userTherapist && userTherapist !== 'all') {
                therapistSelect.value = userTherapist;
                therapistSelect.disabled = true;
            } else {
                therapistSelect.disabled = false;
                const activeTherapist = AuthManager.getSelectedTherapist();
                therapistSelect.value = (activeTherapist && activeTherapist !== 'all') ? activeTherapist : 'diana';
            }
        }

        this.checkConflicts();

        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        document.body.classList.add('overflow-hidden');
    },

    close() {
        const modal = document.getElementById('absenceModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
        }
        
        // Remove body overflow-hidden only if no other main modal is open
        const otherModalOpen = document.getElementById('eventModal') && !document.getElementById('eventModal').classList.contains('hidden');
        if (!otherModalOpen) {
            document.body.classList.remove('overflow-hidden');
        }
    },

    checkConflicts() {
        const therapist = document.getElementById('absenceTherapist')?.value;
        const startDateStr = document.getElementById('absenceStartDate')?.value;
        const endDateStr = document.getElementById('absenceEndDate')?.value;
        const allDay = document.getElementById('absenceAllDay')?.checked;
        const startHour = parseInt(document.getElementById('absenceStartHour')?.value) || 8;
        const endHour = parseInt(document.getElementById('absenceEndHour')?.value) || 20;

        const card = document.getElementById('absenceConflictsCard');
        const list = document.getElementById('absenceConflictsList');
        const countSpan = document.getElementById('absenceConflictsCount');

        if (!therapist || !startDateStr || !endDateStr || !list) return;

        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');

        // Filter loaded appointments in local state
        this.conflictedAppointments = CalendarState.appointments.filter(appt => {
            // Ignore cancellations and other blocks
            if (appt.isCancelled || appt.isFullDayBlock || appt.isHourlyBlock) return false;
            
            // Therapist match
            if (appt.therapist !== therapist) return false;

            const apptDate = new Date(appt.date);
            // Date range match
            if (apptDate < start || apptDate > end) return false;

            // Hour match if not all day
            if (!allDay) {
                const apptHour = apptDate.getHours();
                if (apptHour < startHour || apptHour >= endHour) return false;
            }

            return true;
        });

        // Sort by date/hour
        this.conflictedAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Render conflicts list
        list.innerHTML = '';
        if (this.conflictedAppointments.length > 0) {
            countSpan.textContent = this.conflictedAppointments.length;
            card.classList.remove('hidden');

            this.conflictedAppointments.forEach(appt => {
                const apptDate = new Date(appt.date);
                const dayLabel = apptDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
                const hourLabel = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                
                const div = document.createElement('div');
                div.className = "py-1.5 flex justify-between items-center gap-2 border-b last:border-b-0 border-amber-100";
                div.innerHTML = `
                    <span class="truncate font-bold text-gray-800">${escapeHTML(appt.name)}</span>
                    <span class="text-[10px] text-amber-800 bg-amber-100/50 px-2 py-0.5 rounded font-mono">${dayLabel} - ${hourLabel}</span>
                `;
                list.appendChild(div);
            });
        } else {
            card.classList.add('hidden');
        }
    },

    async save() {
        const therapist = document.getElementById('absenceTherapist')?.value;
        const startDateStr = document.getElementById('absenceStartDate')?.value;
        const endDateStr = document.getElementById('absenceEndDate')?.value;
        const allDay = document.getElementById('absenceAllDay')?.checked;
        const startHour = parseInt(document.getElementById('absenceStartHour')?.value) || 8;
        const endHour = parseInt(document.getElementById('absenceEndHour')?.value) || 20;
        const note = document.getElementById('absenceNote')?.value.trim();
        const reason = document.querySelector('input[name="absenceType"]:checked')?.value || 'vacation';

        // 1. Permission checks
        if (!AuthManager.canManageBlockFor(therapist)) {
            ModalService.alert("Permiso Denegado", "No tienes permisos para modificar el horario de esta terapeuta.", "error");
            return;
        }

        if (!startDateStr || !endDateStr) {
            ModalService.alert("Faltan Datos", "Por favor ingresa un rango de fechas válido.", "warning");
            return;
        }

        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');

        if (start > end) {
            ModalService.alert("Rango de Fechas Inválido", "La fecha de inicio no puede ser posterior a la fecha de fin.", "warning");
            return;
        }

        // S-013: Horas válidas (endHour > startHour)
        if (!allDay && endHour <= startHour) {
            ModalService.alert("Horario Inválido", "La hora de fin debe ser mayor que la hora de inicio.", "warning");
            return;
        }

        // S-014: Detección de bloqueos duplicados en memoria
        const duplicateBlocks = CalendarState.appointments.filter(appt => {
            if (appt.isCancelled || (!appt.isFullDayBlock && !appt.isHourlyBlock)) return false;
            if (appt.therapist !== therapist) return false;

            const apptDate = new Date(appt.date);
            // Validar si cae en el rango de fechas
            const apptDay = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
            if (apptDay < start || apptDay > end) return false;

            if (allDay) {
                return true;
            } else {
                const apptHour = apptDate.getHours();
                if (apptHour >= startHour && apptHour < endHour) {
                    return true;
                }
            }
            return false;
        });

        if (duplicateBlocks.length > 0) {
            const proceed = await ModalService.confirm(
                "Bloqueos Existentes",
                `Ya existen <strong>${duplicateBlocks.length} bloqueos</strong> registrados para esta terapeuta en el rango seleccionado.<br><br>¿Deseas agregarlos de todas formas?`
            );
            if (!proceed) return;
        }

        // 2. Conflict confirmation
        if (this.conflictedAppointments.length > 0) {
            const count = this.conflictedAppointments.length;
            // S-015: escapar nombres de paciente antes de meterlos en el mensaje HTML del ModalService
            const patientNames = Array.from(new Set(this.conflictedAppointments.map(a => a.name)))
                .slice(0, 3)
                .map(n => escapeHTML(n))
                .join(', ');
            const summary = count > 3 ? `${patientNames} y ${count - 3} más` : patientNames;

            const confirmSave = await ModalService.confirm(
                "Citas Afectadas",
                `Bloquear este rango afectará a <strong>${count} citas</strong> (${summary}).<br><br>¿Estás seguro de proceder con el bloqueo? Tendrás que reagendar o cancelar estas citas de forma manual en la agenda.`
            );

            if (!confirmSave) return;
        }

        LoaderService.show("Registrando ausencias...");
        try {
            // Generate list of days to block
            const daysToBlock = [];
            let currentDay = new Date(start);
            while (currentDay <= end) {
                // Ignore Sundays
                if (currentDay.getDay() !== 0) {
                    daysToBlock.push(formatDateLocal(currentDay));
                }
                currentDay.setDate(currentDay.getDate() + 1);
            }

            if (daysToBlock.length === 0) {
                ToastService.warn("No hay días hábiles seleccionados (los domingos están excluidos por defecto)");
                LoaderService.hide();
                return;
            }

            // S-012: Create Firestore entries in batch (atómico y óptimo)
            const batch = writeBatch(db);
            const appointmentsCol = collection(db, collectionPath);

            // Map reason to dynamic names and emojis
            const reasonMap = {
                vacation: { emoji: "🏖️", text: "Vacaciones" },
                medical: { emoji: "🏥", text: "Ausencia Médica" },
                training: { emoji: "📚", text: "Capacitación" },
                personal: { emoji: "👤", text: "Asunto Personal" },
                other: { emoji: "⛔", text: "Hora Inhábil" }
            };
            const reasonInfo = reasonMap[reason] || { emoji: "⛔", text: "Hora Inhábil" };

            for (const dayStr of daysToBlock) {
                if (allDay) {
                    const docRef = doc(appointmentsCol);
                    batch.set(docRef, {
                        name: `${reasonInfo.emoji} ${reasonInfo.text} (Todo el día)`,
                        date: `${dayStr}T08:00:00`,
                        cost: 0,
                        isSchoolVisit: false,
                        isFullDayBlock: true,
                        isHourlyBlock: false,
                        therapist: therapist,
                        blockReason: reason,
                        blockNote: note || '',
                        createdAt: new Date().toISOString()
                    });
                } else {
                    for (let h = startHour; h < endHour; h++) {
                        const hStr = h.toString().padStart(2, '0');
                        const docRef = doc(appointmentsCol);
                        batch.set(docRef, {
                            name: `${reasonInfo.emoji} ${reasonInfo.text}`,
                            date: `${dayStr}T${hStr}:00:00`,
                            cost: 0,
                            isSchoolVisit: false,
                            isFullDayBlock: false,
                            isHourlyBlock: true,
                            therapist: therapist,
                            blockReason: reason,
                            blockNote: note || '',
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            }

            await batch.commit();

            ToastService.success(`Ausencia registrada exitosamente (${daysToBlock.length} día(s)) 🎉`);
            this.close();
            
            // Re-render calendar UI to display the new blocks
            if (CalendarUI && typeof CalendarUI.renderCalendar === 'function') {
                CalendarUI.renderCalendar(
                    CalendarState.onEventClickCallback || null,
                    CalendarState.onEmptySlotClickCallback || null
                );
            }
        } catch (err) {
            console.error("Error creating absence blocks:", err);
            ModalService.alert("Error", "No se pudo registrar la ausencia: " + err.message, "error");
        } finally {
            LoaderService.hide();
        }
    }
};
