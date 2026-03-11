import { NextRequest, NextResponse } from "next/server";
import { readUploadedFile } from "@/lib/data-quality-files";
import { loadDocuments } from "@/lib/data-quality-docs";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Resolve fileName and mimeType from documents catalog
    const docs = await loadDocuments();
    const doc = docs.find((d) => d.fileId === id);

    const buffer = await readUploadedFile(id);

    const mimeType = doc?.mimeType ?? "application/octet-stream";
    const fileName = doc?.fileName ?? id;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
