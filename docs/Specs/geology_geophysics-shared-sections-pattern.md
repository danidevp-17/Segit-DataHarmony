# Patrón de secciones compartidas (scripts / applications / documents)

Fecha: 2026-03-18

Dominio ejemplo: `geology_geophysics`

## Objetivo

Definir un patrón reutilizable para módulos que necesitan las secciones:

- **Scripts** (código Python/Bash/SQL)
- **Applications** (aplicaciones externas vía URL)
- **Documents** (markdown, enlaces o archivos adjuntos)

Reutilizando un mismo conjunto de tablas (`app_scripts`, `app_applications`, `app_documents`)
separadas por un campo `module`, y exponiendo un frontend consistente basado en tabs.

## Backend (FastAPI)

- Modelos compartidos en `modules/data_quality/models.py`:
  - `AppScript`, `AppApplication`, `AppDocument`
  - Constantes de módulo:
    - `MODULE_DATA_QUALITY = "data_quality"`
    - `MODULE_GEOLOGY_GEOPHYSICS = "geology_geophysics"`
- Repositorio genérico en `modules/data_quality/repository.py`:
  - Todas las funciones aceptan un parámetro `module` (por defecto `MODULE_DATA_QUALITY`).
- Para cada módulo nuevo se recomienda:
  - Crear un servicio dedicado, por ejemplo `modules/geology_geophysics/service.py`, que:
    - Use las funciones de repositorio con `module=<CONST_DEL_MODULO>`.
    - Devuelva schemas reutilizando los de `data_quality` (`DQScriptResponse`, etc.).
  - Crear un router dedicado, por ejemplo `modules/geology_geophysics/router.py`, que:
    - Use un **prefijo REST compacto**: `/gyg`, `/dq`, `/drilling`, etc.
    - Agrupe las rutas:
      - `/scripts`
      - `/applications`
      - `/documents`
      - `/files` (upload, descarga y preview).
- El dominio `geology_geophysics` sigue este patrón:
  - Prefijo: `/api/v1/gyg`
  - Reutiliza los modelos/funciones de `data_quality.repository` filtrando por
    `module = MODULE_GEOLOGY_GEOPHYSICS`.

### Rutinas

- Las rutinas siguen en su propia tabla `routines` con campo `module="geology_geophysics"`.
- El router de `geology_geophysics` expone:
  - `/gyg/routines`
  - `/gyg/routines/{id_or_slug}`
  - `/gyg/routines/{id_or_slug}/datasources`

## Frontend (Next.js, `apps/web`)

### Cliente API

- Cliente genérico para el dominio en `lib/api/geology-geophysics.ts`:
  - `BASE = "/api/v1/gyg"`.
  - Expone:
    - `listRoutines`, `getRoutine`, `getRoutineDatasources`
    - `listScripts`, `createScript`, `updateScriptContent`, `deleteScript`
    - `listApplications`, `createApplication`, `deleteApplication`
    - `listDocuments`, `createDocument`, `deleteDocument`
    - `uploadFile`
- Reutiliza el mismo modelo de datos que `lib/api/data-quality.ts`, solo cambiando el
  módulo y el prefijo REST.

### Componente de tabs reutilizable por dominio

- Para `data_quality` existe `app/data-quality/DataQualityTabs.tsx`.
- Para `geology_geophysics` se creó `app/gyg/GygTabs.tsx` siguiendo el mismo patrón:
  - Tabs: `scripts`, `applications`, `documentation`.
  - Búsqueda, filtros, vista tarjetas/lista, panel lateral de script, modales de alta.
  - Usa el cliente `lib/api/geology-geophysics.ts`.

### Página de dominio

- `app/gyg/page.tsx` actúa como **home** del módulo:
  - Carga:
    - Rutinas (`listRoutines` filtrando por `module="geology_geophysics"`).
    - Scripts, applications, documents del módulo.
  - Muestra:
    - Un resumen rápido de rutinas (cards compactas con botón **Run** → `/gyg/[slug]`).
    - El componente de tabs `GygTabs` con scripts/applications/documents.

### Cómo replicar el patrón para un nuevo módulo

Suponiendo un nuevo módulo `production`:

1. **Backend**
   - Añadir constante en `modules/data_quality/models.py`:
     - `MODULE_PRODUCTION = "production"`.
   - Crear servicio `modules/production/service.py` análogo a `geology_geophysics.service.py`
     usando `module=MODULE_PRODUCTION`.
   - Crear router `modules/production/router.py` con prefijo, por ejemplo, `/production`:
     - `/production/scripts`, `/production/applications`, `/production/documents`, `/production/files`.
   - Registrar el router en `apps/api/main.py` con prefijo `/api/v1`.

2. **Frontend**
   - Crear `lib/api/production.ts` copiando la estructura de `geology-geophysics.ts`
     y ajustando `BASE = "/api/v1/production"`.
   - Crear `app/production/ProductionTabs.tsx`:
     - Puede reutilizar gran parte de `GygTabs.tsx`, cambiando textos si hace falta.
   - Crear `app/production/page.tsx`:
     - Carga scripts/applications/documents (y cualquier catálogo adicional del dominio).
     - Renderiza `ProductionTabs`.

3. **Navegación**

   - Añadir el módulo a `lib/nav.ts` para que aparezca en el dashboard principal.
   - Enlazar la ruta pública del módulo (`/production`) desde la portada o secciones relevantes.

## BFF vs cliente directo

- `geology_geophysics` consume directamente FastAPI vía `lib/api/geology-geophysics.ts`
  (no necesita BFF en `app/api/gyg`).
- Para módulos nuevos, usar la misma aproximación salvo que:
  - Requieran secrets del servidor o lógica adicional en el lado Next.js.
  - En ese caso, crear un route handler BFF en `app/api/<modulo>` que proxyee al
    backend.

