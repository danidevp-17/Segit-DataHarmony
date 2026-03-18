"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  Grid3X3,
  Magnet,
  FileEdit,
  Play,
  FolderOpen,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { listRoutines, type GygRoutine } from "@/lib/api/geology-geophysics";

const routineIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  addfaultname: FileEdit,
  load_pts2grid: Grid3X3,
  grav_batch: Magnet,
  renfiles2: FileText,
};

const routineColors: Record<string, string> = {
  addfaultname: "from-violet-500 to-purple-600",
  load_pts2grid: "from-cyan-500 to-teal-600",
  grav_batch: "from-amber-500 to-orange-600",
  renfiles2: "from-emerald-500 to-green-600",
};

export default function RoutinesPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [routines, setRoutines] = useState<GygRoutine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listRoutines(apiOptions, "geology_geophysics");
        setRoutines(data);
      } catch (e) {
        console.error("Failed to load routines:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading routines…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Geology &amp; Geophysics Routines</h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse and execute operational routines for Geology &amp; Geophysics
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{routines.length}</span>
          routines available
        </div>
      </div>

      {routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <FolderOpen className="h-14 w-14 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            No routines found
          </h3>
          <p className="mt-1 text-center text-sm text-slate-500 max-w-xs px-4">
            Add routines via the API or seed script. See docs/SPRINT_05.md.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r) => {
            const Icon = routineIcons[r.slug] ?? FileText;
            const gradient = routineColors[r.slug] ?? "from-slate-500 to-slate-600";
            return (
              <div
                key={r.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className={`h-1.5 bg-linear-to-r ${gradient}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                      <div
                      className={`flex h-11 w-11 items-center justify-center rounded-lg bg-linear-to-br ${gradient} text-white shadow-sm`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {r.params?.length ?? 0} params
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {r.fileInputs?.length ?? 0} files
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-800">
                    {r.name}
                  </h3>
                  <p className="mt-1.5 min-h-[40px] line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {r.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <code className="truncate text-xs text-slate-500">{r.script}</code>
                  </div>
                  <Link
                    href={`/gyg/${r.slug}`}
                    className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Play className="h-4 w-4" />
                    Run Routine
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
