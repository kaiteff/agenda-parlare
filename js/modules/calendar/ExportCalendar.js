/**
 * ExportCalendar.js
 * Exporta las citas de la semana actual (con el filtro de terapeuta activo)
 * a un archivo .xlsx usando SheetJS (cargado por CDN bajo demanda).
 *
 * Uso:
 *   ExportCalendar.export()
 *
 * Regla de Oro Capacitor/móvil:
 *   La descarga usa <a download> que funciona en Chrome/Safari iOS y Android WebView.
 */

import { CalendarState } from './CalendarState.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { addDays, formatDateLocal, formatTime12h, getStartOfWeek } from '../../utils/dateUtils.js';

// CDN oficial de SheetJS (xlsx) — solo se carga cuando el usuario hace clic
const XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

/** Carga SheetJS si aún no está disponible y retorna la referencia global. */
async function loadXLSX() {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = XLSX_CDN;
        s.onload = () => resolve(window.XLSX);
        s.onerror = () => reject(new Error('No se pudo cargar SheetJS desde CDN.'));
        document.head.appendChild(s);
    });
}

/** Devuelve el nombre "bonito" de una terapeuta dado su ID clave. */
function getTherapistLabel(id) {
    if (!id) return '—';
    if (window.StaffManager) return window.StaffManager.getTherapistName(id);
    return id.charAt(0).toUpperCase() + id.slice(1);
}

/** Traduce el estado de la cita a texto legible. */
function buildStatusNotes(apt) {
    if (apt.isCancelled) return `Cancelada${apt.cancelledBy ? ' por ' + apt.cancelledBy : ''}`;
    if (apt.isConfirmed) return '✅ Confirmada';
    if (apt.isPaid) return '💰 Pagada';
    if (apt.isJustified) return '📋 Justificada';
    return 'Pendiente';
}

export const ExportCalendar = {

    /**
     * Construye y descarga el Excel con las citas visibles en la semana actual.
     * @param {Object} [opts]
     * @param {boolean} [opts.allMonths=false]  Si true, exporta TODOS los registros del mes en curso.
     */
    async export({ allMonths = false } = {}) {
        const statusEl = document.getElementById('statusMsg');
        const originalStatus = statusEl?.textContent || '';

        try {
            // 1 — Indicador de carga
            if (statusEl) statusEl.textContent = '📥 Generando Excel…';

            // 2 — Cargar SheetJS
            const XLSX = await loadXLSX();

            // 3 — Obtener rango de fechas visibles
            const weekStart = CalendarState.currentWeekStart || getStartOfWeek(new Date());
            const from = formatDateLocal(weekStart);           // 'YYYY-MM-DD'
            const to   = formatDateLocal(addDays(weekStart, 5)); // hasta el sábado

            // 4 — Filtrar citas según rango + terapeuta activo
            const selectedTherapist = AuthManager.getSelectedTherapist();
            const isViewAll = !selectedTherapist || selectedTherapist === 'all';

            let apts = CalendarState.appointments.filter(a => {
                if (!a.date) return false;
                if (a.date < from || a.date > to) return false;
                if (!isViewAll && a.therapist !== selectedTherapist) return false;
                return true;
            });

            // 5 — Ordenar por nombre A-Z, luego por fecha y hora
            apts = apts.slice().sort((a, b) => {
                const nameA = `${a.patientLastName || ''} ${a.patientFirstName || ''}`.trim().toLowerCase();
                const nameB = `${b.patientLastName || ''} ${b.patientFirstName || ''}`.trim().toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                return (a.time || '').localeCompare(b.time || '');
            });

            // 6 — Construir filas
            const rows = apts.map(a => {
                const fullName = [a.patientFirstName, a.patientLastName].filter(Boolean).join(' ') || '(Sin nombre)';
                const [yyyy, mm, dd] = (a.date || '').split('-');
                const dateLabel = (yyyy && mm && dd)
                    ? new Date(+yyyy, +mm - 1, +dd).toLocaleDateString('es-MX', {
                        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                    })
                    : a.date || '—';
                return {
                    'Nombre / Apellido': fullName,
                    'Día de la cita':    dateLabel,
                    'Horario':           formatTime12h(a.time || '') || '—',
                    'Terapeuta':         getTherapistLabel(a.therapist),
                    'Estado / Notas':    buildStatusNotes(a),
                };
            });

            if (rows.length === 0) {
                alert('No hay citas en la semana visible para exportar con el filtro actual.');
                if (statusEl) statusEl.textContent = originalStatus;
                return;
            }

            // 7 — Crear hoja
            const ws = XLSX.utils.json_to_sheet(rows);

            // 8 — Aplicar estilos de encabezado (ancho de columnas)
            ws['!cols'] = [
                { wch: 28 }, // Nombre / Apellido
                { wch: 30 }, // Día de la cita
                { wch: 14 }, // Horario
                { wch: 12 }, // Terapeuta
                { wch: 20 }, // Estado / Notas
            ];

            // 9 — Estilo de encabezado (negrita + fondo azul Parláre)
            const headerKeys = ['A1', 'B1', 'C1', 'D1', 'E1'];
            headerKeys.forEach(cellRef => {
                if (!ws[cellRef]) return;
                ws[cellRef].s = {
                    font:    { bold: true, color: { rgb: 'FFFFFF' } },
                    fill:    { fgColor: { rgb: '2563EB' } },           // blue-600
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        bottom: { style: 'medium', color: { rgb: '1D4ED8' } }
                    }
                };
            });

            // 10 — AutoFilter en todo el rango
            const lastRow = rows.length + 1; // +1 por el encabezado
            ws['!autofilter'] = { ref: `A1:E${lastRow}` };

            // 11 — Crear libro
            const wb = XLSX.utils.book_new();

            // Hoja de citas
            XLSX.utils.book_append_sheet(wb, ws, 'Citas');

            // 12 — Hoja de metadatos (útil para Diana)
            const metaRows = [
                { 'Dato': 'Clínica',         'Valor': 'Parláre — Centro de atención' },
                { 'Dato': 'Semana',          'Valor': `${from} → ${to}` },
                { 'Dato': 'Terapeuta filtro','Valor': isViewAll ? 'Todas' : getTherapistLabel(selectedTherapist) },
                { 'Dato': 'Total citas',     'Valor': rows.length },
                { 'Dato': 'Generado',        'Valor': new Date().toLocaleString('es-MX') },
                { 'Dato': 'Exportado por',   'Valor': AuthManager.currentUser?.name || AuthManager.currentUser?.email || 'Sistema' },
            ];
            const wsMeta = XLSX.utils.json_to_sheet(metaRows);
            wsMeta['!cols'] = [{ wch: 20 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

            // 13 — Generar el archivo y disparar descarga
            const fileName = `Parlare_Citas_${from}_${to}.xlsx`;
            XLSX.writeFile(wb, fileName);

            // 14 — Feedback al usuario
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
