import { NextResponse } from "next/server";
import { getRoutineById } from "@/lib/catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const routine = await getRoutineById(id);

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  return NextResponse.json(routine);
}
