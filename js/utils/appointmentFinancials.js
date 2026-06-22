/**
 * Resolución de cuota Parláre y desglose por cita.
 * Regla: el perfil del paciente manda; manual en cita solo si override intencional (≠ perfil).
 */

export function isStalePanelDefaultManual(storedClinicFee, profileClinicFee, therapistDefaults) {
    if (!Number.isFinite(storedClinicFee) || !Number.isFinite(profileClinicFee) || !therapistDefaults) {
        return false;
    }
    if (storedClinicFee === profileClinicFee) return false;
    return storedClinicFee === therapistDefaults.clinicFee;
}

export function getProfileClinicFee(profile, therapistDefaults) {
    if (profile?.clinicFee !== undefined && profile?.clinicFee !== null && profile.clinicFee !== '') {
        const parsed = parseFloat(profile.clinicFee);
        if (Number.isFinite(parsed)) return parsed;
    }
    return therapistDefaults.clinicFee;
}

export function isIntentionalPerAppointmentOverride(appointment, profileClinicFee, therapistDefaults) {
    if (!appointment || !therapistDefaults) return false;
    const stored = parseFloat(appointment.manualClinicFee);
    if (!Number.isFinite(stored)) return false;
    if (stored === profileClinicFee) return false;
    return !isStalePanelDefaultManual(stored, profileClinicFee, therapistDefaults);
}

/**
 * Desglose efectivo para UI, pagos y Sheets.
 * @returns {{ clinicFee, therapistPay, planningPay, planningTherapist, showBreakdownSection, source, isIntentionalOverride }}
 */
export function resolveEffectiveFinancials(appointment, profile, therapistDefaults) {
    const cost = parseFloat(appointment?.cost) || parseFloat(profile?.defaultCost) || therapistDefaults.cost || 0;
    const profileClinicFee = getProfileClinicFee(profile, therapistDefaults);
    const storedSession = appointment?.manualTherapistPay != null ? parseFloat(appointment.manualTherapistPay) : NaN;
    const storedPlanning = appointment?.manualPlanningPay != null ? parseFloat(appointment.manualPlanningPay) : NaN;
    const planningTherapist = appointment?.planningTherapist || '';
    const planningFromApt = Number.isFinite(storedPlanning) ? storedPlanning : 0;

    if (isIntentionalPerAppointmentOverride(appointment, profileClinicFee, therapistDefaults)) {
        const clinicFee = parseFloat(appointment.manualClinicFee);
        const planningPay = planningTherapist ? planningFromApt : 0;
        const therapistPay = Number.isFinite(storedSession)
            ? storedSession
            : Math.max(0, cost - clinicFee - planningPay);
        return {
            clinicFee,
            therapistPay,
            planningPay,
            planningTherapist,
            showBreakdownSection: true,
            source: 'appointment-override',
            isIntentionalOverride: true
        };
    }

    const clinicFee = profileClinicFee;
    const planningPay = planningTherapist ? planningFromApt : 0;
    const therapistPay = Math.max(0, cost - clinicFee - planningPay);

    return {
        clinicFee,
        therapistPay,
        planningPay,
        planningTherapist,
        showBreakdownSection: !!planningTherapist || planningPay > 0,
        source: 'profile',
        isIntentionalOverride: false
    };
}

export function resolveClinicFeeFromAppointment(appointment, profileOrDefaultClinicFee, therapistDefaults = null) {
    if (!appointment) return profileOrDefaultClinicFee;

    const profileFee = profileOrDefaultClinicFee;
    const storedManual = appointment.manualClinicFee != null ? parseFloat(appointment.manualClinicFee) : NaN;

    if (Number.isFinite(storedManual) && therapistDefaults) {
        if (isIntentionalPerAppointmentOverride(appointment, profileFee, therapistDefaults)) {
            return storedManual;
        }
        if (!isStalePanelDefaultManual(storedManual, profileFee, therapistDefaults)) {
            if (storedManual === profileFee) return profileFee;
        }
    } else if (Number.isFinite(storedManual) && !therapistDefaults) {
        return storedManual;
    }

    if (appointment.clinicFee != null) {
        const stored = parseFloat(appointment.clinicFee);
        if (Number.isFinite(stored)) {
            if (therapistDefaults && isStalePanelDefaultManual(stored, profileFee, therapistDefaults)) {
                return profileFee;
            }
            if (therapistDefaults && stored !== profileFee && stored === therapistDefaults.clinicFee) {
                return profileFee;
            }
            return stored;
        }
    }

    return profileFee;
}

export function hasManualFinancialBreakdown(appointment, profile = null, therapistDefaults = null) {
    if (!appointment) return false;
    if (appointment.planningTherapist) return true;
    if (profile && therapistDefaults) {
        const profileFee = getProfileClinicFee(profile, therapistDefaults);
        return isIntentionalPerAppointmentOverride(appointment, profileFee, therapistDefaults);
    }
    return (
        (appointment.manualClinicFee !== undefined && appointment.manualClinicFee !== null) ||
        (appointment.manualTherapistPay !== undefined && appointment.manualTherapistPay !== null) ||
        (appointment.manualPlanningPay !== undefined && appointment.manualPlanningPay !== null)
    );
}

/**
 * Payload para SheetService.logPayment (columnas Parláre / Sesión / Planeación).
 */
export function buildSheetFinancialPayload(appointment, profileClinicFee, therapistDefaults = null) {
    const td = therapistDefaults || { clinicFee: profileClinicFee, cost: parseFloat(appointment?.cost) || 0 };
    const profile = { clinicFee: profileClinicFee };
    const fin = resolveEffectiveFinancials(appointment, profile, td);
    const payload = {
        clinicFee: fin.clinicFee,
        therapistPay: fin.therapistPay,
        planningPay: fin.planningPay || 0
    };
    if (fin.planningTherapist) payload.planningTherapist = fin.planningTherapist;
    return payload;
}

/**
 * Lee el panel «Ajuste Manual» del modal de cita (solo si está visible).
 * @returns {{ fields: Object, effectiveClinicFee: number|null, hasOverride: boolean }}
 */
export function collectManualFinancialsFromDom(dom) {
    const sectionOpen = dom.financialBreakdownSection
        && !dom.financialBreakdownSection.classList.contains('hidden');

    if (!sectionOpen) {
        return { fields: {}, effectiveClinicFee: null, hasOverride: false };
    }

    const fields = {};
    const parsedClinic = parseFloat(dom.manualClinicFee?.value);
    const parsedSession = parseFloat(dom.manualTherapistPay?.value);
    const parsedPlanning = parseFloat(dom.manualPlanningPay?.value);

    if (Number.isFinite(parsedClinic)) fields.manualClinicFee = parsedClinic;
    if (Number.isFinite(parsedSession)) fields.manualTherapistPay = parsedSession;
    if (Number.isFinite(parsedPlanning)) fields.manualPlanningPay = parsedPlanning;
    if (dom.planningTherapist?.value) fields.planningTherapist = dom.planningTherapist.value;

    const hasOverride = Object.keys(fields).length > 0;
    const effectiveClinicFee = Number.isFinite(parsedClinic) ? parsedClinic : null;

    return { fields, effectiveClinicFee, hasOverride };
}

/**
 * Campos financieros al guardar cita: perfil por defecto; manual solo si el panel está abierto.
 */
export function buildFinancialFieldsForSave(manualFromDom, profile, therapistDefaults) {
    const profileClinicFee = getProfileClinicFee(profile, therapistDefaults);

    if (manualFromDom.hasOverride) {
        return {
            ...manualFromDom.fields,
            clinicFee: manualFromDom.effectiveClinicFee ?? profileClinicFee
        };
    }

    return {
        clinicFee: profileClinicFee,
        manualClinicFee: null,
        manualTherapistPay: null,
        manualPlanningPay: null
    };
}

/**
 * Alinea clinicFee de la cita con el desglose efectivo (perfil → override intencional).
 */
export function alignClinicFeeSnapshot(appointment, profileClinicFee, therapistDefaults = null) {
    const td = therapistDefaults || { clinicFee: profileClinicFee };
    const clinicFee = resolveClinicFeeFromAppointment(appointment, profileClinicFee, td);
    const patch = { clinicFee };

    if (isIntentionalPerAppointmentOverride(appointment, profileClinicFee, td)) {
        patch.manualClinicFee = parseFloat(appointment.manualClinicFee);
    }

    return patch;
}

/**
 * Resumen del desglose que irá a App_Data al marcar pagado / no pagado.
 */
export function buildPaymentExcelPreview(appointment, profile, therapistDefaults) {
    const cost = parseFloat(appointment?.cost) || parseFloat(profile?.defaultCost) || therapistDefaults.cost || 0;
    const fin = resolveEffectiveFinancials(appointment, profile, therapistDefaults);
    return { cost, ...fin };
}
