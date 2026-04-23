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
import { PatientState } from '../../managers/patient/PatientState.js';

const log = Logger.create('GCalService');

export const GoogleCalendarService = {
    // Mapeo de calendarios individuales por terapeuta
    THERAPIST_CALENDARS: {
        diana: '3c4ab8fa048916ce6ce6d2891926a646a4728d1a9ad3edf43ef56f478680c958@group.calendar.google.com',
        vero: 'b66fd1b4b55d6fe42ee578696e79aaaa6445b2d744050e8fc90b81c395bd291e@group.calendar.google.com',
        sam: '6ff316ac3643f346833cc816cb0fc4020ea89ec923a4ca6681a39550f814daa5@group.calendar.google.com'
    },

    _enabled: false,
    _calendarId: null, // Legacy, kept for compatibility if needed
    _autoSyncInterval: null,

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

            this._calendarId = localStorage.getItem(this._calIdKey) || null;

            log.success('Calendar API cargada');
            this.startAutoSync();
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
    },

    /**
     * Inicia el proceso automático de sincronización en segundo plano (cada 3 horas)
     */
    startAutoSync() {
        if (this._autoSyncInterval) clearInterval(this._autoSyncInterval);
        
        // 3 horas = 10,800,000 ms
        const INTERVAL_MS = 3 * 60 * 60 * 1000;
        
        this._autoSyncInterval = setInterval(async () => {
            try {
                const { AuthManager } = await import('../../managers/AuthManager.js');
                const { CalendarState } = await import('../../modules/calendar/CalendarState.js');
                
                // Ejecutar solo si el usuario actual es Administrador (Recepción) y tiene un token válido
                if (AuthManager.isAdmin() && GoogleAuthService.isTokenValid() && CalendarState.appointments?.length > 0) {
                    log.info("⏰ Ejecutando Auto-Sync programado en segundo plano...");
                    await this.syncWeek(CalendarState.appointments, true);
                }
            } catch (err) {
                log.error("Fallo en Auto-Sync en segundo plano", err);
            }
        }, INTERVAL_MS);
        
        log.info("Auto-Sync de fondo iniciado (cada 3 horas)");
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
     * Obtiene el ID del calendario correcto basado en el terapeuta
     */
    getCalendarId(therapist) {
        const t = (therapist || 'diana').toLowerCase();
        return this.THERAPIST_CALENDARS[t] || this.THERAPIST_CALENDARS.diana;
    },

    /**
     * Antiguo método _ensureCalendar - Simplificado para devolver el de Diana como base
     */
    async _ensureCalendar(therapist = 'diana') {
        return this.getCalendarId(therapist);
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

        // Intentar obtener datos adicionales del perfil del paciente
        let parentInfo = '';
        let phoneInfo = '';
        
        const profiles = PatientState.patients || [];
        const profile = profiles.find(p => p.id === appointment.patientId || p.name === appointment.name);
        
        if (profile) {
            if (profile.parentName) parentInfo = `(Papá/Mamá: ${profile.parentName})`;
            if (profile.phone) phoneInfo = `Tel: ${profile.phone}`;
        }

        const summary = appointment.name || '(Sin nombre)';

        return {
            summary: summary,
            description: [
                'Terapeuta: ' + therapist,
                appointment.cost ? 'Costo: $' + appointment.cost : '',
                parentInfo ? 'Responsable: ' + parentInfo.replace(/[()]/g, '') : '',
                phoneInfo ? 'Teléfono: ' + phoneInfo.replace('Tel: ', '') : '',
                appointment.confirmed ? '✅ Asistencia confirmada' : '',
                appointment.isPaid ? '💰 Pagado' : '',
                '📱 Agenda Parlare'
            ].filter(Boolean).join('\n'),
            start: appointment.isFullDayBlock ? {
                date: startDate.toISOString().split('T')[0]
            } : {
                dateTime: startDate.toISOString(),
                timeZone: 'America/Mexico_City'
            },
            end: appointment.isFullDayBlock ? {
                date: new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            } : {
                dateTime: endDate.toISOString(),
                timeZone: 'America/Mexico_City'
            },
            reminders: (appointment.isFullDayBlock || appointment.isHourlyBlock) ? {
                useDefault: false,
                overrides: []
            } : {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 5 }
                ]
            },
            // Colores: Diana = Rosa (4), Sam = Azul (7), Vero = Morado (3)
            // Bloqueos = Gris Grafito (8)
            colorId: (appointment.isFullDayBlock || appointment.isHourlyBlock) ? '8' : (tKey === 'diana' ? '4' : tKey === 'sam' ? '7' : '3'),
            // Si es un bloque de "Hora Inhábil", hacerlo recurrente de Lunes a Sábado por 4 semanas
            // para que cubra la semana laboral y persista un mes.
            recurrence: appointment.isHourlyBlock ? ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA;COUNT=24'] : []
        };
    },

    // ── CRUD de eventos ─────────────────────────────────────────

    /**
     * Crea un evento en el calendario correspondiente
     */
    async createEvent(appointment) {
        if (!(await this._ensureReady())) return false;

        try {
            const calendarId = this.getCalendarId(appointment.therapist);
            const event = this._toGoogleEvent(appointment);

            const response = await this._callGapi(() => window.gapi.client.calendar.events.insert({
                calendarId,
                resource: event
            }));

            const googleEventId = response.result.id;
            this._setMapping(appointment.id, googleEventId);
            log.success(`Evento creado [${googleEventId}] en calendario ${appointment.therapist}`);
            return { success: true, googleEventId };
        } catch (err) {
            log.error('Error creando evento', err);
            return { success: false };
        }
    },

    /**
     * Actualiza un evento existente
     */
    async updateEvent(appointment) {
        if (!(await this._ensureReady())) return false;

        const googleEventId = appointment.googleEventId || this._getMappings()[appointment.id];

        if (!googleEventId) {
            return this.createEvent(appointment);
        }

        try {
            // Obtener datos actuales de la app para ver si cambió el terapeuta
            // (Ya vienen en el objeto appointment que recibe esta función)
            const calendarId = this.getCalendarId(appointment.therapist);
            const event = this._toGoogleEvent(appointment);

            // IMPORTANTE: Si googleEventId viene de Firestore, no sabemos en qué calendario está
            // si el terapeuta cambió. Por ahora asumimos que el terapeuta del objeto es el dueño del ID.
            // Si falla con 404, reintentamos creando uno nuevo.
            
            await this._callGapi(() => window.gapi.client.calendar.events.update({
                calendarId,
                eventId: googleEventId,
                resource: event
            }));

            log.info(`Evento actualizado [${googleEventId}]`);
            return { success: true, googleEventId };
        } catch (err) {
            if (err.status === 404) {
                log.warn('Evento no encontrado para actualizar. Re-creando...');
                this._removeMapping(appointment.id);
                return this.createEvent(appointment);
            }
            log.error('Error actualizando evento', err);
            return { success: false };
        }
    },

    /**
     * Elimina un evento (al cancelar cita)
     */
    async deleteEvent(appointmentId, googleEventIdParam = null, therapist = 'diana') {
        if (!(await this._ensureReady())) return false;

        const googleEventId = googleEventIdParam || this._getMappings()[appointmentId];
        if (!googleEventId) return true;

        try {
            const calendarId = this.getCalendarId(therapist);

            await this._callGapi(() => window.gapi.client.calendar.events.delete({
                calendarId,
                eventId: googleEventId
            }));

            this._removeMapping(appointmentId);
            return true;
        } catch (err) {
            if (err.status === 404) {
                // Intentar en los otros calendarios si no está en el del terapeuta actual (reparación)
                for (const tKey in this.THERAPIST_CALENDARS) {
                    try {
                        await this._callGapi(() => window.gapi.client.calendar.events.delete({
                            calendarId: this.THERAPIST_CALENDARS[tKey],
                            eventId: googleEventId
                        }));
                        this._removeMapping(appointmentId);
                        return true;
                    } catch (e) {}
                }
                this._removeMapping(appointmentId);
                return true;
            }
            log.error('Error eliminando evento', err);
            return false;
        }
    },

    /**
     * Descarga todos los eventos de los 3 calendarios para un rango de tiempo
     */
    async _fetchGoogleEventsMap() {
        if (!(await this._ensureReady())) return {};
        
        const now = new Date();
        const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); // 1 mes atrás
        const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString(); // 6 meses adelante
        
        const eventMap = {}; // Key: "therapist_ISOtime_name" -> Value: googleEventId
        const timeOnlyMap = {}; // Key: "therapist_ISOtime" -> Value: googleEventId
        const rawEvents = []; // Lista plana de todos los eventos

        log.info("🔍 Escaneando Google Calendar para evitar duplicados...");

        for (const tKey in this.THERAPIST_CALENDARS) {
            try {
                const calendarId = this.THERAPIST_CALENDARS[tKey];
                const response = await this._callGapi(() => window.gapi.client.calendar.events.list({
                    calendarId,
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    maxResults: 2500
                }));

                const items = response.result.items || [];
                items.forEach(item => {
                    const start = item.start.dateTime || item.start.date;
                    if (!start) return;

                    // Normalizar para match exacto y match parcial
                    const isoKey = new Date(start).toISOString().slice(0, 16);
                    const nameNorm = (item.summary || '').toLowerCase().trim().replace(/\s+/g, '');
                    
                    const exactKey = `${tKey}_${isoKey}_${nameNorm}`;
                    const timeKey = `${tKey}_${isoKey}`;
                    
                    eventMap[exactKey] = item.id;
                    // Solo guardamos el fallback por tiempo si no existe o lo sobrescribimos
                    timeOnlyMap[timeKey] = item.id;
                    
                    rawEvents.push({
                        ...item,
                        therapist: tKey,
                        isoKey: isoKey,
                        nameNorm: nameNorm
                    });
                });
            } catch (err) {
                log.warn(`Error escaneando calendario de ${tKey}:`, err);
            }
        }

        return { exact: eventMap, timeOnly: timeOnlyMap, rawEvents: rawEvents };
    },

    /**
     * Sync masivo: envía todas las citas activas a Google Calendar
     */
    async syncWeek(appointments, isSilent = false) {
        if (!(await this._ensureReady())) {
            if (!isSilent) ToastService.info('Google Calendar no configurado');
            return { created: 0, updated: 0, errors: 0 };
        }

        // 0. LIMPIEZA AGRESIVA EN FIREBASE PARA EVITAR CIUDAR FANTASMAS
        let idsAExcluir = [];
        try {
            const { CalendarData } = await import('../../modules/calendar/CalendarData.js');
            const cleanResult = await CalendarData.cleanupDuplicates();
            if (cleanResult && cleanResult.total > 0) {
                log.info(`Eliminados ${cleanResult.total} duplicados de Firebase antes de sincronizar.`);
                idsAExcluir = cleanResult.deletedIds || [];
            }
        } catch(e) {
            log.warn('No se pudo ejecutar limpieza previa', e);
        }

        const active = appointments.filter(a => !a.isCancelled && !idsAExcluir.includes(a.id));
        if (!isSilent) ToastService.info(`Sincronizando ${active.length} citas...`);

        // 1. FASE DE DESCUBRIMIENTO: Evitar encimar eventos que ya existen en Google
        const googleMaps = await this._fetchGoogleEventsMap();
        
        // --- 1.5 FASE DE EXTERMINIO (Sincronización Espejo Absoluta 1 a 1) ---
        let ghostsDeleted = 0;
        const matchedGoogleIds = new Set();
        const mappings = this._getMappings();

        // Paso A: Emparejar citas de Firebase con Google Calendar (1 a 1)
        for (const apt of active) {
            if (apt.googleEventId && googleMaps.rawEvents.some(e => e.id === apt.googleEventId)) {
                matchedGoogleIds.add(apt.googleEventId);
            } else if (mappings[apt.id] && googleMaps.rawEvents.some(e => e.id === mappings[apt.id])) {
                matchedGoogleIds.add(mappings[apt.id]);
                apt.googleEventId = mappings[apt.id];
            } else {
                const isoKey = new Date(apt.date).toISOString().slice(0, 16);
                const nameNorm = (apt.name || '').toLowerCase().trim().replace(/\s+/g, '');
                const therapist = (apt.therapist || 'diana').toLowerCase();
                
                // Buscar candidato libre por Nombre Exacto
                let candidate = googleMaps.rawEvents.find(e => !matchedGoogleIds.has(e.id) && 
                    e.therapist === therapist && e.isoKey === isoKey && e.nameNorm === nameNorm);
                
                // Buscar candidato libre por Horario (Fallback)
                if (!candidate) {
                    candidate = googleMaps.rawEvents.find(e => !matchedGoogleIds.has(e.id) && 
                        e.therapist === therapist && e.isoKey === isoKey);
                }

                if (candidate) {
                    matchedGoogleIds.add(candidate.id);
                    apt.googleEventId = candidate.id; // Enlace reparado en memoria
                }
            }
        }

        // Paso B: Exterminar TODO evento de Google que no haya sido reclamado
        if (googleMaps.rawEvents && googleMaps.rawEvents.length > 0) {
            log.info(`🧹 Fase de Espejo: Verificando ${googleMaps.rawEvents.length} eventos en Google. Reclamados/Protegidos: ${matchedGoogleIds.size}`);
            
            for (const gEvent of googleMaps.rawEvents) {
                if (!matchedGoogleIds.has(gEvent.id)) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 150));
                        log.warn(`👻 Fantasma Exterminado: [${gEvent.summary || 'Sin Titulo'}] el ${gEvent.isoKey} en ${gEvent.therapist}`);
                        
                        await this._callGapi(() => window.gapi.client.calendar.events.delete({
                            calendarId: this.getCalendarId(gEvent.therapist),
                            eventId: gEvent.id
                        }));
                        ghostsDeleted++;
                    } catch(e) {
                         log.error("Exterminio fallido para " + gEvent.id, e);
                    }
                }
            }
        }

        let created = 0, updated = 0, errors = 0, linked = matchedGoogleIds.size;

        // Fase 2: Inyección de actualizaciones
        for (const apt of active) {
            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                let result;
                
                // Como la fase de exterminio ya enlazó los eventos si fue posible, 
                // apt.googleEventId estará seteado si existe un match visual en Google.
                if (apt.googleEventId || mappings[apt.id]) {
                    result = await this.updateEvent(apt);
                    if (result && result.success) {
                        updated++;
                    } else {
                        // PELIGRO ELIMINADO: Antes, si updateEvent fallaba por timeout/403, creaba uno nuevo ciegamente.
                        log.warn(`Update falló para ${apt.id}. NO se recreará para evitar duplicidad.`);
                        errors++;
                    }
                } else {
                    result = await this.createEvent(apt);
                    if (result && result.success) {
                        created++;
                        if (result.googleEventId) {
                            try {
                                const { doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
                                const docRef = doc(db, collectionPath, apt.id);
                                await updateDoc(docRef, { googleEventId: result.googleEventId });
                            } catch (dbErr) {
                                log.warn('No se pudo guardar googleEventId en Firestore', dbErr);
                            }
                        }
                    } else {
                        errors++;
                    }
                }
            } catch (err) {
                log.error(`Error en sync para cita ${apt.id}:`, err);
                errors++;
            }
        }

        const msg = `📅 Sync: ${created} nuevas, ${updated} actualizadas, ${linked} enlazadas${errors ? `, ${errors} errores` : ''}`;
        if (!isSilent || created > 0 || updated > 0 || errors > 0) {
            ToastService.success(msg);
        } else {
            log.info(msg);
        }
        return { created, updated, errors };
    }
};
