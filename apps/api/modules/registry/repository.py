"""Acceso a datos para app_modules y app_sections."""
from sqlalchemy.orm import Session
from sqlalchemy import select

from modules.registry.models import AppModule, AppSection


def get_all_modules(db: Session, active_only: bool = True):
    """Lista todos los módulos con sus secciones, ordenados por order_index."""
    q = db.query(AppModule)
    if active_only:
        q = q.filter(AppModule.is_active == True)
    return q.order_by(AppModule.order_index).all()


def get_module_by_slug(db: Session, slug: str):
    """Obtiene un módulo por slug."""
    return db.query(AppModule).filter(AppModule.slug == slug).first()
