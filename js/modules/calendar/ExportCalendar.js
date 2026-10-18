/**
 * ExportCalendar.js
 * Exporta las citas de la semana actual (con el filtro de terapeuta activo)
 * a un archivo .xlsx usando SheetJS cargado localmente ('self').
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

            // 6 — Ordenar por Nombre A–Z (usando localeCompare en español), y luego por fecha/hora
            apts = apts.slice().sort((a, b) => {
                const nameA = resolvePatientName(a);
                const nameB = resolvePatientName(b);
                const cmp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                if (cmp !== 0) return cmp;
                const timeA = parseAppointmentDate(a.date)?.getTime() || 0;
                const timeB = parseAppointmentDate(b.date)?.getTime() || 0;
                return timeA - timeB;
            });

            // 7 — Mapear filas para Excel
            const rows = apts.map(a => {
                const d = parseAppointmentDate(a.date);

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
                    'Día de la cita':    dayLabel,
                    'Horario':           timeLabel,
                    'Terapeuta':         getTherapistLabel(a.therapist),
                    'Estado / Notas':    buildStatusNotes(a),
                };
            });

            if (rows.length === 0) {
                alert(`No hay citas en la semana del ${fromStr} al ${toStr} para exportar con el filtro actual.`);
                if (statusEl) statusEl.textContent = originalStatus;
                return;
            }

            // 8 — Crear hoja de cálculo con los datos
            const ws = XLSX.utils.json_to_sheet(rows);

            // 9 — Ancho de columnas óptimo
            ws['!cols'] = [
                { wch: 32 }, // Nombre / Apellido
                { wch: 24 }, // Día de la cita
                { wch: 14 }, // Horario
                { wch: 14 }, // Terapeuta
                { wch: 30 }, // Estado / Notas
            ];

            // 10 — Activar filtros automáticos (AutoFilter) para ordenamiento A-Z
            const lastRow = rows.length + 1; // +1 por la fila de encabezados
            ws['!autofilter'] = { ref: `A1:E${lastRow}` };

            // 11 — Crear libro de Excel
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Citas');

            // 12 — Hoja de información general
            const metaRows = [
                { 'Dato': 'Clínica',         'Valor': 'Parláre — Centro de atención' },
                { 'Dato': 'Rango de semana', 'Valor': `${fromStr} al ${toStr}` },
                { 'Dato': 'Filtro terapeuta','Valor': isViewAll ? 'Todas' : getTherapistLabel(selectedTherapist) },
                { 'Dato': 'Total registros', 'Valor': rows.length },
                { 'Dato': 'Fecha descarga',  'Valor': new Date().toLocaleString('es-MX') },
                { 'Dato': 'Usuario',         'Valor': AuthManager.currentUser?.name || AuthManager.currentUser?.email || 'Admin' },
            ];
            const wsMeta = XLSX.utils.json_to_sheet(metaRows);
            wsMeta['!cols'] = [{ wch: 20 }, { wch: 36 }];
            XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

            // 13 — Disparar descarga del archivo
            const therapistSlug = isViewAll ? 'Todas' : (selectedTherapist || 'General');
            const fileName = `Parlare_Citas_${therapistSlug}_${fromStr}_${toStr}.xlsx`;
            XLSX.writeFile(wb, fileName);

            // 14 — Feedback visual
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
