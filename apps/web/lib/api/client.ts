/**
 * Cliente HTTP para llamadas a la API FastAPI.
 * Incluye access token (Azure AD) cuando la sesión está disponible.
 */
import { getApiBaseUrl } from "./url";

export type ApiClientOptions = {
  accessToken?: string | null;
  headers?: Record<string, string>;
  timeout?: number;
};

let isRedirectingToLogin = false;

export class ApiUnauthorizedError extends Error {
  constructor(message = "Sesión expirada o no autorizada") {
    super(message);
    this.name = "ApiUnauthorizedError";
  }
}

export function handleUnauthorizedRedirect() {
  if (typeof window === "undefined" || isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  window.location.assign("/login");
}

async function fetchWithAuth(
  path: string,
  options: RequestInit & {
    accessToken?: string | null;
    timeout?: number;
    skipJsonContentType?: boolean;
  } = {}
): Promise<Response> {
  const {
    accessToken,
    timeout = 10000,
    headers: customHeaders,
    skipJsonContentType = false,
    ...init
  } = options;
  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };
  if (!skipJsonContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: controller.signal,
  });
  clearTimeout(id);
  if (res.status === 401) {
    handleUnauthorizedRedirect();
    throw new ApiUnauthorizedError();
  }
  return res;
}

export async function apiGet<T>(
  path: string,
  options?: ApiClientOptions
): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: "GET",
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiPost<T, B = unknown>(
  path: string,
  body?: B,
  options?: ApiClientOptions
): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiPut<T, B = unknown>(
  path: string,
  body?: B,
  options?: ApiClientOptions
): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiDelete(
  path: string,
  options?: ApiClientOptions
): Promise<void> {
  const res = await fetchWithAuth(path, {
    method: "DELETE",
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
}

export async function apiPatch<T, B = unknown>(
  path: string,
  body?: B,
  options?: ApiClientOptions
): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** POST con FormData (para upload de archivos). No envía Content-Type para que el browser fije el boundary. */
export async function apiPostFormData<T = unknown>(
  path: string,
  formData: FormData,
  options?: ApiClientOptions
): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: "POST",
    body: formData,
    accessToken: options?.accessToken,
    headers: options?.headers,
    timeout: options?.timeout,
    skipJsonContentType: true,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
