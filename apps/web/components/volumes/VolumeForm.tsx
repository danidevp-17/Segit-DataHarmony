"use client";

import { useState } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";
import type { AppVolumeCreateRequest, AppVolumeUpdateRequest, VolumeType } from "@/lib/api/volumes";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

const DEFAULT_PORTS: Record<VolumeType, number> = {
  sftp: 22,
  smb: 445,
  nfs: 2049,
  ftp: 21,
  webdav: 443,
};

export interface VolumeFormData {
  module: string;
  name: string;
  description: string;
  volumeType: VolumeType;
  host: string;
  sharePath: string;
  port: number | "";
  username: string;
  password: string;
  privateKey: string;
  isActive: boolean;
}

export const EMPTY_FORM: VolumeFormData = {
  module: "volumes",
  name: "",
  description: "",
  volumeType: "sftp",
  host: "",
  sharePath: "/",
  port: 22,
  username: "",
  password: "",
  privateKey: "",
  isActive: true,
};

interface Props {
  initial?: VolumeFormData;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (data: AppVolumeCreateRequest | AppVolumeUpdateRequest) => void;
  onCancel: () => void;
}

export default function VolumeForm({ initial = EMPTY_FORM, isEdit = false, submitting = false, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<VolumeFormData>(initial);

  const set = (updates: Partial<VolumeFormData>) => {
    if ("volumeType" in updates && updates.volumeType) {
      updates = { ...updates, port: DEFAULT_PORTS[updates.volumeType] };
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const isValid =
    form.name.trim() &&
    form.host.trim() &&
    form.sharePath.trim() &&
    (isEdit || form.volumeType === "nfs" || form.password.trim() || form.privateKey.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const payload: AppVolumeCreateRequest | AppVolumeUpdateRequest = {
      module: form.module,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      volumeType: form.volumeType,
      host: form.host.trim(),
      sharePath: form.sharePath.trim(),
      port: form.port !== "" ? Number(form.port) : undefined,
      username: form.username.trim() || undefined,
      password: form.password || undefined,
      privateKey: form.privateKey || undefined,
      ...(isEdit ? { isActive: form.isActive } : {}),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Name */}
      <div>
        <label className={labelCls}>Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className={inputCls}
          placeholder={form.volumeType === "smb" ? "Servidor SAICARGA" : "My SFTP Server"}
        />
      </div>

      {/* Module */}
      <div>
        <label className={labelCls}>Module *</label>
        <input type="text" required value={form.module} onChange={(e) => set({ module: e.target.value })} className={inputCls} placeholder="volumes" />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <input type="text" value={form.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} placeholder="Optional description" />
      </div>

      {/* Type + Port */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Protocol *</label>
          <select value={form.volumeType} onChange={(e) => set({ volumeType: e.target.value as VolumeType })} className={inputCls}>
            <option value="sftp">SFTP</option>
            <option value="smb">SMB / Windows Share</option>
            <option value="nfs">NFS</option>
            <option value="ftp">FTP</option>
            <option value="webdav">WebDAV</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Port</label>
          <input
            type="number"
            value={form.port}
            onChange={(e) => set({ port: e.target.value === "" ? "" : parseInt(e.target.value, 10) })}
            className={inputCls}
            min={1}
            max={65535}
          />
        </div>
      </div>

      {/* Host */}
      <div>
        <label className={labelCls}>Host *</label>
        <input type="text" required value={form.host} onChange={(e) => set({ host: e.target.value })} className={inputCls} placeholder="192.168.1.10 or server.example.com" />
      </div>

      {/* Share Path */}
      <div>
        <label className={labelCls}>
          {form.volumeType === "smb"
            ? "Share Name *"
            : form.volumeType === "nfs"
            ? "Export Path *"
            : "Share Path *"}
        </label>
        <input
          type="text"
          required
          value={form.sharePath}
          onChange={(e) => set({ sharePath: e.target.value })}
          className={inputCls}
          placeholder={
            form.volumeType === "smb"
              ? "saicarga"
              : form.volumeType === "nfs"
              ? "/data or /exports/home"
              : form.volumeType === "ftp"
              ? "/ or /incoming"
              : "/data or /remote/path"
          }
        />
        <p className="mt-1 text-xs text-slate-500">
          {form.volumeType === "smb"
            ? "Nombre del recurso compartido Windows (ej. net use X: \\\\host\\saicarga)"
            : form.volumeType === "nfs"
            ? "Ruta del export NFS en el servidor (ej. host:/data)"
            : form.volumeType === "ftp"
            ? "Directorio inicial tras el login (raíz o subcarpeta)"
            : "Root path accessible on the remote server"}
        </p>
      </div>

      {/* Username — NFS no usa credenciales en este adaptador */}
      {(form.volumeType !== "nfs" || form.username || form.password) && (
        <div>
          <label className={labelCls}>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => set({ username: e.target.value })}
            className={inputCls}
            placeholder={
              form.volumeType === "smb"
                ? "DOMAIN\\username"
                : form.volumeType === "ftp"
                ? "anonymous or user"
                : "user or domain\\user"
            }
          />
          {form.volumeType === "smb" && (
            <p className="mt-1 text-xs text-slate-500">
              Formato dominio: <code className="font-mono">ECOPETROL\usuario</code> — equivalente al /USER: del net use
            </p>
          )}
        </div>
      )}

      {/* Password — NFS no usa contraseña; FTP y SMB sí */}
      <div>
        <label className={labelCls}>
          {form.volumeType === "nfs"
            ? "Password (NFS no usa credenciales; dejar vacío)"
            : isEdit
            ? "Password (leave empty to keep existing)"
            : form.volumeType === "sftp" && form.privateKey
            ? "Password (optional — key takes precedence)"
            : "Password *"}
        </label>
        <input
          type="password"
          required={
            !isEdit &&
            form.volumeType !== "nfs" &&
            !(form.volumeType === "sftp" && form.privateKey)
          }
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
          className={inputCls}
          placeholder={isEdit ? "••••••••" : form.volumeType === "nfs" ? "—" : "Enter password"}
        />
      </div>

      {/* Private Key (SFTP only) */}
      {form.volumeType === "sftp" && (
        <div>
          <label className={labelCls}>Private Key (PEM) — optional, takes precedence over password</label>
          <textarea
            rows={3}
            value={form.privateKey}
            onChange={(e) => set({ privateKey: e.target.value })}
            className={inputCls + " font-mono text-xs resize-none"}
            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
          />
        </div>
      )}

      {/* isActive (edit only) */}
      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="vol-active"
            checked={form.isActive}
            onChange={(e) => set({ isActive: e.target.checked })}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label htmlFor="vol-active" className="text-sm text-slate-700 cursor-pointer">
            Active
          </label>
        </div>
      )}

      {/* SMB info banner */}
      {form.volumeType === "smb" && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
          <strong>SMB/Windows Share</strong> — equivalente a:{" "}
          <code className="font-mono">
            net use X: \\{form.host || "servidor"}\\{form.sharePath || "share"}{" "}
            /USER:{form.username || "DOMAIN\\user"} ***
          </code>
        </div>
      )}

      {/* NFS info */}
      {form.volumeType === "nfs" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <strong>NFS</strong> — El contenedor de la API debe poder ejecutar <code className="font-mono">mount -t nfs</code>.
          En Docker suele requerir <code className="font-mono">cap_add: SYS_ADMIN</code> o ejecutar el servicio con privilegios de montaje.
        </div>
      )}

      {/* FTP info */}
      {form.volumeType === "ftp" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <strong>FTP</strong> — Conexión con usuario/contraseña. Share Path es el directorio inicial tras el login (ej. / o /incoming).
        </div>
      )}

      {/* Protocol not-implemented warning (solo WebDAV) */}
      {form.volumeType === "webdav" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <strong>WebDAV</strong> support is planned but not yet implemented. The volume can be registered, but connection and file operations will return an error.
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
