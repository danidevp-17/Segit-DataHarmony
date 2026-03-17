"""
Configuración de SQLAlchemy y sesión de base de datos.
Usamos modo sync para simplificar Alembic y tests iniciales.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from core.config import settings
from shared.base_model import Base

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependencia para inyectar sesión de BD en endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
