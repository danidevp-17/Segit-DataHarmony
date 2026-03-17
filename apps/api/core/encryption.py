"""
Cifrado de credenciales con Fernet (symmetric).
La clave se define en ENCRYPTION_KEY (variable de entorno).
"""
import base64
import os
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _get_fernet_key(secret: str) -> bytes:
    """Deriva una clave Fernet de 32 bytes desde un secret."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"dataharmony_datasources_v1",
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
    return key


def encrypt_password(plain: str, encryption_key: str) -> str:
    """Cifra una contraseña. Requiere encryption_key no vacía."""
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY is required to encrypt passwords")
    f = Fernet(_get_fernet_key(encryption_key))
    return f.encrypt(plain.encode()).decode()


def decrypt_password(encrypted: str, encryption_key: str) -> str:
    """Descifra una contraseña."""
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY is required to decrypt passwords")
    f = Fernet(_get_fernet_key(encryption_key))
    try:
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise ValueError("Invalid encrypted password (wrong key or corrupted data)")


def get_encryption_key_from_env() -> str:
    """Lee la clave de cifrado desde variable de entorno."""
    return os.environ.get("ENCRYPTION_KEY", "").strip()
