"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import type { ScriptLanguage } from "@/lib/data-quality-scripts";

interface CodeEditorInnerProps {
  value: string;
  language: ScriptLanguage;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  minHeight?: string;
  /** When set, the editor has a fixed height and scrolls internally. */
  height?: string;
}

// Prevent wheel events from propagating to the page while the editor scrolls internally.
// EditorView.domEventHandlers attaches to the .cm-editor root, so stopPropagation()
// is called before the event can bubble up to the document/window.
const scrollIsolation = EditorView.domEventHandlers({
  wheel(event) {
    event.stopPropagation();
  },
});

function getExtensions(language: ScriptLanguage) {
  switch (language) {
    case "python":
      return [python(), scrollIsolation];
    case "sql":
      return [sql(), scrollIsolation];
    case "bash":
      return [StreamLanguage.define(shell), scrollIsolation];
    default:
      return [scrollIsolation];
  }
}

export default function CodeEditorInner({
  value,
  language,
  readOnly = true,
  onChange,
  minHeight = "200px",
  height,
}: CodeEditorInnerProps) {
  return (
    <CodeMirror
      value={value}
      extensions={getExtensions(language)}
      readOnly={readOnly}
      onChange={onChange}
      height={height}
      minHeight={height ? undefined : minHeight}
      theme="dark"
      style={{ fontSize: "13px" }}
    />
  );
}
