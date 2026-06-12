import { AuthManager } from '../managers/AuthManager.js';
import { PatientState } from '../managers/patient/PatientState.js';
import { PatientFilters } from '../managers/patient/PatientFilters.js';
import { ToastService } from '../utils/ToastService.js';
import { LoaderService } from '../utils/LoaderService.js';

export const WhatsAppDashboard = {
    render() {
        const sidebar = document.getElementById('mainSidebar');
        if (!sidebar) return;

        let container = document.getElementById('waDashboardContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'waDashboardContainer';
            container.className = 'px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 flex-shrink-0';

            const patientsHeader = document.getElementById('patientsHeader');
            if (patientsHeader) {
                patientsHeader.parentElement.insertBefore(container, patientsHeader.nextSibling);
            }
        }

        import('./Sidebar.js').then(({ Sidebar }) => {
            const viewToUse = Sidebar.activeTab === 'tomorrow' ? 'tomorrow' : 'today';
            const range = this._getDateRange(viewToUse);
            const stats = this._calculateStats(range);
            const periodLabel = viewToUse === 'today' ? 'hoy' : range.label.toLowerCase();

            container.classList.remove('hidden');
            container.innerHTML = `
                <div class="flex items-center justify-between mb-2 gap-2 min-w-0">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                        <span class="text-[10px] font-bold text-green-800 uppercase tracking-wider truncate">Confirmaciones (${periodLabel})</span>
                    </div>
                </div>
                
                ${stats.total === 0 && stats.cancelled === 0 ? `
                    <p class="text-[10px] text-green-700/80 text-center py-2 bg-white/50 rounded-lg border border-green-100">
                        Sin citas ${periodLabel} para este filtro de terapeuta.
                    </p>
                ` : `
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-white/60 rounded-lg p-2 border border-green-100 flex flex-col items-center">
                        <span class="text-lg font-black text-green-700">${stats.confirmed}</span>
                        <span class="text-[9px] text-green-600 font-bold uppercase">Listos</span>
                    </div>
                    <div class="bg-white/60 rounded-lg p-2 border border-orange-100 flex flex-col items-center">
                        <span class="text-lg font-black text-orange-600">${stats.pending}</span>
                        <span class="text-[9px] text-orange-500 font-bold uppercase">Pend.</span>
                    </div>
                    <div class="bg-white/60 rounded-lg p-2 border border-red-100 flex flex-col items-center cursor-pointer" title="${stats.cancelledNames.join('\\n') || 'Sin cancelados'}">
                        <span class="text-lg font-black text-red-500">${stats.cancelled}</span>
                        <span class="text-[9px] text-red-400 font-bold uppercase">Canc.</span>
                    </div>
                </div>
                
                ${stats.cancelled > 0 ? `
                    <div class="mt-2 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 max-h-28 overflow-y-auto scroller">
                        <p class="text-[9px] font-bold text-red-600 uppercase mb-1">❌ Cancelados ${periodLabel}:</p>
                        ${stats.cancelledApts.map(a => `
                            <div class="flex items-start justify-between gap-1 py-0.5 border-b border-red-100 last:border-0">
                                <span class="text-[10px] font-semibold text-red-800">${a.name?.split(' ').slice(0,2).join(' ') || '?'}</span>
                                <span class="text-[9px] text-red-500 shrink-0">
                                    ${this._formatStaffName(a.cancelledBy || a.updatedBy)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${viewToUse === 'tomorrow' && stats.pending > 0 ? `
                    <button type="button" id="sendManualRemindersBtn" class="w-full mt-2 py-1.5 text-[10px] bg-green-600 text-white rounded-md font-bold hover:bg-green-700 transition-colors shadow-sm touch-manipulation">
                        Re-enviar Recordatorios
                    </button>
                ` : ''}
                `}`;

            const btn = document.getElementById('sendManualRemindersBtn');
            if (btn) {
                btn.onclick = async () => {
                    const originalText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Enviando...';
                    LoaderService.show('Enviando recordatorios...');

                    try {
                        const response = await fetch('https://us-central1-taconotaco-d94fc.cloudfunctions.net/send_reminders_api?key=parlare_secret_2026', {
                            method: 'GET',
                            mode: 'cors',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json'
                            }
                        });
                        const result = await response.json();
                        LoaderService.hide();
                        ToastService.success(`Se enviaron ${result.sent || 0} recordatorios y se saltaron ${result.skipped || 0}.`);
                    } catch (err) {
                        LoaderService.hide();
                        console.error('Error enviando recordatorios:', err);
                        ToastService.error('Error al conectar con el servidor de WhatsApp.');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                };
            }
        }); // End of import.then
    },

    /**
     * Misma lógica de fechas que la pestaña «Mañana» / próxima sesión del sidebar.
     */
    _getDateRange(view) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        if (view === 'today') {
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return { start, end, label: 'Hoy', tabLabel: 'Mañana' };
        }

        const info = PatientFilters.getNextSessionInfo();
        const dayStart = new Date(info.date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const tabLabel = info.label.length <= 8 ? info.label : 'Próx.';
        return { start: dayStart, end: dayEnd, label: info.label, tabLabel };
    },
    
    _formatStaffName(id) {
        if (!id) return '—';
        if (id === 'WhatsApp' || id === 'Robot Parláre') return '🤖 WA';
        
        const clean = id.split('@')[0].toLowerCase();
        const mapping = {
            'yaritzajocgo': '👱‍♀️ Yari',
            'lopezcarpio7': '👩‍⚕️ Diana',
            'sammygtz90': '👩‍⚕️ Sammy',
            'sam': '👩‍⚕️ Sammy',
            'vero': '👩‍⚕️ Vero',
            'daniel': '👨‍💻 Daniel'
        };
        
        return mapping[clean] || `🧑 ${clean}`;
    },

    _calculateStats(range) {
        const { start, end } = range;
        const currentTherapist = AuthManager.getSelectedTherapist();
        const appointments = PatientState.appointments || [];
        
        const targetApts = appointments.filter(a => {
            const aptDate = new Date(a.date);
            const isMatch = aptDate >= start && aptDate < end;
            const matchesTherapist = currentTherapist === 'all' || (a.therapist || 'diana') === currentTherapist;
            
            const normalize = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normName = normalize(a.name);
            const isBlock = a.name?.startsWith('⛔') || 
                            normName.includes('dia inhabil') || 
                            normName.includes('hora inhabil') ||
                            a.isFullDayBlock || 
                            a.isHourlyBlock;

            return isMatch && matchesTherapist && !a.isCancelled && !isBlock;
        });

        const cancelledApts = appointments.filter(a => {
             const aptDate = new Date(a.date);
             const isMatch = aptDate >= start && aptDate < end;
             return isMatch && a.isCancelled && (currentTherapist === 'all' || (a.therapist || 'diana') === currentTherapist);
        });

        return {
            total: targetApts.length,
            confirmed: targetApts.filter(a => a.confirmed).length,
            pending: targetApts.filter(a => !a.confirmed).length,
            cancelled: cancelledApts.length,
            cancelledApts,
            cancelledNames: cancelledApts.map(a => a.name || '?')
        };
    }
};
