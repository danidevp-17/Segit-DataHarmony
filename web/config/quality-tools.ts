/**
 * Configuración centralizada del Catálogo de Herramientas de Data Quality.
 * Cada herramienta se define aquí y se renderiza dinámicamente en el ToolsDashboard.
 */

/** Nombre del icono Lucide para mostrar en la card */
export type QualityToolIcon =
  | "HardDrive"
  | "Server"
  | "Database"
  | "Activity"
  | "ShieldCheck";

/**
 * Define una herramienta del catálogo de Data Quality.
 * - id: identificador único (usado como key en el grid)
 * - name: título visible en la card
 * - description: texto descriptivo debajo del título
 * - href: ruta Next.js para navegar al hacer clic
 * - icon: nombre del icono de lucide-react
 * - status: opcional, para mostrar badge de estado (ej. "beta", "nuevo")
 */
export interface QualityTool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: QualityToolIcon;
  status?: "beta" | "nuevo" | "estable";
}

/**
 * Array de herramientas disponibles en el catálogo.
 * Añadir nuevas herramientas aquí para que aparezcan automáticamente en el dashboard.
 */
export const QUALITY_TOOLS: QualityTool[] = [
  {
    id: "disk-monitor",
    name: "Monitor de Almacenamiento de Red",
    description:
      "Valida el espacio disponible en rutas de red UNC. Muestra gráficos de uso y alertas cuando el espacio libre es bajo.",
    href: "/tools/disk-monitor",
    icon: "HardDrive",
    status: "estable",
  },
];
