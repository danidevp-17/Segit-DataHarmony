"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderCog,
  FileCode,
  Settings2,
} from "lucide-react";
import BackButton from "@/components/BackButton";

type SettingsForm = {
  OW_HOME: string;
  WORKSPACE_ROOT: string;
  OW_ENV_SCRIPT: string;
  DEFAULT_DIST: string;
  DEFAULT_PD_OW: string;
  DEFAULT_IP_OW: string;
  DEFAULT_INTERP_ID: string;
};

const emptySettings: SettingsForm = {
  OW_HOME: "",
  WORKSPACE_ROOT: "",
  OW_ENV_SCRIPT: "",
  DEFAULT_DIST: "",
  DEFAULT_PD_OW: "",
  DEFAULT_IP_OW: "",
  DEFAULT_INTERP_ID: "",
};

export default function SettingsPage() {
  const [formState, setFormState] = useState<SettingsForm>(emptySettings);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as Partial<SettingsForm>;
        setFormState({ ...emptySettings, ...data });
      } catch {
        setStatus({
          type: "error",
          message: "Unable to load settings.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    // Clear status when user starts editing
    if (status.type) {
      setStatus({ type: null, message: "" });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ type: null, message: "" });

    if (!formState.OW_HOME.trim() || !formState.WORKSPACE_ROOT.trim()) {
      setStatus({
        type: "error",
        message: "OW_HOME and WORKSPACE_ROOT are required.",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to save settings.");
      }

      setStatus({
        type: "success",
        message: "Settings saved successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings.";
      setStatus({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure workspace paths and default parameters for routines.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Paths Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
              <FolderCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Required Paths
              </h2>
              <p className="text-xs text-slate-500">
                Essential directories for routine execution
              </p>
            </div>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <InputField
              label="OW_HOME"
              value={formState.OW_HOME}
              onChange={(value) => handleChange("OW_HOME", value)}
              placeholder="C:\OW"
              required
              disabled={isSaving}
            />
            <InputField
              label="WORKSPACE_ROOT"
              value={formState.WORKSPACE_ROOT}
              onChange={(value) => handleChange("WORKSPACE_ROOT", value)}
              placeholder="C:\Workspaces"
              required
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Environment Script Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Environment Script
              </h2>
              <p className="text-xs text-slate-500">
                Optional script sourced before execution
              </p>
            </div>
          </div>
          <div className="p-5">
            <InputField
              label="OW_ENV_SCRIPT"
              value={formState.OW_ENV_SCRIPT}
              onChange={(value) => handleChange("OW_ENV_SCRIPT", value)}
              placeholder="C:\OW\env\setup.ps1"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Default Parameters Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Default Parameters
              </h2>
              <p className="text-xs text-slate-500">
                Pre-filled values for routine forms
              </p>
            </div>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <InputField
              label="DEFAULT_DIST"
              value={formState.DEFAULT_DIST}
              onChange={(value) => handleChange("DEFAULT_DIST", value)}
              placeholder="2.5"
              disabled={isSaving}
            />
            <InputField
              label="DEFAULT_PD_OW"
              value={formState.DEFAULT_PD_OW}
              onChange={(value) => handleChange("DEFAULT_PD_OW", value)}
              placeholder="0.7"
              disabled={isSaving}
            />
            <InputField
              label="DEFAULT_IP_OW"
              value={formState.DEFAULT_IP_OW}
              onChange={(value) => handleChange("DEFAULT_IP_OW", value)}
              placeholder="12.5"
              disabled={isSaving}
            />
            <InputField
              label="DEFAULT_INTERP_ID"
              value={formState.DEFAULT_INTERP_ID}
              onChange={(value) => handleChange("DEFAULT_INTERP_ID", value)}
              placeholder="linear"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Status Message */}
        {status.type && (
          <div
            className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50 disabled:text-slate-500 transition"
      />
    </div>
  );
}
