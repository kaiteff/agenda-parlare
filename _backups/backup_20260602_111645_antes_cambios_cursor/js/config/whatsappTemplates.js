/**
 * Plantillas WhatsApp aprobadas / en revisión (Twilio Content API).
 * Fase C — bienvenida_con_optin (botones optin_yes / optin_no)
 */
export const WHATSAPP_TEMPLATES = {
    BIENVENIDA_CON_OPTIN: {
        name: 'bienvenida_con_optin',
        contentSid: 'HX08f74d9b520b85acfbf9e678e434b1f6',
        buttons: {
            yes: 'optin_yes',
            no: 'optin_no'
        }
    }
};

/** @deprecated Usar BIENVENIDA_CON_OPTIN — alias para envíos manuales desde ficha */
export const WELCOME_OPTIN_CONTENT_SID = WHATSAPP_TEMPLATES.BIENVENIDA_CON_OPTIN.contentSid;
