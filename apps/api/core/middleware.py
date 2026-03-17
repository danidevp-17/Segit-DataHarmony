"""
Middleware global de la API.
- CorrelationID: genera o propaga el ID de correlación para trazabilidad.
"""
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from loguru import logger

CORRELATION_ID_HEADER = "X-Correlation-ID"
CORRELATION_ID_CONTEXT_KEY = "correlation_id"


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """
    Genera un correlation ID si no viene en el header, o propaga el existente.
    Lo inyecta en request.state para uso en endpoints y logging.
    """

    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get(
            CORRELATION_ID_HEADER
        ) or str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        response = await call_next(request)
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response


def get_correlation_id(request: Request) -> str:
    """Obtiene el correlation_id del request actual."""
    return getattr(request.state, CORRELATION_ID_CONTEXT_KEY, "")


def bind_logger(correlation_id: str):
    """Retorna un logger con correlation_id ya bindeado para el contexto de la request."""
    return logger.bind(correlation_id=correlation_id or "")
