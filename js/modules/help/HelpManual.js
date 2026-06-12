/**
 * HelpManual.js
 * Modal interactivo con el manual de usuario de Parláre.
 */

export const HelpManual = {
    MODAL_ID: 'helpManualModal',

    close() {
        const el = document.getElementById(this.MODAL_ID);
        if (el) el.remove();
        this._releaseBodyScroll();
        if (this._escHandler) {
            window.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    },

    _lockBodyScroll() {
        document.body.classList.add('overflow-hidden');
    },

    _releaseBodyScroll() {
        const ids = ['eventModal', 'newPatientModal', 'patientHistoryModal', 'inactivePatientsModal', 'sessionNoteModal', 'mobileMoreSheet'];
        const otherOpen = ids.some((id) => {
            const node = document.getElementById(id);
            return node && !node.classList.contains('hidden');
        });
        if (!otherOpen) document.body.classList.remove('overflow-hidden');
    },

    async open() {
        const modalId = this.MODAL_ID;
        this.close();

        try {
            const { MobileNav } = await import('../../utils/MobileNav.js');
            MobileNav.closeMoreSheet();
            MobileNav.closeSidebar();
        } catch (_) { /* noop */ }

        const html = `
        <div id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="helpManualTitle"
            class="fixed inset-0 z-[10050] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
            <div id="helpManualPanel" class="bg-white w-full max-w-none md:max-w-4xl h-[92dvh] md:h-[85vh] max-h-[92dvh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-800">
                <div class="md:hidden flex justify-center pt-2.5 pb-0 flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-3xl" aria-hidden="true">
                    <span class="w-10 h-1 rounded-full bg-white/40"></span>
                </div>
                
                <!-- Header -->
                <div class="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-white/20 rounded-xl">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 id="helpManualTitle" class="text-lg md:text-xl font-bold">Manual de Usuario</h2>
                            <p class="text-blue-100 text-xs font-medium">Guía oficial del Sistema Parláre</p>
                        </div>
                    </div>
                    <button type="button" id="closeHelpManualBtn" class="touch-target touch-manipulation p-3 hover:bg-white/10 rounded-full transition-colors" aria-label="Cerrar manual">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-8 scroller bg-gray-50/50">
                    <div class="max-w-3xl mx-auto space-y-4 pb-10">
                        
                        <!-- Regla de Oro Banner -->
                        <div class="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-2xl mb-6 shadow-sm">
                            <h4 class="font-bold text-amber-900 text-sm flex items-center gap-2">
                                ⚠️ REGLA DE ORO DE LA CLÍNICA
                            </h4>
                            <p class="text-amber-800 text-xs mt-1.5 leading-relaxed font-medium">
                                <strong>"Lo que no está en la app de Parláre, no existe."</strong> 
                                Jamás edites, crees o elimines citas directamente en Google Calendar. Todo movimiento debe registrarse en esta app para que el bot de WhatsApp funcione, las comisiones se calculen y no se dupliquen eventos.
                            </p>
                        </div>
                        
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

                        <!-- B. Bitácora -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-sm">B</span>
                                    Bitácora de Auditoría (Historial)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <p>En <strong>computadora</strong> usa el icono de lista arriba de Pacientes. En <strong>celular</strong>: pestaña <strong>Más → Bitácora de Auditoría</strong> (admin y recepción). Permite auditar todo lo que pasa en el sistema:</p>
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>Pestaña General:</strong> Verás quién creó, canceló o marcó como pagada una cita.</li>
                                    <li><strong>Pestaña WhatsApp (Historial de Bots):</strong> Muestra los recordatorios automáticos y manuales con sus estados:
                                        <ul class="list-none ml-4 mt-1.5 space-y-1 text-xs">
                                            <li>✅ <strong>Enviado (AM o PM):</strong> El recordatorio se entregó con éxito al celular del paciente.</li>
                                            <li>⚠️ <strong>Saltado (Skipped):</strong> No se envió porque el paciente no tiene número registrado, no ha aceptado el opt-in, o tiene desactivado WhatsApp.</li>
                                            <li>❌ <strong>Error:</strong> Falló el envío (ej. error de Twilio o número inexistente). Se muestra el detalle técnico para corregirlo.</li>
                                        </ul>
                                    </li>
                                    <li><strong>Identificación Staff:</strong> Los movimientos aparecen con el nombre de quien los hizo (👱‍♀️ Yari, 👩‍⚕️ Diana, etc).</li>
                                    <li><strong>Admin (Diana):</strong> <strong>Exportar a Excel</strong> y <strong>Limpiar App</strong> (más de 60 días). Exporta antes de limpiar si necesitas historial.</li>
                                </ul>
                                <p class="text-xs text-gray-500 italic">En celular el panel abre como hoja desde abajo; desliza o toca fuera para cerrar.</p>
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
                                    <li>Funciona también con número de <strong>teléfono</strong>.</li>
                                    <li><strong>📱 Tip:</strong> al teclear, automáticamente se cambia a la pestaña <strong>Todos</strong> para encontrar pacientes recién creados aunque no tengan cita hoy.</li>
                                </ul>
                                <p class="text-xs text-gray-500 italic">Si usas iPhone y antes la búsqueda no encontraba a un paciente nuevo, ahora es a prueba de iOS: la pestaña «Todos» se activa sola en cuanto escribes, funciona con dictado por voz, pegar texto y autocompletado del teclado.</p>
                            </div>
                        </details>

                        <!-- C. Copiloto Colaborativo -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-indigo-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">C</span>
                                    Copiloto de Adelantos (Waitlist)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <p>Cuando se cancela una cita <strong>entre 8 y 24 horas antes</strong>, el sistema te avisa con un banner flotante arriba a la derecha y la celda de la agenda <strong>brilla en ámbar/esmeralda</strong> con un ⚡ para que la veas de inmediato.</p>
                                <p>El banner tiene un <strong>contador de 8 minutos</strong> (margen para que decidas) con tres botones:</p>
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>🚀 Automático</strong> — Lanza ya las ofertas por WhatsApp a pacientes que tienen cita más tarde ese día con la misma terapeuta. No esperes los 8 min.</li>
                                    <li><strong>⏸️ Pausar</strong> — Aborta el Autopilot para ese espacio. Úsalo si vas a llenar tú el hueco a mano (paciente que llamó, conoces a alguien, etc.).</li>
                                    <li><strong>🔍 Manual</strong> — Abre la lista de candidatos elegibles con sus teléfonos y un botón directo de <strong>WhatsApp</strong> con mensaje listo. Útil cuando prefieres llamar personalmente.</li>
                                </ul>
                                <p class="text-xs text-gray-500 italic">Si no haces nada en 8 minutos, el sistema envía las ofertas solo. El primero que conteste "Sí, adelantar" desde su WhatsApp se queda con el espacio y los demás reciben "Lo sentimos, ya fue tomado".</p>
                                <p class="text-xs bg-violet-50 border-l-4 border-violet-400 p-3 rounded text-violet-900"><strong>🌙 Quiet Hours (22:00–07:00 MX):</strong> si cancelan de noche, aparece una tarjeta morada (sin contador de 8 min). Por defecto el Autopilot se libera a las <strong>8:00 AM</strong>. Puedes <strong>Liberar ya</strong>, <strong>Pausar</strong> (el cron de la mañana no enviará ofertas) o usar <strong>Manual</strong> como en el día.</p>
                                <p class="text-xs bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-amber-800">⚠️ El banner solo lo ves tú (Yari) y Diana. Las terapeutas no lo ven para no distraerlas.</p>

                                <!-- Sub-sección: etiquetas y botones grises en Búsqueda Manual -->
                                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-3">
                                    <h4 class="font-bold text-slate-800 mb-2 text-sm flex items-center gap-1.5">
                                        <span class="text-base" aria-hidden="true">❓</span>
                                        ¿Qué significa «Sin opt-in» y por qué algunos botones aparecen en gris?
                                    </h4>
                                    <p class="text-xs text-slate-700 mb-2">En el modal de <strong>🔍 Búsqueda Manual</strong> verás candidatos con diferentes etiquetas y estados. Esto es lo que significan:</p>
                                    <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-700 leading-snug">
                                        <li><strong>Etiqueta «Sin opt-in» (gris claro):</strong> el paciente <strong>NO tiene autorización activa</strong> de WhatsApp en su ficha. Sucede en pacientes nuevos a los que aún no se les activó la casilla o que no han respondido «Sí, autorizo» al mensaje de bienvenida.</li>
                                        <li><strong>Etiqueta «Rechazó WA» (rojo claro):</strong> el paciente respondió explícitamente <strong>«No»</strong> al opt-in. No mandes WhatsApp automatizado a este — si lo necesitas, llámalo de viva voz.</li>
                                        <li><strong>Etiqueta verde «Opt-in OK»:</strong> el paciente <strong>sí dio consentimiento</strong>. Estos son los candidatos ideales para el Copiloto.</li>
                                        <li><strong>Botones 📞 Llamar y 💬 WhatsApp en gris (deshabilitados):</strong> aparecen así <strong>únicamente cuando el paciente NO tiene teléfono registrado</strong> en su ficha (campo vacío). El sistema bloquea el botón para que no intentes llamar a la nada.</li>
                                    </ul>
                                    <p class="text-xs text-slate-700 mt-2 mb-1.5"><strong>🛠️ Cómo arreglarlo en cada caso:</strong></p>
                                    <ul class="list-disc pl-5 space-y-1 text-xs text-slate-700 leading-snug">
                                        <li><strong>Para que ya no diga «Sin opt-in»:</strong> abre la ficha del paciente → en la sección de WhatsApp activa la casilla manualmente (si tienes su consentimiento físico/verbal). También puedes presionar el botón <strong>Bienvenida</strong> para mandarle el mensaje de opt-in automático.</li>
                                        <li><strong>Para que los botones se iluminen:</strong> abre la ficha del paciente → captura un <strong>teléfono válido</strong> (10 dígitos). En cuanto se guarde, los botones de Llamar/WhatsApp se activan automáticamente.</li>
                                        <li><strong>Si rechazó WhatsApp («Rechazó WA»):</strong> no insistas con mensajes automáticos; respeta su decisión. Si necesitas avisarle algo urgente, llámalo por teléfono.</li>
                                    </ul>
                                    <p class="text-[11px] text-slate-500 italic mt-2">💡 El semáforo verde/amarillo/rojo en la lista de pacientes (sidebar) también te dice el estado de opt-in de cada uno sin entrar al modal del Copiloto.</p>
                                </div>
                            </div>
                        </details>

                        <!-- D. Citas y Calendario -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">D</span>
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
                                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 class="font-bold text-indigo-900 mb-1">📅 Agenda — vista Día / Semana</h4>
                                    <p class="mb-2">En la barra de la agenda (celular y computadora) verás <strong>Día</strong> y <strong>Semana</strong> junto al botón <strong>Hoy</strong>:</p>
                                    <ul class="list-disc ml-5 space-y-1">
                                        <li><strong>Día</strong> — Un solo día a la vez, con pestañas Lun–Sáb debajo del encabezado. Ideal para leer nombres completos y trabajar citas con detalle.</li>
                                        <li><strong>Semana</strong> — Los seis días laborables a la vez. En celular los nombres van abreviados (ej. <code>S·Pedro</code>); en computadora puedes desplazarte horizontalmente si hace falta.</li>
                                    </ul>
                                    <p class="text-xs text-indigo-800 mt-2 italic">En celular la columna de hora es más angosta. En computadora, al abrir la agenda suele mostrarse la semana completa; usa <strong>Día</strong> cuando quieras enfocarte en un solo día.</p>
                                </div>
                            </div>
                        </details>

                        <!-- C. Configuración de Clínica -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">C</span>
                                    Configuración de Clínica (Administración)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <p>Este panel permite a las administradoras gestionar de forma dinámica la clínica:</p>
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>Acceso:</strong> Desde computadoras usando el icono de engrane ⚙️ en el menú superior derecho, o en celulares desde el menú <strong>Más → Configuración de Clínica</strong>.</li>
                                    <li><strong>Temas y Metodología:</strong> Administra el catálogo global de temas, secciones (subtemas) y actividades de intervención. Al editar nombres o eliminar temas, los cambios se aplican de forma inmediata.</li>
                                    <li><strong>Costos y Comisiones:</strong> Configura los costos sugeridos de sesión y las cuotas de recuperación de la clínica para cada terapeuta de manera independiente.</li>
                                    <li><strong>Reportes Financieros Rápidos:</strong> Acceso rápido a los análisis de utilidad neta y rendimiento mensual.</li>
                                </ul>
                                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 class="font-bold text-indigo-900 mb-1">🏷️ Campos «SaaS Ready» (en gris)</h4>
                                    <p>Verás cédula profesional, institución de egreso y recibos de reembolso en gris con badge <strong>SaaS Ready</strong>. <strong>No está roto:</strong> el sistema ya guarda esos datos en la nube para cuando activen el módulo multi-clínica; Diana las habilitará desde administración.</p>
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
                                    <p><strong>Llenado:</strong> Ingresa nombre, elige terapeuta y pon el WhatsApp (10 dígitos). El sistema sugiere <strong>Costo</strong> y <strong>Cuota Parláre</strong> según la configuración del terapeuta — <em>puedes cambiarlas antes de guardar</em>. Esa cuota es la que verás en Excel (columna Parláre) cuando marquen la cita como pagada.</p>
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
                                    <li><strong>Identificación Staff:</strong> Ahora verás nombres reales (👱‍♀️ Yari, 👩‍⚕️ Diana, 👩‍⚕️ Sammy, etc.) en lugar de correos técnicos.</li>
                                    <li><strong>Confirmado por:</strong> Muestra quién confirmó la cita y a qué hora.</li>
                                    <li><strong>Cancelado por:</strong> Indica si fue el robot de WhatsApp (🤖 WA) o un miembro del staff.</li>
                                </ul>
                            </div>
                        </details>

                        <!-- J. Justificación Médica -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">J</span>
                                    Justificación Médica (Inasistencias)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <p>Para inasistencias por salud de los pacientes, el sistema permite cargar justificantes médicos para evitar que se aplique el cargo de la sesión:</p>
                                <div class="bg-emerald-50 p-4 rounded-xl space-y-2">
                                    <h4 class="font-bold text-emerald-800 flex items-center gap-1.5">
                                        <span class="text-emerald-500 font-bold">✓</span> Cómo Justificar una Inasistencia:
                                    </h4>
                                    <ul class="list-disc ml-5 space-y-1.5 text-emerald-950 font-medium">
                                        <li>Abre la cita cancelada en el calendario.</li>
                                        <li>Verás la sección **"Justificante Médico"** (con fondo rojizo tenue).</li>
                                        <li>Activa la casilla **"Inasistencia Justificada (No cobrar)"**; esto se guardará de forma instantánea.</li>
                                        <li>Arrastra el justificante (imagen o PDF) o haz clic en la zona de subida (caja punteada) para subirlo directamente a Firebase Storage de forma gratuita.</li>
                                    </ul>
                                </div>
                                <div class="bg-indigo-50 p-4 rounded-xl space-y-1">
                                    <h4 class="font-bold text-indigo-800">🔍 Auditoría Visual Rápida:</h4>
                                    <p>Las citas justificadas se mostrarán en el historial del paciente con un distintivo esmeralda premium: **«💚 Justificada»** en lugar del botón rojo normal de cancelada, permitiendo ver a simple vista qué inasistencias no deben cobrarse.</p>
                                </div>
                                <p class="text-xs text-gray-400 italic">Nota: Para cumplir con las políticas de ahorro de datos, los justificantes almacenados en el sistema se eliminan de forma automática a los 120 días de antigüedad.</p>
                            </div>
                        </details>

                        <!-- M. Menú Más (celular) -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200 md:hidden">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-sm">M</span>
                                    Menú «Más» (celular)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <p>En la barra inferior, toca <strong>Más</strong> para ver accesos que en computadora están en el header o sidebar:</p>
                                <ul class="list-disc ml-5 space-y-1.5">
                                    <li><strong>Conexión Google Sync</strong> — semáforo y sincronizar calendario.</li>
                                    <li><strong>Control Maestro</strong> — recepción/admin (alertas WhatsApp, panel de seguimiento manual).</li>
                                    <li><strong>Corte de Caja / Reportes / Configuración</strong> — solo administradoras.</li>
                                    <li><strong>Bitácora de Auditoría</strong> — admin y recepción (historial de cambios y WhatsApp).</li>
                                    <li><strong>Manual de Usuario</strong> — esta guía.</li>
                                    <li><strong>Enviar Sugerencia</strong> — ideas para mejorar el sistema.</li>
                                </ul>
                                <p class="text-xs text-gray-500">Navegación principal: <strong>Agenda</strong> (calendario) y <strong>Pacientes</strong> (lista y fichas).</p>
                            </div>
                        </details>

                        <!-- M. Mensajes WhatsApp -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center text-sm">M</span>
                                    Mensajes de WhatsApp y Bot
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-4 animate-fade-in">
                                <div class="bg-blue-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-blue-800 mb-1">🤖 Envíos Manuales Seguros</h4>
                                    <p>Al abrir una cita y dar clic en "Enviar WhatsApp" -> <strong>Clínica (Auto)</strong>, el sistema usa plantillas oficiales de Meta. Esto garantiza que el mensaje llegue, incluso si hace semanas que el paciente no te escribe.</p>
                                </div>
                                    <div class="bg-purple-50 p-4 rounded-xl">
                                        <h4 class="font-bold text-purple-800 mb-1">⏰ Recordatorios Automáticos (8 AM y 8 PM)</h4>
                                        <p>El día anterior a cada cita, el sistema envía <strong>hasta 2 recordatorios automáticos</strong> por WhatsApp usando plantillas con <strong>botones interactivos</strong> (Confirmar, Cancelar, Recepción):</p>
                                        <ul class="list-none space-y-1.5 mt-2 font-medium">
                                            <li class="flex items-start gap-2"><span class="mt-0.5 text-purple-500">🌅</span> <span><strong>8:00 AM</strong> — Primer recordatorio a todos los pacientes con cita mañana que no hayan confirmado.</span></li>
                                            <li class="flex items-start gap-2"><span class="mt-0.5 text-purple-500">🌙</span> <span><strong>8:00 PM</strong> — Segundo recordatorio <em>solo</em> a quienes recibieron el de la mañana pero no contestaron.</span></li>
                                        </ul>
                                        <p class="mt-2 text-xs text-purple-700 italic">Si el paciente confirma o cancela en cualquier momento, no recibirá el siguiente recordatorio. Si no responde ninguno, Yari y Diana lo ven al día siguiente.</p>
                                    </div>
                                <div class="bg-cyan-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-cyan-800 mb-1">❌ Flujos de Cancelación</h4>
                                    <p>Cuando un padre cancela vía WhatsApp, el bot le informa automáticamente que <strong>Recepción se pondrá en contacto</strong>. Además, la Bitácora guarda qué texto exacto recibió cada padre.</p>
                                </div>
                                <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                     <h4 class="font-bold text-amber-900 mb-2">🚦 Semáforo de consentimiento (Ficha del paciente)</h4>
                                     <p class="mb-2">Al abrir el expediente verás un badge junto al botón <strong>Bienvenida</strong> que indica si el paciente aceptó recordatorios automáticos por WhatsApp:</p>
                                     <ul class="list-none space-y-1.5 font-medium">
                                         <li class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span> <strong>WhatsApp Activo</strong> — Aceptó; el bot puede enviar recordatorios.</li>
                                         <li class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> <strong>Pendiente de Respuesta</strong> — Se envió bienvenida con botones; aún no responde.</li>
                                         <li class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> <strong>Seguimiento Manual</strong> — Rechazó bots; Yari debe contactar por teléfono (alerta en Recepción).</li>
                                     </ul>
                                     <p class="text-xs text-amber-800 mt-2 italic"><strong>Reglas de Consentimiento:</strong>
                                         <br>• Al crear un paciente nuevo o presionar <strong>Bienvenida</strong>, se desactiva la casilla de recordatorios automáticos (<code>wantsWhatsapp = false</code>) y se envía la plantilla de bienvenida solicitando opt-in.
                                         <br>• Cuando el paciente responde **"Sí, autorizo"**, el sistema <strong>activa la casilla automáticamente</strong> (<code>wantsWhatsapp = true</code>) y activa el bot.
                                         <br>• Si activas la casilla manualmente en el expediente, los recordatorios se enviarán inmediatamente sin bloquear, facilitando la transición de pacientes antiguos.
                                     </p>
                                 </div>
                                 <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                     <h4 class="font-bold text-emerald-900 mb-2">🔵 Punto de color en la lista de pacientes</h4>
                                     <p class="mb-2">Junto al nombre de cada paciente en la barra lateral verás un <strong>pequeño punto de color</strong>. Indica si ese paciente tiene habilitados los recordatorios automáticos por WhatsApp:</p>
                                     <ul class="list-none space-y-2 font-medium">
                                         <li class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></span> <span><strong>Verde — WhatsApp Activo:</strong> Aceptó recibir recordatorios. El bot le escribirá automáticamente a las 8 AM y 8 PM el día anterior.</span></li>
                                         <li class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0"></span> <span><strong>Naranja/Ámbar — Pendiente:</strong> Se le envió el mensaje de bienvenida con botones, pero aún no ha respondido. Recibe recordatorios automáticos <em>solo si</em> la casilla de recordatorios está activa.</span></li>
                                         <li class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span> <span><strong>Rojo — Seguimiento Manual:</strong> Rechazó los mensajes automáticos. Yari debe contactarle por teléfono; aparece alerta en Control Maestro.</span></li>
                                     </ul>
                                     <p class="text-xs text-emerald-800 mt-2 italic">💡 Si un paciente de mañana tiene el punto <strong>naranja</strong> y quieres que le llegue recordatorio automático, asegúrate de activar la casilla de recordatorios en su ficha.</p>
                                 </div>
                                <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <h4 class="font-bold text-red-900 mb-2">🔔 Alertas en Control Maestro</h4>
                                    <p class="mb-2">Si un padre responde <strong>No</strong> al opt-in, aparece una alerta. En <strong>Más → Control Maestro</strong> usa el panel <strong>Seguimiento manual WhatsApp</strong>: <strong>Ver ficha</strong> y <strong>Atendido</strong> cuando Yari ya gestionó el caso.</p>
                                </div>
                                <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <h4 class="font-bold text-amber-900 mb-2">🟣 Deben sesión (pacientes especiales)</h4>
                                    <p class="mb-2">Es un <strong>contador de sesiones por recuperar</strong> esta semana — <em>no</em> es lo mismo que la deuda en pesos (rojo «Solo con deuda»).</p>
                                    <ul class="list-disc ml-5 space-y-1.5 text-sm">
                                        <li><strong>Al cancelar una cita de hoy</strong>, el sistema puede preguntar si marcas que el paciente debe una sesión. Si eliges <strong>Reagendar</strong> y <strong>guardas</strong> la cita nueva, <strong>no</strong> se suma al contador.</li>
                                        <li>En el <strong>expediente</strong> (editar perfil), bloque «Cola sesión»: activar cola, número de sesiones (0–8), prioridad y horario habitual.</li>
                                        <li>En <strong>Control Maestro</strong>, botón ámbar <strong>Deben sesión</strong> filtra solo quienes tienen contador activo en la semana.</li>
                                    </ul>
                                </div>
                                <p>Iconos rápidos en tu agenda y barra lateral:</p>
                                <ul class="list-none space-y-1">
                                    <li>✅ = Paciente ya confirmó (manual o automático).</li>
                                    <li>⏳ = Sigue pendiente de confirmar asistencia.</li>
                                    <li>📩 = El mensaje de WhatsApp ya fue enviado y entregado.</li>
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
                                    <p>¿Vas a salir a comer o tienes un compromiso? Elige "Inhabilitar" desde el modal de cita para que nadie pueda agendarte en ese espacio.</p>
                                </div>
                                <div class="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                    <h4 class="font-bold text-amber-900 mb-1">🏖️ Vacaciones / Día completo — <span class="text-[10px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Actualizado 28 may</span></h4>
                                    <p class="mb-2">Registra ausencias desde el candado <strong>🔒</strong> del día o, en celular, <strong>Más → Vacaciones / Ausencia</strong>. El modal incluye atajos de fechas, tipos visuales y resumen antes de guardar.</p>

                                    <p class="text-xs font-bold text-amber-900 uppercase tracking-wide mt-3 mb-1">Cómo abrirlo</p>
                                    <ul class="list-disc pl-5 space-y-1 text-sm">
                                        <li><strong>Computadora:</strong> candado 🔒 en el encabezado del día (vista semana o día).</li>
                                        <li><strong>Celular (Vero, Sam, Diana, Yari):</strong> barra inferior <strong>Más → Vacaciones / Ausencia</strong>, o candado 🔒 junto al número del día.</li>
                                    </ul>

                                    <p class="text-xs font-bold text-amber-900 uppercase tracking-wide mt-3 mb-1">Antes de confirmar</p>
                                    <ul class="list-disc pl-5 space-y-1 text-sm">
                                        <li><strong>Atajos:</strong> <em>Hoy</em>, <em>Esta semana</em>, <em>Próxima semana</em>, <em>2 semanas</em> (activan «Todo el día» en rangos largos).</li>
                                        <li><strong>Tipo:</strong> 🏖️ Vacaciones · 🏥 Médica · 📚 Capacitación · 👤 Personal · 🚫 Otro.</li>
                                        <li><strong>Resumen indigo</strong> y <strong>banner verde</strong> si no hay citas en el rango.</li>
                                        <li><strong>Lista ámbar</strong> si hay niños agendados (nombre + hora).</li>
                                    </ul>

                                    <p class="text-xs font-bold text-amber-900 uppercase tracking-wide mt-3 mb-1">Si hay citas afectadas — elige una acción</p>
                                    <ul class="list-disc pl-5 space-y-1.5 text-sm">
                                        <li><strong>Solo bloquear:</strong> crea los días/horas inhábiles; tú hablas con cada familia y mueves citas a mano en la agenda.</li>
                                        <li><strong>Cancelar en Parláre:</strong> marca esas citas como canceladas en la app. <em>No envía WhatsApp al papá</em> — el seguimiento es interno (llamada o mensaje personal).</li>
                                        <li><strong>Pasar a otra terapeuta:</strong> elige quién cubre (Diana, Sam o Vero). La app <strong>solo reasigna</strong> las que caben a la <strong>misma hora y el mismo día</strong> con quien cubre.
                                            <ul class="list-disc pl-5 mt-1 space-y-1 text-xs text-amber-900/90">
                                                <li>Barra <strong>verde</strong>: «X citas caben a la misma hora» (se cambian al guardar).</li>
                                                <li>Lista <strong>índigo</strong>: si quien cubre ya tiene paciente a esa hora, ves hasta <strong>4 huecos libres de esa terapeuta ese mismo día</strong> (horarios cercanos) para ofrecer al papá.</li>
                                                <li>Tú confirmas con el papá; luego mueves la cita manualmente al hueco acordado si no era la misma hora.</li>
                                            </ul>
                                        </li>
                                    </ul>

                                    <p class="mt-3 text-amber-900"><strong>Permisos:</strong> Diana y Yari → cualquier terapeuta. <strong>Vero y Sam</strong> → solo su propia agenda.</p>
                                    <p class="mt-2 text-xs text-amber-800">💡 <strong>Vacaciones largas (10–20+ niños):</strong> atajo <em>«Próxima semana»</em> + <em>«Pasar a otra terapeuta»</em> para las que quepan; el resto coordínalo con la lista de huecos libres. No se mueven automáticamente a «la próxima semana» — la mayoría ya tiene horario fijo semanal.</p>
                                </div>

                                <!-- Ejemplo paso a paso (caso real) -->
                                <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                    <h4 class="font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                                        <span class="text-base" aria-hidden="true">📝</span>
                                        Ejemplo — «Me voy de vacaciones la próxima semana» (con citas)
                                    </h4>
                                    <p class="text-xs text-emerald-900/90 mb-2">Práctica recomendada en celular (Sam/Vero) o en computadora:</p>
                                    <ol class="list-decimal pl-5 space-y-1.5 text-sm text-emerald-950 leading-snug">
                                        <li>Abre <strong>Más → Vacaciones / Ausencia</strong> (celular) o el candado 🔒 del día (computadora).</li>
                                        <li>Toca <strong>«Próxima semana»</strong> y el tipo <strong>🏖️ Vacaciones</strong>. Revisa el resumen indigo.</li>
                                        <li>Si hay citas en ámbar, elige <strong>«Pasar a otra terapeuta»</strong> → selecciona quién cubre (ej. Diana).</li>
                                        <li>Lee la barra verde («X caben a la misma hora») y la lista índigo con <strong>huecos libres</strong> para los que no caben.</li>
                                        <li>Llama o escribe a esas familias; si acuerdan otro horario, mueve la cita manualmente en la agenda.</li>
                                        <li><strong>Confirmar Bloqueo</strong> → acepta el resumen. Las que cupieron cambian de terapeuta; las demás siguen en tu nombre hasta que las muevas o canceles.</li>
                                    </ol>
                                    <p class="mt-3 text-xs text-emerald-900/85"><strong>Alternativa:</strong> <em>Cancelar en Parláre</em> si la familia pausará esas sesiones (sin mensaje automático del bot).</p>
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

        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        document.getElementById('closeHelpManualBtn').onclick = () => this.close();

        this._escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        window.addEventListener('keydown', this._escHandler);

        this._lockBodyScroll();
        modal.style.display = 'flex';
    }
};

if (typeof window !== 'undefined') {
    window.openHelpManual = () => HelpManual.open();
    window.closeHelpManualModal = () => HelpManual.close();
}
