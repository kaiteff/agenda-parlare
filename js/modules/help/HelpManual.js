/**
 * HelpManual.js
 * Modal interactivo con el manual de usuario de Parláre.
 * 
 * ⚠️ AI INSTRUCTION: Always update this file whenever core features, 
 * UI tabs, or WhatsApp logic are modified to keep users informed.
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
                    <div class="max-w-3xl mx-auto space-y-10 pb-10">
                        
                        <!-- Sección 1: WhatsApp -->
                        <section>
                            <h3 class="text-blue-600 font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                                <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                📱 Automatización de WhatsApp
                            </h3>
                            <div class="grid gap-4">
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">🤖 Robot de las 8:00 AM</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        Cada mañana a las 8:00 AM, el sistema envía recordatorios automáticos a todos los pacientes del día siguiente.
                                        Solo se envían si la casilla <strong class="text-blue-600">"Recibir recordatorios automáticos"</strong> está marcada en el perfil del paciente.
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">🛡️ Seguridad y Privacidad</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        Por política de seguridad, los mensajes de WhatsApp <strong class="text-red-500">JAMÁS</strong> incluyen nombres de pacientes o papás. Solo incluyen fecha, hora y terapeuta.
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">💬 Respuestas del Bot</h4>
                                    <ul class="text-sm text-gray-600 space-y-1.5 mt-2">
                                        <li>• <strong>CONFIRMAR:</strong> Responde "1", "OK", "Sí", "Confirmar" o "Confirmado".</li>
                                        <li>• <strong>CANCELAR:</strong> Responde "2", "No", "Cancelar" o "Cancelado".</li>
                                        <li>• <strong>RECEPCIÓN:</strong> Responde "3", "Recepción", "Yari" o "Hablar con recepción".</li>
                                    </ul>
                                </div>
                                <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                                    <h4 class="font-bold text-emerald-800 mb-2">✅ Rastreo de Envíos (Novedad)</h4>
                                    <p class="text-emerald-700 text-sm leading-relaxed">
                                        Ahora puedes saber si ya se envió el recordatorio consultando el <strong>Historial del Paciente</strong>:
                                    </p>
                                    <ul class="text-[11px] text-emerald-800 font-bold space-y-1 mt-2">
                                        <li>🤖 <strong>Robot:</strong> Enviado automáticamente a las 8:00 AM.</li>
                                        <li>📱 <strong>Celular:</strong> Enviado manualmente por Yari.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <!-- Sección 2: Gestión de Pacientes -->
                        <section>
                            <h3 class="text-indigo-600 font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                                <span class="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                👥 Gestión de Pacientes
                            </h3>
                            <div class="grid gap-4">
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">🚫 Dar de Baja / Inactivar</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        Si un paciente deja de asistir, cámbialo a <strong>"Inactivo"</strong> en su perfil. Esto detiene todos los mensajes automáticos y lo mueve a la "Papelera" para mantener limpia tu lista.
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">☢️ Botón NUKE (Eliminar)</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        Este botón borra permanentemente al paciente y todas sus citas de la base de datos. <strong class="text-red-600">No se puede deshacer.</strong> Úsalo solo para errores de dedo o pruebas.
                                    </p>
                                </div>
                                <div class="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                                    <h4 class="font-bold text-indigo-800 mb-2">🔤 Orden Alfabético</h4>
                                    <p class="text-indigo-700 text-sm leading-relaxed">
                                        La pestaña <strong>"TODOS"</strong> del sidebar ahora organiza a los pacientes de la <strong>A a la Z</strong> para que sea más fácil encontrarlos manualmente.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- Sección 3: Calendario -->
                        <section>
                            <h3 class="text-emerald-600 font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                                <span class="w-1.5 h-6 bg-emerald-600 rounded-full"></span>
                                📅 Calendario y Citas
                            </h3>
                            <div class="grid gap-4">
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">🎨 Colores de Terapeutas</h4>
                                    <div class="flex gap-4 text-xs font-bold uppercase mt-2">
                                        <span class="px-2 py-1 bg-pink-100 text-pink-700 rounded border border-pink-200">Diana</span>
                                        <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Sam</span>
                                        <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200">Vero</span>
                                    </div>
                                </div>
                                <div class="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                    <h4 class="font-bold text-blue-800 mb-2">⚡ Pestañas Inteligentes</h4>
                                    <p class="text-blue-700 text-sm leading-relaxed">
                                        La segunda pestaña del sidebar ya no es solo "Mañana". Ahora busca automáticamente el <strong>siguiente día con citas</strong> (ej: si hoy es viernes, te mostrará el Lunes). ¡Ya no verás pestañas vacías!
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">💰 Pagos y Deudas</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        En la lista lateral, los pacientes con deuda aparecen con un punto <span class="text-orange-500 font-bold">Naranja</span>. Si están al corriente, el punto es <span class="text-green-500 font-bold">Verde</span>.
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">🔄 Sincronización y Google Calendar</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        El sistema se sincroniza <strong>automáticamente</strong> con Google Calendar en tiempo real.
                                        <strong class="text-red-500">IMPORTANTE:</strong> No modifiques ni elimines citas directamente desde la app de Google Calendar, ya que podrías romper la sincronización. Si necesitas mover una cita, usa la app de Parláre arrastrando y soltando la cita.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- Sección 4: Administración y Reportes -->
                        <section>
                            <h3 class="text-purple-600 font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                                <span class="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                📊 Administración y Cortes
                            </h3>
                            <div class="grid gap-4">
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">💵 Cortes de Caja</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        En el menú lateral (abajo a la izquierda), encontrarás el botón de <strong>Corte</strong>. Este genera un resumen automático del día: citas atendidas, cobradas y desglose por terapeuta. Puedes copiar el reporte para enviarlo por WhatsApp a Diana.
                                    </p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 class="font-bold text-gray-800 mb-2">⚙️ Configuración (Costos y Comisiones)</h4>
                                    <p class="text-gray-600 text-sm leading-relaxed">
                                        En el engrane de arriba a la derecha, los administradores pueden abrir el Panel de Configuración. Ahí se pueden configurar los temas clínicos y establecer la <strong>Cuota Base y Comisión</strong> para cada terapeuta (Diana, Sam, Vero). Estos costos se aplican automáticamente al crear nuevos pacientes.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- Sección 5: Recomendaciones -->
                        <div class="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                            <h4 class="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.586 15.414a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM7.071 14.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z"></path></svg>
                                Tips Rápidos
                            </h4>
                            <p class="text-indigo-800/80 text-sm leading-relaxed">
                                Si el sistema se siente lento, recarga la página. 
                                <br><br>
                                💡 <strong>Navegación:</strong> Ahora todos los cuadros de diálogo tienen una <strong>"X"</strong> en la esquina y también puedes cerrarlos haciendo clic en el área oscura fuera de la ventana.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-6 bg-white border-t border-gray-100 flex justify-center shrink-0">
                    <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Parláre Clinical Intelligence v7.8.0</p>
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
