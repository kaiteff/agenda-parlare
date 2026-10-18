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

                        <!-- Resumen novedades 9 jul 2026 -->
                        <div class="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 rounded-2xl shadow-lg mb-6">
                            <h3 class="font-bold text-base flex items-center gap-2 mb-2">
                                <span>✨</span> Novedades del 9 de julio de 2026
                            </h3>
                            <p class="text-indigo-100 text-xs mb-3">Todo lo implementado hoy — guía rápida por rol:</p>
                            <div class="grid md:grid-cols-2 gap-3 text-xs">
                                <div class="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                    <p class="font-bold text-white mb-1.5">👩‍⚕️ Diana</p>
                                    <ul class="list-disc ml-4 space-y-1 text-indigo-50">
                                        <li>Alta <strong>Proceso de evaluación</strong> al crear paciente (o delegar permiso a Yari).</li>
                                        <li>Agenda con etapas; Google Calendar muestra «Entrevista — cita 1 de 3 — …».</li>
                                        <li>Confirmar cita en app (✓) → bitácora <code class="bg-white/20 px-1 rounded">confirmedBy: diana</code>.</li>
                                        <li><strong>9 PM celular:</strong> bot pregunta si hubo sesión de evaluación; tras Evaluación, si sigue otra evaluación o entrega.</li>
                                        <li><strong>Equipo y permisos</strong> en Configuración (pestaña ya enlazada).</li>
                                    </ul>
                                </div>
                                <div class="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                    <p class="font-bold text-white mb-1.5">👱‍♀️ Yari</p>
                                    <ul class="list-disc ml-4 space-y-1 text-indigo-50">
                                        <li>Agendar etapas 1→2→3 (varios huecos o desde agenda).</li>
                                        <li>Recordatorios papá con etapa (8 AM / 8 PM); cancelar pide <strong>motivo</strong> (enfermedad / viaje / otro).</li>
                                        <li><strong>Control Maestro → Hoy sin confirmar:</strong> citas de hoy que el papá no confirmó; rosa si faltan ≤2 h → WhatsApp manual.</li>
                                        <li>Hueco ocupado muestra <strong>quién</strong> está ahí (y etapa si es evaluación).</li>
                                    </ul>
                                </div>
                                <div class="bg-white/10 rounded-xl p-3 backdrop-blur-sm md:col-span-2">
                                    <p class="font-bold text-white mb-1.5">Sam y Vero</p>
                                    <ul class="list-disc ml-4 space-y-1 text-indigo-50">
                                        <li>Misma libertad en <strong>su agenda</strong>: mover, recurrencia y citas sueltas de pacientes en evaluación (sin bloqueo extra).</li>
                                        <li>No ven el selector «Proceso de evaluación» al crear paciente salvo que Diana les dé permiso.</li>
                                        <li>Si agendan a un paciente en evaluación, las etapas se etiquetan igual al guardar la cita.</li>
                                    </ul>
                                </div>
                            </div>
                            <p class="text-[10px] text-indigo-200 mt-3 italic">Detalle abajo: sección «Evaluaciones», «Crear paciente», «Mensajes WhatsApp» y «Citas y Calendario».</p>
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
                                    <li><strong>Reparto de Comisión:</strong> Al abrir una cita, el desglose usa la <strong>cuota y costo del perfil del paciente</strong> (ej. $150 Parláre + $500 Sesión si el total es $650). El texto gris muestra esa cuota — escribe otro monto solo si <em>esta cita</em> es excepción (relevo, acuerdo especial).</li>
                                    <li><strong>Pago de Planeación:</strong> Si una terapeuta planeó y otra ejecutó, aquí puedes poner el monto exacto para cada una.</li>
                                    <li><strong>Balance Automático:</strong> Al escribir Parláre o Planeación, el sistema calcula Sesión para que coincida con el costo total.</li>
                                    <li><strong>Antes de Pagado / No pagado:</strong> La app muestra un <strong>resumen del desglose</strong> (Parláre, Sesión, Planeación) para que confirmes antes de escribir en Excel.</li>
                                    <li><strong>Corregir cita ya pagada</strong> (relevo Sam/Diana, etc.): abre la cita → <strong>Ajuste Manual</strong> (déjalo abierto) → pon Parláre / Sesión / Planeación → <strong>Guardar cita</strong> → vuelve a abrir → <strong>Marcar como No Pagado</strong> (confirma el resumen Excel) → <strong>Marcar como Pagado</strong> otra vez. No puedes pagar/des-pagar si cambiaste algo sin guardar antes.</li>
                                    <li><strong>Sin permiso de Excel del otro terapeuta:</strong> Sam puede <strong>Guardar cita</strong> con el Ajuste Manual; el pago queda en Parláre aunque Excel falle. Aparece <strong>pendiente de sync</strong> — <strong>Diana o Yari</strong> (botón naranja arriba) sincronizan con su cuenta Google, que sí tiene acceso a los archivos. Si hay planeación para otra terapeuta, al sincronizar Diana se crea también la fila de planeación en el Excel correspondiente.</li>
                                    <li><strong>Pendientes aunque sea «solo mi Excel» (ej. Vero):</strong> el pago de una cita de Vero va al <strong>Excel de Vero</strong>, no al de Diana. Si Google no abre el permiso o la cuenta elegida no puede editar ese archivo, el pago <strong>sí queda en la app</strong> y arriba sale el botón naranja «X pendientes». Diana o Yari lo tocan una vez para empujar las filas a <strong>App_Data</strong>. Vero no ve ese botón (solo admin/recepción).</li>
                                    <li><strong>Excel / App_Data:</strong> Al marcar pagado, va la cuota del <strong>perfil del paciente</strong> salvo que hayas guardado un ajuste manual distinto en esa cita.</li>
                                    <li><strong>Citas con datos viejos (250/400):</strong> Si el perfil dice $150 pero la cita mostraba $250, al abrirla ya verás $150/$500. Guarda la cita o marca pagado para limpiar Firestore/Excel.</li>
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
                                    <li><strong>Nuevo 9 jul — evaluaciones y cancelaciones:</strong> en la bitácora puedes ver <code>WHATSAPP_CANCEL_REASON</code> (motivo enfermedad/viaje/otro), <code>WHATSAPP_DIANA_SESSION</code> (Diana respondió Sí/No por celular) y <code>APPOINTMENT_CONFIRMED</code> con etapa si la cita era de evaluación.</li>
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
                                <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                                    <strong>Proceso de evaluación (9 jul):</strong> al crear paciente, elige <strong>Proceso de evaluación</strong> si tienes permiso (Diana o quien ella autorice en Equipo y permisos). Al agendar citas — varios huecos o recurrencia — Parláre etiqueta Entrevista → Evaluación → Entrega en orden de fecha.
                                </div>
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
                                    <p>¿El paciente vendrá todos los jueves (u otro día fijo)? Marca <strong>«Agendar sesiones recurrentes»</strong>. Elige <strong>cada semana</strong> o <strong>cada 2 semanas</strong> y cuántas sesiones (4, 8 o 12). El sistema crea todas de un solo golpe y te muestra cuáles huecos están libres u ocupados — si un horario ya tiene cita, verás <strong>el nombre</strong> de quién está ahí (Sam y Vero en su agenda pueden mover fechas y usar recurrencia igual que siempre).</p>
                                </div>
                                <div class="bg-blue-50 p-4 rounded-xl">
                                    <h4 class="font-bold text-blue-800 mb-1">🔄 Reagendado Automático</h4>
                                    <p>Si cancelas una cita, el sistema te preguntará si quieres reagendar. Si dices que sí, automáticamente te llevará a la <strong>siguiente semana</strong> en el mismo horario para que no tengas que buscar el día manualmente. Al reagendar una cita suelta <strong>no hace falta marcar recurrentes</strong>: Guardar crea solo ese nuevo horario.</p>
                                </div>
                                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 class="font-bold text-indigo-900 mb-1">📅 Agenda — vista Día / Semana</h4>
                                    <p class="mb-2">En la barra de la agenda (celular y computadora) verás <strong>Día</strong> y <strong>Semana</strong> junto al botón <strong>Hoy</strong>:</p>
                                    <ul class="list-disc ml-5 space-y-1">
                                        <li><strong>Día</strong> — Un solo día a la vez, con pestañas Lun–Sáb debajo del encabezado. Ideal para leer nombres completos y trabajar citas con detalle.</li>
                                        <li><strong>Semana</strong> — Los seis días laborables a la vez. En celular los nombres van abreviados (ej. <code>S·Pedro</code>); en computadora puedes desplazarte horizontalmente si hace falta.</li>
                                    </ul>
                                    <p class="text-xs text-indigo-800 mt-2 italic">En celular la columna de hora es más angosta. Si giras el teléfono (horizontal): barra <strong>Agenda · Pacientes · Más</strong> abajo; pacientes más estrechos; el día elegido se lee en el selector (ya no se pega encima de las citas al scrollear). Control Maestro / Corte / Google van en <strong>Más</strong>. En computadora usa <strong>Día</strong> cuando quieras un solo día.</p>
                                </div>
                                <div class="bg-violet-50 p-4 rounded-xl border border-violet-200">
                                    <h4 class="font-bold text-violet-900 mb-1">📋 Citas de evaluación en la agenda <span class="text-[10px] uppercase tracking-wider bg-violet-200 px-1.5 py-0.5 rounded">9 jul</span></h4>
                                    <ul class="list-disc ml-5 space-y-1.5 text-sm">
                                        <li>Al agendar un paciente en <strong>proceso de evaluación</strong>, cada cita guarda su etapa (Entrevista / Evaluación / Entrega).</li>
                                        <li>Si el horario ya está ocupado, el aviso muestra <strong>nombre + etapa</strong> de quien está ahí (no solo «ocupado»).</li>
                                        <li>En <strong>Google Calendar</strong> el título lleva la etapa delante del nombre del niño.</li>
                                        <li><strong>Diana:</strong> puedes marcar <strong>confirmada</strong> la asistencia desde la cita (botón ✓) o desde Control Maestro — queda registrado en bitácora.</li>
                                        <li><strong>Sam / Vero:</strong> pueden mover y reagendar citas de evaluación en su terapeuta como cualquier otra cita.</li>

                                    </ul>
                                </div>

                                <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                    <h4 class="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                                        <span>📥</span>
                                        <span>Exportar / Descargar citas a Excel (.xlsx)</span>
                                        <span class="text-[10px] uppercase tracking-wider bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold ml-auto">Nuevo</span>
                                    </h4>
                                    <p class="text-sm text-gray-700 mb-3">
                                        Permite descargar un archivo Excel con todas las citas de la semana que estás visualizando, ideal para imprimir, llevar control semanal o compartir información:
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                                        <div class="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                                            <p class="font-bold text-emerald-800 mb-1">💻 En Computadora (PC / Laptop):</p>
                                            <ol class="list-decimal ml-4 space-y-1 text-gray-600">
                                                <li>Navega a la semana deseada con las flechas <code>&lt;</code> y <code>&gt;</code> o <strong>Hoy</strong>.</li>
                                                <li>Selecciona en el menú si quieres <strong>Todas</strong> o una terapeuta en específico (<strong>Diana, Sam o Vero</strong>).</li>
                                                <li>Haz clic en el botón verde <strong>Excel</strong> junto a «Hoy» en la barra superior.</li>
                                                <li>El archivo se descargará directamente en tu carpeta de descargas.</li>
                                            </ol>
                                        </div>
                                        <div class="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                                            <p class="font-bold text-emerald-800 mb-1">📱 En Celular (iPhone / Android):</p>
                                            <ol class="list-decimal ml-4 space-y-1 text-gray-600">
                                                <li>Toca la pestaña <strong>Más</strong> en la barra inferior de navegación.</li>
                                                <li>Toca la opción <strong>Exportar Citas (Excel)</strong>.</li>
                                                <li>El archivo se guardará en los archivos o descargas de tu teléfono.</li>
                                            </ol>
                                        </div>
                                    </div>
                                    <div class="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs text-gray-700 space-y-1.5">
                                        <p class="font-bold text-emerald-900">✨ Lo que incluye el archivo generado:</p>
                                        <ul class="list-disc ml-4 space-y-1">
                                            <li><strong>Orden A–Z:</strong> Los pacientes ya vienen ordenados alfabéticamente por su nombre.</li>
                                            <li><strong>Filtros automáticos activados:</strong> La primera fila tiene las flechas de filtro de Excel para que puedas filtrar por día, hora, terapeuta o estado con un solo clic.</li>
                                            <li><strong>Columnas claras:</strong> Paciente, Día de la cita (ej. <em>Lunes, 19 oct. 2026</em>), Horario (ej. <em>10:00 a. m.</em>), Terapeuta asignada y Estado (<em>Pagada, Confirmada, Justificada, etc.</em>).</li>
                                            <li><strong>Hoja «Info»:</strong> Una segunda pestaña con los datos de fecha de generación, clínica y usuario.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </details>



                        <!-- Ev. Evaluaciones — guía equipo -->
                        <details class="group bg-violet-50 rounded-2xl border border-violet-200 shadow-md overflow-hidden transition-all">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none bg-white">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-violet-600 text-white rounded-lg flex items-center justify-center text-sm">Ev</span>
                                    Evaluaciones — guía para el equipo (9 jul)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-3 text-sm text-gray-700 space-y-4 animate-fade-in">
                                <p>Flujo para <strong>paciente nuevo en evaluación</strong> (no es lo mismo que terapia regular semanal):</p>
                                <ol class="list-decimal ml-5 space-y-2">
                                    <li><strong>Alta</strong> — Botón <strong>+</strong> en pacientes → <strong>Proceso de evaluación</strong> (Diana o quien tenga permiso en Equipo y permisos).</li>
                                    <li><strong>Agendar 3 citas</strong> (orden flexible: misma semana con urgencia o semanas aparte):
                                        <ul class="list-disc ml-5 mt-1 space-y-0.5 text-xs">
                                            <li>Etapa 1 — Entrevista</li>
                                            <li>Etapa 2 — Evaluación</li>
                                            <li>Etapa 3 — Entrega de resultados</li>
                                        </ul>
                                    </li>
                                    <li><strong>Recordatorios al papá</strong> — 8 AM y 8 PM el día anterior; el mensaje incluye la etapa. Botones: 1 Confirmar · 2 Cancelar · 3 Recepción.</li>
                                    <li><strong>Si cancela (botón 2)</strong> — llega segundo mensaje pidiendo motivo (enfermedad / viaje / otro). Yari ve alerta en Control Maestro.</li>
                                    <li><strong>Día de la sesión — Diana (celular ~9 PM)</strong> — si hubo evaluación hoy, el bot pregunta si se realizó. Si fue sesión de <strong>Evaluación</strong> y respondes Sí, puede preguntar si la próxima es otra evaluación o ya entrega de resultados.</li>
                                    <li><strong>Confirmación</strong> — El papá confirma por WhatsApp; Diana puede confirmar en la app; todo queda en bitácora con quién confirmó.</li>
                                </ol>
                                <div class="bg-white border border-violet-200 rounded-xl p-4 space-y-3">
                                    <h4 class="font-bold text-violet-900 text-sm">Quién hace qué</h4>
                                    <table class="w-full text-xs">
                                        <thead><tr class="text-left text-violet-700 border-b"><th class="pb-1 pr-2">Rol</th><th class="pb-1">Acción</th></tr></thead>
                                        <tbody class="divide-y">
                                            <tr><td class="py-1.5 pr-2 font-semibold">Diana</td><td>Alta evaluación, permisos equipo, confirmar en app/celular, bot 9 PM</td></tr>
                                            <tr><td class="py-1.5 pr-2 font-semibold">Yari</td><td>Agendar etapas, Control Maestro, WhatsApp manual si hoy sin confirmar, motivo cancelación</td></tr>
                                            <tr><td class="py-1.5 pr-2 font-semibold">Sam / Vero</td><td>Agenda propia: mover y recurrencia en citas de evaluación sin restricción extra</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p class="text-xs text-violet-800 italic">Las citas no se crean «con 2 h de anticipación» — se planean con normalidad; el aviso de 2 h en Control Maestro es solo para avisar al papá si aún no confirmó el día de la cita.</p>
                            </div>
                        </details>

                        <!-- P. Expediente — baja y eliminación -->
                        <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-rose-200">
                            <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
                                <h3 class="text-gray-800 font-bold flex items-center gap-3">
                                    <span class="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center text-sm">P</span>
                                    Expediente — baja y eliminación (Yari)
                                </h3>
                                <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div class="px-5 pb-5 pt-2 text-sm text-gray-600 space-y-3 animate-fade-in">
                                <p><strong>Yari (Recepción)</strong> y las administradoras pueden gestionar pacientes que ya no continúan:</p>
                                <ul class="list-disc ml-5 space-y-2">
                                    <li><strong>Dar de baja:</strong> desde el expediente → el paciente pasa a inactivos (no aparece en la lista principal). Solo cuando el niño <em>deja la clínica</em>, no para cambiar de horario.</li>
                                    <li><strong>Cambiar horario fijo (Sam/Vero/Diana/Yari):</strong> <span class="text-amber-800 font-semibold">no des de baja</span>. Cancela o elimina las citas futuras del horario viejo → abre el expediente → <strong>Agendar Ahora</strong> → elige el hueco nuevo → marca <strong>Semanal</strong> → confirma. En el toast debe decir la terapeuta correcta (ej. SAM). Recarga y mira el filtro de esa terapeuta.</li>
                                    <li><strong>Si reactivas un inactivo:</strong> la app te pregunta si quieres agendar el nuevo horario al momento.</li>
                                    <li><strong>Eliminar permanentemente:</strong> en la ficha o lista de inactivos — borra el perfil de Firestore. <strong>Irreversible.</strong> Usar solo si el expediente se creó por error o dirección lo autoriza.</li>
                                </ul>
                                <p class="text-xs bg-rose-50 border-l-4 border-rose-300 p-3 rounded text-rose-900">Las citas pasadas y pagos en Excel <strong>no se borran solos</strong> al eliminar el perfil. Si hay duda, consulta con Diana antes de eliminar permanentemente.</p>
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
                                    <li><strong>Equipo y permisos (solo Diana):</strong> Pestaña para activar o quitar permisos de Sam, Vero y Yari (agenda, pacientes, recepción). Los <strong>reportes de utilidad Parláre y el corte de caja</strong> siguen siendo solo tuyos.</li>
                                    <li><strong>Reportes Financieros Rápidos:</strong> Acceso rápido a los análisis de utilidad neta (solo administradora dueña).</li>
                                </ul>
                                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 class="font-bold text-indigo-900 mb-1">🏷️ Campos «SaaS Ready» (en gris)</h4>
                                    <p>Verás cédula profesional, institución de egreso y recibos de reembolso en gris con badge <strong>SaaS Ready</strong>. <strong>No está roto:</strong> el sistema ya guarda esos datos en la nube para cuando activen el módulo multi-clínica; Diana las habilitará desde administración.</p>
                                </div>
                            </div>
                        </details>

                        <!-- C. Crear Paciente -->
                        <details class="group bg-blue-50 rounded-2xl border border-blue-200 shadow-sm overflow-hidden transition-all">
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
                                        <p class="mb-2"><strong>Llenado:</strong> Ingresa nombre, elige terapeuta y pon el WhatsApp (10 dígitos). El sistema sugiere <strong>Costo</strong> y <strong>Cuota Parláre</strong> según la configuración del terapeuta — <em>puedes cambiarlas antes de guardar</em>. Esa cuota es la que verás en Excel (columna Parláre) cuando marquen la cita como pagada.</p>
                                        <p class="mb-2">En celular el formulario ocupa casi toda la pantalla: desliza hacia arriba para ver todos los campos; los botones <strong>Crear</strong> / <strong>Guardar</strong> quedan fijos abajo.</p>
                                        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-950">
                                            <p class="font-bold text-indigo-900 mb-1">Tipo de proceso <span class="text-[10px] uppercase tracking-wider bg-indigo-200 px-1.5 py-0.5 rounded">Nuevo 9 jul</span></p>
                                            <ul class="list-disc ml-5 space-y-1 text-sm">
                                                <li><strong>Paciente regular</strong> — terapia habitual (opción por defecto).</li>
                                                <li><strong>Proceso de evaluación</strong> — ciclo Entrevista → Evaluación → Entrega de resultados (paciente nuevo en evaluación).</li>
                                            </ul>
                                            <p class="text-xs mt-2 text-indigo-800">Solo lo ven <strong>Diana</strong> o quien ella autorice en <strong>Configuración → Equipo y permisos</strong> (permiso «Crear paciente en proceso de evaluación»). Sam y Vero no ven el selector si no tienen permiso.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
                                    <p><strong>Resultado:</strong> Al guardar, el paciente se añade a la lista y <strong>automáticamente</strong> se abre la ventana de horarios para agendar su primera sesión.</p>
                                </div>
                                <div class="flex items-start gap-4">
                                    <div class="w-6 h-6 rounded-full bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">4</div>
                                    <div>
                                        <p class="font-bold text-gray-800 mb-2">Si elegiste «Proceso de evaluación» — agendar las etapas</p>
                                        <p class="mb-2">Las citas se agendan con <strong>días o semanas de anticipación</strong> (no hace falta pedir sesión con 2 h de margen). Parláre etiqueta cada cita sola:</p>
                                        <ol class="list-decimal ml-5 space-y-1.5 mb-3">
                                            <li><strong>Entrevista</strong> — cita 1 de 3</li>
                                            <li><strong>Evaluación</strong> — cita 2 de 3</li>
                                            <li><strong>Entrega de resultados</strong> — cita 3 de 3</li>
                                        </ol>
                                        <p class="mb-2"><strong>Dos formas de agendar</strong> (elige la que encaje):</p>
                                        <ul class="list-disc ml-5 space-y-1.5 mb-3">
                                            <li><strong>Varios huecos a la vez:</strong> en la ventana que se abre al crear el paciente, marca varios horarios y confirma — cada uno lleva su etapa en orden de fecha.</li>
                                            <li><strong>Desde la agenda:</strong> abre el calendario, crea citas con recurrencia semanal/quincenal o una por una en días distintos (incluso varias en la misma semana si hay urgencia).</li>
                                        </ul>
                                        <p class="mb-2">Después puedes <strong>mover o editar</strong> citas como siempre. El título en Google Calendar incluye la etapa (ej. <em>Entrevista — cita 1 de 3 — Juan Pérez</em>).</p>
                                        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-950 text-xs space-y-2">
                                            <p><strong>Recordatorios al papá (8 AM y 8 PM):</strong> el WhatsApp incluye la etapa. Botones: <strong>1 Confirmar</strong>, <strong>2 Cancelar</strong>, <strong>3 Recepción</strong>.</p>
                                            <p><strong>Diana por celular (9 PM):</strong> si hubo sesión de evaluación hoy, el bot pregunta si se realizó (<em>Sí / No</em>). Tras una sesión de Evaluación, puede preguntar si la próxima es otra evaluación o entrega de resultados.</p>
                                            <p><strong>Yari — Control Maestro:</strong> las citas de <strong>hoy</strong> sin confirmar del papá aparecen en el banner «Hoy sin confirmar». Si faltan ≤2 h, la fila se pone rosa — ahí conviene WhatsApp manual.</p>
                                        </div>
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
                                    <li><strong>Confirmado por:</strong> Muestra quién confirmó — papá vía WhatsApp (<code>parent</code>), Diana desde app/celular (<code>diana</code>) o el sistema.</li>
                                    <li><strong>Cancelado por:</strong> Indica si fue WhatsApp del papá, staff o el robot. Si canceló por WhatsApp, busca también <code>WHATSAPP_CANCEL_REASON</code> para ver el motivo (enfermedad / viaje / otro).</li>
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
                                        <li>Verás la sección <strong>Justificante Médico</strong> (con fondo rojizo tenue).</li>
                                        <li>Activa la casilla <strong>Inasistencia Justificada (No cobrar)</strong>; esto se guardará de forma instantánea.</li>
                                        <li>Arrastra el justificante (imagen o PDF) o haz clic en la zona de subida (caja punteada) para subirlo directamente a Firebase Storage de forma gratuita.</li>
                                    </ul>
                                </div>
                                <div class="bg-indigo-50 p-4 rounded-xl space-y-1">
                                    <h4 class="font-bold text-indigo-800">🔍 Auditoría Visual Rápida:</h4>
                                    <p>Las citas justificadas se mostrarán en el historial del paciente con un distintivo esmeralda premium: <strong>«💚 Justificada»</strong> en lugar del botón rojo normal de cancelada, permitiendo ver a simple vista qué inasistencias no deben cobrarse.</p>
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
                                    <li><strong>Control Maestro</strong> — recepción/admin: pagos, confirmar asistencia, <strong>Hoy sin confirmar</strong> (9 jul), alertas opt-in y motivos de cancelación.</li>
                                    <li><strong>Corte de Caja / Reportes / Configuración</strong> — solo administradoras.</li>
                                    <li><strong>Bitácora de Auditoría</strong> — admin y recepción (historial de cambios y WhatsApp).</li>
                                    <li><strong>Manual de Usuario</strong> — esta guía.</li>
                                    <li><strong>Enviar Sugerencia</strong> — ideas para mejorar el sistema.</li>
                                </ul>
                                <p class="text-xs text-gray-500 mt-2">Al crear un paciente nuevo, si tienes permiso verás <strong>Paciente regular</strong> o <strong>Proceso de evaluación</strong>. Con evaluación, al agendar (varios huecos o recurrencia) Parláre asigna Entrevista → Evaluación → Entrega en orden de fecha.</p>
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
                                        <p class="mt-2 text-xs text-purple-700 italic">Si el papá confirma o cancela en cualquier momento, no recibirá el siguiente recordatorio. Si no responde ninguno, Yari y Diana lo ven al día siguiente.</p>
                                        <p class="mt-2 text-xs text-purple-800"><strong>Confirmación del papá:</strong> si responde <strong>1</strong> o pulsa Confirmar, en la bitácora queda <code>confirmedBy: parent</code> y la cita muestra ✅ en agenda.</p>
                                    </div>
                                    <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <h4 class="font-bold text-indigo-900 mb-1">📋 Recordatorios — proceso de evaluación <span class="text-[10px] uppercase tracking-wider bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded">Nuevo 9 jul</span></h4>
                                        <p class="mb-2">Cuando la cita es de <strong>evaluación</strong> (Entrevista, Evaluación o Entrega de resultados), el recordatorio de 8 AM / 8 PM incluye la <strong>etapa</strong> en el mensaje — por ejemplo: <em>«Esta sesión es: Entrevista — cita 1 de 3»</em>. Los botones son los mismos: <strong>1 Confirmar</strong>, <strong>2 Cancelar</strong>, <strong>3 Recepción</strong>.</p>
                                        <ul class="list-disc ml-5 space-y-1.5 text-sm">
                                            <li><strong>Yari:</strong> agenda las citas del proceso como siempre; cuando la cita tenga etapa registrada, el papá verá el texto especial en WhatsApp.</li>
                                            <li><strong>~2 horas antes sin confirmar:</strong> si el papá no respondió al recordatorio y faltan pocas horas, <strong>Yari manda mensaje manual</strong> por WhatsApp Business (regla operativa de siempre — el bot no envía un tercer recordatorio automático).</li>
                                            <li><strong>Diana (9:00 PM):</strong> si hubo sesión de evaluación hoy y no contestaste, el bot te escribe a tu celular con botones <strong>«Sí, se realizó»</strong> / <strong>«No, faltó»</strong>.</li>
                                            <li><strong>Diana (tras evaluación):</strong> después de marcar que sí se realizó una sesión de <strong>Evaluación</strong>, el bot puede preguntar si la próxima cita es <strong>otra evaluación</strong> o ya es <strong>entrega de resultados</strong> — responde con los botones; no hace falta escribir texto libre.</li>
                                        </ul>
                                        <p class="text-xs text-indigo-800 mt-2 italic">💡 Al dar de alta un paciente, elige <strong>Proceso de evaluación</strong> (si tienes permiso). Al agendar, cada cita se etiqueta sola y el recordatorio E1 incluye la etapa.</p>
                                    </div>
                                <div class="bg-cyan-50 p-4 rounded-xl border border-cyan-200">
                                    <h4 class="font-bold text-cyan-900 mb-1">❌ Cancelaciones con motivo <span class="text-[10px] uppercase tracking-wider bg-cyan-200 text-cyan-900 px-1.5 py-0.5 rounded">Nuevo 9 jul</span></h4>
                                    <p class="mb-2">Cuando un papá pulsa <strong>2 — Cancelar</strong> (o escribe cancelar) en el recordatorio:</p>
                                    <ol class="list-decimal ml-5 space-y-1.5 text-sm">
                                        <li>La cita se <strong>cancela en Parláre</strong>, Google Calendar y Excel — igual que antes.</li>
                                        <li><strong>Yari recibe alerta</strong> en Control Maestro (como siempre).</li>
                                        <li>Al papá le llega un <strong>segundo mensaje automático</strong> con la fecha/hora cancelada y tres botones:
                                            <ul class="list-disc ml-5 mt-1 space-y-0.5">
                                                <li><strong>Enfermedad</strong></li>
                                                <li><strong>Viaje o imprevisto</strong></li>
                                                <li><strong>Otro</strong> — el bot pide una línea de texto libre.</li>
                                            </ul>
                                        </li>
                                    </ol>
                                    <p class="mt-3 text-sm"><strong>Qué hacer tú (Yari):</strong></p>
                                    <ul class="list-disc ml-5 space-y-1 text-sm">
                                        <li>Si el papá <strong>elige un motivo</strong>, lo verás en la <strong>Bitácora</strong> (<code>WHATSAPP_CANCEL_REASON</code>). Coordina reagendar y pide justificante médico si aplica enfermedad.</li>
                                        <li>Si <strong>no responde</strong> al mensaje de motivo, la cancelación ya quedó hecha — usa la alerta de Control Maestro y contáctalo tú para reagendar (igual que antes).</li>
                                        <li><strong>No envíes</strong> otro mensaje de cancelación manual: el bot ya mandó la plantilla oficial.</li>
                                    </ul>
                                    <p class="text-xs text-cyan-800 mt-2 italic">Aplica a <strong>todos</strong> los pacientes (evaluación y terapia regular). En evaluación, la bitácora también guarda la etapa de la cita cancelada.</p>
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
                                         <br>• Cuando el paciente responde <strong>Sí, autorizo</strong>, el sistema <strong>activa la casilla automáticamente</strong> (<code>wantsWhatsapp = true</code>) y activa el bot.
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
                                <div class="bg-rose-50 p-4 rounded-xl border border-rose-200">
                                    <h4 class="font-bold text-rose-900 mb-2">📋 Hoy sin confirmar (papá) <span class="text-[10px] uppercase tracking-wider bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">9 jul</span></h4>
                                    <p class="mb-2">Las citas se agendan con <strong>días de anticipación</strong>; el aviso no es «sesión pedida hace 2 h». Control Maestro lista las citas de <strong>hoy</strong> que el papá aún no confirmó (recordatorio 8 AM / 8 PM).</p>
                                    <ul class="list-disc ml-5 space-y-1.5 text-sm">
                                        <li>Filtro <strong>Hoy sin confirmar</strong> y banner arriba de la tabla.</li>
                                        <li>Si además faltan <strong>≤2 h</strong>, la fila se pone rosa con más urgencia — ahí Yari manda WhatsApp manual.</li>
                                        <li>Botón verde WhatsApp en cada fila para contactar al papá.</li>
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
                                    <h4 class="font-bold text-rose-800 mb-1">⛔ Inhabilitar Hora <span class="text-[10px] uppercase tracking-wider bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">Actualizado 10 jul</span></h4>
                                    <p class="mb-2">¿Vas a salir a comer o tienes un compromiso? Elige <strong>Inhabilitar</strong> desde el modal de cita para que nadie pueda agendarte en ese espacio.</p>
                                    <ul class="list-disc pl-5 space-y-1 text-sm">
                                        <li>En <strong>Parláre</strong> solo se bloquea el día y la hora que eliges.</li>
                                        <li>En <strong>Google Calendar</strong> ahora también sale <strong>un solo evento</strong> en esa fecha — ya no se repite de lunes a sábado.</li>
                                        <li>Si ves bloques viejos en Google (misma hora todos los días): bórralos <strong>una vez</strong> como serie completa y pulsa <strong>Sincronizar</strong> en Parláre.</li>
                                        <li><strong>No bloquees en Google Calendar directo</strong> — usa siempre Parláre para que WhatsApp y pagos sigan al día.</li>
                                    </ul>
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
                    <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Parláre · Manual actualizado 9 jul 2026</p>
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
