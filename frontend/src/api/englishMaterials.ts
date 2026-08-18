import type { EnglishMaterialDraft, EnglishMaterialItem } from "../types";
import { buildQuery, readCachedGet, request } from "./client";

export interface EnglishMaterialListResponse {
  items: EnglishMaterialItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface EnglishMaterialQuery {
  query?: string;
  semanticQuery?: string;
  username?: string;
  category?: string;
  flag?: string;
  sortBy?: "id" | "sequence_no" | "category" | "base_expression" | "title" | "flag";
  sortDir?: "asc" | "desc";
  limit: number;
  offset: number;
  includeTotal?: boolean;
}

export async function fetchEnglishMaterials(query: EnglishMaterialQuery): Promise<EnglishMaterialListResponse> {
  return request<EnglishMaterialListResponse>(buildEnglishMaterialsPath(query));
}

export async function fetchNextEnglishMaterialSequence({
  username,
}: {
  username?: string;
} = {}): Promise<number> {
  const data = await fetchEnglishMaterials({
    username,
    sortBy: "sequence_no",
    sortDir: "desc",
    limit: 1,
    offset: 0,
  });
  const maxSequence = data.items[0]?.sequence_no;
  return (typeof maxSequence === "number" && Number.isFinite(maxSequence) ? maxSequence : 0) + 1;
}

export function readCachedEnglishMaterials(query: EnglishMaterialQuery): EnglishMaterialListResponse | null {
  return readCachedGet<EnglishMaterialListResponse>(buildEnglishMaterialsPath(query));
}

function buildEnglishMaterialsPath(query: EnglishMaterialQuery): string {
  return `/api/english-materials${buildQuery({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy ?? "id",
    sort_dir: query.sortDir ?? "desc",
    q: query.query,
    semantic_query: query.semanticQuery,
    username: query.username,
    category: query.category,
    flag: query.flag,
    include_total: query.includeTotal === false ? false : undefined,
  })}`;
}

export async function getEnglishMaterial(id: number): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>(`/api/english-materials/${id}`);
}

export async function createEnglishMaterial(draft: EnglishMaterialDraft): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>("/api/english-materials", {
    method: "POST",
    invalidatePrefixes: ["/api/english-materials"],
    body: JSON.stringify({
      sequence_no: draft.sequence_no.trim() ? Number(draft.sequence_no) : null,
      category: draft.category || null,
      base_expression: draft.base_expression,
      professional_sentence: draft.professional_sentence || null,
      chinese_translation: draft.chinese_translation || null,
      full_script: draft.full_script || null,
      title: draft.title || null,
      flag: Number(draft.flag),
    }),
  });
}

export async function updateEnglishMaterial(id: number, draft: EnglishMaterialDraft): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>(`/api/english-materials/${id}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/english-materials"],
    body: JSON.stringify({
      sequence_no: draft.sequence_no.trim() ? Number(draft.sequence_no) : null,
      category: draft.category || null,
      base_expression: draft.base_expression,
      professional_sentence: draft.professional_sentence || null,
      chinese_translation: draft.chinese_translation || null,
      full_script: draft.full_script || null,
      title: draft.title || null,
      flag: Number(draft.flag),
    }),
  });
}
