import { NextRequest, NextResponse } from "next/server";
import { loadScripts, addScript } from "@/lib/data-quality-scripts";
import type { ScriptLanguage } from "@/lib/data-quality-scripts";

export async function GET() {
  try {
    const scripts = await loadScripts();
    return NextResponse.json(scripts);
  } catch {
    return NextResponse.json({ error: "Failed to load scripts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, language, content } = body as {
      name: string;
      description: string;
      language: ScriptLanguage;
      content: string;
    };
    if (!name || !language) {
      return NextResponse.json({ error: "name and language are required" }, { status: 400 });
    }
    const script = await addScript({ name, description: description ?? "", language, content: content ?? "" });
    return NextResponse.json(script, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create script" }, { status: 500 });
  }
}
