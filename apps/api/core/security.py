"""
Validación JWT para tokens de Azure AD / Microsoft Entra ID.
FastAPI valida el token independientemente de Next.js.
Usa PyJWKClient para cache de claves (no llama a Microsoft en cada request).
"""
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel

from core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

# PyJWKClient cachea las claves internamente (1 hora por defecto)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        tenant = settings.azure_tenant_id or "common"
        jwks_url = f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


class UserContext(BaseModel):
    """Usuario extraído del JWT de Azure AD."""

    oid: str
    email: str | None
    name: str | None
    groups: list[str] = []


def decode_azure_token(token: str) -> UserContext:
    """Decodifica y valida un JWT de Azure AD. Lanza si es inválido."""
    if not settings.azure_tenant_id or not settings.azure_client_id:
        raise ValueError("Azure AD not configured")

    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)

    # Issuer para v2.0 endpoint
    issuer = f"https://login.microsoftonline.com/{settings.azure_tenant_id}/v2.0"

    # Audience: ID token usa client_id; access_token puede ser para Graph
    decode_options = {"verify_exp": True, "verify_aud": bool(settings.azure_client_id)}
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.azure_client_id if settings.azure_client_id else None,
        issuer=issuer,
        options=decode_options,
    )
    return UserContext(
        oid=payload.get("oid", ""),
        email=payload.get("preferred_username"),
        name=payload.get("name"),
        groups=payload.get("groups", []),
    )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UserContext | None:
    """Obtiene el usuario si hay token válido. Retorna None si no hay token."""
    if credentials is None:
        return None
    try:
        return decode_azure_token(credentials.credentials)
    except Exception:
        return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UserContext:
    """
    Obtiene el usuario del JWT. Requiere token válido.
    Con auth_skip_validation=True acepta requests sin token (usuario dev).
    """
    if settings.auth_skip_validation:
        if credentials and credentials.credentials:
            try:
                return decode_azure_token(credentials.credentials)
            except Exception:
                pass
        return UserContext(oid="dev", email="dev@local", name="Dev User", groups=[])

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_azure_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
