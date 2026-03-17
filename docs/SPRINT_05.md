# Sprint 5 — Módulo Routines y Jobs

**Objetivo:** Migrar el catálogo de rutinas (routines) de JSON a FastAPI/PostgreSQL, implementar la API de jobs para envío de tareas, y migrar la UI de routines a consumir FastAPI.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-24 | Modelo Routine y migración 004 | ✅ |
| T-25 | API routines (list, get, datasources) | ✅ |
| T-26 | API jobs (create, get, list) | ✅ |
| T-27 | Migrar UI routines y jobs a FastAPI | ✅ |
| T-28 | Proxy Next.js y seed de routines | ✅ |

---

## FastAPI – Módulos routines y jobs

### Estructura routines

```
apps/api/modules/routines/
├── __init__.py
├── models.py       # Routine (tabla routines)
├── schemas.py      # RoutineResponse, RoutineCreate
├── repository.py   # CRUD
├── service.py      # list_routines, get_routine, get_allowed_datasources
└── router.py       # Endpoints REST
```

### Estructura jobs

```
apps/api/modules/jobs/
├── __init__.py
├── models.py       # Job, JobStatus (tabla jobs, migración 001)
├── schemas.py      # JobCreate, JobResponse
├── repository.py   # get_job_by_id, create_job, get_all_jobs
├── service.py      # create_job_from_routine, get_job, list_jobs
└── router.py       # Endpoints REST
```

### Modelo Routine (PostgreSQL)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| slug | String(128) | Identificador único para URLs (ej: addfaultname) |
| name | String(256) | Nombre de la rutina |
| description | Text | Descripción |
| script | String(512) | Ruta o nombre del script |
| params | JSONB | Parámetros: [{"key","label","required"}] |
| file_inputs | JSONB | Inputs: [{"name","label","accept","multiple"}] |
| needs_datasource | Boolean | Si requiere selección de datasource |
| module | String(64) | Módulo (geology_geophysics, etc.) |

### Endpoints routines

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/v1/routines | Lista rutinas (opcional: ?module=) |
| GET | /api/v1/routines/{id_or_slug} | Obtiene por UUID o slug |
| GET | /api/v1/routines/{id}/datasources | Datasources permitidos (?moduleId=) |

### Endpoints jobs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/v1/jobs | Lista jobs (ordenados por fecha) |
| POST | /api/v1/jobs | Crea job (FormData: routineId, moduleId, params, datasourceId) |
| GET | /api/v1/jobs/{id} | Obtiene job por ID |

### Flujo de submit

1. Usuario completa formulario en `/routines/{slug}`
2. POST /api/v1/jobs con FormData (routineId, params, datasourceId, etc.)
3. Job se persiste en tabla `jobs` con status `pending`
4. Redirect a `/jobs/{id}` para ver estado
5. **Ejecución real (Celery)** se implementará en un sprint posterior

---

## Next.js – Migración de la UI

### Cambios

1. **Routines** (`/routines`): Página cliente, carga con `listRoutines()` desde FastAPI
2. **Routine detail** (`/routines/[id]`): Usa slug en URL, `getRoutine()`, `getRoutineDatasources()`, `createJob()`
3. **Jobs** (`/jobs`): Lista jobs desde FastAPI
4. **Job detail** (`/jobs/[id]`): Muestra estado del job
5. **Proxy Next.js**: `/api/routines`, `/api/routines/[id]`, `/api/routines/[id]/datasources`, `/api/jobs` (POST) reenvían a FastAPI con token

### Clientes API

- `lib/api/routines.ts`: listRoutines, getRoutine, getRoutineDatasources
- `lib/api/jobs.ts`: createJob (vía proxy), getJob

### Compatibilidad con policies

La página Admin/Policies usa `fetch("/api/routines")`. El proxy Next.js mantiene la compatibilidad.

---

## Seed de routines

Para poblar desde `data/catalog.json`:

```bash
cd apps/api
python scripts/seed_routines.py
```

Formato de `catalog.json`:

```json
{
  "routines": [
    {
      "id": "addfaultname",
      "name": "Add Fault Name",
      "description": "...",
      "script": "path/to/script.py",
      "params": [{"key": "param1", "label": "Param 1", "required": true}],
      "fileInputs": [{"name": "input1", "label": "Archivo", "accept": ".csv"}],
      "needsDatasource": false,
      "module": "geology_geophysics"
    }
  ]
}
```

---

## Datasources para routines

El endpoint `GET /routines/{id}/datasources` retorna datasources de `data_sources` filtrados por `is_active`. El **filtrado por access policies** (access-policies.json) se implementará en un sprint posterior; por ahora retorna todos los activos.

---

## Pasos para ejecutar

1. Migración: `alembic upgrade head` (crea tabla routines)
2. Seed (opcional): `python scripts/seed_routines.py`
3. Iniciar API: `uvicorn main:app --reload`
4. Iniciar web: `npm run dev` (desde apps/web)

---

## Próximos pasos (Sprint 6)

- Integración con Celery para ejecución real de routines
- Access policies en PostgreSQL (migrar desde JSON)
- Logs y artifacts de jobs
