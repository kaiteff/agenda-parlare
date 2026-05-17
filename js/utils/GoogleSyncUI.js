/**
 * GoogleSyncUI.js
 * Estado visual y acciones de Google Sync (header + menú Más móvil).
 */

import { GoogleAuthService } from '../services/google/GoogleAuthService.js';
import { GoogleCalendarService } from '../services/google/GoogleCalendarService.js';
import { CalendarState } from '../modules/calendar/CalendarState.js';
import { AuthManager } from '../managers/AuthManager.js';
import { ModalService } from './ModalService.js';
import { ToastService } from './ToastService.js';

const STATUS = {
    ok: {
        indicator: 'w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.55)]',
        headerIndicator: 'w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
        headerText: 'Google OK',
        subtext: 'Conectado · toca para sincronizar la semana',
        subtextClass: 'text-green-600',
        headerBtn:
            'hidden md:flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-green-200 bg-green-50 text-green-700'
    },
    warn: {
        indicator: 'w-3 h-3 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.5)]',
        headerIndicator: 'w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse',
        headerText: 'Reconectar Google',
        subtext: 'Sesión expirada · toca para reconectar',
        subtextClass: 'text-yellow-700',
        headerBtn:
            'hidden md:flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-yellow-200 bg-yellow-50 text-yellow-700 animate-pulse'
    },
    off: {
        indicator: 'w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.45)]',
        headerIndicator: 'w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse',
        headerText: 'Google Off',
        subtext: 'Sin conexión · toca para iniciar sesión',
        subtextClass: 'text-red-600',
        headerBtn:
            'hidden md:flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-red-200 bg-red-50 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]'
    }
};

function healthToKey(health) {
    if (health.isValid) return 'ok';
    if (health.hasToken) return 'warn';
    return 'off';
}

export const GoogleSyncUI = {
  _pollId: null,

  renderStatus() {
    const health = GoogleAuthService.getTokenHealth();
    const key = healthToKey(health);
    const style = STATUS[key];

    const headerBtn = document.getElementById('googleSyncBtn');
    const headerIndicator = document.getElementById('syncIndicator');
    const headerText = document.getElementById('syncStatusText');

    if (headerBtn) headerBtn.className = style.headerBtn;
    if (headerIndicator) headerIndicator.className = style.headerIndicator;
    if (headerText) headerText.textContent = style.headerText;

    const mobileIndicator = document.getElementById('mobileGoogleSyncIndicator');
    const mobileSubtext = document.getElementById('mobileGoogleSyncSubtext');
    const mobileRow = document.getElementById('mobileMoreGoogleSync');

    if (mobileIndicator) mobileIndicator.className = style.indicator;
    if (mobileSubtext) {
      mobileSubtext.textContent = style.subtext;
      mobileSubtext.className = `text-xs truncate ${style.subtextClass}`;
    }
    if (mobileRow) {
      mobileRow.setAttribute('aria-label', `Conexión Google Sync: ${style.headerText}`);
    }

    const forceSyncBtn = document.getElementById('forceSyncAllBtn');
    if (forceSyncBtn) {
      if (health.isValid && AuthManager.currentUser?.email === 'rodriguezd.danielrob@gmail.com') {
        forceSyncBtn.classList.remove('hidden');
      } else {
        forceSyncBtn.classList.add('hidden');
      }
    }
  },

  initPolling(intervalMs = 30000) {
    this.renderStatus();
    if (this._pollId) return;
    this._pollId = setInterval(() => this.renderStatus(), intervalMs);
  },

  async handleClick(triggerEl) {
    if (!triggerEl) return;

    const health = GoogleAuthService.getTokenHealth();

    try {
      if (health.isValid) {
        const confirmed = await ModalService.confirm(
          'Sincronización Total',
          '¿Deseas sincronizar todas las citas visibles en esta pantalla con tu Google Calendar?<br><small>(Esto creará los eventos que falten)</small>',
          'Sí, Sincronizar',
          'Cancelar'
        );

        if (confirmed) {
          triggerEl.disabled = true;
          triggerEl.classList.add('opacity-50', 'animate-pulse');

          await GoogleCalendarService.syncWeek(CalendarState.appointments);

          triggerEl.disabled = false;
          triggerEl.classList.remove('opacity-50', 'animate-pulse');
          ToastService.success('Semana sincronizada con Google Calendar.');
        }
      } else {
        await GoogleAuthService.ensureToken(true);
        this.renderStatus();
        ToastService.success('Google Calendar conectado. Toca de nuevo para sincronizar la semana.');
      }
    } catch (err) {
      console.error('Google Sync action failed:', err);
      ToastService.error('Error en la sincronización con Google.');
    } finally {
      this.renderStatus();
    }
  }
};
