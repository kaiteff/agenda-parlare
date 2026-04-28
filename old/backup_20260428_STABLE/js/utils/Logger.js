/**
 * Logger.js
 * Utilidad centralizada de logging para Agenda Parlare
 * 
 * Uso:
 *   import { Logger } from '../utils/Logger.js';
 *   const log = Logger.create('MiModulo');
 *   log.info('Inicializado');       → "ℹ️ [MiModulo] Inicializado"
 *   log.success('Listo');           → "✅ [MiModulo] Listo"
 *   log.warn('Cuidado');            → "⚠️ [MiModulo] Cuidado"
 *   log.error('Falló', error);      → "❌ [MiModulo] Falló" + error
 *   log.debug('Detalle', data);     → Solo si DEBUG está activo
 * 
 * Para activar debug en consola del navegador:
 *   localStorage.setItem('parlare_debug', 'true')
 */

export const Logger = {
    // Verificar si debug está activo
    get _isDebug() {
        return localStorage.getItem('parlare_debug') === 'true';
    },

    /**
     * Crea un logger con prefijo de módulo
     * @param {string} moduleName - Nombre del módulo
     * @returns {Object} Logger con métodos info, success, warn, error, debug
     */
    create(moduleName) {
        const prefix = `[${moduleName}]`;
        return {
            info: (...args) => console.log(`ℹ️ ${prefix}`, ...args),
            success: (...args) => console.log(`✅ ${prefix}`, ...args),
            warn: (...args) => console.warn(`⚠️ ${prefix}`, ...args),
            error: (...args) => console.error(`❌ ${prefix}`, ...args),
            debug: (...args) => {
                if (Logger._isDebug) console.log(`🔍 ${prefix}`, ...args);
            },
            /** Log con emoji y formato personalizado */
            custom: (emoji, ...args) => console.log(`${emoji} ${prefix}`, ...args),

            /** Mide tiempo de ejecución de una función async */
            async time(label, fn) {
                const start = performance.now();
                try {
                    const result = await fn();
                    const ms = Math.round(performance.now() - start);
                    console.log(`⏱️ ${prefix} ${label}: ${ms}ms`);
                    return result;
                } catch (err) {
                    const ms = Math.round(performance.now() - start);
                    console.error(`⏱️❌ ${prefix} ${label} falló (${ms}ms):`, err);
                    throw err;
                }
            },

            /** Log de grupo colapsable (para datos grandes) */
            group(label, data) {
                console.groupCollapsed(`📦 ${prefix} ${label}`);
                if (typeof data === 'object') {
                    console.table(data);
                } else {
                    console.log(data);
                }
                console.groupEnd();
            }
        };
    },

    /**
     * Helper rápido para depuración de estado
     * Uso en consola: Logger.state()
     */
    async state() {
        console.group('📊 Parlare App State');

        try {
            const { CalendarState } = await import('../modules/calendar/CalendarState.js');
            console.log('📅 Citas cargadas:', CalendarState.appointments.length);
            console.log('📅 Fecha actual:', CalendarState.currentDate);
        } catch (e) { console.warn('CalendarState no disponible'); }

        try {
            const { PatientState } = await import('../managers/patient/PatientState.js');
            console.log('👥 Pacientes:', PatientState.patients.length);
            console.log('👁️ Vista:', PatientState.viewMode);
        } catch (e) { console.warn('PatientState no disponible'); }

        try {
            const { GoogleAuthService } = await import('../services/google/GoogleAuthService.js');
            console.log('🔑 Token:', GoogleAuthService.getTokenHealth());
        } catch (e) { console.warn('GoogleAuth no disponible'); }

        console.groupEnd();
    }
};

// Exponer en window para uso desde consola del navegador
window.ParlareLogger = Logger;
window.ParlareDebug = () => Logger.state();
