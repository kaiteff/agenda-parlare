/**
 * ComponentManager.js
 * Director de orquesta para la inyección de componentes dinámicos.
 */
import { MainModals } from './MainModals.js';
import { PatientModalsHTML } from '../managers/patient/PatientModalsHTML.js';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';

export const ComponentManager = {
    async init() {
        console.group('🏗️ ComponentManager: Cargando UI...');
        
        const root = document.body;

        // 1. Inyectar Header
        Header.inject(root);

        // 2. Inyectar Sidebar
        Sidebar.inject(root);

        // 3. Inyectar Modales de Paciente (Historial, Nuevo Paciente, Inactivos)
        PatientModalsHTML.inject(root);

        // 4. Inyectar Modales Principales (Calendario, Reportes, Corte)
        MainModals.inject(root);

        // 3. Inyectar Overlay de Sidebar para Mobile (si no está en el HTML)
        this.injectMobileOverlay(root);

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
