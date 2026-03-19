/**
 * Cliente API para Jobs.
 * createJob usa el proxy Next.js /api/jobs (same-origin, sesión).
 * getJob llama a FastAPI directo con token.
 */
import { apiGet, handleUnauthorizedRedirect, type ApiClientOptions } from "./client";

export interface JobResponse {
  id: string;
  task_id: string | null;
  module: string;
  job_type: string;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

/** Crea job vía proxy Next.js (usa sesión automáticamente) */
export async function createJob(
  formData: FormData,
  _options?: ApiClientOptions
): Promise<JobResponse> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    body: formData,
  });
  if (res.status === 401) {
    handleUnauthorizedRedirect();
    throw new Error("Sesión expirada o no autorizada");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || `API error ${res.status}`
    );
  }
  return res.json();
}

export async function getJob(
  id: string,
  options?: ApiClientOptions
): Promise<JobResponse> {
  return apiGet<JobResponse>(`/api/v1/jobs/${id}`, options);
}

export async function listJobsApi(
  options?: ApiClientOptions,
  limit = 100
): Promise<JobResponse[]> {
  return apiGet<JobResponse[]>(`/api/v1/jobs?limit=${limit}`, options);
}

export interface JobLogsResponse {
  stdout: string;
  stderr: string;
}

export async function getJobLogs(
  id: string,
  options?: ApiClientOptions
): Promise<JobLogsResponse> {
  return apiGet<JobLogsResponse>(`/api/v1/jobs/${id}/logs`, options);
}
