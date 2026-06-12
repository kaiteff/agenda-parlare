/**
 * TimeManager.js
 * Gestor centralizado para el manejo de fechas y zonas horarias en Agenda Parláre.
 * Garantiza que siempre guardemos en Firestore como ISO Naive de México (YYYY-MM-DDTHH:mm).
 */

export const TimeManager = {
    /**
     * Convierte cualquier entrada (Date o String) al formato estándar de Firestore:
     * ISO Naive de México (YYYY-MM-DDTHH:mm) sin 'Z' ni offsets.
     */
    toFirestore(dateInput) {
        if (!dateInput) return "";
        const d = new Date(dateInput);
        
        // Obtenemos el tiempo local del navegador (que asumimos es México)
        // y lo convertimos a un string ISO sin la 'Z'
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    },

    /**
     * Convierte un string de Firestore a un objeto Date de JavaScript.
     * Maneja tanto formatos Naive como formatos UTC (con Z) para retrocompatibilidad.
     */
    fromDate(dateStr) {
        if (!dateStr) return new Date();
        // El constructor de Date en JS interpreta:
        // "2026-05-13T10:00" -> Local Time (Correcto para Naive)
        // "2026-05-13T10:00Z" -> UTC Time (Correcto para legacy)
        return new Date(dateStr);
    },

    /**
     * Formatea una fecha para mostrar en la UI (ej: "lunes, 13 de mayo")
     */
    formatDisplayDate(dateInput) {
        const d = this.fromDate(dateInput);
        return d.toLocaleDateString('es-MX', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    },

    /**
     * Formatea una hora para mostrar en la UI (ej: "12:00 PM")
     */
    formatDisplayTime(dateInput) {
        const d = this.fromDate(dateInput);
        return d.toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    }
};
