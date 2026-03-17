"""Servicios para access policies."""
from sqlalchemy.orm import Session

from modules.access_policies.repository import (
    load_all_policies,
    save_all_policies,
    get_allowed_for_routine_in_module,
)
from modules.access_policies.schemas import PoliciesResponse, PoliciesUpdate


def get_policies(db: Session) -> PoliciesResponse:
    rp, mp = load_all_policies(db)
    return PoliciesResponse(routinePolicies=rp, modulePolicies=mp)


def update_policies(db: Session, body: PoliciesUpdate) -> None:
    save_all_policies(
        db,
        body.routinePolicies or {},
        body.modulePolicies or {},
    )


def get_allowed_datasource_ids(
    db: Session, routine_slug: str, module_id: str
) -> list[str] | None:
    """
    IDs de datasources permitidos para routine en module.
    None = sin restricción (retornar todos los activos).
    [] = ninguno permitido.
    """
    ids = get_allowed_for_routine_in_module(db, routine_slug, module_id)
    rp, mp = load_all_policies(db)
    has_any = (routine_slug in rp) or (module_id in mp)
    if not ids and not has_any:
        return None  # Sin políticas configuradas = todos permitidos
    return [str(i) for i in ids]
