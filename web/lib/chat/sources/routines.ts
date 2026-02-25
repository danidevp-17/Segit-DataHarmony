import { promises as fs } from "fs";
import path from "path";

export interface RoutineParam {
  key: string;
  label: string;
  required?: boolean;
}

export interface RoutineFileInput {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
}

export interface NormalizedRoutine {
  id: string;
  name: string;
  description: string;
  params: RoutineParam[];
  fileInputs: RoutineFileInput[];
}

interface CatalogRoutine {
  id: string;
  name: string;
  description: string;
  script: string;
  params: RoutineParam[];
  fileInputs: RoutineFileInput[];
}

interface Catalog {
  routines: CatalogRoutine[];
}

// Load from ../routines/catalog.json (relative to web directory)
const ROUTINES_CATALOG_PATH = path.resolve(process.cwd(), "..", "routines", "catalog.json");

// Fallback to web/data/catalog.json if the above doesn't exist
const FALLBACK_CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

export async function getRoutines(): Promise<NormalizedRoutine[]> {
  try {
    // Try primary path first
    let catalogPath = ROUTINES_CATALOG_PATH;
    try {
      await fs.access(catalogPath);
    } catch {
      // Fallback to web/data/catalog.json
      catalogPath = FALLBACK_CATALOG_PATH;
    }

    const raw = await fs.readFile(catalogPath, "utf-8");
    const data: Catalog = JSON.parse(raw);
    
    // Normalize routines (remove script field, keep only what's needed)
    return (data.routines ?? []).map((routine) => ({
      id: routine.id,
      name: routine.name,
      description: routine.description,
      params: routine.params || [],
      fileInputs: routine.fileInputs || [],
    }));
  } catch (error) {
    console.error("Error loading routines catalog:", error);
    return [];
  }
}
