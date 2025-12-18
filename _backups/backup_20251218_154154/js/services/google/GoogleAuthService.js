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
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: this.config.apiKey,
                            discoveryDocs: this.config.discoveryDocs,
                        });
                        this.gapiInited = true;
                        resolve();
                    } catch (err) {
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

        // Si NO forzamos y ya tenemos token válido, usarlo
        if (!forceConsent) {
            const currentToken = window.gapi.client.getToken();
            if (currentToken) return true;
        }

        // Si no, pedirlo
        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    // IMPORTANTE: Inyectar el token en GAPI para que las llamadas subsiguientes lo usen
                    console.log("✅ GoogleAuthService: Token obtenido. Inyectando en GAPI...");
                    if (window.gapi && window.gapi.client) {
                        window.gapi.client.setToken(resp);
                    }

                    resolve(resp);
                };

                // Si forzamos consentimiento (útil para errores 403), usamos prompt: 'consent'
                // Si no, dejamos que Google decida (a veces es silencioso si ya autorizaste)
                const promptConfig = forceConsent ? 'consent' : '';

                console.log(`🔄 GoogleAuthService: Solicitando token (Prompt: ${promptConfig || 'auto'})...`);
                this.tokenClient.requestAccessToken({ prompt: promptConfig });
            } catch (err) {
                console.error("Error requesting token", err);
                reject(err);
            }
        });
    },

    /**
     * Verifica si las credenciales están configuradas
     */
    isConfigured() {
        return this.config.clientId !== 'YOUR_CLIENT_ID_HERE' &&
            this.config.apiKey !== 'YOUR_API_KEY_HERE';
    }
};
