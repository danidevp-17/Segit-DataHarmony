/**
 * Cliente API para el módulo de volúmenes remotos.
 * Consume los endpoints de FastAPI en /api/v1/volumes directamente,
 * siguiendo el mismo patrón que lib/api/data-sources.ts y lib/api/data-quality.ts.
 */
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPostFormData,
  apiPut,
  type ApiClientOptions,
} from "./client";
import { getApiBaseUrl } from "./url";

const BASE = "/api/v1/volumes";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type VolumeType = "sftp" | "smb" | "nfs" | "ftp" | "webdav";

export interface AppVolume {
  id: string;
  module: string;
  name: string;
  description?: string;
  volumeType: VolumeType;
  host: string;
  sharePath: string;
  port?: number;
  username?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppVolumeCreateRequest {
  module: string;
  name: string;
  description?: string;
  volumeType: VolumeType;
  host: string;
  sharePath: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
}

export interface AppVolumeUpdateRequest {
  name?: string;
  description?: string;
  volumeType?: VolumeType;
  host?: string;
  sharePath?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  isActive?: boolean;
}

export interface AppVolumeConnectionTestResponse {
  ok: boolean;
  message: string;
  latencyMs?: number;
  errorCode?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  extension?: string;
}

export interface DirectoryListResponse {
  path: string;
  entries: FileEntry[];
  total: number;
}

export interface FilePreviewResponse {
  path: string;
  contentType: string;
  content: string;  // texto plano o base64 para imágenes
  size: number;
  truncated: boolean;
}

export interface CreateFolderRequest {
  pathParent: string;
  folderName: string;
}

export interface RenameEntryRequest {
  sourcePath: string;
  newName: string;
}

export interface CopyEntryRequest {
  sourcePath: string;
  destinationPath: string;
}

export interface UploadResponse {
  path: string;
  size: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Gestión de volúmenes
// ---------------------------------------------------------------------------

export async function listVolumes(options?: ApiClientOptions): Promise<AppVolume[]> {
  return apiGet<AppVolume[]>(BASE, options);
}

export async function getVolume(id: string, options?: ApiClientOptions): Promise<AppVolume> {
  return apiGet<AppVolume>(`${BASE}/${id}`, options);
}

export async function createVolume(
  payload: AppVolumeCreateRequest,
  options?: ApiClientOptions,
): Promise<AppVolume> {
  return apiPost<AppVolume>(BASE, payload, options);
}

export async function updateVolume(
  id: string,
  payload: AppVolumeUpdateRequest,
  options?: ApiClientOptions,
): Promise<AppVolume> {
  return apiPut<AppVolume>(`${BASE}/${id}`, payload, options);
}

export async function deleteVolume(id: string, options?: ApiClientOptions): Promise<void> {
  return apiDelete(`${BASE}/${id}`, options);
}

export async function testVolumeConnection(
  id: string,
  options?: ApiClientOptions,
): Promise<AppVolumeConnectionTestResponse> {
  return apiPost<AppVolumeConnectionTestResponse>(
    `${BASE}/${id}/test-connection`,
    {},
    { ...options, timeout: options?.timeout ?? 35_000 },
  );
}

// ---------------------------------------------------------------------------
// Explorador de archivos
// ---------------------------------------------------------------------------

// Timeout extendido para operaciones que involucran conexión SFTP al servidor remoto.
// El adaptador puede tardar hasta 25s en fallar (10s TCP + 15s banner SSH).
const SFTP_TIMEOUT_MS = 35_000;

export async function listDirectory(
  volumeId: string,
  path: string,
  options?: ApiClientOptions,
): Promise<DirectoryListResponse> {
  return apiGet<DirectoryListResponse>(
    `${BASE}/${volumeId}/entries?path=${encodeURIComponent(path)}`,
    { ...options, timeout: options?.timeout ?? SFTP_TIMEOUT_MS },
  );
}

export async function previewFile(
  volumeId: string,
  path: string,
  options?: ApiClientOptions,
): Promise<FilePreviewResponse> {
  return apiGet<FilePreviewResponse>(
    `${BASE}/${volumeId}/preview?path=${encodeURIComponent(path)}`,
    { ...options, timeout: options?.timeout ?? SFTP_TIMEOUT_MS },
  );
}

/**
 * Descarga un archivo directamente desde FastAPI como blob y dispara el diálogo del browser.
 * Usa fetch nativo para manejar respuesta binaria (no JSON).
 */
export async function downloadFile(
  volumeId: string,
  path: string,
  filename: string,
  options?: ApiClientOptions,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (options?.accessToken) {
    headers["Authorization"] = `Bearer ${options.accessToken}`;
  }
  const url = `${getApiBaseUrl()}${BASE}/${volumeId}/download?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed ${res.status}: ${text}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Descarga un directorio del volumen como archivo ZIP.
 * Equivalente a GET /api/v1/volumes/:id/download-dir?path=...
 */
export async function downloadDirectoryAsZip(
  volumeId: string,
  path: string,
  zipFilename: string,
  options?: ApiClientOptions,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (options?.accessToken) {
    headers["Authorization"] = `Bearer ${options.accessToken}`;
  }
  const url = `${getApiBaseUrl()}${BASE}/${volumeId}/download-dir?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed ${res.status}: ${text}`);
  }
  const blob = await res.blob();
  const name = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export async function uploadFile(
  volumeId: string,
  path: string,
  file: File,
  options?: ApiClientOptions,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiPostFormData<UploadResponse>(
    `${BASE}/${volumeId}/upload?path=${encodeURIComponent(path)}`,
    formData,
    options,
  );
}

export async function createFolder(
  volumeId: string,
  payload: CreateFolderRequest,
  options?: ApiClientOptions,
): Promise<{ path: string; message: string }> {
  return apiPost(`${BASE}/${volumeId}/folders`, payload, options);
}

export async function renameEntry(
  volumeId: string,
  payload: RenameEntryRequest,
  options?: ApiClientOptions,
): Promise<{ sourcePath: string; targetPath: string; message: string }> {
  return apiPatch(`${BASE}/${volumeId}/entries/rename`, payload, options);
}

export async function copyEntry(
  volumeId: string,
  payload: CopyEntryRequest,
  options?: ApiClientOptions,
): Promise<{ sourcePath: string; destinationPath: string; message: string }> {
  return apiPost(`${BASE}/${volumeId}/entries/copy`, payload, options);
}

export async function deleteEntry(
  volumeId: string,
  path: string,
  options?: ApiClientOptions,
): Promise<{ path: string; message: string }> {
  // DELETE con body de respuesta — usamos fetch directo
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;
  const res = await fetch(
    `${getApiBaseUrl()}${BASE}/${volumeId}/entries?path=${encodeURIComponent(path)}`,
    { method: "DELETE", headers },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
