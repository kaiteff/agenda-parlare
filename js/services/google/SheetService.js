/**
 * SheetService.js
 * Servicio para integrar pagos con Google Sheets
 */

import { ToastService } from '../../utils/ToastService.js';
import { GoogleAuthService } from './GoogleAuthService.js';
import { SyncStatus } from '../SyncStatus.js';
import { NetworkMonitor } from '../NetworkMonitor.js';

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
    async logPayment(paymentData, isAuthRetry = false, networkRetries = 0) {
        // 0. Verificar Conexión
        if (!NetworkMonitor.checkConnection()) {
            ToastService.error("Sin conexión a internet. No se puede sincronizar con Excel.");
            SyncStatus.setOffline();
            return false;
        }

        if (networkRetries === 0 && !isAuthRetry) SyncStatus.setSaving(); // Inicio de guardado

        console.log(`📝 SheetService: Preparando para registrar pago...`, {
            payment: paymentData,
            authRetried: isAuthRetry,
            networkAttempt: networkRetries + 1
        });

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
            // Solo loguear esto en el primer intento de red para no spamear
            if (networkRetries === 0) console.log("🛠️ DEBUG: Intentando autenticar con Google...");

            // 2. Autenticación
            await GoogleAuthService.ensureToken(isAuthRetry);

            if (networkRetries === 0) console.log("🛠️ DEBUG: Autenticación exitosa. Preparando datos...");

            // 3. Preparar datos para la pestaña "App_Data"
            // Estructura: [Fecha, Hora, Paciente, Monto, Estatus, Timestamp, HoraSimple, Parlare, Terapeuta]
            const dateObj = new Date(paymentData.date);

            // Cálculos de desglose
            const totalAmount = paymentData.amount || 0;
            const rawClinicFee = paymentData.clinicFee !== undefined ? paymentData.clinicFee : 250; // Default 250 si no viene

            // Si el monto total es negativo (anulación), el desglose también debe ser negativo
            const finalClinicFee = totalAmount < 0 ? -Math.abs(rawClinicFee) : Math.abs(rawClinicFee);
            const therapistIncome = totalAmount - finalClinicFee;

            // Force DD/MM/YYYY format specifically for Sheets formulas
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            const values = [
                [
                    dateStr, // Col A: Fecha (DD/MM/YYYY Manual)
                    dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Col B: Hora Texto
                    paymentData.patientName,      // Col C: Paciente
                    totalAmount,                  // Col D: Monto (Puede ser negativo)
                    paymentData.status || "Pagado", // Col E: Estatus (Pagado o ANULADO)
                    new Date().toISOString(),     // Col F: ID Técnico
                    dateObj.getHours(),           // Col G: HORA SIMPLE
                    finalClinicFee,               // Col H: Ingreso Parlare
                    therapistIncome               // Col I: Ingreso Terapeuta
                ]
            ];

            const range = `${this.config.targetSheetName}!A:I`;

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
            SyncStatus.setSaved(); // Éxito
            return true;

        } catch (error) {
            console.error("❌ SheetService: Error detallado:", JSON.stringify(error, null, 2));

            const errorCode = error.result?.error?.code || error.status;

            // --- MANEJO DE RETRY POR ERROR DE SERVIDOR (503, 500, etc) ---
            if ([500, 502, 503, 504, 429].includes(errorCode)) {
                const MAX_RETRIES = 5;
                if (networkRetries < MAX_RETRIES) {
                    const delay = Math.pow(2, networkRetries) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                    console.warn(`⚠️ SheetService: Error temporal ${errorCode}. Reintentando en ${delay / 1000}s... (Intento ${networkRetries + 1}/${MAX_RETRIES})`);

                    // Notificar al usuario discretamente si está tardando
                    if (networkRetries > 0) {
                        ToastService.info(`Servicio de Google ocupado. Reintentando (${networkRetries + 1})...`);
                    }

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.logPayment(paymentData, isAuthRetry, networkRetries + 1);
                } else {
                    ToastService.error(`Google Sheets no responde después de ${MAX_RETRIES} intentos. Intenta más tarde.`);
                    return false;
                }
            }

            // Manejo Automático de Error 403 (Permisos)
            // Solo si no es ya un reintento de auth
            if (errorCode === 403 && !isAuthRetry) {
                console.log("🔄 SheetService: Detectado error 403. Reintentando con login forzado...");
                ToastService.info("Renovando permisos de Google... Revisa la ventana emergente.");
                return this.logPayment(paymentData, true, 0); // Reintento recursivo de Auth (reset network retries)
            }

            // Mensajes de error específicos con instrucciones claras
            if (errorCode === 404) {
                ToastService.error(`No encontrado. Verifica el ID del archivo de ${therapistKey}.`);
            } else if (error.result?.error?.message?.includes('Unable to parse range')) {
                const instructions = `Falta la pestaña "${this.config.targetSheetName}" en el Excel de ${therapistKey}. Créala para solucionar.`;
                console.error(instructions);
                ToastService.error(instructions, 6000);
            } else if (errorCode === 403) {
                ToastService.error(`Acceso denegado. Verifica que tu usuario tenga permiso de EDITAR el archivo.`);
            } else {
                ToastService.error("Error de conexión con Google Sheets. Revisa la consola.");
            }
            SyncStatus.setError(); // Error final
            return false;
        }
    },
    /**
     * Registra un evento de asistencia/cancelación en el Sheet
     * @param {Object} eventData { date, patientName, status, therapist }
     */
    async logAttendance(eventData) {
        console.log(`📝 SheetService: Registrando asistencia/estatus...`, eventData);
        // Reutilizamos la lógica de logPayment pero con monto 0 y estatus personalizado
        return this.logPayment({
            date: eventData.date,
            patientName: eventData.patientName,
            amount: 0,
            status: eventData.status,
            therapist: eventData.therapist
        });
    }
};
