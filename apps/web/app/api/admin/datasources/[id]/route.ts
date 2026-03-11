import { NextRequest, NextResponse } from "next/server";
import {
  loadDatasources,
  getDatasourceById,
  saveDatasource,
  deleteDatasource,
  type Datasource,
} from "@/lib/admin/datasources";
import { saveSecret, deleteSecret, getSecret } from "@/lib/admin/secrets";
import { testDatabaseConnection } from "@/lib/admin/db-connection-test";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getDatasourceById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Datasource not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
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
    if (!name || !type || !host || !port || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if connection-related fields changed
    const connectionChanged =
      existing.host !== host ||
      existing.port !== parseInt(port, 10) ||
      existing.database !== database ||
      existing.serviceName !== serviceName ||
      existing.username !== username ||
      password !== undefined;

    // If connection fields changed, validate connection before saving
    if (connectionChanged) {
      const testPassword = password || (await getSecret(existing.passwordSecretRef)) || "";
      if (!testPassword) {
        return NextResponse.json(
          {
            error: "Password is required for connection validation",
            testError: "Password is required for connection validation",
          },
          { status: 422 }
        );
      }

      const testPayload = {
        type,
        host,
        port: parseInt(port, 10),
        database,
        serviceName,
        username,
        password: testPassword,
        options: options || existing.options,
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
    }

    // Update password if provided
    if (password) {
      await saveSecret(existing.passwordSecretRef, password);
    }

    const datasource: Datasource = {
      ...existing,
      name,
      type,
      host,
      port: parseInt(port, 10),
      database,
      serviceName,
      username,
      options: options || existing.options,
    };

    await saveDatasource(datasource);

    // Return without password
    const { passwordSecretRef: _, ...response } = datasource;
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update datasource:", error);
    return NextResponse.json(
      { error: "Failed to update datasource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getDatasourceById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Datasource not found" },
        { status: 404 }
      );
    }

    // Delete secret
    await deleteSecret(existing.passwordSecretRef);

    // Delete datasource
    await deleteDatasource(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete datasource:", error);
    return NextResponse.json(
      { error: "Failed to delete datasource" },
      { status: 500 }
    );
  }
}
