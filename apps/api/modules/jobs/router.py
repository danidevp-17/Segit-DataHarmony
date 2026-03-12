"""Endpoints para jobs."""
import json
from uuid import UUID
from fastapi import APIRouter, Depends, Form, HTTPException

from core.dependencies import DbSession
from core.security import get_current_user
from modules.jobs.service import create_job_from_routine, get_job, list_jobs
from modules.jobs.schemas import JobCreate, JobResponse, JobLogsResponse, JobArtifactsResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _user_dep():
    return Depends(get_current_user)


def _parse_params(params_str: str) -> dict:
    if not params_str or not params_str.strip():
        return {}
    try:
        return json.loads(params_str)
    except json.JSONDecodeError:
        return {}


@router.get("", response_model=list[JobResponse])
def get_jobs(db: DbSession, limit: int = 100, _user=_user_dep()):
    """Lista jobs (ordenados por fecha descendente)."""
    return list_jobs(db, limit)


@router.post("", response_model=JobResponse, status_code=201)
async def post_job(
    db: DbSession,
    routineId: str = Form(...),
    moduleId: str = Form("geology_geophysics"),
    params: str = Form("{}"),
    datasourceId: str | None = Form(None),
    _user=_user_dep(),
):
    """
    Crea un job (submit de routine).
    Acepta FormData: routineId, moduleId, params (JSON string), datasourceId.
    Los archivos se omiten por ahora; se integrarán con Celery en un sprint posterior.
    """
    body = JobCreate(
        routineId=routineId,
        moduleId=moduleId,
        params=_parse_params(params),
        datasourceId=datasourceId if datasourceId else None,
    )
    return create_job_from_routine(db, body)


@router.get("/{id}", response_model=JobResponse)
def get_job_by_id(id: UUID, db: DbSession, _user=_user_dep()):
    """Obtiene el estado de un job."""
    job = get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{id}/logs", response_model=JobLogsResponse)
def get_job_logs(id: UUID, db: DbSession, _user=_user_dep()):
    """Obtiene los logs (stdout/stderr) del job desde result."""
    job = get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    result = job.result or {}
    return JobLogsResponse(
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
    )


@router.get("/{id}/artifacts", response_model=JobArtifactsResponse)
def get_job_artifacts(id: UUID, db: DbSession, _user=_user_dep()):
    """Obtiene la lista de artifacts generados por el job."""
    job = get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    artifacts = getattr(job, "artifacts", None) or []
    return JobArtifactsResponse(artifacts=artifacts)
