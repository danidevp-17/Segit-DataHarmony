import { NextRequest, NextResponse } from "next/server";
import { testDatabaseConnection } from "@/lib/admin/db-connection-test";
// Import to trigger driver validation on server startup
import "@/lib/admin/db-drivers-init";

interface TestPayload {
  type: "oracle" | "sqlserver" | "postgres";
  host: string;
  port: number;
  database?: string;
  serviceName?: string;
  username: string;
  password: string;
  options?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload: TestPayload = {
      type: body.type,
      host: body.host,
      port: body.port,
      database: body.database,
      serviceName: body.serviceName,
      username: body.username,
      password: body.password,
      options: body.options,
    };

    // Perform real database connection test
    const result = await testDatabaseConnection(payload);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to test datasource connection:", error);
    return NextResponse.json(
      {
        ok: false,
        message: `Test failed: ${error.message || "Unknown error"}`,
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
