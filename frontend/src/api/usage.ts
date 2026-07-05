import type { LlmUsageSample } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

export interface LlmUsageResponse {
  items: LlmUsageSample[];
  total: number;
}

export async function fetchLlmUsage(limit = 72): Promise<LlmUsageResponse> {
  return request<LlmUsageResponse>(buildLlmUsagePath(limit));
}

export function readCachedLlmUsage(limit = 72): LlmUsageResponse | null {
  return readCachedGet<LlmUsageResponse>(buildLlmUsagePath(limit));
}

function buildLlmUsagePath(limit = 72): string {
  return `/api/llm-usage${buildQuery({ limit })}`;
}
