# AGENTS.md — DataHarmony Automation Hub

Guía de convenciones para agentes de IA trabajando en este monorepo.

---

## Skills de IA disponibles

Skills instalados en `.agents/skills/`. El agente debe activarlos leyendo el `SKILL.md` correspondiente **antes** de ejecutar la tarea indicada.

| Skill | Activar cuando... | Nota para este proyecto |
|---|---|---|
| `brainstorming` | **Antes** de implementar cualquier feature nueva, componente o cambio de comportamiento | Obligatorio — no saltear aunque parezca simple |
| `systematic-debugging` | Al encontrar un bug, error de test o comportamiento inesperado | Obligatorio — ningún fix sin investigar causa raíz |
| `api-design-principles` | Diseñando o revisando endpoints nuevos | **Solo aplicar las secciones REST**; el proyecto no usa GraphQL |
| `error-handling-patterns` | Implementando manejo de errores en Python o TypeScript | Complementa el patrón `PENDING → RUNNING → SUCCESS/FAILURE` de Celery |
| `frontend-design` | Construyendo componentes o páginas de alta visibilidad | Respetar la paleta oficial: `slate-*` / `cyan-*` / `emerald-*` / `violet-*` |
| `next-best-practices` | Escribiendo cualquier código Next.js (RSC, Server Actions, routing, metadata) | Cubre cambios async de Next.js 15+/16 — activar siempre en `apps/web` |

---

## Estructura del proyecto

```
apps/api/    ← FastAPI + SQLAlchemy + Celery (Python)
apps/web/    ← Next.js 16 App Router (TypeScript + Tailwind)
infra/       ← Docker Compose (api, postgres, redis, celery, web)
docs/        ← Arquitectura, sprints y seguimientos semanales
```

Siempre ejecutar Docker desde la raíz:
```bash
docker compose -f infra/compose/docker-compose.yml <comando>
```

---

## Backend (apps/api)

### Arquitectura modular

Cada módulo vive en `modules/<domain>/`. El **núcleo mínimo** de cada dominio es:

```
models.py       ← SQLAlchemy ORM
schemas.py      ← Pydantic v2 (Request/Response)
router.py       ← FastAPI router
service.py      ← Lógica de negocio
repository.py   ← Queries a la BD
__init__.py
```

Cuando el dominio lo exige, se permiten **subcarpetas adicionales** dentro del módulo:

```
# Ejemplos reales en este repo:
modules/volumes/storage/          ← adaptadores SMB, SFTP, NFS, FTP + factory
modules/data_sources/connectors/  ← conectores MSSQL, PostgreSQL, Oracle, base
modules/data_quality/             ← file_storage.py, preview.py además del núcleo
```

**Flujo obligatorio:** `router → service → repository → Session`. El router nunca accede a la BD directamente.

### Dominios actuales y prefijos de router

Todos los routers se registran en `main.py` bajo el prefijo `/api/v1`.

| Módulo | Prefijo API |
|---|---|
| `registry` | `/api/v1/registry` |
| `data_sources` | `/api/v1/data-sources` |
| `data_quality` | `/api/v1/data-quality` |
| `routines` | `/api/v1/routines` |
| `jobs` | `/api/v1/jobs` |
| `access_policies` | `/api/v1/access-policies` |
| `volumes` | `/api/v1/volumes` |

La documentación interactiva de la API está disponible en `/docs` (Swagger UI) y `/redoc`.

### Modelos SQLAlchemy

```python
from shared.base_model import Base, UUIDMixin, TimestampMixin

class MyEntity(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "my_entities"  # plural, snake_case
    # PKs son UUID automáticos (UUIDMixin)
    # created_at / updated_at automáticos (TimestampMixin)
    # Usar JSONB para datos semi-estructurados
```

### Schemas Pydantic

```python
# Respuesta: sufijo Response + factory from_model
class MyEntityResponse(BaseModel):
    id: str
    someField: str  # camelCase para el frontend

    @classmethod
    def from_model(cls, m: MyEntity) -> "MyEntityResponse":
        return cls(id=str(m.id), someField=m.some_field)

# Creación: sufijo Create, alias para camelCase
class MyEntityCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    some_field: str = Field(alias="someField")
```

### Inyección de dependencias

```python
from core.dependencies import DbSession
from core.security import get_current_user, UserContext

@router.get("/")
def list_entities(db: DbSession, _user: UserContext = Depends(get_current_user)):
    ...
```

Usar `get_current_user_optional` solo cuando el endpoint puede ser público.

### Rutas API

> Al diseñar endpoints nuevos, activar el skill `api-design-principles` (solo secciones REST).

Siempre con prefijo `/api/v1` y recursos en plural y kebab-case:
- `/api/v1/routines`
- `/api/v1/data-sources`
- `/api/v1/access-policies`

Registrar cada router en `main.py`.

### Naming Python

| Elemento | Convención |
|---|---|
| Archivos | `snake_case.py` |
| Clases modelo | `PascalCase` (ej: `AppScript`) |
| Schemas Request | `PascalCase + Create/Update` |
| Schemas Response | `PascalCase + Response` |
| Variables/funciones | `snake_case` |

### Migraciones Alembic

- Numeradas: `00N_nombre_descriptivo.py`
- Importar el modelo nuevo en `migrations/env.py` y en `main.py`
- Ejecutar: `alembic upgrade head` (automático en Docker al iniciar)

### Seguridad

La API valida tokens JWT de **Azure AD / Microsoft Entra ID** directamente (independiente de Next.js), usando `PyJWKClient` con caché de claves.

```python
# core/security.py
from core.security import get_current_user, get_current_user_optional, UserContext

class UserContext(BaseModel):
    oid: str          # Object ID de Azure AD
    email: str | None
    name: str | None
    groups: list[str] = []
```

- `get_current_user` — requiere token válido. Lanza `401` si falta o está expirado.
- `get_current_user_optional` — retorna `None` si no hay token; usar solo en endpoints públicos.
- Con `AUTH_SKIP_VALIDATION=true` (dev local) se acepta la request sin token y se retorna un `UserContext` de desarrollo (`oid="dev"`).
- Nunca omitir `Depends(get_current_user)` en endpoints que manejan datos de usuario.

### Celery tasks

El servicio `celery` en Docker Compose corre `celery -A core.celery_app worker`. Usa `REDIS_URL` como broker y backend.

```python
@app.task(bind=True, name="nombre_descriptivo")
def my_task(self, param: str):
    # Patrón: PENDING → RUNNING → SUCCESS/FAILURE
    # Abrir Session propio, actualizar estado, cerrar Session
```

### Manejo de errores

> Activar skill `error-handling-patterns` para excepciones custom, circuit breakers o patrones de retry.

Convenciones básicas:
- Lanzar excepciones específicas desde `service.py` — el router las convierte en `HTTPException`
- Nunca capturar `Exception` genérico en silencio; siempre re-lanzar o registrar con `loguru`
- Usar `try/except` solo donde se pueda hacer algo concreto con el error

### Logging

Usar `loguru` (no `print`, no `logging` estándar):
```python
from loguru import logger
logger.info("Mensaje {campo}", campo=valor)
```

---

## Frontend (apps/web)

> Al escribir cualquier código Next.js, activar skill `next-best-practices`.
> Al construir componentes o páginas con diseño relevante, activar skill `frontend-design`.

### App Router

- Todas las páginas bajo `app/` — no usar Pages Router
- Páginas con estado/fetch: agregar `"use client"` en la primera línea
- Páginas puramente estáticas: Server Components implícitos

### Fetch con autenticación

```typescript
import { useSession } from "next-auth/react";
const { data: session } = useSession();
const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
// Pasar a todas las llamadas:
const data = await listMyEntities({ accessToken });
```

### Cliente HTTP

Siempre usar las funciones de `lib/api/client.ts`:
- `apiGet<T>(path, opts)` — GET
- `apiPost<T>(path, body, opts)` — POST
- `apiPut<T>(path, body, opts)` — PUT
- `apiDelete<T>(path, opts)` — DELETE
- `apiPostFormData<T>(path, formData, opts)` — POST multipart

Nunca usar `fetch` directamente en páginas o componentes.

### Módulos API

Cada dominio tiene su módulo en `lib/api/<domain>.ts`. Los módulos existentes son:

| Archivo | Dominio |
|---|---|
| `lib/api/registry.ts` | Módulos y secciones de la app |
| `lib/api/data-sources.ts` | Conexiones a bases de datos externas |
| `lib/api/data-quality.ts` | Scripts, aplicaciones y documentos DQ |
| `lib/api/routines.ts` | Rutinas de procesamiento |
| `lib/api/jobs.ts` | Ejecuciones y estado de jobs |
| `lib/api/volumes.ts` | Volúmenes de almacenamiento remoto |

Cada módulo expone:
1. Interfaces TypeScript que espejean los schemas Pydantic
2. Funciones async tipadas

```typescript
export interface MyEntity {
  id: string;
  someField: string;
}

export async function listMyEntities(opts: ApiOptions): Promise<MyEntity[]> {
  return apiGet<MyEntity[]>("/api/v1/my-entities", opts);
}
```

**Excepción — Access Policies:** no tiene módulo en `lib/api/`. Se gestiona vía Route Handler BFF en `app/api/admin/policies/route.ts`, que hace proxy hacia `/api/v1/access-policies` usando secrets del servidor.

### Estilos

- **Tailwind CSS v4** — única fuente de estilos
- Paleta: `slate-*` para neutros, `cyan-*` primario, `emerald-*` / `violet-*` acentos
- Iconos: solo `lucide-react`
- No crear archivos CSS separados para componentes

### Naming TypeScript

| Elemento | Convención |
|---|---|
| Archivos página/componente | `PascalCase.tsx` |
| Archivos lib/hooks | `kebab-case.ts` |
| Componentes | `PascalCase` |
| Interfaces/Types | `PascalCase` |
| Funciones API | `camelCase` |

### Route Handlers (BFF)

Los Route Handlers en `app/api/` actúan como proxy para:
- Operaciones que requieren secrets del servidor
- Conexiones directas a BD desde el panel admin

---

## Variables de entorno

| Archivo | Usado por |
|---|---|
| `.env` (raíz) | API (pydantic-settings) + Docker Compose |
| `apps/web/.env.local` | Next.js (solo cliente/servidor web) |

Nunca commitear `.env` ni `.env.local`. Ver `.env.example` como referencia.

### Variables de la API (`.env`)

| Variable | Descripción | Default dev |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql+psycopg2://postgres:postgres@localhost:5432/dataharmony` |
| `REDIS_URL` | Redis — broker de Celery y backend | `redis://localhost:6379/0` |
| `CORS_ORIGINS` | Orígenes permitidos (coma-separados) | `http://localhost:3000` |
| `LOG_LEVEL` | Nivel de log (`INFO`, `DEBUG`, etc.) | `INFO` |
| `LOG_JSON` | Logs en formato JSON | `true` |
| `AZURE_TENANT_ID` | Tenant de Azure AD / Entra ID | _(vacío = Azure no configurado)_ |
| `AZURE_CLIENT_ID` | Client ID de la app registration | _(vacío)_ |
| `AUTH_SKIP_VALIDATION` | Omitir validación JWT en dev local | `false` (`true` en Docker dev) |
| `ENCRYPTION_KEY` | Clave de cifrado de credenciales (32+ chars) | _(obligatoria en producción)_ |
| `DQ_UPLOADS_PATH` | Ruta local para uploads de Data Quality | `./data/uploads/data-quality` |

### Variables de Next.js (`apps/web/.env.local`)

| Variable | Descripción |
|---|---|
| `AUTH_SECRET` | Secret de NextAuth (generar con `npx auth secret`) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Client ID de la app registration |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client Secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<TENANT_ID>/v2.0` |
| `NEXT_PUBLIC_USE_MICROSOFT_AUTH` | `true` para usar Azure AD; `false` para dev sin auth |
| `NEXT_PUBLIC_API_URL` | URL base de la API (`http://localhost:8000`) |
| `INTERNAL_API_URL` | Solo en Docker: URL interna para el servidor Next (`http://api:8000`). En local con `npm run dev` no hace falta. |

---

## Comandos frecuentes

```bash
# Levantar todo el proyecto (api, postgres, redis, celery, web)
# Requiere apps/web/.env.local (copiar de .env.local.example y añadir AUTH_SECRET)
docker compose -f infra/compose/docker-compose.yml up -d --build

# Frontend en http://localhost:3000, API en http://localhost:8000

# Ver logs
docker compose -f infra/compose/docker-compose.yml logs -f api
docker compose -f infra/compose/docker-compose.yml logs -f celery
docker compose -f infra/compose/docker-compose.yml logs -f web

# Tras cambios en package.json del frontend: rebuild
docker compose -f infra/compose/docker-compose.yml build web --no-cache

# Ejecutar seeders
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_registry.py
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_routines.py

# Bajar y limpiar volúmenes
docker compose -f infra/compose/docker-compose.yml down -v
```

---

## Documentación relevante

- [Arquitectura](docs/ARCHITECTURE.md)
- Sprints: [01](docs/SPRINT_01.md) · [02](docs/SPRINT_02.md) · [03](docs/SPRINT_03.md) · [04](docs/SPRINT_04.md) · [05](docs/SPRINT_05.md) · [06](docs/SPRINT_06.md) · [07](docs/SPRINT_07.md)
- Specs de features: [docs/Specs/](docs/Specs/) (ej. implementación de Volumes)
- Seguimientos semanales: [docs/Seguimiento_*.md](docs/)

## Skills instalados (referencia rápida)

```
.agents/skills/
├── api-design-principles/   ← REST patterns, paginación, status codes
├── brainstorming/           ← Diseño de features antes de implementar
├── error-handling-patterns/ ← Excepciones custom, retry, circuit breaker
├── frontend-design/         ← Criterios visuales y estéticos
├── next-best-practices/     ← RSC, async APIs, routing, metadata Next.js 16
└── systematic-debugging/    ← Proceso de debugging por fases
```

Fuente de instalación: `skills-lock.json`
