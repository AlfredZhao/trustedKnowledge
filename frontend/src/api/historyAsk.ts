import type { HistoryAskDomain, HistoryAskResponse, HistoryOntologyDraft, HistoryOntologyTerm, LlmConfig, LlmConfigDraft } from "../types";
import { request } from "./client";

export async function askHistory(
  question: string,
  skillIds: string[] = [],
  executionProvider: "codex" | "history_ask_llm" = "history_ask_llm",
  modelName = "",
  domainCode: "history" | "todos" | "knowledge" | "english_materials" = "history",
): Promise<HistoryAskResponse> {
  return request<HistoryAskResponse>("/api/history-ask", {
    method: "POST",
    body: JSON.stringify({ question, skill_ids: skillIds, execution_provider: executionProvider, model_name: modelName, domain_code: domainCode }),
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

export async function fetchHistoryAskDomains(): Promise<{ items: HistoryAskDomain[] }> {
  return request<{ items: HistoryAskDomain[] }>("/api/history-ask/domains");
}

export async function fetchHistoryOntology(domainCode: "history" | "todos" | "knowledge" | "english_materials"): Promise<{ items: HistoryOntologyTerm[] }> {
  return request<{ items: HistoryOntologyTerm[] }>(`/api/history-ask/ontology?domain_code=${domainCode}`);
}

function ontologyBody(draft: HistoryOntologyDraft) {
  return {
    name: draft.name.trim(),
    domain_code: draft.domain_code,
    aliases: draft.aliases.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean),
    description: draft.description.trim(),
    visibility: draft.visibility,
    shared_with_usernames: draft.shared_with_usernames.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean),
  };
}

export async function createHistoryOntology(draft: HistoryOntologyDraft): Promise<HistoryOntologyTerm> {
  return request<HistoryOntologyTerm>("/api/history-ask/ontology", {
    method: "POST",
    invalidatePrefixes: ["/api/history-ask/ontology"],
    body: JSON.stringify(ontologyBody(draft)),
  });
}

export async function updateHistoryOntology(id: number, draft: HistoryOntologyDraft): Promise<HistoryOntologyTerm> {
  return request<HistoryOntologyTerm>(`/api/history-ask/ontology/${id}`, {
    method: "PUT",
    invalidatePrefixes: ["/api/history-ask/ontology"],
    body: JSON.stringify(ontologyBody(draft)),
  });
}

export async function deleteHistoryOntology(id: number): Promise<void> {
  await request<void>(`/api/history-ask/ontology/${id}`, {
    method: "DELETE",
    invalidatePrefixes: ["/api/history-ask/ontology"],
  });
}
