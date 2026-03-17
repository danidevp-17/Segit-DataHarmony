"use client";

import VolumeForm, { EMPTY_FORM } from "./VolumeForm";
import type { AppVolumeCreateRequest } from "@/lib/api/volumes";

interface Props {
  open: boolean;
  submitting: boolean;
  onSubmit: (data: AppVolumeCreateRequest) => void;
  onClose: () => void;
}

export default function VolumeCreateModal({ open, submitting, onSubmit, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-lg m-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">New Volume</h2>
          <p className="mt-0.5 text-sm text-slate-500">Register a new remote storage volume</p>
        </div>
        <VolumeForm
          initial={EMPTY_FORM}
          isEdit={false}
          submitting={submitting}
          onSubmit={(data) => onSubmit(data as AppVolumeCreateRequest)}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
