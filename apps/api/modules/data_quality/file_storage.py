"""Almacenamiento de archivos en disco para Data Quality."""
import os
from pathlib import Path
from uuid import UUID

from core.config import settings


def _uploads_dir() -> Path:
    path = Path(settings.dq_uploads_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_file_path(file_id: UUID | str) -> Path:
    return _uploads_dir() / str(file_id)


def save_file(file_id: UUID | str, content: bytes) -> None:
    path = get_file_path(file_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def read_file(file_id: UUID | str) -> bytes:
    return get_file_path(file_id).read_bytes()


def delete_file(file_id: UUID | str) -> None:
    path = get_file_path(file_id)
    if path.exists():
        path.unlink()
