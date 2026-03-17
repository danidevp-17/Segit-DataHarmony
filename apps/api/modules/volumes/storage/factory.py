"""
Factory de adaptadores de storage.
Selecciona el adaptador correcto según el volume_type del AppVolume.
"""
from core.config import settings
from core.encryption import decrypt_password
from modules.volumes.models import AppVolume
from modules.volumes.storage.base import BaseStorageAdapter, StorageNotImplementedError


def get_adapter(volume: AppVolume) -> BaseStorageAdapter:
    """
    Construye y retorna el adaptador adecuado para el volumen dado.
    Descifra las credenciales antes de pasarlas al adaptador.
    Lanza StorageNotImplementedError para protocolos no implementados en este MVP.
    """
    creds = _decrypt_credentials(volume)

    if volume.volume_type == "sftp":
        from modules.volumes.storage.adapters.sftp import SFTPAdapter
        return SFTPAdapter(
            host=volume.host,
            port=volume.port or 22,
            username=volume.username or "",
            password=creds.get("password"),
            private_key=creds.get("private_key"),
        )

    if volume.volume_type == "smb":
        from modules.volumes.storage.adapters.smb import SMBAdapter
        share = volume.share_path.strip("/").strip("\\")
        return SMBAdapter(
            host=volume.host,
            share=share,
            username=volume.username or "",
            password=creds.get("password", ""),
            port=volume.port or 445,
        )

    if volume.volume_type == "ftp":
        from modules.volumes.storage.adapters.ftp import FTPAdapter
        return FTPAdapter(
            host=volume.host,
            port=volume.port or 21,
            username=volume.username or "",
            password=creds.get("password", ""),
            share_path=volume.share_path or "/",
        )

    if volume.volume_type == "nfs":
        from modules.volumes.storage.adapters.nfs import NFSAdapter
        return NFSAdapter(
            host=volume.host,
            share_path=volume.share_path or "/",
        )

    raise StorageNotImplementedError(volume.volume_type)


def _decrypt_credentials(volume: AppVolume) -> dict:
    """Descifra el JSONB encrypted_credentials y retorna dict con valores planos."""
    if not volume.encrypted_credentials:
        return {}

    if not settings.encryption_key:
        raise ValueError("ENCRYPTION_KEY must be set to decrypt volume credentials")

    result: dict = {}
    for key, encrypted_value in volume.encrypted_credentials.items():
        if encrypted_value:
            try:
                result[key] = decrypt_password(encrypted_value, settings.encryption_key)
            except ValueError:
                # Si el valor no está cifrado (ej. campo vacío), lo deja tal cual
                result[key] = encrypted_value
    return result
