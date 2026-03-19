"use client";

import { Search, X, LayoutGrid, List } from "lucide-react";

export interface RoutinesFilterValue {
  query: string;
  executionProfile: "all" | "default" | "volume_path";
  needsDatasource: "all" | "yes" | "no";
}

export type RoutinesViewMode = "cards" | "list";

interface RoutinesFiltersProps {
  filter: RoutinesFilterValue;
  onFilterChange: (filter: RoutinesFilterValue) => void;
  viewMode: RoutinesViewMode;
  onViewModeChange: (mode: RoutinesViewMode) => void;
  routinesCount: number;
}

const EXECUTION_PROFILE_OPTIONS: { id: RoutinesFilterValue["executionProfile"]; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "default", label: "Default" },
  { id: "volume_path", label: "Volume path" },
];

const DATASOURCE_OPTIONS: { id: RoutinesFilterValue["needsDatasource"]; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "yes", label: "Requiere datasource" },
  { id: "no", label: "Sin datasource" },
];

export default function RoutinesFilters({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  routinesCount,
}: RoutinesFiltersProps) {
  const handleQueryChange = (query: string) => {
    onFilterChange({ ...filter, query });
  };

  const handleExecutionProfileChange = (executionProfile: RoutinesFilterValue["executionProfile"]) => {
    onFilterChange({ ...filter, executionProfile });
  };

  const handleNeedsDatasourceChange = (needsDatasource: RoutinesFilterValue["needsDatasource"]) => {
    onFilterChange({ ...filter, needsDatasource });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar rutinas…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            aria-label="Buscar rutinas por nombre, descripción o script"
          />
          {filter.query && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={filter.executionProfile}
          onChange={(e) =>
            handleExecutionProfileChange(e.target.value as RoutinesFilterValue["executionProfile"])
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          aria-label="Filtrar por perfil de ejecución"
        >
          {EXECUTION_PROFILE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              Perfil: {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filter.needsDatasource}
          onChange={(e) =>
            handleNeedsDatasourceChange(e.target.value as RoutinesFilterValue["needsDatasource"])
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          aria-label="Filtrar por requisito de datasource"
        >
          {DATASOURCE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              Datasource: {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("cards")}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
              viewMode === "cards" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"
            }`}
            aria-label="Vista de tarjetas"
            aria-pressed={viewMode === "cards"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
              viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"
            }`}
            aria-label="Vista de lista"
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <span className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{routinesCount}</span> rutinas
        </span>
      </div>
    </div>
  );
}
