import { NextRequest, NextResponse } from "next/server";
import { testAuthConfiguration } from "@/lib/admin/auth-test";

interface TestPayload {
  provider: "google" | "azureAd" | "oidc";
  baseUrl?: string;
  issuer?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestPayload = await request.json();
    const result = await testAuthConfiguration(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to test auth configuration:", error);
    return NextResponse.json(
      {
        ok: false,
        message: `Test failed: ${error.message || "Unknown error"}`,
        errorCode: "HTTP",
      },
      { status: 500 }
    );
  }
}
