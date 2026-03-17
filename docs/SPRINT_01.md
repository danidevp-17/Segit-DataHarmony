# Sprint 1 — Fundamentos

**Objetivo:** Establecer la base del monorepo: estructura, FastAPI funcional, PostgreSQL, Alembic y Docker Compose mínimo.

---

## Plan del Sprint

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-01 | Reestructurar monorepo `web/` → `apps/web/` | ✅ |
| T-02 | Crear skeleton FastAPI en `apps/api/` | ✅ |
| T-03 | Configurar pydantic-settings + .env | ✅ |
| T-04 | Implementar CorrelationID middleware | ✅ |
| T-05 | Configurar logging JSON (structlog) | ✅ |
| T-06 | Configurar SQLAlchemy async + asyncpg | ✅ |
| T-07 | Configurar Alembic | ✅ |
| T-08 | Primera migración (jobs, users, audit, registry) | ✅ |
| T-09 | Docker Compose mínimo | ✅ |

---

## Tareas ejecutadas

### T-01 — Reestructuración del monorepo
- `web/` se movió a `apps/web/`
- Estructura monorepo: `apps/` contiene las aplicaciones
- **Impacto:** Imports y paths de Next.js no cambian (el `@/*` sigue apuntando a `./*` dentro de `apps/web/`)

### T-02 — Skeleton FastAPI
- Estructura modular: `core/`, `modules/registry/`, `shared/`
- `main.py` con FastAPI app, routers y health check
- Sin lógica de negocio todavía

### T-03 — Configuración
- `core/config.py` con pydantic-settings
- Variables desde `.env` (DATABASE_URL, REDIS_URL, LOG_LEVEL, etc.)
- `.env.example` documentado en raíz

### T-04 — CorrelationID middleware
- Header `X-Correlation-ID` generado o propagado en cada request
- Disponible en logs y en el contexto de la app
- Permite trazar una request de punta a punta

### T-05 — Logging estructurado
- Loguru o structlog para logs en JSON
- Campos: `correlation_id`, `timestamp`, `level`, `message`, `extra`
- Facilita búsqueda y agregación en producción

### T-06 — SQLAlchemy + asyncpg
- Engine y session async con asyncpg
- Dependencia `get_db` para inyección en endpoints
- `shared/base_model.py` con UUID, timestamps, base común

### T-07 — Alembic
- `alembic init migrations`
- `env.py` configurado para SQLAlchemy async
- Comandos: `alembic revision`, `alembic upgrade head`

### T-08 — Primera migración
- Tablas: `app_modules`, `app_sections`, `jobs`, `audit_logs`, `users` (básica)
- Seed de `app_modules` y `app_sections` desde la navegación actual (lib/nav.ts)
- Modelos en `modules/registry/models.py` y `modules/jobs/models.py` (skeleton)

### T-09 — Docker Compose
- Servicios: `api`, `postgres`, `redis`
- Variables de entorno en `docker-compose.yml`
- Health checks en postgres
- API ejecuta `alembic upgrade head` al arrancar
- Comando: `cd infra/compose && docker compose up -d`

---

## Tradeoffs realizados

| Decisión | Alternativa rechazada | Razón |
|----------|------------------------|-------|
| SQLAlchemy **sync** inicialmente | Async desde el inicio | Async con Alembic y tests añade complejidad. Se puede migrar a async en una fase posterior si se demuestra necesario. Por ahora sync es más simple y suficiente. |
| Loguru como logger | structlog | Loguru es más simple de configurar. structlog da más control pero requiere más boilerplate. Para MVP, Loguru es adecuado. |
| Dockerfile multi-stage para API | Single-stage | Multi-stage reduce tamaño de imagen pero complica el build inicial. Single-stage suficiente para dev. |
| PostgreSQL 16 | 15 o 14 | Usar la versión LTS más reciente disponible. |
| Redis sin persistencia en dev | Redis con AOF | Para desarrollo no se necesita persistencia. En prod se configura después. |
| No usar async en FastAPI (sync) | Async desde día 1 | Alembic y varios ORMs tienen mejor soporte sync. Evitamos problemas con asyncpg + SQLAlchemy 2.0 en migraciones. |

---

## Estructura resultante

```
Segit-DataHarmony/
├── apps/
│   ├── web/              ← Next.js (antes web/)
│   └── api/              ← FastAPI
│       ├── core/
│       ├── modules/
│       │   ├── registry/
│       │   └── jobs/      (skeleton)
│       ├── shared/
│       ├── migrations/
│       └── main.py
├── docs/
│   ├── ARCHITECTURE.md
│   └── SPRINT_01.md
├── infra/
│   └── compose/
│       └── docker-compose.yml
├── .env.example
└── Makefile (opcional)
```

---

## Criterios de finalización

- [x] `apps/web` existe y `npm run dev` funciona desde `apps/web/`
- [x] `apps/api` existe y FastAPI arranca
- [x] `GET /health` responde `{"status": "ok"}`
- [x] `GET /health/db` verifica conexión a PostgreSQL
- [x] `docker compose up` levanta api + postgres + redis
- [x] `alembic upgrade head` aplica migraciones sin error
- [x] Logs configurados con `correlation_id` (middleware lo propaga)

---

## Comandos útiles

```bash
# Web
cd apps/web && npm run dev

# API con Docker
cd infra/compose && docker compose up -d

# API local (PostgreSQL y Redis deben estar corriendo)
cd apps/api
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_registry.py   # Poblar módulos/secciones
uvicorn main:app --reload

# Verificar
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/registry/modules
```

**Nota:** Si el puerto 8000 está ocupado, detén el proceso que lo usa o cambia el mapeo en `docker-compose.yml` (ej: `"8001:8000"`).

---

## Próximos pasos (Sprint 2)

- Autenticación con Azure AD en Next.js
- Validación JWT en FastAPI
- Middleware de protección de rutas
- Cliente HTTP en Next.js hacia FastAPI con token
