import BackButton from "@/components/BackButton";

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Production</h1>
          <p className="mt-1 text-sm text-slate-500">
            Production module landing page.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">Production module content coming soon.</p>
      </div>
    </div>
  );
}
