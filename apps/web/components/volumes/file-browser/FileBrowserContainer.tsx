"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Loader2,
  FolderPlus,
  Upload,
  AlertCircle,
  ChevronLeft,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  listDirectory,
  previewFile,
  downloadFile,
  downloadDirectoryAsZip,
  uploadFile,
  createFolder,
  renameEntry,
  copyEntry,
  deleteEntry,
  type AppVolume,
  type FileEntry,
  type FilePreviewResponse,
  type ApiClientOptions,
} from "@/lib/api/volumes";
import FileBreadcrumbs from "./FileBreadcrumbs";
import FileEntryRow from "./FileEntryRow";
import FilePreviewPanel from "./FilePreviewPanel";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

interface Props {
  volume: AppVolume;
  apiOptions: ApiClientOptions;
}

export default function FileBrowserContainer({ volume, apiOptions }: Props) {
  const [path, setPath] = useState(volume.sharePath || "/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPaths, setBusyPaths] = useState<Set<string>>(new Set());

  // Preview
  const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null);
  const [previewData, setPreviewData] = useState<FilePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Modals state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState("");
  const [createFolderBusy, setCreateFolderBusy] = useState(false);

  const [renameEntry_, setRenameEntry] = useState<FileEntry | null>(null);
  const [newName, setNewName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  const [copyEntry_, setCopyEntry] = useState<FileEntry | null>(null);
  const [destPath, setDestPath] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Filtro por nombre (solo en la lista actual, no busca en subcarpetas)
  const [filterQuery, setFilterQuery] = useState("");
  const filteredEntries = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, filterQuery]);

  // -------------------------------------------------------------------
  // Load directory
  // -------------------------------------------------------------------
  const loadDir = useCallback(
    async (targetPath: string) => {
      setFilterQuery("");
      setLoading(true);
      setError(null);
      try {
        const res = await listDirectory(volume.id, targetPath, apiOptions);
        setEntries(res.entries);
        setPath(targetPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load directory";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [volume.id, apiOptions],
  );

  useEffect(() => {
    loadDir(volume.sharePath || "/");
  }, [volume.id]);

  const goBack = () => {
    const parent = path.replace(/\/[^/]+\/?$/, "") || "/";
    if (parent !== path) loadDir(parent);
  };

  // -------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------
  const handlePreview = async (entry: FileEntry) => {
    setPreviewEntry(entry);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const data = await previewFile(volume.id, entry.path, apiOptions);
      setPreviewData(data);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview unavailable");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (entry: FileEntry) => {
    setBusyPaths((p) => new Set(p).add(entry.path));
    try {
      await downloadFile(volume.id, entry.path, entry.name, apiOptions);
      toast.success(`Download started: ${entry.name}`);
    } catch (err) {
      toast.error(`Download failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBusyPaths((p) => { const s = new Set(p); s.delete(entry.path); return s; });
    }
  };

  const handleDownloadDirAsZip = async (entry: FileEntry) => {
    if (entry.type !== "folder") return;
    setBusyPaths((p) => new Set(p).add(entry.path));
    try {
      await downloadDirectoryAsZip(volume.id, entry.path, entry.name, apiOptions);
      toast.success(`Download started: ${entry.name}.zip`);
    } catch (err) {
      toast.error(`Download failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBusyPaths((p) => { const s = new Set(p); s.delete(entry.path); return s; });
    }
  };

  // -------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    try {
      await uploadFile(volume.id, path, file, apiOptions);
      toast.success(`"${file.name}" uploaded successfully`);
      loadDir(path);
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // -------------------------------------------------------------------
  // Create folder
  // -------------------------------------------------------------------
  const handleCreateFolder = async () => {
    if (!createFolderName.trim()) return;
    setCreateFolderBusy(true);
    try {
      await createFolder(volume.id, { pathParent: path, folderName: createFolderName.trim() }, apiOptions);
      toast.success(`Folder "${createFolderName}" created`);
      setCreateFolderOpen(false);
      setCreateFolderName("");
      loadDir(path);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setCreateFolderBusy(false);
    }
  };

  // -------------------------------------------------------------------
  // Rename
  // -------------------------------------------------------------------
  const openRename = (entry: FileEntry) => {
    setRenameEntry(entry);
    setNewName(entry.name);
  };

  const handleRename = async () => {
    if (!renameEntry_ || !newName.trim()) return;
    setRenameBusy(true);
    try {
      await renameEntry(volume.id, { sourcePath: renameEntry_.path, newName: newName.trim() }, apiOptions);
      toast.success(`Renamed to "${newName}"`);
      setRenameEntry(null);
      loadDir(path);
    } catch (err) {
      toast.error(`Rename failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRenameBusy(false);
    }
  };

  // -------------------------------------------------------------------
  // Copy / Duplicate
  // -------------------------------------------------------------------
  const openCopy = (entry: FileEntry) => {
    setCopyEntry(entry);
    // Suggest: same dir with _copy suffix
    const dir = entry.path.replace(/\/[^/]+$/, "") || path;
    const ext = entry.name.includes(".") ? "." + entry.name.split(".").pop() : "";
    const base = entry.name.replace(ext, "");
    setDestPath(`${dir}/${base}_copy${ext}`);
  };

  const handleCopy = async () => {
    if (!copyEntry_ || !destPath.trim()) return;
    setCopyBusy(true);
    try {
      await copyEntry(volume.id, { sourcePath: copyEntry_.path, destinationPath: destPath.trim() }, apiOptions);
      toast.success("Copied successfully");
      setCopyEntry(null);
      loadDir(path);
    } catch (err) {
      toast.error(`Copy failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setCopyBusy(false);
    }
  };

  // -------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------
  const handleDelete = async (entry: FileEntry) => {
    if (!confirm(`Delete "${entry.name}"?${entry.type === "folder" ? " This will delete all contents recursively." : ""}`)) return;
    setBusyPaths((p) => new Set(p).add(entry.path));
    try {
      await deleteEntry(volume.id, entry.path, apiOptions);
      toast.success(`"${entry.name}" deleted`);
      loadDir(path);
      if (previewEntry?.path === entry.path) setPreviewEntry(null);
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBusyPaths((p) => { const s = new Set(p); s.delete(entry.path); return s; });
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const showPreview = !!previewEntry;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={goBack}
            disabled={path === (volume.sharePath || "/")}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-30"
            title="Go up"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <FileBreadcrumbs volumeName={volume.name} path={path} onNavigate={loadDir} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCreateFolderOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </button>
          <button
            onClick={handleUploadClick}
            disabled={uploadBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {uploadBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </button>
          <button
            onClick={() => loadDir(path)}
            disabled={loading}
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-1 overflow-hidden ${showPreview ? "divide-x divide-slate-200" : ""}`}>
        {/* File list */}
        <div className={`flex flex-col overflow-auto ${showPreview ? "w-1/2" : "w-full"}`}>
          {error && !loading && (
            <div className="flex items-center gap-2 mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              <p className="mt-2 text-sm text-slate-500">Loading...</p>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-slate-500">This folder is empty</p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <>
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter by name..."
                  className="flex-1 min-w-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  aria-label="Filter files and folders by name"
                />
                {filterQuery.trim() && (
                  <span className="text-xs text-slate-500 shrink-0">
                    {filteredEntries.length} of {entries.length}
                  </span>
                )}
              </div>

              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-slate-500">
                    No files or folders match &quot;{filterQuery.trim()}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterQuery("")}
                    className="mt-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    Clear filter
                  </button>
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="sticky top-[52px] z-10 bg-white border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Size</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Modified</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEntries.map((entry) => (
                      <FileEntryRow
                        key={entry.path}
                        entry={entry}
                        busy={busyPaths.has(entry.path)}
                        onNavigate={loadDir}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onDownloadDirAsZip={handleDownloadDirAsZip}
                        onRename={openRename}
                        onCopy={openCopy}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="w-1/2 overflow-hidden">
            <FilePreviewPanel
              path={previewEntry!.path}
              preview={previewData}
              loading={previewLoading}
              error={previewError}
              onClose={() => setPreviewEntry(null)}
              onDownload={() => handleDownload(previewEntry!)}
            />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {/* Create folder modal */}
      {createFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">New Folder</h3>
            <input
              type="text"
              autoFocus
              value={createFolderName}
              onChange={(e) => setCreateFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className={inputCls}
              placeholder="folder-name"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setCreateFolderOpen(false); setCreateFolderName(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleCreateFolder}
                disabled={!createFolderName.trim() || createFolderBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {createFolderBusy && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameEntry_ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Rename</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{renameEntry_.path}</p>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className={inputCls}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRenameEntry(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleRename}
                disabled={!newName.trim() || renameBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {renameBusy && <Loader2 className="h-4 w-4 animate-spin" />} Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy modal */}
      {copyEntry_ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Duplicate</h3>
            <p className="text-xs text-slate-500 mb-3">
              Source: <span className="font-mono">{copyEntry_.path}</span>
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination path</label>
            <input
              type="text"
              autoFocus
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCopy()}
              className={inputCls + " font-mono text-xs"}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCopyEntry(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleCopy}
                disabled={!destPath.trim() || copyBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {copyBusy && <Loader2 className="h-4 w-4 animate-spin" />} Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
