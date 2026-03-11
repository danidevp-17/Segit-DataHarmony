"""
Logging estructurado con Loguru.
Configuración central de logs para la API.
"""
import sys
from loguru import logger

from core.config import settings


def setup_logging() -> None:
    """Configura Loguru para logs estructurados (JSON en prod)."""
    logger.remove()
    logger.configure(extra={"correlation_id": ""})
    format_str = (
        '{"time": "{time:YYYY-MM-DDTHH:mm:ss.SSSZ}", "level": "{level}", '
        '"message": "{message}", "correlation_id": "{extra[correlation_id]}", '
        '"extra": {extra}}'
        if settings.log_json
        else "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
        '<cyan>{extra[correlation_id]}</cyan> | {message}'
    )
    logger.add(
        sys.stderr,
        format=format_str,
        level=settings.log_level,
        serialize=settings.log_json,
    )
