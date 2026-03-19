"use client";

import Link from "next/link";
import { Play, FileText } from "lucide-react";
import type { GygRoutine } from "@/lib/api/geology-geophysics";
import { routineIcons, routineColors, DEFAULT_ICON, DEFAULT_GRADIENT } from "./routine-utils";

interface RoutineCardProps {
  routine: GygRoutine;
  /** Compact mode for landing (smaller card) */
  compact?: boolean;
}

export default function RoutineCard({ routine, compact = false }: RoutineCardProps) {
  const Icon = routineIcons[routine.slug] ?? DEFAULT_ICON;
  const gradient = routineColors[routine.slug] ?? DEFAULT_GRADIENT;

  const paramsCount = routine.params?.length ?? 0;
  const fileInputsCount = routine.fileInputs?.length ?? 0;
  const isVolumePath = routine.executionProfile === "volume_path";

  if (compact) {
    return (
      <Link
        href={`/gyg/${routine.slug}`}
        className="group flex min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
        aria-label={`Ejecutar ${routine.name}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800 line-clamp-1">{routine.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{routine.description}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {isVolumePath && (
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                volume_path
              </span>
            )}
            {routine.needsDatasource && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                datasource
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {paramsCount} params
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {fileInputsCount} files
            </span>
          </div>
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">{routine.name}</h3>
        <p className="mt-1.5 min-h-[40px] line-clamp-2 text-sm leading-relaxed text-slate-500">
          {routine.description}
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
          <code className="truncate text-xs text-slate-500">{routine.script}</code>
        </div>
        <Link
          href={`/gyg/${routine.slug}`}
          className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
          aria-label={`Ejecutar ${routine.name}`}
        >
          <Play className="h-4 w-4" aria-hidden />
          Run Routine
        </Link>
      </div>
    </div>
  );
}
