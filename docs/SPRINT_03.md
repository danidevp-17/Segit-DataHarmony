# Sprint 3 — Módulo Data Sources (Admin)

**Objetivo:** Migrar el módulo Admin/DataSources de Next.js a FastAPI: CRUD en PostgreSQL, connectors Python (PostgreSQL, SQL Server, Oracle), cifrado de credenciales y UI consumiendo la API.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-16 | Módulo `data_sources/` en FastAPI | ✅ |
| T-17 | Connectors Python (postgres, sqlserver, oracle) | ✅ |
| T-18 | Encriptación de credenciales (Fernet) | ✅ |
| T-19 | Migrar UI admin/datasources → FastAPI | ✅ |

---

## FastAPI – Módulo data_sources

### Estructura

```
apps/api/modules/data_sources/
├── __init__.py
├── models.py          # DataSource (tabla data_sources)
├── schemas.py         # DataSourceCreate, DataSourceUpdate, DataSourceResponse, TestConnection*
├── repository.py      # get_all, get_by_id, create, update, delete
├── service.py        # list_datasources, create_datasource, update_datasource, test_*, cifrado
├── router.py          # Endpoints REST
├── validators.py      # validate_test_payload, test_connection (delega a connectors)
└── connectors/
    ├── __init__.py
    ├── base.py        # TestPayload, TestResult (TypedDict)
    ├── postgres.py    # psycopg2
    ├── mssql.py       # pyodbc (ODBC Driver 17 for SQL Server)
    └── oracle.py      # oracledb (thin)
```

### Modelo de datos (PostgreSQL)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String(256) | Nombre del datasource |
| type | String(32) | postgres, sqlserver, oracle |
| host | String(256) | Host o IP |
| port | Integer | Puerto |
| database | String(256) | Base de datos (postgres/sqlserver) |
| service_name | String(256) | Servicio Oracle |
| username | String(256) | Usuario |
| password_encrypted | Text | Contraseña cifrada con Fernet |
| options | JSONB | Opciones (ej. encrypt para SQL Server) |
| is_active | Boolean | Activo |
| created_at, updated_at | DateTime | Auditoría |

### Cifrado (core/encryption.py)

- **Algoritmo:** Fernet (AES-128-CBC + HMAC-SHA256).
- **Clave:** Derivada de `ENCRYPTION_KEY` con PBKDF2 (SHA256, 480k iteraciones, salt fijo).
- **Uso:** Solo cifrado/descifrado; la clave no se persiste. Si se pierde `ENCRYPTION_KEY`, las contraseñas guardadas no se pueden recuperar.
- **Variable:** `ENCRYPTION_KEY` en `.env` (recomendado: 32+ caracteres aleatorios).

### Connectors

| Motor | Librería | Notas |
|-------|----------|--------|
| PostgreSQL | psycopg2 | Incluida en requirements |
| SQL Server | pyodbc | Requiere "ODBC Driver 17 for SQL Server" en el sistema |
| Oracle | oracledb | Modo thin (no requiere Instant Client) |

- Timeout de conexión: 5 segundos.
- Errores mapeados a códigos: `TIMEOUT`, `AUTH_ERROR`, `CONNECTION_REFUSED`, `DNS_ERROR`, `DRIVER_MISSING`, etc.

### Endpoints (prefijo `/api/v1/data-sources`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | / | Lista todos (sin contraseña) |
| POST | / | Crea uno (valida conexión antes de guardar) |
| POST | /test | Prueba conexión sin guardar (body: type, host, port, …) |
| GET | /{id} | Obtiene uno |
| PUT | /{id} | Actualiza (valida conexión si cambian host/port/password/…) |
| DELETE | /{id} | Elimina |
| POST | /{id}/test | Prueba conexión del datasource guardado |

Todos requieren autenticación (JWT o `AUTH_SKIP_VALIDATION` en dev).

---

## Next.js – Migración UI

### Cliente API (lib/api/data-sources.ts)

- `listDataSources`, `getDataSource`, `createDataSource`, `updateDataSource`, `deleteDataSource`
- `testDataSourceConnection(id)`, `testConnectionPayload(payload)`
- Respuestas en snake_case; el cliente expone `DataSourceForUI` con `serviceName` (camelCase) para la UI.

### Página admin/datasources (app/admin/datasources/page.tsx)

- **Antes:** `fetch("/api/admin/datasources")` y rutas Next.js API.
- **Ahora:** `useSession()` para `accessToken` y llamadas a `lib/api/data-sources.ts` con `apiOptions = { accessToken }`.
- Flujo igual: listar, crear (con test previo), editar, eliminar, test desde lista y desde modal.
- Errores 422 (validación de conexión) se muestran en el estado de test del formulario.

### Rutas Next.js que dejan de usarse para datasources

- Las rutas bajo `app/api/admin/datasources/` pueden mantenerse por compatibilidad o eliminarse cuando no queden consumidores. La UI ya no las usa.

---

## Migración de datos (JSON → PostgreSQL)

Si existían datasources en `data/datasources.json` y `data/secrets.json`:

1. **Exportar desde la app antigua:** listar datasources (sin contraseña) y tener las contraseñas por otro canal, o
2. **Recrear en la UI:** con la API ya en FastAPI, crear cada datasource de nuevo y probar conexión.
3. No hay script de migración automático (las contraseñas estaban en secrets y deben reintroducirse).

---

## Variables de entorno

### API (.env o apps/api/.env)

```bash
# Obligatorio para crear/editar datasources
ENCRYPTION_KEY=<clave_secreta_32_caracteres_o_mas>

# Resto igual que Sprint 1-2
DATABASE_URL=...
```

### Generar ENCRYPTION_KEY

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

O una frase larga; se deriva con PBKDF2.

---

## Dependencias nuevas (API)

- `cryptography>=42.0.0` (Fernet)
- `oracledb>=2.0.0`
- `pyodbc>=5.0.0` (opcional si no se usa SQL Server)

---

## Migración Alembic

- **Versión:** 002
- **Archivo:** `migrations/versions/002_data_sources.py`
- **Acción:** Crear tabla `data_sources` e índice en `type`.

```bash
cd apps/api
alembic upgrade head
```

---

## Tradeoffs

| Decisión | Alternativa | Razón |
|----------|-------------|--------|
| Fernet con clave derivada (PBKDF2) | Clave Fernet directa de 32 bytes | Permite usar una frase como ENCRYPTION_KEY |
| Validar conexión antes de crear/actualizar | Solo guardar | Evita guardar configuraciones que no conectan |
| Connectors en el mismo repo | Servicio externo | Menor complejidad operativa; suficiente para este módulo |
| pyodbc para SQL Server | pymssql u otro | pyodbc + ODBC Driver es el estándar en muchos entornos |

---

## Próximos pasos (Sprint 4)

- Migrar Data Quality a FastAPI (scripts, aplicaciones, documentos, archivos).
- O continuar con otros módulos de admin (políticas, auth) según prioridad.
