/**
 * Proxy de upload a FastAPI.
 * El cliente puede subir directamente a FastAPI con apiPostFormData.
 * Esta ruta se mantiene por si algún flujo la usa; en la migración el modal
 * usará el cliente API (uploadFile) que llama a FastAPI directo.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const formData = await req.formData();

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/v1/data-quality/files`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Upload failed" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
