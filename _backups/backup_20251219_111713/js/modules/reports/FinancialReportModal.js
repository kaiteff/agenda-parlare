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
                <div class="p-6 overflow-y-auto bg-gray-50/50 flex flex-col gap-6">

                    <!-- Global Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div id="cardIncome" class="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
                            <div class="p-3 bg-green-100 text-green-600 rounded-lg">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-500 uppercase">Ingreso Total</p>
                                <h4 class="text-2xl font-bold text-gray-900" id="reportTotalIncome">$0.00</h4>
                            </div>
                        </div>

                        <div id="cardPending" class="bg-white p-5 rounded-xl border border-yellow-100 shadow-sm flex items-center gap-4">
                            <div class="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-500 uppercase">Pendiente de Pago</p>
                                <h4 class="text-2xl font-bold text-gray-900" id="reportTotalPending">$0.00</h4>
                            </div>
                        </div>

                        <div id="cardTotal" class="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                            <div class="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-500 uppercase">Total Citas</p>
                                <h4 class="text-2xl font-bold text-gray-900" id="reportTotalCount">0</h4>
                                <span class="text-xs text-green-600 font-medium" id="reportCompletionRate">0% Pagadas</span>
                            </div>
                        </div>
                    </div>

                    <!-- PROXIMOS COBROS (DEUDORES) -->
                    <div id="debtorsSection" class="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                        <div class="px-6 py-4 border-b border-red-50 bg-red-50/30">
                            <h4 class="font-bold text-red-800 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Pendientes de Cobro (Citas Pasadas)
                            </h4>
                        </div>
                        <div class="overflow-x-auto max-h-96 overflow-y-auto">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-white text-gray-500 font-medium uppercase text-xs sticky top-0 shadow-sm">
                                    <tr>
                                        <th class="px-6 py-3">Paciente</th>
                                        <th class="px-6 py-3">Terapeuta</th>
                                        <th class="px-6 py-3 text-right">Deuda Total</th>
                                        <th class="px-6 py-3">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 bg-white" id="debtorsListBody">
                                    <!-- Injected -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Breakdown Table (HIDDEN) -->
                    <div id="therapistBreakdownSection" class="hidden bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                         <div class="px-6 py-4 border-b border-gray-100">
                            <h4 class="font-bold text-gray-800">Desglose por Terapeuta</h4>
                        </div>
                         <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left">
                                 <tbody class="divide-y divide-gray-100" id="reportItemsBody"></tbody>
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
        const cardIncome = document.getElementById('cardIncome');
        const debtorsBody = document.getElementById('debtorsListBody');

        // VISIBILIDAD DE ROLES
        if (cardIncome) {
            if (userRole === 'receptionist') {
                cardIncome.classList.add('hidden');
            } else {
                cardIncome.classList.remove('hidden');
            }
        }

        // TEXTOS
        document.getElementById('reportMonthLabel').textContent = report.meta.monthName;
        document.getElementById('reportTotalIncome').textContent = FinancialReport.formatCurrency(report.summary.totalIncome);
        document.getElementById('reportTotalPending').textContent = FinancialReport.formatCurrency(report.summary.totalPending);
        document.getElementById('reportTotalCount').textContent = report.summary.totalAppointments;
        document.getElementById('reportCompletionRate').textContent = `${report.summary.completionRate}% Pagadas`;

        // LISTA DE DEUDORES
        if (debtorsBody) {
            debtorsBody.innerHTML = '';
            if (!report.debtors || report.debtors.length === 0) {
                debtorsBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-400">Excelente, no hay deudas pendientes del pasado.</td></tr>';
            } else {
                report.debtors.forEach(d => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-red-50 transition-colors";
                    tr.innerHTML = `
                        <td class="px-6 py-3 font-medium text-gray-900">${d.name}</td>
                        <td class="px-6 py-3 text-gray-500 capitalize">${d.therapist}</td>
                        <td class="px-6 py-3 text-right font-bold text-red-600">${FinancialReport.formatCurrency(d.totalDebt)}</td>
                        <td class="px-6 py-3 text-xs text-gray-400">
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
