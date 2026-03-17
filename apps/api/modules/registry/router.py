"""Endpoints del registry (módulos y secciones de la app)."""
from fastapi import APIRouter, Depends

from core.database import get_db
from core.dependencies import DbSession
from core.security import get_current_user
from modules.registry.service import list_modules
from modules.registry.schemas import AppModuleSchema

router = APIRouter(prefix="/registry", tags=["registry"])


@router.get("/modules", response_model=list[AppModuleSchema])
def get_modules(db: DbSession, _user=Depends(get_current_user)):
    """
    Lista todos los módulos activos con sus secciones.
    Usado por Next.js para construir la navegación dinámica.
    """
    return list_modules(db, active_only=True)
