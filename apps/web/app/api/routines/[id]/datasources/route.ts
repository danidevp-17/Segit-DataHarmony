import { NextRequest, NextResponse } from "next/server";
import { getAllowedDatasourcesForRoutineInModule } from "@/lib/admin/policies";
import { loadDatasources } from "@/lib/admin/datasources";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routineId } = await params;
    const moduleId = request.nextUrl.searchParams.get("moduleId") || "geology_geophysics";
    
    // Get allowed datasource IDs for this routine in this module
    const allowedIds = await getAllowedDatasourcesForRoutineInModule(routineId, moduleId);
    
    // Load all datasources and filter by allowed IDs
    const allDatasources = await loadDatasources();
    const allowedDatasources = allDatasources
      .filter((ds) => allowedIds.includes(ds.id))
      .map((ds) => {
        const { passwordSecretRef, ...rest } = ds;
        return rest;
      });
    
    return NextResponse.json(allowedDatasources);
  } catch (error) {
    console.error("Failed to load allowed datasources:", error);
    return NextResponse.json(
      { error: "Failed to load allowed datasources" },
      { status: 500 }
    );
  }
}
