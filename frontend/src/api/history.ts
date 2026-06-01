import type { HistoryItem, HistorySummary } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";

export interface HistoryQuery {
  query?: string;
  type?: string;
  username?: string;
  week?: string;
  day?: string;
  learnLevel?: string;
  vectorStatus?: "all" | "0" | "1";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "history_date" | "id" | "type" | "username" | "learn_level";
  sortDir?: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
  summary: HistorySummary;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string): Promise<T> {
  const apiKey = readStoredApiKey();
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

export async function fetchHistory(query: HistoryQuery): Promise<HistoryListResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "history_date",
    sort_dir: query.sortDir ?? "desc",
  });

  if (query.query?.trim()) params.set("q", query.query.trim());
  if (query.type?.trim()) params.set("type", query.type.trim());
  if (query.username?.trim()) params.set("username", query.username.trim());
  if (query.week?.trim()) params.set("week", query.week.trim());
  if (query.day?.trim()) params.set("day", query.day.trim());
  if (query.learnLevel?.trim()) params.set("learn_level", query.learnLevel.trim());
  if (query.vectorStatus && query.vectorStatus !== "all") params.set("v_needs_update", query.vectorStatus);
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);

  return request<HistoryListResponse>(`/api/history?${params.toString()}`);
}
