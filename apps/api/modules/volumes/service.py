"""
Lógica de negocio para el módulo de volúmenes remotos.

Flujo de cada operación:
  1. Cargar volumen desde DB
  2. Validar que esté activo
  3. Sanitizar paths (evitar path traversal)
  4. Construir adaptador de storage
  5. Ejecutar operación
  6. Registrar auditoría (success o error)
  7. Retornar resultado o lanzar HTTPException legible
"""
import base64
import mimetypes
import os
import posixpath
import tempfile
import zipfile
from typing import Iterator, Optional
from uuid import UUID

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session

from core.config import settings
from core.encryption import encrypt_password
from modules.volumes.models import AppVolume
from modules.volumes.repository import (
    AuditContext,
    create_audit_log,
    create_volume,
    delete_volume,
    get_all_volumes,
    get_volume_by_id,
    update_volume,
)
from modules.volumes.schemas import (
    AppVolumeConnectionTestResponse,
    AppVolumeCreate,
    AppVolumeResponse,
    AppVolumeUpdate,
    CopyEntryRequest,
    CreateFolderRequest,
    DirectoryListResponse,
    FileEntryResponse,
    FilePreviewResponse,
    RenameEntryRequest,
    UploadResponse,
)
from modules.volumes.storage.base import (
    StorageAuthError,
    StorageConflictError,
    StorageConnectionError,
    StorageError,
    StorageFileTooLargeError,
    StorageNotImplementedError,
    StoragePathNotFoundError,
    StoragePermissionError,
    StorageTimeoutError,
)
from modules.volumes.storage.factory import get_adapter

# Límites configurables via variables de entorno
_PREVIEW_MAX_BYTES = int(os.environ.get("VOLUME_PREVIEW_MAX_BYTES", 524288))  # 512 KB
_UPLOAD_MAX_MB = int(os.environ.get("VOLUME_UPLOAD_MAX_MB", 100))
_UPLOAD_MAX_BYTES = _UPLOAD_MAX_MB * 1024 * 1024

# Tipos MIME soportados para preview de texto
_TEXT_PREVIEW_TYPES = {
    "text/plain", "text/csv", "application/json",
    "text/html", "text/xml", "application/xml",
    "text/markdown",
}
_IMAGE_PREVIEW_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _require_encryption_key() -> str:
    key = settings.encryption_key
    if not key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY is not configured",
        )
    return key


def _encrypt_creds(password: Optional[str], private_key: Optional[str]) -> Optional[dict]:
    """Cifra las credenciales y retorna un dict JSONB listo para guardar."""
    if not password and not private_key:
        return None
    key = _require_encryption_key()
    result: dict = {}
    if password:
        result["password"] = encrypt_password(password, key)
    if private_key:
        result["private_key"] = encrypt_password(private_key, key)
    return result


def _sanitize_path(path: str, share_path: str) -> str:
    """
    Normaliza el path y verifica que no escape del share_path del volumen.
    Previene ataques de path traversal (../../etc/passwd, etc.).
    """
    from modules.volumes.path_sanitize import InvalidVolumePathError, sanitize_path_under_share

    try:
        return sanitize_path_under_share(path, share_path)
    except InvalidVolumePathError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


def _get_active_volume(db: Session, volume_id: UUID) -> AppVolume:
    """Carga un volumen activo o lanza 404/403."""
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volume not found")
    if not vol.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Volume is inactive",
        )
    return vol


def _map_storage_error(e: StorageError) -> HTTPException:
    """Convierte StorageError a HTTPException apropiada."""
    if isinstance(e, StorageNotImplementedError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message)
    if isinstance(e, StorageAuthError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=e.message)
    if isinstance(e, (StorageConnectionError, StorageTimeoutError)):
        return HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=e.message)
    if isinstance(e, StoragePathNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    if isinstance(e, StoragePermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    if isinstance(e, StorageConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    if isinstance(e, StorageFileTooLargeError):
        return HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=e.message)
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=e.message)


def _audit(
    db: Session,
    action: str,
    status: str,
    audit_ctx: AuditContext,
    vol: Optional[AppVolume] = None,
    **kwargs,
) -> None:
    """Registra auditoría silenciosamente (no lanza en caso de error de DB)."""
    try:
        create_audit_log(
            db,
            action=action,
            module=vol.module if vol else "volumes",
            status=status,
            audit_ctx=audit_ctx,
            volume_id=vol.id if vol else None,
            volume_name=vol.name if vol else None,
            **kwargs,
        )
    except Exception as audit_err:
        logger.error("Failed to write audit log: {}", audit_err)


# ---------------------------------------------------------------------------
# CRUD de volúmenes
# ---------------------------------------------------------------------------

def list_volumes(db: Session, module: Optional[str] = None) -> list[AppVolumeResponse]:
    vols = get_all_volumes(db, module=module)
    return [AppVolumeResponse.from_model(v) for v in vols]


def get_volume(db: Session, volume_id: UUID) -> AppVolumeResponse:
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volume not found")
    return AppVolumeResponse.from_model(vol)


def create_volume_service(
    db: Session,
    body: AppVolumeCreate,
    audit_ctx: AuditContext,
) -> AppVolumeResponse:
    encrypted = _encrypt_creds(body.password, body.private_key)
    vol = create_volume(
        db,
        module=body.module,
        name=body.name,
        description=body.description,
        volume_type=body.volume_type,
        host=body.host,
        share_path=body.share_path,
        port=body.port,
        username=body.username,
        encrypted_credentials=encrypted,
    )
    _audit(db, "create_volume", "success", audit_ctx, vol)
    return AppVolumeResponse.from_model(vol)


def update_volume_service(
    db: Session,
    volume_id: UUID,
    body: AppVolumeUpdate,
    audit_ctx: AuditContext,
) -> AppVolumeResponse:
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volume not found")

    updates = body.model_dump(exclude_unset=True, by_alias=False)

    # Gestionar credenciales: actualizar solo los campos enviados
    password = updates.pop("password", None)
    private_key = updates.pop("private_key", None)

    if password is not None or private_key is not None:
        # Mezclar credenciales nuevas con las existentes
        existing_encrypted = vol.encrypted_credentials or {}
        new_encrypted = dict(existing_encrypted)
        key = _require_encryption_key()
        if password is not None:
            new_encrypted["password"] = encrypt_password(password, key) if password else None
        if private_key is not None:
            new_encrypted["private_key"] = encrypt_password(private_key, key) if private_key else None
        # Limpiar Nones
        new_encrypted = {k: v for k, v in new_encrypted.items() if v}
        updates["encrypted_credentials"] = new_encrypted or None

    update_volume(db, vol, **updates)
    _audit(db, "update_volume", "success", audit_ctx, vol)
    return AppVolumeResponse.from_model(vol)


def delete_volume_service(
    db: Session,
    volume_id: UUID,
    audit_ctx: AuditContext,
) -> None:
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volume not found")

    try:
        delete_volume(db, vol)
        _audit(db, "delete_volume", "success", audit_ctx, vol)
    except Exception as e:
        # Si la operación de borrado falla, registramos auditoría de error.
        _audit(db, "delete_volume", "error", audit_ctx, vol, error_message=str(e))
        raise


# ---------------------------------------------------------------------------
# Test de conexión
# ---------------------------------------------------------------------------

def test_connection(
    db: Session,
    volume_id: UUID,
    audit_ctx: AuditContext,
) -> AppVolumeConnectionTestResponse:
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volume not found")

    try:
        adapter = get_adapter(vol)
        result = adapter.test_connection()
        audit_status = "success" if result["ok"] else "error"
        _audit(
            db, "test_connection", audit_status, audit_ctx, vol,
            error_message=None if result["ok"] else result.get("message"),
        )
        return AppVolumeConnectionTestResponse(
            ok=result["ok"],
            message=result["message"],
            latencyMs=result.get("latency_ms"),
            errorCode=result.get("error_code"),
        )
    except StorageError as e:
        _audit(db, "test_connection", "error", audit_ctx, vol, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in test_connection: {}", e)
        _audit(db, "test_connection", "error", audit_ctx, vol, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — listado de directorio
# ---------------------------------------------------------------------------

def list_directory(
    db: Session,
    volume_id: UUID,
    path: str,
    audit_ctx: AuditContext,
) -> DirectoryListResponse:
    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)

    try:
        adapter = get_adapter(vol)
        entries = adapter.list_dir(clean_path)
        file_entries = [
            FileEntryResponse(
                name=e.name,
                path=e.path,
                type="folder" if e.is_dir else "file",
                size=e.size,
                modifiedAt=e.modified_at,
                mimeType=mimetypes.guess_type(e.name)[0] if not e.is_dir else None,
                extension=os.path.splitext(e.name)[1].lstrip(".") if not e.is_dir else None,
            )
            for e in entries
        ]
        _audit(db, "list_dir", "success", audit_ctx, vol, source_path=clean_path)
        return DirectoryListResponse(path=clean_path, entries=file_entries, total=len(file_entries))
    except StorageError as e:
        _audit(db, "list_dir", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in list_directory: {}", e)
        _audit(db, "list_dir", "error", audit_ctx, vol, source_path=clean_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — preview de archivo
# ---------------------------------------------------------------------------

def preview_file(
    db: Session,
    volume_id: UUID,
    path: str,
    audit_ctx: AuditContext,
) -> FilePreviewResponse:
    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)

    mime_type, _ = mimetypes.guess_type(clean_path)
    mime_type = mime_type or "application/octet-stream"

    # Verificar que el tipo sea soportado para preview
    is_text = mime_type in _TEXT_PREVIEW_TYPES or mime_type.startswith("text/")
    is_image = mime_type in _IMAGE_PREVIEW_TYPES

    if not is_text and not is_image:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Preview not supported for type '{mime_type}'. Download the file instead.",
        )

    try:
        adapter = get_adapter(vol)
        raw = adapter.read_file(clean_path, max_bytes=_PREVIEW_MAX_BYTES)
        truncated = False

        if is_image:
            content = base64.b64encode(raw).decode("utf-8")
            content_type = mime_type
        else:
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                text = raw.decode("latin-1", errors="replace")
            content = text
            content_type = mime_type

        _audit(db, "preview_file", "success", audit_ctx, vol, source_path=clean_path)
        return FilePreviewResponse(
            path=clean_path,
            contentType=content_type,
            content=content,
            size=len(raw),
            truncated=truncated,
        )
    except StorageFileTooLargeError as e:
        _audit(db, "preview_file", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=e.message)
    except StorageError as e:
        _audit(db, "preview_file", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in preview_file: {}", e)
        _audit(db, "preview_file", "error", audit_ctx, vol, source_path=clean_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — descarga de archivo
# ---------------------------------------------------------------------------

def download_file_stream(
    db: Session,
    volume_id: UUID,
    path: str,
    audit_ctx: AuditContext,
) -> tuple[Iterator[bytes], str, str]:
    """
    Retorna (generator, mime_type, filename) para streaming al cliente.
    La auditoría se registra antes de iniciar el stream.
    """
    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)
    filename = posixpath.basename(clean_path)
    mime_type, _ = mimetypes.guess_type(filename)
    mime_type = mime_type or "application/octet-stream"

    try:
        adapter = get_adapter(vol)
        # Verificar que existe antes de iniciar stream
        if not adapter.exists(clean_path):
            raise StoragePathNotFoundError(clean_path)
        stream = adapter.download_file(clean_path)
        _audit(db, "download_file", "success", audit_ctx, vol, source_path=clean_path)
        return stream, mime_type, filename
    except StorageError as e:
        _audit(db, "download_file", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in download_file_stream: {}", e)
        _audit(db, "download_file", "error", audit_ctx, vol, source_path=clean_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


def _walk_dir(adapter, base_path: str, current_path: str):
    """
    Genera (relative_arcname, full_path, is_dir) para cada entrada bajo current_path.
    base_path es la raíz del directorio a comprimir; relative_arcname es la ruta dentro del zip.
    """
    for e in adapter.list_dir(current_path):
        full = posixpath.join(current_path, e.name)
        rel = posixpath.relpath(full, base_path)
        if e.is_dir:
            yield (rel + "/", full, True)
            yield from _walk_dir(adapter, base_path, full)
        else:
            yield (rel, full, False)


def download_directory_zip(
    db: Session,
    volume_id: UUID,
    path: str,
    audit_ctx: AuditContext,
) -> tuple[Iterator[bytes], str]:
    """
    Comprime un directorio del volumen en ZIP y retorna (generator de bytes, filename).
    El generator lee el archivo temporal y lo elimina al terminar.
    """
    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)

    try:
        adapter = get_adapter(vol)
        if not adapter.exists(clean_path):
            raise StoragePathNotFoundError(clean_path)
        stat = adapter.stat(clean_path)
        if not stat.is_dir:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Path is not a directory",
            )

        dir_name = posixpath.basename(clean_path.rstrip("/")) or "folder"
        safe_name = "".join(c for c in dir_name if c.isalnum() or c in "._- ") or "folder"
        zip_filename = f"{safe_name}.zip"

        fd, temp_path = tempfile.mkstemp(suffix=".zip")
        os.close(fd)

        try:
            with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for rel, full, is_dir in _walk_dir(adapter, clean_path, clean_path):
                    if is_dir:
                        zf.writestr(rel, "")
                    else:
                        data = adapter.read_file(full)
                        zf.writestr(rel, data)
        except StorageError:
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
            raise

        def iter_chunks():
            try:
                with open(temp_path, "rb") as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        yield chunk
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except OSError:
                        pass

        _audit(db, "download_dir_zip", "success", audit_ctx, vol, source_path=clean_path)
        return iter_chunks(), zip_filename
    except StorageError as e:
        _audit(db, "download_dir_zip", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise _map_storage_error(e)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in download_directory_zip: {}", e)
        _audit(db, "download_dir_zip", "error", audit_ctx, vol, source_path=clean_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — upload
# ---------------------------------------------------------------------------

def upload_file(
    db: Session,
    volume_id: UUID,
    path: str,
    data: bytes,
    filename: str,
    audit_ctx: AuditContext,
) -> UploadResponse:
    if len(data) > _UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {_UPLOAD_MAX_MB} MB",
        )

    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)
    remote_path = posixpath.join(clean_path, filename)

    try:
        adapter = get_adapter(vol)
        if adapter.exists(remote_path):
            raise StorageConflictError(remote_path)
        written = adapter.upload_file(remote_path, data)
        _audit(db, "upload_file", "success", audit_ctx, vol, target_path=remote_path)
        return UploadResponse(path=remote_path, size=written, message="File uploaded successfully")
    except StorageError as e:
        _audit(db, "upload_file", "error", audit_ctx, vol, target_path=remote_path, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in upload_file: {}", e)
        _audit(db, "upload_file", "error", audit_ctx, vol, target_path=remote_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — crear carpeta
# ---------------------------------------------------------------------------

def create_folder(
    db: Session,
    volume_id: UUID,
    body: CreateFolderRequest,
    audit_ctx: AuditContext,
) -> dict:
    vol = _get_active_volume(db, volume_id)
    clean_parent = _sanitize_path(body.path_parent, vol.share_path)
    folder_path = posixpath.join(clean_parent, body.folder_name.strip("/"))
    # Validar que el path de la nueva carpeta también esté dentro del share
    clean_folder = _sanitize_path(folder_path, vol.share_path)

    try:
        adapter = get_adapter(vol)
        adapter.create_folder(clean_folder)
        _audit(db, "create_folder", "success", audit_ctx, vol, target_path=clean_folder)
        return {"path": clean_folder, "message": "Folder created successfully"}
    except StorageError as e:
        _audit(db, "create_folder", "error", audit_ctx, vol, target_path=clean_folder, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in create_folder: {}", e)
        _audit(db, "create_folder", "error", audit_ctx, vol, target_path=clean_folder, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — rename
# ---------------------------------------------------------------------------

def rename_entry(
    db: Session,
    volume_id: UUID,
    body: RenameEntryRequest,
    audit_ctx: AuditContext,
) -> dict:
    vol = _get_active_volume(db, volume_id)
    clean_src = _sanitize_path(body.source_path, vol.share_path)
    parent = posixpath.dirname(clean_src)
    clean_target = _sanitize_path(posixpath.join(parent, body.new_name), vol.share_path)

    try:
        adapter = get_adapter(vol)
        adapter.rename(clean_src, clean_target)
        _audit(db, "rename_entry", "success", audit_ctx, vol, source_path=clean_src, target_path=clean_target)
        return {"sourcePath": clean_src, "targetPath": clean_target, "message": "Renamed successfully"}
    except StorageError as e:
        _audit(
            db,
            "rename_entry",
            "error",
            audit_ctx,
            vol,
            source_path=clean_src,
            target_path=clean_target,
            error_message=e.message,
        )
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in rename_entry: {}", e)
        _audit(
            db,
            "rename_entry",
            "error",
            audit_ctx,
            vol,
            source_path=clean_src,
            target_path=clean_target,
            error_message=str(e),
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — copy / duplicate
# ---------------------------------------------------------------------------

def copy_entry(
    db: Session,
    volume_id: UUID,
    body: CopyEntryRequest,
    audit_ctx: AuditContext,
) -> dict:
    vol = _get_active_volume(db, volume_id)
    clean_src = _sanitize_path(body.source_path, vol.share_path)
    clean_dst = _sanitize_path(body.destination_path, vol.share_path)

    try:
        adapter = get_adapter(vol)
        adapter.copy(clean_src, clean_dst)
        _audit(
            db, "copy_entry", "success", audit_ctx, vol,
            source_path=clean_src, destination_path=clean_dst,
        )
        return {"sourcePath": clean_src, "destinationPath": clean_dst, "message": "Copied successfully"}
    except StorageError as e:
        _audit(
            db,
            "copy_entry",
            "error",
            audit_ctx,
            vol,
            source_path=clean_src,
            destination_path=clean_dst,
            error_message=e.message,
        )
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in copy_entry: {}", e)
        _audit(
            db,
            "copy_entry",
            "error",
            audit_ctx,
            vol,
            source_path=clean_src,
            destination_path=clean_dst,
            error_message=str(e),
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------------------------------------------------------------------------
# Explorador — delete
# ---------------------------------------------------------------------------

def delete_entry(
    db: Session,
    volume_id: UUID,
    path: str,
    audit_ctx: AuditContext,
) -> dict:
    vol = _get_active_volume(db, volume_id)
    clean_path = _sanitize_path(path, vol.share_path)

    try:
        adapter = get_adapter(vol)
        adapter.delete(clean_path)
        _audit(db, "delete_entry", "success", audit_ctx, vol, source_path=clean_path)
        return {"path": clean_path, "message": "Deleted successfully"}
    except StorageError as e:
        _audit(db, "delete_entry", "error", audit_ctx, vol, source_path=clean_path, error_message=e.message)
        raise _map_storage_error(e)
    except Exception as e:
        logger.error("Unexpected error in delete_entry: {}", e)
        _audit(db, "delete_entry", "error", audit_ctx, vol, source_path=clean_path, error_message=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")
