"""
Modelo de Job para tracking de tareas de Celery.
"""
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from shared.base_model import Base, UUIDMixin, TimestampMixin


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    REVOKED = "revoked"


class Job(Base, UUIDMixin, TimestampMixin):
    """Estado de un job de background (Celery)."""
    __tablename__ = "jobs"

    task_id = Column(String(255), nullable=True, index=True)  # Celery task_id
    module = Column(String(64), nullable=False, index=True)   # data_quality, routines, etc.
    job_type = Column(String(64), nullable=False)
    status = Column(String(32), default=JobStatus.PENDING.value, nullable=False, index=True)
    payload = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    error = Column(Text, nullable=True)
    artifacts = Column(JSONB, nullable=True, default=list)  # [{"name":"...","path":"...","url":"..."}]
    # created_by: UUID cuando tengamos users
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
