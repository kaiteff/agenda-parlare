/**
 * AuditPanel.js
 * Visualización de la bitácora de auditoría para Administradores
 */

import { db, collection, query, orderBy, limit, getDocs, where } from '../../firebase.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { AuditService } from '../../services/AuditService.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';

export const AuditPanel = {
    activeTab: 'general',

    async export() {
        if (!AuthManager.isAdmin()) return;
        const btn = document.getElementById('exportAuditBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Exportando...';
        }

        const result = await AuditService.exportToSheets();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Exportar a Excel`;
        }

        if (result.success) {
            ToastService.success(result.msg);
        } else {
            ToastService.error('Error al exportar: ' + result.msg);
        }
    },
    async cleanup() {
        if (!AuthManager.isAdmin()) return;
        
        const confirmed = await ModalService.confirm(
            '⚠️ ¿Limpiar Registros Antiguos?',
            'Se eliminarán de la App los registros de más de 60 días.<br><br><strong>Recomendación:</strong> Asegúrate de haber exportado a Excel primero si necesitas conservarlos por años.',
            'Limpiar App',
            'Cancelar'
        );

        if (!confirmed) return;

        const btn = document.getElementById('cleanupAuditBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Limpiando...';
        }

        const result = await AuditService.cleanupOldLogs(60);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Limpiar Antiguos (60+ días)`;
        }

        if (result.success) {
            ToastService.success(result.msg);
            this.open(); // Refresh list
        } else {
            ToastService.error('Error al limpiar: ' + result.msg);
        }
    },
    async open() {
        if (!AuthManager.isAdmin() && AuthManager.currentUser?.role !== 'receptionist') {
            console.warn('🚫 AuditPanel: Acceso denegado.');
            return;
        }

        const modal = document.getElementById('auditLogModal');
        const list = document.getElementById('auditLogList');
        const tabContainer = document.getElementById('auditTabs');
        
        if (modal) modal.classList.remove('hidden');
        if (list) list.innerHTML = '<div class="text-center py-10 text-gray-400 italic animate-pulse">Consultando historial...</div>';

        // Setup tab listeners only once
        if (tabContainer && !tabContainer._listenersAttached) {
            tabContainer._listenersAttached = true;
            tabContainer.onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                this.activeTab = btn.dataset.tab;
                
                // Update UI
                tabContainer.querySelectorAll('button').forEach(b => {
                    b.classList.remove('text-blue-600', 'border-blue-600');
                    b.classList.add('text-gray-400', 'border-transparent');
                });
                btn.classList.add('text-blue-600', 'border-blue-600');
                btn.classList.remove('text-gray-400', 'border-transparent');
                
                this.open(); // Re-render with filter
            };
        }

        try {
            const logsRef = collection(db, 'audit_logs');
            
            // Para evitar pedir un Índice Compuesto en Firebase (que tarda en crearse),
            // traemos los últimos 100 y filtramos en memoria.
            const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
            const querySnapshot = await getDocs(q);

            list.innerHTML = '';
            
            // Ocultar botones de acción si no es admin
            const exportBtn = document.getElementById('exportAuditBtn');
            const cleanupBtn = document.getElementById('cleanupAuditBtn');
            const isAdmin = AuthManager.isAdmin();
            
            if (exportBtn) exportBtn.classList.toggle('hidden', !isAdmin);
            if (cleanupBtn) cleanupBtn.classList.toggle('hidden', !isAdmin);

            if (querySnapshot.empty) {
                list.innerHTML = `<div class="text-center py-10 text-gray-400">No hay registros de actividad aún.</div>`;
                return;
            }

            let count = 0;
            querySnapshot.forEach((doc) => {
                const log = doc.data();
                
                // Filtrado manual en memoria
                if (this.activeTab === 'whatsapp') {
                    if (log.action !== 'WHATSAPP_REMINDER') return;
                } else {
                    if (log.action === 'WHATSAPP_REMINDER') return;
                }

                if (count >= 50) return; // Limitar visualmente
                
                const card = this.createLogCard(log);
                list.appendChild(card);
                count++;
            });

            if (count === 0) {
                list.innerHTML = `<div class="text-center py-10 text-gray-400">No hay registros de ${this.activeTab === 'whatsapp' ? 'mensajes' : 'actividad'} recientes en esta categoría.</div>`;
            }

        } catch (error) {
            console.error('❌ Error cargando logs:', error);
            if (list) list.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-lg text-sm">Error al cargar bitácora: ${error.message}</div>`;
        }
    },

    createLogCard(log) {
        const div = document.createElement('div');
        div.className = "bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 items-start transition-all hover:shadow-md";

        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const timeStr = date.toLocaleString('es-MX', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
        });

        const iconConfig = this.getIcon(log.action);

        div.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 ${iconConfig.bg} ${iconConfig.text} rounded-lg flex items-center justify-center">
                ${iconConfig.icon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">${log.action}</span>
                    <span class="text-[10px] text-gray-400">${timeStr}</span>
                </div>
                <p class="text-xs text-gray-700 font-medium">
                    <span class="font-bold text-gray-900">${log.userName}</span> 
                    ${this.getActionText(log)}
                </p>
                ${log.details?.patientName ? `<p class="text-[10px] text-indigo-600 font-semibold mt-1">🏷️ Paciente: ${log.details.patientName}</p>` : ''}
                ${log.details?.therapist ? `<p class="text-[10px] text-gray-500 italic">Agenda: ${log.details.therapist}</p>` : ''}
                ${log.details?.appointmentDate ? (() => {
                    try {
                        const dateParts = log.details.appointmentDate.split('T');
                        if (dateParts.length === 2) {
                            const [dateStr, timeStr] = dateParts;
                            const [year, month, day] = dateStr.split('-');
                            const [hour, minute] = timeStr.split(':');
                            
                            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                            const mesNombre = meses[parseInt(month, 10) - 1] || 'mes';
                            
                            let hr = parseInt(hour, 10);
                            const ampm = hr >= 12 ? 'p.m.' : 'a.m.';
                            hr = hr % 12;
                            if (hr === 0) hr = 12;
                            const minStr = minute.padStart(2, '0');
                            
                            const formatted = `${day}/${mesNombre} a las ${hr}:${minStr} ${ampm}`;
                            return `<p class="text-[10px] text-gray-600 mt-0.5">📅 Cita enviada: <span class="font-bold text-gray-800">${formatted}</span></p>`;
                        }
                        return `<p class="text-[10px] text-gray-600 mt-0.5">📅 Cita enviada: ${log.details.appointmentDate}</p>`;
                    } catch(e) {
                        return `<p class="text-[10px] text-gray-600 mt-0.5">📅 Cita enviada: ${log.details.appointmentDate}</p>`;
                    }
                })() : ''}
                
                ${log.action === 'WHATSAPP_REMINDER' && log.details?.message ? `
                    <button 
                        onclick="this.nextElementSibling.classList.toggle('hidden')" 
                        class="mt-2 text-[9px] text-green-600 hover:text-green-700 font-bold flex items-center gap-0.5 cursor-pointer focus:outline-none"
                    >
                        💬 Ver mensaje completo
                    </button>
                    <div class="hidden mt-1.5 p-2 bg-green-50 border border-green-100 rounded-lg text-[10px] text-green-800 whitespace-pre-wrap font-mono leading-tight">
                        ${log.details.message}
                    </div>
                ` : ''}
            </div>
        `;

        return div;
    },

    getIcon(action) {
        switch(action) {
            case 'CREATE': return { bg: 'bg-green-100', text: 'text-green-600', icon: '✚' };
            case 'UPDATE': return { bg: 'bg-blue-100', text: 'text-blue-600', icon: '✎' };
            case 'DELETE_PERMANENT': return { bg: 'bg-red-100', text: 'text-red-600', icon: '🗑' };
            case 'CANCEL': return { bg: 'bg-orange-100', text: 'text-orange-600', icon: '✕' };
            case 'PAYMENT': return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: '💰' };
            case 'WHATSAPP_REMINDER': return { bg: 'bg-green-100', text: 'text-green-600', icon: '📱' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '•' };
        }
    },

    getActionText(log) {
        switch(log.action) {
            case 'CREATE': return 'agendó una nueva cita';
            case 'UPDATE': return `modificó una cita (${log.details?.changes?.join(', ') || 'campos'})`;
            case 'DELETE_PERMANENT': return 'eliminó permanentemente un registro';
            case 'CANCEL': return 'canceló una cita';
            case 'PAYMENT': return log.details?.isPaid ? 'marcó como PAGADA una cita' : 'quitó el estado de pagado';
            case 'WHATSAPP_REMINDER': return 'envió recordatorio automático por WhatsApp';
            default: return 'realizó una acción';
        }
    }
};
