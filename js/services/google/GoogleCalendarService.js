/**
 * GoogleCalendarService.js
 * Sync de citas de la app hacia Google Calendar
 * 
 * Funcionalidad:
 * - Crea un calendario dedicado "Parlare Citas" (separado del personal)
 * - Crea eventos en ese calendario al agendar citas
 * - Actualiza eventos al modificar citas
 * - Elimina eventos al cancelar citas
 * - Los eventos incluyen recordatorio nativo de Google (30 y 10 min antes)
 */

import { GoogleAuthService } from './GoogleAuthService.js';
import { ToastService } from '../../utils/ToastService.js';
import { Logger } from '../../utils/Logger.js';

const log = Logger.create('GCalService');

export const GoogleCalendarService = {
    // Almacenamiento local
    _storageKey: 'parlare_gcal_mappings',
    _calIdKey: 'parlare_gcal_calendar_id',
    _enabled: false,
    _calendarId: null, // ID del calendario "Parlare Citas"

    // Configuración del calendario dedicado
    CALENDAR_NAME: 'Parlare Citas',
    CALENDAR_COLOR: '#16a765', // Verde esmeralda

    /**
     * Inicializa el servicio: carga Calendar API
     */
    async init() {
        try {
            if (!window.gapi?.client) {
                log.warn('GAPI no disponible');
                return false;
            }

            await window.gapi.client.load('calendar', 'v3');
            this._enabled = true;

            // Recuperar calendarId guardado
            this._calendarId = localStorage.getItem(this._calIdKey) || null;

            log.success('Calendar API cargada');
            return true;
        } catch (err) {
            log.warn('No se pudo cargar Calendar API', err);
            return false;
        }
    },

    /**
     * Asegura que el servicio esté listo (auto-inicializa si es necesario)
     * @returns {boolean} true si está listo para usar
     */
    async _ensureReady() {
        if (!GoogleAuthService.isConfigured()) return false;

        // Auto-inicializar si no se ha hecho
        if (!this._enabled) {
            const ok = await this.init();
            if (!ok) return false;
        }
        return true;
    },

    /**
     * Wrapper para llamadas a GAPI con reintento en caso de 401 (Token vencido/revocado)
     */
    async _callGapi(apiFn) {
        try {
            return await apiFn();
        } catch (err) {
            // Si es 401 (Unauthorized)
            if (err.status === 401 || (err.result && err.result.error && err.result.error.code === 401)) {
                log.warn('Error 401 detectado. Renovando token...');
                GoogleAuthService.invalidateToken();
                await GoogleAuthService.ensureToken(); // Esto refrescará el token
                return await apiFn(); // Reintentar una vez
            }
            throw err;
        }
    },

    // ── Calendario dedicado ─────────────────────────────────────

    /**
     * Obtiene o crea el calendario "Parlare Citas".
     * Busca primero en localStorage, luego en la lista de calendarios.
     * Si no existe, lo crea automáticamente.
     * @returns {string} calendarId
     */
    async _ensureCalendar() {
        // 1. Ya lo tenemos en memoria
        if (this._calendarId) {
            return this._calendarId;
        }

        await GoogleAuthService.ensureToken();

        // 2. Buscar en la lista de calendarios del usuario
        try {
            const listResponse = await this._callGapi(() => window.gapi.client.calendar.calendarList.list());
            const calendars = listResponse.result.items || [];

            const existing = calendars.find(c => c.summary === this.CALENDAR_NAME);
            if (existing) {
                this._calendarId = existing.id;
                localStorage.setItem(this._calIdKey, existing.id);
                log.info(`Calendario "${this.CALENDAR_NAME}" encontrado [${existing.id}]`);
                return this._calendarId;
            }
        } catch (err) {
            log.warn('Error buscando calendarios', err);
        }

        // 3. No existe — crearlo
        try {
            const createResponse = await this._callGapi(() => window.gapi.client.calendar.calendars.insert({
                resource: {
                    summary: this.CALENDAR_NAME,
                    description: 'Calendario automático de citas - Agenda Parlare',
                    timeZone: 'America/Mexico_City'
                }
            }));

            const newCalId = createResponse.result.id;

            // Configurar color del calendario en la lista del usuario
            try {
                await this._callGapi(() => window.gapi.client.calendar.calendarList.patch({
                    calendarId: newCalId,
                    resource: {
                        backgroundColor: this.CALENDAR_COLOR,
                        foregroundColor: '#ffffff',
                        defaultReminders: [
                            { method: 'popup', minutes: 30 },
                            { method: 'popup', minutes: 10 }
                        ]
                    }
                }));
            } catch (colorErr) {
                // No es crítico si falla el color
                log.warn('No se pudo configurar color', colorErr);
            }

            this._calendarId = newCalId;
            localStorage.setItem(this._calIdKey, newCalId);
            log.success(`Calendario "${this.CALENDAR_NAME}" creado [${newCalId}]`);
            ToastService.success(`📅 Calendario "${this.CALENDAR_NAME}" creado en tu Google Calendar`);
            return this._calendarId;

        } catch (err) {
            log.error('Error creando calendario', err);
            // Fallback: usar calendario primario
            this._calendarId = 'primary';
            return 'primary';
        }
    },

    // ── Mapeos appointmentId → googleEventId ────────────────────

    _getMappings() {
        try {
            return JSON.parse(localStorage.getItem(this._storageKey) || '{}');
        } catch {
            return {};
        }
    },

    _setMapping(appointmentId, googleEventId) {
        const mappings = this._getMappings();
        mappings[appointmentId] = googleEventId;
        localStorage.setItem(this._storageKey, JSON.stringify(mappings));
    },

    _removeMapping(appointmentId) {
        const mappings = this._getMappings();
        delete mappings[appointmentId];
        localStorage.setItem(this._storageKey, JSON.stringify(mappings));
    },

    // ── Conversión de cita → evento ─────────────────────────────

    _toGoogleEvent(appointment) {
        const startDate = new Date(appointment.date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora

        const tKey = (appointment.therapist || 'diana').toLowerCase();
        const therapist = tKey.charAt(0).toUpperCase() + tKey.slice(1);

        return {
            summary: appointment.name,
            description: [
                `Terapeuta: ${therapist}`,
                appointment.cost ? `Costo: $${appointment.cost}` : '',
                appointment.isPaid ? '✅ Pagado' : '⏳ Pendiente',
                '',
                '📱 Agenda Parlare'
            ].filter(Boolean).join('\n'),
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'America/Mexico_City'
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'America/Mexico_City'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'popup', minutes: 10 }
                ]
            },
            // Colores por terapeuta: Diana = Rosa (Flamingo=4), Sam = Azul (Peacock=7), Vero = Morado (Grape=3)
            colorId: tKey === 'diana' ? '4' : tKey === 'sam' ? '7' : '3'
        };
    },

    // ── CRUD de eventos ─────────────────────────────────────────

    /**
     * Crea un evento en el calendario Parlare Citas
     */
    async createEvent(appointment) {
        if (!(await this._ensureReady())) return false;

        try {
            const calendarId = await this._ensureCalendar();
            const event = this._toGoogleEvent(appointment);

            const response = await this._callGapi(() => window.gapi.client.calendar.events.insert({
                calendarId,
                resource: event
            }));

            this._setMapping(appointment.id, response.result.id);
            log.success(`Evento creado [${response.result.id}]`);
            return true;
        } catch (err) {
            log.error('Error creando evento', err);
            return false;
        }
    },

    /**
     * Actualiza un evento existente
     */
    async updateEvent(appointment) {
        if (!(await this._ensureReady())) return false;

        const googleEventId = this._getMappings()[appointment.id];

        if (!googleEventId) {
            return this.createEvent(appointment);
        }

        try {
            const calendarId = await this._ensureCalendar();
            const event = this._toGoogleEvent(appointment);

            await this._callGapi(() => window.gapi.client.calendar.events.update({
                calendarId,
                eventId: googleEventId,
                resource: event
            }));

            log.info(`Evento actualizado [${googleEventId}]`);
            return true;
        } catch (err) {
            if (err.status === 404) {
                this._removeMapping(appointment.id);
                return this.createEvent(appointment);
            }
            log.error('Error actualizando evento', err);
            return false;
        }
    },

    /**
     * Elimina un evento (al cancelar cita)
     */
    async deleteEvent(appointmentId) {
        if (!(await this._ensureReady())) return false;

        const googleEventId = this._getMappings()[appointmentId];
        if (!googleEventId) return true;

        try {
            const calendarId = await this._ensureCalendar();

            await this._callGapi(() => window.gapi.client.calendar.events.delete({
                calendarId,
                eventId: googleEventId
            }));

            this._removeMapping(appointmentId);
            log.info(`Evento eliminado [${googleEventId}]`);
            return true;
        } catch (err) {
            if (err.status === 404) {
                this._removeMapping(appointmentId);
                return true;
            }
            log.error('Error eliminando evento', err);
            return false;
        }
    },

    /**
     * Sync masivo: envía todas las citas activas a Google Calendar
     */
    async syncWeek(appointments) {
        if (!(await this._ensureReady())) {
            ToastService.info('Google Calendar no configurado');
            return { created: 0, updated: 0, errors: 0 };
        }

        const mappings = this._getMappings();
        let created = 0, updated = 0, errors = 0;

        const active = appointments.filter(a => !a.isCancelled);
        ToastService.info(`Sincronizando ${active.length} citas...`);

        for (const apt of active) {
            try {
                if (mappings[apt.id]) {
                    await this.updateEvent(apt);
                    updated++;
                } else {
                    await this.createEvent(apt);
                    created++;
                }
            } catch (err) {
                errors++;
            }
        }

        const msg = `📅 Sync: ${created} creadas, ${updated} actualizadas${errors ? `, ${errors} errores` : ''}`;
        ToastService.success(msg);
        return { created, updated, errors };
    }
};
