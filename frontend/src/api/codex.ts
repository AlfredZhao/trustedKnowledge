import type { CodexJobSnapshot, CodexRunResponse, CodexStreamEvent } from "../types";
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

export async function runCodex(prompt: string): Promise<CodexRunResponse> {
  return request<CodexRunResponse>("/api/codex/runs", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function startCodexJob(prompt: string): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>("/api/codex/runs/jobs", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function getCodexJob(jobId: string): Promise<CodexJobSnapshot> {
  return request<CodexJobSnapshot>(`/api/codex/runs/jobs/${encodeURIComponent(jobId)}`);
}

export async function streamCodex(
  prompt: string,
  onEvent: (event: CodexStreamEvent) => void,
): Promise<CodexRunResponse> {
  const apiKey = readStoredApiKey();
  const response = await fetch(`${API_BASE_URL}/api/codex/runs/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredApiKey();
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorDetail(response);
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
