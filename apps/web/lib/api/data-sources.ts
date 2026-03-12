/**
 * Cliente API para data sources (FastAPI).
 * Mantiene compatibilidad con la interfaz usada por la página admin/datasources.
 */
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiClientOptions,
} from "./client";

const BASE = "/api/v1/data-sources";

export type DatasourceType = "postgres" | "sqlserver" | "oracle";

export interface DataSource {
  id: string;
  name: string;
  type: DatasourceType;
  host: string;
  port: number;
  database?: string;
  service_name?: string;
  username: string;
  options?: Record<string, unknown>;
  is_active?: boolean;
}

/** Para la UI que usa serviceName en camelCase */
export interface DataSourceForUI extends Omit<DataSource, "service_name"> {
  serviceName?: string;
}

export interface DataSourceCreatePayload {
  name: string;
  type: DatasourceType;
  host: string;
  port: number;
  database?: string;
  service_name?: string;
  username: string;
  password: string;
  options?: Record<string, unknown>;
}

export interface DataSourceUpdatePayload {
  name?: string;
  type?: DatasourceType;
  host?: string;
  port?: number;
  database?: string;
  service_name?: string;
  username?: string;
  password?: string;
  options?: Record<string, unknown>;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  details?: string;
  error_code?: string;
}

function toUI(ds: DataSource): DataSourceForUI {
  return {
    ...ds,
    serviceName: ds.service_name,
  };
}

export async function listDataSources(
  options?: ApiClientOptions
): Promise<DataSourceForUI[]> {
  const list = await apiGet<DataSource[]>(BASE, options);
  return list.map(toUI);
}

export async function getDataSource(
  id: string,
  options?: ApiClientOptions
): Promise<DataSourceForUI> {
  const ds = await apiGet<DataSource>(`${BASE}/${id}`, options);
  return toUI(ds);
}

export async function createDataSource(
  payload: DataSourceCreatePayload,
  options?: ApiClientOptions
): Promise<DataSourceForUI> {
  const ds = await apiPost<DataSource>(BASE, payload, options);
  return toUI(ds);
}

export async function updateDataSource(
  id: string,
  payload: DataSourceUpdatePayload,
  options?: ApiClientOptions
): Promise<DataSourceForUI> {
  const ds = await apiPut<DataSource>(`${BASE}/${id}`, payload, options);
  return toUI(ds);
}

export async function deleteDataSource(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/${id}`, options);
}

export async function testDataSourceConnection(
  id: string,
  options?: ApiClientOptions
): Promise<TestConnectionResult> {
  return apiPost<TestConnectionResult>(`${BASE}/${id}/test`, {}, options);
}

export async function testConnectionPayload(
  payload: {
    type: DatasourceType;
    host: string;
    port: number;
    database?: string;
    service_name?: string;
    username: string;
    password: string;
    options?: Record<string, unknown>;
  },
  options?: ApiClientOptions
): Promise<TestConnectionResult> {
  return apiPost<TestConnectionResult>(`${BASE}/test`, payload, options);
}
