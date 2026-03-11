import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { deleteUploadedFile } from "./data-quality-files";

export type DocType = "markdown" | "link" | "file";

export interface DQDocument {
  id: string;
  title: string;
  description: string;
  type: DocType;
  content?: string;   // for markdown
  url?: string;       // for link
  fileId?: string;    // for file — UUID used as stored filename
  fileName?: string;  // original filename (e.g. "report.pdf")
  mimeType?: string;  // MIME type (e.g. "application/pdf")
  fileSize?: number;  // bytes
}

interface DocumentsCatalog {
  documents: DQDocument[];
}

const DOCS_PATH = path.join(process.cwd(), "data", "data-quality-docs.json");

async function readCatalog(): Promise<DocumentsCatalog> {
  const raw = await fs.readFile(DOCS_PATH, "utf-8");
  return JSON.parse(raw) as DocumentsCatalog;
}

async function writeCatalog(data: DocumentsCatalog): Promise<void> {
  await fs.writeFile(DOCS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadDocuments(): Promise<DQDocument[]> {
  try {
    const data = await readCatalog();
    return data.documents ?? [];
  } catch {
    return [];
  }
}

export async function getDocumentById(id: string): Promise<DQDocument | null> {
  const docs = await loadDocuments();
  return docs.find((d) => d.id === id) ?? null;
}

export async function addDocument(
  input: Omit<DQDocument, "id">
): Promise<DQDocument> {
  const data = await readCatalog();
  const newDoc: DQDocument = { id: randomUUID(), ...input };
  data.documents.push(newDoc);
  await writeCatalog(data);
  return newDoc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    const data = await readCatalog();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) return false;
    data.documents = data.documents.filter((d) => d.id !== id);
    await writeCatalog(data);
    // Delete associated file if any
    if (doc.fileId) {
      await deleteUploadedFile(doc.fileId);
    }
    return true;
  } catch {
    return false;
  }
}
