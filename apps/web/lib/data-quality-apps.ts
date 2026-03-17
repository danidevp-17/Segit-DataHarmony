import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export interface DQApplication {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

interface ApplicationsCatalog {
  applications: DQApplication[];
}

const APPS_PATH = path.join(process.cwd(), "data", "data-quality-applications.json");

async function readCatalog(): Promise<ApplicationsCatalog> {
  const raw = await fs.readFile(APPS_PATH, "utf-8");
  return JSON.parse(raw) as ApplicationsCatalog;
}

async function writeCatalog(data: ApplicationsCatalog): Promise<void> {
  await fs.writeFile(APPS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadApplications(): Promise<DQApplication[]> {
  try {
    const data = await readCatalog();
    return data.applications ?? [];
  } catch {
    return [];
  }
}

export async function addApplication(
  input: Omit<DQApplication, "id">
): Promise<DQApplication> {
  const data = await readCatalog();
  const newApp: DQApplication = { id: randomUUID(), ...input };
  data.applications.push(newApp);
  await writeCatalog(data);
  return newApp;
}

export async function deleteApplication(id: string): Promise<boolean> {
  try {
    const data = await readCatalog();
    const before = data.applications.length;
    data.applications = data.applications.filter((a) => a.id !== id);
    if (data.applications.length === before) return false;
    await writeCatalog(data);
    return true;
  } catch {
    return false;
  }
}
