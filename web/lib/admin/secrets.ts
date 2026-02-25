import { promises as fs } from "fs";
import path from "path";

// Secrets are stored separately and should be gitignored
const SECRETS_PATH = path.join(process.cwd(), "data", "secrets.json");

export interface Secrets {
  [key: string]: string; // secretRef -> actual secret value
}

export async function loadSecrets(): Promise<Secrets> {
  try {
    const raw = await fs.readFile(SECRETS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    // File doesn't exist, return empty object
    return {};
  }
}

export async function saveSecrets(secrets: Secrets): Promise<void> {
  await fs.mkdir(path.dirname(SECRETS_PATH), { recursive: true });
  await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2), "utf-8");
}

export async function getSecret(secretRef: string): Promise<string | null> {
  const secrets = await loadSecrets();
  return secrets[secretRef] ?? null;
}

export async function saveSecret(secretRef: string, value: string): Promise<void> {
  const secrets = await loadSecrets();
  secrets[secretRef] = value;
  await saveSecrets(secrets);
}

export async function deleteSecret(secretRef: string): Promise<void> {
  const secrets = await loadSecrets();
  delete secrets[secretRef];
  await saveSecrets(secrets);
}
