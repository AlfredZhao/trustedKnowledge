import type { LlmUsageSample } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

export interface LlmUsageResponse {
  items: LlmUsageSample[];
  total: number;
}

export async function fetchLlmUsage(limit = 72, includeTotal = true): Promise<LlmUsageResponse> {
  return request<LlmUsageResponse>(buildLlmUsagePath(limit, includeTotal));
}

export function readCachedLlmUsage(limit = 72, includeTotal = true): LlmUsageResponse | null {
  return readCachedGet<LlmUsageResponse>(buildLlmUsagePath(limit, includeTotal));
}

function buildLlmUsagePath(limit = 72, includeTotal = true): string {
  return `/api/llm-usage${buildQuery({ limit, include_total: includeTotal ? undefined : false })}`;
}
