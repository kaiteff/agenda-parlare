// dateUtils.js - Utilidades para manejo de fechas
// Funciones reutilizables para operaciones con fechas en toda la aplicación

/**
 * Obtiene el inicio de la semana (lunes) para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Fecha del lunes de esa semana a las 00:00:00
 */
export function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const hour = d.getHours();

    // Si es sábado (6) después de las 4pm (16:00), saltar a la siguiente semana
    if (day === 6 && hour >= 16) {
        // Avanzar al lunes siguiente
        const diff = d.getDate() + 2; // Sábado + 2 días = Lunes
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Agrega días a una fecha
 * @param {Date} date - Fecha base
 * @param {number} days - Número de días a agregar (puede ser negativo)
 * @returns {Date} - Nueva fecha con los días agregados
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formatea una fecha en formato YYYY-MM-DD
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
export function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calcula el número de semana ISO 8601 para una fecha
 * @param {Date} date - Fecha de referencia
 * @returns {number} - Número de semana (1-53)
 */
export function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Verifica si una fecha es hoy
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} - true si es hoy
 */
export function isToday(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
}

/**
 * Verifica si dos fechas están en la misma semana
 * @param {Date} date1 - Primera fecha
 * @param {Date} date2 - Segunda fecha
 * @returns {boolean} - true si están en la misma semana
 */
export function isSameWeek(date1, date2) {
    const week1Start = getStartOfWeek(date1);
    const week2Start = getStartOfWeek(date2);
    return week1Start.getTime() === week2Start.getTime();
}

/**
 * Obtiene el final de la semana (domingo) para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Fecha del domingo de esa semana a las 23:59:59
 */
export function getEndOfWeek(date) {
    const start = getStartOfWeek(date);
    const end = addDays(start, 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Obtiene el día de la semana en español
 * @param {Date} date - Fecha de referencia
 * @returns {string} - Nombre del día en español
 */
export function getDayNameES(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
}

/**
 * Obtiene el mes en español
 * @param {Date} date - Fecha de referencia
 * @returns {string} - Nombre del mes en español
 */
export function getMonthNameES(date) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
}
