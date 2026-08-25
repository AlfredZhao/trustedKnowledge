import type { SkillDetail, SkillDraft, SkillListResponse, SkillSummary } from "../types";
import { buildQuery, request } from "./client";

export async function fetchSkills(params?: { q?: string; enabled?: boolean; scope?: "owned" | "callable"; agentCode?: string }): Promise<SkillListResponse> {
  return request<SkillListResponse>(`/api/skills${buildQuery({ q: params?.q, enabled: params?.enabled, scope: params?.scope, agent_code: params?.agentCode })}`);
}

export async function fetchSkill(skillId: string): Promise<SkillDetail> {
  return request<SkillDetail>(`/api/skills/${encodeURIComponent(skillId)}`);
}

export async function createSkill(draft: SkillDraft): Promise<SkillDetail> {
  return request<SkillDetail>("/api/skills", {
    method: "POST",
    invalidatePrefixes: ["/api/skills"],
    body: JSON.stringify(draft),
  });
}

export async function updateSkill(skillId: string, draft: Omit<SkillDraft, "content">): Promise<SkillDetail> {
  return request<SkillDetail>(`/api/skills/${encodeURIComponent(skillId)}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/skills"],
    body: JSON.stringify(draft),
  });
}

export async function deleteSkill(skillId: string): Promise<void> {
  await request<void>(`/api/skills/${encodeURIComponent(skillId)}`, {
    method: "DELETE",
    invalidatePrefixes: ["/api/skills"],
  });
}

export async function uploadSkillZip(file: File): Promise<SkillDetail> {
  const filename = encodeURIComponent(file.name);
  return request<SkillDetail>(`/api/skills/upload?filename=${filename}`, {
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: file,
    invalidatePrefixes: ["/api/skills"],
  });
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
    invalidatePrefixes: ["/api/skills"],
    body: JSON.stringify({ content }),
  });
}

function encodePathSegments(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
