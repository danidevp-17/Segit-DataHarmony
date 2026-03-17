/**
 * Proxy a FastAPI /api/v1/access-policies
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApiBaseUrl } from "@/lib/api/url";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}/api/v1/access-policies`, { headers });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || "Failed to load policies" },
      { status: res.status }
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { routinePolicies, modulePolicies } = body as {
    routinePolicies?: Record<string, string[]>;
    modulePolicies?: Record<string, string[]>;
  };

  if (routinePolicies && typeof routinePolicies !== "object") {
    return NextResponse.json(
      { error: "routinePolicies must be an object" },
      { status: 400 }
    );
  }
  if (modulePolicies && typeof modulePolicies !== "object") {
    return NextResponse.json(
      { error: "modulePolicies must be an object" },
      { status: 400 }
    );
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1/access-policies`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      routinePolicies: routinePolicies || {},
      modulePolicies: modulePolicies || {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || "Failed to save policies" },
      { status: res.status }
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
