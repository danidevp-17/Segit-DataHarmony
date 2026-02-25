import BackButton from "@/components/BackButton";

export default function UserAccessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">User Access</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage user access permissions for drilling operations.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">User access management coming soon.</p>
      </div>
    </div>
  );
}
