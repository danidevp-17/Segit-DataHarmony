import { NextRequest, NextResponse } from "next/server";
import { loadApplications, addApplication } from "@/lib/data-quality-apps";

export async function GET() {
  try {
    const applications = await loadApplications();
    return NextResponse.json(applications);
  } catch {
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, url, category } = body as {
      name: string;
      description: string;
      url: string;
      category: string;
    };
    if (!name || !url) {
      return NextResponse.json({ error: "name and url are required" }, { status: 400 });
    }
    const app = await addApplication({ name, description: description ?? "", url, category: category ?? "General" });
    return NextResponse.json(app, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
