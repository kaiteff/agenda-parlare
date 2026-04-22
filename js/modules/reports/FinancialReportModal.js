/**
 * FinancialReportModal.js
 * Maneja la interfaz del reporte financiero, inyectando el HTML dinámicamente.
 */
import { FinancialReport } from './FinancialReport.js';

export const FinancialReportModal = {
    isInitialized: false,

    /**
     * Inicializa el modal (inyecta HTML si no existe)
     */
    init() {
        const existing = document.getElementById('financialReportModal');
        
        // Si ya existe pero es una versión vieja (sin los nuevos campos), lo borramos para recrearlo
        if (existing && !document.getElementById('reportTotalClinic')) {
            existing.remove();
            this.isInitialized = false;
        }

        if (this.isInitialized || document.getElementById('financialReportModal')) {
            return;
        }

        const modalHTML = `
        <div id="financialReportModal" class="hidden fixed inset-0 z-[9700] flex items-center justify-center bg-black bg-opacity-50">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-0 modal-panel flex flex-col max-h-[90vh]">
                <!-- Header -->
                <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Reporte Financiero Mensual</h3>
                        <p id="reportMonthLabel" class="text-sm text-gray-500 capitalize">...</p>
                    </div>
                    <button id="closeReportBtnHeader" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <!-- Content -->
                <div class="p-6 overflow-y-auto bg-gray-50/50 flex flex-col gap-6 scroller">

                    <!-- Global Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div id="cardIncome" class="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                            <div class="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingreso Bruto</p>
                                <h4 class="text-xl font-black text-gray-900" id="reportTotalIncome">$0.00</h4>
                            </div>
                        </div>

                        <div id="cardClinic" class="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                            <div class="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest text-emerald-600">Utilidad Parláre</p>
                                <h4 class="text-xl font-black text-emerald-700" id="reportTotalClinic">$0.00</h4>
                            </div>
                        </div>

                        <div id="cardTherapists" class="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                            <div class="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pago Terapeutas</p>
                                <h4 class="text-xl font-black text-indigo-700" id="reportTotalTherapist">$0.00</h4>
                            </div>
                        </div>

                        <div id="cardPending" class="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                            <div class="p-3 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest text-orange-600">Por Cobrar</p>
                                <h4 class="text-xl font-black text-gray-900" id="reportTotalPending">$0.00</h4>
                            </div>
                        </div>
                    </div>

                    <!-- DESGLOSE POR TERAPEUTA -->
                    <div id="therapistBreakdownSection" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                         <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h4 class="font-black text-gray-700 uppercase tracking-widest text-xs">Desglose Detallado</h4>
                            <div class="text-[10px] font-bold text-gray-400 uppercase" id="reportTotalCountLabel">0 CITAS TOTALES</div>
                        </div>
                        <div class="overflow-x-auto scroller">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th class="px-6 py-4">Terapeuta</th>
                                        <th class="px-6 py-4 text-center">Citas (Pag/Tot)</th>
                                        <th class="px-6 py-4 text-right">Ingreso Bruto</th>
                                        <th class="px-6 py-4 text-right text-emerald-600">Cuota Parláre</th>
                                        <th class="px-6 py-4 text-right text-indigo-600">Pago Terapeuta</th>
                                        <th class="px-6 py-4 text-right text-orange-500">Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50" id="reportItemsBody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- PROXIMOS COBROS (DEUDORES) -->
                    <div id="debtorsSection" class="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        <div class="px-6 py-4 border-b border-red-50 bg-red-50/30">
                            <h4 class="font-black text-red-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Pendientes de Cobro (Citas Pasadas)
                            </h4>
                        </div>
                        <div class="overflow-x-auto max-h-60 scroller">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 shadow-sm">
                                    <tr>
                                        <th class="px-6 py-3">Paciente</th>
                                        <th class="px-6 py-3">Terapeuta</th>
                                        <th class="px-6 py-3 text-right">Deuda Total</th>
                                        <th class="px-6 py-3">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50" id="debtorsListBody">
                                    <!-- Inyectado -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="bg-white px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button id="closeReportBtnFooter" class="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Listeners para cerrar
        const close = () => document.getElementById('financialReportModal').classList.add('hidden');
        document.getElementById('closeReportBtnHeader').onclick = close;
        document.getElementById('closeReportBtnFooter').onclick = close;

        this.isInitialized = true;
    },

    /**
     * Renderiza y muestra el reporte
     * @param {Object} report - Datos del reporte
     * @param {string} userRole - Rol del usuario
     */
    render(report, userRole) {
        this.init(); // Asegurar que el DOM existe

        const modal = document.getElementById('financialReportModal');
        const cardClinic = document.getElementById('cardClinic');
        const cardTherapists = document.getElementById('cardTherapists');
        const cardIncome = document.getElementById('cardIncome');
        const debtorsBody = document.getElementById('debtorsListBody');
        const itemsBody = document.getElementById('reportItemsBody');

        // VISIBILIDAD DE ROLES (Restringir info sensible a recepción)
        const isReceptionist = userRole === 'receptionist';
        if (cardIncome) cardIncome.classList.toggle('hidden', isReceptionist);
        if (cardClinic) cardClinic.classList.toggle('hidden', isReceptionist);
        if (cardTherapists) cardTherapists.classList.toggle('hidden', isReceptionist);

        // TEXTOS GLOBALES
        document.getElementById('reportMonthLabel').textContent = report.meta.monthName;
        document.getElementById('reportTotalIncome').textContent = FinancialReport.formatCurrency(report.summary.totalIncome);
        document.getElementById('reportTotalClinic').textContent = FinancialReport.formatCurrency(report.summary.totalClinicFee);
        document.getElementById('reportTotalTherapist').textContent = FinancialReport.formatCurrency(report.summary.totalTherapistPay);
        document.getElementById('reportTotalPending').textContent = FinancialReport.formatCurrency(report.summary.totalPending);
        
        if (document.getElementById('reportTotalCountLabel')) {
            document.getElementById('reportTotalCountLabel').textContent = `${report.summary.totalAppointments} CITAS TOTALES | ${report.summary.completionRate}% PAGADAS`;
        }

        // TABLA DE DESGLOSE POR TERAPEUTA
        if (itemsBody) {
            itemsBody.innerHTML = '';
            Object.values(report.byTherapist).forEach(t => {
                if (t.count === 0) return; // No mostrar terapeutas sin citas en el mes
                
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 transition-colors";
                tr.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                ${t.name.charAt(0)}
                            </div>
                            <div class="font-bold text-gray-800">${t.name}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center font-medium text-gray-500">
                        ${t.paidCount} / ${t.count}
                    </td>
                    <td class="px-6 py-4 text-right font-bold text-gray-900">
                        ${FinancialReport.formatCurrency(t.income)}
                    </td>
                    <td class="px-6 py-4 text-right font-bold text-emerald-600">
                        ${FinancialReport.formatCurrency(t.clinicFee)}
                    </td>
                    <td class="px-6 py-4 text-right font-bold text-indigo-600">
                        ${FinancialReport.formatCurrency(t.therapistPay)}
                    </td>
                    <td class="px-6 py-4 text-right font-bold text-orange-500">
                        ${FinancialReport.formatCurrency(t.pending)}
                    </td>
                `;
                itemsBody.appendChild(tr);
            });
        }

        // LISTA DE DEUDORES
        if (debtorsBody) {
            debtorsBody.innerHTML = '';
            if (!report.debtors || report.debtors.length === 0) {
                debtorsBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Excelente, no hay deudas pendientes del pasado.</td></tr>';
            } else {
                report.debtors.forEach(d => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-red-50 transition-colors";
                    tr.innerHTML = `
                        <td class="px-6 py-3 font-bold text-gray-900">${d.name}</td>
                        <td class="px-6 py-3 text-gray-500 capitalize text-xs">${d.therapist}</td>
                        <td class="px-6 py-3 text-right font-black text-red-600">${FinancialReport.formatCurrency(d.totalDebt)}</td>
                        <td class="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">
                            ${d.details.length} cita(s) pendiente(s) antes de hoy
                        </td>
                    `;
                    debtorsBody.appendChild(tr);
                });
            }
        }

        // MOSTRAR MODAL
        modal.classList.remove('hidden');
    }
};
