/**
 * WhatsAppMessaging.js
 * Servicio centralizado para generación de mensajes rápidos de WhatsApp
 */

import { AuthManager } from '../managers/AuthManager.js';
import { PatientState } from '../managers/patient/PatientState.js';

export const WhatsAppMessaging = {

    /**
     * Genera y abre un link de WhatsApp con un mensaje predefinido
     * @param {Object} appointment - Los datos de la cita
     * @param {string} type - 'cancel', 'reschedule', 'reminder'
     */
    async sendMessage(appointment, type = 'reminder') {
        if (!appointment) return;

        // 1. Obtener datos del paciente
        const profile = PatientState.patients.find(p => p.id === appointment.patientId || p.name === appointment.name);
        const nameParts = appointment.name.split(' ');
        const patientName = nameParts[0] || 'el paciente';
        const parentName = profile?.parentName || 'Mamá/Papá';
        
        // 2. Obtener datos de la cita
        const aptDate = new Date(appointment.date);
        const dateStr = aptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = aptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // 3. Obtener terapeuta
        const tKey = (appointment.therapist || 'diana').toLowerCase();
        const therapistName = tKey.charAt(0).toUpperCase() + tKey.slice(1);

        // 4. Seleccionar Plantilla
        let template = "";
        const intro = `Hola, te saludamos de Recepción de Parláre. `;

        switch (type) {
            case 'cancel':
                template = `${intro}Te informo que la sesión de ${patientName} programada para hoy ${dateStr} a las ${timeStr} con ${therapistName} ha sido CANCELADA. Quedamos a tus órdenes para cualquier duda.`;
                break;
            case 'reschedule':
                template = `${intro}Te confirmo que hemos REAGENDADO la cita con ${therapistName} para el día ${dateStr} a las ${timeStr}. ¡Nos vemos pronto!`;
                break;
            case 'no-show':
                template = `${intro}Notamos que no pudieron asistir a la sesión de hoy ${timeStr}. ¿Todo bien? Quedamos a tus órdenes por si desean reagendar.`;
                break;
            case 'welcome':
                const sched = appointment.schedule || "tu horario asignado";
                template = `¡Bienvenida a Parláre! 👋 Hemos dado de alta el perfil en nuestro sistema. Te confirmo que tu sesión recurrente ha quedado asignada para ${sched}. ¡Estamos felices de acompañarte!`;
                break;
            case 'payment':
                template = `Hola, te saludamos de Parláre. 💳 Te recordamos que la sesión del día ${dateStr} se encuentra pendiente de pago. ¡Gracias por tu apoyo!`;
                break;
            default: // reminder
                template = `${intro}Te recordamos la cita programada para el día ${dateStr} a las ${timeStr} con ${therapistName}. ¡Te esperamos!`;
                break;
        }

        // 5. Preparar Teléfono
        let phoneDigits = profile?.phone || '';
        if (phoneDigits) {
            phoneDigits = phoneDigits.replace(/\D/g, '');
        }

        // 6. Preguntar al usuario cómo enviar
        const { ModalService } = await import('../utils/ModalService.js');
        const mode = await ModalService.confirmCustom({
            title: 'Enviar WhatsApp',
            message: `¿Cómo deseas enviar el recordatorio para **${patientName}**?`,
            confirmText: '🤖 Clínica (Auto)',
            cancelText: '📱 Mi WhatsApp (Manual)',
            type: 'info'
        });

        if (mode === true) {
            // AUTOMÁTICO (Twilio)
            let vars = {};
            if (type === 'welcome') {
                vars = { "1": appointment.schedule };
            } else if (type === 'no-show') {
                vars = { "1": timeStr }; 
            } else if (type === 'payment') {
                vars = { "1": dateStr };
            } else if (type === 'reschedule') {
                vars = { "1": therapistName, "2": dateStr, "3": timeStr };
            } else if (type === 'reminder') {
                vars = { "1": dateStr, "2": timeStr, "3": therapistName };
            } else {
                vars = { "1": dateStr, "2": timeStr };
            }

            this._sendViaTwilio(phoneDigits, template, type, vars);
        } else if (mode === false) {
            // MANUAL (wa.me)
            this._sendViaManual(phoneDigits, template);
        }
    },

    async _sendViaTwilio(phone, message, type = 'reminder', variables = null) {
        if (!phone) {
            const { ToastService } = await import('../utils/ToastService.js');
            ToastService.error('El paciente no tiene teléfono registrado.');
            return;
        }

        const { ToastService } = await import('../utils/ToastService.js');
        ToastService.info('Enviando vía Twilio...');

        // DICCIONARIO DE PLANTILLAS (Aquí es donde pondrás los SIDs de Meta)
        const TEMPLATE_SIDS = {
            'reminder': 'HXa1dc17f5edd3b774ef3ab3b92088035b', 
            'cancel': 'PONER_AQUI_SID_CANCELACION',
            'reschedule': 'HX9de65123a2d3b426f0b644ef2593d53e',
            'no-show': 'HX91155fde499d8551099df309515b1c68',
            'welcome': 'PONER_AQUI_SID_BIENVENIDA',
            'payment': 'PONER_AQUI_SID_PAGO'
        };

        try {
            const payload = {
                phone: phone,
                message: message, // Fallback por si la plantilla falla
                key: 'parlare_secret_2026'
            };

            // Seleccionar el SID correcto según el tipo de mensaje
            const sid = TEMPLATE_SIDS[type] || TEMPLATE_SIDS['reminder'];

            if (variables) {
                payload.variables = variables;
                payload.template_sid = sid;
            }

            const response = await fetch('https://parlare-webhook.onrender.com/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.status === 'success') {
                ToastService.success('¡Mensaje enviado por la Clínica!');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Twilio Error:', error);
            ToastService.error('No se pudo enviar. Intenta el modo manual.');
        }
    },

    _sendViaManual(phone, template) {
        let phoneDigits = phone;
        if (phoneDigits && !phoneDigits.startsWith('52') && phoneDigits.length === 10) {
            phoneDigits = '52' + phoneDigits;
        }

        const encodedMsg = encodeURIComponent(template);
        const url = phoneDigits 
            ? `https://wa.me/${phoneDigits}?text=${encodedMsg}`
            : `https://wa.me/?text=${encodedMsg}`;
            
        window.open(url, '_blank');
    }
};
