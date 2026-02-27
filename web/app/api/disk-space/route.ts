/**
 * API Route: POST /api/disk-space
 * Consulta el espacio en disco de una ruta local o UNC de red.
 * Usa check-disk-space en el backend; no expone throws al frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import checkDiskSpace from "check-disk-space";
import type { DiskSpaceResponse } from "@/types/disk";

/** Timeout en ms para redes lentas (15 segundos) */
const DISK_SPACE_TIMEOUT_MS = 15_000;

/**
 * Mapea el resultado de check-disk-space a la forma esperada por el frontend.
 * check-disk-space devuelve { size, free }; calculamos used = size - free.
 */
function toDiskSpaceResponse(size: number, free: number): DiskSpaceResponse {
  return {
    total: size,
    free,
    used: Math.max(0, size - free),
  };
}

/**
 * Ejecuta check-disk-space con timeout defensivo.
 * Si la red es lenta o la ruta no responde, devuelve error controlado.
 */
function checkDiskSpaceWithTimeout(
  path: string
): Promise<{ size: number; free: number }> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("timeout")),
      DISK_SPACE_TIMEOUT_MS
    );
  });

  const checkPromise = checkDiskSpace(path).then((result) => ({
    size: result.size,
    free: result.free,
  }));

  return Promise.race([checkPromise, timeoutPromise]);
}

/**
 * POST /api/disk-space
 * Body: { path: string } - ruta UNC o local (ej. \\\\10.100.25.35\\pgtrabajodigital)
 * Success: { total, free, used } en bytes
 * Error: { error: string } con status 500
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body.path !== "string" || !body.path.trim()) {
      return NextResponse.json(
        { error: "No se proporcionó la ruta (path requerido)" },
        { status: 400 }
      );
    }

    const path = body.path.trim();

    const { size, free } = await checkDiskSpaceWithTimeout(path);
    const response: DiskSpaceResponse = toDiskSpaceResponse(size, free);

    return NextResponse.json(response);
  } catch (err) {
    console.error("Error en /api/disk-space:", err);

    const isTimeout =
      err instanceof Error && err.message === "timeout";
    const baseMessage = isTimeout
      ? "Timeout: la ruta de red no respondió a tiempo"
      : "No se pudo acceder a la ruta de red";

    /** En desarrollo, incluir el error real para facilitar depuración */
    const isDev = process.env.NODE_ENV === "development";
    const detail =
      isDev && err instanceof Error
        ? err.message
        : undefined;

    return NextResponse.json(
      detail ? { error: baseMessage, detail } : { error: baseMessage },
      { status: 500 }
    );
  }
}
