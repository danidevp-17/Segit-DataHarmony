"""Acceso a datos para data_sources."""
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from modules.data_sources.models import DataSource


def get_all(db: Session):
    return db.query(DataSource).order_by(DataSource.name).all()


def get_by_id(db: Session, id: UUID) -> DataSource | None:
    return db.query(DataSource).filter(DataSource.id == id).first()


def create(db: Session, **kwargs) -> DataSource:
    ds = DataSource(**kwargs)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


def update(db: Session, ds: DataSource, **kwargs) -> DataSource:
    for k, v in kwargs.items():
        if hasattr(ds, k):
            setattr(ds, k, v)
    db.commit()
    db.refresh(ds)
    return ds


def delete(db: Session, ds: DataSource) -> None:
    db.delete(ds)
    db.commit()
