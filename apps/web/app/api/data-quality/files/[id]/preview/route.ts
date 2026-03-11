import { NextRequest, NextResponse } from "next/server";
import { readUploadedFile } from "@/lib/data-quality-files";
import { loadDocuments } from "@/lib/data-quality-docs";

export const dynamic = "force-dynamic";

// Max bytes to return as text (2 MB) — prevents huge log files from choking the client
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

const TEXT_MIMES = new Set([
  "text/plain",
  "text/csv",
  "text/html",
  "application/json",
  "application/sql",
  "application/x-sh",
  "text/x-python",
  "text/x-shellscript",
]);

function isTextMime(mime: string) {
  return TEXT_MIMES.has(mime) || mime.startsWith("text/");
}

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const docs = await loadDocuments();
    const doc = docs.find((d) => d.fileId === id);
    const mimeType = doc?.mimeType ?? "application/octet-stream";
    const fileName = doc?.fileName ?? "";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

    const buffer = await readUploadedFile(id);

    // ── Images ────────────────────────────────────────────────────────────────
    if (isImageMime(mimeType) || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
      return NextResponse.json({ type: "image" });
    }

    // ── PDF ───────────────────────────────────────────────────────────────────
    if (mimeType === "application/pdf" || ext === "pdf") {
      return NextResponse.json({ type: "pdf" });
    }

    // ── PPTX / POTX / PPT — no preview available in browser ─────────────────
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.template" ||
      mimeType === "application/vnd.ms-powerpoint" ||
      ["pptx", "potx", "ppt", "pot"].includes(ext)
    ) {
      return NextResponse.json({
        type: "pptx_legacy",
        fileName,
        info: `La vista previa de archivos PowerPoint (${ext.toUpperCase()}) no está disponible en el navegador. Descarga el archivo para abrirlo en PowerPoint o en Google Slides.`,
      });
    }

    // ── XLSX / XLS / CSV ──────────────────────────────────────────────────────
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      ["xlsx", "xls", "csv"].includes(ext)
    ) {
      const XLSX = await import("xlsx");
      let workbook: ReturnType<typeof XLSX.read>;

      if (ext === "csv" || mimeType === "text/csv") {
        workbook = XLSX.read(buffer.toString("utf-8"), { type: "string" });
      } else {
        workbook = XLSX.read(buffer, { type: "buffer" });
      }

      const sheets: Record<string, (string | number | boolean | null)[][]> = {};
      for (const name of workbook.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
          workbook.Sheets[name],
          { header: 1, defval: null }
        );
      }
      return NextResponse.json({ type: "xlsx", sheets, sheetNames: workbook.SheetNames });
    }

    // ── DOCX ──────────────────────────────────────────────────────────────────
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ buffer });
      return NextResponse.json({ type: "docx", html: result.value });
    }

    // ── DLIS (binary well-log format — cannot preview) ────────────────────────
    if (ext === "dlis") {
      return NextResponse.json({
        type: "pptx_legacy",   // reuse the "info + download" UI
        fileName,
        info: "DLIS (Digital Log Interchange Standard) es un formato binario propietario para datos de registros de pozos. No es posible previsualizarlo en el navegador. Usa un visor especializado como Strater, WellCAD o Python dlisio.",
      });
    }

    // ── LAS / LIS (ASCII well-log formats) ───────────────────────────────────
    if (["las", "lis"].includes(ext)) {
      const raw = buffer.slice(0, MAX_TEXT_BYTES);
      const text = raw.toString("latin1"); // LAS files are often Latin-1
      const truncated = buffer.length > MAX_TEXT_BYTES;
      return NextResponse.json({
        type: "text",
        content: text + (truncated ? "\n\n[...archivo truncado para visualización...]" : ""),
        ext,
      });
    }

    // ── Generic plain text / code ─────────────────────────────────────────────
    if (
      isTextMime(mimeType) ||
      ["txt", "md", "py", "sh", "sql", "js", "ts", "json"].includes(ext)
    ) {
      const raw = buffer.slice(0, MAX_TEXT_BYTES);
      return NextResponse.json({ type: "text", content: raw.toString("utf-8"), ext });
    }

    // ── Unsupported ───────────────────────────────────────────────────────────
    return NextResponse.json({ type: "unsupported", mimeType, fileName });
  } catch (err) {
    console.error("Preview error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
