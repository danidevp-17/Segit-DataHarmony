"""
Modelo base para todas las entidades.
- UUID como PK
- Timestamps created_at, updated_at
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base para modelos SQLAlchemy."""
    pass


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    """Mixin para created_at y updated_at."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class UUIDMixin:
    """Mixin para id UUID."""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
