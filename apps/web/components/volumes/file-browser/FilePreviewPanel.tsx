"use client";

import { X, Download, AlertCircle, Loader2 } from "lucide-react";
import type { FilePreviewResponse } from "@/lib/api/volumes";

interface Props {
  path: string;
  preview: FilePreviewResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function FilePreviewPanel({ path, preview, loading, error, onClose, onDownload }: Props) {
  const filename = path.split("/").pop() ?? path;

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{filename}</p>
          <p className="text-xs text-slate-400 truncate font-mono">{path}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onDownload}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-500">Loading preview...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <AlertCircle className="h-8 w-8 text-amber-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">Preview not available</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              onClick={onDownload}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3.5 w-3.5" /> Download instead
            </button>
          </div>
        )}

        {!loading && !error && preview && (
          <>
            {preview.truncated && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Showing first 512 KB — file is larger.
                <button onClick={onDownload} className="underline ml-auto">Download full</button>
              </div>
            )}

            {/* Images */}
            {preview.contentType.startsWith("image/") ? (
              <div className="flex justify-center">
                <img
                  src={`data:${preview.contentType};base64,${preview.content}`}
                  alt={filename}
                  className="max-w-full rounded-lg shadow-sm border border-slate-200"
                />
              </div>
            ) : preview.contentType === "application/json" ? (
              /* JSON — pretty-printed */
              <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {(() => {
                  try { return JSON.stringify(JSON.parse(preview.content), null, 2); }
                  catch { return preview.content; }
                })()}
              </pre>
            ) : (
              /* Plain text / CSV */
              <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {preview.content}
              </pre>
            )}

            <p className="mt-4 text-xs text-slate-400">
              {(preview.size / 1024).toFixed(1)} KB · {preview.contentType}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
