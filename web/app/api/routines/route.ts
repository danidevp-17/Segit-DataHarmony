import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";

export async function GET() {
  try {
    const routines = await loadCatalog();
    return NextResponse.json(routines);
  } catch (error) {
    console.error("Failed to load routines:", error);
    return NextResponse.json(
      { error: "Failed to load routines" },
      { status: 500 }
    );
  }
}
