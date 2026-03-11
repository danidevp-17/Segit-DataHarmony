"use client";

import dynamic from "next/dynamic";
import type { ScriptLanguage } from "@/lib/data-quality-scripts";

export interface CodeEditorProps {
  value: string;
  language: ScriptLanguage;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Minimum height — editor grows with content (default: "200px") */
  minHeight?: string;
  /**
   * Fixed height — editor becomes a scrollable box. When provided, minHeight
   * is ignored and the wrapper fills its parent fully.
   */
  height?: string;
}

const CodeEditorInner = dynamic(() => import("./CodeEditorInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-slate-900 text-slate-400 text-sm"
      style={{ minHeight: "200px" }}
    >
      Cargando editor...
    </div>
  ),
});

export default function CodeEditor({ height, ...props }: CodeEditorProps) {
  if (height) {
    // Fixed-height mode: fill the parent container and scroll internally.
    // The parent is responsible for defining a concrete height.
    return (
      <div className="h-full w-full overflow-hidden">
        <CodeEditorInner {...props} height={height} />
      </div>
    );
  }

  // Grow-with-content mode (default): renders like a styled textarea.
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <CodeEditorInner {...props} />
    </div>
  );
}
