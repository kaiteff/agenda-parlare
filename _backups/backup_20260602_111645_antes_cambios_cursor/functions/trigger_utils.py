"""Utilidades compartidas para triggers Firestore on_document_written."""


def snapshot_dict(snap) -> dict | None:
    """Evita AttributeError cuando before/after es None (create/delete)."""
    if snap is None:
        return None
    try:
        if not snap.exists:
            return None
    except AttributeError:
        return None
    return snap.to_dict()


def change_before_after(change) -> tuple[dict | None, dict | None]:
    if change is None:
        return None, None
    return snapshot_dict(change.before), snapshot_dict(change.after)
