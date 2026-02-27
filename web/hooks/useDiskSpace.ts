/**
 * Hook useDiskSpace - Estado y fetch para el Monitor de Almacenamiento de Red.
 * Sin useEffect inicial ni polling: fetchDiskSpace se dispara solo al pulsar "Validar".
 */

import { useState, useCallback } from "react";
import type {
  DiskSpaceResponse,
  DiskSpaceState,
} from "@/types/disk";

interface UseDiskSpaceReturn {
  /** Estado actual: idle, loading, error, empty, retry */
  status: DiskSpaceState;
  /** Datos de espacio en disco si la petición fue exitosa */
  data: DiskSpaceResponse | null;
  /** Mensaje de error si status es error o retry */
  error: string | null;
  /** Dispara la petición POST a /api/disk-space. Solo se ejecuta cuando el usuario llama esta función. */
  fetchDiskSpace: (path: string) => Promise<void>;
}

/**
 * useDiskSpace - Hook para consultar espacio en disco vía API.
 * - No hace llamadas automáticas (sin useEffect inicial, sin polling).
 * - fetchDiskSpace(path) se llama solo cuando el usuario presiona "Validar".
 * - Maneja estados: idle, loading, error, empty, retry.
 */
export function useDiskSpace(): UseDiskSpaceReturn {
  const [status, setStatus] = useState<DiskSpaceState>("idle");
  const [data, setData] = useState<DiskSpaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDiskSpace = useCallback(async (path: string) => {
    if (!path.trim()) {
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/disk-space", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        const base = json?.error ?? "No se pudo acceder a la ruta de red";
        const detail = json?.detail;
        const message = detail ? `${base} (${detail})` : base;
        setData(null);
        setError(message);
        setStatus("retry");
        return;
      }

      const payload = json as DiskSpaceResponse;

      if (
        typeof payload.total !== "number" ||
        typeof payload.free !== "number" ||
        typeof payload.used !== "number"
      ) {
        setData(null);
        setError("Respuesta inválida del servidor");
        setStatus("retry");
        return;
      }

      setData(payload);
      setError(null);
      setStatus("idle");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error de conexión";
      setData(null);
      setError(message);
      setStatus("retry");
    }
  }, []);

  return {
    status,
    data,
    error,
    fetchDiskSpace,
  };
}
