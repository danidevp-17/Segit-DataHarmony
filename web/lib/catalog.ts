import { promises as fs } from "fs";
import path from "path";

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
  name: string;
  description: string;
  script: string;
  params: Param[];
  fileInputs: FileInput[];
  needsDatasource?: boolean; // Optional: if true, routine requires datasource selection
}

interface Catalog {
  routines: Routine[];
}

// Catalog is stored inside web/data/ for reliable access
const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

export async function loadCatalog(): Promise<Routine[]> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const data: Catalog = JSON.parse(trimmed);
    return data.routines ?? [];
  } catch (err) {
    console.error("Failed to load catalog.json at:", CATALOG_PATH, err);
    return [];
  }
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const routines = await loadCatalog();
  return routines.find((r) => r.id === id) ?? null;
}
