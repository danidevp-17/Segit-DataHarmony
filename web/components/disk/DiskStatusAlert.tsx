"use client";

/**
 * DiskStatusAlert - Muestra alerta según espacio libre.
 * - Si free < 50 GB: alerta crítica (rojo/amarillo)
 * - Si free >= 50 GB: "Sistema Óptimo" (verde/cyan)
 */

import { AlertTriangle, CheckCircle2 } from "lucide-react";

/** 50 GB en bytes - umbral para alerta crítica */
const CRITICAL_FREE_BYTES = 50 * 1024 * 1024 * 1024;

interface DiskStatusAlertProps {
  /** Espacio libre en bytes */
  freeBytes: number;
}

export default function DiskStatusAlert({ freeBytes }: DiskStatusAlertProps) {
  const isCritical = freeBytes < CRITICAL_FREE_BYTES;
  const freeGb = (freeBytes / (1024 * 1024 * 1024)).toFixed(2);

  if (isCritical) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">
              Alerta crítica
            </h3>
            <p className="text-sm text-red-700">
              Espacio libre bajo: {freeGb} GB. Se recomienda liberar espacio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-800">
            Sistema Óptimo
          </h3>
          <p className="text-sm text-emerald-700">
            Espacio libre adecuado: {freeGb} GB
          </p>
        </div>
      </div>
    </div>
  );
}
