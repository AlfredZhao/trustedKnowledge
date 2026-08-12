import type { CodexConfig, CodexJobSnapshot, CodexOutputMode, CodexRunResponse, CodexStreamEvent, ProjectChangelog } from "../types";
import { clearStoredApiKey } from "./auth";
import { authFetch, buildQuery, readErrorMessage, request } from "./client";

type CodexSandboxMode = "read-only" | "workspace-write";
type CodexExecutionProvider = "codex" | "history_ask_llm";

export async function runCodex(prompt: string): Promise<CodexRunResponse> {
  return request<CodexRunResponse>("/api/codex/runs", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function fetchCodexConfig(): Promise<CodexConfig> {
  return request<CodexConfig>("/api/codex/config");
}

export async function fetchProjectChangelog(): Promise<ProjectChangelog> {
  return request<ProjectChangelog>("/api/codex/project-changelog", { cache: "no-store" });
}

export async function startCodexJob(
  prompt: string,
  skillIds: string[] = [],
  sandboxMode: CodexSandboxMode = "workspace-write",
  outputMode: CodexOutputMode = "full",
  modelName = "",
  executionProvider: CodexExecutionProvider = "codex",
): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>("/api/codex/runs/jobs", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      skill_ids: skillIds,
      sandbox_mode: sandboxMode,
      output_mode: outputMode,
      model_name: modelName,
      execution_provider: executionProvider,
    }),
  });
}

export async function getCodexJob(jobId: string): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>(`/api/codex/runs/jobs/${encodeURIComponent(jobId)}`);
}

export async function cancelCodexJob(jobId: string): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>(`/api/codex/runs/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

export async function getLatestCodexJob(): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>("/api/codex/runs/jobs/latest");
}

export async function getLatestCodexJobByOutputMode(outputMode: CodexOutputMode): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>(`/api/codex/runs/jobs/latest${buildQuery({ output_mode: outputMode })}`);
}

export async function streamCodex(
  prompt: string,
  onEvent: (event: CodexStreamEvent) => void,
  skillIds: string[] = [],
  sandboxMode: CodexSandboxMode = "workspace-write",
): Promise<CodexRunResponse> {
  const response = await authFetch("/api/codex/runs/stream", {
    method: "POST",
    body: JSON.stringify({ prompt, skill_ids: skillIds, sandbox_mode: sandboxMode }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredApiKey();
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorMessage(response);
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Codex stream is not available in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: CodexRunResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const event = JSON.parse(trimmed) as CodexStreamEvent;
      onEvent(event);
      if (event.type === "complete") {
        finalResponse = event.response;
      }
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    const event = JSON.parse(remaining) as CodexStreamEvent;
    onEvent(event);
    if (event.type === "complete") {
      finalResponse = event.response;
    }
  }

  if (!finalResponse) {
    throw new Error("Codex stream ended before returning a final response.");
  }

  return finalResponse;
}
