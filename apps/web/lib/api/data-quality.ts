/**
 * Cliente API para Data Quality (FastAPI).
 */
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostFormData,
  type ApiClientOptions,
} from "./client";

const BASE = "/api/v1/data-quality";

export type ScriptLanguage = "python" | "bash" | "sql";

export interface DQScript {
  id: string;
  name: string;
  description: string;
  language: ScriptLanguage;
  content: string;
}

export interface DQApplication {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

export type DocType = "markdown" | "link" | "file";

export interface DQDocument {
  id: string;
  title: string;
  description: string;
  type: DocType;
  content?: string | null;
  url?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface ApiScript {
  id: string;
  name: string;
  description: string;
  language: string;
  content: string;
}

interface ApiDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  content?: string | null;
  url?: string | null;
  file_id?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
}

function toScript(a: ApiScript): DQScript {
  return { ...a, language: a.language as ScriptLanguage };
}

function toDocument(a: ApiDocument): DQDocument {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type as DocType,
    content: a.content,
    url: a.url,
    fileId: a.file_id ?? undefined,
    fileName: a.file_name ?? undefined,
    mimeType: a.mime_type ?? undefined,
    fileSize: a.file_size ?? undefined,
  };
}

export async function listScripts(options?: ApiClientOptions): Promise<DQScript[]> {
  const list = await apiGet<ApiScript[]>(`${BASE}/scripts`, options);
  return list.map(toScript);
}

export async function createScript(
  body: { name: string; description?: string; language: ScriptLanguage; content?: string },
  options?: ApiClientOptions
): Promise<DQScript> {
  const s = await apiPost<ApiScript>(`${BASE}/scripts`, body, options);
  return toScript(s);
}

export async function updateScriptContent(
  id: string,
  content: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiPut(`${BASE}/scripts/${id}`, { content }, options);
}

export async function deleteScript(id: string, options?: ApiClientOptions): Promise<void> {
  await apiDelete(`${BASE}/scripts/${id}`, options);
}

export async function listApplications(options?: ApiClientOptions): Promise<DQApplication[]> {
  return apiGet<DQApplication[]>(`${BASE}/applications`, options);
}

export async function createApplication(
  body: { name: string; description?: string; url: string; category?: string },
  options?: ApiClientOptions
): Promise<DQApplication> {
  return apiPost<DQApplication>(`${BASE}/applications`, body, options);
}

export async function deleteApplication(id: string, options?: ApiClientOptions): Promise<void> {
  await apiDelete(`${BASE}/applications/${id}`, options);
}

export async function listDocuments(options?: ApiClientOptions): Promise<DQDocument[]> {
  const list = await apiGet<ApiDocument[]>(`${BASE}/documents`, options);
  return list.map(toDocument);
}

export async function createDocument(
  body: {
    title: string;
    description?: string;
    type: DocType;
    content?: string | null;
    url?: string | null;
    file_id?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
  },
  options?: ApiClientOptions
): Promise<DQDocument> {
  const d = await apiPost<ApiDocument>(`${BASE}/documents`, body, options);
  return toDocument(d);
}

export async function deleteDocument(id: string, options?: ApiClientOptions): Promise<void> {
  await apiDelete(`${BASE}/documents/${id}`, options);
}

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadFile(
  file: File,
  options?: ApiClientOptions
): Promise<FileUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiPostFormData<FileUploadResult>(`${BASE}/files`, fd, options);
  return res;
}
