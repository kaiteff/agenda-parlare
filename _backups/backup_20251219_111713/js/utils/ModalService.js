/**
 * ModalService.js
 * Servicio unificado para diálogos de sistema (Alertas y Confirmaciones)
 * Reemplaza los alert() y confirm() nativos con una UI premium.
 */

export const ModalService = {
    // Referencias DOM
    dom: {
        modal: null,
        title: null,
        message: null,
        confirmBtn: null,
        cancelBtn: null,
        icon: null
    },

    /**
     * Inicializa el servicio buscando los elementos en el DOM
     */
    init() {
        this.dom.modal = document.getElementById('genericModal');
        this.dom.title = document.getElementById('genericModalTitle');
        this.dom.message = document.getElementById('genericModalMessage');
        this.dom.confirmBtn = document.getElementById('genericModalConfirmBtn');
        this.dom.cancelBtn = document.getElementById('genericModalCancelBtn');
        this.dom.icon = document.getElementById('genericModalIcon');

        // Cerrar al hacer click fuera
        if (this.dom.modal) {
            this.dom.modal.onclick = (e) => {
                if (e.target === this.dom.modal) {
                    this._close(false);
                }
            };
        }
    },

    /**
     * Muestra una alerta (solo botón OK)
     * @param {string} title - Título del modal
     * @param {string} message - Mensaje del modal
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @returns {Promise<void>}
     */
    alert(title, message, type = 'info') {
        if (!this.dom.modal) this.init();
        if (!this.dom.modal) {
            // Fallback si no hay HTML
            window.alert(`${title}\n\n${message}`);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this._setupModal(title, message, type);

            // Configurar botones
            this.dom.confirmBtn.textContent = 'Entendido';
            this.dom.confirmBtn.classList.remove('hidden');
            this.dom.cancelBtn.classList.add('hidden');

            this.dom.confirmBtn.onclick = () => {
                this._close();
                resolve();
            };

            this._show();
        });
    },

    /**
     * Muestra una confirmación (OK / Cancelar)
     * @param {string} title - Título
     * @param {string} message - Mensaje
     * @param {string} confirmText - Texto botón confirmación
     * @param {string} cancelText - Texto botón cancelar
     * @param {string} type - 'warning', 'danger', 'info'
     * @returns {Promise<boolean>} true si el usuario aceptó
     */
    confirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning') {
        if (!this.dom.modal) this.init();
        if (!this.dom.modal) {
            return Promise.resolve(window.confirm(`${title}\n\n${message}`));
        }

        return new Promise((resolve) => {
            this._setupModal(title, message, type);

            // Configurar botones
            this.dom.confirmBtn.textContent = confirmText;
            this.dom.cancelBtn.textContent = cancelText;

            this.dom.confirmBtn.classList.remove('hidden');
            this.dom.cancelBtn.classList.remove('hidden');

            this.dom.confirmBtn.onclick = () => {
                this._close();
                resolve(true);
            };

            this.dom.cancelBtn.onclick = () => {
                this._close();
                resolve(false);
            };

            this._show();
        });
    },

    /**
     * Configura el contenido y estilo del modal
     * @private
     */
    _setupModal(title, message, type) {
        this.dom.title.textContent = title;
        this.dom.message.innerHTML = message.replace(/\n/g, '<br>'); // Permitir saltos de línea

        // Iconos y colores según tipo
        let iconSvg = '';
        let btnClass = '';

        switch (type) {
            case 'success':
                iconSvg = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
                btnClass = 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
                this.dom.icon.className = 'w-12 h-12 mx-auto mb-4 text-green-500 bg-green-100 rounded-full p-2';
                break;
            case 'error':
            case 'danger':
                iconSvg = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
                btnClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
                this.dom.icon.className = 'w-12 h-12 mx-auto mb-4 text-red-500 bg-red-100 rounded-full p-2';
                break;
            case 'warning':
                iconSvg = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
                btnClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white';
                this.dom.icon.className = 'w-12 h-12 mx-auto mb-4 text-yellow-500 bg-yellow-100 rounded-full p-2';
                break;
            default: // info
                iconSvg = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
                btnClass = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
                this.dom.icon.className = 'w-12 h-12 mx-auto mb-4 text-blue-500 bg-blue-100 rounded-full p-2';
        }

        this.dom.icon.innerHTML = `<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg>`;

        // Reset base classes for confirm button and apply new color
        this.dom.confirmBtn.className = `w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${btnClass}`;
    },

    _show() {
        this.dom.modal.classList.remove('hidden');
        // Pequeña animación
        const panel = this.dom.modal.querySelector('div[class*="bg-white"]');
        if (panel) {
            panel.classList.remove('opacity-0', 'scale-95');
            panel.classList.add('opacity-100', 'scale-100');
        }
    },

    _close() {
        this.dom.modal.classList.add('hidden');
        // Reset state
        this.dom.confirmBtn.onclick = null;
        this.dom.cancelBtn.onclick = null;
    }
};
