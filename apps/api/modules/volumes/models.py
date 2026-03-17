"""
Modelos para el módulo de volúmenes remotos.
Tablas: app_volumes, app_volume_audit_logs
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB

from shared.base_model import Base, UUIDMixin, TimestampMixin


class AppVolume(Base, UUIDMixin, TimestampMixin):
    """Volumen remoto registrado (SFTP, SMB, NFS, FTP, WebDAV)."""
    __tablename__ = "app_volumes"

    module = Column(String(64), nullable=False, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    volume_type = Column(String(32), nullable=False)  # sftp, smb, nfs, ftp, webdav
    host = Column(String(512), nullable=False)
    share_path = Column(String(1024), nullable=False)
    port = Column(Integer, nullable=True)
    username = Column(String(256), nullable=True)
    encrypted_credentials = Column(JSONB, nullable=True)  # {"password": "enc...", "private_key": "enc..."}
    is_active = Column(Boolean, default=True, nullable=False)


class VolumeAuditLog(Base, UUIDMixin):
    """Registro de auditoría de todas las acciones sobre volúmenes y archivos."""
    __tablename__ = "app_volume_audit_logs"

    user_id = Column(String(256), nullable=True)
    user_email = Column(String(256), nullable=True)
    username = Column(String(256), nullable=True)
    action = Column(String(64), nullable=False)       # create_volume, list_dir, upload, etc.
    module = Column(String(64), nullable=False)
    volume_id = Column(UUID(as_uuid=True), nullable=True)
    volume_name = Column(String(256), nullable=True)
    source_path = Column(String(2048), nullable=True)
    target_path = Column(String(2048), nullable=True)
    destination_path = Column(String(2048), nullable=True)
    status = Column(String(32), nullable=False)       # success, error
    error_message = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    ip_address = Column(String(128), nullable=True)
    user_agent = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
