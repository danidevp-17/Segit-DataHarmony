"""Endpoints para data_sources."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from core.config import settings
from core.dependencies import DbSession
from core.security import get_current_user
from modules.data_sources.service import (
    list_datasources,
    get_datasource,
    create_datasource,
    update_datasource,
    delete_datasource,
    test_datasource_connection,
    test_connection_payload,
)
from modules.data_sources.schemas import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceResponse,
    TestConnectionBody,
    TestConnectionResponse,
)

router = APIRouter(prefix="/data-sources", tags=["data-sources"])


@router.get("", response_model=list[DataSourceResponse])
def list_all(db: DbSession, _user=Depends(get_current_user)):
    """Lista todos los data sources (sin contraseña)."""
    return list_datasources(db)


@router.post("", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
def create_one(body: DataSourceCreate, db: DbSession, _user=Depends(get_current_user)):
    """Crea un data source. Valida conexión antes de guardar (opcional en backend)."""
    # Validar conexión antes de guardar
    result = test_connection_payload(body.model_dump())
    if not result["ok"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": f"Connection validation failed: {result['message']}",
                "testError": result["message"],
                "details": result.get("details"),
            },
        )
    try:
        return create_datasource(db, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/test", response_model=TestConnectionResponse)
def test_connection(body: TestConnectionBody, _user=Depends(get_current_user)):
    """Prueba una conexión sin guardar (payload en body)."""
    result = test_connection_payload(body.model_dump())
    return TestConnectionResponse(**result)


@router.get("/{id}", response_model=DataSourceResponse)
def get_one(id: UUID, db: DbSession, _user=Depends(get_current_user)):
    ds = get_datasource(db, id)
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datasource not found")
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


@router.put("/{id}", response_model=DataSourceResponse)
def update_one(id: UUID, body: DataSourceUpdate, db: DbSession, _user=Depends(get_current_user)):
    ds = get_datasource(db, id)
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datasource not found")
    # Si cambian datos de conexión y hay password, validar
    if body.password or body.host or body.port or body.database or body.service_name or body.username:
        from core.encryption import decrypt_password
        pwd = body.password
        if not pwd and settings.encryption_key:
            pwd = decrypt_password(ds.password_encrypted, settings.encryption_key)
        if pwd:
            payload = {
                "type": body.type or ds.type,
                "host": body.host or ds.host,
                "port": body.port or ds.port,
                "database": (body.database if body.database is not None else ds.database) or "",
                "service_name": (body.service_name if body.service_name is not None else ds.service_name) or "",
                "username": body.username or ds.username,
                "password": pwd,
                "options": (body.options if body.options is not None else ds.options) or {},
            }
            result = test_connection_payload(payload)
            if not result["ok"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error": f"Connection validation failed: {result['message']}",
                        "testError": result["message"],
                        "details": result.get("details"),
                    },
                )
    updated = update_datasource(db, id, body)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datasource not found")
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_one(id: UUID, db: DbSession, _user=Depends(get_current_user)):
    if not delete_datasource(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datasource not found")


@router.post("/{id}/test", response_model=TestConnectionResponse)
def test_one(id: UUID, db: DbSession, _user=Depends(get_current_user)):
    """Prueba la conexión de un data source guardado."""
    result = test_datasource_connection(db, id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datasource not found")
    return TestConnectionResponse(**result)
