import BackButton from "@/components/BackButton";

export default function CulturalInfoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Cultural Info</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage cultural information and resources.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">Cultural info functionality coming soon.</p>
      </div>
    </div>
  );
}
