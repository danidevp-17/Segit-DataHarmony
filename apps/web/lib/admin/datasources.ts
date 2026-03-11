import { promises as fs } from "fs";
import path from "path";

export type DatasourceType = "oracle" | "sqlserver" | "postgres";

export interface Datasource {
  id: string;
  name: string;
  type: DatasourceType;
  host: string;
  port: number;
  database?: string; // For SQL Server and Postgres
  serviceName?: string; // For Oracle
  username: string;
  passwordSecretRef: string; // Reference to secret in secrets.json
  options?: Record<string, any>;
}

const DATASOURCES_PATH = path.join(process.cwd(), "data", "datasources.json");

export async function loadDatasources(): Promise<Datasource[]> {
  try {
    const raw = await fs.readFile(DATASOURCES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    // File doesn't exist, return empty array
    return [];
  }
}

export async function saveDatasources(datasources: Datasource[]): Promise<void> {
  await fs.mkdir(path.dirname(DATASOURCES_PATH), { recursive: true });
  await fs.writeFile(DATASOURCES_PATH, JSON.stringify(datasources, null, 2), "utf-8");
}

export async function getDatasourceById(id: string): Promise<Datasource | null> {
  const datasources = await loadDatasources();
  return datasources.find((ds) => ds.id === id) ?? null;
}

export async function saveDatasource(datasource: Datasource): Promise<void> {
  const datasources = await loadDatasources();
  const index = datasources.findIndex((ds) => ds.id === datasource.id);
  if (index >= 0) {
    datasources[index] = datasource;
  } else {
    datasources.push(datasource);
  }
  await saveDatasources(datasources);
}

export async function deleteDatasource(id: string): Promise<void> {
  const datasources = await loadDatasources();
  const filtered = datasources.filter((ds) => ds.id !== id);
  await saveDatasources(filtered);
}
