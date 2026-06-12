/**
 * sanitize.js
 * Utilidades para sanitización y escape de entrada/datos de usuario
 */

export function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
