"""
Router del módulo de volúmenes remotos.
Prefijo: /volumes  (registrado en main.py como /api/v1/volumes)

El router extrae contexto de auditoría (IP, user-agent) del Request y
lo pasa al service para que quede registrado en app_volume_audit_logs.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from core.dependencies import DbSession
from core.security import UserContext, get_current_user
from modules.volumes.repository import AuditContext
from modules.volumes.schemas import (
    AppVolumeConnectionTestResponse,
    AppVolumeCreate,
    AppVolumeResponse,
    AppVolumeUpdate,
    CopyEntryRequest,
    CreateFolderRequest,
    DirectoryListResponse,
    FilePreviewResponse,
    RenameEntryRequest,
    UploadResponse,
)
from modules.volumes.service import (
    copy_entry,
    create_folder,
    create_volume_service,
    delete_entry,
    delete_volume_service,
    download_directory_zip,
    download_file_stream,
    get_volume,
    list_directory,
    list_volumes,
    preview_file,
    rename_entry,
    test_connection,
    update_volume_service,
    upload_file,
)

router = APIRouter(prefix="/volumes", tags=["volumes"])


def _audit_ctx(request: Request, user: UserContext) -> AuditContext:
    """Construye el AuditContext desde el request HTTP y el usuario autenticado."""
    return AuditContext(
        user_id=user.oid,
        user_email=user.email,
        username=user.name,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


# ---------------------------------------------------------------------------
# Gestión de volúmenes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AppVolumeResponse])
def list_all(
    db: DbSession,
    module: str | None = Query(None),
    user: UserContext = Depends(get_current_user),
):
    """Lista todos los volúmenes registrados. Opcionalmente filtra por módulo."""
    return list_volumes(db, module=module)


@router.post("", response_model=AppVolumeResponse, status_code=status.HTTP_201_CREATED)
def create_one(
    request: Request,
    body: AppVolumeCreate,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Registra un nuevo volumen remoto."""
    return create_volume_service(db, body, _audit_ctx(request, user))


@router.get("/{volume_id}", response_model=AppVolumeResponse)
def get_one(
    volume_id: UUID,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Obtiene el detalle de un volumen."""
    return get_volume(db, volume_id)


@router.put("/{volume_id}", response_model=AppVolumeResponse)
def update_one(
    volume_id: UUID,
    request: Request,
    body: AppVolumeUpdate,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Actualiza un volumen existente."""
    return update_volume_service(db, volume_id, body, _audit_ctx(request, user))


@router.delete("/{volume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_one(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Elimina un volumen y su configuración."""
    delete_volume_service(db, volume_id, _audit_ctx(request, user))


@router.post("/{volume_id}/test-connection", response_model=AppVolumeConnectionTestResponse)
def test_conn(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Prueba la conectividad con el servidor remoto del volumen."""
    return test_connection(db, volume_id, _audit_ctx(request, user))


# ---------------------------------------------------------------------------
# Explorador de archivos
# ---------------------------------------------------------------------------

@router.get("/{volume_id}/entries", response_model=DirectoryListResponse)
def list_dir(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query("/", description="Ruta del directorio a listar"),
    user: UserContext = Depends(get_current_user),
):
    """Lista el contenido de un directorio dentro del volumen."""
    return list_directory(db, volume_id, path, _audit_ctx(request, user))


@router.get("/{volume_id}/preview", response_model=FilePreviewResponse)
def preview(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query(..., description="Ruta del archivo a previsualizar"),
    user: UserContext = Depends(get_current_user),
):
    """Retorna el contenido legible de un archivo soportado (txt, json, csv, imagen)."""
    return preview_file(db, volume_id, path, _audit_ctx(request, user))


@router.get("/{volume_id}/download-dir")
def download_dir(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query(..., description="Ruta del directorio a descargar como ZIP"),
    user: UserContext = Depends(get_current_user),
):
    """Descarga un directorio del volumen como archivo ZIP."""
    stream, zip_filename = download_directory_zip(db, volume_id, path, _audit_ctx(request, user))
    headers = {"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    return StreamingResponse(stream, media_type="application/zip", headers=headers)


@router.get("/{volume_id}/download")
def download(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query(..., description="Ruta del archivo a descargar"),
    user: UserContext = Depends(get_current_user),
):
    """Descarga un archivo del volumen como stream binario."""
    stream, mime_type, filename = download_file_stream(db, volume_id, path, _audit_ctx(request, user))
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(stream, media_type=mime_type, headers=headers)


@router.post("/{volume_id}/upload", response_model=UploadResponse)
async def upload(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query("/", description="Directorio destino dentro del volumen"),
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
):
    """Sube un archivo al directorio especificado del volumen."""
    data = await file.read()
    return upload_file(db, volume_id, path, data, file.filename or "upload", _audit_ctx(request, user))


@router.post("/{volume_id}/folders")
def create_dir(
    volume_id: UUID,
    request: Request,
    body: CreateFolderRequest,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Crea una nueva carpeta en el volumen."""
    return create_folder(db, volume_id, body, _audit_ctx(request, user))


@router.patch("/{volume_id}/entries/rename")
def rename(
    volume_id: UUID,
    request: Request,
    body: RenameEntryRequest,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Renombra un archivo o carpeta."""
    return rename_entry(db, volume_id, body, _audit_ctx(request, user))


@router.post("/{volume_id}/entries/copy")
def copy(
    volume_id: UUID,
    request: Request,
    body: CopyEntryRequest,
    db: DbSession,
    user: UserContext = Depends(get_current_user),
):
    """Copia o duplica un archivo o carpeta."""
    return copy_entry(db, volume_id, body, _audit_ctx(request, user))


@router.delete("/{volume_id}/entries")
def delete_entry_endpoint(
    volume_id: UUID,
    request: Request,
    db: DbSession,
    path: str = Query(..., description="Ruta del archivo o carpeta a eliminar"),
    user: UserContext = Depends(get_current_user),
):
    """Elimina un archivo o carpeta del volumen."""
    return delete_entry(db, volume_id, path, _audit_ctx(request, user))
