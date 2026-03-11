import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/data-quality-docs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteDocument(id);
  if (!ok) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
