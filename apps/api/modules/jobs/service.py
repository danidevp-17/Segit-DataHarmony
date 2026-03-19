"""Servicios para jobs."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.jobs.models import Job, JobStatus
from modules.jobs.repository import get_job_by_id, create_job, get_all_jobs, update_job
from modules.jobs.schemas import JobCreate, JobResponse


def create_job_from_routine(db: Session, body: JobCreate) -> JobResponse:
    """
    Crea un job a partir del submit de una routine y encola la ejecución en Celery.
    """
    payload = {
        "routineId": body.routineId,
        "params": body.params,
        "datasourceId": body.datasourceId,
        "volumeId": body.volumeId,
    }
    job = create_job(
        db,
        module=body.moduleId,
        job_type="routine",
        status=JobStatus.PENDING.value,
        payload=payload,
    )
    try:
        from modules.jobs.tasks import run_routine
        result = run_routine.delay(str(job.id))
        update_job(db, job, task_id=result.id)
    except Exception:
        # Si Celery no está disponible, el job queda PENDING
        pass
    return JobResponse.model_validate(job)


def get_job(db: Session, id: UUID) -> JobResponse | None:
    job = get_job_by_id(db, id)
    if not job:
        return None
    return JobResponse.model_validate(job)


def list_jobs(db: Session, limit: int = 100) -> list[JobResponse]:
    jobs = get_all_jobs(db, limit)
    return [JobResponse.model_validate(j) for j in jobs]
