"""Servicios para routines."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.routines.models import Routine
from modules.routines.repository import (
    get_all_routines,
    get_routine_by_id,
    get_routine_by_slug,
)
from modules.routines.schemas import RoutineResponse
from modules.data_sources.service import list_datasources


def list_routines(db: Session, module: str | None = None) -> list[RoutineResponse]:
    routines = get_all_routines(db, module)
    return [RoutineResponse.from_model(r) for r in routines]


def get_routine(db: Session, id_or_slug: str | UUID) -> Routine | None:
    """Busca por UUID o por slug."""
    if isinstance(id_or_slug, UUID):
        return get_routine_by_id(db, id_or_slug)
    # Intentar como UUID string
    try:
        uid = UUID(str(id_or_slug))
        return get_routine_by_id(db, uid)
    except (ValueError, TypeError):
        pass
    return get_routine_by_slug(db, str(id_or_slug))


def get_allowed_datasources(
    db: Session, routine_slug: str, module_id: str
) -> list[dict]:
    """
    Datasources permitidos para una routine en el módulo.
    Filtra por access policies (intersección routine ∩ module).
    """
    from modules.access_policies.service import get_allowed_datasource_ids

    ds_list = list_datasources(db)
    active = [d for d in ds_list if d.is_active]
    allowed_ids = get_allowed_datasource_ids(db, routine_slug, module_id)
    if allowed_ids is None:
        return [
            {"id": str(d.id), "name": d.name, "type": d.type}
            for d in active
        ]
    allowed_set = set(allowed_ids)
    return [
        {"id": str(d.id), "name": d.name, "type": d.type}
        for d in active
        if str(d.id) in allowed_set
    ]
