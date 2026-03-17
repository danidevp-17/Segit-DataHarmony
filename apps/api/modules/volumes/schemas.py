"""
Schemas Pydantic v2 para el módulo de volúmenes remotos.
Siguen el patrón del proyecto: snake_case en backend, camelCase en respuestas al frontend.
"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Tipos permitidos de volumen
# ---------------------------------------------------------------------------
VolumeType = Literal["sftp", "smb", "nfs", "ftp", "webdav"]

VOLUME_TYPES: list[str] = ["sftp", "smb", "nfs", "ftp", "webdav"]

# ---------------------------------------------------------------------------
# AppVolume — CRUD
# ---------------------------------------------------------------------------

class AppVolumeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    module: str = Field(..., max_length=64)
    name: str = Field(..., max_length=256)
    description: Optional[str] = None
    volume_type: VolumeType = Field(..., alias="volumeType")
    host: str = Field(..., max_length=512)
    share_path: str = Field(..., max_length=1024, alias="sharePath")
    port: Optional[int] = None
    username: Optional[str] = Field(None, max_length=256)
    password: Optional[str] = None
    private_key: Optional[str] = Field(None, alias="privateKey")


class AppVolumeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = None
    volume_type: Optional[VolumeType] = Field(None, alias="volumeType")
    host: Optional[str] = Field(None, max_length=512)
    share_path: Optional[str] = Field(None, max_length=1024, alias="sharePath")
    port: Optional[int] = None
    username: Optional[str] = Field(None, max_length=256)
    password: Optional[str] = None
    private_key: Optional[str] = Field(None, alias="privateKey")
    is_active: Optional[bool] = Field(None, alias="isActive")


class AppVolumeResponse(BaseModel):
    id: str
    module: str
    name: str
    description: Optional[str]
    volumeType: str
    host: str
    sharePath: str
    port: Optional[int]
    username: Optional[str]
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

    @classmethod
    def from_model(cls, v: object) -> "AppVolumeResponse":
        return cls(
            id=str(v.id),
            module=v.module,
            name=v.name,
            description=v.description,
            volumeType=v.volume_type,
            host=v.host,
            sharePath=v.share_path,
            port=v.port,
            username=v.username,
            isActive=v.is_active,
            createdAt=v.created_at,
            updatedAt=v.updated_at,
        )


# ---------------------------------------------------------------------------
# Connection test
# ---------------------------------------------------------------------------

class AppVolumeConnectionTestResponse(BaseModel):
    ok: bool
    message: str
    latencyMs: Optional[int] = None
    errorCode: Optional[str] = None


# ---------------------------------------------------------------------------
# File Browser — entradas
# ---------------------------------------------------------------------------

class FileEntryResponse(BaseModel):
    name: str
    path: str
    type: Literal["file", "folder"]
    size: Optional[int] = None
    modifiedAt: Optional[datetime] = None
    mimeType: Optional[str] = None
    extension: Optional[str] = None


class DirectoryListResponse(BaseModel):
    path: str
    entries: list[FileEntryResponse]
    total: int


class FilePreviewResponse(BaseModel):
    path: str
    contentType: str
    content: str           # texto o base64 para imágenes
    size: int
    truncated: bool


# ---------------------------------------------------------------------------
# Operaciones sobre entradas
# ---------------------------------------------------------------------------

class CreateFolderRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    path_parent: str = Field(..., alias="pathParent")
    folder_name: str = Field(..., alias="folderName")


class RenameEntryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_path: str = Field(..., alias="sourcePath")
    new_name: str = Field(..., alias="newName")


class CopyEntryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_path: str = Field(..., alias="sourcePath")
    destination_path: str = Field(..., alias="destinationPath")


class UploadResponse(BaseModel):
    path: str
    size: int
    message: str
