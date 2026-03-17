# Módulo Volumes — Protocolos SMB, NFS y FTP

Documentación del plan y las acciones realizadas para soportar **SMB** (Windows Share), **NFS** y **FTP** en el módulo de volúmenes remotos.

---

## 1. Plan y contexto

### Objetivo

Permitir registrar y explorar **recursos compartidos Windows (SMB/CIFS)** desde la aplicación, en lugar de asumir SFTP/SSH. Muchos entornos corporativos exponen carpetas vía `\\servidor\recurso` (net use) y no vía SSH.

### Alcance

- **Backend:** Nuevo adaptador de storage para SMB que implemente la interfaz `BaseStorageAdapter` (list_dir, stat, read_file, upload, create_folder, rename, copy, delete, test_connection).
- **Frontend:** Soporte explícito para el tipo de volumen SMB en el formulario (Share Name, usuario dominio, hints) y eliminación del aviso "not implemented" para SMB.
- **Infra:** Dependencia `smbprotocol` en la API.

### Equivalencia

| Concepto   | net use (Windows)           | Configuración en la app        |
|-----------|-----------------------------|--------------------------------|
| Servidor  | `\\10.11.18.78\saicarga`   | Host: `10.11.18.78`            |
| Recurso   | `saicarga`                 | Share Path (Share Name): `saicarga` |
| Usuario   | `/USER:ECOPETROL\segit`    | Username: `ECOPETROL\segit`   |
| Contraseña| (prompt o parámetro)       | Password (campo cifrado)       |
| Puerto    | 445 (implícito SMB)        | Port: 445                      |

---

## 2. Acciones realizadas

### 2.1 Backend — Adaptador SMB

- **Archivo:** `apps/api/modules/volumes/storage/adapters/smb.py`
- **Contenido:**
  - Clase `SMBAdapter(BaseStorageAdapter)` que usa la librería `smbprotocol` (y `smbclient` como API de alto nivel).
  - Conexión mediante `smbclient.register_session(host, username, password, port=445)` con soporte para usuario en formato `DOMAIN\user`.
  - Paths: el service envía paths con el share como primer segmento (ej. `/saicarga/subcarpeta`); el adaptador extrae el path relativo al share y construye rutas UNC `\\host\share\subpath`.
  - Implementación de: `test_connection`, `list_dir`, `stat`, `exists`, `read_file`, `download_file` (streaming), `upload_file`, `create_folder`, `rename`, `copy` (recursivo), `delete` (recursivo).
  - Mapeo de excepciones a `StorageAuthError`, `StorageConnectionError`, `StoragePathNotFoundError`, `StoragePermissionError`, etc.

### 2.2 Backend — Factory y dependencia

- **Archivo:** `apps/api/modules/volumes/storage/factory.py`
  - Para `volume_type == "smb"` se instancia `SMBAdapter(host, share=share_path, username, password, port=445)`.
  - El campo `share_path` del modelo se usa como nombre del recurso compartido (se normaliza sin barras).
- **Archivo:** `apps/api/requirements.txt`
  - Añadido: `smbprotocol>=1.13.0`.

### 2.3 Frontend — Formulario de volúmenes

- **Archivo:** `apps/web/components/volumes/VolumeForm.tsx`
  - **Protocolo:** SMB ya estaba en el `<select>`; se mantiene con etiqueta "SMB / Windows Share".
  - **Share Path / Share Name:** Label y placeholder dinámicos según protocolo: para SMB se muestra "Share Name *" y placeholder `saicarga`; hint que referencia `net use X: \\host\saicarga`.
  - **Username:** Placeholder para SMB `DOMAIN\username` y texto de ayuda con ejemplo `ECOPETROL\usuario` (equivalente al /USER del net use).
  - **Password:** Label y `required` coherentes con SMB (siempre contraseña; sin opción de clave privada).
  - **Private Key:** Solo visible cuando el protocolo es SFTP.
  - **Aviso "not implemented":** Solo se muestra para **WebDAV** (NFS y FTP quedan implementados).
  - **Banner informativo SMB:** Se añade un bloque que muestra el equivalente `net use X: \\servidor\share /USER:DOMAIN\user ***` con los valores actuales del formulario.
  - **Placeholder del nombre del volumen:** Para SMB se sugiere "Servidor SAICARGA" (o similar contextual).

### 2.4 Backend — Adaptador FTP

- **Archivo:** `apps/api/modules/volumes/storage/adapters/ftp.py`
- **Contenido:**
  - Clase `FTPAdapter(BaseStorageAdapter)` usando `ftplib` (stdlib). Sin dependencias adicionales.
  - Conexión con host, port (21), username, password. `share_path` es el directorio inicial (CWD) tras el login.
  - Listado con MLSD cuando el servidor lo soporta; fallback a NLST + SIZE/MDTM por entrada.
  - Operaciones: test_connection, list_dir, stat, exists, read_file, download_file, upload_file, create_folder, rename, copy (recursivo), delete (recursivo).
  - Mapeo de `error_perm` (530, 550) a `StorageAuthError`, `StoragePathNotFoundError`, `StoragePermissionError`.

### 2.5 Backend — Adaptador NFS

- **Archivo:** `apps/api/modules/volumes/storage/adapters/nfs.py`
- **Contenido:**
  - Clase `NFSAdapter(BaseStorageAdapter)` que monta el export con `mount -t nfs host:share_path` en un directorio temporal y opera con `pathlib`/`shutil`.
  - No usa usuario/contraseña (NFS suele ser por IP o Kerberos). Parámetros: host, share_path (ruta del export, ej. `/data`).
  - `_connect()`: crea temp dir, monta, guarda punto de montaje. `_close()`: desmonta y elimina el dir.
  - Paths: el service envía paths con el export como prefijo; el adaptador obtiene el path relativo y lo resuelve contra el punto de montaje.
  - Requiere **nfs-common** en el contenedor y capacidad de montar (p. ej. `cap_add: SYS_ADMIN` en Docker).
- **Infra:** `apps/api/Dockerfile` — instalación de `nfs-common`.

### 2.6 Factory — FTP y NFS

- **Archivo:** `apps/api/modules/volumes/storage/factory.py`
  - `volume_type == "ftp"` → `FTPAdapter(host, port, username, password, share_path)`.
  - `volume_type == "nfs"` → `NFSAdapter(host, share_path)` (sin credenciales).

### 2.7 Frontend — NFS y FTP

- **VolumeForm.tsx:**
  - **Share Path:** Para NFS label "Export Path *", placeholder `/data or /exports/home`; para FTP placeholder `/ or /incoming` y hint "Directorio inicial tras el login".
  - **Username/Password:** Para NFS no se exigen credenciales; el bloque de usuario se oculta si tipo NFS y ambos vacíos; password con label "(NFS no usa credenciales; dejar vacío)".
  - **Validación:** En creación, NFS no requiere password para ser válido.
  - **Banners:** NFS muestra aviso sobre `cap_add: SYS_ADMIN` para montar; FTP muestra que Share Path es el directorio inicial.
  - **Not implemented:** Solo WebDAV muestra el aviso ámbar.

### 2.8 Configuración de logging (preexistente, aplicada en el mismo periodo)

- **Archivo:** `apps/api/core/logging_config.py`
  - En modo JSON (`log_json=True`) se usa solo `serialize=True` de Loguru, sin format string manual que provocaba conflictos con las llaves en el mensaje.

---

## 3. Archivos tocados (resumen)

| Área     | Archivo                                               | Cambio principal                          |
|----------|--------------------------------------------------------|-------------------------------------------|
| Backend  | `modules/volumes/storage/adapters/smb.py`             | Adaptador SMB                             |
| Backend  | `modules/volumes/storage/adapters/ftp.py`             | Adaptador FTP (ftplib)                    |
| Backend  | `modules/volumes/storage/adapters/nfs.py`             | Adaptador NFS (mount + pathlib)           |
| Backend  | `modules/volumes/storage/factory.py`                  | Factory para SMB, FTP y NFS               |
| Backend  | `requirements.txt`                                    | smbprotocol                              |
| Backend  | `Dockerfile`                                          | nfs-common para NFS                       |
| Backend  | `core/logging_config.py`                              | Ajuste formato JSON de logs               |
| Frontend | `components/volumes/VolumeForm.tsx`                   | Soporte SMB, NFS y FTP (labels, hints, avisos) |

---

## 4. Cómo usar (usuario final)

### SMB (Windows Share)

1. **Protocol:** "SMB / Windows Share". **Host:** IP del servidor. **Share Name:** nombre del recurso (ej. `saicarga`). **Port:** 445.
2. **Username:** `DOMINIO\usuario`. **Password:** contraseña de dominio.
3. Test connection y explorar.

### FTP

1. **Protocol:** "FTP". **Host**, **Port** (21). **Share Path:** directorio inicial tras login (ej. `/` o `/incoming`).
2. **Username** y **Password** (o usuario anónimo si el servidor lo permite).
3. Test connection y explorar.

### NFS

1. **Protocol:** "NFS". **Host:** IP del servidor NFS. **Export Path:** ruta del export (ej. `/data` o `/exports/home`). No se usan usuario/contraseña.
2. El contenedor de la API debe poder ejecutar `mount -t nfs` (en Docker suele requerir `cap_add: SYS_ADMIN` en el servicio api).
3. Test connection y explorar.

---

## 5. Referencias

- Arquitectura del módulo volumes: `AGENTS.md` (flujo router → service → repository; service → factory → adaptador).
- Modelo y migraciones: `apps/api/modules/volumes/models.py`, migraciones `007_app_volumes.py` y `008_volume_audit_logs.py`.
- Interfaz de adaptadores: `apps/api/modules/volumes/storage/base.py` (`BaseStorageAdapter`, `FileStatResult`, excepciones de dominio).
- **SMB:** [smbprotocol](https://github.com/jborean93/smbprotocol) — SMB2/SMB3 en Python.
- **FTP:** `ftplib` (stdlib).
- **NFS:** cliente del sistema (`mount -t nfs`); paquete `nfs-common` en el contenedor.
