"""Repositorio para access policies."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.access_policies.models import AccessPolicyRoutine, AccessPolicyModule


def get_routine_policy(db: Session, routine_slug: str) -> list[UUID]:
    rows = db.query(AccessPolicyRoutine).filter(
        AccessPolicyRoutine.routine_slug == routine_slug
    ).all()
    return [r.datasource_id for r in rows]


def get_module_policy(db: Session, module_id: str) -> list[UUID]:
    rows = db.query(AccessPolicyModule).filter(
        AccessPolicyModule.module_id == module_id
    ).all()
    return [r.datasource_id for r in rows]


def get_allowed_for_routine_in_module(
    db: Session, routine_slug: str, module_id: str
) -> list[UUID]:
    """Intersección de política routine y module. Module vacío = todos permitidos."""
    routine_ids = get_routine_policy(db, routine_slug)
    module_ids = get_module_policy(db, module_id)
    if not module_ids:
        return routine_ids
    return [id for id in routine_ids if id in module_ids]


def save_routine_policy(db: Session, routine_slug: str, datasource_ids: list[UUID]) -> None:
    db.query(AccessPolicyRoutine).filter(
        AccessPolicyRoutine.routine_slug == routine_slug
    ).delete()
    for ds_id in datasource_ids:
        db.add(AccessPolicyRoutine(routine_slug=routine_slug, datasource_id=ds_id))
    db.commit()


def save_module_policy(db: Session, module_id: str, datasource_ids: list[UUID]) -> None:
    db.query(AccessPolicyModule).filter(
        AccessPolicyModule.module_id == module_id
    ).delete()
    for ds_id in datasource_ids:
        db.add(AccessPolicyModule(module_id=module_id, datasource_id=ds_id))
    db.commit()


def load_all_policies(db: Session) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    routine_rows = db.query(AccessPolicyRoutine).all()
    module_rows = db.query(AccessPolicyModule).all()

    routine_policies: dict[str, list[str]] = {}
    for r in routine_rows:
        slug = r.routine_slug
        if slug not in routine_policies:
            routine_policies[slug] = []
        routine_policies[slug].append(str(r.datasource_id))

    module_policies: dict[str, list[str]] = {}
    for m in module_rows:
        mid = m.module_id
        if mid not in module_policies:
            module_policies[mid] = []
        module_policies[mid].append(str(m.datasource_id))

    return routine_policies, module_policies


def save_all_policies(
    db: Session,
    routine_policies: dict[str, list[str]],
    module_policies: dict[str, list[str]],
) -> None:
    db.query(AccessPolicyRoutine).delete()
    db.query(AccessPolicyModule).delete()
    for slug, ids in routine_policies.items():
        for sid in ids:
            try:
                db.add(AccessPolicyRoutine(routine_slug=slug, datasource_id=UUID(sid)))
            except (ValueError, TypeError):
                pass
    for mid, ids in module_policies.items():
        for sid in ids:
            try:
                db.add(AccessPolicyModule(module_id=mid, datasource_id=UUID(sid)))
            except (ValueError, TypeError):
                pass
    db.commit()
