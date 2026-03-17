/**
 * Resuelve la URL base de la API FastAPI.
 * - En el navegador (cliente): siempre NEXT_PUBLIC_API_URL (ej. http://localhost:8000).
 * - En Node (servidor, Route Handlers, RSC): INTERNAL_API_URL cuando el frontend corre en Docker
 *   (ej. http://api:8000), o NEXT_PUBLIC_API_URL en desarrollo local con npm run dev.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  );
}
