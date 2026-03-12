/**
 * Proxy a FastAPI /api/v1/routines
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const { searchParams } = req.nextUrl;
  const module = searchParams.get("module");
  const url = `${API_BASE}/api/v1/routines${module ? `?module=${module}` : ""}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() || "Failed" },
      { status: res.status }
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
