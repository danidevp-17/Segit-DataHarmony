"""Lógica de negocio del registry."""
from sqlalchemy.orm import Session

from modules.registry.repository import get_all_modules
from modules.registry.schemas import AppModuleSchema, AppSectionSchema


def list_modules(db: Session, active_only: bool = True) -> list[AppModuleSchema]:
    """Lista módulos con secciones para construir la navegación."""
    modules = get_all_modules(db, active_only=active_only)
    return [
        AppModuleSchema(
            id=m.id,
            slug=m.slug,
            name=m.name,
            description=m.description,
            icon=m.icon,
            color=m.color,
            order_index=m.order_index,
            route=m.route,
            sections=[
                AppSectionSchema(
                    id=s.id,
                    slug=s.slug,
                    name=s.name,
                    description=s.description,
                    order_index=s.order_index,
                    route=s.route,
                    icon=s.icon,
                )
                for s in sorted(m.sections, key=lambda x: x.order_index)
                if (s.is_active or not active_only)
            ],
        )
        for m in modules
    ]
