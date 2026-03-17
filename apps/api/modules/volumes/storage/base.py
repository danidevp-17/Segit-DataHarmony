"""
Interfaz base para todos los adaptadores de storage remoto.
Los adaptadores concretos deben implementar todos los métodos abstractos.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Iterator, Optional


# ---------------------------------------------------------------------------
# Tipos de datos compartidos
# ---------------------------------------------------------------------------

@dataclass
class FileStatResult:
    """Metadata de un archivo o carpeta remoto."""
    name: str
    path: str
    is_dir: bool
    size: Optional[int]
    modified_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Excepciones del dominio de storage
# ---------------------------------------------------------------------------

class StorageError(Exception):
    """Error base del adaptador de storage."""
    def __init__(self, message: str, code: str = "STORAGE_ERROR"):
        super().__init__(message)
        self.code = code
        self.message = message


class StorageConnectionError(StorageError):
    """No se pudo conectar al servidor remoto."""
    def __init__(self, message: str):
        super().__init__(message, "CONNECTION_ERROR")


class StorageAuthError(StorageError):
    """Credenciales inválidas."""
    def __init__(self, message: str):
        super().__init__(message, "AUTH_ERROR")


class StoragePathNotFoundError(StorageError):
    """El path remoto no existe."""
    def __init__(self, path: str):
        super().__init__(f"Path not found: {path}", "PATH_NOT_FOUND")


class StoragePermissionError(StorageError):
    """Permiso denegado en el servidor remoto."""
    def __init__(self, message: str):
        super().__init__(message, "PERMISSION_DENIED")


class StorageConflictError(StorageError):
    """El destino ya existe."""
    def __init__(self, path: str):
        super().__init__(f"Already exists: {path}", "CONFLICT")


class StorageFileTooLargeError(StorageError):
    """El archivo excede el límite permitido."""
    def __init__(self, size: int, limit: int):
        super().__init__(
            f"File size {size} bytes exceeds limit {limit} bytes",
            "FILE_TOO_LARGE",
        )


class StorageTimeoutError(StorageError):
    """Timeout al conectar o ejecutar operación remota."""
    def __init__(self, message: str = "Operation timed out"):
        super().__init__(message, "TIMEOUT")


class StorageNotImplementedError(StorageError):
    """Protocolo no implementado en este MVP."""
    def __init__(self, protocol: str, details: Optional[str] = None):
        message = f"Protocol '{protocol}' is not yet implemented"
        if details:
            message = f"{message}: {details}"
        super().__init__(message, "NOT_IMPLEMENTED")


# ---------------------------------------------------------------------------
# Interfaz base (ABC)
# ---------------------------------------------------------------------------

class BaseStorageAdapter(ABC):
    """
    Interfaz que deben implementar todos los adaptadores de storage.
    El service solo interactúa con esta interfaz; no depende de implementaciones concretas.
    """

    @abstractmethod
    def test_connection(self) -> dict:
        """
        Prueba la conectividad con el servidor remoto.
        Returns: {"ok": bool, "message": str, "latency_ms": int | None}
        """

    @abstractmethod
    def list_dir(self, path: str) -> list[FileStatResult]:
        """Lista el contenido de un directorio remoto."""

    @abstractmethod
    def stat(self, path: str) -> FileStatResult:
        """Obtiene metadata de un archivo o carpeta."""

    @abstractmethod
    def exists(self, path: str) -> bool:
        """Verifica si un path existe."""

    @abstractmethod
    def read_file(self, path: str, max_bytes: Optional[int] = None) -> bytes:
        """
        Lee el contenido de un archivo remoto.
        Si max_bytes está definido y el archivo es mayor, lanza StorageFileTooLargeError.
        """

    @abstractmethod
    def download_file(self, path: str) -> Iterator[bytes]:
        """Genera chunks del archivo para streaming al cliente."""

    @abstractmethod
    def upload_file(self, remote_path: str, data: bytes) -> int:
        """
        Sube datos a una ruta remota.
        Returns: tamaño en bytes escrito.
        """

    @abstractmethod
    def create_folder(self, path: str) -> None:
        """Crea un directorio remoto."""

    @abstractmethod
    def rename(self, source_path: str, target_path: str) -> None:
        """Renombra o mueve un archivo/carpeta."""

    @abstractmethod
    def copy(self, source_path: str, destination_path: str) -> None:
        """Copia un archivo o carpeta de forma recursiva si es necesario."""

    @abstractmethod
    def delete(self, path: str) -> None:
        """Elimina un archivo o carpeta (recursivo si es carpeta)."""
