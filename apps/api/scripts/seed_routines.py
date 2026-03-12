#!/usr/bin/env python3
"""
Seed routines desde catalog.json (web).
Ejecutar desde apps/api: python scripts/seed_routines.py
"""
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

# Añadir raíz de la app al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import SessionLocal
from modules.routines.repository import create_routine, get_routine_by_slug


# Ruta al catalog: repo/apps/web/data/catalog.json o repo/web/data/catalog.json
_REPO = Path(__file__).resolve().parent.parent.parent
CATALOG_PATH = _REPO / "apps" / "web" / "data" / "catalog.json"


def main():
    alt_path = _REPO / "web" / "data" / "catalog.json"
    path = CATALOG_PATH if CATALOG_PATH.exists() else alt_path
    if not path.exists():
        print(f"Catalog not found. Tried: {CATALOG_PATH}, {alt_path}")
        return

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    routines = data.get("routines", [])
    if not routines:
        print("No routines in catalog.json")
        return

    db = SessionLocal()
    created = 0
    skipped = 0

    for r in routines:
        slug = r.get("id") or r.get("slug") or str(uuid4())
        if get_routine_by_slug(db, slug):
            skipped += 1
            continue
        create_routine(
            db,
            slug=slug,
            name=r.get("name", slug),
            description=r.get("description", ""),
            script=r.get("script", ""),
            params=r.get("params", []),
            file_inputs=r.get("fileInputs", r.get("file_inputs", [])),
            needs_datasource=r.get("needsDatasource", r.get("needs_datasource", False)),
            module=r.get("module", "geology_geophysics"),
        )
        created += 1

    db.close()
    print(f"Created {created} routines, skipped {skipped} (already exist)")


if __name__ == "__main__":
    main()
