import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { saveUploadedFile } from "@/lib/data-quality-files";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileId = randomUUID();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await saveUploadedFile(fileId, buffer);

    return NextResponse.json({
      fileId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: buffer.length,
    });
  } catch (err) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
