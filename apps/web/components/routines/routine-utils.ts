/**
 * Icon and color mapping for routines by slug.
 * Used by RoutineCard for visual differentiation.
 */
import {
  FileText,
  Grid3X3,
  Magnet,
  FileEdit,
  type LucideIcon,
} from "lucide-react";

export const routineIcons: Record<string, LucideIcon> = {
  addfaultname: FileEdit,
  load_pts2grid: Grid3X3,
  grav_batch: Magnet,
  renfiles2: FileText,
};

export const routineColors: Record<string, string> = {
  addfaultname: "from-violet-500 to-purple-600",
  load_pts2grid: "from-cyan-500 to-teal-600",
  grav_batch: "from-amber-500 to-orange-600",
  renfiles2: "from-emerald-500 to-green-600",
};

export const DEFAULT_ICON = FileText;
export const DEFAULT_GRADIENT = "from-slate-500 to-slate-600";
