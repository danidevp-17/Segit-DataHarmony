"use client";

/**
 * ToolCard - Card individual de una herramienta del catálogo.
 * Renderiza un Link con estilos coherentes al portal (slate, cyan, teal).
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { QualityToolIcon } from "@/config/quality-tools";

interface ToolCardProps {
  /** Identificador único de la herramienta */
  id: string;
  /** Título visible en la card */
  name: string;
  /** Descripción corta debajo del título */
  description: string;
  /** Ruta Next.js al hacer clic */
  href: string;
  /** Nombre del icono Lucide */
  icon: QualityToolIcon;
  /** Badge opcional (beta, nuevo, estable) */
  status?: "beta" | "nuevo" | "estable";
}

/** Mapa de nombres de icono a componente Lucide */
const iconMap: Record<QualityToolIcon, LucideIcons.LucideIcon> = {
  HardDrive: LucideIcons.HardDrive,
  Server: LucideIcons.Server,
  Database: LucideIcons.Database,
  Activity: LucideIcons.Activity,
  ShieldCheck: LucideIcons.ShieldCheck,
};

export default function ToolCard({
  id,
  name,
  description,
  href,
  icon,
  status,
}: ToolCardProps) {
  const IconComponent = iconMap[icon] ?? LucideIcons.HardDrive;

  return (
    <Link
      href={href}
      data-tool-id={id}
      className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
          <IconComponent className="h-5 w-5" />
        </div>
        {status && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
        {name}
      </h3>
      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">
        Abrir herramienta
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
