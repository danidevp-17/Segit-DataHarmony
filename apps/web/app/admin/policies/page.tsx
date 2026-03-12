"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { navigation } from "@/lib/nav";

interface Routine {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface Datasource {
  id: string;
  name: string;
  type: string;
}

interface PoliciesData {
  routinePolicies: Record<string, string[]>;
  modulePolicies: Record<string, string[]>;
}

const MODULE_IDS = [
  "geology_geophysics",
  "production",
  "drilling",
  "cartography",
  "data_quality",
  "admin",
];

function getModuleLabel(moduleId: string): string {
  const module = navigation.find(
    (item) => "id" in item && item.id === moduleId
  );
  return module ? module.label : moduleId;
}

export default function PoliciesPage() {
  const [activeTab, setActiveTab] = useState<"routine" | "module">("routine");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [routinePolicies, setRoutinePolicies] = useState<Record<string, string[]>>({});
  const [modulePolicies, setModulePolicies] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load routines
      const routinesRes = await fetch("/api/routines");
      if (routinesRes.ok) {
        const routinesData = await routinesRes.json();
        setRoutines(routinesData);
      }

      // Load datasources
      const dsRes = await fetch("/api/admin/datasources");
      if (dsRes.ok) {
        const dsData = await dsRes.json();
        setDatasources(dsData);
      }

      // Load policies
      const policiesRes = await fetch("/api/admin/policies");
      if (policiesRes.ok) {
        const policiesData: PoliciesData = await policiesRes.json();
        setRoutinePolicies(policiesData.routinePolicies || {});
        setModulePolicies(policiesData.modulePolicies || {});
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoutineDatasource = (routineSlug: string, datasourceId: string) => {
    setRoutinePolicies((prev) => {
      const current = prev[routineSlug] || [];
      const updated = current.includes(datasourceId)
        ? current.filter((id) => id !== datasourceId)
        : [...current, datasourceId];
      return { ...prev, [routineSlug]: updated };
    });
  };

  const handleToggleModuleDatasource = (moduleId: string, datasourceId: string) => {
    setModulePolicies((prev) => {
      const current = prev[moduleId] || [];
      const updated = current.includes(datasourceId)
        ? current.filter((id) => id !== datasourceId)
        : [...current, datasourceId];
      return { ...prev, [moduleId]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routinePolicies,
          modulePolicies,
        }),
      });

      if (res.ok) {
        setStatus({
          type: "success",
          message: "Access policies saved successfully",
        });
      } else {
        const data = await res.json();
        setStatus({
          type: "error",
          message: data.error || "Failed to save policies",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to save policies",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Access Policies
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Control which routines and modules can access which datasources
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Policies
            </>
          )}
        </button>
      </div>

      {status.type && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("routine")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeTab === "routine"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            By Routine
          </button>
          <button
            onClick={() => setActiveTab("module")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeTab === "module"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            By Module
          </button>
        </nav>
      </div>

      {datasources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Lock className="h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            No datasources available
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create datasources first to configure access policies
          </p>
        </div>
      ) : activeTab === "routine" ? (
        // By Routine Tab
        routines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Lock className="h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              No routines available
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Routines will appear here once they are added to the catalog
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Routine
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Allowed Datasources
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routines.map((routine) => {
                  const allowedIds = routinePolicies[routine.slug] || [];
                  return (
                    <tr key={routine.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {routine.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {routine.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {datasources.map((ds) => {
                            const isAllowed = allowedIds.includes(ds.id);
                            return (
                              <label
                                key={ds.id}
                                className="inline-flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() =>
                                    handleToggleRoutineDatasource(routine.slug, ds.id)
                                  }
                                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-sm text-slate-700">
                                  {ds.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  ({ds.type})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // By Module Tab
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Module
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Allowed Datasources
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULE_IDS.map((moduleId) => {
                const allowedIds = modulePolicies[moduleId] || [];
                const isEmpty = allowedIds.length === 0;
                return (
                  <tr key={moduleId} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {getModuleLabel(moduleId)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {moduleId}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {datasources.map((ds) => {
                          const isAllowed = allowedIds.includes(ds.id);
                          return (
                            <label
                              key={ds.id}
                              className="inline-flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                onChange={() =>
                                  handleToggleModuleDatasource(moduleId, ds.id)
                                }
                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                              <span className="text-sm text-slate-700">
                                {ds.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({ds.type})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500">
                        {isEmpty
                          ? "Empty = all datasources allowed"
                          : `${allowedIds.length} datasource(s) allowed`}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
