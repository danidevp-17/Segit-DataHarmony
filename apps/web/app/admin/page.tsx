import Link from "next/link";
import { Shield, Key, Database, Lock } from "lucide-react";
import BackButton from "@/components/BackButton";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Admin / Configuration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage authentication, datasources, and access policies
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/auth"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
              <Key className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
                Authentication
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Configure OAuth providers (Google, Azure AD, OIDC)
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/datasources"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
              <Database className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
                Datasources
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Register and manage database connections
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/policies"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
                Access Policies
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Control which routines can access which datasources
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
