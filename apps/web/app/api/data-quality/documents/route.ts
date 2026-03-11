import { NextRequest, NextResponse } from "next/server";
import { loadDocuments, addDocument } from "@/lib/data-quality-docs";
import type { DocType } from "@/lib/data-quality-docs";

export async function GET() {
  try {
    const documents = await loadDocuments();
    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      type,
      content,
      url,
      fileId,
      fileName,
      mimeType,
      fileSize,
    } = body as {
      title: string;
      description: string;
      type: DocType;
      content?: string;
      url?: string;
      fileId?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    };

    if (!title || !type) {
      return NextResponse.json({ error: "title and type are required" }, { status: 400 });
    }

    const doc = await addDocument({
      title,
      description: description ?? "",
      type,
      content,
      url,
      fileId,
      fileName,
      mimeType,
      fileSize,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
