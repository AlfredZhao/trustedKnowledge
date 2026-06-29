import type {
  BlogFactoryPublishResult,
  BlogFactoryItem,
  CurrentDay,
  BlogFactoryStatus,
  BlogPublishConfig,
  BlogPublishValidationResult,
  CurrentRecordItem,
  CurrentWeek,
  KnowledgeDraft,
  KnowledgeItem,
  KnowledgeStatus,
  TodoDraft,
  TodoItem,
  TodoStatus,
} from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";
import { buildApiCacheKey, readCachedApiResponse, writeCachedApiResponse } from "./localCache";

export interface KnowledgeListResponse {
  items: KnowledgeItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface BlogFactoryListResponse {
  items: BlogFactoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface BlogPublishConfigListResponse {
  items: BlogPublishConfig[];
  total: number;
}

export interface TodoListResponse {
  items: TodoItem[];
  total: number;
  limit: number;
  offset: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = readStoredApiKey();
  const method = options?.method ?? "GET";
  const cacheKey = method === "GET" ? buildApiCacheKey(path, apiKey) : null;
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

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  if (cacheKey) writeCachedApiResponse(cacheKey, data);
  return data;
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

export async function fetchKnowledge({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
}): Promise<KnowledgeListResponse> {
  return request<KnowledgeListResponse>(buildKnowledgeListPath({ query, username, limit, offset, status }));
}

export function readCachedKnowledge({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
}): KnowledgeListResponse | null {
  return readCachedApiResponse<KnowledgeListResponse>(
    buildApiCacheKey(buildKnowledgeListPath({ query, username, limit, offset, status }), readStoredApiKey()),
  );
}

function buildKnowledgeListPath({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (query?.trim()) {
    params.set("q", query.trim());
  }
  if (username?.trim()) {
    params.set("username", username.trim());
  }
  if (status) {
    params.set("status", status);
  }

  return `/api/knowledge?${params.toString()}`;
}

export async function createKnowledge(draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>("/api/knowledge", {
    method: "POST",
    body: JSON.stringify({
      question: draft.question,
      answer: draft.answer,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      blog_status: draft.blog_status,
    }),
  });
}

export async function getKnowledge(id: number): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/knowledge/${id}`);
}

export async function updateKnowledge(id: number, draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/knowledge/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      question: draft.question,
      answer: draft.answer,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      blog_status: draft.blog_status,
    }),
  });
}

export async function deleteKnowledge(id: number): Promise<void> {
  await request<void>(`/api/knowledge/${id}`, {
    method: "DELETE",
  });
}

export async function convertKnowledgeToTodo(id: number): Promise<TodoItem> {
  return request<TodoItem>(`/api/knowledge/${id}/convert-to-todo`, {
    method: "POST",
  });
}

export async function convertTodoToKnowledge(id: number): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/todos/${id}/convert-to-knowledge`, {
    method: "POST",
  });
}

export async function mergeKnowledge(knowledgeIds: number[], draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>("/api/knowledge/merge", {
    method: "POST",
    body: JSON.stringify({
      knowledge_ids: knowledgeIds,
      question: draft.question,
      answer: draft.answer,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      blog_status: draft.blog_status,
    }),
  });
}

export async function fetchTodos({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
}): Promise<TodoListResponse> {
  return request<TodoListResponse>(buildTodoListPath({ query, username, limit, offset, status }));
}

export function readCachedTodos({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
}): TodoListResponse | null {
  return readCachedApiResponse<TodoListResponse>(
    buildApiCacheKey(buildTodoListPath({ query, username, limit, offset, status }), readStoredApiKey()),
  );
}

function buildTodoListPath({
  query,
  username,
  limit,
  offset,
  status,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (query?.trim()) params.set("q", query.trim());
  if (username?.trim()) params.set("username", username.trim());
  if (status) params.set("status", status);

  return `/api/todos?${params.toString()}`;
}

export async function createTodo(draft: TodoDraft): Promise<TodoItem> {
  return request<TodoItem>("/api/todos", {
    method: "POST",
    body: JSON.stringify({
      title: draft.title,
      content: draft.content,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      todo_status: draft.todo_status,
    }),
  });
}

export async function getTodo(id: number): Promise<TodoItem> {
  return request<TodoItem>(`/api/todos/${id}`);
}

export async function updateTodo(id: number, draft: TodoDraft): Promise<TodoItem> {
  return request<TodoItem>(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: draft.title,
      content: draft.content,
      source: draft.source || null,
      topic_tag: draft.topic_tag || null,
      todo_status: draft.todo_status,
    }),
  });
}

export async function appendTodoToCurrent({
  id,
  username,
  type,
  week,
  day,
  replaceExistingContent,
}: {
  id: number;
  username: string;
  type: string;
  week: CurrentWeek;
  day: CurrentDay;
  replaceExistingContent: boolean;
}): Promise<CurrentRecordItem> {
  return request<CurrentRecordItem>(`/api/todos/${id}/append-to-current`, {
    method: "POST",
    body: JSON.stringify({ username, type, week, day, replace_existing_content: replaceExistingContent }),
  });
}

export async function createBlogFactoryItem({
  knowledgeId,
  taskContent,
}: {
  knowledgeId: number;
  taskContent: string;
}): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>("/api/blog-factory", {
    method: "POST",
    body: JSON.stringify({
      knowledge_id: knowledgeId,
      task_content: taskContent,
    }),
  });
}

export async function fetchBlogFactoryItems({
  query,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  sortBy,
  sortDir,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): Promise<BlogFactoryListResponse> {
  return request<BlogFactoryListResponse>(
    buildBlogFactoryListPath({ query, username, limit, offset, factoryStatus, topic, knowledgeId, sortBy, sortDir }),
  );
}

export function readCachedBlogFactoryItems({
  query,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  sortBy,
  sortDir,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): BlogFactoryListResponse | null {
  return readCachedApiResponse<BlogFactoryListResponse>(
    buildApiCacheKey(
      buildBlogFactoryListPath({ query, username, limit, offset, factoryStatus, topic, knowledgeId, sortBy, sortDir }),
      readStoredApiKey(),
    ),
  );
}

function buildBlogFactoryListPath({
  query,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  sortBy,
  sortDir,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort_by: sortBy ?? "copied_at",
    sort_dir: sortDir ?? "desc",
  });

  if (query?.trim()) params.set("q", query.trim());
  if (username?.trim()) params.set("username", username.trim());
  if (factoryStatus) params.set("factory_status", factoryStatus);
  if (topic?.trim()) params.set("topic", topic.trim());
  if (knowledgeId?.trim()) params.set("knowledge_id", knowledgeId.trim());

  return `/api/blog-factory?${params.toString()}`;
}

export async function getBlogFactoryItem(id: number): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}`);
}

export async function updateBlogFactoryStatus(id: number, factoryStatus: BlogFactoryStatus): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      factory_status: factoryStatus,
    }),
  });
}

export async function updateBlogFactoryContentStatus(id: number, blogStatus: KnowledgeStatus): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}/content-status`, {
    method: "PATCH",
    body: JSON.stringify({
      blog_status: blogStatus,
    }),
  });
}

export async function updateBlogFactoryItem({
  id,
  taskContent,
  questionSnapshot,
  answerSnapshot,
  sourceSnapshot,
  topicTagSnapshot,
}: {
  id: number;
  taskContent: string;
  questionSnapshot: string;
  answerSnapshot: string;
  sourceSnapshot: string;
  topicTagSnapshot: string;
}): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      task_content: taskContent,
      question_snapshot: questionSnapshot,
      answer_snapshot: answerSnapshot,
      source_snapshot: sourceSnapshot || null,
      topic_tag_snapshot: topicTagSnapshot || null,
    }),
  });
}

export async function updateBlogFactoryArticle({
  id,
  articleMarkdown,
  articleFilePath,
}: {
  id: number;
  articleMarkdown: string;
  articleFilePath?: string;
}): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}/article`, {
    method: "PATCH",
    body: JSON.stringify({
      article_markdown: articleMarkdown,
      article_file_path: articleFilePath || null,
    }),
  });
}

export async function deleteBlogFactoryItem(id: number): Promise<void> {
  await request<void>(`/api/blog-factory/${id}`, {
    method: "DELETE",
  });
}

export async function fetchBlogPublishConfigs(): Promise<BlogPublishConfigListResponse> {
  return request<BlogPublishConfigListResponse>("/api/blog-factory/publish-configs");
}

export async function createBlogPublishConfig({
  blogType,
  blogUrl,
  username,
  password,
  apiUrl,
  blogName,
  isDefault,
}: {
  blogType: "METAWEBLOG_API";
  blogUrl: string;
  username: string;
  password: string;
  apiUrl: string;
  blogName?: string;
  isDefault?: boolean;
}): Promise<BlogPublishConfig> {
  return request<BlogPublishConfig>("/api/blog-factory/publish-configs", {
    method: "POST",
    body: JSON.stringify({
      blog_type: blogType,
      blog_url: blogUrl,
      username,
      password,
      api_url: apiUrl,
      blog_name: blogName || null,
      is_default: Boolean(isDefault),
    }),
  });
}

export async function updateBlogPublishConfig({
  id,
  blogType,
  blogUrl,
  username,
  password,
  apiUrl,
  blogName,
  isDefault,
}: {
  id: number;
  blogType?: "METAWEBLOG_API";
  blogUrl?: string;
  username?: string;
  password?: string;
  apiUrl?: string;
  blogName?: string;
  isDefault?: boolean;
}): Promise<BlogPublishConfig> {
  return request<BlogPublishConfig>(`/api/blog-factory/publish-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(blogType ? { blog_type: blogType } : {}),
      ...(blogUrl !== undefined ? { blog_url: blogUrl } : {}),
      ...(username !== undefined ? { username } : {}),
      ...(password !== undefined ? { password: password || null } : {}),
      ...(apiUrl !== undefined ? { api_url: apiUrl } : {}),
      ...(blogName !== undefined ? { blog_name: blogName || null } : {}),
      ...(isDefault !== undefined ? { is_default: isDefault } : {}),
    }),
  });
}

export async function deleteBlogPublishConfig(id: number): Promise<void> {
  await request<void>(`/api/blog-factory/publish-configs/${id}`, {
    method: "DELETE",
  });
}

export async function validateBlogPublishConfig({
  blogType,
  blogUrl,
  username,
  password,
  apiUrl,
  blogName,
}: {
  blogType: "METAWEBLOG_API";
  blogUrl: string;
  username: string;
  password: string;
  apiUrl: string;
  blogName?: string;
}): Promise<BlogPublishValidationResult> {
  return request<BlogPublishValidationResult>("/api/blog-factory/publish-configs/validate", {
    method: "POST",
    body: JSON.stringify({
      blog_type: blogType,
      blog_url: blogUrl,
      username,
      password,
      api_url: apiUrl,
      blog_name: blogName || null,
    }),
  });
}

export async function publishBlogFactoryArticle({
  id,
  configId,
  articleMarkdown,
  articleTitle,
  tags,
  publish,
}: {
  id: number;
  configId?: number;
  articleMarkdown: string;
  articleTitle?: string;
  tags?: string[];
  publish: boolean;
}): Promise<BlogFactoryPublishResult> {
  return request<BlogFactoryPublishResult>(`/api/blog-factory/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({
      config_id: configId ?? null,
      article_markdown: articleMarkdown,
      article_title: articleTitle || null,
      tags: tags ?? [],
      publish,
    }),
  });
}
