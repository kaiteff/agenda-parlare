/**
 * AuditPanel.js
 * Visualización de la bitácora de auditoría para Administradores
 */

import { db, collection, query, orderBy, limit, getDocs } from '../../firebase.js';
import { AuthManager } from '../../managers/AuthManager.js';
import { AuditService } from '../../services/AuditService.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';

export const AuditPanel = {
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
        if (!AuthManager.isAdmin()) {
            console.warn('🚫 AuditPanel: Acceso denegado.');
            return;
        }

        const modal = document.getElementById('auditLogModal');
        const list = document.getElementById('auditLogList');
        
        if (modal) modal.classList.remove('hidden');
        if (list) list.innerHTML = '<div class="text-center py-10 text-gray-400 italic animate-pulse">Consultando historial...</div>';

        try {
            const logsRef = collection(db, 'audit_logs');
            const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
            const querySnapshot = await getDocs(q);

            list.innerHTML = '';

            if (querySnapshot.empty) {
                list.innerHTML = '<div class="text-center py-10 text-gray-400">No hay registros de actividad aún.</div>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const log = doc.data();
                const card = this.createLogCard(log);
                list.appendChild(card);
            });

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
            default: return 'realizó una acción';
        }
    }
};
