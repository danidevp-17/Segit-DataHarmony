import Link from "next/link";
import { loadCatalog, Routine } from "@/lib/catalog";
import {
  FileText,
  Grid3X3,
  Magnet,
  FileEdit,
  ArrowRight,
  Play,
  FolderOpen,
} from "lucide-react";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

// Map routine IDs to icons
const routineIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  addfaultname: FileEdit,
  load_pts2grid: Grid3X3,
  grav_batch: Magnet,
  renfiles2: FileText,
};

// Map routine IDs to gradient colors
const routineColors: Record<string, string> = {
  addfaultname: "from-violet-500 to-purple-600",
  load_pts2grid: "from-cyan-500 to-teal-600",
  grav_batch: "from-amber-500 to-orange-600",
  renfiles2: "from-emerald-500 to-green-600",
};

export default async function RoutinesPage() {
  const routines = await loadCatalog();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Routines
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse and execute operational routines
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{routines.length}</span>
          routines available
        </div>
      </div>

      {routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            No routines found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Check <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">data/catalog.json</code> configuration.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r: Routine) => {
            const Icon = routineIcons[r.id] || FileText;
            const gradient = routineColors[r.id] || "from-slate-500 to-slate-600";
            
            return (
              <div
                key={r.id}
                className="group relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300"
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {r.params.length} params
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {r.fileInputs.length} files
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="mt-4 text-base font-semibold text-slate-800">
                    {r.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed min-h-[40px]">
                    {r.description}
                  </p>

                  {/* Script path */}
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <code className="text-xs text-slate-500 truncate">
                      {r.script}
                    </code>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/routines/${r.id}`}
                    className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
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
