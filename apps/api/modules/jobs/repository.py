"""Repositorio para jobs."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.jobs.models import Job


def get_job_by_id(db: Session, id: UUID) -> Job | None:
    return db.query(Job).filter(Job.id == id).first()


def get_all_jobs(db: Session, limit: int = 100) -> list[Job]:
    return db.query(Job).order_by(Job.created_at.desc()).limit(limit).all()


def create_job(db: Session, **kwargs) -> Job:
    j = Job(**kwargs)
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


def update_job(db: Session, job: Job, **kwargs) -> Job:
    for k, v in kwargs.items():
        if hasattr(job, k):
            setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job
