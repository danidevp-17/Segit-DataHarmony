"""Repositorio para routines."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.routines.models import Routine


def get_all_routines(db: Session, module: str | None = None) -> list[Routine]:
    q = db.query(Routine).order_by(Routine.name)
    if module:
        q = q.filter(Routine.module == module)
    return q.all()


def get_routine_by_id(db: Session, id: UUID) -> Routine | None:
    return db.query(Routine).filter(Routine.id == id).first()


def get_routine_by_slug(db: Session, slug: str) -> Routine | None:
    return db.query(Routine).filter(Routine.slug == slug).first()


def create_routine(db: Session, **kwargs) -> Routine:
    r = Routine(**kwargs)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r
