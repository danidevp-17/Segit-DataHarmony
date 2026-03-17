"""
Adaptador SMB/CIFS usando smbprotocol.
Permite exploracion y operaciones de archivos en recursos compartidos Windows
(equivalente a: net use X: \\\\host\\share /USER:DOMAIN\\user pass).
"""
import posixpath
import stat as stat_module
import time
from datetime import datetime, timezone
from typing import Iterator, Optional

from loguru import logger

from modules.volumes.storage.base import (
    BaseStorageAdapter,
    FileStatResult,
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

try:
    import smbclient
    import smbclient.path as smb_path
    _SMB_AVAILABLE = True
except ImportError:
    _SMB_AVAILABLE = False


def _require_smb() -> None:
    if not _SMB_AVAILABLE:
        raise StorageNotImplementedError(
            "smb",
            "smbprotocol is not installed. Add 'smbprotocol' to requirements.txt",
        )


class SMBAdapter(BaseStorageAdapter):
    """
    Adaptador SMB/CIFS para recursos compartidos Windows.

    Gestión de conexión:
    - Usa smbclient.register_session() para autenticación NTLM.
    - Los paths que recibe del service son absolutos incluyendo el share como primer
      segmento (ej. /saicarga/subdir). El adaptador extrae el path relativo al share.
    - Username acepta formato DOMAIN\\user, user@domain o simplemente user.
    """

    def __init__(
        self,
        host: str,
        share: str,
        username: str = "",
        password: str = "",
        port: int = 445,
    ):
        self._host = host
        self._share = share.strip("/").strip("\\")
        self._username = username
        self._password = password
        self._port = port
        self._connected = False

    # ------------------------------------------------------------------
    # Conexión
    # ------------------------------------------------------------------

    def _connect(self) -> None:
        """Registra sesión SMB si no está registrada aún."""
        _require_smb()
        if self._connected:
            return
        try:
            smbclient.register_session(
                self._host,
                username=self._username,
                password=self._password,
                port=self._port,
                connection_timeout=15,
            )
            self._connected = True
        except Exception as e:
            msg = str(e)
            if any(k in msg for k in ("STATUS_LOGON_FAILURE", "STATUS_WRONG_PASSWORD",
                                       "Authentication", "credential", "auth")):
                raise StorageAuthError(
                    f"SMB authentication failed for '{self._username}' on "
                    f"{self._host}: {e}"
                )
            raise StorageConnectionError(f"Cannot connect to {self._host}:{self._port} — {e}")

    def _close(self) -> None:
        if self._connected:
            try:
                smbclient.reset_connection_cache()
            except Exception:
                pass
            self._connected = False

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------

    def _relative(self, path: str) -> str:
        """
        Extrae el path relativo al share desde el path absoluto del service.
        "/saicarga"         → ""      (raíz del share)
        "/saicarga/files"   → "files"
        "/saicarga/a/b"     → "a/b"
        """
        share_prefix = "/" + self._share
        normalized = posixpath.normpath("/" + path.lstrip("/"))
        if normalized == share_prefix:
            return ""
        if normalized.startswith(share_prefix + "/"):
            return normalized[len(share_prefix) + 1:]
        # Path ya es relativo (fallback)
        return path.strip("/")

    def _unc(self, relative: str) -> str:
        """
        Construye ruta UNC: \\host\\share  o  \\host\\share\\subpath
        """
        clean = relative.strip("/").strip("\\").replace("/", "\\")
        if clean:
            return f"\\\\{self._host}\\{self._share}\\{clean}"
        return f"\\\\{self._host}\\{self._share}"

    def _map_error(self, e: Exception, path: str) -> StorageError:
        """Mapea excepciones smbprotocol / OSError a StorageError del dominio."""
        msg = str(e)
        if isinstance(e, FileNotFoundError) or "STATUS_OBJECT_NAME_NOT_FOUND" in msg:
            return StoragePathNotFoundError(path)
        if isinstance(e, PermissionError) or "STATUS_ACCESS_DENIED" in msg:
            return StoragePermissionError(f"Access denied: {path}")
        if isinstance(e, FileExistsError) or "STATUS_OBJECT_NAME_COLLISION" in msg:
            return StorageConflictError(path)
        if any(k in msg for k in ("STATUS_LOGON_FAILURE", "STATUS_WRONG_PASSWORD")):
            return StorageAuthError(f"SMB auth error on operation: {e}")
        if isinstance(e, TimeoutError) or "timed out" in msg.lower():
            return StorageTimeoutError(f"SMB operation timed out on '{path}'")
        return StorageError(f"SMB error on '{path}': {e}")

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def test_connection(self) -> dict:
        start = time.monotonic()
        try:
            self._connect()
            unc = self._unc("")
            smbclient.listdir(unc)
            latency_ms = int((time.monotonic() - start) * 1000)
            self._close()
            return {"ok": True, "message": "Connection successful", "latency_ms": latency_ms}
        except StorageAuthError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except StorageConnectionError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except Exception as e:
            logger.warning("SMB test_connection unexpected error: {}", e)
            return {"ok": False, "message": str(e), "latency_ms": None, "error_code": "UNKNOWN"}
        finally:
            self._close()

    def list_dir(self, path: str) -> list[FileStatResult]:
        try:
            self._connect()
            rel = self._relative(path)
            unc = self._unc(rel)
            results: list[FileStatResult] = []
            for entry in smbclient.scandir(unc):
                st = entry.stat()
                is_dir = entry.is_dir()
                entry_path = posixpath.join(path.rstrip("/"), entry.name)
                modified_at = (
                    datetime.fromtimestamp(st.st_mtime, tz=timezone.utc)
                    if st.st_mtime else None
                )
                results.append(FileStatResult(
                    name=entry.name,
                    path=entry_path,
                    is_dir=is_dir,
                    size=None if is_dir else st.st_size,
                    modified_at=modified_at,
                ))
            return sorted(results, key=lambda e: (not e.is_dir, e.name.lower()))
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def stat(self, path: str) -> FileStatResult:
        try:
            self._connect()
            rel = self._relative(path)
            unc = self._unc(rel)
            st = smbclient.stat(unc)
            is_dir = stat_module.S_ISDIR(st.st_mode)
            return FileStatResult(
                name=posixpath.basename(path.rstrip("/")) or self._share,
                path=path,
                is_dir=is_dir,
                size=None if is_dir else st.st_size,
                modified_at=(
                    datetime.fromtimestamp(st.st_mtime, tz=timezone.utc)
                    if st.st_mtime else None
                ),
            )
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def exists(self, path: str) -> bool:
        try:
            self.stat(path)
            return True
        except StoragePathNotFoundError:
            return False
        except StorageError:
            return False

    def read_file(self, path: str, max_bytes: Optional[int] = None) -> bytes:
        try:
            self._connect()
            rel = self._relative(path)
            unc = self._unc(rel)
            if max_bytes is not None:
                st = smbclient.stat(unc)
                if st.st_size and st.st_size > max_bytes:
                    raise StorageFileTooLargeError(st.st_size, max_bytes)
            with smbclient.open_file(unc, mode="rb") as f:
                return f.read()
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def download_file(self, path: str) -> Iterator[bytes]:
        chunk_size = 65536
        try:
            self._connect()
            rel = self._relative(path)
            unc = self._unc(rel)
            with smbclient.open_file(unc, mode="rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def upload_file(self, remote_path: str, data: bytes) -> int:
        try:
            self._connect()
            rel = self._relative(remote_path)
            unc = self._unc(rel)
            with smbclient.open_file(unc, mode="wb") as f:
                f.write(data)
            return len(data)
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, remote_path)

    def create_folder(self, path: str) -> None:
        try:
            self._connect()
            if self.exists(path):
                raise StorageConflictError(path)
            rel = self._relative(path)
            unc = self._unc(rel)
            smbclient.mkdir(unc)
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def rename(self, source_path: str, target_path: str) -> None:
        try:
            self._connect()
            if self.exists(target_path):
                raise StorageConflictError(target_path)
            src_unc = self._unc(self._relative(source_path))
            dst_unc = self._unc(self._relative(target_path))
            smbclient.rename(src_unc, dst_unc)
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, source_path)

    def copy(self, source_path: str, destination_path: str) -> None:
        try:
            src_stat = self.stat(source_path)
            if self.exists(destination_path):
                raise StorageConflictError(destination_path)
            if src_stat.is_dir:
                self._copy_dir(source_path, destination_path)
            else:
                self._copy_file(source_path, destination_path)
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, source_path)

    def _copy_file(self, src: str, dst: str) -> None:
        data = self.read_file(src)
        self.upload_file(dst, data)

    def _copy_dir(self, src: str, dst: str) -> None:
        self.create_folder(dst)
        for entry in self.list_dir(src):
            src_child = posixpath.join(src, entry.name)
            dst_child = posixpath.join(dst, entry.name)
            if entry.is_dir:
                self._copy_dir(src_child, dst_child)
            else:
                self._copy_file(src_child, dst_child)

    def delete(self, path: str) -> None:
        try:
            entry = self.stat(path)
            if entry.is_dir:
                self._delete_dir(path)
            else:
                unc = self._unc(self._relative(path))
                smbclient.remove(unc)
        except StorageError:
            raise
        except Exception as e:
            raise self._map_error(e, path)

    def _delete_dir(self, path: str) -> None:
        for entry in self.list_dir(path):
            child = posixpath.join(path, entry.name)
            if entry.is_dir:
                self._delete_dir(child)
            else:
                smbclient.remove(self._unc(self._relative(child)))
        smbclient.rmdir(self._unc(self._relative(path)))
