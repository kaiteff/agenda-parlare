/**
 * CorteDeCaja.js
 * Resumen diario: pacientes atendidos, cobros, pendientes
 */

import { CalendarState } from '../calendar/CalendarState.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { escapeHTML } from '../../utils/sanitize.js';

export const CorteDeCaja = {

    /**
     * Genera el resumen del día
     * @param {Date} date - Fecha a analizar (default: hoy)
     * @returns {Object} Resumen del día
     */
    generate(date = new Date()) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Filtrar citas del día
        let todayAppts = CalendarState.appointments.filter(a => {
            if (a.isCancelled) return false;
            const aptDate = new Date(a.date);
            return aptDate >= dayStart && aptDate <= dayEnd;
        });

        // Filtro por terapeuta según rol
        const user = AuthManager.currentUser;
        if (user?.role === 'therapist') {
            todayAppts = todayAppts.filter(a =>
                (a.therapist || 'diana').toLowerCase() === user.therapist.toLowerCase()
            );
        } else if ((user?.role === 'admin' || user?.role === 'receptionist') && AuthManager.can('switch_therapist_view')) {
            const currentView = AuthManager.getSelectedTherapist();
            if (currentView !== 'all') {
                todayAppts = todayAppts.filter(a =>
                    (a.therapist || 'diana').toLowerCase() === currentView.toLowerCase()
                );
            }
        }

        const paid = todayAppts.filter(a => a.isPaid);
        const pending = todayAppts.filter(a => !a.isPaid);
        const confirmed = todayAppts.filter(a => a.confirmed);
        const cancelled = CalendarState.appointments.filter(a => {
            if (!a.isCancelled) return false;
            const aptDate = new Date(a.date);
            return aptDate >= dayStart && aptDate <= dayEnd;
        });

        const totalCobrado = paid.reduce((sum, a) => sum + (a.cost || 0), 0);
        const totalPendiente = pending.reduce((sum, a) => sum + (a.cost || 0), 0);

        // Desglose por terapeuta
        const byTherapist = {};
        todayAppts.forEach(a => {
            const t = (a.therapist || 'diana').charAt(0).toUpperCase() + (a.therapist || 'diana').slice(1);
            if (!byTherapist[t]) byTherapist[t] = { total: 0, paid: 0, cobrado: 0, pendiente: 0 };
            byTherapist[t].total++;
            if (a.isPaid) {
                byTherapist[t].paid++;
                byTherapist[t].cobrado += (a.cost || 0);
            } else {
                byTherapist[t].pendiente += (a.cost || 0);
            }
        });

        return {
            date: dayStart,
            totalCitas: todayAppts.length,
            atendidas: paid.length,
            pendientes: pending.length,
            confirmadas: confirmed.length,
            canceladas: cancelled.length,
            totalCobrado,
            totalPendiente,
            byTherapist,
            detalle: todayAppts.map(a => ({
                name: a.name,
                time: new Date(a.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                cost: a.cost || 0,
                isPaid: a.isPaid,
                confirmed: a.confirmed,
                therapist: a.therapist || 'diana'
            })).sort((a, b) => a.time.localeCompare(b.time))
        };
    },

    /**
     * Renderiza el modal del corte de caja
     */
    open() {
        const report = this.generate();
        const dateStr = report.date.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });

        const modal = document.getElementById('corteDeCajaModal');
        if (!modal) return;

        // Header date
        document.getElementById('corteFechaLabel').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        // Cards
        document.getElementById('corteAtendidas').textContent = report.atendidas;
        document.getElementById('cortePendientes').textContent = report.pendientes;
        document.getElementById('corteCobrado').textContent = `$${report.totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        document.getElementById('cortePendienteTotal').textContent = `$${report.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        document.getElementById('corteTotalCitas').textContent = report.totalCitas;
        document.getElementById('corteConfirmadas').textContent = `${report.confirmadas} confirmadas`;
        document.getElementById('corteCanceladas').textContent = report.canceladas > 0 ? ` · ${report.canceladas} canceladas` : '';

        // Detalle tabla
        const tbody = document.getElementById('corteDetalleBody');
        if (report.detalle.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No hay citas para hoy</td></tr>`;
        } else {
            tbody.innerHTML = report.detalle.map(d => `
                <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                    <td class="px-4 py-2.5 font-medium text-gray-800">${escapeHTML(d.name)}</td>
                    <td class="px-4 py-2.5 text-gray-500">${escapeHTML(d.time)}</td>
                    <td class="px-4 py-2.5 text-gray-500 capitalize">${escapeHTML(d.therapist)}</td>
                    <td class="px-4 py-2.5 text-right font-medium">$${d.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td class="px-4 py-2.5 text-center">
                        ${d.isPaid
                            ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✓ Pagado</span>'
                            : '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">⏳ Pendiente</span>'
                        }
                    </td>
                </tr>
            `).join('');
        }

        // Desglose por terapeuta
        const therapistBody = document.getElementById('corteTherapistBody');
        const therapists = Object.entries(report.byTherapist);
        if (therapists.length > 1) {
            document.getElementById('corteTherapistSection').classList.remove('hidden');
            therapistBody.innerHTML = therapists.map(([name, data]) => `
                <tr class="border-b border-gray-50">
                    <td class="px-4 py-2 font-medium text-gray-800">${name}</td>
                    <td class="px-4 py-2 text-center">${data.total}</td>
                    <td class="px-4 py-2 text-center text-green-600 font-medium">${data.paid}</td>
                    <td class="px-4 py-2 text-right text-green-700 font-bold">$${data.cobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td class="px-4 py-2 text-right text-yellow-600">$${data.pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                </tr>
            `).join('');
        } else {
            document.getElementById('corteTherapistSection').classList.add('hidden');
        }

        modal.classList.remove('hidden');
    },

    /**
     * Copia el resumen al portapapeles
     */
    copyToClipboard() {
        const report = this.generate();
        const dateStr = report.date.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });

        let text = `📊 Corte de Caja — ${dateStr}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📋 Total citas: ${report.totalCitas}\n`;
        text += `✅ Pagadas: ${report.atendidas}\n`;
        text += `⏳ Pendientes: ${report.pendientes}\n`;
        text += `💰 Cobrado: $${report.totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
        text += `🔴 Pendiente: $${report.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;

        if (Object.keys(report.byTherapist).length > 1) {
            text += `\n👩‍⚕️ Por terapeuta:\n`;
            for (const [name, data] of Object.entries(report.byTherapist)) {
                text += `  ${name}: ${data.paid}/${data.total} pagadas — $${data.cobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
            }
        }

        if (report.detalle.length > 0) {
            text += `\n📝 Detalle:\n`;
            report.detalle.forEach(d => {
                const status = d.isPaid ? '✅' : '⏳';
                text += `  ${status} ${d.time} - ${d.name} ($${d.cost}) [${d.therapist}]\n`;
            });
        }

        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('corteCopyBtn');
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = '✅ ¡Copiado!';
                btn.classList.add('bg-green-100', 'text-green-700');
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.classList.remove('bg-green-100', 'text-green-700');
                }, 2000);
            }
        });
    }
};
