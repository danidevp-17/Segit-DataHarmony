"""
Seed inicial para app_modules y app_sections.
Mapea la navegación actual de lib/nav.ts.
Ejecutar después de: alembic upgrade head
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from core.config import settings
from modules.registry.models import AppModule, AppSection

# Datos basados en lib/nav.ts
MODULES_DATA = [
    {
        "slug": "geology_geophysics",
        "name": "Geology & Geophysics",
        "icon": "Layers",
        "order_index": 1,
        "route": "/routines",
        "sections": [
            {"slug": "routines", "name": "Routines", "route": "/routines", "icon": "Play"},
            {"slug": "jobs", "name": "Jobs", "route": "/jobs", "icon": "Activity"},
            {"slug": "settings", "name": "Settings", "route": "/settings", "icon": "Settings"},
        ],
    },
    {
        "slug": "production",
        "name": "Production",
        "icon": "Factory",
        "order_index": 2,
        "route": "/production",
        "sections": [{"slug": "production", "name": "Production", "route": "/production", "icon": "Factory"}],
    },
    {
        "slug": "drilling",
        "name": "Drilling",
        "icon": "Drill",
        "order_index": 3,
        "route": "/drilling",
        "sections": [
            {"slug": "drilling", "name": "Drilling", "route": "/drilling", "icon": "Drill"},
            {"slug": "event-unlock", "name": "Event Unlock", "route": "/drilling/event-unlock", "icon": "Drill"},
            {"slug": "user-access", "name": "User Access", "route": "/drilling/user-access", "icon": "Drill"},
        ],
    },
    {
        "slug": "cartography",
        "name": "Cartography",
        "icon": "Map",
        "order_index": 4,
        "route": "/cartography",
        "sections": [
            {"slug": "cartography", "name": "Cartography", "route": "/cartography", "icon": "Map"},
            {"slug": "projects-index", "name": "Projects Index", "route": "/cartography/projects-index", "icon": "Map"},
            {"slug": "cultural-info", "name": "Cultural Info", "route": "/cartography/cultural-info", "icon": "Map"},
        ],
    },
    {
        "slug": "data_quality",
        "name": "Data Quality",
        "icon": "ShieldCheck",
        "order_index": 5,
        "route": "/data-quality",
        "sections": [{"slug": "data-quality", "name": "Data Quality", "route": "/data-quality", "icon": "ShieldCheck"}],
    },
    {
        "slug": "chatbot",
        "name": "Chatbot",
        "icon": "MessageSquare",
        "order_index": 6,
        "route": "/chat",
        "sections": [{"slug": "chat", "name": "Chat", "route": "/chat", "icon": "MessageSquare"}],
    },
    {
        "slug": "admin",
        "name": "Admin / Configuration",
        "icon": "Shield",
        "order_index": 7,
        "route": "/admin",
        "sections": [
            {"slug": "admin", "name": "Admin", "route": "/admin", "icon": "Shield"},
            {"slug": "auth", "name": "Authentication", "route": "/admin/auth", "icon": "Shield"},
            {"slug": "datasources", "name": "Datasources", "route": "/admin/datasources", "icon": "Shield"},
            {"slug": "policies", "name": "Access Policies", "route": "/admin/policies", "icon": "Shield"},
        ],
    },
]


def seed_registry(db: Session) -> None:
    if db.query(AppModule).count() > 0:
        print("Registry ya tiene datos. Saltando seed.")
        return

    for mod_data in MODULES_DATA:
        sections_data = mod_data.pop("sections")
        module = AppModule(
            id=uuid.uuid4(),
            slug=mod_data["slug"],
            name=mod_data["name"],
            icon=mod_data["icon"],
            order_index=mod_data["order_index"],
            route=mod_data["route"],
            is_active=True,
        )
        db.add(module)
        db.flush()

        for i, sec in enumerate(sections_data):
            section = AppSection(
                id=uuid.uuid4(),
                module_id=module.id,
                slug=sec["slug"],
                name=sec["name"],
                route=sec["route"],
                icon=sec.get("icon"),
                order_index=i,
                is_active=True,
            )
            db.add(section)

    db.commit()
    print("Seed completado: app_modules y app_sections poblados.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_registry(db)
    finally:
        db.close()
