import { NextRequest, NextResponse } from "next/server";
import { getScriptById, saveScript, deleteScript } from "@/lib/data-quality-scripts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const script = await getScriptById(id);
  if (!script) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }
  return NextResponse.json(script);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { content } = body as { content: string };
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const ok = await saveScript(id, content);
    if (!ok) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save script" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteScript(id);
  if (!ok) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
