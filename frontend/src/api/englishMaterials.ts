import type { EnglishMaterialDraft, EnglishMaterialItem } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";
import { buildApiCacheKey, readCachedApiResponse, writeCachedApiResponse } from "./localCache";

export interface EnglishMaterialListResponse {
  items: EnglishMaterialItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface EnglishMaterialQuery {
  query?: string;
  category?: string;
  flag?: string;
  sortBy?: "id" | "sequence_no" | "category" | "base_expression" | "title" | "flag";
  sortDir?: "asc" | "desc";
  limit: number;
  offset: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = readStoredApiKey();
  const method = options?.method ?? "GET";
  const cacheKey = method === "GET" ? buildApiCacheKey(path, apiKey) : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...options?.headers,
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
  if (cacheKey) writeCachedApiResponse(cacheKey, data);
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

export async function fetchEnglishMaterials(query: EnglishMaterialQuery): Promise<EnglishMaterialListResponse> {
  return request<EnglishMaterialListResponse>(buildEnglishMaterialsPath(query));
}

export function readCachedEnglishMaterials(query: EnglishMaterialQuery): EnglishMaterialListResponse | null {
  return readCachedApiResponse<EnglishMaterialListResponse>(
    buildApiCacheKey(buildEnglishMaterialsPath(query), readStoredApiKey()),
  );
}

function buildEnglishMaterialsPath(query: EnglishMaterialQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "id",
    sort_dir: query.sortDir ?? "desc",
  });

  if (query.query?.trim()) params.set("q", query.query.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.flag?.trim()) params.set("flag", query.flag.trim());

  return `/api/english-materials?${params.toString()}`;
}

export async function getEnglishMaterial(id: number): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>(`/api/english-materials/${id}`);
}

export async function createEnglishMaterial(draft: EnglishMaterialDraft): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>("/api/english-materials", {
    method: "POST",
    body: JSON.stringify({
      sequence_no: draft.sequence_no.trim() ? Number(draft.sequence_no) : null,
      category: draft.category || null,
      base_expression: draft.base_expression,
      professional_sentence: draft.professional_sentence || null,
      chinese_translation: draft.chinese_translation || null,
      full_script: draft.full_script || null,
      title: draft.title || null,
      flag: Number(draft.flag),
    }),
  });
}

export async function updateEnglishMaterial(id: number, draft: EnglishMaterialDraft): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>(`/api/english-materials/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      sequence_no: draft.sequence_no.trim() ? Number(draft.sequence_no) : null,
      category: draft.category || null,
      base_expression: draft.base_expression,
      professional_sentence: draft.professional_sentence || null,
      chinese_translation: draft.chinese_translation || null,
      full_script: draft.full_script || null,
      title: draft.title || null,
      flag: Number(draft.flag),
    }),
  });
}
