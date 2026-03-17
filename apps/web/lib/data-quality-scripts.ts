import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type ScriptLanguage = "python" | "bash" | "sql";

export interface DQScript {
  id: string;
  name: string;
  description: string;
  language: ScriptLanguage;
  content: string;
}

interface ScriptsCatalog {
  scripts: DQScript[];
}

const SCRIPTS_PATH = path.join(process.cwd(), "data", "data-quality-scripts.json");

async function readCatalog(): Promise<ScriptsCatalog> {
  const raw = await fs.readFile(SCRIPTS_PATH, "utf-8");
  return JSON.parse(raw) as ScriptsCatalog;
}

async function writeCatalog(data: ScriptsCatalog): Promise<void> {
  await fs.writeFile(SCRIPTS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadScripts(): Promise<DQScript[]> {
  try {
    const data = await readCatalog();
    return data.scripts ?? [];
  } catch {
    return [];
  }
}

export async function getScriptById(id: string): Promise<DQScript | null> {
  const scripts = await loadScripts();
  return scripts.find((s) => s.id === id) ?? null;
}

export async function saveScript(id: string, content: string): Promise<boolean> {
  try {
    const data = await readCatalog();
    const idx = data.scripts.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    data.scripts[idx].content = content;
    await writeCatalog(data);
    return true;
  } catch {
    return false;
  }
}

export async function addScript(
  input: Omit<DQScript, "id">
): Promise<DQScript> {
  const data = await readCatalog();
  const newScript: DQScript = { id: randomUUID(), ...input };
  data.scripts.push(newScript);
  await writeCatalog(data);
  return newScript;
}

export async function deleteScript(id: string): Promise<boolean> {
  try {
    const data = await readCatalog();
    const before = data.scripts.length;
    data.scripts = data.scripts.filter((s) => s.id !== id);
    if (data.scripts.length === before) return false;
    await writeCatalog(data);
    return true;
  } catch {
    return false;
  }
}
