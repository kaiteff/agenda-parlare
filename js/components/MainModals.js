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
            <div id="genericModal" class="hidden fixed inset-0 z-[99999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
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
                        <button onclick="import('./js/modules/calendar/CalendarModal.js').then(m => m.CalendarModal.closeModal())" class="p-2 -mr-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
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
                            
                            <!-- Hidden but indexed for naming logic -->
                            <div class="hidden">
                                <input type="text" id="patientFirstName">
                                <input type="text" id="patientLastName">
                                <input type="hidden" id="appointmentDate">
                            </div>

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
                        <div id="recurringSection" class="hidden bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-blue-800 uppercase">Configuración</span>
                                <select id="recurringDuration" class="text-xs bg-white border border-blue-200 rounded px-2 py-1">
                                    <option value="4">4 sesiones</option>
                                    <option value="8">8 sesiones</option>
                                    <option value="12">12 sesiones</option>
                                </select>
                            </div>
                            <div id="recurringDatesList" class="text-[10px] text-blue-700 space-y-1"></div>
                        </div>

                        <!-- Reschedule & Slots -->
                        <div id="rescheduleSection" class="hidden space-y-3 pt-4 border-t border-gray-100">
                             <label class="block text-xs font-bold text-gray-500 uppercase">Sugerencias (Hora)</label>
                             <div id="rescheduleOptions" class="grid grid-cols-4 gap-2"></div>
                        </div>

                        <!-- Busy Slots (Debug/Info) -->
                        <div id="busySlotsContainer" class="hidden pt-4 border-t border-gray-100">
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Espacios Ocupados</label>
                            <div id="busySlotsList" class="space-y-1 text-[10px] text-gray-500 italic scroller max-h-24"></div>
                        </div>

                        <!-- Audit Info -->
                        <div id="appointmentAuditInfo" class="hidden pt-4 border-t border-gray-100 space-y-1 text-[10px] text-gray-400">
                            <p id="confirmedAtLabel" class="hidden flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span> <span></span></p>
                            <p id="cancelledByLabel" class="hidden flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-red-400 rounded-full"></span> <span></span></p>
                            <p id="rescheduledByLabel" class="hidden flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> <span></span></p>
                        </div>
                    </div>
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 rounded-b-3xl">
                        <div class="grid grid-cols-2 gap-3">
                            <button id="confirmBtn" class="col-span-2 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center justify-center gap-2 mb-1">✓ Confirmar Asistencia</button>
                            <button id="saveBtn" class="col-span-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-md">Guardar Cita</button>
                            <div class="col-span-2 flex gap-2">
                                <button id="payBtn" class="hidden flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 font-semibold">Pagado</button>
                                <button id="cancelBtn" class="hidden flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-semibold">Cancelar Cita</button>
                                <button id="deleteBtn" class="hidden flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 font-semibold">Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. CORTE DE CAJA MODAL -->
            <div id="corteDeCajaModal" class="hidden fixed inset-0 z-[9800] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 modal-panel flex flex-col max-h-[90vh] overflow-hidden">
                    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex justify-between items-center text-white">
                        <div>
                            <h3 class="text-xl font-bold">💰 Corte de Caja</h3>
                            <p id="corteFechaLabel" class="text-emerald-50 text-xs opacity-90 capitalize">...</p>
                        </div>
                        <button onclick="document.getElementById('corteDeCajaModal').classList.add('hidden')" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    
                    <div class="p-6 overflow-y-auto bg-gray-50/50 flex-1 scroller">
                        <!-- Summary Cards -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] font-bold text-gray-400 uppercase">Atendidas</p>
                                <h4 id="corteAtendidas" class="text-xl font-black text-gray-800">0</h4>
                            </div>
                            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] font-bold text-gray-400 uppercase">Pendientes</p>
                                <h4 id="cortePendientes" class="text-xl font-black text-orange-500">0</h4>
                            </div>
                            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] font-bold text-gray-400 uppercase">Cobrado</p>
                                <h4 id="corteCobrado" class="text-lg font-black text-emerald-600">$0</h4>
                            </div>
                            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] font-bold text-gray-400 uppercase">Por Cobrar</p>
                                <h4 id="cortePendienteTotal" class="text-lg font-black text-red-500">$0</h4>
                            </div>
                        </div>

                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-bold text-gray-700">Detalle de Sesiones (<span id="corteTotalCitas">0</span>)</h4>
                            <div class="text-[10px] font-medium text-gray-400 flex gap-2">
                                <span id="corteConfirmadas">0 confirmadas</span>
                                <span id="corteCanceladas"></span>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
                                    <tr>
                                        <th class="px-4 py-3">Paciente</th>
                                        <th class="px-4 py-3">Hora</th>
                                        <th class="px-4 py-3">Terapeuta</th>
                                        <th class="px-4 py-3 text-right">Monto</th>
                                        <th class="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody id="corteDetalleBody" class="divide-y divide-gray-50"></tbody>
                            </table>
                        </div>

                        <!-- Therapist Breakdown -->
                        <div id="corteTherapistSection" class="hidden">
                            <h4 class="text-sm font-bold text-gray-700 mb-3">Resumen por Terapeuta</h4>
                            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
                                        <tr>
                                            <th class="px-4 py-2">Terapeuta</th>
                                            <th class="px-4 py-2 text-center">Citas</th>
                                            <th class="px-4 py-2 text-center">Pagadas</th>
                                            <th class="px-4 py-2 text-right">Cobrado</th>
                                            <th class="px-4 py-2 text-right">Pendiente</th>
                                        </tr>
                                    </thead>
                                    <tbody id="corteTherapistBody" class="divide-y divide-gray-50"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-white border-t border-gray-100 flex justify-between gap-3">
                        <button id="corteCopyBtn" onclick="import('../modules/reports/CorteDeCaja.js').then(m => m.CorteDeCaja.copyToClipboard())" class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition-all flex items-center justify-center gap-2">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                             Copiar Reporte
                        </button>
                        <button onclick="document.getElementById('corteDeCajaModal').classList.add('hidden')" class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            <!-- 4. FINANCIAL REPORT MODAL -->
            <div id="financialReportModal" class="hidden fixed inset-0 z-[9700] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-0 modal-panel flex flex-col max-h-[90vh] overflow-hidden">
                    <div class="bg-gray-800 px-6 py-4 flex justify-between items-center text-white">
                        <div>
                            <h3 class="text-xl font-bold">Reporte Financiero Mensual</h3>
                            <p id="reportMonthLabel" class="text-gray-400 text-xs capitalize">...</p>
                        </div>
                        <button onclick="document.getElementById('financialReportModal').classList.add('hidden')" class="p-2 hover:bg-white/10 rounded-full">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    
                    <div class="p-6 overflow-y-auto bg-gray-50 flex-1 scroller space-y-6">
                        <!-- Key Stats -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 text-gray-900">
                                <div class="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                <div><p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingreso Total</p><h4 id="reportTotalIncome" class="text-2xl font-black">$0.00</h4></div>
                            </div>
                            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 text-gray-900">
                                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                <div><p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendiente</p><h4 id="reportTotalPending" class="text-2xl font-black text-orange-600">$0.00</h4></div>
                            </div>
                            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 text-gray-900">
                                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg></div>
                                <div><p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Citas</p><h4 id="reportTotalCount" class="text-2xl font-black text-blue-600">0</h4><span id="reportCompletionRate" class="text-[10px] text-green-600 font-bold uppercase">0% Pagadas</span></div>
                            </div>
                        </div>

                        <!-- Debtors Section -->
                        <div class="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 bg-red-50 border-b border-red-100"><h4 class="font-bold text-red-800 flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Pendientes de Cobro (Histórico)</h4></div>
                            <div class="overflow-x-auto"><table class="w-full text-sm text-left text-gray-900"><thead class="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase"><tr><th class="px-6 py-3">Paciente</th><th class="px-6 py-3">Terapeuta</th><th class="px-6 py-3 text-right">Deuda</th><th class="px-6 py-3">Citas</th></tr></thead><tbody id="debtorsListBody" class="divide-y divide-gray-50"></tbody></table></div>
                        </div>

                        <div id="reportTherapistBody" class="space-y-4"></div>
                    </div>
                </div>
            </div>

            <!-- 5. SCHEDULE NEW PATIENT MODAL (Restaurado) -->
            <div id="scheduleNewPatientModal" class="hidden fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col modal-panel overflow-hidden">
                    <!-- Header -->
                    <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                        <div>
                            <h3 class="text-xl font-bold">Agendar Primera Cita</h3>
                            <p id="schedulePatientName" class="text-indigo-100 text-xs mt-0.5">Paciente: ...</p>
                        </div>
                        <button id="closeScheduleNewPatientModalBtn" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6 scroller">
                        <!-- Week Navigation -->
                        <div class="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                            <button id="prevWeekScheduleBtn" class="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <div id="currentScheduleWeekLabel" class="text-sm font-bold text-gray-700 capitalize">...</div>
                            <button id="nextWeekScheduleBtn" class="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>

                        <!-- Slots Grid con Scroll Horizontal en Móvil -->
                        <div class="overflow-x-auto pb-4 -mx-2 px-2 scroller">
                            <div id="slotsGrid" class="flex md:grid md:grid-cols-6 gap-3 md:gap-4 min-w-[800px] md:min-w-full">
                                <!-- Generated by JS -->
                            </div>
                        </div>

                        <!-- Configuration -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div class="space-y-4">
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Configuración de Cita</h4>
                                <div>
                                    <label class="block text-sm text-gray-600 mb-1.5 ml-1">Costo por Sesión ($)</label>
                                    <input type="number" id="scheduleCostInput" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold" value="800">
                                </div>
                            </div>

                            <div class="space-y-4">
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Recurrencia Automática</h4>
                                <div class="flex gap-4">
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" name="recurrenceType" value="none" class="hidden peer" checked>
                                        <div class="peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 border border-gray-200 rounded-lg p-3 text-center text-sm font-medium hover:bg-gray-50 transition-all">Solo esta vez</div>
                                    </label>
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" name="recurrenceType" value="weekly" class="hidden peer">
                                        <div class="peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 border border-gray-200 rounded-lg p-3 text-center text-sm font-medium hover:bg-gray-50 transition-all">Semanal</div>
                                    </label>
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" name="recurrenceType" value="biweekly" class="hidden peer">
                                        <div class="peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 border border-gray-200 rounded-lg p-3 text-center text-sm font-medium hover:bg-gray-50 transition-all">Quincenal</div>
                                    </label>
                                </div>

                                <div id="sessionsCountContainer" class="hidden">
                                     <label class="block text-sm text-gray-600 mb-1.5 ml-1">Número de sesiones</label>
                                     <input type="number" id="sessionsCount" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value="1" min="1">
                                     <p class="text-[10px] text-gray-400 mt-1 italic">* El sistema agendará automáticamente las citas futuras.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 bg-white border-t border-gray-100 flex justify-end">
                        <button id="confirmScheduleBtn" class="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none transition-all flex items-center justify-center gap-2">
                            Seleccione Horario
                        </button>
                    </div>
                </div>
            </div>

            <!-- 6. AUDIT LOG MODAL -->
            <div id="auditLogModal" class="hidden fixed inset-0 z-[11000] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col modal-panel overflow-hidden">
                    <div class="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
                        <div>
                            <h3 class="text-xl font-bold">📋 Bitácora de Auditoría</h3>
                            <p class="text-slate-400 text-xs mt-0.5">Historial reciente de acciones en el sistema</p>
                        </div>
                        <button onclick="document.getElementById('auditLogModal').classList.add('hidden')" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 bg-gray-50 scroller">
                        <div id="auditLogList" class="space-y-3">
                            <!-- Dynamically populated -->
                            <div class="text-center py-10 text-gray-400 italic">Cargando registros...</div>
                        </div>
                    </div>
                    <div class="p-4 bg-white border-t border-gray-100 flex justify-between">
                        <button id="cleanupAuditBtn" onclick="import('./js/modules/admin/AuditPanel.js').then(m => m.AuditPanel.cleanup())" class="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             Limpiar Antiguos (60+ días)
                        </button>
                        <button onclick="document.getElementById('auditLogModal').classList.add('hidden')" class="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-all">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};
