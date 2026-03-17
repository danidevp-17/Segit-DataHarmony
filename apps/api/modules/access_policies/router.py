"""Endpoints para access policies."""
from fastapi import APIRouter, Depends

from core.dependencies import DbSession
from core.security import get_current_user
from modules.access_policies.service import get_policies, update_policies
from modules.access_policies.schemas import PoliciesResponse, PoliciesUpdate

router = APIRouter(prefix="/access-policies", tags=["access-policies"])


def _user_dep():
    return Depends(get_current_user)


@router.get("", response_model=PoliciesResponse)
def get_policies_endpoint(db: DbSession, _user=_user_dep()):
    """Obtiene routinePolicies y modulePolicies."""
    return get_policies(db)


@router.post("")
def update_policies_endpoint(body: PoliciesUpdate, db: DbSession, _user=_user_dep()):
    """Actualiza todas las políticas."""
    update_policies(db, body)
    return {"success": True}
