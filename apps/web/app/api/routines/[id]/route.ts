/**
 * Proxy a FastAPI /api/v1/routines/{id}
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const { id } = await params;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/v1/routines/${id}`, { headers });
  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() || "Not found" },
      { status: res.status }
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
