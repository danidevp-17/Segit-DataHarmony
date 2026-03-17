# Segit-DataHarmony — Arquitectura

Documento maestro de arquitectura del monorepo.

## Visión general

```
apps/web      → Next.js (frontend, UI, sesión, auth Azure AD)
apps/api      → FastAPI (lógica de negocio, BD, autorización)
workers/      → Celery (jobs de larga duración)
infra/        → Docker Compose, Nginx
```

## Organización de módulos en FastAPI

### Registry (metadatos de la app)
El módulo `registry/` define **qué módulos y secciones existen** en la aplicación. Es configuración, no lógica de negocio.

- **app_modules**: slugs, nombres, íconos, orden, rutas (ej: data-quality, gg, cartography)
- **app_sections**: secciones dentro de cada módulo (ej: scripts, applications, documentation)

La navegación en Next.js se construye dinámicamente desde estos datos.

### Dominios de negocio (planos)
Cada dominio es un paquete independiente bajo `modules/`:

- `data_sources/` — Conexiones a BD (PostgreSQL, SQL Server, Oracle); CRUD y test de conexión
- `data_quality/` — Scripts, aplicaciones, documentos, archivos
- `routines/` — Catálogo de rutinas, ejecución de jobs
- `cartography/` — Proyectos, cultural info
- `gg/` — Geology & Geophysics
- `production/` — Producción
- `drilling/` — Drilling, event unlock, user access
- `chat/` — Chatbot
- `admin/` — Auth, datasources, policies

Los dominios no dependen entre sí. La comunicación entre módulos pasa por el servicio de jobs o el registry.

## Roadmap por fases

Ver [docs/SPRINT_01.md](./SPRINT_01.md) para el detalle del Sprint 1.
