"use client";

/**
 * DiskChart - Doughnut chart de uso de disco con react-chartjs-2.
 * Muestra espacio usado vs libre; colores según umbral crítico (< 50 GB libre).
 */

import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

/** Registro único de elementos Chart.js (evita múltiples registros) */
ChartJS.register(ArcElement, Tooltip, Legend);

/** 50 GB en bytes - umbral para alerta crítica */
const CRITICAL_FREE_BYTES = 50 * 1024 * 1024 * 1024;

/**
 * Formatea bytes a GB o TB según magnitud (base 1024).
 * - Si total < 1024 GB: muestra en GB
 * - Si total >= 1024 GB: muestra en TB
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1024) {
    const tb = gb / 1024;
    return `${tb.toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

interface DiskChartProps {
  /** Tamaño total del volumen en bytes */
  total: number;
  /** Espacio libre en bytes */
  free: number;
  /** Espacio usado en bytes (puede omitirse, se calcula como total - free) */
  used: number;
}

export default function DiskChart({ total, free, used }: DiskChartProps) {
  const isCritical = free < CRITICAL_FREE_BYTES;

  const data = useMemo(() => ({
    labels: ["Usado", "Libre"],
    datasets: [
      {
        data: [used, free],
        backgroundColor: [
          isCritical ? "#ef4444" : "#64748b", // rojo si crítico, slate si no
          isCritical ? "#f59e0b" : "#0891b2", // amarillo si crítico, cyan si no
        ],
        borderColor: ["#fff", "#fff"],
        borderWidth: 2,
      },
    ],
  }), [used, free, isCritical]);

  const options: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw as number;
              const pct =
                total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return `${ctx.label}: ${formatBytes(value)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [total]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-64 w-64">
        <Doughnut data={data} options={options} />
      </div>
      <div className="flex gap-4 text-sm text-slate-600">
        <span>Total: {formatBytes(total)}</span>
        <span>Libre: {formatBytes(free)}</span>
        <span>Usado: {formatBytes(used)}</span>
      </div>
    </div>
  );
}
