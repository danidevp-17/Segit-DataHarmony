"use client";

import { useState } from "react";
import {
  Folder,
  FileText,
  Image,
  FileJson,
  File,
  Download,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import type { FileEntry } from "@/lib/api/volumes";

function formatBytes(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function EntryIcon({ entry }: { entry: FileEntry }) {
  if (entry.type === "folder") return <Folder className="h-4 w-4 text-amber-400 shrink-0" />;
  const mime = entry.mimeType ?? "";
  if (mime.startsWith("image/")) return <Image className="h-4 w-4 text-violet-400 shrink-0" />;
  if (mime === "application/json") return <FileJson className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (mime.startsWith("text/")) return <FileText className="h-4 w-4 text-cyan-400 shrink-0" />;
  return <File className="h-4 w-4 text-slate-400 shrink-0" />;
}

interface Props {
  entry: FileEntry;
  onNavigate: (path: string) => void;
  onPreview: (entry: FileEntry) => void;
  onDownload: (entry: FileEntry) => void;
  onDownloadDirAsZip?: (entry: FileEntry) => void;
  onRename: (entry: FileEntry) => void;
  onCopy: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
  busy?: boolean;
}

export default function FileEntryRow({
  entry,
  onNavigate,
  onPreview,
  onDownload,
  onDownloadDirAsZip,
  onRename,
  onCopy,
  onDelete,
  busy = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPreviewable =
    entry.type === "file" &&
    (entry.mimeType?.startsWith("text/") ||
      entry.mimeType === "application/json" ||
      entry.mimeType?.startsWith("image/"));

  const handleRowClick = () => {
    if (entry.type === "folder") onNavigate(entry.path);
  };

  return (
    <tr
      className={`hover:bg-slate-50 transition ${entry.type === "folder" ? "cursor-pointer" : ""}`}
      onClick={handleRowClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <EntryIcon entry={entry} />
          <span className={`text-sm ${entry.type === "folder" ? "font-medium text-slate-800" : "text-slate-700"}`}>
            {entry.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {entry.type === "folder" ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 font-medium">Folder</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            {entry.extension?.toUpperCase() ?? entry.mimeType ?? "File"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{formatBytes(entry.size)}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(entry.modifiedAt)}</td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-500 ml-auto" />
        ) : (
          <div className="relative flex items-center justify-end gap-0.5">
            {isPreviewable && (
              <button
                onClick={() => onPreview(entry)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition"
                title="Preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {entry.type === "file" && (
              <button
                onClick={() => onDownload(entry)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-40 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                  {entry.type === "folder" && onDownloadDirAsZip && (
                    <button
                      onClick={() => { setMenuOpen(false); onDownloadDirAsZip(entry); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" /> Download as ZIP
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onRename(entry); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-400" /> Rename
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onCopy(entry); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" /> Duplicate
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(entry); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
