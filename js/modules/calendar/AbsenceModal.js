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
import { formatDateLocal, formatTime12h } from '../../utils/dateUtils.js';
import { isSlotFree } from '../../utils/validators.js';
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

        // Refrescar conflictos + resumen + validación visual en cualquier cambio
        const refresh = () => {
            this.checkConflicts();
            this._updateSummary();
            this._validateHourRange();
        };

        if (startInput) startInput.onchange = refresh;
        if (endInput) endInput.onchange = refresh;
        if (therapistSelect) {
            therapistSelect.onchange = () => {
                refresh();
                if (this._getConflictAction() === 'reassign') {
                    this._populateSubstituteSelect(therapistSelect.value);
                    this._renderSubstituteReassignPanel();
                }
            };
        }
        if (startHourSelect) startHourSelect.onchange = refresh;
        if (endHourSelect) endHourSelect.onchange = refresh;

        if (allDayCheckbox) {
            allDayCheckbox.onchange = (e) => {
                const selects = document.getElementById('absenceTimeRangeSelects');
                if (selects) {
                    selects.classList.toggle('hidden', e.target.checked);
                }
                refresh();
            };
        }

        // Cambios en el tipo de ausencia → actualizar resumen
        modal.querySelectorAll('input[name="absenceType"]').forEach(radio => {
            radio.addEventListener('change', () => this._updateSummary());
        });

        // Atajos rápidos de rango (Hoy / Esta semana / Próxima semana / 2 semanas)
        modal.querySelectorAll('[data-absence-quick]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const kind = e.currentTarget.getAttribute('data-absence-quick');
                this._applyQuickRange(kind);
            });
        });

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) this.close();
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }

        modal.querySelectorAll('input[name="absenceConflictAction"]').forEach(radio => {
            radio.addEventListener('change', () => this._toggleConflictActionUI());
        });
        const subSelect = document.getElementById('absenceSubstituteTherapist');
        if (subSelect) subSelect.onchange = () => this._renderSubstituteReassignPanel();
    },

    _getConflictAction() {
        return document.querySelector('input[name="absenceConflictAction"]:checked')?.value || 'block_only';
    },

    _toggleConflictActionUI() {
        const wrap = document.getElementById('absenceSubstituteWrap');
        const action = this._getConflictAction();
        if (wrap) wrap.classList.toggle('hidden', action !== 'reassign');
        if (action === 'reassign') {
            const therapist = document.getElementById('absenceTherapist')?.value;
            this._populateSubstituteSelect(therapist);
            this._renderSubstituteReassignPanel();
        }
    },

    _therapistLabel(id) {
        const k = (id || '').toLowerCase();
        if (k === 'diana') return 'Diana';
        if (k === 'sam') return 'Sam';
        if (k === 'vero') return 'Vero';
        return id || '';
    },

    _buildSubstituteReassignReport(substituteId) {
        const fits = [];
        const needsAlt = [];
        for (const appt of this.conflictedAppointments) {
            if (!this._substituteHasPatientAtSlot(substituteId, appt)) {
                fits.push(appt);
            } else {
                needsAlt.push({
                    appt,
                    altSlots: this._findSameDayOpenSlots(substituteId, appt)
                });
            }
        }
        return { fits, needsAlt };
    },

    /** Huecos libres de la sustituta el mismo día, ordenados por cercanía a la hora original. */
    _findSameDayOpenSlots(substituteId, appt, limit = 4) {
        const ref = new Date(appt.date);
        const preferHour = ref.getHours();
        const candidates = [];
        for (let h = 8; h <= 20; h++) {
            const slotDate = new Date(ref);
            slotDate.setHours(h, 0, 0, 0);
            if (slotDate.getDay() === 0) continue;
            if (isSlotFree(slotDate, CalendarState.appointments, appt.id, substituteId)) {
                candidates.push({ hour: h, label: formatTime12h(h), distance: Math.abs(h - preferHour) });
            }
        }
        candidates.sort((a, b) => a.distance - b.distance);
        return candidates.slice(0, limit);
    },

    _renderSubstituteReassignPanel() {
        const fitEl = document.getElementById('absenceSubstituteFitSummary');
        const listEl = document.getElementById('absenceSubstituteSuggestions');
        const substitute = document.getElementById('absenceSubstituteTherapist')?.value;

        if (!fitEl || !listEl || this._getConflictAction() !== 'reassign' || !substitute) {
            fitEl?.classList.add('hidden');
            listEl?.classList.add('hidden');
            return;
        }

        const { fits, needsAlt } = this._buildSubstituteReassignReport(substitute);
        const subName = this._therapistLabel(substitute);

        if (fits.length > 0) {
            fitEl.textContent = `✅ ${fits.length} cita(s) caben con ${subName} a la misma hora y día (se reasignan al guardar).`;
            fitEl.classList.remove('hidden');
        } else {
            fitEl.classList.add('hidden');
        }

        if (needsAlt.length === 0) {
            listEl.classList.add('hidden');
            listEl.innerHTML = '';
            return;
        }

        const maxRows = 12;
        const rows = needsAlt.slice(0, maxRows);
        let html = `<p class="font-black text-indigo-900 uppercase tracking-wider text-[10px] mb-1">⚠️ ${needsAlt.length} cita(s) — ${subName} ocupada a esa hora · huecos ese día</p>`;

        rows.forEach(({ appt, altSlots }) => {
            const d = new Date(appt.date);
            const dayLabel = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
            const hourLabel = formatTime12h(d.getHours());
            const alts = altSlots.length
                ? altSlots.map(s => s.label).join(', ')
                : 'sin huecos 8 AM–8 PM ese día';
            html += `<div class="py-1.5 border-b border-indigo-100/80 last:border-0 leading-snug">
                <span class="font-bold text-gray-900">${escapeHTML(appt.name)}</span>
                <span class="text-indigo-800"> · ${dayLabel} ${hourLabel}</span>
                <div class="text-indigo-700 mt-0.5">Libres con ${subName}: <strong>${alts}</strong></div>
            </div>`;
        });

        if (needsAlt.length > maxRows) {
            html += `<p class="text-indigo-600 font-semibold pt-1">… y ${needsAlt.length - maxRows} más (coordina manual o cancela).</p>`;
        }

        listEl.innerHTML = html;
        listEl.classList.remove('hidden');
    },

    _populateSubstituteSelect(awayTherapist) {
        const select = document.getElementById('absenceSubstituteTherapist');
        if (!select) return;
        const away = (awayTherapist || '').toLowerCase();
        const labels = { diana: 'Diana', sam: 'Sam', vero: 'Vero' };
        const options = ['diana', 'sam', 'vero'].filter(t => t !== away);
        select.innerHTML = options.map(t => `<option value="${t}">${labels[t]}</option>`).join('');
    },

    _substituteHasPatientAtSlot(substituteId, appt) {
        const target = new Date(appt.date);
        const dayKey = formatDateLocal(target);
        const hour = target.getHours();
        return CalendarState.appointments.some(a => {
            if (a.isCancelled || a.isFullDayBlock || a.isHourlyBlock) return false;
            if ((a.therapist || '').toLowerCase() !== substituteId) return false;
            const d = new Date(a.date);
            return formatDateLocal(d) === dayKey && d.getHours() === hour;
        });
    },

    /** Atajos rápidos: rellena Fecha Inicio y Fecha Fin con un rango común. */
    _applyQuickRange(kind) {
        const startInput = document.getElementById('absenceStartDate');
        const endInput = document.getElementById('absenceEndDate');
        const allDayCheckbox = document.getElementById('absenceAllDay');
        if (!startInput || !endInput) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Lunes de la semana en curso (si es domingo, el lunes es mañana).
        const monday = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = (dayOfWeek === 0) ? 1 : (1 - dayOfWeek);
        monday.setDate(today.getDate() + diffToMonday);

        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);

        const nextSaturday = new Date(saturday);
        nextSaturday.setDate(saturday.getDate() + 7);

        let start, end;
        switch (kind) {
            case 'today':    start = today; end = today; break;
            case 'week':     start = today > monday ? today : monday; end = saturday; break;
            case 'nextweek': start = nextMonday; end = nextSaturday; break;
            case 'twoweeks': start = today > monday ? today : monday; end = nextSaturday; break;
            default: return;
        }

        startInput.value = formatDateLocal(start);
        endInput.value = formatDateLocal(end);

        // Para rangos > 1 día, conviene "Todo el día" por defecto
        if (kind !== 'today' && allDayCheckbox && !allDayCheckbox.checked) {
            allDayCheckbox.checked = true;
            const selects = document.getElementById('absenceTimeRangeSelects');
            if (selects) selects.classList.add('hidden');
        }

        this.checkConflicts();
        this._updateSummary();
        this._validateHourRange();
    },

    /** Actualiza el card de resumen (tipo + terapeuta + rango + días hábiles + horario). */
    _updateSummary() {
        const summaryCard = document.getElementById('absenceSummaryCard');
        const summaryText = document.getElementById('absenceSummaryText');
        if (!summaryCard || !summaryText) return;

        const startDateStr = document.getElementById('absenceStartDate')?.value;
        const endDateStr = document.getElementById('absenceEndDate')?.value;
        const allDay = document.getElementById('absenceAllDay')?.checked;
        const startHour = parseInt(document.getElementById('absenceStartHour')?.value) || 8;
        const endHour = parseInt(document.getElementById('absenceEndHour')?.value) || 20;
        const therapist = document.getElementById('absenceTherapist')?.value || '';
        const reason = document.querySelector('input[name="absenceType"]:checked')?.value || 'vacation';

        if (!startDateStr || !endDateStr) {
            summaryCard.classList.add('hidden');
            return;
        }

        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');
        if (start > end) {
            summaryCard.classList.add('hidden');
            return;
        }

        // Días hábiles del rango (excluye domingos)
        let workingDays = 0;
        const cursor = new Date(start);
        while (cursor <= end) {
            if (cursor.getDay() !== 0) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
        }

        if (workingDays === 0) {
            summaryText.textContent = 'Sin días hábiles seleccionados (los domingos se excluyen).';
            summaryCard.classList.remove('hidden');
            return;
        }

        const sameDay = startDateStr === endDateStr;
        const reasonLabel = {
            vacation: '🏖️ Vacaciones',
            medical: '🏥 Médica',
            training: '📚 Capacitación',
            personal: '👤 Personal',
            other: '🚫 Otro'
        }[reason] || '🚫 Ausencia';

        const therapistName = (therapist || '').charAt(0).toUpperCase() + (therapist || '').slice(1);
        const fmtShort = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
        const fmtHour = (h) => (h === 12) ? '12:00 PM' : (h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`);

        const rangeStr = sameDay ? fmtShort(start) : `${fmtShort(start)} → ${fmtShort(end)}`;
        const timeStr = allDay ? 'Todo el día' : `${fmtHour(startHour)} – ${fmtHour(endHour)}`;
        const daysLabel = workingDays === 1 ? '1 día hábil' : `${workingDays} días hábiles`;

        summaryText.innerHTML = `${reasonLabel} · <strong>${escapeHTML(therapistName)}</strong> · ${rangeStr} <span class="text-indigo-400">·</span> ${daysLabel} <span class="text-indigo-400">·</span> ${timeStr}`;
        summaryCard.classList.remove('hidden');
    },

    /** Marca con borde rojo si endHour <= startHour (sin alert hasta intentar guardar). */
    _validateHourRange() {
        const allDay = document.getElementById('absenceAllDay')?.checked;
        const startSelect = document.getElementById('absenceStartHour');
        const endSelect = document.getElementById('absenceEndHour');
        if (!startSelect || !endSelect) return;

        const errorClasses = ['border-red-400', 'ring-2', 'ring-red-100'];
        const reset = () => [startSelect, endSelect].forEach(el => {
            el.classList.remove(...errorClasses);
            el.classList.add('border-gray-200');
        });

        if (allDay) { reset(); return; }

        const startHour = parseInt(startSelect.value) || 0;
        const endHour = parseInt(endSelect.value) || 0;
        if (endHour <= startHour) {
            [startSelect, endSelect].forEach(el => {
                el.classList.add(...errorClasses);
                el.classList.remove('border-gray-200');
            });
        } else {
            reset();
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

        const blockOnlyRadio = document.querySelector('input[name="absenceConflictAction"][value="block_only"]');
        if (blockOnlyRadio) blockOnlyRadio.checked = true;
        document.getElementById('absenceSubstituteWrap')?.classList.add('hidden');
        document.getElementById('absenceSubstituteFitSummary')?.classList.add('hidden');
        document.getElementById('absenceSubstituteSuggestions')?.classList.add('hidden');

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
        this._updateSummary();
        this._validateHourRange();

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
        const noConflictsCard = document.getElementById('absenceNoConflictsCard');

        // Si faltan datos, ocultar ambos badges
        if (!therapist || !startDateStr || !endDateStr || !list) {
            if (card) card.classList.add('hidden');
            if (noConflictsCard) noConflictsCard.classList.add('hidden');
            return;
        }

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
            if (noConflictsCard) noConflictsCard.classList.add('hidden');

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
            // Mostrar tranquilizador verde solo si el rango es válido
            if (noConflictsCard && start <= end) {
                noConflictsCard.classList.remove('hidden');
            } else if (noConflictsCard) {
                noConflictsCard.classList.add('hidden');
            }
        }

        if (this.conflictedAppointments.length > 0) {
            this._populateSubstituteSelect(therapist);
            this._toggleConflictActionUI();
            if (this._getConflictAction() === 'reassign') {
                this._renderSubstituteReassignPanel();
            }
        } else {
            document.getElementById('absenceSubstituteFitSummary')?.classList.add('hidden');
            document.getElementById('absenceSubstituteSuggestions')?.classList.add('hidden');
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

        const conflictAction = this.conflictedAppointments.length > 0 ? this._getConflictAction() : 'block_only';
        let substituteTherapist = null;

        if (this.conflictedAppointments.length > 0) {
            const count = this.conflictedAppointments.length;
            const patientNames = Array.from(new Set(this.conflictedAppointments.map(a => a.name)))
                .slice(0, 3)
                .map(n => escapeHTML(n))
                .join(', ');
            const summary = count > 3 ? `${patientNames} y ${count - 3} más` : patientNames;

            if (conflictAction === 'reassign') {
                substituteTherapist = document.getElementById('absenceSubstituteTherapist')?.value;
                if (!substituteTherapist) {
                    ModalService.alert("Terapeuta requerida", "Elige quién cubrirá las citas.", "warning");
                    return;
                }
            }

            let actionLabel = 'solo registrar el bloqueo';
            if (conflictAction === 'cancel') actionLabel = `<strong>cancelar ${count} citas</strong> en Parláre (sin WhatsApp)`;
            if (conflictAction === 'reassign') {
                const subName = this._therapistLabel(substituteTherapist);
                const report = this._buildSubstituteReassignReport(substituteTherapist);
                if (report.needsAlt.length === 0) {
                    actionLabel = `<strong>pasar ${report.fits.length} citas a ${subName}</strong> (misma hora y día)`;
                } else {
                    actionLabel = `<strong>pasar ${report.fits.length} a ${subName}</strong> a la misma hora; <strong>${report.needsAlt.length}</strong> quedan para que coordines otro hueco (ver lista de horarios libres).`;
                }
            }

            const confirmSave = await ModalService.confirm(
                "Citas afectadas",
                `Hay <strong>${count} citas</strong> (${summary}).<br><br>Acción: ${actionLabel}.<br><br>¿Confirmas el bloqueo de vacaciones?`
            );
            if (!confirmSave) return;
        }

        const cancelledByLabel = AuthManager.currentUser?.displayName || 'Vacaciones';
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

            let conflictUpdates = 0;
            let reassignSkipped = 0;
            for (const appt of this.conflictedAppointments) {
                if (!appt.id) continue;
                const ref = doc(db, collectionPath, appt.id);
                if (conflictAction === 'cancel') {
                    batch.update(ref, {
                        isCancelled: true,
                        cancelledBy: cancelledByLabel,
                        cancelledAt: new Date().toISOString(),
                        updatedBy: AuthManager.currentUser?.email || 'absence_modal'
                    });
                    conflictUpdates++;
                } else if (conflictAction === 'reassign' && substituteTherapist) {
                    if (this._substituteHasPatientAtSlot(substituteTherapist, appt)) {
                        reassignSkipped++;
                        continue;
                    }
                    batch.update(ref, {
                        therapist: substituteTherapist,
                        reassignedFrom: therapist,
                        reassignedAt: new Date().toISOString(),
                        reassignedBy: AuthManager.currentUser?.email || 'absence_modal'
                    });
                    conflictUpdates++;
                }
            }

            await batch.commit();

            let toastMsg = `Ausencia registrada (${daysToBlock.length} día(s))`;
            if (conflictAction === 'cancel' && conflictUpdates > 0) {
                toastMsg += ` · ${conflictUpdates} cita(s) canceladas`;
            } else if (conflictAction === 'reassign' && (conflictUpdates > 0 || reassignSkipped > 0)) {
                const subName = this._therapistLabel(substituteTherapist);
                toastMsg += ` · ${conflictUpdates} pasadas a ${subName}`;
                if (reassignSkipped > 0) {
                    toastMsg += ` · ${reassignSkipped} requieren otro horario`;
                }
            }
            ToastService.success(`${toastMsg} 🎉`);
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
