import { NextRequest, NextResponse } from "next/server";
import { deleteApplication } from "@/lib/data-quality-apps";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteApplication(id);
  if (!ok) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
