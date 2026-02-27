/**
 * Tipos para el Monitor de Almacenamiento de Red.
 * Usados por el API route, el hook useDiskSpace y los componentes de disco.
 */

/**
 * Payload esperado en el POST a /api/disk-space.
 * path: ruta UNC de red (ej. \\\\10.100.25.35\\pgtrabajodigital) o ruta local.
 */
export interface DiskSpaceRequest {
  path: string;
}

/**
 * Respuesta exitosa del API con espacio en disco en bytes.
 * total: tamaño total del volumen en bytes
 * free: espacio libre en bytes
 * used: espacio usado (total - free) en bytes
 */
export interface DiskSpaceResponse {
  total: number;
  free: number;
  used: number;
}

/**
 * Respuesta de error del API.
 * Se devuelve cuando no se puede acceder a la ruta o hay timeout.
 */
export interface DiskSpaceErrorResponse {
  error: string;
}

/**
 * Estados posibles del hook useDiskSpace.
 * - idle: sin datos, esperando acción del usuario
 * - loading: petición en curso
 * - error: fallo en la petición (mostrar mensaje + Reintentar)
 * - empty: éxito pero sin datos (edge case)
 * - retry: tras error, permite reintentar (el siguiente fetch pasa a loading)
 */
export type DiskSpaceState = "idle" | "loading" | "error" | "empty" | "retry";
