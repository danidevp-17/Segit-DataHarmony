"use client";

import VolumeForm, { type VolumeFormData } from "./VolumeForm";
import type { AppVolume, AppVolumeUpdateRequest, VolumeType } from "@/lib/api/volumes";

interface Props {
  open: boolean;
  volume: AppVolume | null;
  submitting: boolean;
  onSubmit: (data: AppVolumeUpdateRequest) => void;
  onClose: () => void;
}

function volumeToFormData(v: AppVolume): VolumeFormData {
  return {
    module: v.module,
    name: v.name,
    description: v.description ?? "",
    volumeType: v.volumeType as VolumeType,
    host: v.host,
    sharePath: v.sharePath,
    port: v.port ?? "",
    username: v.username ?? "",
    password: "",
    privateKey: "",
    isActive: v.isActive,
  };
}

export default function VolumeEditModal({ open, volume, submitting, onSubmit, onClose }: Props) {
  if (!open || !volume) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-lg m-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Edit Volume</h2>
          <p className="mt-0.5 text-sm text-slate-500">{volume.name}</p>
        </div>
        <VolumeForm
          initial={volumeToFormData(volume)}
          isEdit={true}
          submitting={submitting}
          onSubmit={(data) => onSubmit(data as AppVolumeUpdateRequest)}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
