import type { KnowledgeDraft, KnowledgeItem, KnowledgeStatus } from "../types";
import { API_KEY_STORAGE_KEY } from "./auth";

export interface KnowledgeListResponse {
  items: KnowledgeItem[];
  total: number;
  limit: number;
  offset: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = window.sessionStorage.getItem(API_KEY_STORAGE_KEY);
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
      window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorDetail(response);
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
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

export async function fetchKnowledge({
  query,
  limit,
  offset,
  status,
}: {
  query?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
}): Promise<KnowledgeListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (query?.trim()) {
    params.set("q", query.trim());
  }
  if (status) {
    params.set("status", status);
  }

  return request<KnowledgeListResponse>(`/api/knowledge?${params.toString()}`);
}

export async function createKnowledge(draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>("/api/knowledge", {
    method: "POST",
    body: JSON.stringify({
      question: draft.question,
      answer: draft.answer,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      blog_status: draft.blog_status,
    }),
  });
}

export async function getKnowledge(id: number): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/knowledge/${id}`);
}

export async function updateKnowledge(id: number, draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/knowledge/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      question: draft.question,
      answer: draft.answer,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      blog_status: draft.blog_status,
    }),
  });
}

export async function deleteKnowledge(id: number): Promise<void> {
  await request<void>(`/api/knowledge/${id}`, {
    method: "DELETE",
  });
}
