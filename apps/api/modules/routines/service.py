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


def get_allowed_datasources(db: Session, module_id: str) -> list[dict]:
    """
    Datasources permitidos para una routine en el módulo.
    Por ahora retorna todos; el filtrado por access policies se añadirá después.
    """
    ds_list = list_datasources(db)
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "type": d.type,
        }
        for d in ds_list
        if d.is_active
    ]
