"""
SaaS Modelo A — utilidades de migración clinicId.
"""

from firebase_admin import firestore
from firebase_functions import https_fn

# Emails con permiso para ejecutar backfill (alineado con firestore.rules isSuper)
_SUPER_EMAILS = {
    'rodriguezd.danielrob@gmail.com',
    'lopezcarpio7@gmail.com',
    'yaritzajocgo@gmail.com',
    'kaiteff@gmail.com',
}

_BACKFILL_COLLECTIONS = (
    'appointments',
    'patientProfiles',
)


def _is_super(email: str | None) -> bool:
    return bool(email and email.lower() in _SUPER_EMAILS)


@https_fn.on_call()
def backfillClinicId(req: https_fn.CallableRequest) -> dict:
    """
    Añade clinicId a documentos legacy sin el campo.
    Payload: { "clinicId": "centro_parlare", "dryRun": true, "limit": 500 }
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message='Autenticación requerida.',
        )

    email = (req.auth.token or {}).get('email')
    if not _is_super(email):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message='Solo super usuarios pueden ejecutar backfill.',
        )

    data = req.data or {}
    clinic_id = data.get('clinicId') or 'centro_parlare'
    dry_run = bool(data.get('dryRun', True))
    batch_limit = int(data.get('limit', 500))
    batch_limit = max(1, min(batch_limit, 2000))

    db = firestore.client()
    summary = {'clinicId': clinic_id, 'dryRun': dry_run, 'collections': {}}

    for col_name in _BACKFILL_COLLECTIONS:
        col_ref = db.collection(col_name)
        docs = col_ref.limit(batch_limit).stream()
        to_update = []
        for snap in docs:
            doc_data = snap.to_dict() or {}
            if doc_data.get('clinicId'):
                continue
            to_update.append(snap.reference)

        updated = 0
        if not dry_run and to_update:
            batch = db.batch()
            for i, ref in enumerate(to_update):
                batch.update(ref, {'clinicId': clinic_id})
                if (i + 1) % 400 == 0:
                    batch.commit()
                    batch = db.batch()
            batch.commit()
            updated = len(to_update)

        summary['collections'][col_name] = {
            'pending': len(to_update),
            'updated': updated if not dry_run else 0,
        }

    return summary
