import { clearStoredApiKey, readStoredApiKey } from "./auth";
import {
  buildApiCacheKey,
  invalidateApiResponseCache,
  readCachedApiResponse,
  writeCachedApiResponse,
} from "./localCache";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const pendingGetRequests = new Map<string, Promise<unknown>>();

export interface ApiRequestOptions extends RequestInit {
  invalidatePrefixes?: string[];
}

export function buildQuery(values: Record<string, string | number | boolean | null | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    const normalized = typeof value === "string" ? value.trim() : String(value);
    if (!normalized) return;
    params.set(key, normalized);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  const apiKey = readStoredApiKey();
  const headers = new Headers(options?.headers);
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => (isValidationDetail(item) ? item.msg : "Validation error")).join("; ");
    }
    return null;
  } catch {
    return null;
  }
}

export async function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const method = options?.method ?? "GET";
  const cacheKey = method === "GET" ? buildApiCacheKey(path, readStoredApiKey()) : null;
  const { invalidatePrefixes, ...fetchOptions } = options ?? {};
  const executeRequest = async () => {
    const response = await authFetch(path, fetchOptions);

    if (!response.ok) {
      if (response.status === 401) {
        clearStoredApiKey();
        window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
      }
      const detail = await readErrorMessage(response);
      throw new Error(detail || `Request failed with HTTP ${response.status}`);
    }

    if (invalidatePrefixes?.length) {
      invalidateApiCache(invalidatePrefixes);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = (await response.json()) as T;
    if (cacheKey) writeCachedApiResponse(cacheKey, data);
    return data;
  };

  if (method !== "GET" || fetchOptions.signal) {
    return executeRequest();
  }

  const dedupeKey = `${readStoredApiKey() ?? "anonymous"}:${path}`;
  const pending = pendingGetRequests.get(dedupeKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const requestPromise = executeRequest().finally(() => {
    pendingGetRequests.delete(dedupeKey);
  });
  pendingGetRequests.set(dedupeKey, requestPromise);
  return requestPromise as Promise<T>;
}

export function readCachedGet<T>(path: string, maxAgeMs?: number): T | null {
  return readCachedApiResponse<T>(buildApiCacheKey(path, readStoredApiKey()), maxAgeMs);
}

export function invalidateApiCache(pathPrefixes: string[]) {
  invalidateApiResponseCache(pathPrefixes);
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function isValidationDetail(value: unknown): value is { msg: string } {
  return typeof value === "object" && value !== null && "msg" in value;
}
