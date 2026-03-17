"""Lógica de negocio para data_sources."""
from uuid import UUID
from sqlalchemy.orm import Session

from core.config import settings
from core.encryption import encrypt_password, decrypt_password
from modules.data_sources.models import DataSource
from modules.data_sources.repository import get_all, get_by_id, create, update, delete
from modules.data_sources.schemas import DataSourceCreate, DataSourceUpdate, DataSourceResponse
from modules.data_sources.validators import test_connection as run_test_connection


def _encrypt(pwd: str) -> str:
    if not settings.encryption_key:
        raise ValueError("ENCRYPTION_KEY must be set to store datasource passwords")
    return encrypt_password(pwd, settings.encryption_key)


def _decrypt(encrypted: str) -> str:
    return decrypt_password(encrypted, settings.encryption_key)


def list_datasources(db: Session) -> list[DataSourceResponse]:
    rows = get_all(db)
    return [DataSourceResponse(
        id=r.id,
        name=r.name,
        type=r.type,
        host=r.host,
        port=r.port,
        database=r.database,
        service_name=r.service_name,
        username=r.username,
        options=r.options,
        is_active=r.is_active,
    ) for r in rows]


def get_datasource(db: Session, id: UUID) -> DataSource | None:
    return get_by_id(db, id)


def create_datasource(db: Session, body: DataSourceCreate) -> DataSourceResponse:
    encrypted = _encrypt(body.password)
    ds = create(
        db,
        name=body.name,
        type=body.type,
        host=body.host,
        port=body.port,
        database=body.database,
        service_name=body.service_name,
        username=body.username,
        password_encrypted=encrypted,
        options=body.options,
    )
    return DataSourceResponse(
        id=ds.id,
        name=ds.name,
        type=ds.type,
        host=ds.host,
        port=ds.port,
        database=ds.database,
        service_name=ds.service_name,
        username=ds.username,
        options=ds.options,
        is_active=ds.is_active,
    )


def update_datasource(db: Session, id: UUID, body: DataSourceUpdate) -> DataSourceResponse | None:
    ds = get_by_id(db, id)
    if not ds:
        return None
    kwargs = body.model_dump(exclude_unset=True)
    if "password" in kwargs and kwargs["password"]:
        kwargs["password_encrypted"] = _encrypt(kwargs.pop("password"))
    if "password" in kwargs:
        kwargs.pop("password")
    update(db, ds, **kwargs)
    return DataSourceResponse(
        id=ds.id,
        name=ds.name,
        type=ds.type,
        host=ds.host,
        port=ds.port,
        database=ds.database,
        service_name=ds.service_name,
        username=ds.username,
        options=ds.options,
        is_active=ds.is_active,
    )


def delete_datasource(db: Session, id: UUID) -> bool:
    ds = get_by_id(db, id)
    if not ds:
        return False
    delete(db, ds)
    return True


def test_datasource_connection(db: Session, id: UUID) -> dict | None:
    """Test usando credenciales guardadas."""
    ds = get_by_id(db, id)
    if not ds:
        return None
    try:
        pwd = _decrypt(ds.password_encrypted)
    except Exception:
        return {"ok": False, "message": "Cannot decrypt password", "details": None, "error_code": "DECRYPT_ERROR"}
    payload = {
        "type": ds.type,
        "host": ds.host,
        "port": ds.port,
        "database": ds.database,
        "service_name": ds.service_name,
        "username": ds.username,
        "password": pwd,
        "options": ds.options or {},
    }
    return run_test_connection(payload)


def test_connection_payload(payload: dict) -> dict:
    """Test con payload en el body (sin guardar)."""
    return run_test_connection(payload)
