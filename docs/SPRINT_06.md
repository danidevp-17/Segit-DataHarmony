# Sprint 6 — Access Policies, Celery y Logs/Artifacts

**Objetivo:** Migrar access policies de JSON a PostgreSQL, integrar Celery para ejecución real de routines, y exponer logs/artifacts de jobs.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-29 | Access policies en PostgreSQL (tablas, migración 005) | ✅ |
| T-30 | API access-policies (GET, POST) y router FastAPI | ✅ |
| T-31 | Migrar admin/policies a FastAPI (proxy Next.js) | ✅ |
| T-32 | Filtrado datasources por policies en routines | ✅ |
| T-33 | Celery worker y tarea run_routine | ✅ |
| T-34 | Logs y artifacts de jobs (endpoints, schema) | ✅ |

---

## Access Policies (PostgreSQL)

### Tablas

- **access_policy_routine**: (routine_slug, datasource_id) → lista de datasources permitidos por routine
- **access_policy_module**: (module_id, datasource_id) → lista de datasources permitidos por módulo (vacío = todos)

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/v1/access-policies | Obtiene routinePolicies y modulePolicies |
| POST | /api/v1/access-policies | Actualiza políticas (body: routinePolicies, modulePolicies) |

### Migración

```bash
alembic upgrade head  # 005_access_policies
```

### Filtrado en routines

`GET /api/v1/routines/{id}/datasources?moduleId=X` retorna solo datasources permitidos (intersección routine ∩ module). Si no hay políticas configuradas, retorna todos los activos.

---

## Celery

### Configuración

- **Broker/Backend:** Redis (`REDIS_URL`)
- **App:** `core/celery_app.py`
- **Tasks:** `modules.jobs.tasks.run_routine`

### Ejecución

1. POST /api/v1/jobs crea el job y encola `run_routine.delay(job_id)`
2. El worker actualiza el job: PENDING → RUNNING → SUCCESS/FAILURE
3. Si el script existe en `./data/routines/{script}`, se ejecuta por subprocess
4. Si no existe, se simula éxito (stub) para pruebas

### Docker Compose

El servicio `celery` usa la misma imagen que la API:

```yaml
celery:
  command: celery -A core.celery_app worker --loglevel=info
  environment:
    - DATABASE_URL=...
    - REDIS_URL=redis://redis:6379/0
  depends_on:
    - postgres
    - redis
```

### Local

```bash
# Terminal 1: API
cd apps/api && uvicorn main:app --reload

# Terminal 2: Redis (si no usa Docker)
redis-server

# Terminal 3: Celery worker
cd apps/api && celery -A core.celery_app worker --loglevel=info
```

---

## Logs y Artifacts

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/v1/jobs/{id}/logs | stdout y stderr del job (extraídos de result) |
| GET | /api/v1/jobs/{id}/artifacts | Lista de artifacts generados (JSONB) |

### Modelo Job

- **result** (JSONB): Contiene stdout, stderr, returnCode cuando el script se ejecuta
- **artifacts** (JSONB): Lista de `[{"name":"...","path":"...","url":"..."}]` (para futuras integraciones)

### Migración

```bash
alembic upgrade head  # 006_job_artifacts
```

---

## Admin Policies UI

La página `/admin/policies` usa el proxy Next.js `/api/admin/policies` que reenvía a FastAPI `/api/v1/access-policies`. Los datasources se cargan desde `/api/admin/datasources` (JSON local). Las policies ahora se almacenan en PostgreSQL.

- **Routine tab:** Usa `routine.slug` como clave (antes `routine.id`)
- **Module tab:** Igual que antes (module_id)

---

## Pasos para ejecutar

1. Migraciones: `cd apps/api && alembic upgrade head`
2. API: `uvicorn main:app --reload`
3. Redis: `redis-server` (o `docker run -p 6379:6379 redis:7-alpine`)
4. Celery: `celery -A core.celery_app worker --loglevel=info`
5. Web: `cd apps/web && npm run dev`

Con Docker Compose:

```bash
cd infra/compose && docker compose up -d
```
