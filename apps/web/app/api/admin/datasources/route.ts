import { NextRequest, NextResponse } from "next/server";
import {
  loadDatasources,
  saveDatasources,
  saveDatasource,
  type Datasource,
} from "@/lib/admin/datasources";
import { saveSecret } from "@/lib/admin/secrets";
import { randomUUID } from "crypto";
import { testDatabaseConnection } from "@/lib/admin/db-connection-test";

export async function GET() {
  try {
    const datasources = await loadDatasources();
    // Don't return password secrets to client, but keep other fields
    const sanitized = datasources.map((ds) => {
      const { passwordSecretRef, ...rest } = ds;
      return rest;
    });
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Failed to load datasources:", error);
    return NextResponse.json(
      { error: "Failed to load datasources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      type,
      host,
      port,
      database,
      serviceName,
      username,
      password,
      options,
    } = body;

    // Validate required fields
    if (!name || !type || !host || !port || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["oracle", "sqlserver", "postgres"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid datasource type" },
        { status: 400 }
      );
    }

    // Validate type-specific fields
    if (type === "oracle" && !serviceName) {
      return NextResponse.json(
        { error: "Oracle datasources require serviceName" },
        { status: 400 }
      );
    }
    if ((type === "sqlserver" || type === "postgres") && !database) {
      return NextResponse.json(
        { error: `${type} datasources require database` },
        { status: 400 }
      );
    }

    // Validate connection BEFORE saving using real database drivers
    const testPayload = {
      type,
      host,
      port: parseInt(port, 10),
      database,
      serviceName,
      username,
      password,
      options: options || {},
    };

    const testResult = await testDatabaseConnection(testPayload);
    if (!testResult.ok) {
      return NextResponse.json(
        {
          error: `Connection validation failed: ${testResult.message}`,
          testError: testResult.message,
          details: testResult.details,
        },
        { status: 422 }
      );
    }

    const datasourceId = id || randomUUID();
    const passwordSecretRef = `ds_${datasourceId}_password`;

    // Save password as secret
    await saveSecret(passwordSecretRef, password);

    const datasource: Datasource = {
      id: datasourceId,
      name,
      type,
      host,
      port: parseInt(port, 10),
      database,
      serviceName,
      username,
      passwordSecretRef,
      options: options || {},
    };

    await saveDatasource(datasource);

    // Return without password
    const { passwordSecretRef: _, ...response } = datasource;
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to save datasource:", error);
    return NextResponse.json(
      { error: "Failed to save datasource" },
      { status: 500 }
    );
  }
}
