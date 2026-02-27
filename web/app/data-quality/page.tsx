import BackButton from "@/components/BackButton";
import ToolsDashboard from "@/components/ToolsDashboard";

export default function DataQualityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Catálogo de Herramientas Data Quality
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor y gestiona la calidad de datos con herramientas especializadas.
          </p>
        </div>
      </div>
      <ToolsDashboard />
    </div>
  );
}
 