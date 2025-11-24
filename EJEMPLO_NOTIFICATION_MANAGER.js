// EJEMPLO FUNCIONAL: NotificationManager
// Este es un ejemplo completo de cómo se vería un módulo migrado al enfoque híbrido

/**
 * NotificationState.js
 * Estado centralizado para notificaciones
 */
export const NotificationState = {
    notifications: [],
    unreadCount: 0,

    dom: {
        notificationBell: null,
        notificationBadge: null,
        notificationList: null,
        notificationItems: null
    },

    initDOM() {
        this.dom.notificationBell = document.getElementById('notificationBell');
        this.dom.notificationBadge = document.getElementById('notificationBadge');
        this.dom.notificationList = document.getElementById('notificationList');
        this.dom.notificationItems = document.getElementById('notificationItems');
    },

    addNotification(notification) {
        this.notifications.unshift(notification);
        if (!notification.read) {
            this.unreadCount++;
        }
    },

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
    }
};

/**
 * NotificationFilters.js
 * Lógica de filtrado de notificaciones
 */
export const NotificationFilters = {
    getUnread(notifications) {
        return notifications.filter(n => !n.read);
    },

    getByType(notifications, type) {
        return notifications.filter(n => n.type === type);
    },

    getRecent(notifications, hours = 24) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);
        return notifications.filter(n => new Date(n.timestamp) > cutoff);
    }
};

/**
 * NotificationUI.js
 * Renderizado de notificaciones
 */
export const NotificationUI = {
    render() {
        const { dom, notifications, unreadCount } = NotificationState;

        // Actualizar badge
        if (unreadCount > 0) {
            dom.notificationBadge.textContent = unreadCount;
            dom.notificationBadge.classList.remove('hidden');
        } else {
            dom.notificationBadge.classList.add('hidden');
        }

        // Renderizar lista
        if (notifications.length === 0) {
            dom.notificationItems.innerHTML = `
                <div class="p-4 text-center text-gray-400 text-sm">
                    No hay notificaciones
                </div>
            `;
            return;
        }

        dom.notificationItems.innerHTML = notifications.map(n => `
            <div class="p-3 hover:bg-gray-50 border-b border-gray-100 ${n.read ? '' : 'bg-blue-50'}">
                <div class="flex items-start gap-2">
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-800">${n.title}</div>
                        <div class="text-xs text-gray-600 mt-1">${n.message}</div>
                        <div class="text-xs text-gray-400 mt-1">${this._formatTime(n.timestamp)}</div>
                    </div>
                    ${!n.read ? '<div class="w-2 h-2 bg-blue-600 rounded-full"></div>' : ''}
                </div>
            </div>
        `).join('');
    },

    toggle() {
        NotificationState.dom.notificationList.classList.toggle('hidden');
    },

    setupEventListeners() {
        const { dom } = NotificationState;

        dom.notificationBell?.addEventListener('click', () => {
            this.toggle();
        });

        document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
            NotificationManager.actions.markAllAsRead();
        });
    },

    _formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes}m`;
        if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)}h`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
};

/**
 * NotificationActions.js
 * Acciones sobre notificaciones
 */
export const NotificationActions = {
    create(title, message, type = 'info') {
        const notification = {
            id: Date.now().toString(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };

        NotificationState.addNotification(notification);
        NotificationUI.render();

        console.log(`📢 Notificación: ${title}`);
    },

    markAsRead(notificationId) {
        const notification = NotificationState.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            NotificationState.unreadCount--;
            NotificationUI.render();
        }
    },

    markAllAsRead() {
        NotificationState.markAllAsRead();
        NotificationUI.render();
    },

    clear() {
        NotificationState.notifications = [];
        NotificationState.unreadCount = 0;
        NotificationUI.render();
    }
};

/**
 * NotificationManager.js
 * Punto de entrada principal
 */
export const NotificationManager = {
    state: NotificationState,
    filters: NotificationFilters,
    ui: NotificationUI,
    actions: NotificationActions,

    init() {
        console.log("🔔 Inicializando NotificationManager...");
        this.state.initDOM();
        this.ui.setupEventListeners();
        console.log("✅ NotificationManager inicializado");
    },

    // API pública
    api: {
        notify: (title, message, type) => NotificationActions.create(title, message, type),
        getUnreadCount: () => NotificationState.unreadCount,
        markAllRead: () => NotificationActions.markAllAsRead()
    }
};

// Exponer globalmente solo lo necesario
window.NotificationManager = NotificationManager;

/**
 * EJEMPLO DE USO:
 * 
 * // En app.js:
 * import { NotificationManager } from './managers/NotificationManager.js';
 * NotificationManager.init();
 * 
 * // Desde cualquier parte del código:
 * NotificationManager.api.notify(
 *     'Nuevo Paciente',
 *     'Juan Pérez ha sido agregado',
 *     'success'
 * );
 * 
 * // Desde HTML (si es necesario):
 * <button onclick="NotificationManager.api.markAllRead()">
 *     Marcar todas como leídas
 * </button>
 */
