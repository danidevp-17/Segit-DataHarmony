# Flujo: Run routine (fallas-split)

Documento de referencia del flujo completo desde el clic en **Run routine** hasta el guardado de archivos en el volumen remoto. Sirve para debugging y para entender dónde validar si algo falla.

---

## Vista general

```
[Frontend] → [Proxy Next.js] → [API FastAPI] → [Celery] → [FallasSplitService] → [Volumen remoto]
```

---

## 1. Frontend (Next.js)

| # | Archivo | Método | Acción |
|---|---------|--------|--------|
| 1 | `apps/web/components/routines/RoutineVolumePathExecution.tsx` | `handleSubmit` | Valida formulario (volume, path obligatorios). |
| 2 | — | `createJob(formData, apiOptions)` | Llama a `POST /api/jobs` con FormData. |
| 3 | `apps/web/lib/api/jobs.ts` | `createJob` | Hace `fetch("/api/jobs", { method: "POST", body: formData })`. |
| 4 | `RoutineVolumePathExecution` | `router.push(\`/jobs/${data.id}\`)` | Redirige a la página del job para monitorear. |

**FormData enviado:**
- `routineId` — slug de la routine (ej. `fallas-split`)
- `moduleId` — `geology_geophysics`
- `volumeId` — UUID del volumen seleccionado
- `params` — JSON con `{ directoryPath, faultNameFilter, overwriteExisting }`

---

## 2. Proxy Next.js (BFF)

| # | Archivo | Método | Acción |
|---|---------|--------|--------|
| 5 | `apps/web/app/api/jobs/route.ts` | `POST` | Reenvía FormData a `POST {API_URL}/api/v1/jobs` con `Authorization: Bearer <token>`. |

---

## 3. API FastAPI

| # | Archivo | Método | Acción |
|---|---------|--------|--------|
| 6 | `apps/api/modules/jobs/router.py` | `post_job` | Parsea FormData en `JobCreate` (routineId, params, volumeId, etc.). |
| 7 | `apps/api/modules/jobs/service.py` | `create_job_from_routine` | Crea job en BD (status PENDING), encola `run_routine.delay(job.id)` en Celery. |
| 8 | `apps/api/modules/jobs/repository.py` | `create_job` | Inserta fila en `jobs` con `payload`. |

**Payload del job:**
```json
{
  "routineId": "fallas-split",
  "params": {
    "directoryPath": "/ruta/en/volumen",
    "faultNameFilter": "",
    "overwriteExisting": false
  },
  "volumeId": "uuid-del-volumen"
}
```

---

## 4. Celery Worker

| # | Archivo | Método | Acción |
|---|---------|--------|--------|
| 9 | `apps/api/modules/jobs/tasks.py` | `run_routine` | Celery ejecuta la tarea. |
| 10 | — | — | Obtiene job por ID, carga routine por slug, actualiza job a RUNNING. |
| 11 | — | — | Si `routine.execution_mode == "fallas_volume_split"`, llama a `FallasSplitService.execute_on_volume`. |
| 12 | — | — | Actualiza job: SUCCESS con `result` o FAILURE con `error`. |

**Detección de modo:** La routine `fallas-split` tiene `execution_mode = "fallas_volume_split"` en BD (seed desde `routines/catalog.json`).

---

## 5. Fallas split (dominio)

| # | Archivo | Método | Acción |
|---|---------|--------|--------|
| 13 | `modules/routines/fallas_split/service.py` | `FallasSplitService.execute_on_volume` | Obtiene volumen, adaptador de almacenamiento y valida directorio. |
| 14 | — | `adapter.read_file(fallas_path)` | Lee `fallas.dat` del volumen remoto. |
| 15 | `modules/routines/fallas_split/reader.py` | `load_fallas_dataframe` | Parsea CSV en DataFrame (columnas X, Y, Z, Fault Name, Sequence Number). |
| 16 | `reader` | `filter_by_fault_name` | Filtra por Fault Name si `faultNameFilter` no está vacío. |
| 17 | `modules/routines/fallas_split/transform.py` | `group_rows_by_fault` | Agrupa filas por Fault Name. |
| 18 | `modules/routines/fallas_split/writer.py` | `build_outputs` | Genera `{fault_name}_convert.dat` y contenido para cada grupo. |
| 19 | `service` | — | Verifica conflictos: si existen archivos y no hay overwrite → `FallasSplitConflictError`. |
| 20 | `service` | `adapter.upload_file(remote, content.encode("utf-8"))` | **Guarda cada archivo en el volumen remoto.** |
| 21 | `service` | — | Retorna `result` con `filesWritten`, `fileNames`, `rowsPerFault`, `validation`, etc. |

---

## Puntos de validación al depurar

| Si falla... | Revisar |
|-------------|---------|
| Frontend no envía o error en submit | `RoutineVolumePathExecution.handleSubmit`, `createJob` en `lib/api/jobs.ts` |
| Proxy devuelve 401/502 | `app/api/jobs/route.ts`, token de sesión, `getApiBaseUrl()` |
| API rechaza o error al crear job | `modules/jobs/router.py` `post_job`, schemas `JobCreate` |
| Job queda PENDING indefinidamente | Celery worker corriendo, `run_routine.delay` en `jobs/service.py` |
| Job FAILURE en Celery | `modules/jobs/tasks.py` `run_routine`, extracción de `volumeId`, `params.directoryPath` |
| Error al leer/escribir volumen | `adapter.read_file`, `adapter.upload_file`, permisos, ruta |
| Error al parsear CSV | `reader.load_fallas_dataframe`, columnas esperadas |
| Archivos no se guardan o nombre incorrecto | `writer.build_outputs` (nombre `{fault_name}_convert.dat`), loop en `service` con `adapter.upload_file` |

---

## Archivos clave

```
apps/web/components/routines/RoutineVolumePathExecution.tsx   # Formulario, handleSubmit
apps/web/lib/api/jobs.ts                                     # createJob
apps/web/app/api/jobs/route.ts                               # Proxy POST
apps/api/modules/jobs/router.py                              # post_job
apps/api/modules/jobs/service.py                             # create_job_from_routine
apps/api/modules/jobs/tasks.py                               # run_routine (Celery)
apps/api/modules/routines/fallas_split/service.py            # execute_on_volume
apps/api/modules/routines/fallas_split/reader.py             # load_fallas_dataframe
apps/api/modules/routines/fallas_split/writer.py             # build_outputs
apps/api/modules/volumes/storage/                            # Adaptadores (SMB, SFTP, etc.)
```

---

## Referencias

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Visión general del monorepo
- [Specs/gyg-fallas-split.md](./Specs/gyg-fallas-split.md) — Especificación de fallas-split
- [AGENTS.md](../AGENTS.md) — Convenciones y comandos del proyecto
