# Sprint 7 — Volúmenes remotos y explorador de archivos

**Objetivo:** Incorporar un módulo de volúmenes remotos (SFTP, SMB, NFS, FTP) con explorador de archivos en la web, auditoría detallada y mejoras menores de UX/API.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-40 | Modelo AppVolume y migraciones 007/008 para volúmenes y auditoría | ✅ |
| T-41 | Adaptadores de storage (SFTP, SMB, FTP, NFS) y factory | ✅ |
| T-42 | Endpoints de explorador de archivos (listado, preview, download, ZIP) | ✅ |
| T-43 | UI de administración de volúmenes y file browser en Next.js | ✅ |
| T-44 | Auditoría de acciones sobre volúmenes y entradas (rename, copy, delete, download) | ✅ |

---

## Backend — módulo de volúmenes

- Tabla `app_volumes` con metadata de conexión y flags de activación.
- Tabla `app_volume_audit_logs` para trazar todas las acciones de usuario.
- Adaptadores:
  - **SFTP** (Paramiko)
  - **SMB/CIFS** (smbprotocol, equivalente a `net use`)
  - **FTP** (ftplib)
  - **NFS** (mount dentro del contenedor, usando `nfs-common`).
- Service centralizado que hace:
  - Normalización/sanitización de paths.
  - Mapeo de errores de storage → códigos HTTP.
  - Registro de auditoría consistente para éxito y error.

---

## Frontend — página de Volumes y explorador

- Nueva sección de navegación `Storage & Volumes` en la barra lateral.
- Página `/volumes` con:
  - Listado de volúmenes.
  - Modales de creación/edición con soporte SFTP/SMB/FTP/NFS.
- Explorador de archivos con:
  - Listado recursivo de carpetas/archivos.
  - Preview para tipos de archivo soportados.
  - Descarga de archivo individual.
  - Descarga de carpeta como ZIP.
  - Filtro por nombre de entrada.
- Integración con `sonner` para toasts de éxito/error.

---

## Infra y dependencias

- Imagen de la API instala `nfs-common` para soportar montajes NFS.
- Nuevas dependencias Python: `paramiko`, `smbprotocol`.
- Cliente web:
  - Nueva función `apiPatch`.
  - Registro del `Toaster` global en el layout.

---

## Notas y próximos pasos

- Revisar límites de tamaño y timeout en operaciones de ZIP en entornos con grandes volúmenes de archivos.
- Evaluar agregar WebDAV u otros protocolos como extensiones del mismo módulo.