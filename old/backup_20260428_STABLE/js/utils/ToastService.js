/**
 * ToastService.js
 * Servicio para notificaciones efímeras (Toasts)
 */

export const ToastService = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(this.container);
        }
    },

    /**
     * Muestra un toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - Duración en ms (default 3000)
     */
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');

        // Colores e iconos según tipo
        let bgClass = 'bg-white';
        let borderClass = 'border-gray-200';
        let textClass = 'text-gray-800';
        let iconSvg = '';

        switch (type) {
            case 'success':
                bgClass = 'bg-green-50';
                borderClass = 'border-green-200';
                textClass = 'text-green-800';
                iconSvg = `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                break;
            case 'error':
                bgClass = 'bg-red-50';
                borderClass = 'border-red-200';
                textClass = 'text-red-800';
                iconSvg = `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                break;
            case 'warning':
                bgClass = 'bg-yellow-50';
                borderClass = 'border-yellow-200';
                textClass = 'text-yellow-800';
                iconSvg = `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
                break;
            default: // info
                bgClass = 'bg-blue-50';
                borderClass = 'border-blue-200';
                textClass = 'text-blue-800';
                iconSvg = `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        }

        toast.className = `
            pointer-events-auto flex items-start p-4 rounded-lg shadow-lg border ${borderClass} ${bgClass} ${textClass}
            transform transition-all duration-300 translate-x-full opacity-0 max-w-sm
        `;

        toast.innerHTML = `
            <div class="flex-shrink-0 mr-3 mt-0.5">
                ${iconSvg}
            </div>
            <div class="flex-1 text-sm font-medium">
                ${message}
            </div>
            <button class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

        this.container.appendChild(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Automatizar salida
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 300); // Esperar fin de transición
            }, duration);
        }
    },

    success(msg, duration) { this.show(msg, 'success', duration); },
    error(msg, duration) { this.show(msg, 'error', duration); },
    warning(msg, duration) { this.show(msg, 'warning', duration); },
    info(msg, duration) { this.show(msg, 'info', duration); }
};
