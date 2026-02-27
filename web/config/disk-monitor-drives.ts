/**
 * Configuración de discos/unidades para el Monitor de Almacenamiento.
 * Añade aquí las letras de unidad (mapeadas o locales) que quieras monitorear.
 * Se usan rutas como P:\ , C:\ para mayor fiabilidad en Windows.
 */

/**
 * Define una unidad de disco a monitorear.
 * - letter: letra de la unidad (sin dos puntos), ej. "P", "C", "D"
 * - label: texto opcional para mostrar en el dropdown (ej. "pgtrabajodigital")
 */
export interface DiskMonitorDrive {
  letter: string;
  label?: string;
}

/**
 * Discos disponibles en el dropdown.
 * El backend recibe la ruta completa: P → P:\ , C → C:\
 */
export const DISK_MONITOR_DRIVES: DiskMonitorDrive[] = [
  { letter: "P", label: "pgtrabajodigital" },
  { letter: "C", label: "Sistema" },
  // Añade aquí más unidades según necesites
];
