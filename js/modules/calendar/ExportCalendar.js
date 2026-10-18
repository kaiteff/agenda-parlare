/**
 * ExportCalendar.js
 * Exporta las citas de la semana actual (con el filtro de terapeuta activo)
 * a un archivo .xlsx usando SheetJS cargado localmente ('self').
 *
 * Estructura del libro:
 * 1. Hoja "Citas": cada cita con su día, hora y la columna "Sesión en semana" (ej. 1 de 2, 2 de 2).
 * 2. Hoja "Pacientes (Únicos)": 1 sola fila por paciente único con el total de citas y horarios agrupados.
 * 3. Hoja "Info": estadísticas de citas vs. pacientes únicos y metadatos.
 */

import { CalendarState } from './CalendarState.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { addDays, formatDateLocal, getStartOfWeek } from '../../utils/dateUtils.js';

// Archivo local de SheetJS (xlsx) — compatible con Content-Security-Policy ('self') y funcionamiento offline
const XLSX_LOCAL_PATH = 'js/vendor/xlsx.full.min.js';

/** Carga SheetJS localmente si aún no está disponible y retorna la referencia global. */
async function loadXLSX() {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = XLSX_LOCAL_PATH;
        s.onload = () => {
            if (window.XLSX) {
                resolve(window.XLSX);
            } else {
                reject(new Error('SheetJS cargó pero window.XLSX no está disponible.'));
            }
        };
        s.onerror = () => reject(new Error('No se pudo cargar la librería local de Excel (js/vendor/xlsx.full.min.js).'));
        document.head.appendChild(s);
    });
}

/** Parsea cualquier formato de fecha de cita a un objeto Date válido en tiempo local. */
function parseAppointmentDate(raw) {
    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw === 'object' && typeof raw.toDate === 'function') {
        return raw.toDate();
    }
    if (typeof raw === 'object' && raw.seconds) {
        return new Date(raw.seconds * 1000);
    }
    if (typeof raw === 'string') {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

/** Devuelve el nombre "bonito" de una terapeuta dado su ID clave. */
function getTherapistLabel(id) {
    if (!id) return '—';
    if (window.StaffManager) return window.StaffManager.getTherapistName(id);
    return id.charAt(0).toUpperCase() + id.slice(1);
}

/** Obtiene el nombre completo del paciente o el rótulo de bloqueo. */
function resolvePatientName(apt) {
    if (apt.isFullDayBlock || apt.isHourlyBlock) {
        return `[Bloqueo] ${apt.notes || apt.reason || 'Ausencia/Vacaciones'}`.trim();
    }
    if (apt.name && apt.name.trim()) {
        return apt.name.trim();
    }
    if (apt.patientName && apt.patientName.trim()) {
        return apt.patientName.trim();
    }
    const combined = [apt.patientFirstName, apt.patientLastName].filter(Boolean).join(' ').trim();
    if (combined) return combined;

    if (apt.patientId && window.PatientState?.patients) {
        const p = window.PatientState.patients.find(x => x.id === apt.patientId);
        if (p?.name) return p.name.trim();
    }
    return '(Sin nombre)';
}

/** Traduce el estado de la cita a texto legible y descriptivo. */
function buildStatusNotes(apt) {
    if (apt.isFullDayBlock || apt.isHourlyBlock) {
        return '⛔ Bloqueo de horario';
    }
    if (apt.isCancelled) {
        return `❌ Cancelada${apt.cancelledBy ? ' (' + apt.cancelledBy + ')' : ''}`;
    }

    const tags = [];
    if (apt.isPaid) {
        tags.push('💰 Pagada');
    } else {
        tags.push('Pendiente de pago');
    }

    if (apt.confirmed) {
        tags.push('✓ Confirmada');
    }
    if (apt.isJustified) {
        tags.push('📋 Justificada');
    }
    if (apt.isEvaluation) {
        tags.push(`Evaluación (${apt.stageName || 'En proceso'})`);
    }
    if (apt.isSchoolVisit) {
        tags.push('Visita a escuela');
    }
    if (apt.notes && apt.notes.trim()) {
        tags.push(apt.notes.trim());
    }

    return tags.join(' · ');
}

export const ExportCalendar = {

    /**
     * Construye y descarga el Excel con las citas visibles en la semana actual.
     */
    async export() {
        const statusEl = document.getElementById('statusMsg');
        const originalStatus = statusEl?.textContent || '';

        try {
            // 1 — Indicador de carga
            if (statusEl) statusEl.textContent = '📥 Generando Excel…';

            // 2 — Cargar SheetJS local
            const XLSX = await loadXLSX();

            // 3 — Obtener rango de fechas visibles (Lunes a Sábado de la semana activa)
            const weekStart = CalendarState.currentWeekStart || getStartOfWeek(new Date());
            const fromStr = formatDateLocal(weekStart);           // 'YYYY-MM-DD' (Lunes)
            const toStr   = formatDateLocal(addDays(weekStart, 5)); // 'YYYY-MM-DD' (Sábado)

            // 4 — Terapeuta activo en filtro
            const selectedTherapist = AuthManager.getSelectedTherapist();
            const isViewAll = !selectedTherapist || selectedTherapist === 'all';

            // 5 — Filtrar citas en el rango y por terapeuta
            let apts = (CalendarState.appointments || []).filter(a => {
                const d = parseAppointmentDate(a.date);
                if (!d) return false;
                const dStr = formatDateLocal(d);
                if (dStr < fromStr || dStr > toStr) return false;
                if (!isViewAll && (a.therapist || '').toLowerCase() !== selectedTherapist.toLowerCase()) return false;
                return true;
            });

            if (apts.length === 0) {
                alert(`No hay citas en la semana del ${fromStr} al ${toStr} para exportar con el filtro actual.`);
                if (statusEl) statusEl.textContent = originalStatus;
                return;
            }

            // 6 — Agrupar citas por paciente para calcular número de sesión (1 de 2, etc.)
            const patientAptsMap = new Map();
            apts.forEach(a => {
                const key = resolvePatientName(a).toLowerCase().trim();
                if (!patientAptsMap.has(key)) {
                    patientAptsMap.set(key, []);
                }
                patientAptsMap.get(key).push(a);
            });

            // Ordenar citas de cada paciente cronológicamente
            patientAptsMap.forEach(list => {
                list.sort((a, b) => {
                    const timeA = parseAppointmentDate(a.date)?.getTime() || 0;
                    const timeB = parseAppointmentDate(b.date)?.getTime() || 0;
                    return timeA - timeB;
                });
            });

            // 7 — Ordenar toda la lista por Nombre A–Z (locale español), y luego por fecha/hora
            apts = apts.slice().sort((a, b) => {
                const nameA = resolvePatientName(a);
                const nameB = resolvePatientName(b);
                const cmp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                if (cmp !== 0) return cmp;
                const timeA = parseAppointmentDate(a.date)?.getTime() || 0;
                const timeB = parseAppointmentDate(b.date)?.getTime() || 0;
                return timeA - timeB;
            });

            // ==========================================
            // HOJA 1: CITAS (Detalle por cada cita/slot)
            // ==========================================
            const rowsCitas = apts.map(a => {
                const d = parseAppointmentDate(a.date);
                const key = resolvePatientName(a).toLowerCase().trim();
                const pList = patientAptsMap.get(key) || [a];
                const totalInWeek = pList.length;
                const sessionIndex = pList.indexOf(a) + 1;
                const sessionTag = totalInWeek > 1 ? `${sessionIndex} de ${totalInWeek}` : '1 de 1';

                // Formatear día: "Lunes, 19 oct. 2026"
                let dayLabel = '—';
                let timeLabel = '—';

                if (d) {
                    const rawWeekday = d.toLocaleDateString('es-MX', { weekday: 'long' });
                    const weekday = rawWeekday ? rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1) : '';
                    const datePart = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                    dayLabel = `${weekday}, ${datePart}`;

                    if (a.isFullDayBlock) {
                        timeLabel = 'Todo el día';
                    } else {
                        timeLabel = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                }

                return {
                    'Nombre / Apellido': resolvePatientName(a),
                    'Sesión en semana':  sessionTag,
                    'Día de la cita':    dayLabel,
                    'Horario':           timeLabel,
                    'Terapeuta':         getTherapistLabel(a.therapist),
                    'Estado / Notas':    buildStatusNotes(a),
                };
            });

            const wsCitas = XLSX.utils.json_to_sheet(rowsCitas);
            wsCitas['!cols'] = [
                { wch: 32 }, // Nombre / Apellido
                { wch: 18 }, // Sesión en semana
                { wch: 24 }, // Día de la cita
                { wch: 14 }, // Horario
                { wch: 14 }, // Terapeuta
                { wch: 32 }, // Estado / Notas
            ];
            wsCitas['!autofilter'] = { ref: `A1:F${rowsCitas.length + 1}` };

            // ==========================================
            // HOJA 2: PACIENTES ÚNICOS (1 fila por niño)
            // ==========================================
            const uniquePatientKeys = Array.from(patientAptsMap.keys()).sort((a, b) => {
                const nameA = resolvePatientName(patientAptsMap.get(a)[0]);
                const nameB = resolvePatientName(patientAptsMap.get(b)[0]);
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });

            let multiAptCount = 0;

            const rowsUnicos = uniquePatientKeys.map(key => {
                const list = patientAptsMap.get(key);
                const firstApt = list[0];
                const patientName = resolvePatientName(firstApt);
                if (list.length > 1) multiAptCount++;

                // Días y horarios agrupados: "Lun 19 oct 07:00 p. m. | Mié 21 oct 07:00 p. m."
                const horarios = list.map(a => {
                    const d = parseAppointmentDate(a.date);
                    if (!d) return '—';
                    const rawW = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
                    const time = a.isFullDayBlock ? 'Todo el día' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    return `${rawW} (${time})`;
                }).join('  ·  ');

                // Terapeutas únicos
                const terapeutas = Array.from(new Set(list.map(a => getTherapistLabel(a.therapist)))).join(', ');

                // Resumen de estados
                const resumenEstados = list.map((a, idx) => {
                    const st = a.isPaid ? 'Pagada' : (a.confirmed ? 'Confirmada' : (a.isCancelled ? 'Cancelada' : 'Pendiente'));
                    return list.length > 1 ? `Cita ${idx + 1}: ${st}` : st;
                }).join(' · ');

                return {
                    'Paciente':               patientName,
                    'Total Citas en semana':  list.length,
                    'Días y Horarios':        horarios,
                    'Terapeuta(s)':           terapeutas,
                    'Resumen de Estados':     resumenEstados,
                };
            });

            const wsUnicos = XLSX.utils.json_to_sheet(rowsUnicos);
            wsUnicos['!cols'] = [
                { wch: 32 }, // Paciente
                { wch: 22 }, // Total Citas en semana
                { wch: 42 }, // Días y Horarios
                { wch: 16 }, // Terapeuta(s)
                { wch: 32 }, // Resumen de Estados
            ];
            wsUnicos['!autofilter'] = { ref: `A1:E${rowsUnicos.length + 1}` };

            // ==========================================
            // HOJA 3: INFO (Estadísticas y Metadatos)
            // ==========================================
            const metaRows = [
                { 'Métrica / Dato': 'Clínica',                    'Valor': 'Parláre — Centro de atención' },
                { 'Métrica / Dato': 'Rango de semana',            'Valor': `${fromStr} al ${toStr}` },
                { 'Métrica / Dato': 'Filtro terapeuta',           'Valor': isViewAll ? 'Todas' : getTherapistLabel(selectedTherapist) },
                { 'Métrica / Dato': 'Total de citas en agenda',   'Valor': apts.length },
                { 'Métrica / Dato': 'Total de pacientes únicos',  'Valor': uniquePatientKeys.length },
                { 'Métrica / Dato': 'Pacientes con 2 o más citas','Valor': multiAptCount },
                { 'Métrica / Dato': 'Fecha descarga',             'Valor': new Date().toLocaleString('es-MX') },
                { 'Métrica / Dato': 'Generado por',               'Valor': AuthManager.currentUser?.name || AuthManager.currentUser?.email || 'Admin' },
            ];
            const wsMeta = XLSX.utils.json_to_sheet(metaRows);
            wsMeta['!cols'] = [{ wch: 30 }, { wch: 40 }];

            // ==========================================
            // ENSAMBLAR LIBRO Y DISPARAR DESCARGA
            // ==========================================
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsCitas, 'Citas');
            XLSX.utils.book_append_sheet(wb, wsUnicos, 'Pacientes Únicos');
            XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

            const therapistSlug = isViewAll ? 'Todas' : (selectedTherapist || 'General');
            const fileName = `Parlare_Citas_${therapistSlug}_${fromStr}_${toStr}.xlsx`;
            XLSX.writeFile(wb, fileName);

            // Feedback visual
            if (statusEl) {
                statusEl.textContent = `✅ Descargado: ${fileName}`;
                setTimeout(() => { statusEl.textContent = originalStatus; }, 4000);
            }

        } catch (err) {
            console.error('❌ ExportCalendar error:', err);
            alert(`Error al generar el Excel: ${err.message}`);
            if (statusEl) statusEl.textContent = originalStatus;
        }
    }
};
