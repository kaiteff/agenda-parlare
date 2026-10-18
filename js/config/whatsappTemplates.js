/**
 * Plantillas WhatsApp aprobadas (Twilio Content API).
 * Mantener en sync con functions/whatsapp_templates.py
 */
export const WHATSAPP_TEMPLATES = {
    BIENVENIDA_CON_OPTIN: {
        name: 'bienvenida_con_optin',
        contentSid: 'HX08f74d9b520b85acfbf9e678e434b1f6',
        buttons: { yes: 'optin_yes', no: 'optin_no' }
    },
    RECORDATORIO_CRON: {
        name: 'recordatorio_con_botones',
        contentSid: 'HX100149d5295d1839864ad33cc9e73567'
    },
    COPY_INFO_PROXIMA_CITA: {
        name: 'copy_info_proxima_cita',
        contentSid: 'HXe500a927cfbef3321fc0ba7ae7aa86d7'
    },
    /** Aprobadas 9 jul 2026 */
    MOTIVO_CANCELACION: {
        name: 'motivo_cancelacion',
        contentSid: 'HX8fa5239da35438daf405b24a6297e7d2',
        buttons: {
            enfermedad: 'cancel_enfermedad',
            viaje: 'cancel_viaje',
            otro: 'cancel_otro'
        }
    },
    RECORDATORIO_EVALUACION: {
        name: 'recordatorio_evaluacion',
        contentSid: 'HXd5b11512c2329c5373116a47d0e28398',
        buttons: { confirm: '1', cancel: '2', reception: '3' }
    },
    DIANA_SESION_EVALUACION: {
        name: 'diana_sesion_evaluacion',
        contentSid: 'HXd4336feb9605f3bbea6b55fc3ad8c0da',
        buttons: { yes: 'eval_yes', no: 'eval_no' }
    },
    DIANA_SIGUIENTE_ETAPA: {
        name: 'diana_siguiente_etapa',
        contentSid: 'HXfd9918421f300da29dbaa9a8c63cd172',
        buttons: { extra: 'eval_extra', entrega: 'eval_entrega' }
    }
};

/** @deprecated Usar BIENVENIDA_CON_OPTIN */
export const WELCOME_OPTIN_CONTENT_SID = WHATSAPP_TEMPLATES.BIENVENIDA_CON_OPTIN.contentSid;
