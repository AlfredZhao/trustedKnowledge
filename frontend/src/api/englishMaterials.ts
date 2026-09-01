import type { EnglishMaterialCompletionJobSnapshot, EnglishMaterialCompletionResult, EnglishMaterialDraft, EnglishMaterialGenerationResult, EnglishMaterialItem } from "../types";
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
  vectorStatus?: "all" | "0" | "1";
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
    v_needs_update: query.vectorStatus && query.vectorStatus !== "all" ? query.vectorStatus : undefined,
    include_total: query.includeTotal === false ? false : undefined,
  })}`;
}

export async function getEnglishMaterial(id: number): Promise<EnglishMaterialItem> {
  return request<EnglishMaterialItem>(`/api/english-materials/${id}`);
}

export function readCachedEnglishMaterial(id: number): EnglishMaterialItem | null {
  return readCachedGet<EnglishMaterialItem>(`/api/english-materials/${id}`);
}

export async function refreshEnglishMaterialVectors(): Promise<void> {
  return request<void>("/api/english-materials/refresh-vectors", {
    method: "POST",
    invalidatePrefixes: ["/api/english-materials"],
  });
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

export async function generateEnglishMaterial({
  topicMode,
  topic,
  skillIds,
  executionProvider,
  modelName,
}: {
  topicMode: "trend" | "truth" | "motivation" | "workplace" | "custom";
  topic: string;
  skillIds: string[];
  executionProvider: "codex" | "history_ask_llm";
  modelName: string;
}): Promise<EnglishMaterialGenerationResult> {
  return request<EnglishMaterialGenerationResult>("/api/english-materials/generate", {
    method: "POST",
    body: JSON.stringify({
      topic_mode: topicMode,
      topic: topic.trim() || null,
      skill_ids: skillIds,
      execution_provider: executionProvider,
      model_name: modelName,
    }),
  });
}

export async function completeEnglishMaterial({
  fullScript,
  skillIds,
  executionProvider,
  modelName,
}: {
  fullScript: string;
  skillIds: string[];
  executionProvider: "codex" | "history_ask_llm";
  modelName: string;
}): Promise<EnglishMaterialCompletionResult> {
  return request<EnglishMaterialCompletionResult>("/api/english-materials/complete", {
    method: "POST",
    body: JSON.stringify({
      full_script: fullScript,
      skill_ids: skillIds,
      execution_provider: executionProvider,
      model_name: modelName,
    }),
  });
}

export async function startEnglishMaterialCompletionJob({
  fullScript,
  skillIds,
  executionProvider,
  modelName,
}: {
  fullScript: string;
  skillIds: string[];
  executionProvider: "codex" | "history_ask_llm";
  modelName: string;
}): Promise<EnglishMaterialCompletionJobSnapshot> {
  return request<EnglishMaterialCompletionJobSnapshot>("/api/english-materials/complete/jobs", {
    method: "POST",
    timeoutMs: 10000,
    timeoutErrorMessage: "创建 AI 补全任务超时，请稍后重试。",
    body: JSON.stringify({
      full_script: fullScript,
      skill_ids: skillIds,
      execution_provider: executionProvider,
      model_name: modelName,
    }),
  });
}

export async function getEnglishMaterialCompletionJob(jobId: string): Promise<EnglishMaterialCompletionJobSnapshot> {
  return request<EnglishMaterialCompletionJobSnapshot>(`/api/english-materials/complete/jobs/${encodeURIComponent(jobId)}`, {
    timeoutMs: 10000,
    timeoutErrorMessage: "读取 AI 补全任务状态超时，请稍后重试。",
  });
}

export async function cancelEnglishMaterialCompletionJob(jobId: string): Promise<EnglishMaterialCompletionJobSnapshot> {
  return request<EnglishMaterialCompletionJobSnapshot>(`/api/english-materials/complete/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
    timeoutMs: 10000,
    timeoutErrorMessage: "取消 AI 补全超时；任务可能仍在运行，请重新打开补全窗口确认。",
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
