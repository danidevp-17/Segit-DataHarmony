# Sprint 8 — Rutina fallas-split en volúmenes y monitoreo de jobs

**Objetivo:** Ejecutar la rutina `fallas-split` en modo `fallas_volume_split` (leyendo `fallas.dat` desde volúmenes remotos), generar los `.dat` de salida con el formato legacy compatible con Petrel y habilitar una experiencia consistente de monitoreo de `jobs` en la UI.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-45 | Migración `009`: incorporar `execution_mode` en rutinas | ✅ |
| T-46 | Migración `010`: seed de la rutina `fallas-split` con `executionMode: fallas_volume_split` | ✅ |
| T-47 | Backend: soporte en `jobs/tasks.py` para `execution_mode == fallas_volume_split` delegando en `FallasSplitService` | ✅ |
| T-48 | Backend: `FallasSplitService` lee `fallas.dat`, agrupa por `Fault Name` y escribe `<Fault Name>.dat` en el mismo directorio bajo el share | ✅ |
| T-49 | Backend: `writer.py` genera líneas con anchura/espaciado y 5 decimales replicando el `printf` legacy de `arreglo.dat` | ✅ |
| T-50 | Backend: Jobs API soporta `volumeId` y el esquema de rutina entrega el perfil `volume_path` a la UI | ✅ |
| T-51 | Frontend: sección `Jobs` integrada en el mismo panel/grilla de módulos (sin CTA suelto en el header) | ✅ |
| T-52 | Frontend: GYG rutina `fallas-split` usa `volume_path` y el explorador de directorios (búsqueda interna y reset al entrar carpeta) | ✅ |
| T-53 | Tests: fixtures y unit tests para `faults_to_petrel` cubriendo formato de salida | ✅ |

---

## Backend — ejecución en volumen remoto

- Flujo Celery:
  1. `POST /api/v1/jobs` crea el job
  2. el worker `run_routine` detecta `execution_mode == fallas_volume_split`
  3. delega en `FallasSplitService.execute_on_volume(...)`
- Entrada:
  - `directoryPath`: directorio donde existe `fallas.dat`
  - `faultNameFilter` (opcional)
  - `overwriteExisting`
- Salida:
  - para cada `Fault Name` se genera `<Fault Name>.dat` en el mismo directorio
  - cada línea replica el `printf` legacy: `%7s %11d %10d %15.5f %15.5f %15.5f %20s %-12d`

---

## Frontend — monitoreo y perfil `volume_path`

- `Jobs` aparece como tarjeta/módulo en la grilla del hub, alineado con el resto de módulos.
- La página de GYG para `fallas-split` se renderiza con el perfil `volume_path`, usando:
  - selector de volumen
  - ruta bajo el share
  - explorador de directorios con búsqueda y limpieza de estado al entrar en carpeta
- Se amplía el cliente web para soportar listado de jobs y obtención de logs para diagnóstico.

---

## Infra y documentación

- Actualización de `routines/catalog.json`/seed y documentación de `gyg-fallas-split` para reflejar el contrato de entrada/salida y el formato legacy de `.dat`.

---

## Notas y próximos pasos

- Validar en entornos con SMB/NFS reales la compatibilidad completa con el formato legacy (espacios/decimales).
- Optimizar rendimiento para `fallas.dat` grandes (tiempo por etapa y tamaño de salida).
- Mejorar UX de diagnósticos en `jobs` (logs/detalle) para reducir re-ejecuciones.

