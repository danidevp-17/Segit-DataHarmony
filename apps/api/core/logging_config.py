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

    if settings.log_json:
        # Con serialize=True, loguru produce JSON completo automáticamente.
        # No se debe mezclar con un format_str JSON manual (causaría KeyError en format_map).
        logger.add(
            sys.stderr,
            level=settings.log_level,
            serialize=True,
        )
    else:
        logger.add(
            sys.stderr,
            format=(
                "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{extra[correlation_id]}</cyan> | "
                "{message}"
            ),
            level=settings.log_level,
            serialize=False,
        )
