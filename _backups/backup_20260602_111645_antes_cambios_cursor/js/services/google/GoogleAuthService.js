/**
 * GoogleAuthService.js
 * Maneja la autenticación y carga de librerías de Google (GAPI + GIS)
 */

import { Logger } from '../../utils/Logger.js';
import { AuthManager } from '../../managers/AuthManager.js';

const log = Logger.create('GoogleAuth');

export const GoogleAuthService = {
    config: {
        clientId: '40563362456-be3keouutvtrpav0h105hqtl6cs3ubu7.apps.googleusercontent.com',
        apiKey: 'AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0',
        discoveryDocs: [
            'https://sheets.googleapis.com/$discovery/rest?version=v4',
            'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
        ],
        scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
    },

    tokenClient: null,
    gapiInited: false,
    gisInited: false,
    tokenExpiration: null,
    _refreshTimer: null,
    _refreshAttempts: 0,

    /**
     * Inicializa GAPI y GIS
     * @returns {Promise<boolean>}
     */
    async init() {
        if (this.gapiInited && this.gisInited) return true;

        log.info("Inicializando librerías...");

        try {
            await Promise.all([this.loadGapi(), this.loadGis()]);
            log.success("Librerías cargadas.");

            // INTENTO DE RECUPERACIÓN DESDE LOCALSTORAGE (Persistencia)
            this._loadTokenFromStorage();

            return true;
        } catch (error) {
            log.error("Error al inicializar", error);
            return false;
        }
    },

    /**
     * Guarda el token en LocalStorage para persistencia
     * @private
     */
    _saveTokenToStorage(resp) {
        try {
            const data = {
                token: resp,
                expiration: this.tokenExpiration
            };
            localStorage.setItem('google_auth_token', JSON.stringify(data));
            log.debug("Token guardado en almacenamiento local");
        } catch (e) {
            log.warn("No se pudo guardar el token en localStorage", e);
        }
    },

    /**
     * Carga el token desde LocalStorage
     * @private
     */
    _loadTokenFromStorage() {
        try {
            const stored = localStorage.getItem('google_auth_token');
            if (stored) {
                const data = JSON.parse(stored);
                const now = Date.now();

                if (data.expiration && data.expiration > now) {
                    log.info("Token recuperado de almacenamiento local.");
                    this.tokenExpiration = data.expiration;
                    if (window.gapi?.client) {
                        window.gapi.client.setToken(data.token);
                    }
                    
                    // Programar el próximo refresh
                    const expiresInSeconds = Math.round((data.expiration - now) / 1000) + (5 * 60);
                    this._scheduleRefresh(expiresInSeconds);
                } else {
                    log.info("Token en almacenamiento local expirado.");
                    localStorage.removeItem('google_auth_token');
                }
            }
        } catch (e) {
            log.warn("Error cargando token de localStorage", e);
        }
    },

    loadGapi() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                let resolved = false;
                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error("Timeout loading GAPI client"));
                    }
                }, 10000); // 10s timeout

                window.gapi.load('client', async () => {
                    if (resolved) return;
                    clearTimeout(timeoutId);
                    try {
                        await window.gapi.client.init({
                            apiKey: this.config.apiKey,
                            discoveryDocs: this.config.discoveryDocs,
                        });
                        this.gapiInited = true;
                        resolved = true;
                        resolve();
                    } catch (err) {
                        resolved = true;
                        reject(err);
                    }
                });
            } else {
                reject(new Error("GAPI script not loaded"));
            }
        });
    },

    loadGis() {
        return new Promise((resolve, reject) => {
            if (window.google) {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.config.clientId,
                    scope: this.config.scopes,
                    callback: '', // defined at request time
                });
                this.gisInited = true;
                resolve();
            } else {
                reject(new Error("GIS script not loaded"));
            }
        });
    },

    /**
     * Obtiene un token de acceso válido (o pide login si es necesario)
     * @param {boolean} forceConsent - Si es true, fuerza la pantalla de selección de cuenta/permisos
     */
    async ensureToken(forceConsent = false) {
        if (!this.tokenClient) await this.init();

        // Si NO forzamos y ya tenemos token válido y NO expirado, usarlo
        if (!forceConsent && this.isTokenValid()) {
            return true;
        }

        // Si el token va a expirar pronto o no existe, pedir uno nuevo (background refresh si es posible)
        if (!forceConsent && this.tokenExpiration) {
            log.info("Token próximo a expirar. Renovando silenciosamente...");
        }

        // Helper para pedir token
        const requestToken = (promptConfig) => {
            return new Promise((resolve, reject) => {
                let timeoutId;
                let resolved = false;

                timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        log.error(`Timeout esperando autenticación (prompt: '${promptConfig}')`);
                        reject(new Error("Timeout: La ventana de autenticación no respondió."));
                    }
                }, 15000);

                try {
                    this.tokenClient.callback = (resp) => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeoutId);

                        if (resp.error) {
                            reject(resp);
                            return;
                        }

                        // IMPORTANTE: Inyectar el token en GAPI
                        log.success("Token obtenido. Inyectando en GAPI...");
                        if (window.gapi && window.gapi.client) {
                            window.gapi.client.setToken(resp);
                        }

                        // Calcular expiración
                        const expiresIn = resp.expires_in || 3599;
                        this.tokenExpiration = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
                        this._refreshAttempts = 0;
                        log.debug(`Token válido hasta ${new Date(this.tokenExpiration).toLocaleTimeString()}`);

                        // GUARDAR PARA PERSISTENCIA
                        this._saveTokenToStorage(resp);

                        this._scheduleRefresh(expiresIn);
                        resolve(resp);
                    };

                    log.info(`Solicitando token (Prompt: '${promptConfig}')...`);
                    this.tokenClient.requestAccessToken({
                        prompt: promptConfig,
                        // Eliminamos 'hint' para que no fuerce sugerencia de cuenta y el usuario elija libremente
                    });
                } catch (err) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        reject(err);
                    }
                }
            });
        };

        // Si no forzamos consentimiento, intentamos silent refresh primero
        if (!forceConsent) {
            try {
                // prompt: '' intenta refresh silencioso
                await requestToken('');
                return true;
            } catch (err) {
                log.warn("Silent refresh falló, intentando con prompt...", err);
                // Fallthrough to interactive
            }
        }

        // Si falló silent o es forceConsent, mostrar selector
        try {
            await requestToken('select_account');
            return true;
        } catch (err) {
            log.error("Error obteniendo token interactivo", err);
            throw err;
        }
    },

    /**
     * Verifica si el token actual es válido y no ha expirado
     */
    isTokenValid() {
        const token = window.gapi?.client?.getToken();
        if (!token) return false;

        // Si no tenemos timestamp (primera vez o recarga), asumimos inválido para forzar refresh seguro
        if (!this.tokenExpiration) return false;

        return Date.now() < this.tokenExpiration;
    },

    /**
     * Invalida el token actual para forzar una renovación
     */
    invalidateToken() {
        this.tokenExpiration = null;
        if (window.gapi?.client) {
            window.gapi.client.setToken(null);
        }
        localStorage.removeItem('google_auth_token');
        log.info("Token invalidado manualmente (posible error 401)");
    },

    /**
     * Verifica si las credenciales están configuradas
     */
    isConfigured() {
        return this.config.clientId && !this.config.clientId.includes('YOUR_') &&
            this.config.apiKey && !this.config.apiKey.includes('YOUR_');
    },

    /**
     * Programa un refresh silencioso antes de que el token expire.
     * Se ejecuta 2 minutos antes de la expiración efectiva.
     */
    _scheduleRefresh(expiresInSeconds) {
        if (this._refreshTimer) clearTimeout(this._refreshTimer);

        // Refrescar 8 minutos antes de la expiración real (3 min antes de nuestro margen de 5 min)
        const refreshInMs = Math.max((expiresInSeconds - 8 * 60) * 1000, 60000); // Mínimo 1 minuto

        log.debug(`Refresh programado en ${Math.round(refreshInMs / 60000)} minutos`);

        this._refreshTimer = setTimeout(() => {
            this._refreshSilently();
        }, refreshInMs);
    },

    /**
     * Intenta renovar el token silenciosamente (sin popup).
     * Si falla, loguea una advertencia pero no interrumpe al usuario.
     */
    async _refreshSilently() {
        if (this._refreshAttempts >= 3) {
            log.warn('Demasiados intentos de refresh silencioso. Se pedirá login en la próxima acción.');
            return;
        }
        this._refreshAttempts++;

        log.info('Intentando refresh silencioso del token...');
        try {
            await new Promise((resolve, reject) => {
                this.tokenClient.callback = (resp) => {
                    if (resp.error) {
                        reject(resp);
                        return;
                    }
                    if (window.gapi?.client) window.gapi.client.setToken(resp);
                    const expiresIn = resp.expires_in || 3599;
                    this.tokenExpiration = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
                    this._refreshAttempts = 0;
                    
                    // GUARDAR REFRESH
                    this._saveTokenToStorage(resp);

                    log.success(`Token renovado silenciosamente. Válido hasta ${new Date(this.tokenExpiration).toLocaleTimeString()}`);
                    this._scheduleRefresh(expiresIn);
                    resolve(resp);
                };
                // prompt: '' = intenta sin popup (silent refresh)
                this.tokenClient.requestAccessToken({ prompt: '' });
            });
        } catch (err) {
            log.warn('Refresh silencioso falló. Se pedirá login en la próxima acción.', err);
        }
    },

    /**
     * Retorna info del estado del token para debugging
     */
    getTokenHealth() {
        const token = window.gapi?.client?.getToken();
        const now = Date.now();
        return {
            hasToken: !!token,
            expiresAt: this.tokenExpiration ? new Date(this.tokenExpiration).toLocaleTimeString() : 'N/A',
            isValid: this.isTokenValid(),
            minutesLeft: this.tokenExpiration ? Math.round((this.tokenExpiration - now) / 60000) : 0,
            refreshScheduled: !!this._refreshTimer
        };
    }
};
