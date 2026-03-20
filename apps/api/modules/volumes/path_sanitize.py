"""Sanitización de paths bajo share_path (sin FastAPI). Reutilizable desde jobs Celery."""
import posixpath


class InvalidVolumePathError(ValueError):
    """Path fuera del árbol permitido del volumen."""


def sanitize_path_under_share(path: str, share_path: str) -> str:
    """
    Normaliza path y comprueba que quede bajo share_path.
    Misma lógica que volumes.service._sanitize_path.
    """
    normalized = posixpath.normpath("/" + path.lstrip("/"))
    base = posixpath.normpath("/" + share_path.lstrip("/"))
    if not (normalized == base or normalized.startswith(base.rstrip("/") + "/")):
        raise InvalidVolumePathError(
            f"Invalid path: '{path}' is outside the allowed root '{share_path}'"
        )
    return normalized


def join_under_share(dir_path: str, *parts: str) -> str:
    """Une dir_path con partes usando posixpath."""
    p = dir_path.rstrip("/")
    for part in parts:
        p = posixpath.join(p, part.lstrip("/"))
    return posixpath.normpath(p)
