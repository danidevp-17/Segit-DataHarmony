"""Endpoints para routines."""
from fastapi import APIRouter, Depends, HTTPException, Query

from core.dependencies import DbSession
from core.security import get_current_user
from modules.routines.service import list_routines, get_routine, get_allowed_datasources
from modules.routines.schemas import RoutineResponse

router = APIRouter(prefix="/routines", tags=["routines"])


def _user_dep():
    return Depends(get_current_user)


@router.get("/{id_or_slug}/datasources")
def get_routine_datasources(
    id_or_slug: str,
    db: DbSession,
    moduleId: str = Query("geology_geophysics", alias="moduleId"),
    _user=_user_dep(),
):
    """
    Lista datasources permitidos para ejecutar esta routine en el módulo.
    Por ahora retorna todos los datasources; el filtrado por políticas se añadirá en un sprint posterior.
    """
    routine = get_routine(db, id_or_slug)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return get_allowed_datasources(db, routine.slug, moduleId)


@router.get("", response_model=list[RoutineResponse])
def get_routines(db: DbSession, module: str | None = None, _user=_user_dep()):
    """Lista todas las rutinas. Opcional: filtrar por module."""
    return list_routines(db, module)


@router.get("/{id_or_slug}", response_model=RoutineResponse)
def get_routine_by_id_or_slug(id_or_slug: str, db: DbSession, _user=_user_dep()):
    """Obtiene una rutina por UUID o por slug."""
    r = get_routine(db, id_or_slug)
    if not r:
        raise HTTPException(status_code=404, detail="Routine not found")
    return RoutineResponse.from_model(r)
