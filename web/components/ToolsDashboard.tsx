"use client";

/**
 * ToolsDashboard - Grid de herramientas del catálogo Data Quality.
 * Lee QUALITY_TOOLS de la configuración y renderiza ToolCard para cada una.
 */

import { QUALITY_TOOLS } from "@/config/quality-tools";
import ToolCard from "@/components/ToolCard";

export default function ToolsDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {QUALITY_TOOLS.map((tool) => (
        <ToolCard
          key={tool.id}
          id={tool.id}
          name={tool.name}
          description={tool.description}
          href={tool.href}
          icon={tool.icon}
          status={tool.status}
        />
      ))}
    </div>
  );
}
