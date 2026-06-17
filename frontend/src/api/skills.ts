import type { SkillDetail, SkillDraft, SkillListResponse, SkillSummary } from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

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

async function uploadRequest<T>(path: string, file: File): Promise<T> {
  const apiKey = readStoredApiKey();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/zip",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: file,
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

export async function fetchSkills(params?: { q?: string; enabled?: boolean }): Promise<SkillListResponse> {
  const search = new URLSearchParams();
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.enabled !== undefined) search.set("enabled", String(params.enabled));
  const query = search.toString();
  return request<SkillListResponse>(`/api/skills${query ? `?${query}` : ""}`);
}

export async function fetchSkill(skillId: string): Promise<SkillDetail> {
  return request<SkillDetail>(`/api/skills/${encodeURIComponent(skillId)}`);
}

export async function createSkill(draft: SkillDraft): Promise<SkillDetail> {
  return request<SkillDetail>("/api/skills", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export async function updateSkill(skillId: string, draft: Omit<SkillDraft, "content">): Promise<SkillDetail> {
  return request<SkillDetail>(`/api/skills/${encodeURIComponent(skillId)}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
}

export async function deleteSkill(skillId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/skills/${encodeURIComponent(skillId)}`, {
    method: "DELETE",
    headers: {
      ...(readStoredApiKey() ? { "X-API-Key": readStoredApiKey() as string } : {}),
    },
  }).then(async (response) => {
    if (response.ok) return;
    if (response.status === 401) {
      clearStoredApiKey();
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorDetail(response);
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  });
}

export async function uploadSkillZip(file: File): Promise<SkillDetail> {
  const filename = encodeURIComponent(file.name);
  return uploadRequest<SkillDetail>(`/api/skills/upload?filename=${filename}`, file);
}

export async function fetchSkillFile(skillId: string, path: string): Promise<{ path: string; content: string }> {
  return request<{ path: string; content: string }>(
    `/api/skills/${encodeURIComponent(skillId)}/files/${encodePathSegments(path)}`,
  );
}

export async function updateSkillFile(
  skillId: string,
  path: string,
  content: string,
): Promise<{ path: string; content: string }> {
  return request<{ path: string; content: string }>(`/api/skills/${encodeURIComponent(skillId)}/files/${encodePathSegments(path)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

function encodePathSegments(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
