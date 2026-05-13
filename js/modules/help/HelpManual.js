/**
 * HelpManual.js
 * Modal interactivo con el manual de usuario de Parláre.
 */

import { ModalService } from '../../utils/ModalService.js';

export const HelpManual = {
    open() {
        const modalId = 'helpManualModal';
        if (document.getElementById(modalId)) return;

        const html = `
        <div id="${modalId}" onclick="if(event.target===this) this.remove()" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                
                <!-- Header -->
                <div class="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-white/20 rounded-xl">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">Manual de Usuario</h2>
                            <p class="text-blue-100 text-xs font-medium">Guía oficial del Sistema Parláre</p>
                        </div>
                    </div>
                    <button id="closeHelpManualBtn" class="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-8 scroller bg-gray-50/50">
                    <div class="max-w-3xl mx-auto space-y-4 pb-10">
                        
                        <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">Temas ordenados alfabéticamente</p>

                        <!-- A. Administración -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">A</span>
                                    Administración y Reportes
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <div class="bg-purple-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-purple-800 mb-1">💵 Cortes de Caja</h4>
                                    <p>En el menú lateral encontrarás el botón de <strong>Corte</strong>. Genera un resumen automático del día (citas cobradas, desgloses, etc.) listo para copiar y enviar a Diana.</p>
                                </div>
                                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 class="font-bold text-slate-800 mb-1">📋 Bitácora de Auditoría</h4>
                                    <p>Registra quién creó, modificó o canceló cada cita. Disponible para Admins y Recepción desde el icono de lista en el sidebar.</p>
                                </div>
                            </div>
                        </details>

                        <!-- B. Búsqueda -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">B</span>
                                    Búsqueda de Pacientes
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <p>El buscador es inteligente y no le importan los errores comunes:</p>
                                <ul class="list-disc ml-5 space-y-1">
                                    <li>No importa si usas <strong>MAYÚSCULAS</strong> o minúsculas.</li>
                                    <li>Ignora los <strong>acentos</strong> (puedes escribir "jose" para buscar a "José").</li>
                                </ul>
                            </div>
                        </details>

                        <!-- C. Citas y Calendario -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">C</span>
                                    Citas y Calendario
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <div class="bg-emerald-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-emerald-800 mb-1">🛡️ Blindaje de Horarios</h4>
                                    <p>Para evitar errores, solo se permite agendar entre <strong>8:00 AM y 8:00 PM</strong> (Hora CDMX).</p>
                                </div>
                                <div class="bg-white p-4 border rounded-xl">
                                    <h4 class="font-bold text-gray-800 mb-1">⚡ Pestañas Inteligentes</h4>
                                    <p>El sidebar busca automáticamente el <strong>siguiente día con citas</strong>. Si hoy es viernes, te mostrará el lunes en lugar de dejar la pestaña vacía.</p>
                                </div>
                            </div>
                        </details>

                        <!-- C. Crear Paciente -->
                        <details open class="group bg-blue-50 rounded-2xl border border-blue-200 shadow-md overflow-hidden transition-all">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none bg-white">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">+</span>
                                    Crear un Paciente Nuevo (Guía Paso a Paso)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-6 pb-6 pt-4 text-sm text-gray-700 space-y-4 animate-fade-in">
                                
                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">1</div>
                                    <p><strong>¿Dónde empiezo?:</strong> Haz clic en el botón azul con el símbolo <strong>"+"</strong> que está en la esquina superior derecha del panel de pacientes.</p>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">2</div>
                                    <div>
                                        <p><strong>Llenado de la Ficha:</strong> Se abrirá una ventana donde debes ingresar:</p>
                                        <ul class="mt-2 space-y-1 ml-4 list-disc text-gray-600">
                                            <li><strong>Nombre y Apellidos:</strong> El sistema les pondrá mayúsculas solo.</li>
                                            <li><strong>Terapeuta:</strong> Elige quién atenderá al paciente.</li>
                                            <li><strong>WhatsApp:</strong> Elige la bandera y escribe los 10 dígitos (sin el 52).</li>
                                            <li><strong>Costos:</strong> El sistema ya trae los precios base, pero puedes ajustarlos si el paciente tiene una tarifa especial.</li>
                                        </ul>
                                    </div>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
                                    <div>
                                        <p><strong>¿Qué pasa al Guardar?:</strong> Al hacer clic en "Crear Paciente":</p>
                                        <ul class="mt-2 space-y-1 ml-4 list-disc text-gray-600">
                                            <li>Verás una confirmación verde arriba a la derecha.</li>
                                            <li>El paciente aparecerá en tu lista de la pestaña <strong>"TODOS"</strong>.</li>
                                            <li><strong>¡IMPORTANTE!:</strong> El sistema te abrirá automáticamente la ventana de agendar para que elijas su primera cita de una vez sin perder tiempo.</li>
                                        </ul>
                                    </div>
                                </div>

                            </div>
                        </details>

                        <!-- G. Google Sync -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-sm">G</span>
                                    Google Sync (Tu Semáforo)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <div class="flex items-start gap-3 p-3 bg-green-50 rounded-xl text-green-800 font-medium">
                                    <span>🟢</span> <p><strong>Verde:</strong> Tus citas se están enviando a tu celular automáticamente.</p>
                                </div>
                                <div class="flex items-start gap-3 p-3 bg-red-50 rounded-xl text-red-800 font-medium">
                                    <span>🔴</span> <p><strong>Rojo:</strong> Tu permiso expiró. Haz clic para reconectar y volver a ver tus citas en el celular.</p>
                                </div>
                            </div>
                        </details>

                        <!-- R. Relevos -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-sm">R</span>
                                    Relevos de Terapeutas (Handover)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <p>Cuando veas algo como <code class="bg-gray-100 px-1 rounded">~~D~~ / S</code>:</p>
                                <ul class="list-disc ml-5 space-y-1">
                                    <li><strong>Letra tachada:</strong> Quien planeó originalmente.</li>
                                    <li><strong>Letra activa:</strong> Quien dará la sesión hoy.</li>
                                </ul>
                                <p class="text-xs text-amber-600 italic">Esto asegura que el pago de planeación y ejecución llegue a la persona correcta sin que tengas que avisar.</p>
                            </div>
                        </details>

                        <!-- T. Teléfonos -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center text-sm">T</span>
                                    Teléfonos y WhatsApp
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>Solo 10 Dígitos:</strong> El sistema te bloquea si intentas poner más.</li>
                                    <li><strong>Olvida el +52:</strong> No lo pongas en el cuadro; el sistema lo sabe por la bandera de la izquierda.</li>
                                    <li><strong>Robot de las 8 AM:</strong> Cada mañana se envían recordatorios automáticos (sin nombres de pacientes por privacidad).</li>
                                </ul>
                            </div>
                        </details>

                        <!-- Tips -->
                        <div class="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 mt-10">
                            <h4 class="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.586 15.414a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM7.071 14.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z"></path></svg>
                                Tip de Navegación
                            </h4>
                            <p class="text-indigo-800/80 text-sm leading-relaxed">
                                Todas las ventanas ahora tienen una <strong>"X"</strong> y también se pueden cerrar haciendo clic afuera en lo oscuro. ¡Más rápido y fácil!
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-6 bg-white border-t border-gray-100 flex justify-center shrink-0">
                    <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Parláre Clinical Intelligence v7.9.0</p>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Bind events
        document.getElementById('closeHelpManualBtn').onclick = () => {
            const el = document.getElementById(modalId);
            if (el) el.remove();
        };
        
        // Cerrar con escape
        const onEsc = (e) => {
            if (e.key === 'Escape') {
                const el = document.getElementById(modalId);
                if (el) el.remove();
                window.removeEventListener('keydown', onEsc);
            }
        };
        window.addEventListener('keydown', onEsc);
    }
};
