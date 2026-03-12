"""Schemas para jobs."""
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from typing import Any


class JobCreate(BaseModel):
    """Payload para crear un job (submit routine)."""
    routineId: str
    moduleId: str = "geology_geophysics"
    params: dict[str, Any] = Field(default_factory=dict)
    datasourceId: str | None = None


class JobLogsResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""


class JobArtifactsResponse(BaseModel):
    artifacts: list[dict[str, str]]


class JobResponse(BaseModel):
    id: UUID
    task_id: str | None
    module: str
    job_type: str
    status: str
    payload: dict | None
    result: dict | None
    error: str | None
    artifacts: list | None = None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
