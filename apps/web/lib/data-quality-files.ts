import { promises as fs } from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads", "data-quality");

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveUploadedFile(id: string, buffer: Buffer): Promise<void> {
  await ensureUploadsDir();
  await fs.writeFile(path.join(UPLOADS_DIR, id), buffer);
}

export async function readUploadedFile(id: string): Promise<Buffer> {
  return fs.readFile(path.join(UPLOADS_DIR, id));
}

export async function deleteUploadedFile(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(UPLOADS_DIR, id));
  } catch {
    // ignore if not found
  }
}
