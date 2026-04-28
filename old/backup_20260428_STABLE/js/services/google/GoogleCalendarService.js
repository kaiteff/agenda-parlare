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
     * Verifica que el servicio esté inicializado. NO pide token (eso lo hace syncWeek explícitamente).
     * @returns {boolean} true si el servicio de Calendar está listo
     */
    async _ensureReady() {
        if (!GoogleAuthService.isConfigured()) return false;

        if (!this._enabled) {
            const ok = await this.init();
            if (!ok) return false;
        }

        return true;
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
     * NUKE TOTAL: Solo para soporte/admin.
     * Borra ABSOLUTAMENTE TODOS los eventos de los 3 calendarios (rango 1 año atrás → 1 año adelante)
     * y los recrea limpios desde Firebase.
     * @param {Array} allAppointments - TODAS las citas activas de Firebase (sin filtro de semana)
     */
    async nukeAndRebuildAll(allAppointments) {
        if (!(await this._ensureReady())) {
            ToastService.error('Google Calendar no disponible. Recarga la página.');
            return;
        }
        if (!GoogleAuthService.isTokenValid()) {
            ToastService.error('Token de Google expirado. Haz clic en "Google Off" para reconectarte.');
            return;
        }

        const active = allAppointments.filter(a => !a.isCancelled);
        log.info(`[NUKE] Iniciando Nuke Total. Citas en Firebase: ${active.length}`);
        ToastService.info(`💣 Nuke Total: Borrando TODO Google Calendar...`);

        // Rango amplio: 1 año atrás → 1 año adelante
        const now = new Date();
        const timeMin = new Date(now.getFullYear() - 1, 0, 1).toISOString();
        const timeMax = new Date(now.getFullYear() + 1, 11, 31).toISOString();

        // ── FASE 1: Borrar TODO en los 3 calendarios ─────────────────────────────
        let deleted = 0;
        for (const [tKey, calendarId] of Object.entries(this.THERAPIST_CALENDARS)) {
            let pageToken = null;
            do {
                try {
                    const params = { calendarId, timeMin, timeMax, singleEvents: true, maxResults: 2500 };
                    if (pageToken) params.pageToken = pageToken;

                    const response = await this._callGapi(() => window.gapi.client.calendar.events.list(params));
                    const result = response.result;
                    const events = result.items || [];
                    pageToken = result.nextPageToken || null;

                    log.info(`[NUKE] 🗑️ ${tKey}: ${events.length} evento(s) encontrados`);

                    for (const ev of events) {
                        try {
                            await new Promise(r => setTimeout(r, 80));
                            await this._callGapi(() => window.gapi.client.calendar.events.delete({
                                calendarId, eventId: ev.id
                            }));
                            deleted++;
                        } catch (e) {
                            log.warn(`[NUKE] No se pudo borrar ${ev.id}`, e);
                        }
                    }
                } catch (e) {
                    log.error(`[NUKE] Error en ${tKey}`, e);
                    pageToken = null;
                }
            } while (pageToken);
        }

        log.info(`[NUKE] ✅ Fase 1 completa. Borrados: ${deleted}. Reconstruyendo ${active.length} citas...`);
        ToastService.info(`✅ ${deleted} eventos borrados. Reconstruyendo ${active.length} citas...`);

        // ── FASE 2: Crear TODAS las citas desde Firebase ─────────────────────────
        let created = 0;
        for (const apt of active) {
            try {
                await new Promise(r => setTimeout(r, 150));
                const calendarId = this.getCalendarId(apt.therapist);
                const event = this._toGoogleEvent(apt);

                const response = await this._callGapi(() => window.gapi.client.calendar.events.insert({
                    calendarId, resource: event
                }));

                const googleEventId = response.result.id;
                this._setMapping(apt.id, googleEventId);
                created++;

                try {
                    const { doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
                    await updateDoc(doc(db, collectionPath, apt.id), { googleEventId });
                } catch (dbErr) {
                    log.warn('[NUKE] No se pudo guardar googleEventId', dbErr);
                }
            } catch (e) {
                log.error(`[NUKE] Error creando evento para ${apt.id}`, e);
            }
        }

        const msg = `💣 Nuke Total completado: ${deleted} borrados, ${created} recreados desde Firebase`;
        log.info(msg);
        ToastService.success(msg);
    },

    /**

     * Sync Total: Estrategia "Nuke & Replace por Semana".
     * 1. Calcula el rango de la semana visible (lunes a domingo) desde las citas
     * 2. Por cada calendario de terapeuta: borra TODOS los eventos de esa semana
     * 3. Recrea limpios desde Firebase
     * Firebase siempre gana. 3 llamadas de lista en lugar de N*3.
     */
    async syncWeek(appointments, isSilent = false) {
        if (!(await this._ensureReady())) {
            log.error('[syncWeek] Servicio de Calendar no inicializado');
            if (!isSilent) ToastService.error('Google Calendar no disponible. Recarga la página.');
            return { created: 0, deleted: 0 };
        }

        if (!GoogleAuthService.isTokenValid()) {
            log.warn('[syncWeek] Token de Google inválido o expirado');
            if (!isSilent) ToastService.error('Token de Google expirado. Haz clic en "Google Off" para reconectarte.');
            return { created: 0, deleted: 0 };
        }

        const active = appointments.filter(a => !a.isCancelled);
        if (active.length === 0) {
            if (!isSilent) ToastService.info('No hay citas activas para sincronizar.');
            return { created: 0, deleted: 0 };
        }

        // Importaciones dinámicas para evitar dependencias circulares
        const { CalendarState } = await import('../../modules/calendar/CalendarState.js');
        const { AuthManager } = await import('../../managers/AuthManager.js');

        // ── PASO 1: Calcular rango estricto de la semana visible ──────────────────
        // La semana empieza en CalendarState.currentDate y dura 7 días.
        const weekStartDate = CalendarState.currentDate || new Date();
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);

        // Formateo YYYY-MM-DD
        const startStr = weekStartDate.toISOString().slice(0, 10);
        const endStr = weekEndDate.toISOString().slice(0, 10);

        const timeMin = `${startStr}T00:00:00-06:00`;
        const timeMax = `${endStr}T23:59:59-06:00`;

        // ── PASO 2: Determinar qué calendarios afectar ────────────────────────────
        const selectedTherapist = AuthManager.getSelectedTherapist();
        const isViewAll = !selectedTherapist || selectedTherapist === 'all';
        const therapistsToSync = isViewAll 
            ? Object.keys(this.THERAPIST_CALENDARS) 
            : [selectedTherapist.toLowerCase()];

        const filterName = isViewAll ? "Todos los Terapeutas" : selectedTherapist;
        log.info(`[syncWeek] Filtro activo: ${filterName}. Semana: ${startStr} → ${endStr}`);
        if (!isSilent) ToastService.info(`🧹 Limpiando ${filterName} (${startStr} a ${endStr})...`);

        // ── PASO 3: Borrar eventos SOLO de los calendarios afectados ─────────────
        let deleted = 0;
        for (const tKey of therapistsToSync) {
            const calendarId = this.THERAPIST_CALENDARS[tKey];
            if (!calendarId) continue;
            
            try {
                const response = await this._callGapi(() => window.gapi.client.calendar.events.list({
                    calendarId,
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    maxResults: 2500
                }));

                const events = response.result.items || [];
                log.info(`[syncWeek] 🗑️ ${tKey}: ${events.length} evento(s) a borrar`);

                for (const ev of events) {
                    try {
                        await new Promise(r => setTimeout(r, 80));
                        await this._callGapi(() => window.gapi.client.calendar.events.delete({
                            calendarId,
                            eventId: ev.id
                        }));
                        deleted++;
                    } catch (e) {
                        log.warn(`No se pudo borrar evento ${ev.id}`, e);
                    }
                }
            } catch (e) {
                log.warn(`Error escaneando calendario de ${tKey}`, e);
            }
        }

        log.info(`[syncWeek] ✅ Borrados: ${deleted}. Creando citas desde Firebase...`);

        // ── PASO 4: Crear todos los eventos desde Firebase ────────────────────────
        let created = 0;
        for (const apt of active) {
            // Filtrar estrictamente por fecha
            const aptDateStr = apt.date.slice(0, 10);
            if (aptDateStr < startStr || aptDateStr > endStr) continue;

            // Filtrar estrictamente por terapeuta
            const tKey = (apt.therapist || 'diana').toLowerCase();
            if (!therapistsToSync.includes(tKey)) continue;

            try {
                await new Promise(r => setTimeout(r, 150));
                const calendarId = this.THERAPIST_CALENDARS[tKey];
                const event = this._toGoogleEvent(apt);

                const response = await this._callGapi(() => window.gapi.client.calendar.events.insert({
                    calendarId,
                    resource: event
                }));

                const googleEventId = response.result.id;
                this._setMapping(apt.id, googleEventId);
                created++;

                // Guardar googleEventId en Firestore
                try {
                    const { doc, updateDoc, db, collectionPath } = await import('../../firebase.js');
                    await updateDoc(doc(db, collectionPath, apt.id), { googleEventId });
                } catch (dbErr) {
                    log.warn('No se pudo guardar googleEventId en Firestore', dbErr);
                }
            } catch (e) {
                log.error(`Error creando evento para cita ${apt.id}`, e);
            }
        }

        const msg = `✅ Sync Semana: ${deleted} borrados, ${created} recreados (${filterName})`;
        log.info('[syncWeek]', msg);
        if (!isSilent) ToastService.success(msg);
        return { created, deleted };
    }
};

