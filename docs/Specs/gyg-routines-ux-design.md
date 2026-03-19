# Spec: UX y Arquitectura — Rutinas en Geology & Geophysics

Fecha: 2026-03-19

## Resumen

Propuesta de arquitectura de información y UX para escalar la visualización de rutinas ejecutables en el módulo Geology & Geophysics. Incluye diferenciación visual frente a scripts, aplicaciones y documentación, con búsqueda, filtros y estructura progresiva. Validado con skills brainstorming, ui-ux-pro-max, frontend-design y next-best-practices.

## 1. Diagnóstico del problema (pre-implementación)

### Estado anterior

- **Rutinas**: Una sola sección con cards compactas en grid, sin búsqueda ni filtros.
- **Scripts, aplicaciones, documentación**: En GygTabs con búsqueda, filtros, toggle cards/lista.
- Rutinas como "ciudadano de segunda clase" respecto al resto de contenido.
- Grid plano sin escalabilidad; dispersión de entry points (`/routines` vs `/gyg`).
- Diferenciación visual débil del CTA "Run"; sin metadata útil.

### Datos del modelo Routine

`slug`, `name`, `description`, `script`, `params`, `file_inputs`, `needs_datasource`, `module`, `execution_mode` → `executionProfile`: `default` | `volume_path`.

---

## 2. Solución adoptada: Opción A

- **Landing `/gyg`**: Resumen de 4 rutinas + botones "Ver rutinas" y "N rutinas" + tabs (Scripts | Apps | Docs).
- **Catálogo `/gyg/routines`**: Búsqueda, filtros (perfil, datasource), toggle cards/lista, metadata en cards.
- **Detalle `/gyg/[slug]`**: Sin cambios (formulario de ejecución).
- **Nav**: Geology & Geophysics → Geology & Geophysics, Rutinas, Settings.
- **Redirecciones**: `/routines` → `/gyg/routines`; `/routines/:id` → `/gyg/:id`.

---

## 3. Diferenciación visual

| Tipo            | Color principal      | Icono     | Acción primaria |
| --------------- | -------------------- | --------- | --------------- |
| Rutinas         | cyan/teal (gradient) | Play      | Run             |
| Scripts         | slate + badges       | FileCode2 | Ver / Editar    |
| Aplicaciones    | violet               | Globe     | Abrir           |
| Documentación   | amber / violet       | BookOpen  | Ver             |

- Rutinas: borde o barra superior cyan/teal; botón Run cuadrado (`rounded-lg`); badge `volume_path` / `needsDatasource`.
- Botones con mismo tamaño que "Nuevo script": `px-3.5 py-2 text-sm font-medium`.

---

## 4. Implementación

### Archivos creados

| Archivo | Descripción |
| ------- | ----------- |
| `apps/web/app/gyg/routines/page.tsx` | Catálogo con búsqueda, filtros, toggle cards/lista |
| `apps/web/app/gyg/loading.tsx` | Suspense fallback landing |
| `apps/web/app/gyg/routines/loading.tsx` | Suspense fallback catálogo |
| `apps/web/components/routines/RoutineCard.tsx` | Card de rutina (modo normal y compact) |
| `apps/web/components/routines/RoutineListView.tsx` | Vista tabla |
| `apps/web/components/routines/RoutinesFilters.tsx` | Búsqueda + filtros + toggle vista |
| `apps/web/components/routines/routine-utils.ts` | Iconos y colores por slug |

### Archivos modificados

| Archivo | Cambio |
| ------- | ------ |
| `apps/web/app/gyg/page.tsx` | Landing con 4 rutinas, botones Ver rutinas / N rutinas, RoutineCard compact |
| `apps/web/lib/nav.ts` | Entrada "Rutinas" en Geology & Geophysics |
| `apps/web/next.config.ts` | Redirects `/routines` → `/gyg/routines`, `/routines/:id` → `/gyg/:id` |
| `apps/web/app/data-quality/DataQualityTabs.tsx` | Fix `doc.url` null en href |

### Archivos eliminados

| Archivo | Razón |
| ------- | ----- |
| `apps/web/app/routines/page.tsx` | Sustituido por `/gyg/routines` + redirect |
| `apps/web/app/routines/[id]/page.tsx` | Sustituido por `/gyg/[id]` + redirect |

---

## 5. Plan de evolución futura (Fase 2 y 3)

### Fase 2 — Diferenciación visual (opcional)

- Unificar diseño de cards; revisar paleta.

### Fase 3 — Extensibilidad (opcional)

- Añadir `category` al modelo Routine si hay dominios claros.
- Búsqueda en backend; rutinas recientes o favoritas.

---

## Referencias

- Plan original: `.cursor/plans/rutinas_geology_geophysics_ux_31b0cbcf.plan.md`
- Patrón compartido: [geology_geophysics-shared-sections-pattern.md](./geology_geophysics-shared-sections-pattern.md)
- AGENTS.md: paleta slate, cyan, emerald, violet
