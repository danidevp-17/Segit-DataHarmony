import BackButton from "@/components/BackButton";
import { loadScripts } from "@/lib/data-quality-scripts";
import { loadApplications } from "@/lib/data-quality-apps";
import { loadDocuments } from "@/lib/data-quality-docs";
import DataQualityTabs from "./DataQualityTabs";

export const dynamic = "force-dynamic";

export default async function DataQualityPage() {
  const [scripts, applications, documents] = await Promise.all([
    loadScripts(),
    loadApplications(),
    loadDocuments(),
  ]);

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
      />
    </div>
  );
}
