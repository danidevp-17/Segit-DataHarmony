"use client";

/**
 * DiskMonitorPage - Contenedor principal del Monitor de Almacenamiento de Red.
 * Dropdown por letras de disco (P:, C:, etc.) usando config/disk-monitor-drives.ts.
 */

import { useState } from "react";
import BackButton from "@/components/BackButton";
import DiskChart from "@/components/disk/DiskChart";
import DiskStatusAlert from "@/components/disk/DiskStatusAlert";
import { useDiskSpace } from "@/hooks/useDiskSpace";
import { DISK_MONITOR_DRIVES } from "@/config/disk-monitor-drives";
import { Loader2, RefreshCw } from "lucide-react";

/** Convierte letra de disco a ruta: P → P:\ */
function driveLetterToPath(letter: string): string {
  return `${letter.trim().toUpperCase()}:\\`;
}

/** Etiqueta para el dropdown: "P: - pgtrabajodigital" o "P:" */
function getDriveLabel(letter: string, label?: string): string {
  const display = `${letter.toUpperCase()}:`;
  return label ? `${display} - ${label}` : display;
}

export default function DiskMonitorPage() {
  const firstDrive = DISK_MONITOR_DRIVES[0]?.letter ?? "C";
  const [selectedLetter, setSelectedLetter] = useState<string>(firstDrive);
  const { status, data, error, fetchDiskSpace } = useDiskSpace();

  const handleValidate = () => {
    fetchDiskSpace(driveLetterToPath(selectedLetter));
  };

  const handleRetry = () => {
    fetchDiskSpace(driveLetterToPath(selectedLetter));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Monitor de Almacenamiento de Red
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Valida el espacio disponible en discos locales o mapeados
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <label
              htmlFor="drive-select"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Disco
            </label>
            <select
              id="drive-select"
              value={selectedLetter}
              onChange={(e) => setSelectedLetter(e.target.value)}
              disabled={status === "loading"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {DISK_MONITOR_DRIVES.map((d) => (
                <option key={d.letter} value={d.letter}>
                  {getDriveLabel(d.letter, d.label)}
                </option>
              ))}
            </select>
          </div>
          {(status === "idle" || status === "retry") && (
            <button
              onClick={status === "retry" ? handleRetry : handleValidate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "retry" ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </>
              ) : (
                "Validar"
              )}
            </button>
          )}
          {status === "loading" && (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando…
            </button>
          )}
        </div>

        {status === "retry" && error && (
          <div className="mt-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <p className="text-xs text-red-600">
              Sugerencia: verifica que la ruta sea accesible desde la máquina donde corre el servidor (prueba abrirla en el Explorador de Windows). Si usas VPN, conéctate antes.
            </p>
          </div>
        )}

        {status === "idle" && data && (
          <div className="mt-6 space-y-4">
            <DiskChart
              total={data.total}
              free={data.free}
              used={data.used}
            />
            <DiskStatusAlert freeBytes={data.free} />
          </div>
        )}
      </div>
    </div>
  );
}
