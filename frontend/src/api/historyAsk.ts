import type { HistoryAskResponse, LlmConfig, LlmConfigDraft } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";

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

export async function askHistory(question: string, skillIds: string[] = []): Promise<HistoryAskResponse> {
  return request<HistoryAskResponse>("/api/history-ask", {
    method: "POST",
    body: JSON.stringify({ question, skill_ids: skillIds }),
  });
}

export async function fetchHistoryAskLlmConfig(): Promise<LlmConfig> {
  return request<LlmConfig>("/api/history-ask/llm-config");
}

export async function updateHistoryAskLlmConfig(draft: LlmConfigDraft): Promise<LlmConfig> {
  return request<LlmConfig>("/api/history-ask/llm-config", {
    method: "PUT",
    body: JSON.stringify({
      provider_name: draft.provider_name,
      base_url: draft.base_url,
      model_name: draft.model_name,
      enabled: draft.enabled,
    }),
  });
}
