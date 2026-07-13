import { checkBackendHealth } from "../api/system";
import {
  APP_VIEWS,
  BLOG_FACTORY_SORT_FIELDS,
  ENGLISH_MATERIAL_SORT_FIELDS,
  CURRENT_RECORD_SORT_FIELDS,
  HISTORY_SORT_FIELDS,
  SORT_DIRECTIONS,
  type BlogFactorySortBy,
  type CurrentRecordSortBy,
  type EnglishMaterialSortBy,
  type HistorySortBy,
  type HistoryVectorStatus,
  type SortDirection,
} from "../uiConfig";
import type {
  AppView,
  BlogFactoryItem,
  BlogFactoryStatus,
  BlogPublishCategory,
  BlogPublishConfig,
  BlogPublishType,
  BlogPublishValidationResult,
  CodexJobSnapshot,
  CodexRunResponse,
  CurrentDay,
  CurrentRecordOptions,
  CurrentWeek,
  EnglishMaterialDraft,
  EnglishMaterialItem,
  GithubSyncResponse,
  HistoryAskResponse,
  KnowledgeDraft,
  KnowledgeItem,
  KnowledgeStatus,
  LlmUsageSample,
  TodoDraft,
  TodoItem,
  TodoStatus,
} from "../types";
import { removeLeakedMarkdownCodePlaceholders } from "./markdown";

const RESET_READY_DELAY_MS = 60 * 60 * 1000;
export const NEW_KNOWLEDGE_DRAFT_STORAGE_KEY = "trustedKnowledge.newDraft";
const UI_STATE_STORAGE_KEY = "trustedKnowledge.uiState.v1";
export type AiCodingNoticeStatus = "running" | "completed" | "failed";
export type ThemeMode = "dark" | "light";
export type MarkdownContentView = "rendered" | "raw";
export type BlogFactoryArticleCopyMode = "markdown" | "enhanced";
export type BlogFactoryTaskCopyMode = "rendered" | "enhanced" | "raw";
export type BlogFactoryMaskToggleKey = "maskPhone" | "maskEmail" | "maskIdCard" | "maskBankCard" | "maskUrl" | "maskIp";

export type BlogFactoryKeywordReplacement = {
  id: string;
  keyword: string;
  replacement: string;
};

export type BlogFactoryMaskRule = {
  id: string;
  name: string;
  description: string;
  keywordReplacements: BlogFactoryKeywordReplacement[];
  maskPhone: boolean;
  maskEmail: boolean;
  maskIdCard: boolean;
  maskBankCard: boolean;
  maskUrl: boolean;
  maskIp: boolean;
};

export const BLOG_FACTORY_MASK_TOGGLE_OPTIONS: Array<{
  key: BlogFactoryMaskToggleKey;
  label: string;
  description: string;
}> = [
  { key: "maskPhone", label: "手机号", description: "保留前三后四位" },
  { key: "maskEmail", label: "邮箱", description: "保留邮箱结构" },
  { key: "maskIdCard", label: "身份证", description: "保留前六后四位" },
  { key: "maskBankCard", label: "银行卡", description: "保留前四后四位" },
  { key: "maskUrl", label: "URL", description: "替换为统一占位符" },
  { key: "maskIp", label: "IP", description: "替换为统一占位符" },
];

export const DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE = [
  "主题：{{title}}",
  "核心意图：{{summary}}",
  "画面：C4D 立体科技封面，抽象知识工厂与内容流水线，半透明数据块、文档卡片、发光节点和结构化网格围绕核心主题聚合。",
  "构图：16:9 横向宽幅主视觉，主体居中偏左，右侧保留干净留白；同时适配 2.35:1 裁切，层次清晰，移动端缩略图仍可辨认。",
  "风格：Octane render, soft studio lighting, premium SaaS editorial cover, clean background, subtle depth of field, high detail, professional, modern.",
  "限制：不要出现可读文字、logo、水印、人物脸部或杂乱 UI 截图。",
].join("\n");

const BLOG_FACTORY_COVER_IMAGE_LINE_PATTERN = /^!\[封面图片[^\]]*]\([^)]+\)\s*$/m;

export interface StoredUiState {
  activeView: AppView;
  sidebarExpanded: boolean;
  mobileNavVisible: boolean;
  themeMode: ThemeMode;
  workbench: {
    query: string;
    username: string;
    statusFilter: KnowledgeStatus | "all";
    page: number;
    selectedId: number | null;
    draft: KnowledgeDraft | null;
  };
  factory: {
    query: string;
    username: string;
    page: number;
    selectedId: number | null;
    task: string;
    skillIds: string[];
    codexJobId: string | null;
  };
  blogFactory: {
    query: string;
    username: string;
    page: number;
    status: BlogFactoryStatus | "all";
    topic: string;
    knowledgeId: string;
    sortBy: BlogFactorySortBy;
    sortDir: SortDirection;
    selectedItemId: number | null;
    articleDraft: string;
    articlePathDraft: string;
    maskRules: BlogFactoryMaskRule[];
    selectedMaskRuleId: string | null;
    coverPromptTemplate: string;
  };
  todos: {
    query: string;
    username: string;
    page: number;
    status: TodoStatus | "all";
    selectedId: number | null;
    draft: TodoDraft | null;
  };
  currentRecords: {
    query: string;
    page: number;
    username: string;
    type: string;
    week: string;
    day: string;
    learnLevel: string;
    sortBy: CurrentRecordSortBy;
    sortDir: SortDirection;
    draft: { username: string; type: string; content: string };
  };
  englishMaterials: {
    query: string;
    username: string;
    page: number;
    category: string;
    flag: "" | "0" | "1";
    sortBy: EnglishMaterialSortBy;
    sortDir: SortDirection;
    selectedId: number | null;
    draft: EnglishMaterialDraft;
  };
  history: {
    query: string;
    page: number;
    type: string;
    username: string;
    week: string;
    day: string;
    learnLevel: string;
    vectorStatus: HistoryVectorStatus;
    dateFrom: string;
    dateTo: string;
    sortBy: HistorySortBy;
    sortDir: SortDirection;
  };
  historyAsk: {
    question: string;
    answer: HistoryAskResponse | null;
    skillIds: string[];
  };
  aiCoding: {
    prompt: string;
    modelName: string;
    messages: AiCodingMessage[];
    activeJobId: string | null;
    githubSyncStatus: GithubSyncResponse | null;
  };
}

export interface UsageChangeItem extends LlmUsageSample {
  period_start: string;
  period_end: string;
  sample_count: number;
}

export interface AiCodingMessage {
  id: number;
  jobId?: string;
  prompt: string;
  modelName?: string | null;
  status: AiCodingNoticeStatus;
  output: string;
  errorOutput: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  response: CodexRunResponse | null;
  archivedKnowledgeId?: number;
}

export interface CurrentAppendTarget {
  username: string;
  type: string;
  week: CurrentWeek | "";
  day: CurrentDay | "";
}

export type BlogFactoryEditDraft = {
  taskContent: string;
  questionSnapshot: string;
  answerSnapshot: string;
  sourceSnapshot: string;
  topicTagSnapshot: string;
};

export type BlogPublishConfigDraft = {
  blogType: BlogPublishType;
  blogUrl: string;
  username: string;
  password: string;
  apiUrl: string;
  blogName: string;
  isDefault: boolean;
  validation: BlogPublishValidationResult | null;
};

const emptyTodoDraft: TodoDraft = {
  title: "",
  content: "",
  source: "",
  topic_tag: "",
  todo_status: "待处理",
};

const emptyEnglishMaterialDraft: EnglishMaterialDraft = {
  sequence_no: "",
  category: "",
  base_expression: "",
  professional_sentence: "",
  chinese_translation: "",
  full_script: "",
  title: "",
  flag: "0",
};

function buildLocalDraftId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyBlogFactoryKeywordReplacement(): BlogFactoryKeywordReplacement {
  return {
    id: buildLocalDraftId("mask-keyword"),
    keyword: "",
    replacement: "",
  };
}

export function createEmptyBlogFactoryMaskRule(): BlogFactoryMaskRule {
  return {
    id: buildLocalDraftId("mask-rule"),
    name: "",
    description: "",
    keywordReplacements: [createEmptyBlogFactoryKeywordReplacement()],
    maskPhone: false,
    maskEmail: false,
    maskIdCard: false,
    maskBankCard: false,
    maskUrl: false,
    maskIp: false,
  };
}

export function cloneBlogFactoryMaskRule(rule: BlogFactoryMaskRule): BlogFactoryMaskRule {
  return {
    ...rule,
    keywordReplacements: rule.keywordReplacements.map((item) => ({ ...item })),
  };
}

export function normalizeBlogFactoryMaskRule(rule: BlogFactoryMaskRule): BlogFactoryMaskRule {
  const keywordReplacements = rule.keywordReplacements
    .map((item) => ({
      id: item.id || buildLocalDraftId("mask-keyword"),
      keyword: item.keyword.trim(),
      replacement: item.replacement,
    }))
    .filter((item) => item.keyword.length > 0);

  return {
    ...rule,
    id: rule.id || buildLocalDraftId("mask-rule"),
    name: rule.name.trim(),
    description: rule.description.trim(),
    keywordReplacements,
  };
}

export function resolveBlogFactoryMaskRuleId(rules: BlogFactoryMaskRule[], preferredId: string | null) {
  if (preferredId && rules.some((rule) => rule.id === preferredId)) return preferredId;
  return rules[0]?.id ?? null;
}

function countBlogFactoryMaskKeywords(rule: BlogFactoryMaskRule) {
  return rule.keywordReplacements.filter((item) => item.keyword.trim().length > 0).length;
}

export function hasEnabledBlogFactoryMaskRule(rule: BlogFactoryMaskRule) {
  return countBlogFactoryMaskKeywords(rule) > 0 || BLOG_FACTORY_MASK_TOGGLE_OPTIONS.some(({ key }) => rule[key]);
}

export function describeBlogFactoryMaskRule(rule: BlogFactoryMaskRule) {
  const parts: string[] = [];
  const keywordCount = countBlogFactoryMaskKeywords(rule);
  if (keywordCount > 0) {
    parts.push(`关键词 ${keywordCount} 项`);
  }

  BLOG_FACTORY_MASK_TOGGLE_OPTIONS.forEach(({ key, label }) => {
    if (rule[key]) parts.push(label);
  });

  return parts.length > 0 ? parts.join(" / ") : "未启用脱敏项";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskMiddle(value: string, prefixLength: number, suffixLength: number, maskChar = "*") {
  if (value.length <= prefixLength + suffixLength) {
    return maskChar.repeat(Math.max(4, value.length));
  }
  return `${value.slice(0, prefixLength)}${maskChar.repeat(value.length - prefixLength - suffixLength)}${value.slice(-suffixLength)}`;
}

function maskPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return value;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function maskEmailAddress(value: string) {
  const [localPart, domain = ""] = value.split("@");
  if (!localPart || !domain) return "[已脱敏邮箱]";
  if (localPart.length <= 2) return `${localPart[0] ?? "*"}***@${domain}`;
  return `${localPart.slice(0, 1)}***${localPart.slice(-1)}@${domain}`;
}

export function applyBlogFactoryMaskRule(content: string, rawRule: BlogFactoryMaskRule) {
  const rule = normalizeBlogFactoryMaskRule(rawRule);
  let nextContent = content;

  rule.keywordReplacements.forEach((item) => {
    nextContent = nextContent.replace(new RegExp(escapeRegExp(item.keyword), "g"), item.replacement);
  });

  if (rule.maskPhone) {
    nextContent = nextContent.replace(/(?:\+?86[- ]?)?1[3-9]\d{9}\b/g, (match) => maskPhoneNumber(match));
  }
  if (rule.maskEmail) {
    nextContent = nextContent.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (match) => maskEmailAddress(match));
  }
  if (rule.maskIdCard) {
    nextContent = nextContent.replace(/\b\d{17}[\dXx]\b|\b\d{15}\b/g, (match) => maskMiddle(match, 6, 4));
  }
  if (rule.maskBankCard) {
    nextContent = nextContent.replace(/\b\d{14,19}\b/g, (match) => maskMiddle(match, 4, 4));
  }
  if (rule.maskUrl) {
    nextContent = nextContent.replace(/\b(?:https?:\/\/|www\.)[^\s<>"'）)]+/gi, "[已脱敏链接]");
  }
  if (rule.maskIp) {
    nextContent = nextContent.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[已脱敏IP]");
  }

  return nextContent;
}

export function formatDate(value: string | null) {
  if (!value) return "created date pending";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function readOverviewRefreshError(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason;
  return "未知错误";
}

export function formatDateOnly(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatHistoryDate(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) return "未记录";
  const date = parseServerLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeOnly(value: string | null) {
  if (!value) return "--:--";
  const date = parseServerLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatResetDate(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatResetDistance(value: Date | null, action = "重置") {
  if (!value || Number.isNaN(value.getTime())) return `${action}时间未记录`;

  const diffMs = value.getTime() - Date.now();
  if (diffMs <= 0) return `已到${action}时间`;

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} 天 ${hours} 小时后${action}`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟后${action}`;
  return `${minutes} 分钟后${action}`;
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHistoryAskVectorStatus(value: number | null | undefined) {
  if (value === 1) return "待更新";
  if (value === 0) return "已就绪";
  return "";
}

export function readHistoryAskVectorStatus(value: number | null | undefined): HistoryVectorStatus {
  if (value === 1) return "1";
  if (value === 0) return "0";
  return "all";
}

export function getHistoryAskFilterEntries(filters: HistoryAskResponse["filters"]) {
  const entries: Array<{ label: string; value: string }> = [];
  const vectorStatus = formatHistoryAskVectorStatus(filters.vector_status);

  if (filters.keyword) entries.push({ label: "关键词", value: filters.keyword });
  if (filters.username) entries.push({ label: "用户", value: filters.username });
  if (filters.type) entries.push({ label: "类型", value: filters.type });
  if (filters.week) entries.push({ label: "周期", value: filters.week });
  if (filters.day) entries.push({ label: "Day", value: filters.day });
  if (filters.learn_level !== null && filters.learn_level !== undefined) {
    entries.push({ label: "等级", value: String(filters.learn_level) });
  }
  if (vectorStatus) entries.push({ label: "向量", value: vectorStatus });
  if (filters.date_from || filters.date_to) {
    entries.push({
      label: "日期",
      value: `${filters.date_from ?? "不限"} 至 ${filters.date_to ?? "不限"}`,
    });
  }

  return entries;
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function getUsagePercent(item: LlmUsageSample) {
  return clampPercent((item.used_amount / item.total_budget) * 100);
}

export function getTrendBarHeight(percent: number) {
  if (percent <= 0) return 0;
  return Math.max(4, percent);
}

function parseServerLocalDate(value: string | null) {
  if (!value) return null;
  return new Date(value.replace(" ", "T"));
}

export function parseUtcDate(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return new Date(hasTimeZone ? normalized : `${normalized}Z`);
}

export function getResetReadyAt(resetAt: Date | null) {
  if (!resetAt || Number.isNaN(resetAt.getTime())) return null;
  return new Date(resetAt.getTime() + RESET_READY_DELAY_MS);
}

export function collapseStableUsageSamples(items: LlmUsageSample[]): UsageChangeItem[] {
  return items.reduce<UsageChangeItem[]>((changes, item) => {
    const previous = changes[changes.length - 1];

    if (previous && isSameUsageSnapshot(previous, item)) {
      changes[changes.length - 1] = {
        ...item,
        period_start: previous.period_start,
        period_end: item.sample_time,
        sample_count: previous.sample_count + 1,
      };
      return changes;
    }

    changes.push({
      ...item,
      period_start: item.sample_time,
      period_end: item.sample_time,
      sample_count: 1,
    });
    return changes;
  }, []);
}

function isSameUsageSnapshot(left: LlmUsageSample, right: LlmUsageSample) {
  return (
    isSameNumber(left.used_amount, right.used_amount) &&
    isSameNumber(left.total_budget, right.total_budget) &&
    isSameNumber(left.remaining_budget, right.remaining_budget) &&
    left.budget_duration === right.budget_duration &&
    left.next_reset_at === right.next_reset_at
  );
}

function isSameNumber(left: number, right: number) {
  return Math.abs(left - right) < 0.000001;
}

export function formatUsagePeriod(item: UsageChangeItem) {
  if (item.sample_count <= 1 || item.period_start === item.period_end) return formatTimeOnly(item.sample_time);
  return `${formatTimeOnly(item.period_start)} - ${formatTimeOnly(item.period_end)}`;
}

export function maskSensitive(value: string) {
  return value.replace(/(密码|password|token|secret|密钥|账号)(\s*[:：]?\s*)\S+/gi, "$1$2••••••");
}

export function readWeChatApiKeyFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("wechat_api_key");
}

export function readWeChatErrorFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("wechat_error");
}

export function clearLocationHash() {
  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for browsers that block Clipboard API on this origin.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("copy command rejected");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export function buildFactorySkillPrompt(item: KnowledgeItem) {
  const tags = item.topic_tag?.trim() || "未标注";
  const source = item.source?.trim() || "未填写";
  const createdDate = item.created_date ? new Date(item.created_date).toISOString() : "未记录";

  return `请使用本次请求中选择的 trustedKnowledge skill，加工下面这条可信知识，并直接输出最终结果。

硬性要求：
- 这是内容加工任务，不是代码修改任务；不要编辑、创建或删除工作区文件。
- 必须优先遵循所选 skill 对输出结构、语气、长度和格式的要求。
- 只允许基于 Context 中给出的事实输出，不要补充未提供的版本、案例、数字或结论。
- 如果所选 skill 与 Context 信息不足冲突，请在结果中保守处理，不要编造。
- 如果原始素材中包含 Markdown 格式的图片链接，例如 \`![](media/path/image.jpg)\`，必须逐字原样保留，禁止删除、改写、重排链接地址或替换为其他格式。
- 不要输出任何关于读取 skill、分析任务、执行过程、处理中间步骤的说明；结果必须直接从最终正文开始。
- 只输出最终加工结果，不要输出执行过程、任务说明或额外解释。
- 不要输出 @@CODE0@@、@@CODE_0@@ 或私有 Unicode 包裹的 CODE0 这类内部占位符；如需保留命令、路径或代码片段，直接使用 Markdown 反引号。

Context：
- 知识 ID：${item.id}
- 状态：${item.blog_status}
- 来源：${source}
- 标签：${tags}
- 创建时间：${createdDate}

问题 / 主题：
${item.question}

可信答案 / 原始素材：
${item.answer}`;
}

export function normalizeFactoryTaskResult(value: string) {
  const cleaned = removeLeakedMarkdownCodePlaceholders(value);
  return rewriteFactoryBannedPhrases(stripFactoryMetaIntro(cleaned)).trim();
}

export function buildMergedKnowledgeDraft(items: KnowledgeItem[]): KnowledgeDraft {
  const titles = items.map((item) => item.question.trim()).filter(Boolean);
  const sources = compactUnique(items.map((item) => item.source?.trim() ?? ""));
  const tags = compactUnique(items.flatMap((item) => (item.topic_tag ?? "").split(",").map((tag) => tag.trim()))).filter(
    isSafeTopicTag,
  );
  const question = truncateField(`合并：${titles.join(" / ")}`, 4000);
  const answer = items
    .map((item, index) => [`## ${index + 1}. ${item.question}`, item.answer].join("\n\n"))
    .join("\n\n---\n\n");

  return {
    question,
    answer,
    source: truncateField(sources.join(", "), 200),
    topic_tag: truncateField(tags.join(","), 100),
    blog_status: "未发布",
  };
}

export function buildWeekOptions(): CurrentWeek[] {
  return Array.from({ length: 48 }, (_, index) => `W${index + 1}` as CurrentWeek);
}

export function buildDayOptions(): CurrentDay[] {
  return Array.from({ length: 7 }, (_, index) => `D${index + 1}` as CurrentDay);
}

export function normalizeCurrentRecordOptions(options: CurrentRecordOptions): CurrentRecordOptions {
  return {
    ...options,
    user_types: options.user_types ?? {},
    weeks: options.weeks.length > 0 ? options.weeks : buildWeekOptions(),
    days: options.days.length > 0 ? options.days : buildDayOptions(),
    learn_levels: options.learn_levels.length > 0 ? options.learn_levels : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  };
}

const preferredCurrentTypes = ["Work", "Study", "Life", "Info"] as const;

function resolvePreferredCurrentType(typeOptions: string[], preferredType?: string): string {
  if (preferredType && typeOptions.includes(preferredType)) {
    return preferredType;
  }

  for (const type of preferredCurrentTypes) {
    if (typeOptions.includes(type)) {
      return type;
    }
  }

  return typeOptions[0] || "";
}

export function resolveCurrentAppendTarget(options: CurrentRecordOptions, preferred?: CurrentAppendTarget): CurrentAppendTarget {
  const usersWithTypes = options.users.filter((user) => (options.user_types[user] ?? []).length > 0);
  const preferredTypes = preferred?.username ? options.user_types[preferred.username] ?? [] : [];
  const defaultUser = usersWithTypes.includes("Alfred") ? "Alfred" : usersWithTypes[0] || "";
  const username = preferred?.username && preferredTypes.length > 0 ? preferred.username : defaultUser;
  const typeOptions = username ? options.user_types[username] ?? [] : [];
  const week = preferred?.week && options.weeks.includes(preferred.week) ? preferred.week : "";
  const day = preferred?.day && options.days.includes(preferred.day) ? preferred.day : "";
  const type = resolvePreferredCurrentType(typeOptions, preferred?.type);

  return { username, type, week, day };
}

export function getNextWeek(value: CurrentWeek): CurrentWeek {
  const index = Number(value.replace("W", ""));
  if (!Number.isFinite(index) || index >= 48) return "W1";
  return `W${index + 1}` as CurrentWeek;
}

export function compactUnique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return false;
    seen.add(normalized.toLowerCase());
    return true;
  });
}

export function truncateField(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function isSafeTopicTag(value: string) {
  return /^[a-zA-Z0-9_]+$/.test(value);
}

export function itemToDraft(item: KnowledgeItem): KnowledgeDraft {
  return {
    question: item.question,
    answer: item.answer,
    source: item.source ?? "",
    topic_tag: item.topic_tag ?? "",
    blog_status: item.blog_status,
  };
}

export function todoItemToDraft(item: TodoItem): TodoDraft {
  return {
    title: item.title,
    content: item.content,
    source: item.source ?? "",
    topic_tag: item.topic_tag ?? "",
    todo_status: item.todo_status,
  };
}

export function areTodoDraftsEqual(left: TodoDraft, right: TodoDraft) {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.source === right.source &&
    left.topic_tag === right.topic_tag &&
    left.todo_status === right.todo_status
  );
}

export function resolveTodoEditorDraft(item: TodoItem | null, draftsById: Record<number, TodoDraft>) {
  if (!item) return emptyTodoDraft;
  return draftsById[item.id] ?? todoItemToDraft(item);
}

export function blogFactoryItemToEditDraft(item: BlogFactoryItem | null): BlogFactoryEditDraft {
  return {
    taskContent: item?.task_content ?? "",
    questionSnapshot: item?.question_snapshot ?? "",
    answerSnapshot: item?.answer_snapshot ?? "",
    sourceSnapshot: item?.source_snapshot ?? "",
    topicTagSnapshot: item?.topic_tag_snapshot ?? "",
  };
}

export function blogPublishConfigToDraft(config: BlogPublishConfig): BlogPublishConfigDraft {
  return {
    blogType: config.blog_type,
    blogUrl: config.blog_url,
    username: config.username,
    password: "",
    apiUrl: config.api_url,
    blogName: config.blog_name ?? "",
    isDefault: config.is_default,
    validation: null,
  };
}

export function resolvePreferredBlogPublishConfig(configs: BlogPublishConfig[], preferredId: number | null) {
  if (preferredId !== null) {
    const matched = configs.find((item) => item.id === preferredId);
    if (matched) return matched;
  }
  return configs.find((item) => item.is_default) ?? configs[0] ?? null;
}

export function upsertBlogPublishConfig(configs: BlogPublishConfig[], next: BlogPublishConfig) {
  const base = configs.filter((item) => item.id !== next.id).map((item) => ({
    ...item,
    is_default: next.is_default ? false : item.is_default,
  }));
  return [next, ...base].sort((left, right) => {
    if (left.is_default !== right.is_default) return left.is_default ? -1 : 1;
    return right.id - left.id;
  });
}

export function splitBlogPublishTags(value: string | null | undefined) {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,，\n]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function isCnblogsPublishConfig(config: BlogPublishConfig) {
  return /(?:^|\.)cnblogs\.com$/i.test(safeHostname(config.api_url)) || /(?:^|\.)cnblogs\.com$/i.test(safeHostname(config.blog_url));
}

function safeHostname(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function resolveDefaultBlogPublishCategories(
  options: BlogPublishCategory[],
  selectedItem: BlogFactoryItem | null,
  draftTopicTags: string,
) {
  const preferredTitles = new Set(
    splitBlogPublishTags(selectedItem?.remote_categories_snapshot || draftTopicTags || selectedItem?.topic_tag_snapshot)
      .map((tag) => normalizeCnblogsCategoryLabel(tag))
      .filter(Boolean),
  );
  return options
    .map((item) => item.title)
    .filter((title) => preferredTitles.has(normalizeCnblogsCategoryLabel(title)));
}

function normalizeCnblogsCategoryLabel(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/^[\[(（「【]\s*(随笔分类|文章分类|网站分类)\s*[\])）」】]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterCnblogsPublishCategories(options: BlogPublishCategory[]) {
  return options.filter((item) => {
    const haystack = normalizeCnblogsCategoryLabel(`${item.title} ${item.description ?? ""}`);
    return haystack.includes("随笔分类");
  });
}

export function resolveBlogFactoryPublishMarkdown(
  item: BlogFactoryItem,
  articleDraft: string | null | undefined,
  taskContentDraft: string | null | undefined,
) {
  const savedArticle = item.article_markdown?.trim() ?? "";
  if (savedArticle) return savedArticle;

  const draftArticle = (articleDraft ?? "").trim();
  if (draftArticle) return draftArticle;

  return removeLeakedMarkdownCodePlaceholders(taskContentDraft ?? item.task_content ?? "").trim();
}

export function buildBlogFactoryTaskSummary(taskContent: string, maxLength = 100, targetLength = 50) {
  const normalized = normalizeBlogFactoryAssistContent(taskContent);
  if (!normalized) return "";

  const sentences = splitBlogFactoryAssistSentences(normalized);
  const preferred = pickBlogFactorySummarySentence(sentences);
  return fitBlogFactorySummary(cleanBlogFactoryAssistPhrase(preferred || normalized), maxLength, targetLength);
}

export function buildBlogFactoryCoverImagePrompt(
  taskContent: string,
  summary: string,
  title: string,
  template = DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE,
) {
  const normalized = normalizeBlogFactoryAssistContent(taskContent);
  const cleanSummary = buildBlogFactoryTaskSummary(summary || normalized);
  const topic = extractBlogFactoryCoverTopic(normalized, cleanSummary, title);
  const resolvedTitle = cleanBlogFactoryTitle(title) || topic || "技术文章封面";

  return renderBlogFactoryCoverPromptTemplate(template || DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE, {
    title: resolvedTitle,
    summary: cleanSummary || "提炼文章核心观点，呈现专业可信的知识加工与实践落地感。",
    topic: topic || resolvedTitle,
  });
}

export function extractBlogFactoryCoverImageMarkdown(taskContent: string) {
  const markedCover = taskContent.match(
    /<!-- trustedKnowledge:cover-image:start -->\s*(!\[[^\]]*]\([^)]+\))\s*<!-- trustedKnowledge:cover-image:end -->/m,
  );
  if (markedCover) return markedCover[1].replace(/^!\[[^\]]*]/, "![封面图片]").trim();

  return taskContent.match(BLOG_FACTORY_COVER_IMAGE_LINE_PATTERN)?.[0]?.trim() ?? "";
}

export function upsertBlogFactoryCoverImageMarkdown(taskContent: string, imageMarkdown: string) {
  const cleanedImageMarkdown = imageMarkdown.trim();
  if (!cleanedImageMarkdown) return taskContent;

  const coverMarkdown = cleanedImageMarkdown.replace(/^!\[[^\]]*]/, "![封面图片]");
  const blockPattern =
    /<!-- trustedKnowledge:cover-image:start -->[\s\S]*?<!-- trustedKnowledge:cover-image:end -->/m;

  if (blockPattern.test(taskContent)) {
    return taskContent.replace(blockPattern, coverMarkdown).trim();
  }

  if (BLOG_FACTORY_COVER_IMAGE_LINE_PATTERN.test(taskContent)) {
    return taskContent.replace(BLOG_FACTORY_COVER_IMAGE_LINE_PATTERN, coverMarkdown).trim();
  }

  const trimmedContent = taskContent.trim();
  return trimmedContent ? `${coverMarkdown}\n\n${trimmedContent}` : coverMarkdown;
}

export function removeBlogFactoryCoverImageMarkdown(taskContent: string) {
  return taskContent
    .replace(/<!-- trustedKnowledge:cover-image:start -->[\s\S]*?<!-- trustedKnowledge:cover-image:end -->\s*/m, "")
    .replace(BLOG_FACTORY_COVER_IMAGE_LINE_PATTERN, "")
    .trim();
}

export function readStoredNewDraft(): KnowledgeDraft | null {
  try {
    const value = window.localStorage.getItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY);
    if (!value) return null;

    const draft = JSON.parse(value) as Partial<KnowledgeDraft>;
    const nextDraft: KnowledgeDraft = {
      question: typeof draft.question === "string" ? draft.question : "",
      answer: typeof draft.answer === "string" ? draft.answer : "",
      source: typeof draft.source === "string" ? draft.source : "",
      topic_tag: typeof draft.topic_tag === "string" ? draft.topic_tag : "",
      blog_status: isKnowledgeStatus(draft.blog_status) ? draft.blog_status : "未发布",
    };

    return isEmptyDraft(nextDraft) ? null : nextDraft;
  } catch {
    clearStoredNewDraft();
    return null;
  }
}

export function clearStoredNewDraft() {
  window.localStorage.removeItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY);
}

export function writeStoredNewDraft(draft: KnowledgeDraft) {
  window.localStorage.setItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function readStoredUiState(): StoredUiState {
  try {
    const value = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
    if (!value) return buildDefaultUiState();

    const stored = JSON.parse(value) as unknown;
    if (!isPlainRecord(stored)) return buildDefaultUiState();

    const defaults = buildDefaultUiState();
    const workbench = readRecord(stored.workbench);
    const factory = readRecord(stored.factory);
    const blogFactory = readRecord(stored.blogFactory);
    const todos = readRecord(stored.todos);
    const currentRecords = readRecord(stored.currentRecords);
    const englishMaterials = readRecord(stored.englishMaterials);
    const history = readRecord(stored.history);
    const historyAsk = readRecord(stored.historyAsk);
    const aiCoding = readRecord(stored.aiCoding);
    const workbenchDraft = readKnowledgeDraft(workbench.draft);
    const todoDraft = readTodoDraft(todos.draft);
    const blogFactoryMaskRules = readBlogFactoryMaskRules(blogFactory.maskRules);
    const currentRecordDraft = readRecord(currentRecords.draft);
    const englishMaterialDraft = readEnglishMaterialDraft(englishMaterials.draft);

    return {
      activeView: readAppView(stored.activeView, defaults.activeView),
      sidebarExpanded: typeof stored.sidebarExpanded === "boolean" ? stored.sidebarExpanded : defaults.sidebarExpanded,
      mobileNavVisible:
        typeof stored.mobileNavVisible === "boolean" ? stored.mobileNavVisible : defaults.mobileNavVisible,
      themeMode: readThemeMode(stored.themeMode, defaults.themeMode),
      workbench: {
        query: readString(workbench.query),
        username: readString(workbench.username),
        statusFilter: readKnowledgeStatusFilter(workbench.statusFilter, defaults.workbench.statusFilter),
        page: readPositiveInteger(workbench.page, defaults.workbench.page),
        selectedId: readNullablePositiveInteger(workbench.selectedId),
        draft: workbenchDraft && !isEmptyDraft(workbenchDraft) ? workbenchDraft : null,
      },
      factory: {
        query: readString(factory.query),
        username: readString(factory.username),
        page: readPositiveInteger(factory.page, defaults.factory.page),
        selectedId: readNullablePositiveInteger(factory.selectedId),
        task: normalizeFactoryTaskResult(readString(factory.task)),
        skillIds: readStringArray(factory.skillIds),
        codexJobId: readNullableString(factory.codexJobId),
      },
      blogFactory: {
        query: readString(blogFactory.query),
        username: readString(blogFactory.username),
        page: readPositiveInteger(blogFactory.page, defaults.blogFactory.page),
        status: readBlogFactoryStatusFilter(blogFactory.status, defaults.blogFactory.status),
        topic: readString(blogFactory.topic),
        knowledgeId: readString(blogFactory.knowledgeId).replace(/\D/g, ""),
        sortBy: readStringUnion(blogFactory.sortBy, BLOG_FACTORY_SORT_FIELDS, defaults.blogFactory.sortBy),
        sortDir: readStringUnion(blogFactory.sortDir, SORT_DIRECTIONS, defaults.blogFactory.sortDir),
        selectedItemId: readNullablePositiveInteger(blogFactory.selectedItemId),
        articleDraft: readString(blogFactory.articleDraft),
        articlePathDraft: readString(blogFactory.articlePathDraft),
        maskRules: blogFactoryMaskRules,
        selectedMaskRuleId: resolveBlogFactoryMaskRuleId(blogFactoryMaskRules, readNullableString(blogFactory.selectedMaskRuleId)),
        coverPromptTemplate: readString(blogFactory.coverPromptTemplate) || DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE,
      },
      todos: {
        query: readString(todos.query),
        username: readString(todos.username),
        page: readPositiveInteger(todos.page, defaults.todos.page),
        status: readTodoStatusFilter(todos.status, defaults.todos.status),
        selectedId: readNullablePositiveInteger(todos.selectedId),
        draft: todoDraft && !isEmptyTodoDraft(todoDraft) ? todoDraft : null,
      },
      currentRecords: {
        query: readString(currentRecords.query),
        page: readPositiveInteger(currentRecords.page, defaults.currentRecords.page),
        username: readString(currentRecords.username),
        type: readString(currentRecords.type),
        week: readString(currentRecords.week),
        day: readString(currentRecords.day),
        learnLevel: readString(currentRecords.learnLevel).replace(/\D/g, ""),
        sortBy: readStringUnion(currentRecords.sortBy, CURRENT_RECORD_SORT_FIELDS, defaults.currentRecords.sortBy),
        sortDir: readStringUnion(currentRecords.sortDir, SORT_DIRECTIONS, defaults.currentRecords.sortDir),
        draft: {
          username: readString(currentRecordDraft.username),
          type: readString(currentRecordDraft.type),
          content: readString(currentRecordDraft.content),
        },
      },
      englishMaterials: {
        query: readString(englishMaterials.query),
        username: readString(englishMaterials.username),
        page: readPositiveInteger(englishMaterials.page, defaults.englishMaterials.page),
        category: readString(englishMaterials.category),
        flag: readStringUnion(englishMaterials.flag, ["", "0", "1"] as const, defaults.englishMaterials.flag),
        sortBy: readStringUnion(englishMaterials.sortBy, ENGLISH_MATERIAL_SORT_FIELDS, defaults.englishMaterials.sortBy),
        sortDir: readStringUnion(englishMaterials.sortDir, SORT_DIRECTIONS, defaults.englishMaterials.sortDir),
        selectedId: readNullablePositiveInteger(englishMaterials.selectedId),
        draft: englishMaterialDraft,
      },
      history: {
        query: readString(history.query),
        page: readPositiveInteger(history.page, defaults.history.page),
        type: readString(history.type),
        username: readString(history.username),
        week: readString(history.week),
        day: readString(history.day),
        learnLevel: readString(history.learnLevel).replace(/\D/g, ""),
        vectorStatus: readStringUnion(history.vectorStatus, ["all", "0", "1"] as const, defaults.history.vectorStatus),
        dateFrom: readString(history.dateFrom),
        dateTo: readString(history.dateTo),
        sortBy: readStringUnion(history.sortBy, HISTORY_SORT_FIELDS, defaults.history.sortBy),
        sortDir: readStringUnion(history.sortDir, SORT_DIRECTIONS, defaults.history.sortDir),
      },
      historyAsk: {
        question: readString(historyAsk.question),
        answer: readHistoryAskResponse(historyAsk.answer),
        skillIds: readStringArray(historyAsk.skillIds),
      },
      aiCoding: {
        prompt: readString(aiCoding.prompt),
        modelName: readString(aiCoding.modelName),
        messages: readAiCodingMessages(aiCoding.messages),
        activeJobId: readNullableString(aiCoding.activeJobId),
        githubSyncStatus: readGithubSyncResponse(aiCoding.githubSyncStatus),
      },
    };
  } catch {
    clearStoredUiState();
    return buildDefaultUiState();
  }
}

export function writeStoredUiState(state: StoredUiState) {
  try {
    window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private mode or under quota pressure.
  }
}

export function clearStoredUiState() {
  window.localStorage.removeItem(UI_STATE_STORAGE_KEY);
}

function buildDefaultUiState(): StoredUiState {
  return {
    activeView: "overview",
    sidebarExpanded: false,
    mobileNavVisible: true,
    themeMode: "dark",
    workbench: {
      query: "",
      username: "",
      statusFilter: "all",
      page: 1,
      selectedId: null,
      draft: null,
    },
    factory: {
      query: "",
      username: "",
      page: 1,
      selectedId: null,
      task: "",
      skillIds: [],
      codexJobId: null,
    },
    blogFactory: {
      query: "",
      username: "",
      page: 1,
      status: "all",
      topic: "",
      knowledgeId: "",
      sortBy: "copied_at",
      sortDir: "desc",
      selectedItemId: null,
      articleDraft: "",
      articlePathDraft: "",
      maskRules: [],
      selectedMaskRuleId: null,
      coverPromptTemplate: DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE,
    },
    todos: {
      query: "",
      username: "",
      page: 1,
      status: "all",
      selectedId: null,
      draft: null,
    },
    currentRecords: {
      query: "",
      page: 1,
      username: "",
      type: "",
      week: "",
      day: "",
      learnLevel: "",
      sortBy: "id",
      sortDir: "desc",
      draft: { username: "", type: "", content: "" },
    },
    englishMaterials: {
      query: "",
      username: "",
      page: 1,
      category: "",
      flag: "",
      sortBy: "id",
      sortDir: "desc",
      selectedId: null,
      draft: emptyEnglishMaterialDraft,
    },
    history: {
      query: "",
      page: 1,
      type: "",
      username: "",
      week: "",
      day: "",
      learnLevel: "",
      vectorStatus: "all",
      dateFrom: "",
      dateTo: "",
      sortBy: "history_date",
      sortDir: "desc",
    },
    historyAsk: {
      question: "",
      answer: null,
      skillIds: [],
    },
    aiCoding: {
      prompt: "",
      modelName: "",
      messages: [],
      activeJobId: null,
      githubSyncStatus: null,
    },
  };
}

function readKnowledgeDraft(value: unknown): KnowledgeDraft | null {
  const draft = readRecord(value);
  return {
    question: readString(draft.question),
    answer: readString(draft.answer),
    source: readString(draft.source),
    topic_tag: readString(draft.topic_tag),
    blog_status: isKnowledgeStatus(draft.blog_status) ? draft.blog_status : "未发布",
  };
}

function readTodoDraft(value: unknown): TodoDraft | null {
  const draft = readRecord(value);
  return {
    title: readString(draft.title),
    content: readString(draft.content),
    source: readString(draft.source),
    topic_tag: readString(draft.topic_tag),
    todo_status: isTodoStatus(draft.todo_status) ? draft.todo_status : "待处理",
  };
}

function readBlogFactoryMaskRules(value: unknown): BlogFactoryMaskRule[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const record = readRecord(item);
    const id = readString(record.id);
    if (!id) return [];

    const keywordReplacements = Array.isArray(record.keywordReplacements)
      ? record.keywordReplacements.flatMap((entry) => {
          const replacement = readRecord(entry);
          const keyword = readString(replacement.keyword);
          if (!keyword.trim()) return [];
          return [
            {
              id: readString(replacement.id) || buildLocalDraftId("mask-keyword"),
              keyword: keyword.trim(),
              replacement: readString(replacement.replacement),
            },
          ];
        })
      : [];

    return [
      {
        id,
        name: readString(record.name),
        description: readString(record.description),
        keywordReplacements,
        maskPhone: typeof record.maskPhone === "boolean" ? record.maskPhone : false,
        maskEmail: typeof record.maskEmail === "boolean" ? record.maskEmail : false,
        maskIdCard: typeof record.maskIdCard === "boolean" ? record.maskIdCard : false,
        maskBankCard: typeof record.maskBankCard === "boolean" ? record.maskBankCard : false,
        maskUrl: typeof record.maskUrl === "boolean" ? record.maskUrl : false,
        maskIp: typeof record.maskIp === "boolean" ? record.maskIp : false,
      },
    ];
  });
}

export function readEnglishMaterialDraft(value: unknown): EnglishMaterialDraft {
  const draft = readRecord(value);
  return {
    sequence_no: readString(draft.sequence_no).replace(/\D/g, ""),
    category: readString(draft.category),
    base_expression: readString(draft.base_expression),
    professional_sentence: readString(draft.professional_sentence),
    chinese_translation: readString(draft.chinese_translation),
    full_script: readString(draft.full_script),
    title: readString(draft.title),
    flag: readStringUnion(draft.flag, ["0", "1"] as const, "0"),
  };
}

export function isBlankEnglishMaterialDraftExceptSequence(draft: EnglishMaterialDraft): boolean {
  return (
    !draft.category.trim() &&
    !draft.base_expression.trim() &&
    !draft.professional_sentence.trim() &&
    !draft.chinese_translation.trim() &&
    !draft.full_script.trim() &&
    !draft.title.trim() &&
    draft.flag === "0"
  );
}

export function englishMaterialItemToDraft(item: EnglishMaterialItem): EnglishMaterialDraft {
  return {
    sequence_no: item.sequence_no ? String(item.sequence_no) : "",
    category: item.category ?? "",
    base_expression: item.base_expression ?? "",
    professional_sentence: item.professional_sentence ?? "",
    chinese_translation: item.chinese_translation ?? "",
    full_script: item.full_script ?? "",
    title: item.title ?? "",
    flag: item.flag === 1 ? "1" : "0",
  };
}

function readHistoryAskResponse(value: unknown): HistoryAskResponse | null {
  if (!isPlainRecord(value) || typeof value.answer !== "string") return null;
  return {
    ...(value as unknown as HistoryAskResponse),
    selected_skills: Array.isArray(value.selected_skills) ? (value.selected_skills as HistoryAskResponse["selected_skills"]) : [],
  };
}

function readAiCodingMessages(value: unknown): AiCodingMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isPlainRecord(item)) return [];
    const response = readCodexRunResponse(item.response);
    const prompt = readString(item.prompt);
    const status = readAiCodingNoticeStatus(item.status) ?? (response ? "completed" : "failed");
    const output = readString(item.output);
    const errorOutput = readString(item.errorOutput);
    const errorMessage = readNullableString(item.errorMessage);
    const modelName = readNullableString(item.modelName);
    const startedAt = readNullableString(item.startedAt);
    const completedAt = readNullableString(item.completedAt);
    if (!prompt && !response && !errorMessage && !output && !errorOutput) return [];

    return [
      {
        id: readPositiveInteger(item.id, Date.now()),
        jobId: readNullableString(item.jobId) ?? undefined,
        prompt,
        modelName,
        status,
        output,
        errorOutput,
        errorMessage,
        startedAt,
        completedAt,
        response,
        archivedKnowledgeId: readNullablePositiveInteger(item.archivedKnowledgeId) ?? undefined,
      },
    ];
  });
}

function readAiCodingNoticeStatus(value: unknown): AiCodingNoticeStatus | null {
  return value === "running" || value === "completed" || value === "failed" ? value : null;
}

function readThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === "dark" || value === "light" ? value : fallback;
}

function readCodexRunResponse(value: unknown): CodexRunResponse | null {
  if (!isPlainRecord(value)) return null;
  return {
    output: readString(value.output),
    error_output: readString(value.error_output),
    exit_code: typeof value.exit_code === "number" ? value.exit_code : 0,
    duration_seconds: typeof value.duration_seconds === "number" ? value.duration_seconds : 0,
    git_status: readString(value.git_status),
    model_name: readNullableString(value.model_name),
  };
}

function readGithubSyncResponse(value: unknown): GithubSyncResponse | null {
  if (!isPlainRecord(value)) return null;
  return {
    success: Boolean(value.success),
    message: readString(value.message),
    exit_code: typeof value.exit_code === "number" ? value.exit_code : 0,
    output_tail: readString(value.output_tail),
    log_path: readString(value.log_path),
    completed_at: readString(value.completed_at),
  };
}

function readAppView(value: unknown, fallback: AppView): AppView {
  return APP_VIEWS.includes(value as AppView) ? (value as AppView) : fallback;
}

function readKnowledgeStatusFilter(value: unknown, fallback: KnowledgeStatus | "all") {
  return value === "all" || isKnowledgeStatus(value) ? value : fallback;
}

function readBlogFactoryStatusFilter(value: unknown, fallback: BlogFactoryStatus | "all") {
  return value === "all" || isBlogFactoryStatus(value) ? value : fallback;
}

function readTodoStatusFilter(value: unknown, fallback: TodoStatus | "all") {
  return value === "all" || isTodoStatus(value) ? value : fallback;
}

function readStringUnion<const T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNullablePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEmptyDraft(draft: KnowledgeDraft) {
  return !draft.question.trim() && !draft.answer.trim() && !draft.source.trim() && !draft.topic_tag.trim();
}

function isEmptyTodoDraft(draft: TodoDraft) {
  return !draft.title.trim() && !draft.content.trim() && !draft.source.trim() && !draft.topic_tag.trim();
}

function isKnowledgeStatus(value: unknown): value is KnowledgeStatus {
  return value === "未发布" || value === "已发布" || value === "跳过";
}

function isBlogFactoryStatus(value: unknown): value is BlogFactoryStatus {
  return value === "待处理" || value === "已处理" || value === "已发布" || value === "跳过";
}

function isTodoStatus(value: unknown): value is TodoStatus {
  return value === "待处理" || value === "处理中" || value === "已完成";
}

export async function waitForBackendRecovery() {
  await sleep(2000);
  const deadline = Date.now() + 90_000;
  let healthyCount = 0;

  while (Date.now() < deadline) {
    if (await checkBackendHealth()) {
      healthyCount += 1;
      if (healthyCount >= 2) return;
    } else {
      healthyCount = 0;
    }
    await sleep(2000);
  }

  throw new Error("服务重启已触发，但 90 秒内未检测到后端恢复。请查看 logs/web-restart.log。");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function appendLogLine(current: string, line: string) {
  return current ? `${current}\n${line}` : line;
}

export function upsertCodexJobMessage(messages: AiCodingMessage[], job: CodexJobSnapshot): AiCodingMessage[] {
  const nextMessage: AiCodingMessage = {
    id: Date.parse(job.started_at) || Date.now(),
    jobId: job.job_id,
    prompt: job.prompt,
    modelName: job.model_name,
    status: job.status,
    output: job.output,
    errorOutput: job.error_output,
    errorMessage: job.error_message,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    response: job.response,
  };
  const index = messages.findIndex((message) => message.jobId === job.job_id);
  if (index === -1) return [nextMessage, ...messages];

  return messages.map((message, messageIndex) =>
    messageIndex === index
      ? {
          ...message,
          prompt: job.prompt,
          modelName: job.model_name,
          status: job.status,
          output: job.output,
          errorOutput: job.error_output,
          errorMessage: job.error_message,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          response: job.response,
        }
      : message,
  );
}

export function buildCodexKnowledgeDraft(message: AiCodingMessage): KnowledgeDraft {
  const response = message.response;
  const question = truncateField(`AI 编程变更记录：${buildCodexRecordTitle(message.prompt)}`, 4000);
  if (!response) {
    return {
      question,
      answer: "Codex 任务尚未完成。",
      source: "AI 编程界面 / Codex",
      topic_tag: "ai_coding,codex",
      blog_status: "未发布",
    };
  }

  const summary = getCodexCompletionSummary(response);
  const verificationLines = extractCodexVerificationLines(response);
  const resultText = extractCodexResultText(response);
  const answer = [
    "任务目标：",
    message.prompt.trim(),
    "",
    "Codex答复：",
    resultText || "未能从 Codex 输出中提取到可读答复，请回到 AI 编程界面查看调试日志。",
    "",
    "执行结果：",
    `- 状态：${response.exit_code === 0 ? "完成" : "失败"}`,
    `- Exit Code：${response.exit_code}`,
    `- 耗时：${response.duration_seconds}s`,
    "",
    "验证线索：",
    verificationLines.length > 0 ? verificationLines.map((line) => `- ${line}`).join("\n") : "- 未从 Codex 输出中提取到明确验证命令或结果。",
    "",
    "工作区变更：",
    formatCodexChangedFiles(summary.changedFiles),
    "",
    "重启建议：",
    summary.restartText,
    "",
    "备注：",
    "完整执行日志保留在 AI 编程界面，本知识条目仅记录可检索的变更结论。",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    question,
    answer,
    source: "AI 编程界面 / Codex",
    topic_tag: "ai_coding,codex",
    blog_status: "未发布",
  };
}

export function extractCodexResultText(response: CodexRunResponse) {
  const assistantMessages = extractCodexAssistantMessages(`${response.output}\n${response.error_output}`);
  if (assistantMessages.length > 0) {
    return truncateField(dedupeLines(assistantMessages).join("\n\n"), 8000);
  }

  const plainText = extractPlainCodexAnswer(response.output);
  return plainText ? truncateField(plainText, 8000) : "";
}

function extractCodexAssistantMessages(output: string) {
  const messages: string[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const event = JSON.parse(trimmed) as unknown;
      messages.push(...extractAssistantTextFromEvent(event));
    } catch {
      continue;
    }
  }

  return messages.map(cleanCodexText).filter((message) => message.length > 0);
}

function extractAssistantTextFromEvent(event: unknown): string[] {
  if (!isPlainRecord(event)) return [];

  const nestedMessage = event.msg;
  if (isPlainRecord(nestedMessage)) {
    const nestedText = extractAssistantTextFromEvent(nestedMessage);
    if (nestedText.length > 0) return nestedText;
  }

  const item = event.item;
  if (isPlainRecord(item) && item.role === "assistant") {
    return extractTextFragments(item.content ?? item.message ?? item.text);
  }
  if (isPlainRecord(item) && (item.type === "agent_message" || item.type === "assistant_message")) {
    return extractTextFragments(item.text ?? item.message ?? item.content);
  }

  if (event.role === "assistant") {
    return extractTextFragments(event.content ?? event.message ?? event.text);
  }

  const eventType = typeof event.type === "string" ? event.type : "";
  if (eventType === "agent_message" || eventType === "assistant_message") {
    return extractTextFragments(event.message ?? event.content ?? event.text);
  }

  if (eventType === "response.output_text.done" || eventType === "response.output_text") {
    return extractTextFragments(event.text);
  }

  return [];
}

function extractTextFragments(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractTextFragments);
  if (!isPlainRecord(value)) return [];

  const fragments: string[] = [];
  for (const key of ["text", "message", "content", "parts"]) {
    if (key in value) {
      fragments.push(...extractTextFragments(value[key]));
    }
  }
  return fragments;
}

function extractPlainCodexAnswer(output: string) {
  const cleaned = cleanCodexText(output);
  if (!cleaned || cleaned.startsWith("{")) return "";

  const sectionHeadings = [
    "任务结论",
    "执行结果",
    "方案",
    "可选方案",
    "建议",
    "评估",
    "已完成",
    "Summary",
    "Result",
  ];
  const headingPattern = new RegExp(`(?:^|\\n)(?:\\*\\*)?(${sectionHeadings.join("|")})(?:\\*\\*)?[：:]?\\s*\\n`, "i");
  const match = cleaned.match(headingPattern);
  return match?.index !== undefined ? cleaned.slice(match.index).trim() : cleaned.trim();
}

function cleanCodexText(value: string) {
  return value
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function dedupeLines(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function stripFactoryMetaIntro(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const paragraphs = normalized.split(/\n\s*\n/);
  let index = 0;

  while (index < paragraphs.length && index < 3) {
    const paragraph = paragraphs[index].replace(/\s+/g, " ").trim();
    if (!paragraph) {
      index += 1;
      continue;
    }
    if (!isFactoryMetaParagraph(paragraph)) break;
    index += 1;
  }

  return paragraphs.slice(index).join("\n\n");
}

function isFactoryMetaParagraph(value: string) {
  if (/^#{1,6}\s/.test(value)) return false;
  if (/^!\[[^\]]*\]\([^)]+\)$/.test(value)) return false;

  return (
    /(我会先|先读取|读取所选|读取.*SKILL\.md|读取.*skill|确认.*要求|分析任务|执行过程|处理中间步骤|所选 trustedKnowledge skill|只基于你提供的 Context|然后只基于)/i.test(
      value,
    ) ||
    (value.length <= 140 && /(skill|SKILL\.md|Context|trustedKnowledge)/i.test(value))
  );
}

function rewriteFactoryBannedPhrases(value: string) {
  const replacements: Array<[RegExp, string]> = [
    [/按现有素材来看/g, "按笔者环境来看"],
    [/从现有素材来看/g, "按笔者环境来看"],
    [/根据现有素材/g, "根据笔者环境"],
    [/按素材来看/g, "按笔者环境来看"],
    [/从素材来看/g, "按笔者环境来看"],
    [/素材中的做法/g, "笔者环境中的做法"],
    [/素材中的处理方式/g, "笔者环境中的处理方式"],
    [/素材中说明/g, "笔者环境中说明"],
    [/素材中提到/g, "笔者环境中提到"],
    [/素材中给出/g, "笔者环境中给出"],
    [/素材显示/g, "笔者环境显示"],
    [/素材表明/g, "笔者环境表明"],
  ];
  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);
}

export function buildBlogFactoryArticleExportFileName(
  itemId: number | null,
  articleTitle: string | null | undefined,
  markdown: string,
) {
  const resolvedTitle = articleTitle?.trim() || extractMarkdownHeading(markdown);
  if (resolvedTitle) return `${sanitizeDownloadBaseName(resolvedTitle)}.html`;
  return `blog-factory-article-${itemId ?? "article"}.html`;
}

export function buildBlogFactoryTaskExportFileName(itemId: number | null, knowledgeId: number | null) {
  return `blog-factory-task-${itemId ?? "task"}-knowledge-${knowledgeId ?? "knowledge"}.html`;
}

export function buildBlogFactoryTaskDocumentTitle(itemId: number | null, knowledgeId: number | null) {
  return `博客工厂任务 ${itemId ?? "任务"} / 知识 ${knowledgeId ?? "知识"}`;
}

export function extractMarkdownHeading(markdown: string) {
  for (const line of markdown.split("\n")) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return "";
}

function normalizeBlogFactoryAssistContent(value: string) {
  const withoutCodeBlocks = removeLeakedMarkdownCodePlaceholders(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]+>/g, " ");

  return withoutCodeBlocks
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)、]\s*/, "")
        .replace(/[*_~#>|]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line && !isBlogFactorySeparatorLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBlogFactorySeparatorLine(value: string) {
  return Array.from(value).every((char) => char === "-" || char === ":" || char === "|" || /\s/.test(char));
}

function splitBlogFactoryAssistSentences(value: string) {
  return value
    .split(/(?<=[。！？!?；;])\s*|\n+/u)
    .map(cleanBlogFactoryAssistPhrase)
    .filter((sentence) => sentence.length >= 8);
}

function pickBlogFactorySummarySentence(sentences: string[]) {
  if (sentences.length === 0) return "";

  const scored = sentences.map((sentence, index) => {
    let score = Math.max(0, 12 - index);
    if (/任务|目标|核心|意图|本文|文章|介绍|说明|讲解|实践|解决|实现|构建|优化|方案|流程|经验|复盘/.test(sentence)) score += 8;
    const length = Array.from(sentence).length;
    score += Math.max(0, 18 - Math.abs(length - 50));
    if (length >= 24 && length <= 90) score += 5;
    if (length > 140) score -= 8;
    return { sentence, score };
  });

  return scored.sort((left, right) => right.score - left.score)[0]?.sentence ?? sentences[0];
}

function cleanBlogFactoryAssistPhrase(value: string) {
  return value
    .replace(/^任务目标[：:]\s*/u, "")
    .replace(/^任务内容[：:]\s*/u, "")
    .replace(/^核心意图[：:]\s*/u, "")
    .replace(/^摘要[：:]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBlogFactoryTitle(value: string) {
  return cleanBlogFactoryAssistPhrase(value)
    .replace(/^#+\s*/, "")
    .replace(/^标题[：:]\s*/u, "")
    .replace(/^[《「“"']|[》」”"']$/g, "")
    .replace(/[。！？!?；;，,、]+$/u, "")
    .trim();
}

function extractBlogFactoryCoverTopic(content: string, summary: string, fallbackTitle: string) {
  const titleTopic = cleanBlogFactoryTitle(fallbackTitle);
  if (titleTopic && Array.from(titleTopic).length <= 18) return titleTopic;

  const source = `${titleTopic}\n${summary}\n${content}`;
  const techToken = source.match(/\b(?:Oracle|APEX|OCI|GraalVM|Java|Python|React|Vite|FastAPI|Codex|AI|LLM|SQL|PL\/SQL|Markdown|MetaWeblog|C4D)\b/);
  const chineseTopic = source.match(/([\u4e00-\u9fa5A-Za-z0-9+#./-]{2,12})(?:实践|指南|方案|优化|配置|部署|开发|发布|集成|迁移|排查|复盘|教程|能力|流程|方法)/u);
  if (techToken && chineseTopic) return `${techToken[0]} ${chineseTopic[1]}`.trim();
  if (chineseTopic) return chineseTopic[1].trim();
  if (techToken) return techToken[0];

  return truncateByCharacters(cleanBlogFactoryTitle(summary || titleTopic || content), 10, "");
}

function renderBlogFactoryCoverPromptTemplate(template: string, values: { title: string; summary: string; topic: string }) {
  return template
    .replace(/\{\{\s*title\s*\}\}/g, values.title)
    .replace(/\{\{\s*summary\s*\}\}/g, values.summary)
    .replace(/\{\{\s*topic\s*\}\}/g, values.topic)
    .trim();
}

function fitBlogFactorySummary(value: string, maxLength: number, targetLength: number) {
  const cleaned = cleanBlogFactoryAssistPhrase(value);
  const chars = Array.from(cleaned);
  const preferredMaxLength = Math.min(maxLength, targetLength + 15);
  if (chars.length <= preferredMaxLength) return cleaned;

  const punctuationIndexes = chars
    .map((char, index) => ("。！？!?；;".includes(char) ? index + 1 : -1))
    .filter((index) => index >= Math.min(targetLength, maxLength));
  const sentenceEnd = punctuationIndexes.find((index) => index <= preferredMaxLength) ?? punctuationIndexes.find((index) => index <= maxLength);
  if (sentenceEnd) return chars.slice(0, sentenceEnd).join("").trim();

  const commaIndexes = chars
    .map((char, index) => ("，,、".includes(char) ? index + 1 : -1))
    .filter((index) => index >= Math.min(targetLength, maxLength) && index <= Math.min(maxLength - 3, preferredMaxLength));
  const commaEnd = commaIndexes[0];
  if (commaEnd) return `${chars.slice(0, commaEnd).join("").trim()}...`;

  return truncateByCharacters(cleaned, Math.min(maxLength, Math.max(targetLength, 12)), "...");
}

function truncateByCharacters(value: string, maxLength: number, suffix = "…") {
  const chars = Array.from(value.trim());
  if (chars.length <= maxLength) return value.trim();
  return `${chars.slice(0, Math.max(0, maxLength - Array.from(suffix).length)).join("").trim()}${suffix}`;
}

function sanitizeDownloadBaseName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || "trustedKnowledge-export";
}

export function getCodexCompletionSummary(response: CodexRunResponse) {
  const changedFiles = parseGitStatusFiles(response.git_status);
  const restartRecommended =
    response.exit_code === 0 &&
    changedFiles.some((file) =>
      file.startsWith("backend/") ||
      file.startsWith("scripts/") ||
      file === "backend/.env" ||
      file === "frontend/package.json" ||
      file === "frontend/package-lock.json" ||
      file.startsWith("frontend/vite.config") ||
      file.startsWith("frontend/tailwind.config") ||
      file.startsWith("frontend/postcss.config"),
    );

  const frontendOnly =
    response.exit_code === 0 &&
    changedFiles.length > 0 &&
    changedFiles.every((file) => file.startsWith("frontend/src/") || file === "frontend/index.html");

  const restartText =
    response.exit_code !== 0
      ? "任务未成功完成，建议先查看错误输出，不要立即重启。"
      : restartRecommended
        ? "建议人工确认后重启服务，后端、脚本、构建配置或依赖相关变更通常需要重新加载。"
        : frontendOnly
          ? "通常无需重启后端；开发服务可能已热更新，必要时刷新页面即可。"
          : changedFiles.length > 0
            ? "未检测到必须重启的变更；如页面行为未更新，可人工重启服务。"
            : "未检测到工作区变更，无需重启服务。";

  return {
    changedFiles,
    restartRecommended,
    restartText,
  };
}

function parseGitStatusFiles(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const renameMatch = line.match(/^.. (.+) -> (.+)$/);
      if (renameMatch) return renameMatch[2];
      const statusMatch = line.match(/^(?:[ MADRCU?!]{1,2}|[MADRCU?!])\s+(.+)$/);
      return statusMatch ? statusMatch[1].trim() : line;
    })
    .filter(Boolean);
}

function buildCodexRecordTitle(prompt: string) {
  const firstLine = prompt.trim().split("\n").find(Boolean) ?? "未命名任务";
  return truncateField(firstLine, 120);
}

function formatCodexChangedFiles(files: string[]) {
  if (files.length === 0) return "- 未检测到工作区变更";

  const visibleFiles = files.slice(0, 20).map((file) => `- ${file}`);
  if (files.length > visibleFiles.length) {
    visibleFiles.push(`- 另有 ${files.length - visibleFiles.length} 个文件，详见 Git Status。`);
  }
  return visibleFiles.join("\n");
}

function extractCodexVerificationLines(response: CodexRunResponse) {
  const lines = `${response.output}\n${response.error_output}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const verificationPatterns = [
    /npm run build/i,
    /python -m compileall/i,
    /pytest/i,
    /vitest/i,
    /eslint/i,
    /tsc/i,
    /✓ built/i,
    /passed/i,
    /failed/i,
    /error:/i,
  ];

  const matches: string[] = [];
  for (const line of lines) {
    if (verificationPatterns.some((pattern) => pattern.test(line))) {
      matches.push(truncateField(line, 220));
    }
    if (matches.length >= 8) break;
  }

  return Array.from(new Set(matches));
}
