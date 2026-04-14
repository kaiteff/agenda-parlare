/**
 * ComponentManager.js
 * Director de orquesta para la inyección de componentes dinámicos.
 */
import { MainModals } from './MainModals.js';
import { PatientModalsHTML } from '../managers/patient/PatientModalsHTML.js';
import { Sidebar } from './Sidebar.js?v=1404';
import { Header } from './Header.js?v=1404';

export const ComponentManager = {
    async init() {
        console.group('🏗️ ComponentManager: Cargando UI...');
        
        const appContent = document.getElementById('appContent');
        const mainLayout = appContent ? appContent.querySelector('.flex-1.flex.overflow-hidden.relative') : null;

        if (!appContent || !mainLayout) {
            console.error('❌ No se encontraron los contenedores base en el DOM');
            return;
        }

        // 1. Inyectar Header (Al principio del appContent, arriba de todo)
        Header.inject(appContent);

        // 2. Inyectar Sidebar (Dentro del mainLayout, antes del <main>)
        Sidebar.inject(mainLayout);

        // 3. Inyectar Modales de Paciente (En la raíz de la App)
        PatientModalsHTML.inject(appContent);

        // 4. Inyectar Modales Principales (En la raíz de la App)
        MainModals.inject(appContent);

        // 5. Inyectar Overlay de Sidebar para Mobile
        this.injectMobileOverlay(appContent);

        console.log('✅ UI Dinámica lista.');
        console.groupEnd();
    },

    injectMobileOverlay(root) {
        if (document.getElementById('sidebarMobileOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'sidebarMobileOverlay';
        overlay.className = 'hidden fixed inset-0 bg-black bg-opacity-50 z-[40] md:hidden transition-opacity duration-300';
        root.appendChild(overlay);
    }
};
