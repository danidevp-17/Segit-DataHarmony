"use client";

import { useEffect, useState } from "react";
import { Plus, HardDrive, ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listVolumes,
  createVolume,
  updateVolume,
  type AppVolume,
  type AppVolumeCreateRequest,
  type AppVolumeUpdateRequest,
} from "@/lib/api/volumes";
import { toast } from "sonner";
import VolumesList from "@/components/volumes/VolumesList";
import VolumeCreateModal from "@/components/volumes/VolumeCreateModal";
import VolumeEditModal from "@/components/volumes/VolumeEditModal";
import FileBrowserContainer from "@/components/volumes/file-browser/FileBrowserContainer";

export default function VolumesPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const apiOptions = { accessToken };

  const [volumes, setVolumes] = useState<AppVolume[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const [editingVolume, setEditingVolume] = useState<AppVolume | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [selectedVolume, setSelectedVolume] = useState<AppVolume | null>(null);

  // -------------------------------------------------------------------
  // Load volumes
  // -------------------------------------------------------------------
  const loadVolumes = async () => {
    setLoadingVolumes(true);
    try {
      const data = await listVolumes(apiOptions);
      setVolumes(data);
    } catch (err) {
      toast.error(`Failed to load volumes: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoadingVolumes(false);
    }
  };

  useEffect(() => {
    loadVolumes();
  }, [accessToken]);

  // -------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------
  const handleCreate = async (data: AppVolumeCreateRequest) => {
    setCreateBusy(true);
    try {
      const created = await createVolume(data, apiOptions);
      toast.success(`Volume "${created.name}" created`);
      setShowCreate(false);
      loadVolumes();
    } catch (err) {
      toast.error(`Failed to create: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setCreateBusy(false);
    }
  };

  // -------------------------------------------------------------------
  // Edit
  // -------------------------------------------------------------------
  const handleEdit = async (data: AppVolumeUpdateRequest) => {
    if (!editingVolume) return;
    setEditBusy(true);
    try {
      const updated = await updateVolume(editingVolume.id, data, apiOptions);
      toast.success(`Volume "${updated.name}" updated`);
      setEditingVolume(null);
      // If we were browsing this volume, refresh the selected
      if (selectedVolume?.id === updated.id) setSelectedVolume(updated);
      loadVolumes();
    } catch (err) {
      toast.error(`Failed to update: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setEditBusy(false);
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {selectedVolume && (
            <button
              onClick={() => setSelectedVolume(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Back to volumes list"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-cyan-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800">
                {selectedVolume ? selectedVolume.name : "Storage & Volumes"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedVolume
                  ? `${selectedVolume.volumeType.toUpperCase()} · ${selectedVolume.host}${selectedVolume.port ? `:${selectedVolume.port}` : ""}`
                  : "Manage and browse remote volumes"}
              </p>
            </div>
          </div>
        </div>
        {!selectedVolume && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition"
          >
            <Plus className="h-4 w-4" />
            New Volume
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {selectedVolume ? (
          /* File browser view */
          <div className="h-full">
            {selectedVolume.isActive ? (
              <FileBrowserContainer volume={selectedVolume} apiOptions={apiOptions} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <HardDrive className="h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">Volume is inactive</p>
                <p className="mt-1 text-xs text-slate-500">Activate the volume to browse its contents</p>
                <button
                  onClick={() => { setEditingVolume(selectedVolume); }}
                  className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Edit Volume
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Volumes list */
          <div className="p-6">
            <VolumesList
              volumes={volumes}
              loading={loadingVolumes}
              selectedId={selectedVolume?.id ?? null}
              apiOptions={apiOptions}
              onSelect={(vol) => setSelectedVolume(vol)}
              onEdit={(vol) => setEditingVolume(vol)}
              onRefresh={loadVolumes}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <VolumeCreateModal
        open={showCreate}
        submitting={createBusy}
        onSubmit={handleCreate}
        onClose={() => setShowCreate(false)}
      />
      <VolumeEditModal
        open={!!editingVolume}
        volume={editingVolume}
        submitting={editBusy}
        onSubmit={handleEdit}
        onClose={() => setEditingVolume(null)}
      />
    </div>
  );
}
