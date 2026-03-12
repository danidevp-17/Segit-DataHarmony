/**
 * Cliente API para Routines (FastAPI).
 */
import { apiGet, type ApiClientOptions } from "./client";

const BASE = "/api/v1/routines";

export interface Param {
  key: string;
  label: string;
  required?: boolean;
}

export interface FileInput {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
}

export interface Routine {
  id: string;
  slug: string;
  name: string;
  description: string;
  script: string;
  params: Param[];
  fileInputs: FileInput[];
  needsDatasource: boolean;
  module: string;
}

export interface DatasourceOption {
  id: string;
  name: string;
  type: string;
}

export async function listRoutines(
  options?: ApiClientOptions,
  module?: string
): Promise<Routine[]> {
  const qs = module ? `?module=${encodeURIComponent(module)}` : "";
  return apiGet<Routine[]>(`${BASE}${qs}`, options);
}

export async function getRoutine(
  idOrSlug: string,
  options?: ApiClientOptions
): Promise<Routine> {
  return apiGet<Routine>(`${BASE}/${idOrSlug}`, options);
}

export async function getRoutineDatasources(
  routineId: string,
  moduleId: string,
  options?: ApiClientOptions
): Promise<DatasourceOption[]> {
  const qs = `?moduleId=${encodeURIComponent(moduleId)}`;
  return apiGet<DatasourceOption[]>(`${BASE}/${routineId}/datasources${qs}`, options);
}
