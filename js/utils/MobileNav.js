/**
 * MobileNav.js
 * Utilidades compartidas para navegación móvil (drawer, agenda, sheet "Más").
 */

export const MobileNav = {
    activeTab: 'agenda',

    getSidebar() {
        return document.getElementById('mainSidebar');
    },

    getOverlay() {
        return document.getElementById('sidebarOverlay');
    },

    isSidebarOpen() {
        const sidebar = this.getSidebar();
        return sidebar ? !sidebar.classList.contains('-translate-x-full') : false;
    },

    openSidebar() {
        const sidebar = this.getSidebar();
        const overlay = this.getOverlay();
        if (!sidebar || !overlay) return;

        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        overlay.style.setProperty('display', 'block', 'important');
    },

    closeSidebar() {
        const sidebar = this.getSidebar();
        const overlay = this.getOverlay();
        if (!sidebar || !overlay) return;

        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        overlay.classList.add('hidden');
        overlay.style.setProperty('display', 'none', 'important');
    },

    toggleSidebar() {
        if (this.isSidebarOpen()) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    },

    showAgenda() {
        this.closeMoreSheet();
        this.closeSidebar();
        this.setActiveTab('agenda');

        const main = document.querySelector('#appContent main');
        main?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    showPatients() {
        this.closeMoreSheet();
        this.setActiveTab('patients');
        this.openSidebar();
    },

    async openReception() {
        this.closeMoreSheet();
        this.closeSidebar();
        this.setActiveTab('reception');

        const btn = document.getElementById('openReceptionControlBtn');
        if (btn) {
            btn.click();
            return;
        }

        try {
            const { ReceptionControl } = await import('../modules/reception/ReceptionControl.js');
            if (typeof ReceptionControl.open === 'function') {
                ReceptionControl.open();
            }
        } catch (err) {
            console.error('No se pudo abrir Control de Recepción:', err);
        }
    },

    openMoreSheet() {
        this.closeSidebar();
        this.setActiveTab('more');

        const overlay = document.getElementById('mobileMoreOverlay');
        const sheet = document.getElementById('mobileMoreSheet');
        if (!overlay || !sheet) return;

        overlay.classList.remove('hidden');
        sheet.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        import('./GoogleSyncUI.js').then((m) => m.GoogleSyncUI.renderStatus());
    },

    closeMoreSheet() {
        const overlay = document.getElementById('mobileMoreOverlay');
        const sheet = document.getElementById('mobileMoreSheet');
        if (!overlay || !sheet) return;

        overlay.classList.add('hidden');
        sheet.classList.add('hidden');

        if (this.activeTab === 'more') {
            this.setActiveTab('agenda');
        }

        const eventModalOpen = document.getElementById('eventModal') && !document.getElementById('eventModal').classList.contains('hidden');
        if (!eventModalOpen) {
            document.body.classList.remove('overflow-hidden');
        }
    },

    setActiveTab(tabId) {
        this.activeTab = tabId;

        document.querySelectorAll('#mainBottomNav .bottom-nav-item').forEach((btn) => {
            const isActive = btn.dataset.tab === tabId;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    },

    initGlobalHandlers() {
        if (this._handlersReady) return;
        this._handlersReady = true;

        window.toggleSidebarMobile = () => this.toggleSidebar();

        document.addEventListener('click', (e) => {
            if (e.target.id === 'sidebarOverlay') {
                this.closeSidebar();
                if (this.activeTab === 'patients') {
                    this.setActiveTab('agenda');
                }
            }

            if (e.target.id === 'mobileMoreOverlay') {
                this.closeMoreSheet();
            }
        });
    }
};
