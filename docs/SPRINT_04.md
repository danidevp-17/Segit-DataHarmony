# Sprint 4 — Módulo Data Quality

**Objetivo:** Migrar el módulo Data Quality de Next.js (JSON local) a FastAPI: CRUD en PostgreSQL, almacenamiento de archivos en disco, preview de archivos en Python, y UI consumiendo la API.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-20 | Modelos y migración DQ (scripts, applications, documents) | ✅ |
| T-21 | File storage en disco (UUID), preview Python (openpyxl, mammoth) | ✅ |
| T-22 | API CRUD scripts, applications, documents, files | ✅ |
| T-23 | Migrar UI data-quality a FastAPI | ✅ |

---

## FastAPI – Módulo data_quality

### Estructura

```
apps/api/modules/data_quality/
├── __init__.py
├── models.py          # DQScript, DQApplication, DQDocument
├── schemas.py         # DTOs (Create, Response, FileUploadResponse)
├── repository.py      # CRUD scripts, applications, documents
├── file_storage.py    # save_file, read_file, delete_file (disco)
├── preview.py         # get_preview (imagen, PDF, xlsx, docx, texto, LAS, etc.)
├── service.py         # Servicios delegando a repository + file_storage
└── router.py          # Endpoints REST
```

### Modelos (PostgreSQL) — tablas compartidas

Las tablas `app_scripts`, `app_applications` y `app_documents` son compartidas por todos los módulos. La columna `module` identifica el contexto (p. ej. `data_quality`, `drilling`).

| Tabla | Campos principales |
|-------|---------------------|
| app_scripts | id, **module**, name, description, language, content |
| app_applications | id, **module**, name, description, url, category |
| app_documents | id, **module**, title, description, type, content, url, file_id, file_name, mime_type, file_size |

Los archivos se guardan en disco (`dq_uploads_path` en config), identificados por UUID. No hay tabla de archivos; el documento apunta a `file_id`.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/v1/data-quality/scripts | Lista scripts |
| POST | /api/v1/data-quality/scripts | Crear script |
| GET | /api/v1/data-quality/scripts/{id} | Obtener script |
| PUT | /api/v1/data-quality/scripts/{id} | Actualizar contenido |
| DELETE | /api/v1/data-quality/scripts/{id} | Eliminar script |
| GET | /api/v1/data-quality/applications | Lista aplicaciones |
| POST | /api/v1/data-quality/applications | Crear aplicación |
| DELETE | /api/v1/data-quality/applications/{id} | Eliminar aplicación |
| GET | /api/v1/data-quality/documents | Lista documentos |
| POST | /api/v1/data-quality/documents | Crear documento |
| DELETE | /api/v1/data-quality/documents/{id} | Eliminar documento (y archivo en disco si aplica) |
| POST | /api/v1/data-quality/files | Subir archivo (multipart) |
| GET | /api/v1/data-quality/files/{id} | Descargar archivo |
| GET | /api/v1/data-quality/files/{id}/preview | JSON de preview (type, content, sheets, html, etc.) |

### Preview de archivos (Python)

El módulo `preview.py` genera JSON compatible con `DocViewerPanel`:

- **Imagen**: `{ type: "image" }` — el frontend carga el binario vía `/files/{id}`
- **PDF**: `{ type: "pdf" }`
- **XLSX / CSV**: `{ type: "xlsx", sheetNames, sheets }` (openpyxl)
- **DOCX**: `{ type: "docx", html }` (mammoth)
- **Texto / LAS / LIS**: `{ type: "text", content, ext }`
- **PPTX / DLIS**: `{ type: "pptx_legacy", info }` (sin preview, solo mensaje)

### Configuración

| Variable | Descripción |
|----------|-------------|
| DQ_UPLOADS_PATH | Ruta de almacenamiento (default: `./data/uploads/data-quality`) |

---

## Next.js – Migración de la UI

### Cambios principales

1. **Página data-quality**: Ahora es cliente (`"use client"`), carga datos con `listScripts`, `listApplications`, `listDocuments` vía el cliente API.
2. **Cliente API** (`lib/api/data-quality.ts`): Llama a FastAPI con Bearer token (`apiOptions.accessToken`).
3. **Proxy para archivos**: `/api/data-quality/files/[id]` y `/api/data-quality/files/[id]/preview` reenvían a FastAPI con el token de sesión (para `<img>`, `<object>`, descargas).
4. **Tipos unificados**: Los componentes usan `DQScript`, `DQApplication`, `DQDocument` desde `@/lib/api/data-quality`.

### Dependencias

- `openpyxl>=3.1.0` y `mammoth>=1.6.0` en `apps/api/requirements.txt`
- Migración `003_data_quality.py` crea las tablas

### Pasos para ejecutar

1. Instalar dependencias de la API: `pip install -r apps/api/requirements.txt`
2. Ejecutar migraciones: `alembic upgrade head` (desde `apps/api`)
3. Iniciar API: `uvicorn main:app --reload`
4. Iniciar Next.js: `npm run dev` (desde `apps/web`)
