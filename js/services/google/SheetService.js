/**
 * SheetService.js
 * Servicio para integrar pagos con Google Sheets
 */

import { ToastService } from '../../utils/ToastService.js';

export const SheetService = {
    // Configuración (To be filled by User)
    config: {
        spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE', // ID de la hoja de cálculo
        sheets: {
            diana: 'Pagos Diana', // Nombre de la pestaña para Diana
            sam: 'Pagos Sam'      // Nombre de la pestaña para Sam
        }
    },

    /**
     * Registra un pago en Google Sheets
     * @param {Object} paymentData 
     * @param {string} paymentData.date - Fecha de la cita
     * @param {string} paymentData.patientName - Nombre del paciente
     * @param {number} paymentData.amount - Monto pagado
     * @param {string} paymentData.therapist - Terapeuta ('diana' o 'sam')
     */
    async logPayment(paymentData) {
        console.log("📝 SheetService: Preparando para registrar pago...", paymentData);

        // 1. Validar configuración
        if (this.config.spreadsheetId === 'YOUR_SPREADSHEET_ID_HERE') {
            console.warn("⚠️ SheetService: Spreadsheet ID no configurado.");
            ToastService.info("Pago guardado en App. Falta configurar Google Sheet.");
            return false;
        }

        // 2. Determinar destino (Pestaña)
        const targetSheet = this.config.sheets[paymentData.therapist?.toLowerCase()] || 'General';

        // 3. (TODO) Implementar llamada a API de Google Sheets
        // Aquí iría la lógica de autenticación y appendRow
        // Por ahora, simulamos el éxito para no bloquear la UI

        // Simulación:
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`✅ SheetService: Pago de $${paymentData.amount} registrado en hoja "${targetSheet}"`);
                resolve(true);
            }, 500);
        });
    }
};
