"""
Adaptador NFS usando mount del sistema (mount -t nfs).
Monta el export en un directorio temporal y realiza operaciones con pathlib.
Requiere nfs-common (o equivalente) y capacidad de montar en el contenedor.
"""
import os
import posixpath
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

from modules.volumes.storage.base import (
    BaseStorageAdapter,
    FileStatResult,
    StorageConflictError,
    StorageConnectionError,
    StorageError,
    StorageFileTooLargeError,
    StoragePathNotFoundError,
    StoragePermissionError,
    StorageTimeoutError,
)

_MOUNT_TIMEOUT = 15
_UMOUNT_TIMEOUT = 10


class NFSAdapter(BaseStorageAdapter):
    """
    Adaptador NFS. Monta host:share_path en un directorio temporal y opera
    sobre él con pathlib. share_path es el export (ej. /data o /exports/home).
    No usa usuario/contraseña (NFS suele ser por IP o Kerberos).
    """

    def __init__(
        self,
        host: str,
        share_path: str,
        options: Optional[str] = None,
    ):
        self._host = host
        self._share_path = ("/" + share_path.strip("/")).rstrip("/") or "/"
        self._options = options
        self._mount_point: Optional[str] = None

    def _connect(self) -> str:
        """Monta el export NFS y retorna el path del punto de montaje."""
        if self._mount_point is not None:
            return self._mount_point
        mount_point = tempfile.mkdtemp(prefix="dataharmony_nfs_")
        export = self._share_path
        try:
            cmd = [
                "mount",
                "-t", "nfs",
                "-o", "nolock,soft,timeo=5,retrans=2" + ("," + self._options if self._options else ""),
                f"{self._host}:{export}",
                mount_point,
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=_MOUNT_TIMEOUT,
            )
            if result.returncode != 0:
                err = (result.stderr or result.stdout or "").strip()
                raise StorageConnectionError(
                    f"Cannot mount NFS {self._host}:{export} — {err or 'mount failed'}"
                )
            self._mount_point = mount_point
            return mount_point
        except subprocess.TimeoutExpired:
            if os.path.ismount(mount_point):
                try:
                    subprocess.run(["umount", mount_point], capture_output=True, timeout=_UMOUNT_TIMEOUT)
                except Exception:
                    pass
            try:
                os.rmdir(mount_point)
            except Exception:
                pass
            raise StorageTimeoutError(f"Timeout mounting NFS {self._host}:{self._share_path}")
        except StorageError:
            try:
                os.rmdir(mount_point)
            except Exception:
                pass
            raise
        except Exception as e:
            try:
                os.rmdir(mount_point)
            except Exception:
                pass
            raise StorageConnectionError(f"NFS mount failed: {e}")

    def _close(self) -> None:
        if self._mount_point is None:
            return
        mp = self._mount_point
        self._mount_point = None
        try:
            subprocess.run(["umount", mp], capture_output=True, timeout=_UMOUNT_TIMEOUT)
        except Exception:
            pass
        try:
            os.rmdir(mp)
        except Exception:
            pass

    def _local_path(self, path: str) -> Path:
        """Convierte path lógico (desde el service) a path local en el montaje."""
        base = self._connect()
        normalized = posixpath.normpath("/" + path.lstrip("/"))
        prefix = self._share_path
        if prefix != "/" and normalized.startswith(prefix):
            rel = normalized[len(prefix) :].lstrip("/")
        elif normalized == "/" or normalized == prefix:
            rel = ""
        else:
            rel = normalized.lstrip("/")
        return Path(base) / rel if rel else Path(base)

    def test_connection(self) -> dict:
        start = time.monotonic()
        try:
            self._connect()
            lp = self._local_path(self._share_path)
            list(lp.iterdir())
            latency_ms = int((time.monotonic() - start) * 1000)
            self._close()
            return {"ok": True, "message": "Connection successful", "latency_ms": latency_ms}
        except StorageConnectionError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except StorageTimeoutError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except Exception as e:
            return {"ok": False, "message": str(e), "latency_ms": None, "error_code": "UNKNOWN"}
        finally:
            self._close()

    def list_dir(self, path: str) -> list[FileStatResult]:
        lp = self._local_path(path)
        try:
            if not lp.exists():
                raise StoragePathNotFoundError(path)
            if not lp.is_dir():
                raise StoragePermissionError(f"Not a directory: {path}")
            results = []
            for entry in lp.iterdir():
                name = entry.name
                entry_path = posixpath.join(path.rstrip("/"), name)
                try:
                    st = entry.stat()
                except OSError:
                    results.append(
                        FileStatResult(name=name, path=entry_path, is_dir=entry.is_dir(), size=None, modified_at=None)
                    )
                    continue
                mtime = st.st_mtime
                modified_at = datetime.fromtimestamp(mtime, tz=timezone.utc) if mtime else None
                results.append(
                    FileStatResult(
                        name=name,
                        path=entry_path,
                        is_dir=entry.is_dir(),
                        size=None if entry.is_dir() else st.st_size,
                        modified_at=modified_at,
                    )
                )
            return sorted(results, key=lambda e: (not e.is_dir, e.name.lower()))
        except StorageError:
            raise
        except FileNotFoundError:
            raise StoragePathNotFoundError(path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS list_dir error on '{path}': {e}")

    def stat(self, path: str) -> FileStatResult:
        lp = self._local_path(path)
        try:
            if not lp.exists():
                raise StoragePathNotFoundError(path)
            st = lp.stat()
            name = lp.name or posixpath.basename(path.rstrip("/")) or "."
            mtime = st.st_mtime
            modified_at = datetime.fromtimestamp(mtime, tz=timezone.utc) if mtime else None
            return FileStatResult(
                name=name,
                path=path,
                is_dir=lp.is_dir(),
                size=None if lp.is_dir() else st.st_size,
                modified_at=modified_at,
            )
        except StorageError:
            raise
        except FileNotFoundError:
            raise StoragePathNotFoundError(path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS stat error on '{path}': {e}")

    def exists(self, path: str) -> bool:
        return self._local_path(path).exists()

    def read_file(self, path: str, max_bytes: Optional[int] = None) -> bytes:
        lp = self._local_path(path)
        try:
            if not lp.exists():
                raise StoragePathNotFoundError(path)
            if lp.is_dir():
                raise StoragePermissionError(f"Cannot read directory as file: {path}")
            if max_bytes is not None:
                size = lp.stat().st_size
                if size > max_bytes:
                    raise StorageFileTooLargeError(size, max_bytes)
            return lp.read_bytes()
        except StorageError:
            raise
        except FileNotFoundError:
            raise StoragePathNotFoundError(path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS read_file error on '{path}': {e}")

    def download_file(self, path: str) -> Iterator[bytes]:
        chunk_size = 65536
        data = self.read_file(path)
        for i in range(0, len(data), chunk_size):
            yield data[i : i + chunk_size]

    def upload_file(self, remote_path: str, data: bytes) -> int:
        lp = self._local_path(remote_path)
        try:
            lp.parent.mkdir(parents=True, exist_ok=True)
            lp.write_bytes(data)
            return len(data)
        except StorageError:
            raise
        except FileNotFoundError:
            raise StoragePathNotFoundError(remote_path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS upload error on '{remote_path}': {e}")

    def create_folder(self, path: str) -> None:
        lp = self._local_path(path)
        if lp.exists():
            raise StorageConflictError(path)
        try:
            lp.mkdir(parents=True)
        except FileExistsError:
            raise StorageConflictError(path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS create_folder error on '{path}': {e}")

    def rename(self, source_path: str, target_path: str) -> None:
        src = self._local_path(source_path)
        dst = self._local_path(target_path)
        if dst.exists():
            raise StorageConflictError(target_path)
        try:
            src.rename(dst)
        except FileNotFoundError:
            raise StoragePathNotFoundError(source_path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS rename error: {e}")

    def copy(self, source_path: str, destination_path: str) -> None:
        src = self._local_path(source_path)
        dst = self._local_path(destination_path)
        if dst.exists():
            raise StorageConflictError(destination_path)
        try:
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
        except FileNotFoundError:
            raise StoragePathNotFoundError(source_path)
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS copy error: {e}")

    def delete(self, path: str) -> None:
        lp = self._local_path(path)
        if not lp.exists():
            raise StoragePathNotFoundError(path)
        try:
            if lp.is_dir():
                shutil.rmtree(lp)
            else:
                lp.unlink()
        except PermissionError as e:
            raise StoragePermissionError(str(e))
        except Exception as e:
            raise StorageError(f"NFS delete error on '{path}': {e}")
