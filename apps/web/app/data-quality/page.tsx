"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import DataQualityTabs from "./DataQualityTabs";
import {
  listScripts,
  listApplications,
  listDocuments,
  type DQScript,
  type DQApplication,
  type DQDocument,
} from "@/lib/api/data-quality";

export default function DataQualityPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [scripts, setScripts] = useState<DQScript[]>([]);
  const [applications, setApplications] = useState<DQApplication[]>([]);
  const [documents, setDocuments] = useState<DQDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, a, d] = await Promise.all([
          listScripts(apiOptions),
          listApplications(apiOptions),
          listDocuments(apiOptions),
        ]);
        setScripts(s);
        setApplications(a);
        setDocuments(d);
      } catch (e) {
        console.error("Failed to load data quality data:", e);
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
        <p className="mt-3 text-sm text-slate-500">Cargando Data Quality…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Data Quality</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scripts, aplicaciones y documentación para gestión de calidad de datos.
          </p>
        </div>
      </div>

      <DataQualityTabs
        scripts={scripts}
        applications={applications}
        documents={documents}
        apiOptions={apiOptions}
      />
    </div>
  );
}
