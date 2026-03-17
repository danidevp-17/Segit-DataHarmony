# En el backend:

Quiero implementar en el backend un módulo MVP de gestión de volúmenes remotos y explorador de archivos, siguiendo la arquitectura y patrones existentes del proyecto.

IMPORTANTE:
- Esto es un MVP funcional, no una solución enterprise completa.
- Priorizar claridad, mantenibilidad y funcionamiento real.
- No sobreingenierizar.
- Mantener compatibilidad con la arquitectura actual.
- Seguir exactamente el patrón de los modelos, schemas, repository, service y router ya existentes en:
  - apps/api/modules/volumes/models.py
  - apps/api/modules/volumes/schemas.py
  - apps/api/modules/volumes/repository.py
  - apps/api/modules/volumes/service.py
  - apps/api/modules/volumes/router.py

## Objetivo funcional

Necesito un módulo que permita:
1. Registrar volúmenes remotos en base de datos.
2. Probar conexión a un volumen.
3. Explorar carpetas y archivos dentro del volumen.
4. Crear carpetas.
5. Subir archivos.
6. Descargar archivos.
7. Renombrar archivos o carpetas.
8. Eliminar archivos o carpetas.
9. Duplicar/copiar archivos o carpetas.
10. Previsualizar contenido básico de archivos compatibles.
11. Registrar en base de datos todas las acciones ejecutadas por el usuario autenticado, tanto exitosas como fallidas.

## Alcance MVP

Implementar arquitectura preparada para múltiples protocolos, pero para el MVP:
- Dejar el diseño listo para soportar: smb, nfs, ftp, sftp, webdav
- Implementar de forma funcional al menos un protocolo end-to-end (preferiblemente sftp), con una interfaz/adaptador extensible
- Los demás protocolos pueden quedar preparados a nivel de modelo/validación/arquitectura, pero no es obligatorio implementarlos todos completamente en este MVP

## Requerimientos de arquitectura

La solución NO debe mezclar acceso a PostgreSQL con acceso a storage remoto en el mismo repository.

Arquitectura esperada:

router -> service
service -> repository (PostgreSQL)
service -> storage adapter factory
storage adapter factory -> adapter concreto (ej. sftp)

Separación de responsabilidades:
- repository: persistencia en PostgreSQL
- service: reglas de negocio y orquestación
- storage adapter: operaciones reales sobre el volumen remoto
- router: exposición HTTP
- schemas: validación y serialización

## Modelo AppVolume

Agregar modelo AppVolume siguiendo exactamente el estilo existente en models.py.

Tabla: app_volumes

Campos:
- id: UUID PK (usar UUIDMixin)
- module: String(64), indexado, obligatorio
- name: String(256), obligatorio
- description: Text, opcional
- volume_type: String(32), obligatorio. Valores permitidos: smb, nfs, ftp, sftp, webdav
- host: String(512), obligatorio
- share_path: String(1024), obligatorio
- port: Integer, nullable
- username: String(256), nullable
- encrypted_credentials: JSONB, nullable
- is_active: Boolean, default True
- created_at / updated_at: usar TimestampMixin

Reglas:
- No exponer credenciales sensibles en responses
- encrypted_credentials debe manejarse como campo interno
- Validar consistencia mínima según volume_type

## Modelo AuditLog

Agregar una tabla para auditoría de acciones del explorador y gestión de volúmenes.

Nombre sugerido: app_volume_audit_logs

Campos mínimos:
- id: UUID PK
- user_id: UUID o String según el sistema actual de usuarios/autenticación
- user_email: String(256), nullable
- username: String(256), nullable
- action: String(64), obligatorio
- module: String(64), obligatorio
- volume_id: UUID, nullable
- volume_name: String(256), nullable
- source_path: String(2048), nullable
- target_path: String(2048), nullable
- destination_path: String(2048), nullable
- status: String(32), obligatorio (success, error)
- error_message: Text, nullable
- metadata: JSONB, nullable
- ip_address: String(128), nullable
- user_agent: String(1024), nullable
- created_at: timestamp

Registrar auditoría para:
- creación/actualización/eliminación de volumen
- test de conexión
- listado de directorios
- preview de archivo
- upload
- download
- create folder
- rename
- copy/duplicate
- delete

Registrar también intentos fallidos.

## Migraciones

Crear migraciones nuevas:
1. app_volumes
2. app_volume_audit_logs

Actualizar imports necesarios en:
- apps/api/main.py
- apps/api/migrations/env.py

## Schemas requeridos

Agregar schemas en schemas.py con estilo consistente al proyecto.

Para AppVolume:
- AppVolumeCreate
- AppVolumeUpdate
- AppVolumeResponse
- AppVolumeListResponse si el proyecto usa wrappers de lista

Para conexión:
- AppVolumeConnectionTestResponse

Para explorador:
- FileEntryResponse
- DirectoryListResponse
- FilePreviewResponse
- CreateFolderRequest
- RenameEntryRequest
- CopyEntryRequest
- DeleteEntryRequest
- UploadResponse

Sugerencia de FileEntryResponse:
- name
- path
- type (file/folder)
- size
- modified_at
- mime_type nullable
- extension nullable

## Repository

En repository.py agregar funciones para AppVolume y AuditLog:

Volúmenes:
- get_all_volumes
- get_volume_by_id
- create_volume
- update_volume
- delete_volume

Auditoría:
- create_audit_log

Mantener estilo del proyecto y manejo de Session existente.

## Storage adapters

Crear una capa nueva para acceso a storage remoto.

Estructura sugerida:
- apps/api/modules/volumes/storage/base.py
- apps/api/modules/volumes/storage/factory.py
- apps/api/modules/volumes/storage/adapters/sftp.py

Definir interfaz base con métodos como:
- test_connection()
- list_dir(path)
- read_file(path, max_bytes=None)
- download_file(path)
- upload_file(path, file)
- create_folder(path)
- rename(source_path, target_path)
- copy(source_path, target_path)
- delete(path)
- exists(path)
- stat(path)

Requisitos:
- El service no debe depender de una implementación concreta
- Usar factory según volume_type
- Manejar timeouts y errores controlados
- No retornar excepciones crudas al cliente

## Service

Agregar funciones de negocio para:
- CRUD de volúmenes
- test de conexión
- explorar directorios
- previsualizar archivos
- subir archivos
- descargar archivos
- crear carpeta
- renombrar
- copiar/duplicar
- eliminar
- registrar auditoría

El service debe:
- leer el volumen desde DB
- validar que esté activo
- construir el adapter correcto
- ejecutar la operación remota
- registrar auditoría success/error
- mapear errores técnicos a errores de negocio comprensibles

## Endpoints requeridos

- /api/v1/volumes

### Volúmenes
- GET    /api/v1/volumes
- POST   /api/v1/volumes
- GET    /api/v1/volumes/{volume_id}
- PUT    /api/v1/volumes/{volume_id}
- DELETE /api/v1/volumes/{volume_id}
- POST   /api/v1/volumes/{volume_id}/test-connection

### Explorador de archivos
- GET    /api/v1/volumes/{volume_id}/entries?path=/
- GET    /api/v1/volumes/{volume_id}/preview?path=/ruta/archivo.txt
- GET    /api/v1/volumes/{volume_id}/download?path=/ruta/archivo.txt
- POST   /api/v1/volumes/{volume_id}/upload
- POST   /api/v1/volumes/{volume_id}/folders
- PATCH  /api/v1/volumes/{volume_id}/entries/rename
- POST   /api/v1/volumes/{volume_id}/entries/copy
- DELETE /api/v1/volumes/{volume_id}/entries?path=/ruta


Estos endpoints deben evitar redundancias como:
- /data-quality/volumes
- /volumes/files
- /volumes/{id}/files/content
si la semántica puede resolverse de forma más limpia

### Cuerpo esperado de algunas operaciones
CreateFolderRequest:
- path_parent
- folder_name

RenameEntryRequest:
- source_path
- new_name

CopyEntryRequest:
- source_path
- destination_path

DeleteEntryRequest:
- path

Ajustar nombres si el proyecto ya tiene una convención clara, pero mantener consistencia.


## Router

En:

- apps/api/modules/volumes/router.py

Registrar todos los endpoints del módulo `volumes` y no mezclar rutas con `data_quality`.

## Seguridad y validaciones mínimas obligatorias

Implementar como parte del MVP:
- No retornar credenciales ni secretos en responses
- Sanitizar y normalizar paths
- Bloquear intentos de path traversal
- Validar que la ruta operada pertenezca al volumen/root permitido
- Manejar permisos denegados
- Manejar volumen inactivo
- Manejar host inaccesible
- Manejar credenciales inválidas
- Manejar path inexistente
- Manejar conflictos por nombres duplicados
- Manejar timeouts de conexión
- Limitar preview de archivos grandes
- Limitar tipos soportados para preview en MVP
- Limitar tamaño de upload si el proyecto ya tiene convenciones globales; si no, dejar un valor razonable configurable


## Previsualización MVP

Soportar preview básica solo para tipos simples:
- txt
- json
- csv
- imágenes si es razonable
- pdf solo si ya existe soporte sencillo; si no, devolver metadata y dejar descarga

No intentar edición online.
No intentar Office preview avanzado.
No intentar streaming complejo.

## Duplicación/copias

Para el MVP:
- Implementar copy/duplicate síncrono
- Soportar archivo y carpeta
- Si hay conflicto de nombre, devolver error controlado o estrategia explícita
- No implementar jobs asíncronos distribuidos
- No implementar colas solo para esta feature, salvo que ya exista esa infraestructura y sea trivial integrarla

## Manejo de errores

No exponer stack trace al frontend.

Mapear a respuestas HTTP claras:
- 400 validación/path inválido
- 401/403 auth o permisos
- 404 volumen/path no encontrado
- 409 conflicto por nombre
- 422 operación no soportada
- 500 error interno controlado
- 502/504 problemas de conectividad remota si aplica según convención del proyecto

## Auth y contexto de usuario

Usar el mecanismo de autenticación existente del proyecto.
Obtener desde el contexto del request, si existe:
- user_id
- email
- username
- ip
- user-agent

Ese contexto debe incluirse en auditoría.

No inventar un nuevo sistema de auth.

## Criterios de aceptación

El resultado final debe permitir:
1. Crear un volumen en DB
2. Editarlo y eliminarlo
3. Probar conexión
4. Listar carpetas/archivos desde el volumen
5. Crear carpeta
6. Subir archivo
7. Descargar archivo
8. Renombrar
9. Copiar/duplicar
10. Eliminar
11. Previsualizar archivos simples
12. Registrar auditoría de todas las acciones en DB

## Escenarios a contemplar

Happy path:
- usuario crea volumen válido
- prueba conexión exitosa
- navega carpetas
- crea carpeta
- sube archivo
- renombra archivo
- descarga archivo
- duplica carpeta pequeña
- elimina archivo
- preview de txt/json/csv

Error path:
- volumen inactivo
- volumen no existe
- credenciales inválidas
- timeout de conexión
- host no resuelve
- path inexistente
- path traversal
- conflicto de nombres
- permiso denegado
- archivo demasiado grande para preview
- intento de operación no soportada
- error durante copia parcial

## No hacer en este MVP

No implementar:
- permisos granulares por carpeta
- versionado de archivos
- miniaturas avanzadas
- búsquedas complejas
- indexing
- sincronización en background
- colaboración en tiempo real
- locks distribuidos
- UI backend-generated
- rediseño arquitectónico global del proyecto

## Entregables esperados

Quiero que implementes:
1. modelos
2. migraciones
3. schemas
4. repository
5. service
6. router
7. storage adapters base + factory + al menos un adapter funcional
8. manejo de errores consistente
9. auditoría persistida en DB

Al finalizar:
- mostrar archivos modificados/creados
- explicar brevemente decisiones importantes
- listar supuestos realizados
- dejar el código listo para integrar y probar


--------------------------------------------

# En el frontend:

Quiero implementar en el frontend  un nuevo módulo funcional para gestión de volúmenes remotos y explorador de archivos, integrado con las especificaciones del backend anteriormente mencionado.

IMPORTANTE:
- Enfócate en funcionalidad, integración, estados, arquitectura frontend y experiencia operativa básica.
- Debe ser simple, funcional y mantenible.

## Restricción de módulo

Este trabajo corresponde a un módulo independiente llamado `volumes`.
NO debe quedar acoplado a `data_quality`.
NO usar naming, rutas ni carpetas derivadas de `data_quality`.

Usar naming limpio y directo relacionado a `volumes`.

## Objetivo funcional

Necesito una interfaz que permita:
1. listar volúmenes
2. crear volumen
3. editar volumen
4. eliminar volumen
5. probar conexión
6. seleccionar un volumen
7. navegar carpetas y archivos dentro del volumen
8. visualizar contenido de archivos compatibles
9. crear carpetas
10. subir archivos
11. descargar archivos
12. renombrar archivos o carpetas
13. duplicar/copiar archivos o carpetas
14. eliminar archivos o carpetas
15. reflejar correctamente estados de carga, error y éxito


Antes de implementar:
- inspecciona la estructura existente
- identifica layout, componentes compartidos, tabla/listado, modales, formularios, badges, alerts, toasts, drawers o paneles ya existentes
- integra este módulo respetando esa base

Si faltan piezas, implementa lo mínimo indispensable sin romper consistencia visual.

## Stack esperado

Usar el stack ya existente en el proyecto.
No introducir librerías innecesarias si el proyecto ya tiene alternativas equivalentes.

Reutilizar:
- sistema actual de rutas
- cliente HTTP existente si ya existe
- hooks/patrón de data fetching existente
- esquema actual de manejo de errores
- componentes UI existentes
- patrones de formularios y validación ya adoptados

## Integración con backend

Consumir endpoints reales del backend. No dejar mocks permanentes.

Endpoints esperados:

Base prefix:
- /api/v1/volumes

### Volúmenes
- GET    /api/v1/volumes
- POST   /api/v1/volumes
- GET    /api/v1/volumes/{volume_id}
- PUT    /api/v1/volumes/{volume_id}
- DELETE /api/v1/volumes/{volume_id}
- POST   /api/v1/volumes/{volume_id}/test-connection

### Explorador
- GET    /api/v1/volumes/{volume_id}/entries?path=/
- GET    /api/v1/volumes/{volume_id}/preview?path=/ruta/archivo.txt
- GET    /api/v1/volumes/{volume_id}/download?path=/ruta/archivo.txt
- POST   /api/v1/volumes/{volume_id}/upload
- POST   /api/v1/volumes/{volume_id}/folders
- PATCH  /api/v1/volumes/{volume_id}/entries/rename
- POST   /api/v1/volumes/{volume_id}/entries/copy
- DELETE /api/v1/volumes/{volume_id}/entries?path=/ruta

Ajustar si el proyecto ya maneja prefijos, wrappers o clientes tipados.

## Alcance MVP del frontend

Debe quedar funcionando:

### Gestión de volúmenes
- ver lista de volúmenes
- ver información básica de cada volumen
- crear volumen
- editar volumen
- eliminar volumen
- activar/desactivar si el backend lo soporta
- probar conexión y mostrar resultado

### Explorador de archivos
- seleccionar volumen
- listar carpetas y archivos de una ruta
- navegar por carpetas
- mostrar ruta actual
- refrescar contenido
- volver a carpeta anterior
- distinguir archivos y carpetas
- mostrar metadata básica: nombre, tipo, tamaño, fecha modificación

### Operaciones
- crear carpeta
- upload de archivo
- download
- rename
- copy/duplicate
- delete
- preview de archivos soportados

## Componentización esperada

Sin imponer UI nueva, estructurar el módulo con componentes reutilizables.
Nombres sugeridos, solo si encajan con la convención actual:

- volumes/
  - VolumesContainer
  - VolumesList
  - VolumeForm
  - VolumeCreateModal
  - VolumeEditModal
  - VolumeDeleteAction
  - VolumeConnectionAction

- file-browser/
  - FileBrowserContainer
  - FileBreadcrumbs
  - FileEntriesList
  - FileEntryRow
  - FileEntryActions
  - FilePreviewPanel
  - UploadFileAction
  - CreateFolderAction
  - RenameEntryAction
  - CopyEntryAction
  - DeleteEntryAction

- hooks/
  - useVolumes
  - useVolumeDetails
  - useVolumeConnectionTest
  - useDirectoryListing
  - useFilePreview
  - useFileOperations

- services/
  - dataQualityVolumesApi
  - dataQualityFileBrowserApi

- types/
  - volume.ts
  - file-browser.ts

Si el proyecto ya tiene otra organización, respétala.

## Tipado

Definir tipos/interfaces para requests y responses.

Incluir al menos:
- AppVolume
- AppVolumeCreateRequest
- AppVolumeUpdateRequest
- AppVolumeConnectionTestResponse
- FileEntry
- DirectoryListResponse
- FilePreviewResponse
- CreateFolderRequest
- RenameEntryRequest
- CopyEntryRequest
- DeleteEntryRequest
- UploadResponse

No usar any salvo donde sea estrictamente inevitable y documentado.

### Estados de carga
- cargando lista de volúmenes
- guardando volumen
- probando conexión
- cargando directorio
- subiendo archivo
- ejecutando rename/copy/delete/create folder
- cargando preview

### Empty states
- no hay volúmenes
- no hay contenido en la carpeta
- no hay volumen seleccionado
- archivo sin preview soportado

### Error states
- error cargando volúmenes
- error guardando volumen
- conexión fallida
- volumen inactivo
- permiso denegado
- path no encontrado
- conflicto de nombre
- archivo demasiado grande
- timeout
- error general de operación

### Estados de éxito
- volumen creado/editado/eliminado
- conexión exitosa
- carpeta creada
- archivo subido
- rename exitoso
- copy exitoso
- delete exitoso

Usar el sistema de feedback ya existente en la app:
- toast
- alert
- inline message
- badge
- modal feedback
lo que ya use el proyecto

## Reglas de implementación

- Reutilizar cliente HTTP existente
- Reutilizar mecanismos actuales de auth/session
- No exponer credenciales en el frontend
- No almacenar secretos en local state persistente
- Refrescar la vista después de operaciones exitosas
- Confirmar delete antes de ejecutar
- Manejar optimistic updates solo si ya es patrón del proyecto; si no, usar refetch simple y seguro
- Mantener código legible y modular
- Implementar SweetAlert o una librería equivalente para confirmaciones, estados, notificaciones y demás elementos relevantes.

## Comportamiento esperado del explorador

Definir un flujo simple y estable:

1. El usuario entra al módulo
2. Ve la lista de volúmenes
3. Selecciona uno
4. Puede probar conexión
5. Si la conexión es válida, navega carpetas
6. Puede entrar a subcarpetas
7. Puede ejecutar acciones sobre entradas
8. Puede ver preview cuando aplique
9. Después de cada operación exitosa, la vista se actualiza

## Preview MVP

Soportar preview simple para:
- txt
- json
- csv
- imágenes
- pdf si es sencillo con el stack actual

Si el archivo no soporta preview:
- mostrar mensaje claro
- ofrecer descarga si aplica

No implementar edición online.

## Upload

Implementar upload funcional respetando la ruta actual.
Mostrar progreso si el stack actual ya lo soporta fácilmente.
Si no, al menos mostrar estado de carga claro.
Validar errores de backend y mostrarlos bien.

## Download

La descarga debe usar el endpoint real del backend.
Resolver correctamente blobs/streams según el cliente actual.
No romper auth si usa cookies o headers del sistema existente.

## Delete

Antes de eliminar:
- pedir confirmación
- distinguir si es archivo o carpeta si el backend lo expone
- mostrar error claro si no se puede eliminar

## Rename y Copy

Implementar flujos simples:
- rename con input controlado
- copy/duplicate con source_path y destination_path
- mostrar conflicto de nombres si lo devuelve el backend

No agregar asistentes complejos.
No agregar tree picker avanzado si no es necesario para el MVP.

## Navegación y estado

Persistir de forma razonable:
- volumen seleccionado
- ruta actual del explorador

Pero sin complejidad innecesaria.
Puede ser state local, query params o el patrón ya usado por la app.

Si la app ya usa search params o store global, seguir esa convención.
No crear un store global nuevo si no hace falta.

## Seguridad y robustez

- No confiar solo en validaciones de frontend
- Mostrar errores del backend de forma legible
- No filtrar información sensible
- Escapar/renderizar seguro contenido textual en preview
- Manejar rutas con caracteres especiales correctamente

## Escenarios a contemplar

Happy path:
- listar volúmenes
- crear volumen
- editar volumen
- probar conexión exitosa
- seleccionar volumen
- navegar carpetas
- crear carpeta
- subir archivo
- ver preview txt/json/csv
- renombrar
- copiar
- descargar
- eliminar

Error path:
- volumen inexistente
- volumen inactivo
- conexión fallida
- credenciales inválidas
- timeout
- path inexistente
- permiso denegado
- nombre duplicado
- archivo demasiado grande
- preview no soportado
- error de red
- backend devuelve 4xx o 5xx

## Pruebas mínimas

Agregar pruebas en el estilo ya existente del proyecto si el frontend ya tiene base de testing.
Si no existe, al menos dejar el código preparado y modular para testear.

Priorizar pruebas o validaciones básicas de:
- mapeo de responses
- manejo de estados
- flujo de operaciones principales
- manejo de errores conocidos

## No hacer en este MVP

No implementar:
- drag and drop complejo si no existe ya
- multi-select avanzado
- permisos finos por carpeta
- edición online de archivos
- thumbnails avanzados
- sincronización en tiempo real
- búsquedas complejas
- jobs distribuidos

## Entregables esperados

Quiero que implementes:
1. integración del módulo en la app existente
2. componentes necesarios reutilizando UI actual
3. cliente API o integración sobre el cliente existente
4. hooks o lógica de consumo
5. tipos/interfaces
6. estados de loading/error/empty/success
7. flujos funcionales del explorador y gestión de volúmenes

Al finalizar:
- mostrar archivos creados/modificados
- explicar brevemente cómo quedó el flujo
- listar supuestos realizados
- indicar cualquier dependencia del backend
- dejar el código listo para integrar y probar
- Documenta todo el plan, código, las decisiones, tradeoffs y demás cosas que consideres relevante, para que una persona que ingresa nueva en el proyecto pueda entenderlo a cabalidad.



Antes de empezar y durante la planeación preguntame las cosas que consideres relevante. 

