/**
 * Textos explicativos para campos preparatorios SaaS (no activos aún).
 */
export const SAAS_READY_EXPLANATION = {
    title: 'Preparado para versión multi-clínica (SaaS)',
    body:
        'Estos campos ya están guardados en la base de datos y el backend está listo, pero permanecen deshabilitados hasta activar el módulo comercial. No es un error: evitamos que el equipo use funciones a medias antes del lanzamiento oficial.',
    receiptNote:
        'El recibo automático en PDF ya funciona en el servidor cuando se active la casilla; la interfaz se habilitará en una próxima actualización.',
    profileNote:
        'Cédula e institución de egreso ya alimentan los PDF de reembolso en Cloud Functions; aquí se podrán editar cuando abramos Configuración avanzada por clínica.'
};

export function renderSaasReadyBanner(extraNote = '') {
    return `
        <div class="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 mb-3 text-left" role="note">
            <p class="text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1">${SAAS_READY_EXPLANATION.title}</p>
            <p class="text-xs text-indigo-950/90 leading-relaxed">${SAAS_READY_EXPLANATION.body}</p>
            ${extraNote ? `<p class="text-[11px] text-indigo-800 mt-2 font-medium">${extraNote}</p>` : ''}
        </div>
    `;
}
