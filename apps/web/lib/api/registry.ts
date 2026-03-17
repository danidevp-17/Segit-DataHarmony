/**
 * API client para el módulo registry (módulos y secciones de la app).
 */
import { apiGet } from "./client";

export interface AppSection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order_index: number;
  route: string | null;
  icon: string | null;
}

export interface AppModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  route: string | null;
  sections: AppSection[];
}

export async function getAppModules(accessToken?: string | null): Promise<AppModule[]> {
  return apiGet<AppModule[]>("/api/v1/registry/modules", { accessToken });
}
