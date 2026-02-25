import { NextRequest, NextResponse } from "next/server";
import { getDatasourceById } from "@/lib/admin/datasources";
import { getSecret } from "@/lib/admin/secrets";
import { testDatabaseConnection } from "@/lib/admin/db-connection-test";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const datasource = await getDatasourceById(id);
    
    if (!datasource) {
      return NextResponse.json(
        {
          ok: false,
          message: "Datasource not found",
          errorCode: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Validate configuration
    if (!datasource.host || !datasource.port || !datasource.username) {
      return NextResponse.json({
        ok: false,
        message: "Invalid datasource configuration: missing required fields",
        errorCode: "INVALID_CONFIG",
      });
    }

    if (datasource.type === "oracle" && !datasource.serviceName) {
      return NextResponse.json({
        ok: false,
        message: "Oracle datasource requires serviceName",
        errorCode: "INVALID_CONFIG",
      });
    }

    if (datasource.type !== "oracle" && !datasource.database) {
      return NextResponse.json({
        ok: false,
        message: `${datasource.type} datasource requires database`,
        errorCode: "INVALID_CONFIG",
      });
    }

    const password = await getSecret(datasource.passwordSecretRef);
    if (!password) {
      return NextResponse.json({
        ok: false,
        message: "Password secret not found",
        errorCode: "SECRET_NOT_FOUND",
      });
    }

    // Perform real database connection test
    const testPayload = {
      type: datasource.type,
      host: datasource.host,
      port: datasource.port,
      database: datasource.database,
      serviceName: datasource.serviceName,
      username: datasource.username,
      password: password,
      options: datasource.options || {},
    };

    const result = await testDatabaseConnection(testPayload);
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
