# Segit-DataHarmony

Monorepo para DataHarmony Automation Hub: frontend Next.js, API FastAPI, workers Celery.

## Estructura

```
├── apps/
│   ├── web/          # Next.js (UI, App Router)
│   └── api/          # FastAPI (lógica de negocio, BD)
├── workers/          # Celery (Sprint 5+)
├── infra/
│   └── compose/      # Docker Compose
├── docs/
│   ├── ARCHITECTURE.md
│   └── SPRINT_01.md
├── routines/         # Catálogo de rutinas
└── scripts/          # Scripts shell
```

## Inicio rápido

### Web (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

App en http://localhost:3000

### API (FastAPI) con Docker

```bash
cd infra/compose
docker compose up -d
```

API en http://localhost:8000  
Docs en http://localhost:8000/docs

### API local (sin Docker)

Requiere PostgreSQL y Redis locales.

```bash
cp .env.example .env
# Editar .env con DATABASE_URL correcto

cd apps/api
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_registry.py
uvicorn main:app --reload
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Sprint 1](docs/SPRINT_01.md)
