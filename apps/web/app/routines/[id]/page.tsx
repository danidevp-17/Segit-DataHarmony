"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Play,
  Loader2,
  AlertCircle,
  FileText,
  Settings2,
  Upload,
  CheckCircle2,
  FolderOpen,
  Database,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { getRoutine, getRoutineDatasources } from "@/lib/api/routines";
import { createJob } from "@/lib/api/jobs";

interface Param {
  key: string;
  label: string;
  required?: boolean;
}

interface FileInput {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
}

interface Routine {
  id: string;
  slug: string;
  name: string;
  description: string;
  script: string;
  params: Param[];
  fileInputs: FileInput[];
  needsDatasource?: boolean;
}

interface Datasource {
  id: string;
  name: string;
  type: string;
}

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const routineIdOrSlug = params.id as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, FileList | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<string>("");
  const [loadingDatasources, setLoadingDatasources] = useState(false);

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const data = await getRoutine(routineIdOrSlug, apiOptions);
        setRoutine(data);
        const initial: Record<string, string> = {};
        data.params?.forEach((p: Param) => {
          initial[p.key] = "";
        });
        setFormValues(initial);

        if (data.needsDatasource) {
          setLoadingDatasources(true);
          try {
            const dsData = await getRoutineDatasources(
              routineIdOrSlug,
              "geology_geophysics",
              apiOptions
            );
            setDatasources(dsData);
          } catch (error) {
            console.error("Failed to load datasources:", error);
          } finally {
            setLoadingDatasources(false);
          }
        }
      } catch {
        setRoutine(null);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutine();
  }, [routineIdOrSlug, accessToken]);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleFileChange = (name: string, fileList: FileList | null) => {
    setFiles((prev) => ({ ...prev, [name]: fileList }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!routine) return false;
    const newErrors: Record<string, string> = {};
    for (const p of routine.params) {
      if (p.required && !formValues[p.key]?.trim()) {
        newErrors[p.key] = `${p.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routine) return;
    setGlobalError(null);
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("routineId", routine.slug ?? routine.id);
      formData.append("params", JSON.stringify(formValues));
      formData.append("moduleId", "geology_geophysics");
      if (routine.needsDatasource && selectedDatasourceId) {
        formData.append("datasourceId", selectedDatasourceId);
      }
      for (const fi of routine.fileInputs) {
        const fileList = files[fi.name];
        if (fileList) {
          for (let i = 0; i < fileList.length; i++) {
            formData.append(fi.name, fileList[i]);
          }
        }
      }

      const data = await createJob(formData, apiOptions);
      router.push(`/jobs/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGlobalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading routine...</p>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="space-y-4">
        <BackButton />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-red-700">
            Routine not found
          </h3>
          <p className="mt-1 text-sm text-red-600">
            The requested routine does not exist in the catalog.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-sm">
            <Play className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <BackButton />
              <h1 className="text-xl font-semibold text-slate-800">
                {routine.name}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">{routine.description}</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 w-fit">
              <FileText className="h-4 w-4 text-slate-400" />
              <code className="text-xs text-slate-600">{routine.script}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Global error */}
        {globalError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
        )}

        {/* Parameters Section */}
        {routine.params.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Parameters
                </h2>
                <p className="text-xs text-slate-500">
                  Configure execution parameters
                </p>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {routine.params.map((p) => (
                <div key={p.key} className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                    {p.label}
                    {p.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formValues[p.key] || ""}
                    onChange={(e) => handleInputChange(p.key, e.target.value)}
                    placeholder={p.label}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition ${
                      errors[p.key]
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />
                  {errors[p.key] && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors[p.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datasource Section */}
        {routine.needsDatasource && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Datasource
                </h2>
                <p className="text-xs text-slate-500">
                  Select a datasource for this routine execution
                </p>
              </div>
            </div>
            <div className="p-5">
              {loadingDatasources ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available datasources...
                </div>
              ) : datasources.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-700">
                    No datasources available for this routine. Please configure access policies in Admin.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedDatasourceId}
                  onChange={(e) => setSelectedDatasourceId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">-- Select a datasource --</option>
                  {datasources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Files Section */}
        {routine.fileInputs.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  File Inputs
                </h2>
                <p className="text-xs text-slate-500">
                  Upload required files for processing
                </p>
              </div>
            </div>
            <div className="space-y-5 p-5">
              {routine.fileInputs.map((fi) => (
                <div key={fi.name} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {fi.label}
                    {fi.multiple && (
                      <span className="ml-2 text-xs text-slate-400">
                        (multiple allowed)
                      </span>
                    )}
                  </label>
                  <div
                    className={`relative rounded-lg border-2 border-dashed p-4 transition ${
                      files[fi.name] && files[fi.name]!.length > 0
                        ? "border-cyan-300 bg-cyan-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="file"
                      accept={fi.accept}
                      multiple={fi.multiple}
                      onChange={(e) => handleFileChange(fi.name, e.target.files)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center text-center">
                      {files[fi.name] && files[fi.name]!.length > 0 ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-cyan-600" />
                          <p className="mt-2 text-sm font-medium text-cyan-700">
                            {files[fi.name]!.length} file(s) selected
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Click to change
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-slate-400" />
                          <p className="mt-2 text-sm text-slate-600">
                            Click to upload or drag and drop
                          </p>
                          {fi.accept && (
                            <p className="text-xs text-slate-400 mt-1">
                              Accepts: {fi.accept}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {errors[fi.name] && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors[fi.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/routines"
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {submitting ? "Submitting..." : "Submit Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
