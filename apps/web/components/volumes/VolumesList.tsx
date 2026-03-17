"use client";

import { useState } from "react";
import {
  Edit,
  Trash2,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  HardDrive,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  testVolumeConnection,
  deleteVolume,
  updateVolume,
  type AppVolume,
  type ApiClientOptions,
} from "@/lib/api/volumes";

const PROTOCOL_COLORS: Record<string, string> = {
  sftp: "bg-cyan-100 text-cyan-700",
  smb: "bg-violet-100 text-violet-700",
  nfs: "bg-slate-100 text-slate-700",
  ftp: "bg-amber-100 text-amber-700",
  webdav: "bg-emerald-100 text-emerald-700",
};

interface Props {
  volumes: AppVolume[];
  loading: boolean;
  selectedId: string | null;
  apiOptions: ApiClientOptions;
  onSelect: (volume: AppVolume) => void;
  onEdit: (volume: AppVolume) => void;
  onRefresh: () => void;
}

export default function VolumesList({
  volumes,
  loading,
  selectedId,
  apiOptions,
  onSelect,
  onEdit,
  onRefresh,
}: Props) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleTest = async (vol: AppVolume, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingId(vol.id);
    try {
      const result = await testVolumeConnection(vol.id, apiOptions);
      if (result.ok) {
        toast.success(`✓ ${vol.name} — ${result.message}${result.latencyMs ? ` (${result.latencyMs}ms)` : ""}`);
      } else {
        toast.error(`✗ ${vol.name} — ${result.message}`);
      }
    } catch (err) {
      toast.error(`Connection test failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleActive = async (vol: AppVolume, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateVolume(vol.id, { isActive: !vol.isActive }, apiOptions);
      toast.success(`Volume ${!vol.isActive ? "activated" : "deactivated"}`);
      onRefresh();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleDelete = async (vol: AppVolume, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete volume "${vol.name}"? This cannot be undone.`)) return;
    setDeletingId(vol.id);
    try {
      await deleteVolume(vol.id, apiOptions);
      toast.success(`Volume "${vol.name}" deleted`);
      onRefresh();
    } catch (err) {
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading volumes...</p>
      </div>
    );
  }

  if (volumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
        <HardDrive className="h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-sm font-semibold text-slate-700">No volumes registered</h3>
        <p className="mt-1 text-sm text-slate-500">Click "New Volume" to register your first remote storage</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Protocol</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Host</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Share Path</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {volumes.map((vol) => (
            <tr
              key={vol.id}
              onClick={() => onSelect(vol)}
              className={`cursor-pointer transition ${
                selectedId === vol.id ? "bg-cyan-50" : "hover:bg-slate-50"
              }`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{vol.name}</span>
                  {selectedId === vol.id && <ChevronRight className="h-3.5 w-3.5 text-cyan-500" />}
                </div>
                {vol.description && (
                  <p className="mt-0.5 text-xs text-slate-400 pl-6 truncate max-w-48">{vol.description}</p>
                )}
              </td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PROTOCOL_COLORS[vol.volumeType] ?? "bg-slate-100 text-slate-700"}`}>
                  {vol.volumeType.toUpperCase()}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">
                {vol.host}{vol.port ? `:${vol.port}` : ""}
              </td>
              <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                {vol.sharePath}
              </td>
              <td className="px-5 py-4">
                {vol.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    <XCircle className="h-3 w-3" /> Inactive
                  </span>
                )}
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleTest(vol, e)}
                    disabled={testingId === vol.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition disabled:opacity-50"
                    title="Test connection"
                  >
                    {testingId === vol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={(e) => handleToggleActive(vol, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                    title={vol.isActive ? "Deactivate" : "Activate"}
                  >
                    {vol.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(vol); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(vol, e)}
                    disabled={deletingId === vol.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === vol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
