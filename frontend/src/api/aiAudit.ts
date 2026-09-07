import { buildQuery, request } from "./client";

export type AiAuditEvent = "completed" | "failed" | "timed_out" | "cancelled" | "started";

export interface AiAuditDashboard {
  summary: {
    total_calls: number;
    completed_calls: number;
    failed_calls: number;
    timed_out_calls: number;
    cancelled_calls: number;
    in_progress_calls: number;
    success_rate: number | null;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    cached_input_tokens: number;
    average_duration_ms: number | null;
    estimated_cost_usd: number | null;
    estimated_cost_call_count: number;
  };
  daily: { date: string; calls: number; total_tokens: number; failed_calls: number }[];
  by_user: AiAuditBreakdown[];
  by_source: AiAuditBreakdown[];
  by_model: AiAuditBreakdown[];
  items: AiAuditRecord[];
  total: number;
  available_users: string[];
  available_sources: string[];
  available_models: string[];
}

export interface AiAuditBreakdown { key: string; calls: number; total_tokens: number }

export interface AiAuditRecord {
  timestamp: string;
  event: AiAuditEvent;
  provider: string | null;
  source: string | null;
  username: string | null;
  job_id: string | null;
  model_name: string | null;
  duration_ms: number | null;
  error_type: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_input_tokens: number | null;
  total_tokens: number | null;
  usage_available: boolean;
  cost_status: string | null;
  estimated_cost_usd: number | null;
}

export async function fetchAiAuditDashboard(filters: {
  days: number; username?: string; source?: string; modelName?: string; event?: AiAuditEvent; limit?: number; offset?: number;
}): Promise<AiAuditDashboard> {
  return request<AiAuditDashboard>(`/api/ai-audit/dashboard${buildQuery({
    days: filters.days, username: filters.username, source: filters.source, model_name: filters.modelName,
    event: filters.event, limit: filters.limit ?? 50, offset: filters.offset ?? 0,
  })}`);
}
