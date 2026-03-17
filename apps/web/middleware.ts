/**
 * Middleware: protege rutas que requieren autenticación.
 * Redirige a /login si el usuario no está autenticado.
 */
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api/auth (NextAuth)
     * - login
     * - _next/static, _next/image
     * - favicon, public assets
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)",
  ],
};
