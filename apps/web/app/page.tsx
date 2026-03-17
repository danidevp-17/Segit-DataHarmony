import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { navigation, NavGroup, getPinnableModules } from "@/lib/nav";
import ModuleCard from "@/components/ModuleCard";
import {
  Play,
  Factory,
  Drill,
  Map,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  FileText,
  Grid3X3,
  Magnet,
  FileEdit,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Map routine IDs to icons
const routineIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  addfaultname: FileEdit,
  load_pts2grid: Grid3X3,
  grav_batch: Magnet,
  renfiles2: FileText,
};

// Helper to check if nav item is a group
function isNavGroup(item: typeof navigation[0]): item is NavGroup {
  return "children" in item;
}

// Get module cards from navigation (all modules including Chatbot)
function getModuleCards(): NavGroup[] {
  const chatbot = navigation.find(
    (item) => isNavGroup(item) && "id" in item && item.id === "chatbot"
  ) as NavGroup | undefined;
  
  const pinnable = getPinnableModules();
  
  // Return all modules: pinnable + chatbot (chatbot always shown)
  return chatbot ? [...pinnable, chatbot] : pinnable;
}

function getModuleDescription(label: string): string {
  const descriptions: Record<string, string> = {
    "Geology & Geophysics": "Run routines, monitor jobs, and configure system settings",
    "Production": "Manage production-related operations and workflows",
    "Drilling": "Handle drilling operations and access management",
    "Cartography": "Manage mapping and cartographic projects",
    "Data Quality": "Monitor and manage data quality across systems",
    "Chatbot": "Get help and information about the portal",
    "Admin / Configuration": "Configure authentication, datasources, and access policies",
  };
  return descriptions[label] || "Access module features and tools";
}

// Placeholder — routines now come from the API (see /routines page)
function getMostUsedRoutines(_jobs: Array<{ routineId: string }>, _routines: Array<unknown>) {
  return [];
}

export default async function Home() {
  const jobs = await listJobs();
  const modules = getModuleCards();
  const quickRoutines = getMostUsedRoutines(jobs, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">
          DataHarmony Automation Hub
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Centralized automation, routines execution and operational monitoring
        </p>
      </div>

      {/* Section 1: Available Modules */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Available Modules
          </h2>
          <p className="text-sm text-slate-500">
            Access all portal modules and features
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              moduleId={module.id}
              description={getModuleDescription(module.label)}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Quick Routines */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Quick Routines
            </h2>
            <p className="text-sm text-slate-500">
              Most frequently used routines
            </p>
          </div>
          <Link
            href="/routines"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {quickRoutines.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto">
              <Activity className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">No routines available</p>
            <p className="mt-1 text-xs text-slate-400">
              Routines will appear here once they are added to the catalog
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickRoutines.map((routine) => {
              const Icon = routineIcons[routine.id] || FileText;
              return (
                <div
                  key={routine.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {routine.params.length} params
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
                    {routine.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {routine.description}
                  </p>
                  <Link
                    href={`/routines/${routine.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 transition-colors"
                  >
                    Run
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Recent Jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Jobs
            </h2>
            <p className="text-sm text-slate-500">
              Latest job activity and status
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View All Jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <RecentJobsList jobs={jobs.slice(0, 8)} />
        </div>
      </section>
    </div>
  );
}

function RecentJobsList({
  jobs,
}: {
  jobs: Array<{ id: string; routineId: string; status: string; createdAt: string }>;
}) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Clock className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-600">No jobs yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Submit a routine to get started
        </p>
        <Link
          href="/routines"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition"
        >
          Browse Routines
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    queued: {
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "bg-slate-100 text-slate-600",
      label: "Queued",
    },
    running: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      color: "bg-blue-100 text-blue-700",
      label: "Running",
    },
    succeeded: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: "bg-emerald-100 text-emerald-700",
      label: "Succeeded",
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: "bg-red-100 text-red-700",
      label: "Failed",
    },
  };

  return (
    <div className="divide-y divide-slate-100">
      {jobs.map((job) => {
        const config = statusConfig[job.status] || statusConfig.queued;
        const routineName = job.routineId;

        return (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {routineName}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {job.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 hidden sm:block">
                {new Date(job.createdAt).toLocaleString()}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
              >
                {config.icon}
                {config.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
