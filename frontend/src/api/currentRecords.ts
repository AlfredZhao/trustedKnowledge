import type { CurrentDay, CurrentRecordItem, CurrentRecordOptions, CurrentWeek } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";

export interface CurrentRecordListResponse {
  items: CurrentRecordItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CurrentRecordQuery {
  query?: string;
  username?: string;
  type?: string;
  week?: string;
  day?: string;
  learnLevel?: string;
  sortBy?: "id" | "type" | "week" | "day" | "username" | "learn_level";
  sortDir?: "asc" | "desc";
  limit: number;
  offset: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = readStoredApiKey();
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

export async function fetchCurrentRecords(query: CurrentRecordQuery): Promise<CurrentRecordListResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "id",
    sort_dir: query.sortDir ?? "desc",
  });

  if (query.query?.trim()) params.set("q", query.query.trim());
  if (query.username?.trim()) params.set("username", query.username.trim());
  if (query.type?.trim()) params.set("type", query.type.trim());
  if (query.week?.trim()) params.set("week", query.week.trim());
  if (query.day?.trim()) params.set("day", query.day.trim());
  if (query.learnLevel?.trim()) params.set("learn_level", query.learnLevel.trim());

  return request<CurrentRecordListResponse>(`/api/current-records?${params.toString()}`);
}

export async function fetchCurrentRecordOptions(): Promise<CurrentRecordOptions> {
  return request<CurrentRecordOptions>("/api/current-records/options");
}

export async function createCurrentRecord({
  username,
  type,
  content,
}: {
  username: string;
  type: string;
  content?: string;
}): Promise<CurrentRecordItem> {
  return request<CurrentRecordItem>("/api/current-records", {
    method: "POST",
    body: JSON.stringify({
      username,
      type,
      content: content || null,
    }),
  });
}

export async function updateCurrentRecord({
  id,
  week,
  day,
  content,
}: {
  id: number;
  week: CurrentWeek;
  day: CurrentDay;
  content?: string;
}): Promise<CurrentRecordItem> {
  return request<CurrentRecordItem>(`/api/current-records/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      week,
      day,
      content: content || null,
    }),
  });
}
