"""
Modelos para data_sources (conexiones a bases de datos externas).
La contraseña se almacena cifrada con Fernet.
"""
from sqlalchemy import Column, String, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from shared.base_model import Base, UUIDMixin, TimestampMixin


class DataSource(Base, UUIDMixin, TimestampMixin):
    """Conexión a una base de datos (PostgreSQL, SQL Server, Oracle)."""
    __tablename__ = "data_sources"

    name = Column(String(256), nullable=False)
    type = Column(String(32), nullable=False)  # postgres, sqlserver, oracle
    host = Column(String(256), nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String(256), nullable=True)   # postgres, sqlserver
    service_name = Column(String(256), nullable=True)  # oracle
    username = Column(String(256), nullable=False)
    password_encrypted = Column(Text, nullable=False)  # Fernet
    options = Column(JSONB, nullable=True)  # opciones extra (encrypt, etc.)
    is_active = Column(Boolean, default=True, nullable=False)
