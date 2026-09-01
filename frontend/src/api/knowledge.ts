import type {
  BlogPublishCategory,
  BlogFactoryPublishResult,
  BlogFactoryReviewResult,
  BlogFactorySendToProcessingResult,
  BlogFactoryItem,
  BlogPublishSubmissionOption,
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
import { buildQuery, readCachedGet, request } from "./client";

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

export interface BlogPublishCategoryListResponse {
  items: BlogPublishCategory[];
  total: number;
}

export interface TodoListResponse {
  items: TodoItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchKnowledge({
  query,
  username,
  limit,
  offset,
  status,
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
  includeTotal?: boolean;
}): Promise<KnowledgeListResponse> {
  return request<KnowledgeListResponse>(buildKnowledgeListPath({ query, username, limit, offset, status, includeTotal }));
}

export function readCachedKnowledge({
  query,
  username,
  limit,
  offset,
  status,
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
  includeTotal?: boolean;
}): KnowledgeListResponse | null {
  return readCachedGet<KnowledgeListResponse>(buildKnowledgeListPath({ query, username, limit, offset, status, includeTotal }));
}

function buildKnowledgeListPath({
  query,
  username,
  limit,
  offset,
  status,
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: KnowledgeStatus;
  includeTotal?: boolean;
}): string {
  return `/api/knowledge${buildQuery({
    limit: String(limit),
    offset: String(offset),
    q: query,
    username,
    status,
    include_total: includeTotal ? undefined : false,
  })}`;
}

export async function createKnowledge(draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>("/api/knowledge", {
    method: "POST",
    invalidatePrefixes: ["/api/knowledge"],
    timeoutMs: 15000,
    timeoutErrorMessage: "可信知识保存超过 15 秒未响应，保存结果可能未知。请刷新确认后再重试。",
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
    invalidatePrefixes: ["/api/knowledge"],
    timeoutMs: 15000,
    timeoutErrorMessage: "可信知识保存超过 15 秒未响应，保存结果可能未知。请刷新确认后再重试。",
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
    invalidatePrefixes: ["/api/knowledge"],
  });
}

export async function convertKnowledgeToTodo(id: number): Promise<TodoItem> {
  return request<TodoItem>(`/api/knowledge/${id}/convert-to-todo`, {
    method: "POST",
    invalidatePrefixes: ["/api/knowledge", "/api/todos"],
  });
}

export async function convertTodoToKnowledge(id: number): Promise<KnowledgeItem> {
  return request<KnowledgeItem>(`/api/todos/${id}/convert-to-knowledge`, {
    method: "POST",
    invalidatePrefixes: ["/api/todos", "/api/knowledge"],
  });
}

export async function mergeKnowledge(knowledgeIds: number[], draft: KnowledgeDraft): Promise<KnowledgeItem> {
  return request<KnowledgeItem>("/api/knowledge/merge", {
    method: "POST",
    invalidatePrefixes: ["/api/knowledge", "/api/blog-factory"],
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
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
  includeTotal?: boolean;
}): Promise<TodoListResponse> {
  return request<TodoListResponse>(buildTodoListPath({ query, username, limit, offset, status, includeTotal }));
}

export function readCachedTodos({
  query,
  username,
  limit,
  offset,
  status,
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
  includeTotal?: boolean;
}): TodoListResponse | null {
  return readCachedGet<TodoListResponse>(buildTodoListPath({ query, username, limit, offset, status, includeTotal }));
}

function buildTodoListPath({
  query,
  username,
  limit,
  offset,
  status,
  includeTotal = true,
}: {
  query?: string;
  username?: string;
  limit: number;
  offset: number;
  status?: TodoStatus;
  includeTotal?: boolean;
}): string {
  return `/api/todos${buildQuery({
    limit: String(limit),
    offset: String(offset),
    q: query,
    username,
    status,
    include_total: includeTotal ? undefined : false,
  })}`;
}

export async function createTodo(draft: TodoDraft): Promise<TodoItem> {
  return request<TodoItem>("/api/todos", {
    method: "POST",
    invalidatePrefixes: ["/api/todos"],
    timeoutMs: 15000,
    timeoutErrorMessage: "待办事项创建请求超过 15 秒未响应，请确认后端服务可用后重试。",
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
    invalidatePrefixes: ["/api/todos"],
    retryOnNetworkError: true,
    networkErrorMessage: "待办事项保存请求未连接到后端，请检查网络连接或刷新页面后重试。",
    timeoutMs: 15000,
    timeoutErrorMessage: "待办事项保存请求超过 15 秒未响应，请确认后端服务可用后重试。",
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
    invalidatePrefixes: ["/api/todos", "/api/current-records"],
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
    invalidatePrefixes: ["/api/blog-factory", "/api/knowledge"],
    body: JSON.stringify({
      knowledge_id: knowledgeId,
      task_content: taskContent,
    }),
  });
}

export async function fetchBlogFactoryItems({
  query,
  semanticQuery,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  vectorStatus,
  sortBy,
  sortDir,
}: {
  query?: string;
  semanticQuery?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  vectorStatus?: "all" | "0" | "1";
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): Promise<BlogFactoryListResponse> {
  return request<BlogFactoryListResponse>(
    buildBlogFactoryListPath({ query, semanticQuery, username, limit, offset, factoryStatus, topic, knowledgeId, vectorStatus, sortBy, sortDir }),
  );
}

export function readCachedBlogFactoryItems({
  query,
  semanticQuery,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  vectorStatus,
  sortBy,
  sortDir,
}: {
  query?: string;
  semanticQuery?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  vectorStatus?: "all" | "0" | "1";
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): BlogFactoryListResponse | null {
  return readCachedGet<BlogFactoryListResponse>(
    buildBlogFactoryListPath({ query, semanticQuery, username, limit, offset, factoryStatus, topic, knowledgeId, vectorStatus, sortBy, sortDir }),
  );
}

function buildBlogFactoryListPath({
  query,
  semanticQuery,
  username,
  limit,
  offset,
  factoryStatus,
  topic,
  knowledgeId,
  vectorStatus,
  sortBy,
  sortDir,
}: {
  query?: string;
  semanticQuery?: string;
  username?: string;
  limit: number;
  offset: number;
  factoryStatus?: BlogFactoryStatus;
  topic?: string;
  knowledgeId?: string;
  vectorStatus?: "all" | "0" | "1";
  sortBy?: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir?: "asc" | "desc";
}): string {
  return `/api/blog-factory${buildQuery({
    limit: String(limit),
    offset: String(offset),
    sort_by: sortBy ?? "copied_at",
    sort_dir: sortDir ?? "desc",
    q: query,
    semantic_query: semanticQuery,
    username,
    factory_status: factoryStatus,
    topic,
    knowledge_id: knowledgeId,
    v_needs_update: vectorStatus && vectorStatus !== "all" ? vectorStatus : undefined,
  })}`;
}

export async function getBlogFactoryItem(id: number): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}`);
}

export async function refreshBlogFactoryVectors(): Promise<void> {
  return request<void>("/api/blog-factory/refresh-vectors", {
    method: "POST",
    invalidatePrefixes: ["/api/blog-factory"],
  });
}

export async function updateBlogFactoryStatus(id: number, factoryStatus: BlogFactoryStatus): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}/status`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/blog-factory"],
    body: JSON.stringify({
      factory_status: factoryStatus,
    }),
  });
}

export async function updateBlogFactoryContentStatus(id: number, blogStatus: KnowledgeStatus): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}/content-status`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/blog-factory", "/api/knowledge"],
    body: JSON.stringify({
      blog_status: blogStatus,
    }),
  });
}

export async function sendBlogFactoryItemToProcessing({
  id,
  taskContent,
  questionSnapshot,
  sourceSnapshot,
  topicTagSnapshot,
}: {
  id: number;
  taskContent: string;
  questionSnapshot?: string;
  sourceSnapshot?: string;
  topicTagSnapshot?: string;
}): Promise<BlogFactorySendToProcessingResult> {
  return request<BlogFactorySendToProcessingResult>(`/api/blog-factory/${id}/send-to-processing`, {
    method: "POST",
    invalidatePrefixes: ["/api/blog-factory", "/api/knowledge"],
    body: JSON.stringify({
      task_content: taskContent,
      question_snapshot: questionSnapshot || null,
      source_snapshot: sourceSnapshot || null,
      topic_tag_snapshot: topicTagSnapshot || null,
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
  assistSummary,
  coverImageMarkdown,
  coverPromptSnapshot,
}: {
  id: number;
  taskContent: string;
  questionSnapshot: string;
  answerSnapshot: string;
  sourceSnapshot: string;
  topicTagSnapshot: string;
  assistSummary: string;
  coverImageMarkdown: string;
  coverPromptSnapshot: string;
}): Promise<BlogFactoryItem> {
  return request<BlogFactoryItem>(`/api/blog-factory/${id}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/blog-factory"],
    body: JSON.stringify({
      task_content: taskContent,
      question_snapshot: questionSnapshot,
      answer_snapshot: answerSnapshot,
      source_snapshot: sourceSnapshot || null,
      topic_tag_snapshot: topicTagSnapshot || null,
      assist_summary: assistSummary || null,
      cover_image_markdown: coverImageMarkdown || null,
      cover_prompt_snapshot: coverPromptSnapshot || null,
    }),
  });
}

export async function reviewBlogFactoryContent({
  taskContent,
  questionSnapshot,
  answerSnapshot,
  skillIds,
  executionProvider,
  modelName,
}: {
  taskContent: string;
  questionSnapshot?: string;
  answerSnapshot?: string;
  skillIds: string[];
  executionProvider: "codex" | "history_ask_llm";
  modelName: string;
}): Promise<BlogFactoryReviewResult> {
  return request<BlogFactoryReviewResult>("/api/blog-factory/review", {
    method: "POST",
    body: JSON.stringify({
      task_content: taskContent,
      question_snapshot: questionSnapshot || null,
      answer_snapshot: answerSnapshot || null,
      skill_ids: skillIds,
      execution_provider: executionProvider,
      model_name: modelName,
    }),
  });
}

export async function enhanceBlogFactoryContent({
  taskContent,
  questionSnapshot,
  answerSnapshot,
  skillIds,
  executionProvider,
  modelName,
}: {
  taskContent: string;
  questionSnapshot?: string;
  answerSnapshot?: string;
  skillIds: string[];
  executionProvider: "codex" | "history_ask_llm";
  modelName: string;
}): Promise<{ content: string }> {
  return request<{ content: string }>("/api/blog-factory/enhance", {
    method: "POST",
    body: JSON.stringify({
      task_content: taskContent,
      question_snapshot: questionSnapshot || null,
      answer_snapshot: answerSnapshot || null,
      skill_ids: skillIds,
      execution_provider: executionProvider,
      model_name: modelName,
    }),
  });
}

export async function updateBlogFactoryAssistMetadata({
  id,
  assistSummary,
  coverImageMarkdown,
  coverPromptSnapshot,
}: {
  id: number;
  assistSummary?: string;
  coverImageMarkdown?: string;
  coverPromptSnapshot?: string;
}): Promise<BlogFactoryItem> {
  const body: Record<string, string | null> = {};
  if (assistSummary !== undefined) body.assist_summary = assistSummary || null;
  if (coverImageMarkdown !== undefined) body.cover_image_markdown = coverImageMarkdown || null;
  if (coverPromptSnapshot !== undefined) body.cover_prompt_snapshot = coverPromptSnapshot || null;

  return request<BlogFactoryItem>(`/api/blog-factory/${id}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/blog-factory"],
    body: JSON.stringify(body),
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
    invalidatePrefixes: ["/api/blog-factory"],
    body: JSON.stringify({
      article_markdown: articleMarkdown,
      article_file_path: articleFilePath || null,
    }),
  });
}

export async function deleteBlogFactoryItem(id: number): Promise<void> {
  await request<void>(`/api/blog-factory/${id}`, {
    method: "DELETE",
    invalidatePrefixes: ["/api/blog-factory"],
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
    invalidatePrefixes: ["/api/blog-factory/publish-configs", "/api/blog-factory"],
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
    invalidatePrefixes: ["/api/blog-factory/publish-configs", "/api/blog-factory"],
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
    invalidatePrefixes: ["/api/blog-factory/publish-configs", "/api/blog-factory"],
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

export async function fetchBlogPublishCategories(configId: number): Promise<BlogPublishCategoryListResponse> {
  return request<BlogPublishCategoryListResponse>(`/api/blog-factory/publish-configs/${configId}/categories`);
}

export function readCachedBlogPublishCategories(configId: number): BlogPublishCategoryListResponse | null {
  return readCachedGet<BlogPublishCategoryListResponse>(`/api/blog-factory/publish-configs/${configId}/categories`, 10 * 60 * 1000);
}

export async function publishBlogFactoryArticle({
  id,
  configId,
  articleMarkdown,
  articleTitle,
  categories,
  tags,
  submissionOption,
  publish,
}: {
  id: number;
  configId?: number;
  articleMarkdown: string;
  articleTitle?: string;
  categories?: string[];
  tags?: string[];
  submissionOption?: BlogPublishSubmissionOption;
  publish: boolean;
}): Promise<BlogFactoryPublishResult> {
  return request<BlogFactoryPublishResult>(`/api/blog-factory/${id}/publish`, {
    method: "POST",
    invalidatePrefixes: ["/api/blog-factory", "/api/knowledge"],
    body: JSON.stringify({
      config_id: configId ?? null,
      article_markdown: articleMarkdown,
      article_title: articleTitle || null,
      categories: categories ?? [],
      tags: tags ?? [],
      submission_option: submissionOption ?? "CNBLOGS_HOME",
      publish,
    }),
  });
}
