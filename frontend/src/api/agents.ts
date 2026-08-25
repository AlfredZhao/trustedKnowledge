import { request } from "./client";

export interface CapabilityAgent {
  code: string;
  name: string;
  module_label: string;
  allow_personal_skills: boolean;
  system_skill_ids: string[];
  default_skill_ids: string[];
  personal_skill_ids: string[];
  personal_default_skill_ids: string[];
  can_manage: boolean;
}

export function fetchCapabilityAgents() {
  return request<{ items: CapabilityAgent[] }>("/api/agents");
}

export function updateCapabilityAgent(code: string, value: Pick<CapabilityAgent, "system_skill_ids" | "default_skill_ids" | "allow_personal_skills">) {
  return request<CapabilityAgent>(`/api/agents/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(value), invalidatePrefixes: ["/api/agents", "/api/skills"] });
}

export function updateMyAgentSkills(code: string, skillIds: string[], defaultSkillIds: string[]) {
  return request<{ skill_ids: string[]; default_skill_ids: string[] }>(`/api/agents/${encodeURIComponent(code)}/my-skills`, { method: "PUT", body: JSON.stringify({ skill_ids: skillIds, default_skill_ids: defaultSkillIds }), invalidatePrefixes: ["/api/agents", "/api/skills"] });
}
