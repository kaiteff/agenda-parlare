/**
 * LoaderService.js
 * Gestiona el Spinner de carga global
 */

export const LoaderService = {
    overlay: null,

    init() {
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'global-loader';
            this.overlay.className = 'fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300 opacity-0 pointer-events-none';
            
            this.overlay.innerHTML = `
                <div class="relative">
                    <!-- Outer Ring -->
                    <div class="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                    <!-- Spinning Ring -->
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p id="loader-message" class="mt-4 text-sm font-bold text-gray-700 uppercase tracking-widest">Procesando...</p>
            `;
            
            document.body.appendChild(this.overlay);
        }
    },

    show(message = 'Procesando...') {
        if (!this.overlay) this.init();
        
        const msgEl = document.getElementById('loader-message');
        if (msgEl) msgEl.textContent = message;
        
        this.overlay.classList.remove('pointer-events-none', 'opacity-0');
        this.overlay.classList.add('opacity-100');
    },

    hide() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('opacity-100');
        this.overlay.classList.add('opacity-0');
        
        setTimeout(() => {
            this.overlay.classList.add('pointer-events-none');
        }, 300);
    }
};
