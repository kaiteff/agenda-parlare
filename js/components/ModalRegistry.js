/**
 * ModalRegistry.js
 * Centraliza el HTML de los modales para mantener el index.html limpio.
 */

export const ModalRegistry = {
    init() {
        const container = document.createElement('div');
        container.id = 'modal-container';
        container.innerHTML = `
            <!-- 1. CORTE DE CAJA MODAL -->
            <div id="corteDeCajaModal" class="hidden fixed inset-0 z-[9800] flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 modal-panel flex flex-col max-h-[90vh]">
                    <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-200 flex justify-between items-center rounded-t-xl">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2"><span>💰</span> Corte de Caja</h3>
                            <p id="corteFechaLabel" class="text-sm text-gray-500 capitalize">...</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="corteCopyBtn" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="Copiar resumen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> Copiar
                            </button>
                            <button onclick="document.getElementById('corteDeCajaModal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 overflow-y-auto flex flex-col gap-5">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
                                <p class="text-xs font-bold text-green-600 uppercase">Pagadas</p>
                                <p id="corteAtendidas" class="text-2xl font-bold text-green-700 mt-1">0</p>
                            </div>
                            <div class="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-center">
                                <p class="text-xs font-bold text-yellow-600 uppercase">Pendientes</p>
                                <p id="cortePendientes" class="text-2xl font-bold text-yellow-700 mt-1">0</p>
                            </div>
                            <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                                <p class="text-xs font-bold text-emerald-600 uppercase">Cobrado</p>
                                <p id="corteCobrado" class="text-xl font-bold text-emerald-700 mt-1">$0</p>
                            </div>
                            <div class="bg-orange-50 rounded-xl p-4 border border-orange-100 text-center">
                                <p class="text-xs font-bold text-orange-600 uppercase">Por Cobrar</p>
                                <p id="cortePendienteTotal" class="text-xl font-bold text-orange-700 mt-1">$0</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
                            <span>📋 Total: <span id="corteTotalCitas" class="font-bold text-gray-700">0</span> citas</span>
                            <span class="text-gray-300">|</span>
                            <span id="corteConfirmadas" class="text-blue-600 font-medium">0 confirmadas</span>
                            <span id="corteCanceladas" class="text-red-500 font-medium"></span>
                        </div>
                        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div class="overflow-x-auto max-h-64 overflow-y-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-gray-50 text-gray-500 font-medium uppercase text-xs sticky top-0">
                                        <tr><th class="px-4 py-2.5">Paciente</th><th class="px-4 py-2.5">Hora</th><th class="px-4 py-2.5">Terapeuta</th><th class="px-4 py-2.5 text-right">Costo</th><th class="px-4 py-2.5 text-center">Estado</th></tr>
                                    </thead>
                                    <tbody id="corteDetalleBody" class="divide-y divide-gray-50"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end rounded-b-xl">
                        <button onclick="document.getElementById('corteDeCajaModal').classList.add('hidden')" class="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">Cerrar</button>
                    </div>
                </div>
            </div>

            <!-- 2. FINANCIAL REPORT MODAL -->
            <div id="financialReportModal" class="hidden fixed inset-0 z-[9700] flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-0 modal-panel flex flex-col max-h-[90vh]">
                    <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">Reporte Financiero Mensual</h3>
                            <p id="reportMonthLabel" class="text-sm text-gray-500 capitalize">...</p>
                        </div>
                        <button onclick="document.getElementById('financialReportModal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto bg-gray-50/50 flex flex-col gap-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
                                <div class="p-3 bg-green-100 text-green-600 rounded-lg"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                <div><p class="text-sm font-medium text-gray-500 uppercase">Ingreso Total</p><h4 class="text-2xl font-bold text-gray-900" id="reportTotalIncome">$0.00</h4></div>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-yellow-100 shadow-sm flex items-center gap-4">
                                <div class="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                <div><p class="text-sm font-medium text-gray-500 uppercase">Pendiente</p><h4 class="text-2xl font-bold text-gray-900" id="reportTotalPending">$0.00</h4></div>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                                <div class="p-3 bg-blue-100 text-blue-600 rounded-lg"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg></div>
                                <div><p class="text-sm font-medium text-gray-500 uppercase">Total Citas</p><h4 class="text-2xl font-bold text-gray-900" id="reportTotalCount">0</h4></div>
                            </div>
                        </div>
                        <div id="debtorsSection" class="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                            <div class="px-6 py-4 border-b border-red-50 bg-red-50/30"><h4 class="font-bold text-red-800">Pendientes de Cobro</h4></div>
                            <div class="overflow-x-auto max-h-96"><table class="w-full text-sm text-left"><thead class="bg-white text-gray-500 uppercase text-xs sticky top-0"><tr><th class="px-6 py-3">Paciente</th><th class="px-6 py-3">Terapeuta</th><th class="px-6 py-3 text-right">Deuda</th><th class="px-6 py-3">Detalle</th></tr></thead><tbody id="debtorsListBody" class="divide-y divide-gray-100 bg-white"></tbody></table></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }
};
