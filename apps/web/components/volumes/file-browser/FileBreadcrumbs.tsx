"use client";

import { ChevronRight, HardDrive } from "lucide-react";

interface Props {
  volumeName: string;
  path: string;
  onNavigate: (path: string) => void;
}

export default function FileBreadcrumbs({ volumeName, path, onNavigate }: Props) {
  // Divide el path en segmentos y construye los paths acumulados
  const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
  const segments = parts.map((name, i) => ({
    name,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate("/")}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition font-medium"
      >
        <HardDrive className="h-3.5 w-3.5" />
        <span>{volumeName}</span>
      </button>
      {segments.map((seg) => (
        <span key={seg.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <button
            onClick={() => onNavigate(seg.path)}
            className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            {seg.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
