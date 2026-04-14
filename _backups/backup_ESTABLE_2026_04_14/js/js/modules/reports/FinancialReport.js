/**
 * FinancialReport.js
 * Genera reportes financieros basados en las citas cargadas.
 */

export const FinancialReport = {
    /**
     * Genera un reporte mensual desglosado por terapeuta
     * @param {Array} appointments - Lista de citas (objetos completos)
     * @param {Date} currentDate - Fecha actual del calendario (para determinar el mes)
     * @returns {Object} Reporte con totales y desgloses
     */
    generateMonthlyReport(appointments, currentDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Ignorar hora para comparar fechas puras

        // Estructura base del reporte
        const report = {
            meta: {
                monthName: currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                generatedAt: new Date().toISOString()
            },
            summary: {
                totalIncome: 0,
                totalPending: 0,
                totalAppointments: 0,
                completionRate: 0
            },
            byTherapist: {
                diana: { name: 'Diana', income: 0, pending: 0, count: 0, paidCount: 0 },
                sam: { name: 'Sam', income: 0, pending: 0, count: 0, paidCount: 0 }
            },
            debtors: [] // Lista de deudores
        };

        // Filtrar citas del mes/año seleccionado y que NO estén canceladas
        const monthlyAppointments = appointments.filter(appt => {
            const d = new Date(appt.date);
            return d.getMonth() === month &&
                d.getFullYear() === year &&
                !appt.isCancelled;
        });

        // Objeto temporal para agrupar deudores
        const debtorsMap = {};

        monthlyAppointments.forEach(appt => {
            const cost = parseFloat(appt.cost) || 0;
            const therapistKey = (appt.therapist || 'diana').toLowerCase();
            const isPaid = appt.isPaid;
            const apptDate = new Date(appt.date);
            const isPast = apptDate < now;

            // FIX: Obtener nombre del paciente robusamente
            const patientName = appt.patientName || appt.title || appt.name || 'Paciente Sin Nombre';

            // Asegurar que existe la clave del terapeuta
            if (!report.byTherapist[therapistKey]) {
                report.byTherapist[therapistKey] = { name: therapistKey, income: 0, pending: 0, count: 0, paidCount: 0 };
            }

            // Actualizar desglose por terapeuta
            report.byTherapist[therapistKey].count++;

            if (isPaid) {
                // Ingreso cuenta SIEMPRE si está pagado
                report.byTherapist[therapistKey].income += cost;
                report.byTherapist[therapistKey].paidCount++;
                report.summary.totalIncome += cost;
            } else {
                // Pendiente SOLO cuenta si ya pasó la fecha
                if (isPast) {
                    report.byTherapist[therapistKey].pending += cost;
                    report.summary.totalPending += cost;

                    // Agregar a lista de deudores
                    if (!debtorsMap[patientName]) {
                        debtorsMap[patientName] = {
                            name: patientName,
                            totalDebt: 0,
                            details: [],
                            therapist: therapistKey
                        };
                    }
                    debtorsMap[patientName].totalDebt += cost;
                    debtorsMap[patientName].details.push({
                        date: apptDate,
                        amount: cost
                    });
                }
            }

            // Total de citas (siempre cuenta)
            report.summary.totalAppointments++;
        });

        // Convertir mapa de deudores a array ordenado por deuda
        report.debtors = Object.values(debtorsMap)
            .sort((a, b) => b.totalDebt - a.totalDebt);

        // Calcular tasa de completitud
        if (report.summary.totalAppointments > 0) {
            const totalPaidCount = Object.values(report.byTherapist).reduce((acc, t) => acc + t.paidCount, 0);
            report.summary.completionRate = Math.round((totalPaidCount / report.summary.totalAppointments) * 100);
        }

        return report;
    },

    /**
     * Formatea moneda
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }
};
