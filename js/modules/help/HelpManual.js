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
                        
                        <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">Índice de Ayuda (Orden Alfabético)</p>

                        <!-- A. Ajustes de Pago -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">A</span>
                                    Ajustes de Pago y Desglose
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <p>Al agendar o editar una cita, verás un botón que dice <strong>"Ajuste Manual"</strong>. Úsalo para casos especiales:</p>
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>Reparto de Comisión:</strong> Puedes especificar cuánto se queda la clínica y cuánto la terapeuta.</li>
                                    <li><strong>Pago de Planeación:</strong> Si una terapeuta planeó y otra ejecutó, aquí puedes poner el monto exacto para cada una.</li>
                                    <li><strong>Balance Automático:</strong> El sistema suma todo por ti para que coincida siempre con el costo total de la cita.</li>
                                </ul>
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
                                <p>El buscador es inteligente e ignora errores comunes:</p>
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
                                    <h4 class="font-bold text-emerald-800 mb-1">📅 Recurrencia (Citas Seguidas)</h4>
                                    <p>¿El paciente vendrá todos los lunes? Marca la casilla <strong>"Es una cita recurrente"</strong>. Puedes elegir si es semanal o quincenal y por cuántas semanas. ¡El sistema agendará todas de un solo golpe!</p>
                                </div>
                                <div class="bg-blue-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-blue-800 mb-1">🔄 Reagendado Automático</h4>
                                    <p>Si cancelas una cita, el sistema te preguntará si quieres reagendar. Si dices que sí, automáticamente te llevará a la <strong>siguiente semana</strong> en el mismo horario para que no tengas que buscar el día manualmente.</p>
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
                                    <p><strong>Llenado:</strong> Ingresa nombre, elige terapeuta y pon el WhatsApp (10 dígitos). El sistema ajustará mayúsculas y costos base por ti.</p>
                                </div>
                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
                                    <p><strong>Resultado:</strong> Al guardar, el paciente se añade a la lista y **automáticamente** se abre la ventana de horarios para agendar su primera sesión.</p>
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
                                    <span>🟢</span> <p><strong>Verde:</strong> Tus citas se sincronizan con tu celular en tiempo real.</p>
                                </div>
                                <div class="flex items-start gap-3 p-3 bg-red-50 rounded-xl text-red-800 font-medium">
                                    <span>🔴</span> <p><strong>Rojo:</strong> Permiso expirado. Haz clic para volver a ver tus citas en el celular.</p>
                                </div>
                            </div>
                        </details>

                        <!-- H. Historial y Auditoría -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-sm">H</span>
                                    Historial y Auditoría de Citas
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <p>¿Quieres saber quién hizo cambios? Al abrir cualquier cita verás la sección de <strong>Auditoría</strong>:</p>
                                <ul class="list-disc ml-5 space-y-1">
                                    <li><strong>Confirmado por:</strong> Muestra quién confirmó la cita y a qué hora.</li>
                                    <li><strong>Cancelado por:</strong> Indica si fue el robot de WhatsApp o Recepción.</li>
                                    <li><strong>Reagendado:</strong> Si la cita se movió, aquí verás el origen.</li>
                                </ul>
                            </div>
                        </details>

                        <!-- M. Mensajes WhatsApp -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center text-sm">M</span>
                                    Mensajes Diarios (WhatsApp)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-2 animate-fade-in">
                                <p>Cada mañana a las 8 AM recibes tu reporte. Iconos rápidos:</p>
                                <ul class="list-none space-y-1">
                                    <li>✅ = Paciente ya confirmó.</li>
                                    <li>⏳ = Sigue pendiente de responder.</li>
                                    <li>📩 = Recordatorio enviado con éxito.</li>
                                </ul>
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
                                <p>Cuando veas <code class="bg-gray-100 px-1 rounded">~~D~~ / S</code>:</p>
                                <ul class="list-disc ml-5 space-y-1">
                                    <li><strong>Letra tachada:</strong> Quien planeó (recibe comisión de planeación).</li>
                                    <li><strong>Letra activa:</strong> Quien atiende hoy (recibe pago por sesión).</li>
                                </ul>
                            </div>
                        </details>

                        <!-- T. Tipos de Sesión -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center text-sm">T</span>
                                    Tipos de Sesión y Bloqueos
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <div class="bg-rose-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-rose-800 mb-1">⛔ Inhabilitar Hora</h4>
                                    <p>¿Vas a salir a comer o tienes un compromiso? Elige "Inhabilitar" para que nadie pueda agendarte en ese espacio.</p>
                                </div>
                                <div class="bg-indigo-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-indigo-800 mb-1">🏫 Visita a Escuela</h4>
                                    <p>Si la sesión no es en la clínica, marca esta opción. Ayuda a distinguir el lugar y tipo de servicio en los reportes.</p>
                                </div>
                            </div>
                        </details>

                        <!-- Tips -->
                        <div class="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 mt-10">
                            <h4 class="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.586 15.414a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM7.071 14.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z"></path></svg>
                                Tip Pro
                            </h4>
                            <p class="text-indigo-800/80 text-sm leading-relaxed">
                                Si necesitas mover una cita rápido, puedes <strong>arrastrarla y soltarla</strong> (Drag & Drop) a otro horario o día. El sistema guardará el cambio al instante.
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
