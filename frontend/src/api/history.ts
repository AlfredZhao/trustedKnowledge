import type { HistoryItem, HistorySummary } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

export interface HistoryQuery {
  query?: string;
  semanticQuery?: string;
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

export async function fetchHistory(query: HistoryQuery): Promise<HistoryListResponse> {
  return request<HistoryListResponse>(buildHistoryPath(query));
}

export async function refreshHistoryVectors(): Promise<void> {
  return request<void>("/api/history/refresh-vectors", {
    method: "POST",
    invalidatePrefixes: ["/api/history"],
  });
}

export function readCachedHistory(query: HistoryQuery): HistoryListResponse | null {
  return readCachedGet<HistoryListResponse>(buildHistoryPath(query));
}

function buildHistoryPath(query: HistoryQuery): string {
  return `/api/history${buildQuery({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "history_date",
    sort_dir: query.sortDir ?? "desc",
    q: query.query,
    semantic_query: query.semanticQuery,
    type: query.type,
    username: query.username,
    week: query.week,
    day: query.day,
    learn_level: query.learnLevel,
    v_needs_update: query.vectorStatus && query.vectorStatus !== "all" ? query.vectorStatus : undefined,
    date_from: query.dateFrom,
    date_to: query.dateTo,
  })}`;
}
