export const PatientModalsHTML = {
    /**
     * Inyecta los modales en el documento
     * @param {HTMLElement} container - Contenedor donde inyectar (default: document.body)
     */
    inject(container = document.body) {
        if (!container) return;

        const div = document.createElement('div');
        div.innerHTML = this.getHtml();

        while (div.firstChild) {
            container.appendChild(div.firstChild);
        }

        console.log('✅ PatientModalsHTML: Modales inyectados al DOM');
    },

    getHtml() {
        const touchField = 'w-full px-4 py-3.5 md:px-3 md:py-2 text-base md:text-sm border border-gray-300 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 outline-none touch-manipulation';
        const touchSelect = 'w-full px-4 py-3.5 md:px-3 md:py-2 text-base md:text-sm border border-gray-300 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white touch-manipulation';
        const touchBtn = 'min-h-[48px] touch-manipulation rounded-xl md:rounded-lg font-medium';

        return `
        <!-- 2. NEW PATIENT MODAL (bottom-sheet móvil) -->
        <div id="newPatientModal" onclick="if(event.target === this && window.closeNewPatientModal) window.closeNewPatientModal();"
            class="hidden fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px] md:backdrop-blur-none p-0 md:p-4" role="dialog" aria-modal="true" aria-labelledby="newPatientModalTitle">
            <div id="newPatientModalPanel" class="bg-white w-full max-w-none md:max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl md:rounded-xl shadow-2xl modal-panel overflow-hidden text-gray-800">
                <div class="md:hidden flex justify-center pt-2.5 pb-0 flex-shrink-0 bg-white" aria-hidden="true"><span class="w-10 h-1 rounded-full bg-gray-200"></span></div>
                <div class="flex justify-between items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 id="newPatientModalTitle" class="text-lg font-bold text-gray-800">Nuevo Paciente</h3>
                    <button type="button" id="closeNewPatientModalBtn" class="touch-target touch-manipulation flex-shrink-0 p-3 -m-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors" aria-label="Cerrar">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form id="newPatientForm" onsubmit="event.preventDefault();" class="flex flex-col flex-1 min-h-0">
                    <div class="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-4 scroller overscroll-contain">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre(s)</label>
                            <input type="text" id="newPatientFirstName" required class="${touchField}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos</label>
                            <input type="text" id="newPatientLastName" required class="${touchField}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Costo ($)</label>
                             <input type="number" id="newPatientDefaultCost" placeholder="500.00" class="${touchField}">
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Cuota Parlare ($)</label>
                             <input type="number" id="newPatientClinicFee" placeholder="250.00" value="250.00"
                                class="${touchField} bg-blue-50">
                        </div>
                    </div>

                    <div>
                             <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Mamá / Papá (Opcional)</label>
                             <input type="text" id="newPatientParentName" placeholder="Ej: María Elena (Mamá)" class="${touchField}">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Terapeuta Asignado</label>
                            <select id="newPatientTherapist" class="${touchSelect}">
                                <option value="diana">Diana</option>
                                <option value="sam">Sam</option>
                                <option value="vero">Vero</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">📱 WhatsApp</label>
                            <div class="flex gap-2">
                                <select id="newPatientCountryCode" class="w-20 md:w-16 px-2 py-3.5 md:py-2 text-sm md:text-[10px] border border-gray-300 rounded-xl md:rounded-lg bg-gray-50 outline-none touch-manipulation">
                                    <option value="52">🇲🇽 +52</option>
                                    <option value="1">🇺🇸 +1</option>
                                    <option value="34">🇪🇸 +34</option>
                                    <option value="54">🇦🇷 +54</option>
                                    <option value="55">🇧🇷 +55</option>
                                    <option value="56">🇨🇱 +56</option>
                                    <option value="57">🇨🇴 +57</option>
                                    <option value="502">🇬🇹 +502</option>
                                    <option value="51">🇵🇪 +51</option>
                                </select>
                                <input type="tel" id="newPatientPhone" placeholder="10 dígitos" maxlength="10"
                                    class="flex-1 min-w-0 ${touchField} focus:ring-green-500">
                            </div>
                            <label class="flex items-center gap-3 mt-3 cursor-pointer min-h-[44px] touch-manipulation">
                                <input type="checkbox" id="newPatientWantsWhatsapp" checked
                                    class="w-5 h-5 md:w-4 md:h-4 text-green-600 rounded focus:ring-green-500 border-gray-300">
                                <span class="text-xs md:text-[10px] text-gray-600 font-medium">Recibir recordatorios automáticos</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">🎂 Fecha de Nacimiento</label>
                            <input type="date" id="newPatientBirthday" class="${touchField}">
                        </div>
                    </div>
                    </div>

                    <div id="newPatientModalFooter" class="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-white flex gap-3">
                        <button type="button" id="cancelNewPatientBtn"
                            class="flex-1 px-4 py-3 ${touchBtn} bg-gray-100 text-gray-700 hover:bg-gray-200">Cancelar</button>
                        <button type="submit" id="saveNewPatientBtn"
                            class="flex-1 px-4 py-3 ${touchBtn} bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30">Crear Paciente</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 4. PATIENT HISTORY MODAL (bottom-sheet móvil) -->
        <div id="patientHistoryModal" onclick="if(event.target === this && window.closePatientHistoryModal) window.closePatientHistoryModal();"
            class="hidden fixed inset-0 z-[9500] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px] md:backdrop-blur-none p-0 md:p-4" role="dialog" aria-modal="true">
            <div id="patientHistoryModalPanel"
                class="bg-white w-full max-w-none md:max-w-4xl h-[92dvh] md:h-[85vh] max-h-[92dvh] flex flex-col rounded-t-3xl md:rounded-xl shadow-2xl modal-panel overflow-hidden text-gray-800">
                <div class="md:hidden flex justify-center pt-2.5 pb-0 flex-shrink-0 bg-white" aria-hidden="true"><span class="w-10 h-1 rounded-full bg-gray-200"></span></div>
                <div class="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200 flex justify-between items-start gap-3 bg-white flex-shrink-0">
                    <div class="flex items-center gap-3 min-w-0 flex-1" id="patientHistoryTitle">
                        <!-- Injected -->
                    </div>
                    <div class="flex items-center gap-0.5 flex-shrink-0">
                        <div id="authDebugInfo" class="hidden text-[8px] text-gray-300 mr-2 flex-col text-right"></div>
                        <button type="button" id="editPatientBtn"
                            class="touch-target touch-manipulation text-gray-400 hover:text-blue-600 p-3 rounded-full hover:bg-blue-50 transition-colors"
                            title="Editar Perfil" aria-label="Editar perfil">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                                </path>
                            </svg>
                        </button>
                        <button type="button" id="closePatientHistoryBtn"
                            class="touch-target touch-manipulation text-gray-400 hover:text-red-600 p-3 rounded-full hover:bg-red-50 transition-colors" aria-label="Cerrar">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 bg-gray-50/50 scroller overscroll-contain">
                    <div class="stats-container"></div>

                    <div id="patientEditSection"
                        class="hidden bg-white p-4 md:p-5 rounded-xl border border-blue-100 shadow-sm mb-6 animate-fade-in ring-2 ring-blue-50">
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
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Terapeuta Responsable</label>
                                <select id="editPatientTherapist" class="${touchSelect}">
                                    <option value="diana">Diana</option>
                                    <option value="sam">Sam</option>
                                    <option value="vero">Vero</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Costo Default</label>
                                <input type="number" id="editPatientCost" class="${touchField}" placeholder="0.00">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Cuota Parlare</label>
                                <input type="number" id="editPatientClinicFee" class="${touchField} bg-blue-50" placeholder="250.00">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Nombre Mamá / Papá</label>
                                <input type="text" id="editPatientParentName" class="${touchField}" placeholder="Opcional">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">📱 WhatsApp</label>
                                <div class="flex gap-2">
                                    <select id="editPatientCountryCode" class="w-20 md:w-16 px-2 py-3.5 md:py-2 text-sm md:text-[10px] border border-gray-300 rounded-xl md:rounded-lg bg-gray-50 outline-none touch-manipulation">
                                        <option value="52">🇲🇽 +52</option>
                                        <option value="1">🇺🇸 +1</option>
                                        <option value="34">🇪🇸 +34</option>
                                        <option value="54">🇦🇷 +54</option>
                                        <option value="55">🇧🇷 +55</option>
                                        <option value="56">🇨🇱 +56</option>
                                        <option value="57">🇨🇴 +57</option>
                                        <option value="502">🇬🇹 +502</option>
                                        <option value="51">🇵🇪 +51</option>
                                    </select>
                                    <input type="tel" id="editPatientPhone" maxlength="10"
                                        class="flex-1 min-w-0 ${touchField}" placeholder="10 dígitos">
                                </div>
                                <label class="flex items-center gap-3 mt-3 cursor-pointer min-h-[44px] touch-manipulation">
                                    <input type="checkbox" id="editPatientWantsWhatsapp" checked
                                        class="w-5 h-5 md:w-4 md:h-4 text-green-600 rounded focus:ring-green-500 border-gray-300">
                                    <span class="text-xs md:text-[10px] text-gray-600 font-medium tracking-tight">Recibir recordatorios automáticos</span>
                                </label>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">🎂 Cumpleaños</label>
                                <input type="date" id="editPatientBirthday" class="${touchField}">
                            </div>
                        </div>

                        <div id="adminPatientThemesSection" class="mt-6 pt-4 border-t border-gray-100 hidden">
                             <h5 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Temas de Trabajo del Paciente (Plan Diana)</h5>
                             <div id="editPatientThemesList" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
                        </div>

                        <div class="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                            <button type="button" id="deactivatePatientBtn"
                                class="hidden min-h-[44px] touch-manipulation px-4 py-2.5 text-xs bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200">Dar de Baja (Archivar)</button>
                            <button type="button" id="deletePatientBtn"
                                class="hidden min-h-[44px] touch-manipulation px-4 py-2.5 text-xs bg-red-100 text-red-700 rounded-xl hover:bg-red-200">Eliminar Definitivamente</button>
                            <button type="button" id="savePatientEditBtn"
                                class="min-h-[48px] touch-manipulation px-6 py-3 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm font-medium">Guardar Cambios</button>
                        </div>
                    </div>

                    <h4 class="text-sm font-bold text-gray-700 mb-3 ml-1">Historial de Citas</h4>
                    <div id="patientAppointmentsList" class="space-y-3"></div>
                </div>
            </div>
        </div>

        <!-- 5. INACTIVE PATIENTS MODAL (bottom-sheet móvil) -->
        <div id="inactivePatientsModal" onclick="if(event.target === this && window.closeInactivePatientsModal) window.closeInactivePatientsModal();"
            class="hidden fixed inset-0 z-[9800] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px] md:backdrop-blur-none p-0 md:p-4" role="dialog" aria-modal="true">
            <div id="inactivePatientsModalPanel" class="bg-white w-full max-w-none md:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-3xl md:rounded-xl shadow-2xl modal-panel overflow-hidden text-gray-800">
                <div class="md:hidden flex justify-center pt-2.5 pb-0 flex-shrink-0 bg-white" aria-hidden="true"><span class="w-10 h-1 rounded-full bg-gray-200"></span></div>
                <div class="flex justify-between items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2 min-w-0">
                        <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                            </path>
                        </svg>
                        <span class="truncate">Pacientes Inactivos (Papelera)</span>
                    </h3>
                    <button type="button" id="closeInactivePatientsBtn" class="touch-target touch-manipulation p-3 -m-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100" aria-label="Cerrar">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 scroller overscroll-contain">
                    <div id="inactivePatientsList" class="space-y-2"></div>
                </div>
                <div id="inactivePatientsModalFooter" class="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-white flex justify-end">
                    <button type="button" id="closeInactivePatientsFooterBtn"
                        class="min-h-[48px] touch-manipulation px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">Cerrar</button>
                </div>
            </div>
        </div>
        
        <!-- 6. SESSION NOTE / CLINICAL PROGRESS MODAL -->
        <div id="sessionNoteModal" onclick="if(event.target === this) this.classList.add('hidden')"
            class="hidden fixed inset-0 z-[11000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-gray-800">Bitácora de Sesión</h3>
                            <p id="sessionNoteDate" class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Fecha de la Cita</p>
                        </div>
                    </div>
                    <button id="closeSessionNoteBtn" class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30 scroller space-y-6">
                    <div id="sessionThemesSection" class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest">Plan de Trabajo Sugerido</h4>
                            <div class="relative flex-1 max-w-xs">
                                <input type="text" id="themeSearchInput" placeholder="Buscar actividad..." class="w-full pl-8 pr-3 py-1.5 bg-gray-100 border-none rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none">
                                <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>
                        <div id="sessionThemesList" class="space-y-4 max-h-[300px] overflow-y-auto scroller pr-2">
                             <p class="text-xs text-gray-400 italic text-center py-4">No hay temas asignados para este paciente.</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Observaciones Libres</h4>
                        <textarea id="sessionGeneralNote" rows="6" class="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium text-gray-700 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all outline-none resize-none" placeholder="Escribe aquí cualquier observación adicional de la sesión..."></textarea>
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                    <button id="cancelSessionNoteBtn" class="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Descartar</button>
                    <button id="saveSessionNoteBtn" class="px-8 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                         <span>Guardar Bitácora</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    }
};
