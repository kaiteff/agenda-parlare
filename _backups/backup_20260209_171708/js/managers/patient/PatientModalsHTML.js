export const PatientModalsHTML = {
    /**
     * Inyecta los modales en el documento
     * @param {HTMLElement} container - Contenedor donde inyectar (default: document.body)
     */
    inject(container = document.body) {
        if (!container) return;

        // Crear un contenedor temporal
        const div = document.createElement('div');
        div.innerHTML = this.getHtml();

        // Mover los hijos al container real
        while (div.firstChild) {
            container.appendChild(div.firstChild);
        }

        console.log('✅ PatientModalsHTML: Modales inyectados al DOM');
    },

    getHtml() {
        return `
        <!-- 2. NEW PATIENT MODAL -->
        <div id="newPatientModal"
            class="hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all modal-panel">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-bold text-gray-800">Nuevo Paciente</h3>
                    <button id="closeNewPatientModalBtn" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form id="newPatientForm" onsubmit="event.preventDefault();" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre(s)</label>
                            <input type="text" id="newPatientFirstName" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos</label>
                            <input type="text" id="newPatientLastName" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                             <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Costo ($)</label>
                             <input type="number" id="newPatientDefaultCost" placeholder="500.00"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Cuota Parlare ($)</label>
                             <input type="number" id="newPatientClinicFee" placeholder="250.00" value="250.00"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Terapeuta Asignado</label>
                            <select id="newPatientTherapist"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="diana">Diana</option>
                                <option value="sam">Sam</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">📱 WhatsApp</label>
                            <input type="tel" id="newPatientPhone" placeholder="33 2495 5791"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                        </div>
                    </div>

                    <div class="pt-4 flex gap-3">
                        <button type="button"
                            onclick="document.getElementById('newPatientModal').classList.add('hidden')"
                            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                        <button type="submit" id="saveNewPatientBtn"
                            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30">Crear
                            Paciente</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 4. PATIENT HISTORY MODAL -->
        <div id="patientHistoryModal"
            class="hidden fixed inset-0 z-[9500] flex items-center justify-center bg-black bg-opacity-50">
            <div
                class="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col modal-panel overflow-hidden">
                <!-- Header -->
                <div class="p-5 border-b border-gray-200 flex justify-between items-start bg-gray-50 flex-shrink-0">
                    <div class="flex items-center gap-4" id="patientHistoryTitle">
                        <!-- Injected -->
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="editPatientBtn"
                            class="text-gray-500 hover:text-blue-600 p-2 rounded hover:bg-blue-50 transition-colors"
                            title="Editar Perfil">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                                </path>
                            </svg>
                        </button>
                        <button onclick="document.getElementById('patientHistoryModal').classList.add('hidden')"
                            class="text-gray-400 hover:text-gray-600 p-2">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Scrollable Content -->
                <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <!-- Finance -->
                        <div id="patientFinanceCard" class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div class="text-xs font-bold text-gray-400 uppercase mb-2">Balance Financiero</div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <div class="text-2xl font-bold text-gray-800" id="patientTotalPaid">$0</div>
                                    <div class="text-xs text-green-600 font-medium">Pagado</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-red-500" id="patientTotalPending">$0</div>
                                    <div class="text-xs text-red-600 font-medium">Pendiente</div>
                                </div>
                            </div>
                        </div>

                        <!-- Attendance -->
                        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div class="text-xs font-bold text-gray-400 uppercase mb-2">Asistencia</div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <div class="text-2xl font-bold text-gray-800" id="patientCompletedAppointments">0
                                    </div>
                                    <div class="text-xs text-gray-500">Completadas</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-blue-600" id="patientTotalAppointments">0</div>
                                    <div class="text-xs text-blue-600 font-medium">Total Citas</div>
                                </div>
                            </div>
                        </div>

                        <!-- Next -->
                        <div
                            class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                            <div class="text-xs font-bold text-gray-400 uppercase mb-1">Próximas</div>
                            <div class="text-3xl font-bold text-indigo-600" id="patientUpcomingAppointments">0</div>
                            <div class="text-xs text-indigo-600 font-medium">Agendadas</div>
                        </div>
                    </div>

                    <!-- Edit Section (Hidden by default) -->
                    <div id="patientEditSection"
                        class="hidden bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6 animate-fade-in ring-2 ring-blue-50">
                        <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                                </path>
                            </svg>
                            Editar Perfil
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Terapeuta
                                    Responsable</label>
                                <select id="editPatientTherapist" class="w-full border rounded px-3 py-2 text-sm">
                                    <option value="diana">Diana</option>
                                    <option value="sam">Sam</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Costo
                                    Default</label>
                                <input type="number" id="editPatientCost"
                                    class="w-full border rounded px-3 py-2 text-sm" placeholder="0.00">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Cuota Parlare</label>
                                <input type="number" id="editPatientClinicFee"
                                    class="w-full border rounded px-3 py-2 text-sm bg-blue-50" placeholder="250.00">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">📱 WhatsApp</label>
                                <input type="tel" id="editPatientPhone"
                                    class="w-full border rounded px-3 py-2 text-sm" placeholder="33 2495 5791">
                            </div>
                        </div>
                        <div class="mt-4 flex justify-end gap-2">
                            <button id="deactivatePatientBtn"
                                class="hidden px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Dar
                                de Baja (Archivar)</button>
                            <button id="deletePatientBtn"
                                class="hidden px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Eliminar
                                Definitivamente</button>
                            <button id="savePatientEditBtn"
                                class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Guardar
                                Cambios</button>
                        </div>
                    </div>

                    <!-- History List -->
                    <h4 class="text-sm font-bold text-gray-700 mb-3 ml-1">Historial de Citas</h4>
                    <div id="patientAppointmentsList" class="space-y-3">
                        <!-- Items injected -->
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. INACTIVE PATIENTS MODAL -->
        <div id="inactivePatientsModal"
            class="hidden fixed inset-0 z-[9800] flex items-center justify-center bg-black bg-opacity-50">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 modal-panel flex flex-col max-h-[80vh]">
                <div class="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                            </path>
                        </svg>
                        Pacientes Inactivos (Papelera)
                    </h3>
                    <button id="closeInactivePatientsBtn" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-1">
                    <div id="inactivePatientsList" class="space-y-2">
                        <!-- List injected -->
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t flex justify-end">
                    <button id="closeInactivePatientsFooterBtn"
                        class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">Cerrar</button>
                </div>
            </div>
        </div>
        `;
    }
};
