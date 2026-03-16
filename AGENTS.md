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
infra/       ← Docker Compose
docs/        ← Arquitectura y sprints
```

Siempre ejecutar Docker desde la raíz:
```bash
docker compose -f infra/compose/docker-compose.yml <comando>
```

---

## Backend (apps/api)

### Arquitectura modular

Cada módulo vive en `modules/<domain>/` con exactamente estos archivos:
```
models.py       ← SQLAlchemy ORM
schemas.py      ← Pydantic v2 (Request/Response)
router.py       ← FastAPI router
service.py      ← Lógica de negocio
repository.py   ← Queries a la BD
__init__.py
```

**Flujo obligatorio:** `router → service → repository → Session`. El router nunca accede a la BD directamente.

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

- `AUTH_SKIP_VALIDATION=true` en `.env` para desarrollo local sin Azure AD
- Nunca omitir `Depends(get_current_user)` en endpoints que manejan datos de usuario

### Celery tasks

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

Cada dominio tiene su módulo en `lib/api/<domain>.ts` con:
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

Variables críticas:
- `ENCRYPTION_KEY` — 32+ caracteres, para cifrado de credenciales de data sources
- `DATABASE_URL` — conexión PostgreSQL
- `CELERY_BROKER_URL` / `CELERY_BACKEND_URL` — Redis

---

## Comandos frecuentes

```bash
# Levantar todos los servicios
docker compose -f infra/compose/docker-compose.yml up -d

# Ver logs
docker compose -f infra/compose/docker-compose.yml logs -f api
docker compose -f infra/compose/docker-compose.yml logs -f celery

# Ejecutar seeders
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_registry.py
docker compose -f infra/compose/docker-compose.yml exec api python scripts/seed_routines.py

# Rebuild sin caché
docker compose -f infra/compose/docker-compose.yml build --no-cache

# Bajar y limpiar volúmenes
docker compose -f infra/compose/docker-compose.yml down -v
```

---

## Documentación relevante

- [Arquitectura](docs/ARCHITECTURE.md)
- [Sprint 1–6](docs/) — historial de decisiones de diseño

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
