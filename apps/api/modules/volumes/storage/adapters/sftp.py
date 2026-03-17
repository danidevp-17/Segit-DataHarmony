"""
Adaptador SFTP usando paramiko (síncrono).
Implementa completamente la interfaz BaseStorageAdapter para el protocolo SFTP.
"""
import io
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
    StorageConnectionError,
    StorageConflictError,
    StorageFileTooLargeError,
    StoragePathNotFoundError,
    StoragePermissionError,
    StorageTimeoutError,
    StorageError,
)

# Importación lazy para que el módulo cargue aunque paramiko no esté disponible
# en entornos donde no se usa SFTP. El error aparecerá solo cuando se intente usar.
try:
    import paramiko
    _PARAMIKO_AVAILABLE = True
except ImportError:
    _PARAMIKO_AVAILABLE = False


_CONNECT_TIMEOUT = 10   # segundos para TCP connect
_BANNER_TIMEOUT = 15    # segundos para banner SSH


def _require_paramiko() -> None:
    if not _PARAMIKO_AVAILABLE:
        raise StorageError(
            "paramiko is not installed. Add 'paramiko>=3.4.0' to requirements.txt",
            "DEPENDENCY_MISSING",
        )


class SFTPAdapter(BaseStorageAdapter):
    """
    Adaptador SFTP completo usando paramiko.

    Gestión de conexión:
    - La conexión se abre bajo demanda al primer uso (_connect).
    - Se reutiliza en operaciones sucesivas dentro del mismo request.
    - No hay pool de conexiones; cada request del backend crea y cierra su sesión.
    """

    def __init__(
        self,
        host: str,
        port: int = 22,
        username: str = "",
        password: Optional[str] = None,
        private_key: Optional[str] = None,
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._private_key_str = private_key
        self._ssh: Optional["paramiko.SSHClient"] = None
        self._sftp: Optional["paramiko.SFTPClient"] = None

    # ------------------------------------------------------------------
    # Conexión
    # ------------------------------------------------------------------

    def _connect(self) -> "paramiko.SFTPClient":
        """Abre conexión SSH+SFTP si no está abierta aún."""
        _require_paramiko()
        if self._sftp is not None:
            return self._sftp

        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs: dict = {
            "hostname": self._host,
            "port": self._port,
            "username": self._username,
            "timeout": _CONNECT_TIMEOUT,
            "banner_timeout": _BANNER_TIMEOUT,
            "look_for_keys": False,
            "allow_agent": False,
        }

        if self._private_key_str:
            pkey = self._load_private_key(self._private_key_str)
            connect_kwargs["pkey"] = pkey
        elif self._password:
            connect_kwargs["password"] = self._password
        else:
            raise StorageAuthError("No credentials provided (password or private_key required)")

        try:
            ssh.connect(**connect_kwargs)
        except paramiko.AuthenticationException:
            logger.warning(
                "SFTP password auth failed for user '{}' on {}:{} — trying keyboard-interactive",
                self._username, self._host, self._port,
            )
            # paramiko intenta password primero; si falla, probar keyboard-interactive
            # explícitamente via Transport (cubre servidores Windows SSH, PAM, etc.)
            if self._password and "pkey" not in connect_kwargs:
                sftp = self._try_keyboard_interactive()
                if sftp is not None:
                    logger.info(
                        "SFTP keyboard-interactive auth succeeded for '{}' on {}:{}",
                        self._username, self._host, self._port,
                    )
                    return sftp
            raise StorageAuthError(
                f"Authentication failed for user '{self._username}' on "
                f"{self._host}:{self._port}. "
                "Verify username/password and that the server allows password "
                "or keyboard-interactive authentication."
            )
        except paramiko.SSHException as e:
            raise StorageConnectionError(f"SSH error: {e}")
        except TimeoutError:
            raise StorageTimeoutError(f"Timed out connecting to {self._host}:{self._port}")
        except OSError as e:
            # socket errors: host not found, connection refused, etc.
            raise StorageConnectionError(f"Cannot reach {self._host}:{self._port} — {e}")

        self._ssh = ssh
        self._sftp = ssh.open_sftp()
        return self._sftp

    def _try_keyboard_interactive(self) -> "Optional[paramiko.SFTPClient]":
        """
        Intenta autenticación keyboard-interactive usando el Transport de paramiko
        directamente. Retorna SFTPClient si tiene éxito, None si falla.
        El socket tiene timeout explícito para evitar que la conexión cuelgue.
        """
        import socket as _socket

        try:
            sock = _socket.create_connection((self._host, self._port), timeout=_CONNECT_TIMEOUT)
            transport = paramiko.Transport(sock)
            transport.start_client(timeout=_BANNER_TIMEOUT)

            pwd = self._password

            def _handler(title, instructions, fields):  # noqa: ARG001
                return [pwd for _ in fields]

            remaining = transport.auth_interactive(self._username, _handler)
            if remaining:
                transport.close()
                return None

            sftp = paramiko.SFTPClient.from_transport(transport)
            self._sftp = sftp
            self._ssh = transport  # type: ignore[assignment]
            return sftp
        except Exception:
            return None

    def _close(self) -> None:
        if self._sftp:
            try:
                self._sftp.close()
            except Exception:
                pass
            self._sftp = None
        if self._ssh:
            try:
                self._ssh.close()  # funciona para SSHClient y Transport
            except Exception:
                pass
            self._ssh = None

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------

    @staticmethod
    def _load_private_key(key_str: str) -> "paramiko.PKey":
        """Intenta cargar la clave privada probando los tipos más comunes."""
        key_types = [
            paramiko.RSAKey,
            paramiko.ECDSAKey,
            paramiko.Ed25519Key,
            paramiko.DSSKey,
        ]
        last_exc: Exception = Exception("Unknown key type")
        for key_cls in key_types:
            try:
                return key_cls.from_private_key(io.StringIO(key_str))
            except paramiko.SSHException as e:
                last_exc = e
            except Exception as e:
                last_exc = e
        raise StorageAuthError(f"Invalid or unsupported private key: {last_exc}")

    @staticmethod
    def _to_stat_result(path: str, attr: "paramiko.SFTPAttributes") -> FileStatResult:
        is_dir = stat_module.S_ISDIR(attr.st_mode or 0)
        modified_at = (
            datetime.fromtimestamp(attr.st_mtime, tz=timezone.utc)
            if attr.st_mtime
            else None
        )
        return FileStatResult(
            name=posixpath.basename(path),
            path=path,
            is_dir=is_dir,
            size=None if is_dir else attr.st_size,
            modified_at=modified_at,
        )

    def _wrap_sftp_error(self, e: Exception, path: str) -> StorageError:
        """Mapea excepciones paramiko a StorageError del dominio."""
        import errno as errno_mod

        if isinstance(e, paramiko.SFTPError):
            msg = str(e)
            if "No such file" in msg or "does not exist" in msg:
                return StoragePathNotFoundError(path)
            if "Permission denied" in msg or "Access denied" in msg:
                return StoragePermissionError(msg)
            return StorageError(msg)
        if isinstance(e, IOError):
            if e.errno == errno_mod.ENOENT:
                return StoragePathNotFoundError(path)
            if e.errno in (errno_mod.EACCES, errno_mod.EPERM):
                return StoragePermissionError(str(e))
        return StorageError(f"SFTP error on '{path}': {e}")

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def test_connection(self) -> dict:
        _require_paramiko()
        start = time.monotonic()
        try:
            sftp = self._connect()
            sftp.listdir(".")
            latency_ms = int((time.monotonic() - start) * 1000)
            self._close()
            return {"ok": True, "message": "Connection successful", "latency_ms": latency_ms}
        except StorageAuthError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except StorageConnectionError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except StorageTimeoutError as e:
            return {"ok": False, "message": e.message, "latency_ms": None, "error_code": e.code}
        except Exception as e:
            logger.warning("SFTP test_connection unexpected error: {}", e)
            return {"ok": False, "message": str(e), "latency_ms": None, "error_code": "UNKNOWN"}
        finally:
            self._close()

    def list_dir(self, path: str) -> list[FileStatResult]:
        try:
            sftp = self._connect()
            attrs = sftp.listdir_attr(path)
            results = []
            for attr in attrs:
                entry_path = posixpath.join(path, attr.filename)
                results.append(self._to_stat_result(entry_path, attr))
            return sorted(results, key=lambda e: (not e.is_dir, e.name.lower()))
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

    def stat(self, path: str) -> FileStatResult:
        try:
            sftp = self._connect()
            attr = sftp.stat(path)
            return self._to_stat_result(path, attr)
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

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
            sftp = self._connect()
            if max_bytes is not None:
                attr = sftp.stat(path)
                if attr.st_size and attr.st_size > max_bytes:
                    raise StorageFileTooLargeError(attr.st_size, max_bytes)
            with sftp.open(path, "rb") as f:
                return f.read()
        except (StorageError,):
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

    def download_file(self, path: str) -> Iterator[bytes]:
        """Genera chunks de 64 KB del archivo remoto para streaming."""
        chunk_size = 65536
        try:
            sftp = self._connect()
            with sftp.open(path, "rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

    def upload_file(self, remote_path: str, data: bytes) -> int:
        try:
            sftp = self._connect()
            parent = posixpath.dirname(remote_path)
            if parent and parent != "/":
                try:
                    sftp.stat(parent)
                except IOError:
                    sftp.makedirs(parent)
            with sftp.open(remote_path, "wb") as f:
                f.write(data)
            return len(data)
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, remote_path)

    def create_folder(self, path: str) -> None:
        try:
            sftp = self._connect()
            if self.exists(path):
                raise StorageConflictError(path)
            sftp.mkdir(path)
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

    def rename(self, source_path: str, target_path: str) -> None:
        try:
            sftp = self._connect()
            if self.exists(target_path):
                raise StorageConflictError(target_path)
            sftp.rename(source_path, target_path)
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, source_path)

    def copy(self, source_path: str, destination_path: str) -> None:
        """Copia un archivo o carpeta de forma recursiva."""
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
            raise self._wrap_sftp_error(e, source_path)

    def _copy_file(self, src: str, dst: str) -> None:
        sftp = self._connect()
        with sftp.open(src, "rb") as f:
            data = f.read()
        with sftp.open(dst, "wb") as f:
            f.write(data)

    def _copy_dir(self, src: str, dst: str) -> None:
        sftp = self._connect()
        sftp.mkdir(dst)
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
                sftp = self._connect()
                sftp.remove(path)
        except StorageError:
            raise
        except Exception as e:
            raise self._wrap_sftp_error(e, path)

    def _delete_dir(self, path: str) -> None:
        sftp = self._connect()
        for entry in self.list_dir(path):
            child = posixpath.join(path, entry.name)
            if entry.is_dir:
                self._delete_dir(child)
            else:
                sftp.remove(child)
        sftp.rmdir(path)
