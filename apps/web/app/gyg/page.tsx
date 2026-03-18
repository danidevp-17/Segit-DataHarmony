"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Activity, Play } from "lucide-react";
import BackButton from "@/components/BackButton";
import {
  listRoutines,
  listScripts,
  listApplications,
  listDocuments,
  type GygRoutine,
  type GygScript,
  type GygApplication,
  type GygDocument,
} from "@/lib/api/geology-geophysics";
import GygTabs from "./GygTabs";

export default function GeologyGeophysicsPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [routines, setRoutines] = useState<GygRoutine[]>([]);
  const [scripts, setScripts] = useState<GygScript[]>([]);
  const [applications, setApplications] = useState<GygApplication[]>([]);
  const [documents, setDocuments] = useState<GygDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rts, s, a, d] = await Promise.all([
          listRoutines(apiOptions, "geology_geophysics"),
          listScripts(apiOptions),
          listApplications(apiOptions),
          listDocuments(apiOptions),
        ]);
        setRoutines(rts);
        setScripts(s);
        setApplications(a);
        setDocuments(d);
      } catch (e) {
        console.error("Failed to load geology_geophysics data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Cargando Geology &amp; Geophysics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Geology &amp; Geophysics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rutinas operacionales, scripts, aplicaciones y documentación para Geology &amp; Geophysics.
          </p>
        </div>
      </div>

      {/* Routines summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500 to-teal-600 text-white">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Operational routines</h2>
              <p className="text-xs text-slate-500">
                Catálogo de rutinas ejecutables para Geology &amp; Geophysics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="h-4 w-4" />
            <span>
              <span className="font-semibold text-slate-700">{routines.length}</span> rutinas disponibles
            </span>
          </div>
        </div>
        {routines.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay rutinas configuradas para este módulo. Puedes cargarlas vía seed o API.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((r) => (
              <div
                key={r.id}
                className="group rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 line-clamp-1">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{r.description}</p>
                  </div>
                  <a
                    href={`/gyg/${r.slug}`}
                    className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800 transition"
                  >
                    Run
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shared sections: scripts / applications / documents */}
      <GygTabs
        scripts={scripts}
        applications={applications}
        documents={documents}
        apiOptions={apiOptions}
      />
    </div>
  );
}

