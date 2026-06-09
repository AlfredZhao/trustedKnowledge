import type { LlmUsageSample } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";
import { buildApiCacheKey, readCachedApiResponse, writeCachedApiResponse } from "./localCache";

export interface LlmUsageResponse {
  items: LlmUsageSample[];
  total: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string): Promise<T> {
  const apiKey = readStoredApiKey();
  const cacheKey = buildApiCacheKey(path, apiKey);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredApiKey();
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorDetail(response);
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as T;
  writeCachedApiResponse(cacheKey, data);
  return data;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item) => item.msg ?? "Validation error").join("; ");
    return null;
  } catch {
    return null;
  }
}

export async function fetchLlmUsage(limit = 72): Promise<LlmUsageResponse> {
  return request<LlmUsageResponse>(buildLlmUsagePath(limit));
}

export function readCachedLlmUsage(limit = 72): LlmUsageResponse | null {
  return readCachedApiResponse<LlmUsageResponse>(buildApiCacheKey(buildLlmUsagePath(limit), readStoredApiKey()));
}

function buildLlmUsagePath(limit = 72): string {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/api/llm-usage?${params.toString()}`;
}
