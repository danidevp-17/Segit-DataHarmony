# Segit-DataHarmony

Monorepo para DataHarmony Automation Hub: frontend Next.js, API FastAPI, workers Celery.

## Estructura

```
├── apps/
│   ├── web/          # Next.js (UI, App Router)
│   ├── api/          # FastAPI (lógica de negocio, BD)
│   └── data/         # Datos compartidos (uploads, etc.)
├── infra/
│   └── compose/      # Docker Compose
├── docs/
│   ├── ARCHITECTURE.md
│   └── SPRINT_*.md
└── .env
```

---

## Docker Compose (recomendado)

### Requisitos previos

- Docker y Docker Compose
- Archivo `.env` en la raíz del proyecto (copiar de `.env.example`)

### Configuración

```bash
# Copiar variables de entorno
cp .env.example .env

# Editar .env y definir al menos:
# - ENCRYPTION_KEY (32+ caracteres, para data sources)
# - Variables de Azure AD si usas autenticación Microsoft
```

### Levantar servicios

```bash
# Desde la raíz del proyecto
docker compose -f infra/compose/docker-compose.yml up -d
```

Servicios:
- **API** → http://localhost:8000 (docs en /docs)
- **PostgreSQL** → puerto 5432
- **Redis** → puerto 6379
- **Celery worker** → procesa jobs de routines

Las migraciones de Alembic se ejecutan automáticamente al iniciar la API.

### Build sin caché

Si cambias dependencias o el Dockerfile:

```bash
docker compose -f infra/compose/docker-compose.yml build --no-cache
docker compose -f infra/compose/docker-compose.yml up -d
```

### Seeders

Ejecutar dentro del contenedor API:

```bash
# Seed de módulos y secciones de navegación (registry)
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_registry.py

# Seed de routines (desde routines/catalog.json en la raíz del repo)
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_routines.py
```

> **Routines:** La rutina **fallas-split** se inserta/actualiza con la migración Alembic **010** (tabla `routines`). El script `seed_routines.py` es opcional si usas `routines/catalog.json`. El worker **Celery** debe alcanzar el mismo storage que la API (`ENCRYPTION_KEY`). Ver [docs/Specs/gyg-fallas-split.md](docs/Specs/gyg-fallas-split.md).

> **Jobs desde la web:** POST a `/api/jobs` (Next.js BFF) reenvía a la API con el token de sesión.

### Ver logs

```bash
docker compose -f infra/compose/docker-compose.yml logs -f api
docker compose -f infra/compose/docker-compose.yml logs -f celery
```

### Bajar servicios

```bash
# Detener
docker compose -f infra/compose/docker-compose.yml down

# Detener y eliminar volúmenes (borra datos de Postgres)
docker compose -f infra/compose/docker-compose.yml down -v
```

---

## Inicio rápido (sin Docker)

### Web (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

App en http://localhost:3000

### API local

Requiere PostgreSQL y Redis locales.

```bash
cp .env.example .env
# Editar .env con DATABASE_URL y ENCRYPTION_KEY

cd apps/api
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_registry.py
python scripts/seed_routines.py   # opcional (incluye fallas-split)
# Tests: pytest tests/test_fallas_split.py -v
uvicorn main:app --reload
```

API en http://localhost:8000  
Docs en http://localhost:8000/docs

### Celery (local)

```bash
cd apps/api
celery -A core.celery_app worker --loglevel=info
```

---

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Sprint 1](docs/SPRINT_01.md) — Fundamentos
- [Sprint 2](docs/SPRINT_02.md) — Autenticación
- [Sprint 3](docs/SPRINT_03.md) — Data Sources
- [Sprint 4](docs/SPRINT_04.md) — Data Quality
- [Sprint 5](docs/SPRINT_05.md) — Routines y Jobs
- [Sprint 6](docs/SPRINT_06.md) — Access Policies, Celery, Logs/Artifacts
