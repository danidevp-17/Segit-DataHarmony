"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import type { GygRoutine } from "@/lib/api/geology-geophysics";
import { routineIcons, routineColors, DEFAULT_ICON, DEFAULT_GRADIENT } from "./routine-utils";

interface RoutineListViewProps {
  routines: GygRoutine[];
}

export default function RoutineListView({ routines }: RoutineListViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rutina
            </th>
            <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
              Script
            </th>
            <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
              Params
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {routines.map((routine) => {
            const Icon = routineIcons[routine.slug] ?? DEFAULT_ICON;
            const gradient = routineColors[routine.slug] ?? DEFAULT_GRADIENT;
            const paramsCount = routine.params?.length ?? 0;
            const isVolumePath = routine.executionProfile === "volume_path";

            return (
              <tr
                key={routine.id}
                className="transition-colors hover:bg-slate-50/50"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{routine.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{routine.description}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-5 py-3.5 md:table-cell">
                  <code className="text-xs text-slate-600">{routine.script}</code>
                </td>
                <td className="hidden px-5 py-3.5 sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {isVolumePath && (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                        volume_path
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {paramsCount} params
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/gyg/${routine.slug}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                    aria-label={`Ejecutar ${routine.name}`}
                  >
                    <Play className="h-4 w-4" aria-hidden />
                    Run
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
