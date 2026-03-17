"""
Queries de persistencia para AppVolume y VolumeAuditLog.
Solo acceso a PostgreSQL — sin lógica de negocio.
"""
from uuid import UUID
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from modules.volumes.models import AppVolume, VolumeAuditLog


# ---------------------------------------------------------------------------
# AppVolume — CRUD
# ---------------------------------------------------------------------------

def get_all_volumes(db: Session, module: Optional[str] = None) -> list[AppVolume]:
    q = db.query(AppVolume)
    if module:
        q = q.filter(AppVolume.module == module)
    return q.order_by(AppVolume.name).all()


def get_volume_by_id(db: Session, volume_id: UUID) -> Optional[AppVolume]:
    return db.query(AppVolume).filter(AppVolume.id == volume_id).first()


def create_volume(db: Session, **kwargs) -> AppVolume:
    vol = AppVolume(**kwargs)
    db.add(vol)
    db.commit()
    db.refresh(vol)
    return vol


def update_volume(db: Session, vol: AppVolume, **kwargs) -> AppVolume:
    for key, value in kwargs.items():
        setattr(vol, key, value)
    db.commit()
    db.refresh(vol)
    return vol


def delete_volume(db: Session, vol: AppVolume) -> None:
    db.delete(vol)
    db.commit()


# ---------------------------------------------------------------------------
# VolumeAuditLog — escritura
# ---------------------------------------------------------------------------

@dataclass
class AuditContext:
    """Contexto de auditoría extraído del request HTTP."""
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


def create_audit_log(
    db: Session,
    *,
    action: str,
    module: str,
    status: str,
    audit_ctx: AuditContext,
    volume_id: Optional[UUID] = None,
    volume_name: Optional[str] = None,
    source_path: Optional[str] = None,
    target_path: Optional[str] = None,
    destination_path: Optional[str] = None,
    error_message: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> VolumeAuditLog:
    log = VolumeAuditLog(
        user_id=audit_ctx.user_id,
        user_email=audit_ctx.user_email,
        username=audit_ctx.username,
        action=action,
        module=module,
        volume_id=volume_id,
        volume_name=volume_name,
        source_path=source_path,
        target_path=target_path,
        destination_path=destination_path,
        status=status,
        error_message=error_message,
        metadata_=metadata,
        ip_address=audit_ctx.ip_address,
        user_agent=audit_ctx.user_agent,
    )
    db.add(log)
    db.commit()
    return log
