# GYG — Fallas split (`fallas-split`)

## Objetivo

Migración del flujo legacy (bash/awk sobre `fallas.dat`) a Python. La lógica vive en **`FallasSplitService`** (`modules/routines/fallas_split/service.py`). Celery solo crea el job, pasa a RUNNING y delega en el servicio; así la cola y el estado quedan en la tabla `jobs`. La UI en **GYG** usa el perfil `volume_path`: selector de volumen, ruta manual y explorador de directorios.

La rutina **`fallas-split`** se registra en BD por la migración **010** (no hace falta `catalog.json`).

## Contrato de entrada (CSV)

Archivo **`fallas.dat`** en el directorio de trabajo, columnas:

| Columna           |
|-------------------|
| X                 |
| Y                 |
| Z                 |
| Fault Name        |
| Sequence Number   |

Comillas dobles en campos se eliminan. Se agrupa por **Fault Name** y se mantiene el orden de filas del CSV dentro de cada grupo.

## Salida

En el **mismo directorio** que `fallas.dat`, un archivo por falla:

`<Fault Name>.dat`

Cada línea replica el `printf` legacy de `arreglo.dat` / `f2.dat`:

`%7s %11d %10d %15.5f %15.5f %15.5f %20s %-12d` → `INLINE-`, `2147483647`, `2147483647`, X, Y, Z (5 decimales, ancho 15), Fault Name (ancho 20), Sequence Number (entero alineado a la izquierda en 12).

Si `Fault Name` contiene caracteres inválidos para nombre de archivo (`\ / : * ? " < > |`), el job **falla** con mensaje explícito.

## Job (API)

- **POST** `/api/v1/jobs` (FormData), igual que otras routines.
- **Campos:**
  - `routineId`: `fallas-split`
  - `moduleId`: `geology_geophysics`
  - `volumeId`: UUID del volumen (también en payload para auditoría).
  - `params` (JSON string):
    - `directoryPath` (obligatorio): ruta del directorio que contiene `fallas.dat` (misma convención que el explorador de volúmenes).
    - `faultNameFilter` (opcional): si no vacío, solo se procesan filas con ese **Fault Name** exacto.
    - `overwriteExisting` (boolean): si `false` y ya existe un `.dat` de salida, el job falla listando conflictos.

## Errores frecuentes

| Caso                         | Resultado                          |
|-----------------------------|-------------------------------------|
| Directorio inexistente      | FAILURE                             |
| Sin `fallas.dat`            | FAILURE                             |
| CSV / columnas inválidas    | FAILURE                             |
| Filtro de falla sin filas   | FAILURE                             |
| Salidas existentes sin overwrite | FAILURE + `conflictingFiles` |
| Volumen inactivo / red      | FAILURE                             |

## Resultado del job (`job.result`)

Incluye entre otros:

- `filesWritten`: rutas remotas escritas
- `fileNames`: nombres de archivo generados
- `rowsPerFault`: conteo de filas por falla
- `directory`: directorio sanitizado
- `stdout`: resumen legible
- `validation`: comparación golden (si se configurara en código); por defecto indica que no hay golden en job.

## Operativa

1. Migración **009**: columna `routines.execution_mode`.
2. Seed: `python scripts/seed_routines.py` (catálogo `routines/catalog.json`) crea/actualiza `fallas-split` con `executionMode: fallas_volume_split`.
3. El **worker Celery** debe poder alcanzar el mismo storage que la API (red, credenciales, `ENCRYPTION_KEY`).
4. Frontend: **POST** `/api/jobs` vía BFF Next.js (`app/api/jobs/route.ts`) con token de sesión.

## Tests

`apps/api/tests/test_fallas_split.py` y fixtures en `apps/api/tests/fixtures/fallas_split/`.
