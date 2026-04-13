/**
 * GoogleAuthService.js
 * Maneja la autenticación y carga de librerías de Google (GAPI + GIS)
 */

export const GoogleAuthService = {
    config: {
        clientId: '40563362456-be3keouutvtrpav0h105hqtl6cs3ubu7.apps.googleusercontent.com', // TODO: User needs to fill this
        apiKey: 'AIzaSyDKg8Ijv50hJ1nzSuNoNBpOUWNc648JoM0',     // TODO: User needs to fill this
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    },

    tokenClient: null,
    gapiInited: false,
    gisInited: false,
    tokenExpiration: null,

    /**
     * Inicializa GAPI y GIS
     * @returns {Promise<boolean>}
     */
    async init() {
        if (this.gapiInited && this.gisInited) return true;

        console.log("🔄 GoogleAuthService: Inicializando librerías...");

        try {
            await Promise.all([this.loadGapi(), this.loadGis()]);
            console.log("✅ GoogleAuthService: Librerías cargadas.");
            return true;
        } catch (error) {
            console.error("❌ GoogleAuthService: Error al inicializar", error);
            return false;
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
            console.log("🔄 GoogleAuthService: Token próximo a expirar. Renovando silenciosamente...");
        }

        // Si no, pedirlo
        return new Promise((resolve, reject) => {
            let timeoutId;
            let resolved = false;

            // Timeout de 15 segundos para evitar que se quede colgado eternamente si el popup se bloquea
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.error("❌ GoogleAuthService: Timeout esperando autenticación (posible popup bloqueado)");
                    reject(new Error("Timeout: La ventana de autenticación no respondió. Verifica si fue bloqueada."));
                }
            }, 15000);

            try {
                this.tokenClient.callback = (resp) => {
                    if (resolved) return; // Si ya expiró el timeout, ignorar
                    resolved = true;
                    clearTimeout(timeoutId);

                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    // IMPORTANTE: Inyectar el token en GAPI para que las llamadas subsiguientes lo usen
                    console.log("✅ GoogleAuthService: Token obtenido. Inyectando en GAPI...");
                    if (window.gapi && window.gapi.client) {
                        window.gapi.client.setToken(resp);
                    }

                    // Calcular expiración (expires_in viene en segundos, por defecto 3599)
                    const expiresIn = resp.expires_in || 3599;
                    // Guardamos expiración real menos 5 minutos de margen de seguridad
                    this.tokenExpiration = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
                    console.log(`🕒 GoogleAuthService: Token válido hasta ${new Date(this.tokenExpiration).toLocaleTimeString()}`);

                    resolve(resp);
                };

                // Siempre mostrar selector de cuenta para evitar usar la cuenta equivocada en móvil
                const promptConfig = 'select_account';

                console.log(`🔄 GoogleAuthService: Solicitando token (Prompt: ${promptConfig || 'auto'})...`);
                this.tokenClient.requestAccessToken({
                    prompt: promptConfig,
                    hint: 'rodriguezd.danielrob@gmail.com'
                });
            } catch (err) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    console.error("Error requesting token", err);
                    reject(err);
                }
            }
        });
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
     * Verifica si las credenciales están configuradas
     */
    isConfigured() {
        return this.config.clientId && !this.config.clientId.includes('YOUR_') &&
            this.config.apiKey && !this.config.apiKey.includes('YOUR_');
    }
};
