/**
 * SheetService.js
 * Servicio para integrar pagos con Google Sheets
 */

import { ToastService } from '../../utils/ToastService.js';
import { GoogleAuthService } from './GoogleAuthService.js';

export const SheetService = {
    // Configuración MULTI-ARCHIVO
    // El usuario debe rellenar los IDs de SUS archivos existentes de Diana y Sam
    config: {
        spreadsheets: {
            diana: '1KUoPue_fekBpXVzdo9MxguqV5Cvl85AVEizX-SpmSZ4',
            sam: '1XKpgEE59wZ3BdbMfhcoJnyDJ064nFJRO7VhUvAb2Mjg'
        },
        // Nombre fijo de la pestaña donde la App escribirá en CADA archivo
        targetSheetName: 'App_Data'
    },

    /**
     * Registra un pago en el archivo Google Sheet correspondiente al terapeuta
     * @param {Object} paymentData 
     * @param {boolean} isRetry - Si es un reintento automático tras fallo de auth
     */
    async logPayment(paymentData, isRetry = false) {
        console.log(`📝 SheetService: Preparando para registrar pago (Intento: ${isRetry ? 2 : 1})...`, paymentData);

        const therapistKey = paymentData.therapist?.toLowerCase() || 'diana';
        const targetSpreadsheetId = this.config.spreadsheets[therapistKey];

        // 1. Validar configuración
        if (!targetSpreadsheetId || targetSpreadsheetId.includes('ID_ARCHIVO')) {
            console.warn(`⚠️ SheetService: ID de hoja no configurado para ${therapistKey}.`);
            ToastService.info(`Falta configurar hoja de ${therapistKey}. Pago guardado solo en App.`);
            return false;
        }

        if (!GoogleAuthService.isConfigured()) {
            ToastService.info("Faltan credenciales de Google API.");
            return false;
        }

        try {
            console.log("🛠️ DEBUG: Intentando autenticar con Google...");
            // 2. Autenticación
            await GoogleAuthService.ensureToken(isRetry);
            console.log("🛠️ DEBUG: Autenticación exitosa. Preparando datos...");

            // 3. Preparar datos para la pestaña "App_Data"
            // Estructura: [Fecha, Hora, Paciente, Monto, Estatus, Timestamp]
            const dateObj = new Date(paymentData.date);
            const values = [
                [
                    dateObj.toLocaleDateString(), // Col A: Fecha
                    dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Col B: Hora Texto
                    paymentData.patientName,      // Col C: Paciente
                    paymentData.amount,           // Col D: Monto
                    "Pagado",                     // Col E: Estatus
                    new Date().toISOString(),     // Col F: ID Técnico
                    dateObj.getHours()            // Col G: HORA SIMPLE (Clave para fórmula) 
                ]
            ];

            const range = `${this.config.targetSheetName}!A:G`;

            console.log(`🛠️ DEBUG: Enviando a Sheet ID: ${targetSpreadsheetId}, Range: ${range}`);

            // 4. Llamada a API
            const response = await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: targetSpreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: values },
            });

            console.log("🛠️ DEBUG: Respuesta recibida de Google:", response);

            console.log(`✅ SheetService: Pago enviado a archivo de ${therapistKey}`, response);
            ToastService.success(`Sincronizado con Excel de ${therapistKey}`);
            return true;

        } catch (error) {
            console.error("❌ SheetService: Error detallado:", JSON.stringify(error, null, 2));

            // Manejo Automático de Error 403 (Permisos)
            if (error.result?.error?.code === 403 && !isRetry) {
                console.log("🔄 SheetService: Detectado error 403. Reintentando con login forzado...");
                ToastService.info("Renovando permisos de Google... Revisa la ventana emergente.");
                return this.logPayment(paymentData, true); // Reintento recursivo
            }

            // Mensajes de error específicos con instrucciones claras
            if (error.result?.error?.code === 404) {
                ToastService.error(`No encontrado. Verifica el ID del archivo de ${therapistKey}.`);
            } else if (error.result?.error?.message?.includes('Unable to parse range')) {
                const instructions = `Falta la pestaña "${this.config.targetSheetName}" en el Excel de ${therapistKey}. Créala para solucionar.`;
                console.error(instructions);
                ToastService.error(instructions, 6000);
            } else if (error.result?.error?.code === 403) {
                ToastService.error(`Acceso denegado. Verifica que tu usuario tenga permiso de EDITAR el archivo.`);
            } else {
                ToastService.error("Error de conexión con Google Sheets. Revisa la consola.");
            }
            return false;
        }
    }
};
