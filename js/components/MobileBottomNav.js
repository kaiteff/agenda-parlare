/**
 * MobileBottomNav.js
 * Barra de navegación inferior exclusiva para móvil (< md).
 */

import { AuthManager } from '../managers/AuthManager.js';
import { MobileNav } from '../utils/MobileNav.js';
import { ModalService } from '../utils/ModalService.js';
import { logoutUser } from '../firebase.js';

export const MobileBottomNav = {
    inject(container = document.getElementById('appContent')) {
        if (!container || document.getElementById('mainBottomNav')) return;

        const showReception = AuthManager.isAdmin() || AuthManager.currentUser?.role === 'receptionist';

        const nav = document.createElement('nav');
        nav.id = 'mainBottomNav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Navegación principal móvil');
        nav.className = 'md:hidden fixed bottom-0 inset-x-0 z-[70] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]';
        nav.innerHTML = `
            <div class="flex items-stretch h-full max-w-lg mx-auto px-1 pt-1">
                <button type="button" data-tab="agenda" class="bottom-nav-item is-active flex-1 flex flex-col items-center justify-center gap-0.5 touch-target touch-manipulation text-gray-500 transition-colors" aria-current="page" aria-label="Agenda">
                    <span class="bottom-nav-icon-wrap p-1.5 rounded-xl transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </span>
                    <span class="text-[10px] font-bold uppercase tracking-wide">Agenda</span>
                </button>
                <button type="button" data-tab="patients" class="bottom-nav-item flex-1 flex flex-col items-center justify-center gap-0.5 touch-target touch-manipulation text-gray-500 transition-colors" aria-label="Pacientes">
                    <span class="bottom-nav-icon-wrap p-1.5 rounded-xl transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </span>
                    <span class="text-[10px] font-bold uppercase tracking-wide">Pacientes</span>
                </button>
                <button type="button" data-tab="more" class="bottom-nav-item flex-1 flex flex-col items-center justify-center gap-0.5 touch-target touch-manipulation text-gray-500 transition-colors" aria-label="Más opciones">
                    <span class="bottom-nav-icon-wrap p-1.5 rounded-xl transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                    </span>
                    <span class="text-[10px] font-bold uppercase tracking-wide">Más</span>
                </button>
            </div>
        `;


        container.appendChild(nav);
        this._injectMoreSheet(container, showReception);
        console.log('✅ MobileBottomNav: Inyectado');
    },

    _injectMoreSheet(container, showReception) {
        if (document.getElementById('mobileMoreSheet')) return;

        const isAdmin = AuthManager.isAdmin();
        const items = [];

        if (isAdmin) {
            items.push({ id: 'mobileMoreCorte', label: 'Corte de Caja', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-emerald-600' });
            items.push({ id: 'mobileMoreReports', label: 'Reportes Financieros', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-blue-600' });
            items.push({ id: 'mobileMoreSettings', label: 'Configuración de Clínica', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-blue-600' });
        }

        if (showReception) {
            items.unshift({
                id: 'mobileMoreReception',
                label: 'Control Maestro',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
                color: 'text-indigo-600',
                highlight: true
            });
        }

        items.push(
            { id: 'mobileMoreHelp', label: 'Manual de Usuario', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'text-blue-500' },
            { id: 'mobileMoreSuggest', label: 'Enviar Sugerencia', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'text-orange-500' }
        );

        if (isAdmin) {
            items.push({ id: 'mobileMoreSupport', label: 'Bóveda de Soporte', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'text-purple-700' });
        }

        items.push({ id: 'mobileMoreLogout', label: 'Cerrar Sesión', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', color: 'text-red-600', danger: true });

        const googleSyncRow = `
            <button type="button" id="mobileMoreGoogleSync" class="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation border border-gray-100 bg-gradient-to-r from-slate-50 to-white mb-2">
                <span class="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <span id="mobileGoogleSyncIndicator" class="w-3 h-3 rounded-full bg-gray-400" aria-hidden="true"></span>
                </span>
                <span class="flex-1 text-left min-w-0">
                    <span class="text-sm font-bold text-gray-800 block">Conexión Google Sync</span>
                    <span id="mobileGoogleSyncSubtext" class="text-xs text-gray-500 truncate">Verificando…</span>
                </span>
                <svg class="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
        `;

        const listHtml = items.map((item) => `
            <button type="button" id="${item.id}" class="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${item.danger ? 'mt-2 border-t border-gray-100' : ''} ${item.highlight ? 'border border-indigo-100 bg-indigo-50/50' : ''}">
                <span class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center ${item.color}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg>
                </span>
                <span class="text-sm font-bold text-gray-800">${item.label}</span>
            </button>
        `).join('');

        const overlay = document.createElement('div');
        overlay.id = 'mobileMoreOverlay';
        overlay.className = 'hidden md:hidden fixed inset-0 z-[75] bg-black/40 backdrop-blur-[2px]';

        const sheet = document.createElement('div');
        sheet.id = 'mobileMoreSheet';
        sheet.className = 'hidden md:hidden fixed inset-x-0 bottom-0 z-[80] bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[70vh] overflow-hidden flex flex-col';

        sheet.innerHTML = `
            <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
                <span class="w-10 h-1 rounded-full bg-gray-200"></span>
            </div>
            <div class="px-4 pb-2 flex-shrink-0">
                <h3 class="text-lg font-bold text-gray-900">Más opciones</h3>
                <p class="text-xs text-gray-500">Accesos rápidos de la clínica</p>
            </div>
            <div class="flex-1 overflow-y-auto scroller px-3 pb-4 space-y-1">
                ${googleSyncRow}
                ${listHtml}
            </div>
        `;


        container.appendChild(overlay);
        container.appendChild(sheet);
    },

    init() {
        MobileNav.initGlobalHandlers();

        const nav = document.getElementById('mainBottomNav');
        if (!nav || this._initialized) return;
        this._initialized = true;

        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('.bottom-nav-item');
            if (!btn) return;

            const tab = btn.dataset.tab;
            switch (tab) {
                case 'agenda':
                    MobileNav.showAgenda();
                    break;
                case 'patients':
                    MobileNav.showPatients();
                    break;
                case 'more':
                    if (MobileNav.activeTab === 'more' && !document.getElementById('mobileMoreSheet')?.classList.contains('hidden')) {
                        MobileNav.closeMoreSheet();
                    } else {
                        MobileNav.openMoreSheet();
                    }
                    break;
                default:
                    break;
            }
        });

        this._bindMoreSheetActions();
    },

    _bindMoreSheetActions() {
        const sheet = document.getElementById('mobileMoreSheet');
        if (!sheet || sheet.dataset.actionsBound === '1') return;
        sheet.dataset.actionsBound = '1';

        sheet.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[id^="mobileMore"]');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            switch (btn.id) {
                case 'mobileMoreGoogleSync': {
                    const { GoogleSyncUI } = await import('../utils/GoogleSyncUI.js');
                    await GoogleSyncUI.handleClick(btn);
                    break;
                }
                case 'mobileMoreCorte':
                    MobileNav.closeMoreSheet();
                    (await import('../modules/reports/CorteDeCaja.js')).CorteDeCaja.open();
                    break;
                case 'mobileMoreReports':
                    MobileNav.closeMoreSheet();
                    document.getElementById('openReportsBtn')?.click();
                    break;
                case 'mobileMoreSettings':
                    MobileNav.closeMoreSheet();
                    (await import('../modules/admin/AdminSettingsModal.js')).AdminSettingsModal.open();
                    break;
                case 'mobileMoreReception':
                    MobileNav.openReception();
                    break;
                case 'mobileMoreHelp': {
                    const { HelpManual } = await import('../modules/help/HelpManual.js');
                    await HelpManual.open();
                    break;
                }
                case 'mobileMoreSuggest':
                    MobileNav.closeMoreSheet();
                    (await import('../modules/help/SuggestionsModal.js')).SuggestionsModal.open();
                    break;
                case 'mobileMoreSupport':
                    MobileNav.closeMoreSheet();
                    (await import('../modules/support/SupportVault.js')).SupportVault.open();
                    break;
                case 'mobileMoreLogout':
                    MobileNav.closeMoreSheet();
                    if (await ModalService.confirm('Cerrar Sesión', '¿Estás seguro que deseas salir?', 'Cerrar Sesión', 'Cancelar')) {
                        await logoutUser();
                    }
                    break;
                default:
                    break;
            }
        });
    }
};
