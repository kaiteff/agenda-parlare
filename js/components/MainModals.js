/**
 * MainModals.js
 * Contiene los modales principales del sistema (Cita, Cortes, Reportes)
 */

export const MainModals = {
    inject(container = document.body) {
        if (!container) return;
        const div = document.createElement('div');
        div.id = 'main-modals-container';
        div.innerHTML = this.getHtml();
        container.appendChild(div);
        console.log('✅ MainModals: Inyectados al DOM');
    },

    getHtml() {
        return `
            <!-- 1. GENERIC ALERT MODAL -->
            <div id="genericModal" class="hidden fixed inset-0 z-[10000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity modal-backdrop" aria-hidden="true"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full modal-panel">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div id="genericModalIcon" class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"></div>
                                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="genericModalTitle">Titulo</h3>
                                    <div class="mt-2 text-sm text-gray-500" id="genericModalMessage">Mensaje...</div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                            <button id="genericModalConfirmBtn" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">Confirmar</button>
                            <button id="genericModalCancelBtn" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. APPOINTMENT / EVENT MODAL -->
            <div id="eventModal" class="hidden fixed inset-0 z-[9000] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div class="bg-white w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl flex flex-col modal-panel relative overflow-hidden text-gray-800">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                        <h3 id="modalTitle" class="text-xl font-bold tracking-tight">Detalles de Cita</h3>
                        <button onclick="document.getElementById('eventModal').classList.add('hidden')" class="p-2 -mr-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-6 scroller min-h-0 bg-white">
                        <div class="flex gap-4">
                            <label class="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700"><input type="radio" name="appointmentType" value="patient" checked class="text-blue-600 focus:ring-blue-500 w-4 h-4"><span>Paciente</span></label>
                            <label class="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700"><input type="radio" name="appointmentType" value="school" class="text-blue-600 focus:ring-blue-500 w-4 h-4"><span>Escuela / Exterior</span></label>
                            <label class="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700"><input type="radio" name="appointmentType" value="block" class="text-red-600 focus:ring-red-500 w-4 h-4"><span>Inhabilitar Hora</span></label>
                        </div>
                        <div class="relative">
                            <label id="patientSearchLabel" class="block text-xs font-bold text-gray-500 uppercase mb-1">Paciente</label>
                            <input type="text" id="patientSearch" placeholder="Buscar o escribir nombre..." class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                            <div id="patientSuggestions" class="hidden absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 mt-1"></div>
                            <div class="mt-4">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp</label>
                                <div class="flex gap-2">
                                    <select id="patientCountryCode" class="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"><option value="52">🇲🇽 +52</option><option value="1">🇺🇸 +1</option><option value="custom">Otro</option></select>
                                    <input type="tel" id="patientCustomPhone" placeholder="Número de celular..." class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Terapeuta</label><select id="appointmentTherapist" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="diana">Diana</option><option value="sam">Sam</option><option value="vero">Vero</option></select></div>
                            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Costo ($)</label><input type="number" id="cost" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00"></div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="isRecurring" class="w-4 h-4 text-blue-600 rounded border-gray-300"><label for="isRecurring" class="text-sm text-gray-700 select-none">Agendar sesiones recurrentes</label>
                        </div>
                        <div id="recurringSection" class="hidden bg-blue-50 p-3 rounded-lg border border-blue-100 italic text-xs text-blue-800">Citas recurrentes habilitadas.</div>
                    </div>
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 rounded-b-3xl">
                        <div class="grid grid-cols-2 gap-3">
                            <button id="confirmBtn" class="col-span-2 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center justify-center gap-2 mb-1">✓ Confirmar Asistencia</button>
                            <button id="saveBtn" class="col-span-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-md">Guardar Cita</button>
                            <button id="payBtn" class="hidden flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 font-semibold">Pagado</button>
                            <button id="cancelBtn" class="hidden flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-semibold">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. CORTE DE CAJA MODAL -->
            <div id="corteDeCajaModal" class="hidden fixed inset-0 z-[9800] flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 modal-panel flex flex-col max-h-[90vh]">
                    <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-200 flex justify-between items-center rounded-t-xl">
                        <div><h3 class="text-xl font-bold text-gray-800">💰 Corte de Caja</h3><p id="corteFechaLabel" class="text-sm text-gray-500 capitalize">...</p></div>
                        <button onclick="document.getElementById('corteDeCajaModal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                    <div id="corteDetalleBody" class="p-6 overflow-y-auto min-h-[200px]"></div>
                </div>
            </div>

            <!-- 4. FINANCIAL REPORT MODAL -->
            <div id="financialReportModal" class="hidden fixed inset-0 z-[9700] flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-0 modal-panel flex flex-col max-h-[90vh]">
                    <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
                        <div><h3 class="text-xl font-bold text-gray-800">Reporte Financiero</h3><p id="reportMonthLabel" class="text-sm text-gray-500 capitalize">...</p></div>
                        <button onclick="document.getElementById('financialReportModal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                    <div class="p-6 overflow-y-auto" id="reportItemsBody"></div>
                </div>
            </div>
        `;
    }
};
