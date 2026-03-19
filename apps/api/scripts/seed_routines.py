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


# Catálogo: routines/catalog.json (raíz repo), o apps/web/data/catalog.json
_REPO = Path(__file__).resolve().parent.parent.parent
CATALOG_ROOT = _REPO / "routines" / "catalog.json"
CATALOG_WEB = _REPO / "apps" / "web" / "data" / "catalog.json"
CATALOG_ALT = _REPO / "web" / "data" / "catalog.json"


def main():
    if CATALOG_ROOT.exists():
        path = CATALOG_ROOT
    elif CATALOG_WEB.exists():
        path = CATALOG_WEB
    elif CATALOG_ALT.exists():
        path = CATALOG_ALT
    else:
        print(f"Catalog not found. Tried: {CATALOG_ROOT}, {CATALOG_WEB}, {CATALOG_ALT}")
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
            execution_mode=r.get("executionMode", r.get("execution_mode", "subprocess")),
        )
        created += 1

    # Sincronizar execution_mode / script desde catálogo si la fila ya existía
    for r in routines:
        slug = r.get("id") or r.get("slug")
        if not slug:
            continue
        row = get_routine_by_slug(db, slug)
        em = r.get("executionMode") or r.get("execution_mode")
        if row and em:
            if getattr(row, "execution_mode", None) != em:
                row.execution_mode = em
                row.script = r.get("script", row.script)
    db.commit()

    db.close()
    print(f"Created {created} routines, skipped {skipped} (already exist)")


if __name__ == "__main__":
    main()
