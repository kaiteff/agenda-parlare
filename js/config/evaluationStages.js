/**
 * Etapas del proceso de evaluación (Entrevista → Evaluación → Entrega).
 * Usado al crear citas, recordatorios WhatsApp E1 y títulos de Google Calendar.
 */

export const EVALUATION_STAGES = [
    { stage: 1, key: 'entrevista', label: 'Entrevista' },
    { stage: 2, key: 'evaluacion', label: 'Evaluación' },
    { stage: 3, key: 'entrega', label: 'Entrega de resultados' }
];

/**
 * @param {number} stageNum
 * @returns {string}
 */
export function getStageLabel(stageNum) {
    const n = stageNum <= 3 ? stageNum : 2;
    return EVALUATION_STAGES.find((s) => s.stage === n)?.label || `Etapa ${stageNum}`;
}

/**
 * Texto para WhatsApp / UI: «Entrevista — cita 1 de 3»
 * @param {number} stageNum
 * @param {number} [plannedSessions=3]
 * @returns {string}
 */
export function getStageDisplayName(stageNum, plannedSessions = 3) {
    const label = getStageLabel(stageNum);
    if (stageNum > plannedSessions) {
        return `${label} (sesión adicional)`;
    }
    return `${label} — cita ${stageNum} de ${plannedSessions}`;
}

/**
 * Campos de evaluación para un documento de cita.
 * @param {number} stageNum
 * @param {object|number} profileOrPlanned — perfil o número de sesiones planeadas
 * @returns {{ isEvaluation: true, evaluationStage: number, stageName: string }}
 */
export function buildEvaluationAppointmentFields(stageNum, profileOrPlanned = 3) {
    const planned = typeof profileOrPlanned === 'number'
        ? profileOrPlanned
        : (profileOrPlanned?.evaluationMeta?.plannedSessions || 3);

    return {
        isEvaluation: true,
        evaluationStage: stageNum,
        stageName: getStageDisplayName(stageNum, planned)
    };
}

/**
 * Aplica tags de evaluación si el perfil lo requiere y la cita aún no los tiene.
 * @param {object} appointmentData
 * @param {object|null} profile
 * @param {number|null} [explicitStage]
 */
export function applyEvaluationTagsIfNeeded(appointmentData, profile, explicitStage = null) {
    if (!profile || profile.treatmentType !== 'evaluation') {
        return appointmentData;
    }
    if (appointmentData.isEvaluation && appointmentData.evaluationStage != null) {
        return appointmentData;
    }
    const stage = explicitStage ?? profile.evaluationStage ?? 1;
    return {
        ...appointmentData,
        ...buildEvaluationAppointmentFields(stage, profile)
    };
}

/**
 * Ordena citas por fecha y asigna etapas 1, 2, 3… en secuencia.
 * @param {Array<object>} entries — cada item debe tener `date`
 * @param {object|null} profile
 * @returns {Array<object>}
 */
export function buildEvaluationBatch(entries, profile) {
    if (!profile || profile.treatmentType !== 'evaluation' || !entries?.length) {
        return entries || [];
    }

    const sorted = [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let nextStage = profile.evaluationStage || 1;
    const maxStage = (profile.evaluationMeta?.plannedSessions || 3) + 1;

    return sorted.map((entry) => {
        const tagged = applyEvaluationTagsIfNeeded(entry, profile, nextStage);
        nextStage = Math.min(nextStage + 1, maxStage);
        return tagged;
    });
}
