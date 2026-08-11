import type { HistoryAskResponse, LlmConfig, LlmConfigDraft } from "../types";
import { request } from "./client";

export async function askHistory(
  question: string,
  skillIds: string[] = [],
  executionProvider: "codex" | "history_ask_llm" = "history_ask_llm",
  modelName = "",
): Promise<HistoryAskResponse> {
  return request<HistoryAskResponse>("/api/history-ask", {
    method: "POST",
    body: JSON.stringify({ question, skill_ids: skillIds, execution_provider: executionProvider, model_name: modelName }),
  });
}

export async function fetchHistoryAskLlmConfig(): Promise<LlmConfig> {
  return request<LlmConfig>("/api/history-ask/llm-config");
}

export async function updateHistoryAskLlmConfig(draft: LlmConfigDraft): Promise<LlmConfig> {
  return request<LlmConfig>("/api/history-ask/llm-config", {
    method: "PUT",
    invalidatePrefixes: ["/api/history-ask/llm-config"],
    body: JSON.stringify({
      provider_name: draft.provider_name,
      base_url: draft.base_url,
      model_name: draft.model_name,
      enabled: draft.enabled,
    }),
  });
}
