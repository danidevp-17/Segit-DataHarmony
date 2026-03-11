import { NextRequest, NextResponse } from "next/server";
import { loadPolicies, savePolicies, type PoliciesData } from "@/lib/admin/policies";

export async function GET() {
  try {
    const policies = await loadPolicies();
    return NextResponse.json(policies);
  } catch (error) {
    console.error("Failed to load policies:", error);
    return NextResponse.json(
      { error: "Failed to load policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routinePolicies, modulePolicies } = body;

    // Validate structure
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

    const policies: PoliciesData = {
      routinePolicies: routinePolicies || {},
      modulePolicies: modulePolicies || {},
    };

    // Validate that all values are arrays
    for (const [key, value] of Object.entries(policies.routinePolicies)) {
      if (!Array.isArray(value)) {
        return NextResponse.json(
          { error: `routinePolicies[${key}] must be an array` },
          { status: 400 }
        );
      }
    }
    for (const [key, value] of Object.entries(policies.modulePolicies)) {
      if (!Array.isArray(value)) {
        return NextResponse.json(
          { error: `modulePolicies[${key}] must be an array` },
          { status: 400 }
        );
      }
    }

    await savePolicies(policies);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save policies:", error);
    return NextResponse.json(
      { error: "Failed to save policies" },
      { status: 500 }
    );
  }
}
