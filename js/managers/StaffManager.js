/**
 * StaffManager.js
 * Gestiona la carga y acceso a la lista dinámica de terapeutas y personal de la clínica.
 */

import { db, collection, getDocs } from '../firebase.js';

export const StaffManager = {
    therapists: [],
    initialized: false,

    /**
     * Carga la lista de terapeutas desde la colección 'users'.
     * Retorna un arreglo de objetos { id, name }.
     */
    async loadTherapists() {
        if (this.initialized) return this.therapists;

        try {
            console.log("👥 StaffManager: Cargando terapeutas dinámicos...");
            const snap = await getDocs(collection(db, 'users'));
            const users = snap.docs.map(d => d.data());
            
            // Filtrar usuarios que tienen un 'therapist' ID válido (distinto de 'all' o nulo)
            const validTherapists = users
                .filter(u => u.therapist && u.therapist !== 'all' && u.therapist.trim() !== '')
                .map(u => ({
                    id: u.therapist.toLowerCase(),
                    name: u.displayName || u.therapist
                }));
            
            // Eliminar duplicados en caso de que varios usuarios apunten al mismo ID de terapeuta
            const unique = [];
            const seen = new Set();
            for (const t of validTherapists) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    unique.push(t);
                }
            }
            
            this.therapists = unique;

            // Si por alguna razón la base de datos está vacía, ponemos los defaults
            if (this.therapists.length === 0) {
                this.therapists = [
                    { id: 'diana', name: 'Diana' },
                    { id: 'sam', name: 'Sam' },
                    { id: 'vero', name: 'Vero' }
                ];
            }

            this.initialized = true;
            console.log("👥 StaffManager: Terapeutas cargados", this.therapists);
            return this.therapists;
            
        } catch (error) {
            console.error("❌ StaffManager Error cargando terapeutas:", error);
            // Fallback en caso de error
            this.therapists = [
                { id: 'diana', name: 'Diana' },
                { id: 'sam', name: 'Sam' },
                { id: 'vero', name: 'Vero' }
            ];
            this.initialized = true;
            return this.therapists;
        }
    },

    /**
     * Obtiene la lista actual de terapeutas. 
     * Asegúrate de haber llamado a loadTherapists() previamente (usualmente en app.js).
     */
    getTherapists() {
        return this.therapists;
    },

    /**
     * Devuelve el nombre "bonito" de una terapeuta dado su ID.
     */
    getTherapistName(id) {
        if (!id) return '';
        const t = this.therapists.find(t => t.id === id.toLowerCase());
        if (t) return t.name;
        // Si no se encuentra, capitalizar el ID (Ej: 'laura' -> 'Laura')
        return id.charAt(0).toUpperCase() + id.slice(1);
    },

    /**
     * Genera las etiquetas <option> en HTML para un <select>.
     * @param {string} selectedId - ID del terapeuta a seleccionar por defecto.
     * @param {boolean} includeAll - Si debe incluir la opción "Todas" (value="all").
     * @param {string} allLabel - Etiqueta para la opción de Todas (default "Todas").
     */
    generateOptionsHtml(selectedId = '', includeAll = false, allLabel = 'Todas') {
        let html = '';
        this.therapists.forEach(t => {
            const selected = (selectedId === t.id) ? 'selected' : '';
            html += `<option value="${t.id}" ${selected}>${t.name}</option>`;
        });
        
        if (includeAll) {
            const selectedAll = (selectedId === 'all') ? 'selected' : '';
            html += `<option value="all" ${selectedAll}>${allLabel}</option>`;
        }
        
        return html;
    }
};
