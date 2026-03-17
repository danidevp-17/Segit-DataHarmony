"""
Adaptador FTP usando ftplib (stdlib).
Soporta listado, lectura, escritura, crear carpeta, renombrar, copiar y eliminar.
"""
import posixpath
import time
from datetime import datetime, timezone
from ftplib import FTP, error_perm
from typing import Iterator, Optional

from modules.volumes.storage.base import (
    BaseStorageAdapter,
    FileStatResult,
    StorageAuthError,
    StorageConflictError,
    StorageConnectionError,
    StorageError,
    StorageFileTooLargeError,
    StoragePathNotFoundError,
    StoragePermissionError,
    StorageTimeoutError,
)

_FTP_TIMEOUT = 30


class FTPAdapter(BaseStorageAdapter):
    """
    Adaptador FTP. Usa share_path como directorio inicial (CWD) tras el login.
    Los paths que recibe el service son relativos a ese directorio o absolutos
    desde la raíz del share_path.
    """

    def __init__(
        self,
        host: str,
        port: int = 21,
        username: str = "",
        password: str = "",
        share_path: str = "/",
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._share_path = ("/" + share_path.strip("/")).rstrip("/") or "/"
        self._ftp: Optional[FTP] = None

    def _connect(self) -> FTP:
        if self._ftp is not None:
            return self._ftp
        try:
            ftp = FTP(timeout=_FTP_TIMEOUT)
            ftp.connect(self._host, self._port)
            if self._username:
                ftp.login(self._username, self._password)
            else:
                ftp.login()
            # Ir al directorio base del "share"
            if self._share_path and self._share_path != "/":
                ftp.cwd(self._share_path)
            self._ftp = ftp
            return ftp
        except error_perm as e:
            if "530" in str(e) or "password" in str(e).lower() or "login" in str(e).lower():
                raise StorageAuthError(f"FTP authentication failed: {e}")
            raise StoragePermissionError(str(e))
        except (OSError, TimeoutError) as e:
            raise StorageConnectionError(f"Cannot connect to {self._host}:{self._port} — {e}")

    def _close(self) -> None:
        if self._ftp:
            try:
                self._ftp.quit()
            except Exception:
                try:
                    self._ftp.close()
                except Exception:
                    pass
            self._ftp = None

    def _normalize(self, path: str) -> str:
        """Path relativo al share, con barras normales."""
        p = posixpath.normpath("/" + path.lstrip("/"))
        prefix = self._share_path.rstrip("/") or "/"
        if prefix != "/" and p.startswith(prefix):
            p = p[len(prefix) :].lstrip("/") or "."
        elif p == "/":
            p = "."
        return p

    def _path_to_ftp(self, path: str) -> str:
        """Convierte path lógico a path FTP (relativo al CWD actual)."""
        rel = self._normalize(path)
        return rel if rel != "." else ""

    def _list_mlsd(self, ftp: FTP, path: str) -> list[tuple[str, dict]]:
        try:
            items = []
            for name, facts in ftp.mlsd(path):
                if name in (".", ".."):
                    continue
                items.append((name, facts))
            return items
        except error_perm:
            return []

    def test_connection(self) -> dict:
        start = time.monotonic()
        try:
            self._connect()
            self._ftp.voidcmd("NOOP")
            latency_ms = int((time.monotonic() - start) * 1000)
            self._close()
            return {"ok": True, "message": "Connection successful", "latency_ms": latency_ms}
        except StorageAuthError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except StorageConnectionError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except Exception as e:
            return {"ok": False, "message": str(e), "latency_ms": None, "error_code": "UNKNOWN"}
        finally:
            self._close()

    def list_dir(self, path: str) -> list[FileStatResult]:
        ftp = self._connect()
        fp = self._path_to_ftp(path)
        try:
            items = self._list_mlsd(ftp, fp if fp else ".")
            if not items:
                # Fallback: NLST y luego stat por entrada
                try:
                    names = [n for n in ftp.nlst(fp or ".") if n not in (".", "..")]
                except error_perm as e:
                    if "550" in str(e) or "not found" in str(e).lower():
                        raise StoragePathNotFoundError(path)
                    raise StoragePermissionError(str(e))
                results = []
                for name in names:
                    entry_path = posixpath.join(path.rstrip("/"), name)
                    try:
                        st = self.stat(entry_path)
                        results.append(st)
                    except StorageError:
                        results.append(
                            FileStatResult(name=name, path=entry_path, is_dir=False, size=None, modified_at=None)
                        )
                return sorted(results, key=lambda e: (not e.is_dir, e.name.lower()))
            results = []
            for name, facts in items:
                entry_path = posixpath.join(path.rstrip("/"), name)
                kind = facts.get("type", "").upper()
                is_dir = kind == "DIR" or kind == "CDIR" or kind == "PDIR"
                size = None
                if "size" in facts:
                    try:
                        size = int(facts["size"])
                    except (ValueError, TypeError):
                        pass
                if is_dir:
                    size = None
                modify = facts.get("modify")
                modified_at = None
                if modify:
                    try:
                        # FTP MDTM format: YYYYMMDDHHMMSS
                        modified_at = datetime(
                            int(modify[:4]),
                            int(modify[4:6]),
                            int(modify[6:8]),
                            int(modify[8:10]),
                            int(modify[10:12]),
                            int(modify[12:14]),
                            tzinfo=timezone.utc,
                        )
                    except (ValueError, IndexError):
                        pass
                results.append(
                    FileStatResult(
                        name=name,
                        path=entry_path,
                        is_dir=is_dir,
                        size=size,
                        modified_at=modified_at,
                    )
                )
            return sorted(results, key=lambda e: (not e.is_dir, e.name.lower()))
        except error_perm as e:
            if "550" in str(e) or "not found" in str(e).lower():
                raise StoragePathNotFoundError(path)
            raise StoragePermissionError(str(e))
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"FTP list_dir error on '{path}': {e}")

    def stat(self, path: str) -> FileStatResult:
        ftp = self._connect()
        fp = self._path_to_ftp(path)
        name = posixpath.basename(path.rstrip("/")) or "."
        try:
            try:
                size = ftp.size(fp)
            except error_perm:
                size = None
            try:
                mdtm = ftp.sendcmd("MDTM " + fp)
                # 213 20240316123045
                modified_at = None
                if mdtm.startswith("213"):
                    ts = mdtm[4:].strip()
                    if len(ts) >= 14:
                        modified_at = datetime(
                            int(ts[:4]), int(ts[4:6]), int(ts[6:8]),
                            int(ts[8:10]), int(ts[10:12]), int(ts[12:14]),
                            tzinfo=timezone.utc,
                        )
            except error_perm:
                modified_at = None
            # Si size falla suele ser directorio
            if size is None:
                try:
                    ftp.cwd(fp)
                    ftp.cwd("..")
                    is_dir = True
                except error_perm:
                    is_dir = False
            else:
                is_dir = False
            return FileStatResult(
                name=name,
                path=path,
                is_dir=is_dir,
                size=None if is_dir else size,
                modified_at=modified_at,
            )
        except error_perm as e:
            if "550" in str(e) or "not found" in str(e).lower():
                raise StoragePathNotFoundError(path)
            raise StoragePermissionError(str(e))

    def exists(self, path: str) -> bool:
        try:
            self.stat(path)
            return True
        except StoragePathNotFoundError:
            return False
        except StorageError:
            return False

    def read_file(self, path: str, max_bytes: Optional[int] = None) -> bytes:
        ftp = self._connect()
        fp = self._path_to_ftp(path)
        try:
            if max_bytes is not None:
                st = self.stat(path)
                if st.size is not None and st.size > max_bytes:
                    raise StorageFileTooLargeError(st.size, max_bytes)
            data = []
            ftp.retrbinary("RETR " + fp, lambda b: data.append(b))
            return b"".join(data)
        except error_perm as e:
            if "550" in str(e) or "not found" in str(e).lower():
                raise StoragePathNotFoundError(path)
            raise StoragePermissionError(str(e))
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"FTP read_file error on '{path}': {e}")

    def download_file(self, path: str) -> Iterator[bytes]:
        chunk_size = 65536
        ftp = self._connect()
        fp = self._path_to_ftp(path)
        try:
            buf = []

            def collector(b: bytes) -> None:
                buf.append(b)

            ftp.retrbinary("RETR " + fp, collector)
            data = b"".join(buf)
            for i in range(0, len(data), chunk_size):
                yield data[i : i + chunk_size]
        except error_perm as e:
            if "550" in str(e) or "not found" in str(e).lower():
                raise StoragePathNotFoundError(path)
            raise StoragePermissionError(str(e))
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"FTP download error on '{path}': {e}")

    def upload_file(self, remote_path: str, data: bytes) -> int:
        ftp = self._connect()
        fp = self._path_to_ftp(remote_path)
        try:
            from io import BytesIO
            ftp.storbinary("STOR " + fp, BytesIO(data))
            return len(data)
        except error_perm as e:
            if "550" in str(e):
                raise StoragePathNotFoundError(remote_path)
            raise StoragePermissionError(str(e))
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"FTP upload error on '{remote_path}': {e}")

    def create_folder(self, path: str) -> None:
        ftp = self._connect()
        if self.exists(path):
            raise StorageConflictError(path)
        fp = self._path_to_ftp(path)
        try:
            ftp.mkd(fp)
        except error_perm as e:
            if "550" in str(e) and "exists" in str(e).lower():
                raise StorageConflictError(path)
            raise StoragePermissionError(str(e))

    def rename(self, source_path: str, target_path: str) -> None:
        ftp = self._connect()
        if self.exists(target_path):
            raise StorageConflictError(target_path)
        src = self._path_to_ftp(source_path)
        dst = self._path_to_ftp(target_path)
        try:
            ftp.rename(src, dst)
        except error_perm as e:
            raise StoragePermissionError(str(e))

    def copy(self, source_path: str, destination_path: str) -> None:
        src_stat = self.stat(source_path)
        if self.exists(destination_path):
            raise StorageConflictError(destination_path)
        if src_stat.is_dir:
            self._copy_dir(source_path, destination_path)
        else:
            data = self.read_file(source_path)
            self.upload_file(destination_path, data)

    def _copy_dir(self, src: str, dst: str) -> None:
        self.create_folder(dst)
        for entry in self.list_dir(src):
            src_child = posixpath.join(src, entry.name)
            dst_child = posixpath.join(dst, entry.name)
            if entry.is_dir:
                self._copy_dir(src_child, dst_child)
            else:
                data = self.read_file(src_child)
                self.upload_file(dst_child, data)

    def delete(self, path: str) -> None:
        entry = self.stat(path)
        ftp = self._connect()
        fp = self._path_to_ftp(path)
        if entry.is_dir:
            self._delete_dir(ftp, path, fp)
        else:
            try:
                ftp.delete(fp)
            except error_perm as e:
                if "550" in str(e):
                    raise StoragePathNotFoundError(path)
                raise StoragePermissionError(str(e))

    def _delete_dir(self, ftp: FTP, path: str, fp: str) -> None:
        for entry in self.list_dir(path):
            child_path = posixpath.join(path, entry.name)
            child_fp = self._path_to_ftp(child_path)
            if entry.is_dir:
                self._delete_dir(ftp, child_path, child_fp)
            else:
                ftp.delete(child_fp)
        ftp.rmd(fp)
