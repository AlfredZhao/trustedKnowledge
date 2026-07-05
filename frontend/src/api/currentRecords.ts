import type { CurrentDay, CurrentRecordItem, CurrentRecordOptions, CurrentWeek } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

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

export async function fetchCurrentRecords(query: CurrentRecordQuery): Promise<CurrentRecordListResponse> {
  return request<CurrentRecordListResponse>(buildCurrentRecordsPath(query));
}

export function readCachedCurrentRecords(query: CurrentRecordQuery): CurrentRecordListResponse | null {
  return readCachedGet<CurrentRecordListResponse>(buildCurrentRecordsPath(query));
}

function buildCurrentRecordsPath(query: CurrentRecordQuery): string {
  return `/api/current-records${buildQuery({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "id",
    sort_dir: query.sortDir ?? "desc",
    q: query.query,
    username: query.username,
    type: query.type,
    week: query.week,
    day: query.day,
    learn_level: query.learnLevel,
  })}`;
}

export async function fetchCurrentRecordOptions(): Promise<CurrentRecordOptions> {
  return request<CurrentRecordOptions>("/api/current-records/options");
}

export function readCachedCurrentRecordOptions(): CurrentRecordOptions | null {
  return readCachedGet<CurrentRecordOptions>("/api/current-records/options");
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
    invalidatePrefixes: ["/api/current-records"],
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
    invalidatePrefixes: ["/api/current-records"],
    body: JSON.stringify({
      week,
      day,
      content: content || null,
    }),
  });
}
