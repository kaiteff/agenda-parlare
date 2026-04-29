/**
 * WhatsAppDashboard.js
 * Visualización del estado de confirmaciones en el dashboard principal
 */

import { CalendarState } from '../modules/calendar/CalendarState.js';
import { AuthManager } from '../managers/AuthManager.js';

export const WhatsAppDashboard = {
    render() {
        const sidebar = document.getElementById('mainSidebar');
        if (!sidebar) return;

        // Buscar o crear contenedor
        let container = document.getElementById('waDashboardContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'waDashboardContainer';
            container.className = 'px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100';
            
            const patientsHeader = document.getElementById('patientsHeader');
            if (patientsHeader) {
                patientsHeader.parentElement.insertBefore(container, patientsHeader.nextSibling);
            }
        }

        const stats = this._calculateStats();
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-xs font-bold text-green-800 uppercase tracking-wider">Confirmaciones Mañana</span>
                </div>
                <span class="text-[10px] text-green-600 font-medium">${new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
                <div class="bg-white/60 rounded-lg p-2 border border-green-100 flex flex-col items-center">
                    <span class="text-lg font-black text-green-700">${stats.confirmed}</span>
                    <span class="text-[9px] text-green-600 font-bold uppercase">Listos</span>
                </div>
                <div class="bg-white/60 rounded-lg p-2 border border-orange-100 flex flex-col items-center">
                    <span class="text-lg font-black text-orange-600">${stats.pending}</span>
                    <span class="text-[9px] text-orange-500 font-bold uppercase">Pend.</span>
                </div>
                <div class="bg-white/60 rounded-lg p-2 border border-red-100 flex flex-col items-center cursor-pointer" title="${stats.cancelledNames.join('\n') || 'Sin cancelados'}">
                    <span class="text-lg font-black text-red-500">${stats.cancelled}</span>
                    <span class="text-[9px] text-red-400 font-bold uppercase">Canc.</span>
                </div>
            </div>
            
            ${stats.cancelled > 0 ? `
                <div class="mt-2 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                    <p class="text-[9px] font-bold text-red-600 uppercase mb-1">❌ Cancelados mañana:</p>
                    ${stats.cancelledApts.map(a => `
                        <div class="flex items-start justify-between gap-1 py-0.5 border-b border-red-100 last:border-0">
                            <span class="text-[10px] font-semibold text-red-800">${a.name?.split(' ').slice(0,2).join(' ') || '?'}</span>
                            <span class="text-[9px] text-red-500 shrink-0">${a.cancelledBy ? '🤖 WA' : a.updatedBy ? a.updatedBy.split('@')[0] : '—'}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${stats.pending > 0 ? `
                <button id="sendManualRemindersBtn" class="w-full mt-2 py-1 text-[10px] bg-green-600 text-white rounded-md font-bold hover:bg-green-700 transition-colors shadow-sm">
                    Re-enviar Recordatorios
                </button>
            ` : ''}
        `;

        if (stats.total === 0) {
            container.classList.add('hidden');
        } else {
            container.classList.remove('hidden');
            
            // Listener para re-enviar
            const btn = document.getElementById('sendManualRemindersBtn');
            if (btn) {
                btn.onclick = async () => {
                    const originalText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = "Enviando...";
                    
                    try {
                        // Conectar con el servidor oficial en Render con parámetros de compatibilidad
                        const response = await fetch('https://parlare-webhook.onrender.com/cron/reminders?key=parlare_secret_2026', {
                            method: 'GET',
                            mode: 'cors',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        });
                        const result = await response.json();
                        alert(`Resultado: Se procesaron ${result.results.length} citas.`);
                    } catch (err) {
                        console.error("Error enviando recordatorios:", err);
                        alert("Error al conectar con el servidor de WhatsApp.");
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                };
            }
        }
    },

    _calculateStats() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const currentTherapist = AuthManager.getSelectedTherapist();

        // Helper robusto: acepta string ISO y Firestore Timestamp
        const getDateStr = (d) => {
            if (!d) return '';
            if (typeof d === 'string') return d.split('T')[0];
            if (d.toDate) return d.toDate().toISOString().split('T')[0]; // Firestore Timestamp
            if (d instanceof Date) return d.toISOString().split('T')[0];
            return '';
        };
        
        const tomorrowsApts = CalendarState.appointments.filter(a => {
            const dateStr = getDateStr(a.date);
            const isTomorrow = dateStr === tomorrowStr;
            const matchesTherapist = currentTherapist === 'all' || (a.therapist || 'diana') === currentTherapist;
            
            // EXCLUIR BLOQUES (No son pacientes reales)
            const normalize = (s) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normName = normalize(a.name);
            const isBlock = a.name?.startsWith('⛔') || 
                            normName.includes('dia inhabil') || 
                            normName.includes('hora inhabil') ||
                            a.isFullDayBlock || 
                            a.isHourlyBlock;

            return isTomorrow && matchesTherapist && !a.isCancelled && !isBlock;
        });

        // Contar canceladas de mañana específicamente
        const cancelledApts = CalendarState.appointments.filter(a => {
             const dateStr = getDateStr(a.date);
             return dateStr === tomorrowStr && a.isCancelled && (currentTherapist === 'all' || (a.therapist || 'diana') === currentTherapist);
        });

        return {
            total: tomorrowsApts.length,
            confirmed: tomorrowsApts.filter(a => a.confirmed).length,
            pending: tomorrowsApts.filter(a => !a.confirmed).length,
            cancelled: cancelledApts.length,
            cancelledApts: cancelledApts,
            cancelledNames: cancelledApts.map(a => a.name || '?')
        };
    }
};
