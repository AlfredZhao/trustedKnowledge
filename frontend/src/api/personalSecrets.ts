import type { PersonalSecretDraft, PersonalSecretItem, PersonalSecretRevealField } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

export interface PersonalSecretListResponse {
  items: PersonalSecretItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PersonalSecretQuery {
  query?: string;
  limit: number;
  offset: number;
  includeTotal?: boolean;
}

export interface PersonalSecretRevealResponse {
  field: PersonalSecretRevealField;
  value?: string | null;
  values?: Record<string, string | null> | null;
}

export async function fetchPersonalSecrets(query: PersonalSecretQuery): Promise<PersonalSecretListResponse> {
  return request<PersonalSecretListResponse>(buildPersonalSecretsPath(query));
}

export function readCachedPersonalSecrets(query: PersonalSecretQuery): PersonalSecretListResponse | null {
  return readCachedGet<PersonalSecretListResponse>(buildPersonalSecretsPath(query), 15 * 60 * 1000);
}

export async function getPersonalSecret(id: number): Promise<PersonalSecretItem> {
  return request<PersonalSecretItem>(`/api/personal-secrets/${id}`);
}

export async function createPersonalSecret(draft: PersonalSecretDraft): Promise<PersonalSecretItem> {
  return request<PersonalSecretItem>("/api/personal-secrets", {
    method: "POST",
    invalidatePrefixes: ["/api/personal-secrets"],
    body: JSON.stringify(toPayload(draft)),
  });
}

export async function updatePersonalSecret(id: number, draft: PersonalSecretDraft): Promise<PersonalSecretItem> {
  return request<PersonalSecretItem>(`/api/personal-secrets/${id}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/personal-secrets"],
    body: JSON.stringify(toPayload(draft)),
  });
}

export async function deletePersonalSecret(id: number): Promise<void> {
  return request<void>(`/api/personal-secrets/${id}`, {
    method: "DELETE",
    invalidatePrefixes: ["/api/personal-secrets"],
  });
}

export async function revealPersonalSecret(id: number, field: PersonalSecretRevealField): Promise<PersonalSecretRevealResponse> {
  return request<PersonalSecretRevealResponse>(`/api/personal-secrets/${id}/reveal`, {
    method: "POST",
    body: JSON.stringify({ field }),
  });
}

function buildPersonalSecretsPath(query: PersonalSecretQuery): string {
  return `/api/personal-secrets${buildQuery({
    limit: String(query.limit),
    offset: String(query.offset),
    q: query.query,
    include_total: query.includeTotal === false ? false : undefined,
  })}`;
}

function toPayload(draft: PersonalSecretDraft) {
  return {
    system_name: draft.system_name,
    login_url: draft.login_url || null,
    username: draft.username || null,
    password: draft.password || null,
    notes: draft.notes || null,
    tags: draft.tags || null,
  };
}
