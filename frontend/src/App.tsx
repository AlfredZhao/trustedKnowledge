import { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bold,
  Bot,
  CalendarClock,
  ChartLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  BookOpenCheck,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Code2,
  Database,
  FilePlus2,
  Filter,
  FileText,
  FlaskConical,
  Folder,
  FolderOpen,
  Globe,
  Github,
  History,
  ImagePlus,
  Lock,
  Layers3,
  List,
  ListChecks,
  ListOrdered,
  LogOut,
  Loader2,
  LockKeyhole,
  KeyRound,
  Network,
  Menu,
  Moon,
  Pencil,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Quote,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  Table2,
  TriangleAlert,
  Trash2,
  UserCog,
  WandSparkles,
  X,
} from "lucide-react";

import {
  clearStoredApiKey,
  fetchCurrentAuthUser,
  fetchAuthConfig,
  login,
  persistAuthUser,
  persistApiKey,
  readStoredAuthUser,
  readStoredApiKey,
  startWeChatLogin,
  type AuthUser,
} from "./api/auth";
import {
  appendTodoToCurrent,
  createBlogPublishConfig,
  convertKnowledgeToTodo,
  convertTodoToKnowledge,
  createBlogFactoryItem,
  createKnowledge,
  createTodo,
  deleteBlogPublishConfig,
  deleteBlogFactoryItem,
  deleteKnowledge,
  fetchBlogFactoryItems,
  cancelBlogFactoryEnhancementJob,
  fetchBlogPublishCategories,
  fetchBlogPublishConfigs,
  fetchKnowledge,
  fetchTodos,
  getBlogFactoryItem,
  getKnowledge,
  getTodo,
  mergeKnowledge,
  readCachedBlogFactoryItems,
  readCachedBlogPublishCategories,
  readCachedKnowledge,
  readCachedTodos,
  cancelBlogFactoryReviewJob,
  getBlogFactoryEnhancementJob,
  getBlogFactoryReviewJob,
  startBlogFactoryReviewJob,
  startBlogFactoryEnhancementJob,
  sendBlogFactoryItemToProcessing,
  updateBlogFactoryArticle,
  updateBlogFactoryAssistMetadata,
  updateBlogFactoryItem,
  updateBlogFactoryStatus,
  updateBlogPublishConfig,
  updateKnowledge,
  updateTodo,
  validateBlogPublishConfig,
  publishBlogFactoryArticle,
  refreshBlogFactoryVectors,
} from "./api/knowledge";
import {
  createPersonalSecret,
  deletePersonalSecret,
  fetchPersonalSecrets,
  getPersonalSecret,
  readCachedPersonalSecrets,
  revealPersonalSecret,
  updatePersonalSecret,
} from "./api/personalSecrets";
import { fetchHistory, readCachedHistory, refreshHistoryVectors } from "./api/history";
import {
  askHistory,
  createHistoryAskQuickQuestion,
  createHistoryOntology,
  deleteHistoryAskQuickQuestion,
  deleteHistoryOntology,
  fetchHistoryAskLlmConfig,
  fetchHistoryAskDomains,
  fetchHistoryAskQuickQuestions,
  fetchHistoryOntology,
  updateHistoryAskLlmConfig,
  updateHistoryAskQuickQuestion,
  updateHistoryOntology,
} from "./api/historyAsk";
import { cancelCodexJob, fetchCodexConfig, getCodexJob, getLatestCodexJobByOutputMode, startCodexJob } from "./api/codex";
import {
  createCurrentRecord,
  fetchCurrentRecordOptions,
  fetchCurrentRecords,
  readCachedCurrentRecordOptions,
  readCachedCurrentRecords,
  updateCurrentRecord,
} from "./api/currentRecords";
import { releaseCodeToGithub, restartServices, syncCodeToGithub } from "./api/system";
import {
  cancelEnglishMaterialCompletionJob,
  createEnglishMaterial,
  fetchEnglishMaterials,
  fetchNextEnglishMaterialSequence,
  generateEnglishMaterial,
  getEnglishMaterialCompletionJob,
  getEnglishMaterial,
  readCachedEnglishMaterial,
  readCachedEnglishMaterials,
  refreshEnglishMaterialVectors,
  startEnglishMaterialCompletionJob,
  updateEnglishMaterial,
} from "./api/englishMaterials";
import {
  createSkill,
  deleteSkill,
  fetchSkill,
  fetchSkillFile,
  fetchSkills,
  generateSkillDraft,
  updateSkill,
  updateSkillFile,
  uploadSkillZip,
} from "./api/skills";
import { fetchCapabilityAgents, updateCapabilityAgent, updateMyAgentSkills, type CapabilityAgent } from "./api/agents";
import { fetchLlmUsage, readCachedLlmUsage } from "./api/usage";
import { uploadMediaImage } from "./api/media";
import {
  fetchAdminModuleAccess,
  createManagedUser,
  createUserRelation,
  fetchManagedUsers,
  fetchUserRelationGraph,
  fetchUserRelations,
  resetManagedUserPassword,
  updateAdminModuleAccess,
  updateManagedUser,
  updateUserRelation,
} from "./api/users";
import { clearApiResponseCache } from "./api/localCache";
import { Field, FilterClearButton, LoadingStack, MetricTile, SemanticSearchField, VectorRefreshButton, VectorStatusBadge } from "./components/AppShellPrimitives";
import { MarkdownPreview } from "./components/MarkdownPreview";
import {
  copyMarkdownAsEnhancedRichText,
  copyMarkdownAsPlainText,
  copyMarkdownAsRichText,
  removeLeakedMarkdownCodePlaceholders,
} from "./utils/markdown";
import {
  BLOG_FACTORY_PAGE_SIZE,
  CURRENT_RECORDS_PAGE_SIZE,
  ENGLISH_MATERIALS_PAGE_SIZE,
  FACTORY_PAGE_SIZE,
  FUNCTION_NAV_ITEMS,
  HISTORY_PAGE_SIZE,
  OVERVIEW_KNOWLEDGE_LIMIT,
  OVERVIEW_TODO_LIMIT,
  PAGE_SIZE,
  PERSONAL_SECRETS_PAGE_SIZE,
  TODO_PAGE_SIZE,
  USAGE_SAMPLE_LIMIT,
  type FunctionNavItem,
  type BlogFactorySortBy,
  type CurrentRecordSortBy,
  type EnglishMaterialSortBy,
  type HistorySortBy,
  type HistoryVectorStatus,
  type SortDirection,
} from "./uiConfig";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { invalidateApiCache } from "./api/client";
import {
  BLOG_FACTORY_COVER_CATEGORY_STYLE_PRESETS,
  BLOG_FACTORY_COVER_STYLE_PRESETS,
  BLOG_FACTORY_MASK_TOGGLE_OPTIONS,
  DEFAULT_BLOG_FACTORY_COVER_PROMPT_CONFIG,
  DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE,
  appendLogLine,
  applyBlogFactoryMaskRule,
  areTodoDraftsEqual,
  blogFactoryItemToEditDraft,
  blogPublishConfigToDraft,
  buildBlogFactoryCoverImagePrompt,
  buildBlogFactoryArticleExportFileName,
  buildBlogFactoryTaskSummaryCandidates,
  buildBlogFactoryTaskSummary,
  buildBlogFactoryTaskDocumentTitle,
  buildBlogFactoryTaskExportFileName,
  buildCodexKnowledgeDraft,
  buildDayOptions,
  buildFactorySkillPrompt,
  buildMergedKnowledgeDraft,
  buildWeekOptions,
  clearLocationHash,
  clearStoredNewDraft,
  clearStoredUiState,
  clampPercent,
  cloneBlogFactoryMaskRule,
  compactUnique,
  collapseStableUsageSamples,
  copyText,
  createEmptyBlogFactoryKeywordReplacement,
  createEmptyBlogFactoryMaskRule,
  DEFAULT_ENGLISH_MATERIAL_CATEGORY,
  describeBlogFactoryMaskRule,
  ENGLISH_MATERIAL_CATEGORIES,
  englishMaterialItemToDraft,
  extractCodexResultText,
  extractMarkdownHeading,
  filterCnblogsPublishCategories,
  formatAmount,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatHistoryDate,
  formatPercent,
  formatResetDate,
  formatResetDistance,
  formatTimeOnly,
  formatUsagePeriod,
  getHistoryAskFilterEntries,
  getNextWeek,
  getResetReadyAt,
  getTrendBarHeight,
  getUsagePercent,
  hasEnabledBlogFactoryMaskRule,
  isBlankEnglishMaterialDraftExceptSequence,
  isCnblogsPublishConfig,
  isEmptyDraft,
  itemToDraft,
  maskSensitive,
  normalizeBlogFactoryCoverPromptConfig,
  normalizeBlogFactoryMaskRule,
  normalizeCurrentRecordOptions,
  normalizeFactoryTaskResult,
  parseUtcDate,
  readEnglishMaterialIdFromLocation,
  readHistoryAskVectorStatus,
  readOverviewRefreshError,
  readStoredNewDraft,
  readStoredUiState,
  readWeChatApiKeyFromHash,
  readWeChatErrorFromHash,
  resolveBlogFactoryCoverStylePreset,
  resolveBlogFactoryMaskRuleId,
  resolveBlogFactoryPublishMarkdown,
  resolveCurrentAppendTarget,
  resolveDefaultBlogPublishCategories,
  resolvePreferredBlogPublishConfig,
  resolveTodoEditorDraft,
  splitBlogPublishTags,
  todoItemToDraft,
  upsertBlogPublishConfig,
  upsertCodexJobMessage,
  waitForBackendRecovery,
  writeEnglishMaterialIdToLocation,
  writeStoredEnglishMaterialDetailState,
  writeStoredNewDraft,
  writeStoredUiState,
  type AiCodingMessage,
  type AiCodingNoticeStatus,
  type BlogFactoryCoverPromptConfig,
  type BlogFactoryCoverStylePresetId,
  type BlogFactoryArticleCopyMode,
  type BlogFactoryEditDraft,
  type BlogFactoryMaskRule,
  type BlogFactoryTaskCopyMode,
  type BlogPublishConfigDraft,
  type CurrentAppendTarget,
  type MarkdownContentView,
  type StoredUiState,
  type ThemeMode,
} from "./utils/appUtils";
import {
  AI_CODING_DEFAULT_MODEL,
  AI_CODING_MODEL_FALLBACK_OPTIONS,
  buildAiCodingModelOptions,
  formatAiCodingModelLabel,
} from "./views/aiCodingShared";

const OverviewDashboard = lazy(() => import("./views/OverviewDashboard"));
const LlmUsageDashboard = lazy(() => import("./views/LlmUsageDashboard"));
const HistoryExplorer = lazy(() => import("./views/HistoryExplorer"));
const AiCodingWorkspace = lazy(() => import("./views/AiCodingWorkspace"));
const AiGraphWorkspace = lazy(() => import("./views/AiGraphWorkspace"));
import type {
  AdminModuleAccessItem,
  AdminModuleAccessLevel,
  AppView,
  BlogPublishCategory,
  BlogFactoryItem,
  BlogFactoryReviewResult,
  BlogFactoryPublishResult,
  BlogFactoryStatus,
  BlogPublishConfig,
  BlogPublishSubmissionOption,
  BlogPublishType,
  CodexJobSnapshot,
  CodexConfig,
  CurrentDay,
  CurrentRecordItem,
  CurrentRecordOptions,
  CurrentWeek,
  EnglishMaterialCompletionResult,
  EnglishMaterialDraft,
  EnglishMaterialItem,
  GithubSyncResponse,
  HistoryAskResponse,
  HistoryAskDomain,
  HistoryAskQuickQuestion,
  HistoryOntologyDraft,
  HistoryOntologyTerm,
  HistoryItem,
  HistorySummary,
  KnowledgeDraft,
  KnowledgeItem,
  KnowledgeStatus,
  LlmConfig,
  LlmConfigDraft,
  LlmUsageSample,
  ManagedUserCreateDraft,
  ManagedUserItem,
  ManagedUserRole,
  ManagedUserStatus,
  PersonalSecretDraft,
  PersonalSecretItem,
  PersonalSecretRevealField,
  SkillDetail,
  SkillDraft,
  SkillFile,
  SkillSummary,
  SystemRestartResponse,
  TodoDraft,
  TodoItem,
  TodoStatus,
  UserRelationGraphResponse,
  UserRelationItem,
} from "./types";

const emptyDraft: KnowledgeDraft = {
  question: "",
  answer: "",
  source: "",
  topic_tag: "",
  blog_status: "未发布",
};

const emptyTodoDraft: TodoDraft = {
  title: "",
  content: "",
  source: "",
  topic_tag: "",
  todo_status: "待处理",
};

const emptyPersonalSecretDraft: PersonalSecretDraft = {
  system_name: "",
  login_url: "",
  username: "",
  password: "",
  notes: "",
  tags: "",
};

const PWA_SCROLL_STATE_STORAGE_KEY = "trustedKnowledge.scrollState.v1";

type StoredScrollState = {
  windowY: number;
  containers: Record<string, number>;
};

function readStoredScrollState(): StoredScrollState | null {
  try {
    const value = window.localStorage.getItem(PWA_SCROLL_STATE_STORAGE_KEY);
    if (!value) return null;
    const state = JSON.parse(value) as Partial<StoredScrollState>;
    if (typeof state.windowY !== "number" || !state.containers || typeof state.containers !== "object") return null;
    return { windowY: Math.max(0, state.windowY), containers: state.containers };
  } catch {
    return null;
  }
}

function writeStoredScrollState() {
  try {
    const containers: Record<string, number> = {};
    document.querySelectorAll<HTMLElement>("[data-session-scroll]").forEach((element) => {
      const key = element.dataset.sessionScroll;
      if (key) containers[key] = element.scrollTop;
    });
    window.localStorage.setItem(PWA_SCROLL_STATE_STORAGE_KEY, JSON.stringify({ windowY: window.scrollY, containers }));
  } catch {
    // Scroll restoration is a progressive enhancement and must not block the app.
  }
}

const emptyEnglishMaterialDraft: EnglishMaterialDraft = {
  sequence_no: "",
  category: DEFAULT_ENGLISH_MATERIAL_CATEGORY,
  base_expression: "",
  professional_sentence: "",
  chinese_translation: "",
  full_script: "",
  title: "",
  flag: "0",
  card_sections: null,
};

const emptyLlmConfigDraft: LlmConfigDraft = {
  provider_name: "OpenAI Compatible",
  base_url: "",
  model_name: "",
  enabled: false,
};
const emptyHistoryOntologyDraft: HistoryOntologyDraft = { domain_code: "history", name: "", aliases: "", description: "", visibility: "PERSONAL", shared_with_usernames: "" };

const emptySkillDraft: SkillDraft = {
  name: "",
  description: "",
  content: "",
  enabled: true,
  published: false,
};

const emptyBlogPublishConfigDraft: BlogPublishConfigDraft = {
  blogType: "METAWEBLOG_API",
  blogUrl: "",
  username: "",
  password: "",
  apiUrl: "",
  blogName: "",
  isDefault: false,
  validation: null,
};

const emptyManagedUserDraft: ManagedUserCreateDraft = {
  username: "",
  display_name: "",
  password: "",
  role_code: "USER",
  is_admin_role: false,
};

const emptyRelationDraft = {
  parent_user_id: "",
  child_user_id: "",
  relation_type: "GUARDIAN",
};

const MOBILE_VIEWPORT_CONTENT = "width=device-width, initial-scale=1.0, viewport-fit=cover";
const MOBILE_VIEWPORT_RESET_CONTENT =
  "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover";
const emptyOverviewSectionErrors: OverviewSectionErrors = {
  usage: null,
  todos: null,
  knowledge: null,
  english: null,
};
// Navigation and access boundaries.
const SUPER_ADMIN_ONLY_VIEWS: AppView[] = ["users"];
const ADMIN_ROLE_MODULE_VIEWS: AppView[] = ["aiCoding", "usage"];

interface OverviewData {
  usageItems: LlmUsageSample[];
  usageTotal: number;
  processingTodos: TodoItem[];
  processingTodoTotal: number;
  recentKnowledge: KnowledgeItem[];
  knowledgeTotal: number;
  unpublishedKnowledgeTotal: number;
  recentEnglishMaterials: EnglishMaterialItem[];
  englishMaterialTotal: number;
}

interface OverviewSectionErrors {
  usage: string | null;
  todos: string | null;
  knowledge: string | null;
  english: string | null;
}

function canAccessView(view: AppView, authUser: AuthUser | null): boolean {
  if (SUPER_ADMIN_ONLY_VIEWS.includes(view)) {
    return Boolean(authUser?.is_admin);
  }
  if (ADMIN_ROLE_MODULE_VIEWS.includes(view)) {
    return Boolean(authUser?.is_admin || authUser?.visible_admin_modules.includes(view));
  }
  return true;
}

function getVisibleUsers(authUser: AuthUser | null): string[] {
  return authUser?.visible_users ?? [];
}

function getDefaultOwnedUsername(authUser: AuthUser | null): string {
  if (!authUser || authUser.is_admin) return "";
  const visibleUsers = getVisibleUsers(authUser);
  if (visibleUsers.includes(authUser.username)) return authUser.username;
  return visibleUsers[0] ?? authUser.username;
}

function resolveScopedUsernameFilter(authUser: AuthUser | null, currentValue: string): string {
  if (!authUser) return currentValue;
  if (authUser.is_admin) return currentValue;
  const visibleUsers = getVisibleUsers(authUser);
  if (currentValue && visibleUsers.includes(currentValue)) return currentValue;
  return getDefaultOwnedUsername(authUser);
}

function getClearedScopedUsernameFilter(authUser: AuthUser | null, visibleUsers?: string[]): string {
  if (!authUser || authUser.is_admin) return "";
  const scopedUsers = visibleUsers ?? getVisibleUsers(authUser);
  if (scopedUsers.length <= 1) {
    return scopedUsers[0] ?? getDefaultOwnedUsername(authUser);
  }
  return "";
}

type ConversionTarget = "knowledgeToTodo" | "todoToKnowledge";

interface PendingCurrentRecordUpdate {
  record: CurrentRecordItem;
  next: { week: CurrentWeek; day: CurrentDay; content: string };
}

interface CurrentAppendMatchedPoint {
  week: CurrentWeek | "";
  day: CurrentDay | "";
}

const statusStyles: Record<KnowledgeStatus, string> = {
  未发布: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  已发布: "border-mint-300/30 bg-mint-300/10 text-mint-300",
  跳过: "border-amberline/30 bg-amberline/10 text-amberline",
};

const blogFactoryStatusStyles: Record<BlogFactoryStatus, string> = {
  待处理: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  已处理: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  已发布: "border-mint-300/30 bg-mint-300/10 text-mint-300",
  跳过: "border-amberline/30 bg-amberline/10 text-amberline",
};

const todoStatusStyles: Record<TodoStatus, string> = {
  待处理: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  处理中: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  已完成: "border-mint-300/30 bg-mint-300/10 text-mint-300",
};
const todoStatuses: TodoStatus[] = ["待处理", "处理中", "已完成"];

const englishMaterialFlagLabels: Record<EnglishMaterialDraft["flag"], string> = {
  "0": "草稿箱",
  "1": "已发表",
};

const englishMaterialFlagStyles: Record<EnglishMaterialDraft["flag"], string> = {
  "0": "border-slate-500/30 bg-slate-400/10 text-slate-200",
  "1": "border-mint-300/30 bg-mint-300/10 text-mint-300",
};

const FACTORY_CUSTOM_MODEL = "__factory_custom_model__";
const HISTORY_ASK_CONFIGURED_MODEL = "__history_ask_configured_model__";
const KNOWLEDGE_TOPIC_TAG_PATTERN = /^[a-zA-Z0-9_,\s]*$/;
const KNOWLEDGE_TOPIC_TAG_HINT = "多个标签请使用英文逗号（,）分隔，例如：Oracle,APEX；仅支持英文字母、数字、下划线和空格。";

function getKnowledgeTopicTagValidationError(topicTag: string): string | null {
  if (!topicTag.trim() || KNOWLEDGE_TOPIC_TAG_PATTERN.test(topicTag)) return null;
  return KNOWLEDGE_TOPIC_TAG_HINT;
}

function getKnowledgeSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : "提交失败，请稍后重试。";
  return message.includes("CK_TOPIC_TAG") ? KNOWLEDGE_TOPIC_TAG_HINT : message;
}

function getFactoryJobProgressText(job: CodexJobSnapshot): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000));
  const elapsedText = elapsedSeconds >= 60 ? `${Math.floor(elapsedSeconds / 60)} 分 ${elapsedSeconds % 60} 秒` : `${elapsedSeconds} 秒`;
  const lastActivitySeconds = job.last_activity_at
    ? Math.max(0, Math.floor((Date.now() - new Date(job.last_activity_at).getTime()) / 1000))
    : elapsedSeconds;
  if (lastActivitySeconds >= 60) {
    return `已等待 ${elapsedText}，连续 ${lastActivitySeconds} 秒没有新活动，可能在等待外部步骤。可取消后缩短 Skill 或重试。`;
  }
  return `模型正在按所选 Skill 加工（已等待 ${elapsedText}）。${job.last_event ?? "正在等待模型结果。"}`;
}

function App() {
  // Restored UI state and long-lived workspace state.
  const [restoredUiState] = useState<StoredUiState>(() => readStoredUiState());
  const [initialEnglishMaterialRestore] = useState(() => {
    const idFromLocation = readEnglishMaterialIdFromLocation();
    const selectedId = idFromLocation ?? restoredUiState.englishMaterials.selectedId;
    const detailOpen = idFromLocation !== null || (restoredUiState.englishMaterials.detailOpen && selectedId !== null);
    return {
      selectedId,
      detailOpen,
      cachedItem: selectedId ? readCachedEnglishMaterial(selectedId) : null,
    };
  });
  const restoredBlogFactoryArticleDraftRef = useRef(Boolean(restoredUiState.blogFactory.articleDraft));
  const restoredBlogFactorySelectionRef = useRef(restoredUiState.blogFactory.selectedItemId);
  const hasRestoredLatestCodexJobRef = useRef(false);
  const [apiKey, setApiKey] = useState(() => {
    const wechatApiKey = readWeChatApiKeyFromHash();
    if (wechatApiKey) {
      persistApiKey(wechatApiKey);
      clearLocationHash();
      return wechatApiKey;
    }

    return readStoredApiKey();
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readStoredAuthUser());
  const [activeView, setActiveView] = useState<AppView>(
    initialEnglishMaterialRestore.detailOpen ? "englishMaterials" : restoredUiState.activeView,
  );
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(restoredUiState.sidebarExpanded);
  const [isKnowledgeEntryCollapsed, setIsKnowledgeEntryCollapsed] = useState(false);
  const [isMobileKnowledgeEntryCollapsed, setIsMobileKnowledgeEntryCollapsed] = useState(false);
  const [isWorkbenchDetailsCollapsed, setIsWorkbenchDetailsCollapsed] = useState(false);
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(restoredUiState.mobileNavVisible);
  const [themeMode, setThemeMode] = useState<ThemeMode>(restoredUiState.themeMode);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [draft, setDraft] = useState<KnowledgeDraft>(() => restoredUiState.workbench.draft ?? readStoredNewDraft() ?? emptyDraft);
  const [query, setQuery] = useState(restoredUiState.workbench.query);
  const debouncedQuery = useDebouncedValue(query.trim(), 320, () => setPage(1));
  const [workbenchUsername, setWorkbenchUsername] = useState(restoredUiState.workbench.username);
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">(restoredUiState.workbench.statusFilter);
  const [isTodoEntry, setIsTodoEntry] = useState(false);
  const [newTodoStatus, setNewTodoStatus] = useState<TodoStatus>("处理中");
  const [page, setPage] = useState(restoredUiState.workbench.page);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConvertingKnowledgeToTodo, setIsConvertingKnowledgeToTodo] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(restoredUiState.workbench.selectedId);
  const [isMobileKnowledgeEditorOpen, setIsMobileKnowledgeEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const pendingKnowledgeNavigationRef = useRef<"previous" | "next" | null>(null);
  const pendingFactoryNavigationRef = useRef<"previous" | "next" | null>(null);
  const pendingBlogFactoryNavigationRef = useRef<"previous" | "next" | null>(null);
  const [factoryItems, setFactoryItems] = useState<KnowledgeItem[]>([]);
  const [factoryTotalItems, setFactoryTotalItems] = useState(0);
  const [factoryPage, setFactoryPage] = useState(restoredUiState.factory.page);
  const [factoryQuery, setFactoryQuery] = useState(restoredUiState.factory.query);
  const debouncedFactoryQuery = useDebouncedValue(factoryQuery.trim(), 320, () => setFactoryPage(1));
  const [factoryUsername, setFactoryUsername] = useState(restoredUiState.factory.username);
  const [factorySelectedId, setFactorySelectedId] = useState<number | null>(restoredUiState.factory.selectedId);
  const [factoryTask, setFactoryTask] = useState(restoredUiState.factory.task);
  const [factorySkillIds, setFactorySkillIds] = useState<string[]>(restoredUiState.factory.skillIds);
  const [factoryModelName, setFactoryModelName] = useState(
    restoredUiState.factory.modelName === "__factory_history_ask_model__"
      ? FACTORY_CUSTOM_MODEL
      : restoredUiState.factory.modelName || AI_CODING_DEFAULT_MODEL,
  );
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [isFactoryLoading, setIsFactoryLoading] = useState(false);
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(Boolean(restoredUiState.factory.codexJobId));
  const [hasCopiedFactoryTask, setHasCopiedFactoryTask] = useState(false);
  const [factoryCopyError, setFactoryCopyError] = useState<string | null>(null);
  const [isFactoryCopySaving, setIsFactoryCopySaving] = useState(false);
  const [isFactoryAutoSaving, setIsFactoryAutoSaving] = useState(false);
  const [factorySavedKnowledgeId, setFactorySavedKnowledgeId] = useState<number | null>(null);
  const [isFactoryMerging, setIsFactoryMerging] = useState(false);
  const [factoryCodexJobId, setFactoryCodexJobId] = useState<string | null>(restoredUiState.factory.codexJobId);
  const [factoryCodexKnowledgeId, setFactoryCodexKnowledgeId] = useState<number | null>(
    restoredUiState.factory.codexKnowledgeId ?? (restoredUiState.factory.codexJobId ? restoredUiState.factory.selectedId : null),
  );
  const [factoryCodexStatus, setFactoryCodexStatus] = useState(
    restoredUiState.factory.codexJobId ? "正在恢复 Codex 加工状态..." : "",
  );
  const [factoryRefreshToken, setFactoryRefreshToken] = useState(0);
  const [blogFactoryItems, setBlogFactoryItems] = useState<BlogFactoryItem[]>([]);
  const [blogFactoryTotal, setBlogFactoryTotal] = useState(0);
  const [blogFactoryPage, setBlogFactoryPage] = useState(restoredUiState.blogFactory.page);
  const [blogFactoryQuery, setBlogFactoryQuery] = useState(restoredUiState.blogFactory.query);
  const debouncedBlogFactoryQuery = useDebouncedValue(blogFactoryQuery.trim(), 320, () => setBlogFactoryPage(1));
  const [blogFactorySemanticQuery, setBlogFactorySemanticQuery] = useState("");
  const debouncedBlogFactorySemanticQuery = useDebouncedValue(blogFactorySemanticQuery.trim(), 320, () => setBlogFactoryPage(1));
  const [blogFactoryUsername, setBlogFactoryUsername] = useState(restoredUiState.blogFactory.username);
  const [blogFactoryStatus, setBlogFactoryStatus] = useState<BlogFactoryStatus | "all">(restoredUiState.blogFactory.status);
  const [blogFactoryTopic, setBlogFactoryTopic] = useState(restoredUiState.blogFactory.topic);
  const [blogFactoryKnowledgeId, setBlogFactoryKnowledgeId] = useState(restoredUiState.blogFactory.knowledgeId);
  const [blogFactoryVectorStatus, setBlogFactoryVectorStatus] = useState<"all" | "0" | "1">("all");
  const [blogFactorySortBy, setBlogFactorySortBy] = useState<BlogFactorySortBy>(restoredUiState.blogFactory.sortBy);
  const [blogFactorySortDir, setBlogFactorySortDir] = useState<SortDirection>(restoredUiState.blogFactory.sortDir);
  const [selectedBlogFactoryItem, setSelectedBlogFactoryItem] = useState<BlogFactoryItem | null>(null);
  const blogFactoryDetailRequestRef = useRef(0);
  const [isBlogFactoryLoading, setIsBlogFactoryLoading] = useState(false);
  const [isBlogFactoryDetailLoading, setIsBlogFactoryDetailLoading] = useState(false);
  const [isBlogFactoryStatusSaving, setIsBlogFactoryStatusSaving] = useState(false);
  const [isBlogFactoryItemSaving, setIsBlogFactoryItemSaving] = useState(false);
  const blogFactoryAssistSavingTargetsRef = useRef<Set<"summary" | "cover" | "prompt">>(new Set());
  const [blogFactoryAssistSavingTargets, setBlogFactoryAssistSavingTargets] = useState<Array<"summary" | "cover" | "prompt">>([]);
  const [isBlogFactorySendingToProcessing, setIsBlogFactorySendingToProcessing] = useState(false);
  const [isBlogFactoryArticleSaving, setIsBlogFactoryArticleSaving] = useState(false);
  const [isBlogFactoryDeleting, setIsBlogFactoryDeleting] = useState(false);
  const [isMobileBlogFactoryDetailOpen, setIsMobileBlogFactoryDetailOpen] = useState(false);
  const [blogFactoryEditDraft, setBlogFactoryEditDraft] = useState<BlogFactoryEditDraft>({
    taskContent: "",
    questionSnapshot: "",
    answerSnapshot: "",
    sourceSnapshot: "",
    topicTagSnapshot: "",
    assistSummary: "",
    coverImageMarkdown: "",
    coverPromptSnapshot: "",
  });
  const [blogFactoryMaskRules, setBlogFactoryMaskRules] = useState<BlogFactoryMaskRule[]>(() => restoredUiState.blogFactory.maskRules);
  const [selectedBlogFactoryMaskRuleId, setSelectedBlogFactoryMaskRuleId] = useState<string | null>(() =>
    resolveBlogFactoryMaskRuleId(restoredUiState.blogFactory.maskRules, restoredUiState.blogFactory.selectedMaskRuleId),
  );
  const [isBlogFactoryMaskDialogOpen, setIsBlogFactoryMaskDialogOpen] = useState(false);
  const [blogFactoryMaskRuleDraft, setBlogFactoryMaskRuleDraft] = useState<BlogFactoryMaskRule>(() => {
    const selectedRuleId = resolveBlogFactoryMaskRuleId(
      restoredUiState.blogFactory.maskRules,
      restoredUiState.blogFactory.selectedMaskRuleId,
    );
    const selectedRule = restoredUiState.blogFactory.maskRules.find((item) => item.id === selectedRuleId);
    return selectedRule ? cloneBlogFactoryMaskRule(selectedRule) : createEmptyBlogFactoryMaskRule();
  });
  const [blogFactoryMaskError, setBlogFactoryMaskError] = useState<string | null>(null);
  const [blogFactoryMaskNotice, setBlogFactoryMaskNotice] = useState<string | null>(null);
  const [blogFactoryArticleDraft, setBlogFactoryArticleDraft] = useState(restoredUiState.blogFactory.articleDraft);
  const [blogFactoryArticlePathDraft, setBlogFactoryArticlePathDraft] = useState(restoredUiState.blogFactory.articlePathDraft);
  const [blogFactoryArticleError, setBlogFactoryArticleError] = useState<string | null>(null);
  const [blogFactoryArticleCopiedMode, setBlogFactoryArticleCopiedMode] = useState<BlogFactoryArticleCopyMode | null>(null);
  const [blogFactoryCoverPromptTemplate, setBlogFactoryCoverPromptTemplate] = useState(restoredUiState.blogFactory.coverPromptTemplate);
  const [blogFactoryCoverPromptConfig, setBlogFactoryCoverPromptConfig] = useState<BlogFactoryCoverPromptConfig>(
    restoredUiState.blogFactory.coverPromptConfig,
  );
  const [blogFactoryTaskCopyError, setBlogFactoryTaskCopyError] = useState<string | null>(null);
  const [hasCopiedBlogFactoryTask, setHasCopiedBlogFactoryTask] = useState(false);
  const [blogFactoryError, setBlogFactoryError] = useState<string | null>(null);
  const [blogFactoryStatusError, setBlogFactoryStatusError] = useState<string | null>(null);
  const [blogFactoryEditError, setBlogFactoryEditError] = useState<string | null>(null);
  const [blogFactorySendBackNotice, setBlogFactorySendBackNotice] = useState<string | null>(null);
  const [blogFactoryDeleteTarget, setBlogFactoryDeleteTarget] = useState<BlogFactoryItem | null>(null);
  const [blogFactoryRefreshToken, setBlogFactoryRefreshToken] = useState(0);
  const [isBlogFactoryRefreshing, setIsBlogFactoryRefreshing] = useState(false);
  const [isBlogFactoryVectorRefreshing, setIsBlogFactoryVectorRefreshing] = useState(false);
  const [blogPublishConfigs, setBlogPublishConfigs] = useState<BlogPublishConfig[]>([]);
  const [isBlogPublishConfigsLoading, setIsBlogPublishConfigsLoading] = useState(false);
  const [blogPublishConfigsError, setBlogPublishConfigsError] = useState<string | null>(null);
  const [blogPublishConfigDraft, setBlogPublishConfigDraft] = useState<BlogPublishConfigDraft>(emptyBlogPublishConfigDraft);
  const [selectedBlogPublishConfigId, setSelectedBlogPublishConfigId] = useState<number | null>(null);
  const [isBlogPublishConfigDialogOpen, setIsBlogPublishConfigDialogOpen] = useState(false);
  const [isBlogPublishConfigSaving, setIsBlogPublishConfigSaving] = useState(false);
  const [isBlogPublishConfigValidating, setIsBlogPublishConfigValidating] = useState(false);
  const [blogPublishConfigError, setBlogPublishConfigError] = useState<string | null>(null);
  const [blogPublishConfigValidationMessage, setBlogPublishConfigValidationMessage] = useState<string | null>(null);
  const [blogPublishConfigDeleteTarget, setBlogPublishConfigDeleteTarget] = useState<BlogPublishConfig | null>(null);
  const [isBlogPublishConfigDeleting, setIsBlogPublishConfigDeleting] = useState(false);
  const [isBlogPublishDialogOpen, setIsBlogPublishDialogOpen] = useState(false);
  const [blogPublishDialogConfigId, setBlogPublishDialogConfigId] = useState<number | null>(null);
  const [blogPublishDialogMode, setBlogPublishDialogMode] = useState<BlogPublishDialogMode>("publish");
  const [blogPublishSubmissionOption, setBlogPublishSubmissionOption] = useState<BlogPublishSubmissionOption>("CNBLOGS_HOME");
  const [blogPublishCategories, setBlogPublishCategories] = useState<BlogPublishCategory[]>([]);
  const [blogPublishSelectedCategories, setBlogPublishSelectedCategories] = useState<string[]>([]);
  const [blogPublishTagDraft, setBlogPublishTagDraft] = useState("");
  const [isBlogPublishCategoriesLoading, setIsBlogPublishCategoriesLoading] = useState(false);
  const [blogPublishCategoriesError, setBlogPublishCategoriesError] = useState<string | null>(null);
  const [isBlogPublishing, setIsBlogPublishing] = useState(false);
  const [blogPublishError, setBlogPublishError] = useState<string | null>(null);
  const [blogPublishSuccess, setBlogPublishSuccess] = useState<BlogFactoryPublishResult | null>(null);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoTotal, setTodoTotal] = useState(0);
  const [todoPage, setTodoPage] = useState(restoredUiState.todos.page);
  const [todoQuery, setTodoQuery] = useState(restoredUiState.todos.query);
  const debouncedTodoQuery = useDebouncedValue(todoQuery.trim(), 320, () => setTodoPage(1));
  const [todoUsername, setTodoUsername] = useState(restoredUiState.todos.username);
  const [todoStatus, setTodoStatus] = useState<TodoStatus | "all">(restoredUiState.todos.status);
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(restoredUiState.todos.selectedId);
  const [isMobileTodoEditorOpen, setIsMobileTodoEditorOpen] = useState(false);
  const [todoDraft, setTodoDraft] = useState<TodoDraft>(restoredUiState.todos.draft ?? emptyTodoDraft);
  const [todoDraftsById, setTodoDraftsById] = useState<Record<number, TodoDraft>>(() => {
    const restoredDraft = restoredUiState.todos.draft;
    const restoredSelectedId = restoredUiState.todos.selectedId;
    return restoredDraft && restoredSelectedId ? { [restoredSelectedId]: restoredDraft } : {};
  });
  const [isTodoLoading, setIsTodoLoading] = useState(false);
  const [isTodoDetailLoading, setIsTodoDetailLoading] = useState(false);
  const [isTodoSaving, setIsTodoSaving] = useState(false);
  const [isConvertingTodoToKnowledge, setIsConvertingTodoToKnowledge] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [todoSaveError, setTodoSaveError] = useState<string | null>(null);
  const [todoCopyError, setTodoCopyError] = useState<string | null>(null);
  const [hasCopiedTodoContent, setHasCopiedTodoContent] = useState(false);
  const [todoRefreshToken, setTodoRefreshToken] = useState(0);
  const [personalSecretItems, setPersonalSecretItems] = useState<PersonalSecretItem[]>([]);
  const [personalSecretTotal, setPersonalSecretTotal] = useState(0);
  const [personalSecretPage, setPersonalSecretPage] = useState(restoredUiState.personalSecrets.page);
  const [personalSecretQuery, setPersonalSecretQuery] = useState(restoredUiState.personalSecrets.query);
  const debouncedPersonalSecretQuery = useDebouncedValue(personalSecretQuery.trim(), 320, () => setPersonalSecretPage(1));
  const [selectedPersonalSecretId, setSelectedPersonalSecretId] = useState<number | null>(restoredUiState.personalSecrets.selectedId);
  const [personalSecretDraft, setPersonalSecretDraft] = useState<PersonalSecretDraft>(emptyPersonalSecretDraft);
  const [isPersonalSecretEditorOpen, setIsPersonalSecretEditorOpen] = useState(false);
  const [isMobilePersonalSecretDetailOpen, setIsMobilePersonalSecretDetailOpen] = useState(
    restoredUiState.personalSecrets.mobileDetailOpen,
  );
  const [isPersonalSecretLoading, setIsPersonalSecretLoading] = useState(false);
  const [isPersonalSecretDetailLoading, setIsPersonalSecretDetailLoading] = useState(false);
  const [isPersonalSecretSaving, setIsPersonalSecretSaving] = useState(false);
  const [isPersonalSecretDeleting, setIsPersonalSecretDeleting] = useState(false);
  const [personalSecretError, setPersonalSecretError] = useState<string | null>(null);
  const [personalSecretSaveError, setPersonalSecretSaveError] = useState<string | null>(null);
  const [personalSecretCopyNotice, setPersonalSecretCopyNotice] = useState<string | null>(null);
  const [personalSecretCopiedField, setPersonalSecretCopiedField] = useState<PersonalSecretRevealField | null>(null);
  const [personalSecretRefreshToken, setPersonalSecretRefreshToken] = useState(0);
  const [pendingTodoCurrentAppend, setPendingTodoCurrentAppend] = useState<TodoItem | null>(null);
  const [todoCurrentAppendTarget, setTodoCurrentAppendTarget] = useState<CurrentAppendTarget>({
    username: "",
    type: "",
    week: "",
    day: "",
  });
  const [todoCurrentAppendMatchedPoint, setTodoCurrentAppendMatchedPoint] = useState<CurrentAppendMatchedPoint>({
    week: "",
    day: "",
  });
  const [todoCurrentAppendError, setTodoCurrentAppendError] = useState<string | null>(null);
  const [isTodoCurrentAppendOptionsLoading, setIsTodoCurrentAppendOptionsLoading] = useState(false);
  const [isAppendingTodoToCurrent, setIsAppendingTodoToCurrent] = useState(false);
  const todoCurrentAppendRequestRef = useRef(0);
  const todoCurrentAppendTargetRef = useRef<CurrentAppendTarget>({
    username: "",
    type: "",
    week: "",
    day: "",
  });
  const todoDraftsByIdRef = useRef<Record<number, TodoDraft>>(todoDraftsById);
  todoDraftsByIdRef.current = todoDraftsById;
  const todoDetailRequestRef = useRef(0);
  const pendingTodoNavigationRef = useRef<"previous" | "next" | null>(null);
  const selectedTodoSavedStatusRef = useRef<TodoStatus | null>(restoredUiState.todos.draft?.todo_status ?? null);
  const selectedTodoSavedDraftRef = useRef<TodoDraft>(restoredUiState.todos.draft ?? emptyTodoDraft);
  const [conversionTarget, setConversionTarget] = useState<ConversionTarget | null>(null);
  const [currentRecordItems, setCurrentRecordItems] = useState<CurrentRecordItem[]>([]);
  const [currentRecordTotal, setCurrentRecordTotal] = useState(0);
  const [currentRecordPage, setCurrentRecordPage] = useState(restoredUiState.currentRecords.page);
  const [currentRecordQuery, setCurrentRecordQuery] = useState(restoredUiState.currentRecords.query);
  const debouncedCurrentRecordQuery = useDebouncedValue(currentRecordQuery.trim(), 320, () => setCurrentRecordPage(1));
  const [currentRecordUsername, setCurrentRecordUsername] = useState(restoredUiState.currentRecords.username);
  const [currentRecordTypeFilter, setCurrentRecordTypeFilter] = useState(restoredUiState.currentRecords.type);
  const [currentRecordWeek, setCurrentRecordWeek] = useState(restoredUiState.currentRecords.week);
  const [currentRecordDay, setCurrentRecordDay] = useState(restoredUiState.currentRecords.day);
  const [currentRecordLearnLevel, setCurrentRecordLearnLevel] = useState(restoredUiState.currentRecords.learnLevel);
  const [currentRecordSortBy, setCurrentRecordSortBy] = useState<CurrentRecordSortBy>(restoredUiState.currentRecords.sortBy);
  const [currentRecordSortDir, setCurrentRecordSortDir] = useState<SortDirection>(restoredUiState.currentRecords.sortDir);
  const [currentRecordOptions, setCurrentRecordOptions] = useState<CurrentRecordOptions>({
    users: [],
    types: [],
    user_types: {},
    weeks: buildWeekOptions(),
    days: buildDayOptions(),
    learn_levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  });
  const [currentRecordDraft, setCurrentRecordDraft] = useState(restoredUiState.currentRecords.draft);
  const [selectedCurrentRecord, setSelectedCurrentRecord] = useState<CurrentRecordItem | null>(null);
  const [isCurrentRecordLoading, setIsCurrentRecordLoading] = useState(false);
  const [isCurrentRecordOptionsLoading, setIsCurrentRecordOptionsLoading] = useState(false);
  const [isCurrentRecordSaving, setIsCurrentRecordSaving] = useState(false);
  const [isCurrentRecordUpdating, setIsCurrentRecordUpdating] = useState(false);
  const [currentRecordError, setCurrentRecordError] = useState<string | null>(null);
  const [currentRecordSaveError, setCurrentRecordSaveError] = useState<string | null>(null);
  const [currentRecordRefreshToken, setCurrentRecordRefreshToken] = useState(0);
  const [pendingCurrentRecordUpdate, setPendingCurrentRecordUpdate] = useState<PendingCurrentRecordUpdate | null>(null);
  const [englishMaterialItems, setEnglishMaterialItems] = useState<EnglishMaterialItem[]>([]);
  const [englishMaterialTotal, setEnglishMaterialTotal] = useState(0);
  const [englishMaterialPage, setEnglishMaterialPage] = useState(restoredUiState.englishMaterials.page);
  const [englishMaterialQuery, setEnglishMaterialQuery] = useState(restoredUiState.englishMaterials.query);
  const debouncedEnglishMaterialQuery = useDebouncedValue(englishMaterialQuery.trim(), 320, () => setEnglishMaterialPage(1));
  const [englishMaterialSemanticQuery, setEnglishMaterialSemanticQuery] = useState("");
  const debouncedEnglishMaterialSemanticQuery = useDebouncedValue(englishMaterialSemanticQuery.trim(), 320, () => setEnglishMaterialPage(1));
  const [englishMaterialUsername, setEnglishMaterialUsername] = useState(restoredUiState.englishMaterials.username);
  const [englishMaterialCategory, setEnglishMaterialCategory] = useState(restoredUiState.englishMaterials.category);
  const [englishMaterialFlag, setEnglishMaterialFlag] = useState(restoredUiState.englishMaterials.flag);
  const [englishMaterialVectorStatus, setEnglishMaterialVectorStatus] = useState<"all" | "0" | "1">("all");
  const [englishMaterialSortBy, setEnglishMaterialSortBy] = useState<EnglishMaterialSortBy>(restoredUiState.englishMaterials.sortBy);
  const [englishMaterialSortDir, setEnglishMaterialSortDir] = useState<SortDirection>(restoredUiState.englishMaterials.sortDir);
  const [selectedEnglishMaterial, setSelectedEnglishMaterial] = useState<EnglishMaterialItem | null>(initialEnglishMaterialRestore.cachedItem);
  todoCurrentAppendTargetRef.current = todoCurrentAppendTarget;
  const [isEnglishMaterialDetailOpen, setIsEnglishMaterialDetailOpen] = useState(initialEnglishMaterialRestore.detailOpen);
  const [isEnglishMaterialCreateOpen, setIsEnglishMaterialCreateOpen] = useState(false);
  const [englishMaterialDraft, setEnglishMaterialDraft] = useState<EnglishMaterialDraft>(restoredUiState.englishMaterials.draft);
  const [englishMaterialDetailDraft, setEnglishMaterialDetailDraft] = useState<EnglishMaterialDraft>(
    initialEnglishMaterialRestore.cachedItem ? englishMaterialItemToDraft(initialEnglishMaterialRestore.cachedItem) : emptyEnglishMaterialDraft,
  );
  const [isEnglishMaterialLoading, setIsEnglishMaterialLoading] = useState(false);
  const [isEnglishMaterialDetailLoading, setIsEnglishMaterialDetailLoading] = useState(false);
  const [isEnglishMaterialSaving, setIsEnglishMaterialSaving] = useState(false);
  const [isEnglishMaterialDetailSaving, setIsEnglishMaterialDetailSaving] = useState(false);
  const [englishMaterialCopiedLabel, setEnglishMaterialCopiedLabel] = useState<string | null>(null);
  const [englishMaterialError, setEnglishMaterialError] = useState<string | null>(null);
  const [englishMaterialSaveError, setEnglishMaterialSaveError] = useState<string | null>(null);
  const [englishMaterialRefreshToken, setEnglishMaterialRefreshToken] = useState(0);
  const [isEnglishMaterialVectorRefreshing, setIsEnglishMaterialVectorRefreshing] = useState(false);
  const englishMaterialSequenceTouchedRef = useRef(
    Boolean(restoredUiState.englishMaterials.draft.sequence_no) &&
      !isBlankEnglishMaterialDraftExceptSequence(restoredUiState.englishMaterials.draft),
  );
  const hasRestoredEnglishMaterialDetailRef = useRef(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySummary, setHistorySummary] = useState<HistorySummary>({
    total: 0,
    types: [],
    users: [],
    user_types: {},
    min_date: null,
    max_date: null,
  });
  const [historyPage, setHistoryPage] = useState(restoredUiState.history.page);
  const [historyQuery, setHistoryQuery] = useState(restoredUiState.history.query);
  const debouncedHistoryQuery = useDebouncedValue(historyQuery.trim(), 320, () => setHistoryPage(1));
  const [historySemanticQuery, setHistorySemanticQuery] = useState(restoredUiState.history.semanticQuery);
  const [historyType, setHistoryType] = useState(restoredUiState.history.type);
  const [historyUsername, setHistoryUsername] = useState(restoredUiState.history.username);
  const [historyWeek, setHistoryWeek] = useState(restoredUiState.history.week);
  const [historyDay, setHistoryDay] = useState(restoredUiState.history.day);
  const [historyLearnLevel, setHistoryLearnLevel] = useState(restoredUiState.history.learnLevel);
  const [historyVectorStatus, setHistoryVectorStatus] = useState<HistoryVectorStatus>(restoredUiState.history.vectorStatus);
  const [historyDateFrom, setHistoryDateFrom] = useState(restoredUiState.history.dateFrom);
  const [historyDateTo, setHistoryDateTo] = useState(restoredUiState.history.dateTo);
  const [historySortBy, setHistorySortBy] = useState<HistorySortBy>(restoredUiState.history.sortBy);
  const [historySortDir, setHistorySortDir] = useState<SortDirection>(restoredUiState.history.sortDir);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryVectorRefreshing, setIsHistoryVectorRefreshing] = useState(false);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [historyAskQuestion, setHistoryAskQuestion] = useState(restoredUiState.historyAsk.question);
  const [historyAskModelName, setHistoryAskModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [historyAskAnswer, setHistoryAskAnswer] = useState<HistoryAskResponse | null>(restoredUiState.historyAsk.answer);
  const [historyAskError, setHistoryAskError] = useState<string | null>(null);
  const [hasCopiedHistoryAskAnswer, setHasCopiedHistoryAskAnswer] = useState(false);
  const [isHistoryAsking, setIsHistoryAsking] = useState(false);
  const [historyAskLlmConfig, setHistoryAskLlmConfig] = useState<LlmConfig | null>(null);
  const [historyAskLlmConfigDraft, setHistoryAskLlmConfigDraft] = useState<LlmConfigDraft>(emptyLlmConfigDraft);
  const [isHistoryAskLlmConfigLoading, setIsHistoryAskLlmConfigLoading] = useState(false);
  const [isHistoryAskLlmConfigSaving, setIsHistoryAskLlmConfigSaving] = useState(false);
  const [historyAskLlmConfigError, setHistoryAskLlmConfigError] = useState<string | null>(null);
  const [historyAskLlmConfigSaved, setHistoryAskLlmConfigSaved] = useState(false);
  const [historyAskSkillIds, setHistoryAskSkillIds] = useState<string[]>(restoredUiState.historyAsk.skillIds);
  const [historyAskDomains, setHistoryAskDomains] = useState<HistoryAskDomain[]>([]);
  const [historyAskDomainCode, setHistoryAskDomainCode] = useState<"history" | "todos" | "knowledge" | "english_materials">("history");
  const [historyAskQuickQuestions, setHistoryAskQuickQuestions] = useState<HistoryAskQuickQuestion[]>([]);
  const [isHistoryAskQuickQuestionsLoading, setIsHistoryAskQuickQuestionsLoading] = useState(false);
  const [isHistoryAskQuickQuestionSaving, setIsHistoryAskQuickQuestionSaving] = useState(false);
  const [historyAskQuickQuestionError, setHistoryAskQuickQuestionError] = useState<string | null>(null);
  const [historyOntologyTerms, setHistoryOntologyTerms] = useState<HistoryOntologyTerm[]>([]);
  const [historyOntologyDraft, setHistoryOntologyDraft] = useState<HistoryOntologyDraft>(emptyHistoryOntologyDraft);
  const [historyOntologyEditingId, setHistoryOntologyEditingId] = useState<number | null>(null);
  const [isHistoryOntologyLoading, setIsHistoryOntologyLoading] = useState(false);
  const [isHistoryOntologySaving, setIsHistoryOntologySaving] = useState(false);
  const [historyOntologyError, setHistoryOntologyError] = useState<string | null>(null);
  const [skillItems, setSkillItems] = useState<SkillSummary[]>([]);
  const [skillTotal, setSkillTotal] = useState(0);
  const [skillQuery, setSkillQuery] = useState("");
  const debouncedSkillQuery = useDebouncedValue(skillQuery.trim());
  const [skillListScope, setSkillListScope] = useState<"owned" | "shared">("owned");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [skillDeleteTarget, setSkillDeleteTarget] = useState<SkillDetail | null>(null);
  const [newSkillDraft, setNewSkillDraft] = useState<SkillDraft>(emptySkillDraft);
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(emptySkillDraft);
  const [selectedSkillFile, setSelectedSkillFile] = useState<SkillFile | null>(null);
  const [skillFileContent, setSkillFileContent] = useState("");
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [isSkillDetailLoading, setIsSkillDetailLoading] = useState(false);
  const skillDetailRequestIdRef = useRef(0);
  const [isSkillSaving, setIsSkillSaving] = useState(false);
  const [isSkillFileSaving, setIsSkillFileSaving] = useState(false);
  const [isSkillUploading, setIsSkillUploading] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSaveError, setSkillSaveError] = useState<string | null>(null);
  const [skillSavedLabel, setSkillSavedLabel] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUserItem[]>([]);
  const [managedUserTotal, setManagedUserTotal] = useState(0);
  const [managedUserQuery, setManagedUserQuery] = useState("");
  const debouncedManagedUserQuery = useDebouncedValue(managedUserQuery.trim());
  const [managedUserDraft, setManagedUserDraft] = useState<ManagedUserCreateDraft>(emptyManagedUserDraft);
  const [userRelations, setUserRelations] = useState<UserRelationItem[]>([]);
  const [userRelationGraph, setUserRelationGraph] = useState<UserRelationGraphResponse | null>(null);
  const [adminModuleItems, setAdminModuleItems] = useState<AdminModuleAccessItem[]>([]);
  const [relationDraft, setRelationDraft] = useState(emptyRelationDraft);
  const [isUserManagementLoading, setIsUserManagementLoading] = useState(false);
  const [isUserManagementSaving, setIsUserManagementSaving] = useState(false);
  const [userManagementError, setUserManagementError] = useState<string | null>(null);
  const [userManagementSavedLabel, setUserManagementSavedLabel] = useState<string | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<ManagedUserItem | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [usageItems, setUsageItems] = useState<LlmUsageSample[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [isUsageRefreshing, setIsUsageRefreshing] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);
  const [overviewData, setOverviewData] = useState<OverviewData>({
    usageItems: [],
    usageTotal: 0,
    processingTodos: [],
    processingTodoTotal: 0,
    recentKnowledge: [],
    knowledgeTotal: 0,
    unpublishedKnowledgeTotal: 0,
    recentEnglishMaterials: [],
    englishMaterialTotal: 0,
  });
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isOverviewRefreshing, setIsOverviewRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewSectionErrors, setOverviewSectionErrors] =
    useState<OverviewSectionErrors>(emptyOverviewSectionErrors);
  const [overviewUpdatedAt, setOverviewUpdatedAt] = useState<string | null>(null);
  const [overviewRefreshToken, setOverviewRefreshToken] = useState(0);
  const [overviewEnglishLimit, setOverviewEnglishLimit] = useState(3);
  const [aiCodingPrompt, setAiCodingPrompt] = useState(restoredUiState.aiCoding.prompt);
  const [aiCodingModelName, setAiCodingModelName] = useState(
    restoredUiState.aiCoding.modelName === AI_CODING_DEFAULT_MODEL ||
      AI_CODING_MODEL_FALLBACK_OPTIONS.includes(restoredUiState.aiCoding.modelName)
      ? restoredUiState.aiCoding.modelName
      : AI_CODING_DEFAULT_MODEL,
  );
  const [aiCodingMessages, setAiCodingMessages] = useState<AiCodingMessage[]>(restoredUiState.aiCoding.messages);
  const [activeCodexJobId, setActiveCodexJobId] = useState<string | null>(restoredUiState.aiCoding.activeJobId);
  const [liveCodexOutput, setLiveCodexOutput] = useState("");
  const [liveCodexErrorOutput, setLiveCodexErrorOutput] = useState("");
  const [liveCodexStatus, setLiveCodexStatus] = useState(restoredUiState.aiCoding.activeJobId ? "正在恢复 Codex 任务状态..." : "");
  const [liveCodexLastActivityAt, setLiveCodexLastActivityAt] = useState<string | null>(null);
  const [liveCodexLastEvent, setLiveCodexLastEvent] = useState<string | null>(null);
  const [isCodexRunning, setIsCodexRunning] = useState(Boolean(restoredUiState.aiCoding.activeJobId));
  const [aiCodingNoticeStatus, setAiCodingNoticeStatus] = useState<AiCodingNoticeStatus | null>(
    restoredUiState.aiCoding.activeJobId ? "running" : null,
  );
  const [codexError, setCodexError] = useState<string | null>(null);
  const [codexArchiveLoadingId, setCodexArchiveLoadingId] = useState<number | null>(null);
  const [codexArchiveError, setCodexArchiveError] = useState<string | null>(null);
  const [restartConfirm, setRestartConfirm] = useState("");
  const [restartResponse, setRestartResponse] = useState<SystemRestartResponse | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [isRestartingServices, setIsRestartingServices] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState<GithubSyncResponse | null>(restoredUiState.aiCoding.githubSyncStatus);
  const [codexConfig, setCodexConfig] = useState<CodexConfig | null>(null);
  const [isCodexConfigLoading, setIsCodexConfigLoading] = useState(false);
  const [codexConfigError, setCodexConfigError] = useState<string | null>(null);
  const [projectChangelogRefreshToken, setProjectChangelogRefreshToken] = useState(0);

  const canAccessAiCoding = canAccessView("aiCoding", authUser);
  const canAccessUsage = canAccessView("usage", authUser);
  const availableFunctionNavItems = useMemo(
    () => FUNCTION_NAV_ITEMS.filter((item) => canAccessView(item.view, authUser)),
    [authUser],
  );
  const [githubSyncError, setGithubSyncError] = useState<string | null>(null);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);

  function applyAiCodingJobSnapshot(job: CodexJobSnapshot) {
    setLiveCodexOutput(job.output);
    setLiveCodexErrorOutput(job.error_output);
    setLiveCodexLastActivityAt(job.last_activity_at);
    setLiveCodexLastEvent(job.last_event);
    setAiCodingMessages((current) => upsertCodexJobMessage(current, job));

    if (job.status === "running") {
      setActiveCodexJobId(job.job_id);
      setIsCodexRunning(true);
      setCodexError(null);
      setAiCodingNoticeStatus("running");
      setLiveCodexStatus("Codex 正在运行，离开页面后仍可回来查看结果...");
      return;
    }

    setIsCodexRunning(false);
    setActiveCodexJobId(null);
    setAiCodingNoticeStatus(job.status);
    setLiveCodexStatus(
      job.status === "completed" ? "Codex 执行完成。" : job.status === "cancelled" ? "Codex 任务已终止。" : "Codex 执行出现错误。",
    );
    setCodexError(job.status === "failed" ? job.error_message ?? "Codex 执行失败，请稍后重试。" : null);
  }

  async function restoreLatestAiCodingJob() {
    return getLatestCodexJobByOutputMode("full");
  }

  const factoryModelOptions = useMemo(() => {
    const options = buildAiCodingModelOptions(codexConfig);
    options.push({ value: FACTORY_CUSTOM_MODEL, label: "其他模型" });
    return options;
  }, [codexConfig]);

  const historyAskModelOptions = useMemo(() => {
    const options = buildAiCodingModelOptions(codexConfig);
    options.push({ value: HISTORY_ASK_CONFIGURED_MODEL, label: "已配置模型" });
    return options;
  }, [codexConfig]);

  function resolveFactoryModelName() {
    if (factoryModelName === AI_CODING_DEFAULT_MODEL) return "";
    if (factoryModelName === FACTORY_CUSTOM_MODEL) return "";
    return factoryModelName.trim();
  }

  // Loading, polling, cache hydration, and persistence effects.
  useEffect(() => {
    if (!apiKey || (activeView !== "factory" && activeView !== "historyAsk")) return;
    if (isCodexConfigLoading || codexConfig) return;

    let cancelled = false;
    setIsCodexConfigLoading(true);
    setCodexConfigError(null);

    fetchCodexConfig()
      .then((config) => {
        if (cancelled) return;
        setCodexConfig({
          default_model_name: config.default_model_name,
          available_models:
            config.available_models.length > 0 ? config.available_models : AI_CODING_MODEL_FALLBACK_OPTIONS,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setCodexConfig({
          default_model_name: null,
          available_models: AI_CODING_MODEL_FALLBACK_OPTIONS,
        });
        setCodexConfigError(error instanceof Error ? error.message : "Codex 模型配置读取失败。");
      })
      .finally(() => {
        if (!cancelled) setIsCodexConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, apiKey, codexConfig, isCodexConfigLoading]);

  useEffect(() => {
    if (!isMobileViewport()) return;

    let resetTimer: number | undefined;

    function handleFocusOut(event: FocusEvent) {
      if (!isEditableElement(event.target)) return;

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (!isEditableElement(document.activeElement)) {
          restoreMobileViewportScale({ blurActiveElement: false });
        }
      }, 180);
    }

    function handleViewportChange() {
      restoreMobileViewportScale();
    }

    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.clearTimeout(resetTimer);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearApiResponseCache();
      clearStoredUiState();
      setApiKey(null);
      setAuthUser(null);
      setItems([]);
      setWorkbenchUsername("");
      setSelectedId(null);
      setIsMobileKnowledgeEditorOpen(false);
      setIsConvertingKnowledgeToTodo(false);
      setFactoryItems([]);
      setFactorySelectedId(null);
      setFactoryUsername("");
      setFactoryTask("");
      setFactoryCodexJobId(null);
      setFactoryCodexKnowledgeId(null);
      setFactoryCodexStatus("");
      setIsFactoryGenerating(false);
      setIsFactoryAutoSaving(false);
      setFactorySavedKnowledgeId(null);
      setBlogFactoryItems([]);
      setBlogFactoryUsername("");
      setBlogFactoryTotal(0);
      setSelectedBlogFactoryItem(null);
      setBlogFactoryMaskRules([]);
      setSelectedBlogFactoryMaskRuleId(null);
      setIsBlogFactoryMaskDialogOpen(false);
      setBlogFactoryMaskRuleDraft(createEmptyBlogFactoryMaskRule());
      setBlogFactoryMaskError(null);
      setBlogFactoryMaskNotice(null);
      setTodoItems([]);
      setTodoUsername("");
      setTodoTotal(0);
      setSelectedTodoId(null);
      selectedTodoSavedStatusRef.current = null;
      selectedTodoSavedDraftRef.current = emptyTodoDraft;
      setIsMobileTodoEditorOpen(false);
      setTodoCopyError(null);
      setHasCopiedTodoContent(false);
      setIsConvertingTodoToKnowledge(false);
      setTodoDraftsById({});
      setPersonalSecretItems([]);
      setPersonalSecretTotal(0);
      setSelectedPersonalSecretId(null);
      setPersonalSecretDraft(emptyPersonalSecretDraft);
      setIsPersonalSecretEditorOpen(false);
      setPersonalSecretCopyNotice(null);
      setPersonalSecretCopiedField(null);
      resetTodoCurrentAppendState();
      setIsAppendingTodoToCurrent(false);
      setConversionTarget(null);
      setCurrentRecordItems([]);
      setCurrentRecordTotal(0);
      setSelectedCurrentRecord(null);
      setPendingCurrentRecordUpdate(null);
      setEnglishMaterialItems([]);
      setEnglishMaterialUsername("");
      setEnglishMaterialTotal(0);
      setSelectedEnglishMaterial(null);
      setUsageItems([]);
      setUsageTotal(0);
      setOverviewData({
        usageItems: [],
        usageTotal: 0,
        processingTodos: [],
        processingTodoTotal: 0,
        recentKnowledge: [],
        knowledgeTotal: 0,
        unpublishedKnowledgeTotal: 0,
        recentEnglishMaterials: [],
        englishMaterialTotal: 0,
      });
      setOverviewSectionErrors(emptyOverviewSectionErrors);
      setOverviewUpdatedAt(null);
      setHistoryItems([]);
      setHistoryTotal(0);
      setHistoryAskAnswer(null);
      setHasCopiedHistoryAskAnswer(false);
      setHistoryAskLlmConfig(null);
      setHistoryAskLlmConfigDraft(emptyLlmConfigDraft);
      setHistoryAskLlmConfigSaved(false);
      setHistoryAskSkillIds([]);
      setSkillItems([]);
      setSkillTotal(0);
      setSelectedSkill(null);
      setSelectedSkillFile(null);
      setSkillFileContent("");
      setSkillError(null);
      setSkillSaveError(null);
      setManagedUsers([]);
      setManagedUserTotal(0);
      setUserRelations([]);
      setUserRelationGraph(null);
      setManagedUserDraft(emptyManagedUserDraft);
      setRelationDraft(emptyRelationDraft);
      setResetPasswordTarget(null);
      setResetPasswordValue("");
      setUserManagementError(null);
      setAiCodingMessages([]);
      setAiCodingModelName(AI_CODING_DEFAULT_MODEL);
      setCodexConfig(null);
      setCodexConfigError(null);
      setActiveCodexJobId(null);
      setIsCodexRunning(false);
      setLiveCodexOutput("");
      setLiveCodexErrorOutput("");
      setLiveCodexStatus("");
      setAiCodingNoticeStatus(null);
      setCodexError(null);
      setCodexArchiveLoadingId(null);
      setCodexArchiveError(null);
      setRestartResponse(null);
      setRestartError(null);
    };

    window.addEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    if (authUser) return;

    let mounted = true;
    fetchCurrentAuthUser()
      .then((user) => {
        if (!mounted) return;
        persistAuthUser(user);
        setAuthUser(user);
      })
      .catch(() => {
        if (mounted) setAuthUser(null);
      });

    return () => {
      mounted = false;
    };
  }, [apiKey, authUser]);

  useEffect(() => {
    if (!authUser) return;

    setWorkbenchUsername((current) => resolveScopedUsernameFilter(authUser, current));
    setFactoryUsername((current) => resolveScopedUsernameFilter(authUser, current));
    setBlogFactoryUsername((current) => resolveScopedUsernameFilter(authUser, current));
    setTodoUsername((current) => resolveScopedUsernameFilter(authUser, current));
    setEnglishMaterialUsername((current) => resolveScopedUsernameFilter(authUser, current));
  }, [authUser]);

  useEffect(() => {
    if (activeView !== "workbench") {
      setIsMobileKnowledgeEditorOpen(false);
    }
    if (activeView !== "todos") {
      setIsMobileTodoEditorOpen(false);
    }
  }, [activeView]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeMode;
    root.style.colorScheme = themeMode;

    const themeColor = themeMode === "light" ? "#f4f7f9" : "#0f766e";
    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", themeColor);
    }
  }, [themeMode]);

  useEffect(() => {
    const savedScrollState = readStoredScrollState();
    if (savedScrollState) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollState.windowY });
        Object.entries(savedScrollState.containers).forEach(([key, scrollTop]) => {
          const element = document.querySelector<HTMLElement>(`[data-session-scroll="${key}"]`);
          if (element) element.scrollTop = scrollTop;
        });
      });
    }

    const persistScrollState = () => writeStoredScrollState();
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistScrollState();
    };
    window.addEventListener("pagehide", persistScrollState);
    document.addEventListener("visibilitychange", persistWhenHidden);
    return () => {
      window.removeEventListener("pagehide", persistScrollState);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    writeStoredUiState({
      activeView,
      sidebarExpanded: isSidebarExpanded,
      mobileNavVisible: isMobileNavVisible,
      themeMode,
      workbench: {
        query,
        username: workbenchUsername,
        statusFilter,
        page,
        selectedId,
        draft,
      },
      factory: {
        query: factoryQuery,
        username: factoryUsername,
        page: factoryPage,
        selectedId: factorySelectedId,
        task: factoryTask,
        skillIds: factorySkillIds,
        modelName: factoryModelName,
        customModelName: "",
        codexJobId: factoryCodexJobId,
        codexKnowledgeId: factoryCodexKnowledgeId,
      },
      blogFactory: {
        query: blogFactoryQuery,
        username: blogFactoryUsername,
        page: blogFactoryPage,
        status: blogFactoryStatus,
        topic: blogFactoryTopic,
        knowledgeId: blogFactoryKnowledgeId,
        sortBy: blogFactorySortBy,
        sortDir: blogFactorySortDir,
        selectedItemId: selectedBlogFactoryItem?.id ?? restoredBlogFactorySelectionRef.current,
        articleDraft: blogFactoryArticleDraft,
        articlePathDraft: blogFactoryArticlePathDraft,
        maskRules: blogFactoryMaskRules,
        selectedMaskRuleId: selectedBlogFactoryMaskRuleId,
        coverPromptTemplate: blogFactoryCoverPromptTemplate,
        coverPromptConfig: blogFactoryCoverPromptConfig,
      },
      personalSecrets: {
        query: personalSecretQuery,
        page: personalSecretPage,
        selectedId: selectedPersonalSecretId,
        mobileDetailOpen: isMobilePersonalSecretDetailOpen,
      },
      todos: {
        query: todoQuery,
        username: todoUsername,
        page: todoPage,
        status: todoStatus,
        selectedId: selectedTodoId,
        draft: selectedTodoId ? todoDraft : null,
      },
      currentRecords: {
        query: currentRecordQuery,
        page: currentRecordPage,
        username: currentRecordUsername,
        type: currentRecordTypeFilter,
        week: currentRecordWeek,
        day: currentRecordDay,
        learnLevel: currentRecordLearnLevel,
        sortBy: currentRecordSortBy,
        sortDir: currentRecordSortDir,
        draft: currentRecordDraft,
      },
      englishMaterials: {
        query: englishMaterialQuery,
        username: englishMaterialUsername,
        page: englishMaterialPage,
        category: englishMaterialCategory,
        flag: englishMaterialFlag,
        sortBy: englishMaterialSortBy,
        sortDir: englishMaterialSortDir,
        selectedId: selectedEnglishMaterial?.id ?? null,
        detailOpen: isEnglishMaterialDetailOpen,
        draft: englishMaterialDraft,
      },
      history: {
        query: historyQuery,
        semanticQuery: historySemanticQuery,
        page: historyPage,
        type: historyType,
        username: historyUsername,
        week: historyWeek,
        day: historyDay,
        learnLevel: historyLearnLevel,
        vectorStatus: historyVectorStatus,
        dateFrom: historyDateFrom,
        dateTo: historyDateTo,
        sortBy: historySortBy,
        sortDir: historySortDir,
      },
      historyAsk: {
        question: historyAskQuestion,
        answer: historyAskAnswer,
        skillIds: historyAskSkillIds,
      },
      aiCoding: {
        prompt: aiCodingPrompt,
        modelName: aiCodingModelName,
        messages: aiCodingMessages,
        activeJobId: activeCodexJobId,
        githubSyncStatus,
      },
    });
  }, [
    activeView,
    activeCodexJobId,
    aiCodingMessages,
    aiCodingModelName,
    aiCodingPrompt,
    apiKey,
    blogFactoryArticleDraft,
    blogFactoryArticlePathDraft,
    blogFactoryCoverPromptTemplate,
    blogFactoryMaskRules,
    blogFactoryKnowledgeId,
    blogFactoryPage,
    blogFactoryQuery,
    blogFactoryUsername,
    blogFactorySortBy,
    blogFactorySortDir,
    blogFactoryStatus,
    blogFactoryTopic,
    currentRecordDraft,
    currentRecordDay,
    currentRecordLearnLevel,
    currentRecordPage,
    currentRecordQuery,
    currentRecordSortBy,
    currentRecordSortDir,
    currentRecordTypeFilter,
    currentRecordUsername,
    currentRecordWeek,
    englishMaterialCategory,
    englishMaterialDraft,
    englishMaterialFlag,
    englishMaterialPage,
    englishMaterialQuery,
    englishMaterialUsername,
    englishMaterialSortBy,
    englishMaterialSortDir,
    draft,
    factoryCodexJobId,
    factoryCodexKnowledgeId,
    factoryModelName,
    factoryPage,
    factoryQuery,
    factorySelectedId,
    factorySkillIds,
    factoryTask,
    githubSyncStatus,
    historyAskAnswer,
    historyAskQuestion,
    historyAskSkillIds,
    historyDateFrom,
    historyDateTo,
    historyDay,
    historyLearnLevel,
    historyPage,
    historyRefreshToken,
    historyQuery,
    historySemanticQuery,
    historySortBy,
    historySortDir,
    historyType,
    historyUsername,
    historyVectorStatus,
    historyWeek,
    isEnglishMaterialDetailOpen,
    isMobilePersonalSecretDetailOpen,
    isMobileNavVisible,
    isSidebarExpanded,
    page,
    query,
    selectedBlogFactoryItem?.id,
    selectedBlogFactoryMaskRuleId,
    selectedEnglishMaterial?.id,
    selectedId,
    statusFilter,
    themeMode,
    workbenchUsername,
    todoDraft,
    todoPage,
    todoQuery,
    todoUsername,
    todoStatus,
    factoryUsername,
    selectedTodoId,
  ]);

  useEffect(() => {
    if (!apiKey || !activeCodexJobId || !canAccessAiCoding) return;

    const jobId = activeCodexJobId;
    let cancelled = false;
    let timer: number | undefined;

    async function pollCodexJob() {
      try {
        const job = await getCodexJob(jobId);
        if (cancelled) return;
        applyAiCodingJobSnapshot(job);

        if (job.status === "running") {
          timer = window.setTimeout(pollCodexJob, 1500);
          return;
        }
      } catch (error) {
        if (cancelled) return;
        setIsCodexRunning(false);
        setActiveCodexJobId(null);
        setAiCodingNoticeStatus("failed");
        setCodexError(error instanceof Error ? error.message : "恢复 Codex 任务状态失败。");
      }
    }

    pollCodexJob();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeCodexJobId, apiKey, canAccessAiCoding]);

  useEffect(() => {
    if (!apiKey || !factoryCodexJobId) return;

    const jobId = factoryCodexJobId;
    const jobKnowledgeId = factoryCodexKnowledgeId ?? factorySelectedId;
    let cancelled = false;
    let timer: number | undefined;

    async function pollFactoryCodexJob() {
      try {
        const job = await getCodexJob(jobId);
        if (cancelled) return;

        setFactoryTask(job.output);

        if (job.status === "running") {
          setIsFactoryGenerating(true);
          setFactoryCodexStatus(getFactoryJobProgressText(job));
          timer = window.setTimeout(pollFactoryCodexJob, 1500);
          return;
        }

        if (job.status === "failed") {
          setIsFactoryGenerating(false);
          setFactoryCodexJobId(null);
          setFactoryCodexKnowledgeId(null);
          setFactoryCodexStatus("模型加工失败。");
          setFactoryCopyError(job.error_message ?? "模型加工失败，请稍后重试。");
          return;
        }

        if (job.status === "cancelled") {
          setIsFactoryGenerating(false);
          setFactoryCodexJobId(null);
          setFactoryCodexKnowledgeId(null);
          setFactoryCodexStatus("模型加工已取消。");
          setFactoryCopyError(job.error_message ?? "模型加工已取消。");
          return;
        }

        const result = job.response
          ? extractCodexResultText(job.response) || job.response.output || job.output
          : job.output;
        const taskContent = normalizeFactoryTaskResult(result);
        setFactoryTask(taskContent);
        setIsFactoryGenerating(false);

        if (!taskContent) {
          setFactoryCodexJobId(null);
          setFactoryCodexKnowledgeId(null);
          setFactoryCodexStatus("模型加工完成，但没有生成可保存的内容。");
          return;
        }

        if (!jobKnowledgeId) {
          setFactoryCodexJobId(null);
          setFactoryCodexKnowledgeId(null);
          setFactoryCodexStatus("模型加工完成，但缺少源知识 ID，未自动发送到博客工厂。");
          setFactoryCopyError("缺少源知识 ID，请重新选择知识后再复制保存。");
          return;
        }

        setIsFactoryAutoSaving(true);
        setFactoryCodexStatus("模型加工完成，正在自动发送到博客工厂...");
        try {
          await saveFactoryTaskToBlogFactory(jobKnowledgeId, taskContent);
          if (cancelled) return;
          setFactoryCopyError(null);
          setFactoryCodexStatus("模型加工完成，已自动发送到博客工厂。");
        } catch (error) {
          if (cancelled) return;
          setFactoryCopyError(error instanceof Error ? `自动发送到博客工厂失败：${error.message}` : "自动发送到博客工厂失败。");
          setFactoryCodexStatus("模型加工完成，但自动发送到博客工厂失败。");
        } finally {
          if (!cancelled) {
            setIsFactoryAutoSaving(false);
            setFactoryCodexJobId(null);
            setFactoryCodexKnowledgeId(null);
          }
        }
      } catch (error) {
        if (cancelled) return;
        setIsFactoryGenerating(false);
        setFactoryCodexJobId(null);
        setFactoryCodexKnowledgeId(null);
        setIsFactoryAutoSaving(false);
        setFactoryCodexStatus("模型加工失败。");
        setFactoryCopyError(error instanceof Error ? error.message : "恢复模型加工状态失败。");
      }
    }

    pollFactoryCodexJob();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiKey, factoryCodexJobId, factoryCodexKnowledgeId, factorySelectedId]);

  useEffect(() => {
    if (!apiKey || activeCodexJobId || hasRestoredLatestCodexJobRef.current || !canAccessAiCoding) return;

    hasRestoredLatestCodexJobRef.current = true;
    let cancelled = false;

    async function restoreLatestCodexJob() {
      try {
        const job = await restoreLatestAiCodingJob();
        if (cancelled) return;
        applyAiCodingJobSnapshot(job);

        if (job.status === "running") {
          return;
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message.includes("No Codex task has been started")) return;
        setCodexError(error instanceof Error ? error.message : "恢复最近一次 Codex 任务失败。");
      }
    }

    restoreLatestCodexJob();

    return () => {
      cancelled = true;
    };
  }, [activeCodexJobId, apiKey, canAccessAiCoding]);

  useEffect(() => {
    if (activeView === "aiCoding" && aiCodingNoticeStatus !== "running") {
      setAiCodingNoticeStatus(null);
    }
  }, [activeView, aiCodingNoticeStatus]);

  useEffect(() => {
    if (authUser && !canAccessView(activeView, authUser)) {
      setActiveView("overview");
    }
  }, [activeView, authUser]);

  useEffect(() => {
    if (!apiKey || (activeView !== "historyAsk" && activeView !== "factory")) return;

    let mounted = true;
    setIsHistoryAskLlmConfigLoading(true);
    fetchHistoryAskLlmConfig()
      .then((config) => {
        if (!mounted) return;
        setHistoryAskLlmConfig(config);
        setHistoryAskLlmConfigDraft({
          provider_name: config.provider_name,
          base_url: config.base_url,
          model_name: config.model_name,
          enabled: config.enabled,
        });
        setHistoryAskLlmConfigError(null);
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setHistoryAskLlmConfigError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsHistoryAskLlmConfigLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey]);

  useEffect(() => {
    if (!apiKey || activeView !== "historyAsk") return;
    let cancelled = false;
    setIsHistoryOntologyLoading(true);
    fetchHistoryOntology(historyAskDomainCode)
      .then((response) => {
        if (!cancelled) {
          setHistoryOntologyTerms(response.items);
          setHistoryOntologyError(null);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setHistoryOntologyError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsHistoryOntologyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, apiKey, historyAskDomainCode]);

  useEffect(() => {
    if (!apiKey || activeView !== "historyAsk") return;
    fetchHistoryAskDomains()
      .then((response) => setHistoryAskDomains(response.items))
      .catch((error: Error) => setHistoryAskError(error.message));
  }, [activeView, apiKey]);

  useEffect(() => {
    if (!apiKey || activeView !== "historyAsk") return;
    let cancelled = false;
    setIsHistoryAskQuickQuestionsLoading(true);
    fetchHistoryAskQuickQuestions(historyAskDomainCode)
      .then((response) => {
        if (!cancelled) {
          setHistoryAskQuickQuestions(response.items);
          setHistoryAskQuickQuestionError(null);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setHistoryAskQuickQuestionError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsHistoryAskQuickQuestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, apiKey, historyAskDomainCode]);

  useEffect(() => {
    if (!apiKey || activeView !== "skills") return;

    let cancelled = false;
    setIsSkillLoading(true);
    setSkillError(null);
    fetchSkills({
      q: activeView === "skills" ? debouncedSkillQuery : undefined,
      scope: skillListScope,
    })
      .then((response) => {
        if (cancelled) return;
        setSkillItems(response.items);
        setSkillTotal(response.total);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setSkillError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsSkillLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, apiKey, debouncedSkillQuery, skillListScope]);

  useEffect(() => {
    if (!apiKey || activeView !== "users" || !authUser?.is_admin) return;

    let cancelled = false;
    setIsUserManagementLoading(true);
    setUserManagementError(null);
    Promise.all([fetchManagedUsers(debouncedManagedUserQuery), fetchUserRelations(), fetchAdminModuleAccess(), fetchUserRelationGraph()])
      .then(([usersResponse, relationsResponse, moduleResponse, graphResponse]) => {
        if (cancelled) return;
        setManagedUsers(usersResponse.items);
        setManagedUserTotal(usersResponse.total);
        setUserRelations(relationsResponse.items);
        setAdminModuleItems(moduleResponse.items);
        setUserRelationGraph(graphResponse);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setUserManagementError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsUserManagementLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, apiKey, authUser?.is_admin, debouncedManagedUserQuery, userManagementSavedLabel]);

  useEffect(() => {
    setTodoCopyError(null);
    setHasCopiedTodoContent(false);
    setTodoCurrentAppendError(null);
  }, [selectedTodoId]);

  useEffect(() => {
    if (selectedId !== null) return;

    if (isEmptyDraft(draft)) {
      clearStoredNewDraft();
      return;
    }

    writeStoredNewDraft(draft);
  }, [draft, selectedId]);

  useEffect(() => {
    if (!apiKey || activeView !== "workbench") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedQuery,
      username: workbenchUsername,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
    };
    const cached = readCachedKnowledge(requestQuery);
    if (cached) {
      setItems(cached.items);
      setTotalItems(cached.total);
      setLoadError(null);

      const pendingNavigation = pendingKnowledgeNavigationRef.current;
      if (pendingNavigation) {
        pendingKnowledgeNavigationRef.current = null;
        const navigatedItem = pendingNavigation === "previous" ? cached.items[cached.items.length - 1] : cached.items[0];
        setSelectedId(navigatedItem?.id ?? null);
        setDraft(navigatedItem ? itemToDraft(navigatedItem) : emptyDraft);
      }

    }

    setIsLoading(!cached);
    fetchKnowledge(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setItems(data.items);
        setTotalItems(data.total);
        setLoadError(null);

        setSelectedId((currentSelectedId) => {
          const pendingNavigation = pendingKnowledgeNavigationRef.current;
          if (pendingNavigation) {
            pendingKnowledgeNavigationRef.current = null;
            const navigatedItem = pendingNavigation === "previous" ? data.items[data.items.length - 1] : data.items[0];
            setDraft(navigatedItem ? itemToDraft(navigatedItem) : emptyDraft);
            return navigatedItem?.id ?? null;
          }

          return currentSelectedId;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setLoadError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, debouncedQuery, page, refreshToken, statusFilter, workbenchUsername]);

  useEffect(() => {
    if (!apiKey || activeView !== "factory") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedFactoryQuery,
      username: factoryUsername,
      limit: FACTORY_PAGE_SIZE,
      offset: (factoryPage - 1) * FACTORY_PAGE_SIZE,
      status: "未发布",
    } as const;
    const cached = readCachedKnowledge(requestQuery);
    if (cached) {
      setFactoryItems(cached.items);
      setFactoryTotalItems(cached.total);
      setFactoryError(null);

    }

    setIsFactoryLoading(!cached);
    fetchKnowledge(requestQuery)
      .then((data) => {
        if (!mounted) return;
        const nextTotalPages = Math.max(1, Math.ceil(data.total / FACTORY_PAGE_SIZE));
        if (data.total > 0 && data.items.length === 0 && factoryPage > nextTotalPages) {
          setFactoryPage(nextTotalPages);
          return;
        }

        setFactoryItems(data.items);
        setFactoryTotalItems(data.total);
        setFactoryError(null);

        setFactorySelectedId((currentSelectedId) => {
          const pendingDirection = pendingFactoryNavigationRef.current;
          if (pendingDirection) {
            pendingFactoryNavigationRef.current = null;
            const navigatedItem = pendingDirection === "previous" ? data.items[data.items.length - 1] : data.items[0];
            if (navigatedItem) {
              setFactoryTask("");
              setHasCopiedFactoryTask(false);
              setFactoryCopyError(null);
              return navigatedItem.id;
            }
          }

          const selectedStillVisible = data.items.some((item) => item.id === currentSelectedId);
          if (selectedStillVisible) return currentSelectedId;

          setFactoryTask("");
          setHasCopiedFactoryTask(false);
          setFactoryCopyError(null);
          return data.items[0]?.id ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setFactoryError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsFactoryLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, debouncedFactoryQuery, factoryPage, factoryRefreshToken, factoryUsername]);

  useEffect(() => {
    if (!apiKey || activeView !== "blogFactory") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedBlogFactoryQuery,
      semanticQuery: debouncedBlogFactorySemanticQuery,
      username: blogFactoryUsername,
      limit: BLOG_FACTORY_PAGE_SIZE,
      offset: (blogFactoryPage - 1) * BLOG_FACTORY_PAGE_SIZE,
      factoryStatus: blogFactoryStatus === "all" ? undefined : blogFactoryStatus,
      topic: blogFactoryTopic,
      knowledgeId: blogFactoryKnowledgeId,
      vectorStatus: blogFactoryVectorStatus,
      sortBy: blogFactorySortBy,
      sortDir: blogFactorySortDir,
    };
    const cached = readCachedBlogFactoryItems(requestQuery);
    if (cached) {
      setBlogFactoryItems(cached.items);
      setBlogFactoryTotal(cached.total);
      setBlogFactoryError(null);

    }

    setIsBlogFactoryLoading(!cached);
    fetchBlogFactoryItems(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setBlogFactoryItems(data.items);
        setBlogFactoryTotal(data.total);
        setBlogFactoryError(null);
        const pendingDirection = pendingBlogFactoryNavigationRef.current;
        if (pendingDirection) {
          pendingBlogFactoryNavigationRef.current = null;
          const navigatedItem = pendingDirection === "previous" ? data.items[data.items.length - 1] : data.items[0];
          if (navigatedItem) {
            void handleSelectBlogFactoryItem(navigatedItem);
            return;
          }
        }
        setSelectedBlogFactoryItem((current) => {
          const targetItemId = current?.id ?? restoredBlogFactorySelectionRef.current;
          const visibleItem = targetItemId ? data.items.find((item) => item.id === targetItemId) : null;
          restoredBlogFactorySelectionRef.current = null;
          if (current && visibleItem) {
            return { ...current, ...visibleItem, article_markdown: current.article_markdown };
          }
          return visibleItem ?? data.items[0] ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setBlogFactoryError(error.message);
      })
      .finally(() => {
        setIsBlogFactoryRefreshing(false);
        if (!mounted) return;
        setIsBlogFactoryLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeView,
    apiKey,
    blogFactoryKnowledgeId,
    blogFactoryVectorStatus,
    blogFactoryPage,
    blogFactoryRefreshToken,
    blogFactorySortBy,
    blogFactorySortDir,
    blogFactoryStatus,
    blogFactoryTopic,
    blogFactoryUsername,
    debouncedBlogFactoryQuery,
    debouncedBlogFactorySemanticQuery,
  ]);

  useEffect(() => {
    const shouldLoadBlogPublishConfigs =
      Boolean(apiKey) && (activeView === "blogFactory" || isBlogPublishConfigDialogOpen || isBlogPublishDialogOpen);
    if (!shouldLoadBlogPublishConfigs) return;

    let mounted = true;
    setIsBlogPublishConfigsLoading(true);
    setBlogPublishConfigsError(null);
    fetchBlogPublishConfigs()
      .then((data) => {
        if (!mounted) return;
        setBlogPublishConfigs(data.items);
        setBlogPublishConfigsError(null);
        setSelectedBlogPublishConfigId((current) => {
          if (current && data.items.some((item) => item.id === current)) return current;
          return data.items.find((item) => item.is_default)?.id ?? data.items[0]?.id ?? null;
        });
        setBlogPublishDialogConfigId((current) => {
          if (current && data.items.some((item) => item.id === current)) return current;
          return data.items.find((item) => item.is_default)?.id ?? data.items[0]?.id ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setBlogPublishConfigsError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsBlogPublishConfigsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, blogFactoryRefreshToken, isBlogPublishConfigDialogOpen, isBlogPublishDialogOpen]);

  useEffect(() => {
    if (!apiKey) return;
    const preferredConfig = resolvePreferredBlogPublishConfig(blogPublishConfigs, blogPublishDialogConfigId ?? selectedBlogPublishConfigId);
    if (!preferredConfig || !isCnblogsPublishConfig(preferredConfig)) return;
    if (readCachedBlogPublishCategories(preferredConfig.id)) return;
    fetchBlogPublishCategories(preferredConfig.id).catch(() => {
      // Best-effort prefetch only; dialog fetch path will handle errors explicitly.
    });
  }, [apiKey, blogPublishConfigs, blogPublishDialogConfigId, selectedBlogPublishConfigId]);

  useEffect(() => {
    if (!isBlogPublishDialogOpen || !blogPublishDialogConfigId) {
      setBlogPublishCategories([]);
      setBlogPublishSelectedCategories([]);
      setBlogPublishCategoriesError(null);
      setIsBlogPublishCategoriesLoading(false);
      return;
    }

    const selectedConfig = blogPublishConfigs.find((item) => item.id === blogPublishDialogConfigId) ?? null;
    if (!selectedConfig || !isCnblogsPublishConfig(selectedConfig)) {
      setBlogPublishCategories([]);
      setBlogPublishSelectedCategories([]);
      setBlogPublishCategoriesError(null);
      setIsBlogPublishCategoriesLoading(false);
      return;
    }

    let mounted = true;
    const cachedCategories = readCachedBlogPublishCategories(blogPublishDialogConfigId);
    if (cachedCategories) {
      const filteredCategories = filterCnblogsPublishCategories(cachedCategories.items);
      setBlogPublishCategories(filteredCategories);
      setBlogPublishSelectedCategories(
        resolveDefaultBlogPublishCategories(filteredCategories, selectedBlogFactoryItem, blogFactoryEditDraft.topicTagSnapshot),
      );
      setIsBlogPublishCategoriesLoading(false);
    } else {
      setBlogPublishCategories([]);
      setBlogPublishSelectedCategories([]);
      setIsBlogPublishCategoriesLoading(true);
    }
    setBlogPublishCategoriesError(null);
    fetchBlogPublishCategories(blogPublishDialogConfigId)
      .then((data) => {
        if (!mounted) return;
        const filteredCategories = filterCnblogsPublishCategories(data.items);
        setBlogPublishCategories(filteredCategories);
        setBlogPublishSelectedCategories(
          resolveDefaultBlogPublishCategories(filteredCategories, selectedBlogFactoryItem, blogFactoryEditDraft.topicTagSnapshot),
        );
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setBlogPublishCategories([]);
        setBlogPublishSelectedCategories([]);
        setBlogPublishCategoriesError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsBlogPublishCategoriesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    blogFactoryEditDraft.topicTagSnapshot,
    blogPublishConfigs,
    blogPublishDialogConfigId,
    isBlogPublishDialogOpen,
    selectedBlogFactoryItem,
  ]);

  useEffect(() => {
    if (!apiKey || activeView !== "todos") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedTodoQuery,
      username: todoUsername,
      limit: TODO_PAGE_SIZE,
      offset: (todoPage - 1) * TODO_PAGE_SIZE,
      status: todoStatus === "all" ? undefined : todoStatus,
    };
    const cached = readCachedTodos(requestQuery);
    if (cached) {
      setTodoItems(cached.items);
      setTodoTotal(cached.total);
      setTodoError(null);

      const pendingNavigation = pendingTodoNavigationRef.current;
      if (pendingNavigation) {
        pendingTodoNavigationRef.current = null;
        const navigatedItem = pendingNavigation === "previous" ? cached.items[cached.items.length - 1] : cached.items[0];
        setSelectedTodoId(navigatedItem?.id ?? null);
        selectedTodoSavedStatusRef.current = navigatedItem?.todo_status ?? null;
        selectedTodoSavedDraftRef.current = navigatedItem ? todoItemToDraft(navigatedItem) : emptyTodoDraft;
        setTodoDraft(resolveTodoEditorDraft(navigatedItem ?? null, todoDraftsByIdRef.current));
      }

    }

    setIsTodoLoading(!cached);
    fetchTodos(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setTodoItems(data.items);
        setTodoTotal(data.total);
        setTodoError(null);

        setSelectedTodoId((currentSelectedId) => {
          const pendingNavigation = pendingTodoNavigationRef.current;
          if (pendingNavigation) {
            pendingTodoNavigationRef.current = null;
            const navigatedItem = pendingNavigation === "previous" ? data.items[data.items.length - 1] : data.items[0];
            selectedTodoSavedStatusRef.current = navigatedItem?.todo_status ?? null;
            selectedTodoSavedDraftRef.current = navigatedItem ? todoItemToDraft(navigatedItem) : emptyTodoDraft;
            setTodoDraft(resolveTodoEditorDraft(navigatedItem ?? null, todoDraftsByIdRef.current));
            return navigatedItem?.id ?? null;
          }

          if (currentSelectedId) {
            const selectedItem = data.items.find((item) => item.id === currentSelectedId);
            if (selectedItem) {
              selectedTodoSavedStatusRef.current = selectedItem.todo_status;
              selectedTodoSavedDraftRef.current = todoItemToDraft(selectedItem);
              setTodoDraft(resolveTodoEditorDraft(selectedItem, todoDraftsByIdRef.current));
              return currentSelectedId;
            }
          }

          const nextItem = data.items[0] ?? null;
          selectedTodoSavedStatusRef.current = nextItem?.todo_status ?? null;
          selectedTodoSavedDraftRef.current = nextItem ? todoItemToDraft(nextItem) : emptyTodoDraft;
          setTodoDraft(resolveTodoEditorDraft(nextItem, todoDraftsByIdRef.current));
          return nextItem?.id ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setTodoError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsTodoLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, debouncedTodoQuery, todoPage, todoRefreshToken, todoStatus, todoUsername]);

  useEffect(() => {
    if (!apiKey || activeView !== "personalSecrets") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedPersonalSecretQuery,
      limit: PERSONAL_SECRETS_PAGE_SIZE,
      offset: (personalSecretPage - 1) * PERSONAL_SECRETS_PAGE_SIZE,
    };
    const cached = readCachedPersonalSecrets(requestQuery);
    if (cached) {
      setPersonalSecretItems(cached.items);
      setPersonalSecretTotal(cached.total);
      setPersonalSecretError(null);
      setSelectedPersonalSecretId((currentSelectedId) => {
        if (currentSelectedId && cached.items.some((item) => item.id === currentSelectedId)) return currentSelectedId;
        return cached.items[0]?.id ?? null;
      });

    }

    setIsPersonalSecretLoading(!cached);
    fetchPersonalSecrets(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setPersonalSecretItems(data.items);
        setPersonalSecretTotal(data.total);
        setPersonalSecretError(null);
        setSelectedPersonalSecretId((currentSelectedId) => {
          if (currentSelectedId && data.items.some((item) => item.id === currentSelectedId)) return currentSelectedId;
          return data.items[0]?.id ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setPersonalSecretError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsPersonalSecretLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, debouncedPersonalSecretQuery, personalSecretPage, personalSecretRefreshToken]);

  useEffect(() => {
    if (!apiKey || activeView !== "currentRecords") return;

    let mounted = true;
    const cached = readCachedCurrentRecordOptions();
    if (cached) {
      setCurrentRecordOptions({
        ...cached,
        user_types: cached.user_types ?? {},
        weeks: cached.weeks.length > 0 ? cached.weeks : buildWeekOptions(),
        days: cached.days.length > 0 ? cached.days : buildDayOptions(),
        learn_levels: cached.learn_levels.length > 0 ? cached.learn_levels : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    }

    setIsCurrentRecordOptionsLoading(!cached);
    fetchCurrentRecordOptions()
      .then((options) => {
        if (!mounted) return;
        const normalizedOptions = normalizeCurrentRecordOptions(options);
        setCurrentRecordOptions(normalizedOptions);
        setCurrentRecordDraft((current) => ({
          ...current,
          username:
            current.username && normalizedOptions.users.includes(current.username)
              ? current.username
              : normalizedOptions.users[0] || "",
        }));
        setCurrentRecordUsername((current) => {
          if (!authUser?.is_admin && normalizedOptions.users.length === 1) {
            return normalizedOptions.users[0];
          }
          return current && normalizedOptions.users.includes(current) ? current : "";
        });
        setCurrentRecordTypeFilter((current) => {
          const nextUsername =
            !authUser?.is_admin && normalizedOptions.users.length === 1
              ? normalizedOptions.users[0]
              : currentRecordUsername && normalizedOptions.users.includes(currentRecordUsername)
                ? currentRecordUsername
                : "";
          const nextTypeOptions = nextUsername ? normalizedOptions.user_types[nextUsername] ?? [] : normalizedOptions.types;
          return current && nextTypeOptions.includes(current) ? current : "";
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setCurrentRecordError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsCurrentRecordOptionsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, authUser?.is_admin, currentRecordRefreshToken]);

  useEffect(() => {
    if (!apiKey || activeView !== "currentRecords") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedCurrentRecordQuery,
      username: currentRecordUsername,
      type: currentRecordTypeFilter,
      week: currentRecordWeek,
      day: currentRecordDay,
      learnLevel: currentRecordLearnLevel,
      sortBy: currentRecordSortBy,
      sortDir: currentRecordSortDir,
      limit: CURRENT_RECORDS_PAGE_SIZE,
      offset: (currentRecordPage - 1) * CURRENT_RECORDS_PAGE_SIZE,
    };
    const cached = readCachedCurrentRecords(requestQuery);
    if (cached) {
      setCurrentRecordItems(cached.items);
      setCurrentRecordTotal(cached.total);
      setCurrentRecordError(null);

    }

    setIsCurrentRecordLoading(!cached);
    fetchCurrentRecords(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setCurrentRecordItems(data.items);
        setCurrentRecordTotal(data.total);
        setCurrentRecordError(null);
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setCurrentRecordError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsCurrentRecordLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeView,
    apiKey,
    currentRecordDay,
    currentRecordLearnLevel,
    currentRecordPage,
    currentRecordRefreshToken,
    currentRecordSortBy,
    currentRecordSortDir,
    currentRecordTypeFilter,
    currentRecordUsername,
    currentRecordWeek,
    debouncedCurrentRecordQuery,
  ]);

  useEffect(() => {
    if (!apiKey || activeView !== "englishMaterials") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedEnglishMaterialQuery,
      semanticQuery: debouncedEnglishMaterialSemanticQuery,
      username: englishMaterialUsername,
      category: englishMaterialCategory,
      flag: englishMaterialFlag,
      vectorStatus: englishMaterialVectorStatus,
      sortBy: englishMaterialSortBy,
      sortDir: englishMaterialSortDir,
      limit: ENGLISH_MATERIALS_PAGE_SIZE,
      offset: (englishMaterialPage - 1) * ENGLISH_MATERIALS_PAGE_SIZE,
    };
    const cached = readCachedEnglishMaterials(requestQuery);
    if (cached) {
      setEnglishMaterialItems(cached.items);
      setEnglishMaterialTotal(cached.total);
      setEnglishMaterialError(null);

    }

    setIsEnglishMaterialLoading(!cached);
    fetchEnglishMaterials(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setEnglishMaterialItems(data.items);
        setEnglishMaterialTotal(data.total);
        setEnglishMaterialError(null);
        setSelectedEnglishMaterial((current) => {
          if (current && data.items.some((item) => item.id === current.id)) return current;
          const restoredId = restoredUiState.englishMaterials.selectedId;
          return (restoredId ? data.items.find((item) => item.id === restoredId) : null) ?? data.items[0] ?? null;
        });
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setEnglishMaterialError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsEnglishMaterialLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeView,
    apiKey,
    debouncedEnglishMaterialQuery,
    englishMaterialCategory,
    englishMaterialFlag,
    englishMaterialVectorStatus,
    englishMaterialPage,
    englishMaterialRefreshToken,
    englishMaterialSortBy,
    englishMaterialSortDir,
    englishMaterialUsername,
    debouncedEnglishMaterialSemanticQuery,
  ]);

  useEffect(() => {
    if (
      !apiKey ||
      activeView !== "englishMaterials" ||
      !isEnglishMaterialDetailOpen ||
      hasRestoredEnglishMaterialDetailRef.current
    ) {
      return;
    }

    const materialId = initialEnglishMaterialRestore.selectedId;
    if (!materialId) return;

    hasRestoredEnglishMaterialDetailRef.current = true;
    let mounted = true;
    const hasCachedDetail = initialEnglishMaterialRestore.cachedItem?.id === materialId;
    if (!hasCachedDetail) setIsEnglishMaterialDetailLoading(true);

    getEnglishMaterial(materialId)
      .then((detail) => {
        if (!mounted) return;
        setSelectedEnglishMaterial(detail);
        setEnglishMaterialDetailDraft(englishMaterialItemToDraft(detail));
        setEnglishMaterialItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
        setEnglishMaterialError(null);
      })
      .catch((error) => {
        if (!mounted || hasCachedDetail) return;
        setEnglishMaterialError(error instanceof Error ? error.message : "读取英语素材详情失败，请稍后重试。");
      })
      .finally(() => {
        if (mounted) setIsEnglishMaterialDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeView,
    apiKey,
    initialEnglishMaterialRestore.cachedItem?.id,
    initialEnglishMaterialRestore.selectedId,
    isEnglishMaterialDetailOpen,
  ]);

  useEffect(() => {
    if (activeView !== "englishMaterials" && readEnglishMaterialIdFromLocation() !== null) {
      writeEnglishMaterialIdToLocation(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (!apiKey || activeView !== "englishMaterials") return;

    let mounted = true;
    fetchNextEnglishMaterialSequence({ username: englishMaterialUsername })
      .then((nextSequence) => {
        if (!mounted) return;
        setEnglishMaterialDraft((current) => {
          if (
            englishMaterialSequenceTouchedRef.current ||
            (current.sequence_no.trim() && !isBlankEnglishMaterialDraftExceptSequence(current))
          ) {
            return current;
          }
          return { ...current, sequence_no: String(nextSequence) };
        });
      })
      .catch(() => {
        // The field remains editable if the default sequence cannot be loaded.
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, englishMaterialRefreshToken, englishMaterialUsername]);

  useEffect(() => {
    if (!apiKey || activeView !== "history") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedHistoryQuery,
      semanticQuery: historySemanticQuery,
      type: historyType,
      username: historyUsername,
      week: historyWeek,
      day: historyDay,
      learnLevel: historyLearnLevel,
      vectorStatus: historyVectorStatus,
      dateFrom: historyDateFrom,
      dateTo: historyDateTo,
      sortBy: historySortBy,
      sortDir: historySortDir,
      limit: HISTORY_PAGE_SIZE,
      offset: (historyPage - 1) * HISTORY_PAGE_SIZE,
    };
    const cached = readCachedHistory(requestQuery);
    if (cached) {
      setHistoryItems(cached.items);
      setHistoryTotal(cached.total);
      setHistorySummary({ ...cached.summary, user_types: cached.summary.user_types ?? {} });
      setHistoryError(null);

    }

    setIsHistoryLoading(!cached);
    fetchHistory(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setHistoryItems(data.items);
        setHistoryTotal(data.total);
        setHistorySummary({ ...data.summary, user_types: data.summary.user_types ?? {} });
        if (!authUser?.is_admin && data.summary.users.length === 1) {
          setHistoryUsername(data.summary.users[0]);
        }
        setHistoryError(null);
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setHistoryError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsHistoryLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeView,
    apiKey,
    authUser?.is_admin,
    debouncedHistoryQuery,
    historyDateFrom,
    historyDateTo,
    historyDay,
    historyLearnLevel,
    historyPage,
    historyRefreshToken,
    historySemanticQuery,
    historySortBy,
    historySortDir,
    historyType,
    historyUsername,
    historyVectorStatus,
    historyWeek,
  ]);

  useEffect(() => {
    if (!apiKey || activeView !== "overview" || !authUser) return;

    let mounted = true;
    const isManualRefresh = overviewRefreshToken > 0;
    const usageLimit = USAGE_SAMPLE_LIMIT;
    const overviewUsername = authUser.username.trim() || undefined;
    const todoQueryConfig = {
      username: overviewUsername,
      status: "处理中" as const,
      limit: OVERVIEW_TODO_LIMIT,
      offset: 0,
      includeTotal: true,
    };
    const unpublishedKnowledgeQueryConfig = {
      username: overviewUsername,
      status: "未发布" as const,
      limit: OVERVIEW_KNOWLEDGE_LIMIT,
      offset: 0,
      includeTotal: true,
    };
    const latestEnglishMaterialQueryConfig = {
      username: overviewUsername,
      sortBy: "id" as const,
      sortDir: "desc" as const,
      limit: overviewEnglishLimit,
      offset: 0,
      includeTotal: false,
    };

    const cachedUsage = canAccessUsage ? readCachedLlmUsage(usageLimit, false) : { items: [], total: 0 };
    const cachedTodos = readCachedTodos(todoQueryConfig);
    const cachedUnpublishedKnowledge = readCachedKnowledge(unpublishedKnowledgeQueryConfig);
    const cachedEnglishMaterial = readCachedEnglishMaterials(latestEnglishMaterialQueryConfig);
    const hasCompleteCache =
      cachedUsage && cachedTodos && cachedUnpublishedKnowledge && cachedEnglishMaterial;

    if (isManualRefresh) {
      setIsOverviewRefreshing(true);
      setOverviewError(null);
    } else if (hasCompleteCache) {
      setOverviewData({
        usageItems: cachedUsage.items,
        usageTotal: cachedUsage.items.length,
        processingTodos: cachedTodos.items,
        processingTodoTotal: cachedTodos.total,
        recentKnowledge: cachedUnpublishedKnowledge.items,
        knowledgeTotal: cachedUnpublishedKnowledge.total,
        unpublishedKnowledgeTotal: cachedUnpublishedKnowledge.total,
        recentEnglishMaterials: cachedEnglishMaterial.items,
        englishMaterialTotal: cachedEnglishMaterial.items.length,
      });
      setOverviewSectionErrors(emptyOverviewSectionErrors);
      setOverviewError(null);
      setIsOverviewLoading(false);
    } else {
      setIsOverviewLoading(true);
      setOverviewError(null);
    }

    Promise.allSettled([
      canAccessUsage ? fetchLlmUsage(usageLimit, false) : Promise.resolve({ items: [], total: 0 }),
      fetchTodos(todoQueryConfig),
      fetchKnowledge(unpublishedKnowledgeQueryConfig),
      fetchEnglishMaterials(latestEnglishMaterialQueryConfig),
    ])
      .then(([usageResult, todoResult, unpublishedKnowledgeResult, englishMaterialResult]) => {
        if (!mounted) return;

        const nextErrors: OverviewSectionErrors = { ...emptyOverviewSectionErrors };
        const successCount = [usageResult, todoResult, unpublishedKnowledgeResult, englishMaterialResult].filter(
          (result) => result.status === "fulfilled",
        ).length;

        if (usageResult.status === "rejected") {
          nextErrors.usage = readOverviewRefreshError(usageResult.reason);
        }
        if (todoResult.status === "rejected") {
          nextErrors.todos = readOverviewRefreshError(todoResult.reason);
        }
        if (unpublishedKnowledgeResult.status === "rejected") {
          nextErrors.knowledge = readOverviewRefreshError(unpublishedKnowledgeResult.reason);
        }
        if (englishMaterialResult.status === "rejected") {
          nextErrors.english = readOverviewRefreshError(englishMaterialResult.reason);
        }

        setOverviewData((current) => {
          let next = current;

          if (usageResult.status === "fulfilled") {
            next = {
              ...next,
              usageItems: usageResult.value.items,
              usageTotal: usageResult.value.items.length,
            };
          }

          if (todoResult.status === "fulfilled") {
            next = {
              ...next,
              processingTodos: todoResult.value.items,
              processingTodoTotal: todoResult.value.total,
            };
          }

          if (unpublishedKnowledgeResult.status === "fulfilled") {
            next = {
              ...next,
              recentKnowledge: unpublishedKnowledgeResult.value.items,
              knowledgeTotal: unpublishedKnowledgeResult.value.total,
              unpublishedKnowledgeTotal: unpublishedKnowledgeResult.value.total,
            };
          }

          if (englishMaterialResult.status === "fulfilled") {
            next = {
              ...next,
              recentEnglishMaterials: englishMaterialResult.value.items,
              englishMaterialTotal: englishMaterialResult.value.items.length,
            };
          }

          return next;
        });

        setOverviewSectionErrors(nextErrors);
        setOverviewUpdatedAt(new Date().toISOString());
        setOverviewError(successCount > 0 ? null : "总览所有数据源都读取失败，请稍后重试。");
      })
      .finally(() => {
        if (!mounted) return;
        if (isManualRefresh) {
          setIsOverviewRefreshing(false);
        } else {
          setIsOverviewLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, authUser, overviewRefreshToken, canAccessUsage, overviewEnglishLimit]);

  useEffect(() => {
    if (!apiKey || activeView !== "usage" || !canAccessUsage) return;

    let mounted = true;
    const refreshOnly = usageRefreshToken > 0 && usageItems.length > 0;
    const cached = readCachedLlmUsage(USAGE_SAMPLE_LIMIT);

    if (refreshOnly) {
      setIsUsageRefreshing(true);
    } else if (cached) {
      setUsageItems(cached.items);
      setUsageTotal(cached.total);
      setUsageError(null);
      setIsUsageLoading(false);
    } else {
      setIsUsageLoading(true);
    }

    fetchLlmUsage(USAGE_SAMPLE_LIMIT)
      .then((data) => {
        if (!mounted) return;
        setUsageItems(data.items);
        setUsageTotal(data.total);
        setUsageError(null);
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setUsageError(error.message);
      })
      .finally(() => {
        if (!mounted) return;
        if (refreshOnly) {
          setIsUsageRefreshing(false);
        } else {
          setIsUsageLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeView, apiKey, usageRefreshToken, canAccessUsage]);

  useEffect(() => {
    if (restoredBlogFactoryArticleDraftRef.current && !selectedBlogFactoryItem) return;

    setBlogFactoryEditDraft(blogFactoryItemToEditDraft(selectedBlogFactoryItem));
    setBlogFactoryEditError(null);
    setBlogFactoryStatusError(null);
    setBlogFactoryTaskCopyError(null);
    setBlogFactoryMaskError(null);
    setBlogFactoryMaskNotice(null);
    setHasCopiedBlogFactoryTask(false);
    setBlogPublishError(null);
    setBlogPublishSuccess(null);

    if (
      restoredBlogFactoryArticleDraftRef.current &&
      selectedBlogFactoryItem?.id === restoredUiState.blogFactory.selectedItemId
    ) {
      restoredBlogFactoryArticleDraftRef.current = false;
      setBlogFactoryArticleError(null);
      setBlogFactoryArticleCopiedMode(null);
      return;
    }

    restoredBlogFactoryArticleDraftRef.current = false;
    setBlogFactoryArticleDraft(selectedBlogFactoryItem?.article_markdown ?? "");
    setBlogFactoryArticlePathDraft(selectedBlogFactoryItem?.article_file_path ?? "");
    setBlogFactoryArticleError(null);
    setBlogFactoryArticleCopiedMode(null);
  }, [selectedBlogFactoryItem?.id, selectedBlogFactoryItem?.article_markdown, selectedBlogFactoryItem?.article_file_path]);

  useEffect(() => {
    setSelectedBlogFactoryMaskRuleId((current) => resolveBlogFactoryMaskRuleId(blogFactoryMaskRules, current));
  }, [blogFactoryMaskRules]);

  const trustScore = useMemo(() => {
    let score = 38;
    if (draft.question.trim().length >= 8) score += 18;
    if (draft.answer.trim().length >= 24) score += 24;
    if (draft.source.trim()) score += 10;
    if (draft.topic_tag.trim()) score += 10;
    return Math.min(score, 100);
  }, [draft]);

  const hasSensitiveSignal = /密码|password|token|secret|密钥|账号/i.test(draft.answer);
  const isEditing = selectedId !== null;

  // Event handlers and data mutations.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.question.trim() || !draft.answer.trim()) return;

    if (!isTodoEntry) {
      const topicTagError = getKnowledgeTopicTagValidationError(draft.topic_tag);
      if (topicTagError) {
        setSaveError(topicTagError);
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (selectedId === null) {
        if (isTodoEntry) {
          const created = await createTodo({
            title: draft.question,
            content: draft.answer,
            source: draft.source,
            topic_tag: draft.topic_tag,
            todo_status: newTodoStatus,
          });
          invalidateApiCache(["/api/todos", "/api/knowledge"]);
          setDraft(emptyDraft);
          clearStoredNewDraft();
          setIsTodoEntry(false);
          setNewTodoStatus("处理中");
          selectedTodoSavedDraftRef.current = todoItemToDraft(created);
          setTodoDraft(todoItemToDraft(created));
          setSelectedTodoId(created.id);
          selectedTodoSavedStatusRef.current = created.todo_status;
          setTodoDraftsById((current) => {
            if (!(created.id in current)) return current;
            const next = { ...current };
            delete next[created.id];
            return next;
          });
          setTodoPage(1);
          setTodoRefreshToken((current) => current + 1);
          setActiveView("todos");
          return;
        }

        const created = await createKnowledge(draft);
        invalidateApiCache(["/api/knowledge"]);
        if (page === 1) {
          setItems((current) => [created, ...current].slice(0, PAGE_SIZE));
        } else {
          setPage(1);
        }
        setTotalItems((current) => current + 1);
        setDraft(emptyDraft);
        clearStoredNewDraft();
        setLastCreatedId(created.id);
        return;
      }

      const updated = await updateKnowledge(selectedId, draft);
      invalidateApiCache(["/api/knowledge"]);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDraft(itemToDraft(updated));
      setLastCreatedId(updated.id);
      restoreMobileViewportScale();
    } catch (error) {
      setSaveError(getKnowledgeSaveError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSelectItem(item: KnowledgeItem) {
    setSelectedId(item.id);
    setDraft(itemToDraft(item));
    setSaveError(null);
    setIsMobileKnowledgeEditorOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getKnowledge(item.id);
      setDraft(itemToDraft(detail));
      setItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "读取详情失败，请稍后重试。");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleSelectAdjacentKnowledge(direction: "previous" | "next") {
    if (
      selectedId === null ||
      isDetailLoading ||
      isSaving ||
      isDeleting ||
      isConvertingKnowledgeToTodo
    ) {
      return;
    }

    const selectedIndex = items.findIndex((item) => item.id === selectedId);
    if (selectedIndex === -1) return;

    if (direction === "previous") {
      const previousItem = items[selectedIndex - 1];
      if (previousItem) {
        void handleSelectItem(previousItem);
        return;
      }

      if (page > 1) {
        pendingKnowledgeNavigationRef.current = "previous";
        setPage((current) => Math.max(1, current - 1));
      }
      return;
    }

    const nextItem = items[selectedIndex + 1];
    if (nextItem) {
      void handleSelectItem(nextItem);
      return;
    }

    if (page * PAGE_SIZE < totalItems) {
      pendingKnowledgeNavigationRef.current = "next";
      setPage((current) => current + 1);
    }
  }

  async function handleDeleteSelected() {
    if (deleteTarget === null) return;

    setIsDeleting(true);
    setSaveError(null);

    try {
      await deleteKnowledge(deleteTarget.id);
      invalidateApiCache(["/api/knowledge"]);
      setSelectedId(null);
      setIsMobileKnowledgeEditorOpen(false);
      setDeleteTarget(null);
      setDraft(emptyDraft);
      setLastCreatedId(null);
      setTotalItems((current) => Math.max(0, current - 1));

      const remainingOnPage = items.filter((item) => item.id !== deleteTarget.id).length;
      if (remainingOnPage === 0 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        setRefreshToken((current) => current + 1);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleRequestDelete() {
    if (selectedId === null) return;

    const selectedItem =
      items.find((item) => item.id === selectedId) ??
      ({
        id: selectedId,
        question: draft.question,
        answer: draft.answer,
        source: draft.source || null,
        topic_tag: draft.topic_tag || null,
        blog_status: draft.blog_status,
        created_date: null,
      } satisfies KnowledgeItem);

    setDeleteTarget(selectedItem);
  }

  function handleConvertSelectedKnowledgeToTodo() {
    if (selectedId === null || isConvertingKnowledgeToTodo || isSaving || isDeleting) return;
    setConversionTarget("knowledgeToTodo");
  }

  async function confirmConvertSelectedKnowledgeToTodo() {
    if (selectedId === null || isConvertingKnowledgeToTodo || isSaving || isDeleting) return;

    setConversionTarget(null);
    setIsConvertingKnowledgeToTodo(true);
    setSaveError(null);
    try {
      const converted = await convertKnowledgeToTodo(selectedId);
      invalidateApiCache(["/api/knowledge", "/api/todos"]);
      setItems((current) => current.filter((item) => item.id !== selectedId));
      setTotalItems((current) => Math.max(0, current - 1));
      setSelectedId(null);
      setIsMobileKnowledgeEditorOpen(false);
      setDraft(emptyDraft);
      setLastCreatedId(null);
      selectedTodoSavedDraftRef.current = todoItemToDraft(converted);
      setTodoDraft(todoItemToDraft(converted));
      setSelectedTodoId(converted.id);
      selectedTodoSavedStatusRef.current = converted.todo_status;
      setTodoDraftsById((current) => {
        if (!(converted.id in current)) return current;
        const next = { ...current };
        delete next[converted.id];
        return next;
      });
      setTodoPage(1);
      setTodoStatus("all");
      setTodoRefreshToken((current) => current + 1);
      setRefreshToken((current) => current + 1);
      setActiveView("todos");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "转换为待办事项失败，请稍后重试。");
    } finally {
      setIsConvertingKnowledgeToTodo(false);
    }
  }

  function handleNewEntry() {
    setSelectedId(null);
    setIsMobileKnowledgeEditorOpen(false);
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setIsTodoEntry(false);
    setNewTodoStatus("处理中");
    setSaveError(null);
    restoreMobileViewportScale();
  }

  function handleLogin(result: {
    api_key: string;
    username: string;
    is_admin: boolean;
    is_admin_role: boolean;
    visible_users: string[];
    visible_admin_modules: string[];
  }) {
    const nextAuthUser = {
      username: result.username,
      is_admin: result.is_admin,
      is_admin_role: result.is_admin_role,
      visible_users: result.visible_users,
      visible_admin_modules: result.visible_admin_modules,
    };
    persistApiKey(result.api_key);
    persistAuthUser(nextAuthUser);
    setApiKey(result.api_key);
    setAuthUser(nextAuthUser);
    setPage(1);
    setQuery("");
    setWorkbenchUsername(getDefaultOwnedUsername(nextAuthUser));
    setSelectedId(null);
    setIsMobileKnowledgeEditorOpen(false);
    setIsMobileKnowledgeEntryCollapsed(false);
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setIsTodoEntry(false);
    setFactoryUsername(getDefaultOwnedUsername(nextAuthUser));
    setBlogFactoryUsername(getDefaultOwnedUsername(nextAuthUser));
    setTodoUsername(getDefaultOwnedUsername(nextAuthUser));
    setPersonalSecretPage(1);
    setPersonalSecretQuery("");
    setSelectedPersonalSecretId(null);
    setPersonalSecretDraft(emptyPersonalSecretDraft);
    setIsPersonalSecretEditorOpen(false);
    setEnglishMaterialUsername(getDefaultOwnedUsername(nextAuthUser));
  }

  function handleLogout() {
    clearStoredApiKey();
    clearApiResponseCache();
    clearStoredNewDraft();
    clearStoredUiState();
    setApiKey(null);
    setAuthUser(null);
    setItems([]);
    setWorkbenchUsername("");
    setSelectedId(null);
    setIsMobileKnowledgeEditorOpen(false);
    setIsMobileKnowledgeEntryCollapsed(false);
    setDraft(emptyDraft);
    setNewTodoStatus("处理中");
    setFactoryItems([]);
    setFactorySelectedId(null);
    setFactoryUsername("");
    setFactoryTask("");
    setFactorySkillIds([]);
    setFactoryModelName(AI_CODING_DEFAULT_MODEL);
    setFactoryCodexJobId(null);
    setFactoryCodexKnowledgeId(null);
    setAdminModuleItems([]);
    setFactoryCodexStatus("");
    setIsFactoryGenerating(false);
    setIsFactoryAutoSaving(false);
    setFactorySavedKnowledgeId(null);
    setBlogFactoryItems([]);
    setBlogFactoryTotal(0);
    setBlogFactoryUsername("");
    setSelectedBlogFactoryItem(null);
    setBlogFactoryMaskRules([]);
    setSelectedBlogFactoryMaskRuleId(null);
    setIsBlogFactoryMaskDialogOpen(false);
    setBlogFactoryMaskRuleDraft(createEmptyBlogFactoryMaskRule());
    setBlogFactoryMaskError(null);
    setBlogFactoryMaskNotice(null);
    setTodoItems([]);
    setTodoTotal(0);
    setTodoUsername("");
    setSelectedTodoId(null);
    selectedTodoSavedStatusRef.current = null;
    selectedTodoSavedDraftRef.current = emptyTodoDraft;
    setIsMobileTodoEditorOpen(false);
    setTodoDraft(emptyTodoDraft);
    setTodoDraftsById({});
    setTodoCopyError(null);
    setHasCopiedTodoContent(false);
    setPersonalSecretItems([]);
    setPersonalSecretTotal(0);
    setSelectedPersonalSecretId(null);
    setPersonalSecretDraft(emptyPersonalSecretDraft);
    setIsPersonalSecretEditorOpen(false);
    setPersonalSecretCopyNotice(null);
    setPersonalSecretCopiedField(null);
    resetTodoCurrentAppendState();
    setIsAppendingTodoToCurrent(false);
    setCurrentRecordItems([]);
    setCurrentRecordTotal(0);
    setSelectedCurrentRecord(null);
    setEnglishMaterialItems([]);
    setEnglishMaterialTotal(0);
    setEnglishMaterialUsername("");
    setSelectedEnglishMaterial(null);
    setIsEnglishMaterialDetailOpen(false);
    setIsEnglishMaterialCreateOpen(false);
    englishMaterialSequenceTouchedRef.current = false;
    setEnglishMaterialDraft(emptyEnglishMaterialDraft);
    setEnglishMaterialDetailDraft(emptyEnglishMaterialDraft);
    setEnglishMaterialCopiedLabel(null);
    setUsageItems([]);
    setUsageTotal(0);
    setHistoryItems([]);
    setHistoryTotal(0);
    setHistoryAskAnswer(null);
    setHistoryAskQuestion("");
    setHasCopiedHistoryAskAnswer(false);
    setGithubSyncStatus(null);
    setGithubSyncError(null);
    setIsGithubSyncing(false);
  }

  async function saveFactoryTaskToBlogFactory(knowledgeId: number, taskContent: string) {
    await createBlogFactoryItem({
      knowledgeId,
      taskContent,
    });
    setFactorySavedKnowledgeId(knowledgeId);
    setFactoryItems((current) => current.filter((item) => item.id !== knowledgeId));
    setFactoryTotalItems((current) => Math.max(0, current - 1));
    setBlogFactoryRefreshToken((current) => current + 1);
  }

  async function handleGenerateFactoryTask(item: KnowledgeItem) {
    if (isFactoryGenerating) return;
    if (factorySkillIds.length === 0) {
      setFactoryCopyError("请先选择 skill，再生成加工结果。");
      setFactoryCodexStatus("");
      return;
    }
    const requestedModelName = resolveFactoryModelName();
    setIsFactoryGenerating(true);
    setIsFactoryAutoSaving(false);
    setFactorySelectedId(item.id);
    setFactoryCodexKnowledgeId(item.id);
    setFactoryTask("");
    const usesHistoryAskModel = factoryModelName === FACTORY_CUSTOM_MODEL;
    setFactoryCodexStatus(usesHistoryAskModel ? "正在提交其他模型加工任务..." : "正在提交 Codex 加工任务...");
    setHasCopiedFactoryTask(false);
    setFactoryCopyError(null);
    setFactorySavedKnowledgeId(null);

    try {
      const prompt = buildFactorySkillPrompt(item);
      const job = await startCodexJob(
        prompt,
        factorySkillIds,
        "read-only",
        "final",
        requestedModelName,
        usesHistoryAskModel ? "history_ask_llm" : "codex",
      );
      setFactoryCodexJobId(job.job_id);
      setFactoryTask(job.output);
      setFactoryCodexStatus(usesHistoryAskModel ? "其他模型任务已提交，正在加工..." : "Codex 任务已提交，正在加工...");
    } catch (error) {
      setIsFactoryGenerating(false);
      setIsFactoryAutoSaving(false);
      setFactoryCodexJobId(null);
      setFactoryCodexKnowledgeId(null);
      setFactoryCodexStatus(usesHistoryAskModel ? "其他模型加工失败。" : "Codex 加工失败。");
      setFactoryCopyError(error instanceof Error ? error.message : usesHistoryAskModel ? "其他模型加工失败，请稍后重试。" : "Codex 加工失败，请稍后重试。");
    }
  }

  async function handleCancelFactoryTask() {
    if (!factoryCodexJobId || !isFactoryGenerating) return;

    setFactoryCodexStatus("正在取消模型加工...");
    try {
      const job = await cancelCodexJob(factoryCodexJobId);
      setFactoryTask(job.output);
      setIsFactoryGenerating(false);
      setIsFactoryAutoSaving(false);
      setFactoryCodexJobId(null);
      setFactoryCodexKnowledgeId(null);
      setFactoryCodexStatus("模型加工已取消。");
      setFactoryCopyError(job.error_message ?? "模型加工已取消。");
    } catch (error) {
      setFactoryCodexStatus("取消失败，模型任务可能仍在运行。");
      setFactoryCopyError(error instanceof Error ? error.message : "取消模型加工失败，请稍后重试。");
    }
  }

  async function handleCopyFactoryTask(view: MarkdownContentView) {
    const taskContent = normalizeFactoryTaskResult(factoryTask);
    if (!taskContent || factorySelectedId === null || isFactoryCopySaving || isFactoryAutoSaving) return;

    setIsFactoryCopySaving(true);
    try {
      if (view === "rendered") {
        await copyMarkdownAsRichText(taskContent);
      } else {
        await copyText(taskContent);
      }
    } catch {
      setHasCopiedFactoryTask(false);
      setFactoryCopyError("复制失败。请选中文本框内容后手动复制。");
      setIsFactoryCopySaving(false);
      return;
    }

    try {
      if (factorySavedKnowledgeId !== factorySelectedId) {
        await saveFactoryTaskToBlogFactory(factorySelectedId, taskContent);
        setFactoryCodexStatus("已复制，并已发送到博客工厂。");
      }
      setFactoryCopyError(null);
      setHasCopiedFactoryTask(true);
      window.setTimeout(() => setHasCopiedFactoryTask(false), 1600);
    } catch (error) {
      setHasCopiedFactoryTask(false);
      setFactoryCopyError(
        error instanceof Error ? `已复制，但保存到博客工厂失败：${error.message}` : "已复制，但保存到博客工厂失败。",
      );
    } finally {
      setIsFactoryCopySaving(false);
    }
  }

  async function handleMergeFactoryKnowledge(knowledgeIds: number[], mergeDraft: KnowledgeDraft) {
    setIsFactoryMerging(true);
    try {
      const merged = await mergeKnowledge(knowledgeIds, mergeDraft);
      invalidateApiCache(["/api/knowledge", "/api/blog-factory"]);
      setFactorySelectedId(merged.id);
      setFactoryTask("");
      setHasCopiedFactoryTask(false);
      setFactoryCopyError(null);
      setFactorySavedKnowledgeId(null);
      setFactoryPage(1);
      setFactoryRefreshToken((current) => current + 1);
      return merged;
    } finally {
      setIsFactoryMerging(false);
    }
  }

  function handleSelectFactoryItem(item: KnowledgeItem) {
    if (isFactoryGenerating || isFactoryAutoSaving) return;
    setFactorySelectedId(item.id);
    setFactoryTask("");
    setFactoryCodexStatus("");
    setHasCopiedFactoryTask(false);
    setFactoryCopyError(null);
    setFactorySavedKnowledgeId(null);
  }

  function handleSelectAdjacentFactoryKnowledge(direction: "previous" | "next") {
    if (isFactoryGenerating || isFactoryAutoSaving || factorySelectedId === null) return;

    const selectedIndex = factoryItems.findIndex((item) => item.id === factorySelectedId);
    if (selectedIndex === -1) return;

    const adjacentItem = direction === "previous" ? factoryItems[selectedIndex - 1] : factoryItems[selectedIndex + 1];
    if (adjacentItem) {
      handleSelectFactoryItem(adjacentItem);
      return;
    }

    const canMovePage = direction === "previous" ? factoryPage > 1 : factoryPage * FACTORY_PAGE_SIZE < factoryTotalItems;
    if (canMovePage) {
      pendingFactoryNavigationRef.current = direction;
      setFactoryPage((current) => (direction === "previous" ? Math.max(1, current - 1) : current + 1));
    }
  }

  async function handleSelectBlogFactoryItem(item: BlogFactoryItem) {
    const requestId = ++blogFactoryDetailRequestRef.current;
    setSelectedBlogFactoryItem(item);
    setIsMobileBlogFactoryDetailOpen(true);
    setBlogFactoryStatusError(null);
    setBlogFactoryEditError(null);
    setBlogFactoryTaskCopyError(null);
    setBlogFactorySendBackNotice(null);
    setHasCopiedBlogFactoryTask(false);
    setIsBlogFactoryDetailLoading(true);

    try {
      const detail = await getBlogFactoryItem(item.id);
      if (requestId !== blogFactoryDetailRequestRef.current) return;
      setSelectedBlogFactoryItem(detail);
      setBlogFactoryItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setBlogFactoryError(null);
    } catch (error) {
      if (requestId !== blogFactoryDetailRequestRef.current) return;
      setBlogFactoryError(error instanceof Error ? error.message : "读取博客工厂记录失败，请稍后重试。");
    } finally {
      if (requestId === blogFactoryDetailRequestRef.current) {
        setIsBlogFactoryDetailLoading(false);
      }
    }
  }

  function handleSelectAdjacentBlogFactoryItem(direction: "previous" | "next") {
    if (
      !selectedBlogFactoryItem ||
      isBlogFactoryDetailLoading ||
      isBlogFactoryStatusSaving ||
      isBlogFactoryItemSaving ||
      blogFactoryAssistSavingTargets.length > 0 ||
      isBlogFactorySendingToProcessing ||
      isBlogFactoryArticleSaving ||
      isBlogFactoryDeleting ||
      isBlogPublishing
    ) {
      return;
    }

    const selectedIndex = blogFactoryItems.findIndex((item) => item.id === selectedBlogFactoryItem.id);
    if (selectedIndex === -1) return;

    const adjacentItem = direction === "previous" ? blogFactoryItems[selectedIndex - 1] : blogFactoryItems[selectedIndex + 1];
    if (adjacentItem) {
      void handleSelectBlogFactoryItem(adjacentItem);
      return;
    }

    const canMovePage = direction === "previous" ? blogFactoryPage > 1 : blogFactoryPage * BLOG_FACTORY_PAGE_SIZE < blogFactoryTotal;
    if (canMovePage) {
      pendingBlogFactoryNavigationRef.current = direction;
      setBlogFactoryPage((current) => (direction === "previous" ? Math.max(1, current - 1) : current + 1));
    }
  }

  async function handleUpdateBlogFactoryStatus(status: BlogFactoryStatus) {
    if (!selectedBlogFactoryItem || isBlogFactoryStatusSaving) return;

    setIsBlogFactoryStatusSaving(true);
    setBlogFactoryStatusError(null);
    try {
      const updated = await updateBlogFactoryStatus(selectedBlogFactoryItem.id, status);
      setSelectedBlogFactoryItem(updated);
      setBlogFactoryItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setBlogFactoryRefreshToken((current) => current + 1);
    } catch (error) {
      setBlogFactoryStatusError(error instanceof Error ? error.message : "状态更新失败，请稍后重试。");
    } finally {
      setIsBlogFactoryStatusSaving(false);
    }
  }

  async function handleSendBlogFactoryItemToProcessing() {
    if (!selectedBlogFactoryItem || isBlogFactorySendingToProcessing) return;
    if (selectedBlogFactoryItem.factory_status !== "待处理") {
      setBlogFactoryStatusError("只有待处理任务可以发回知识加工。");
      return;
    }
    if (!blogFactoryEditDraft.taskContent.trim() || !blogFactoryEditDraft.questionSnapshot.trim()) {
      setBlogFactoryStatusError("任务内容和问题快照不能为空。");
      return;
    }

    setIsBlogFactorySendingToProcessing(true);
    setBlogFactoryStatusError(null);
    setBlogFactorySendBackNotice(null);
    try {
      const result = await sendBlogFactoryItemToProcessing({
        id: selectedBlogFactoryItem.id,
        taskContent: blogFactoryEditDraft.taskContent,
        questionSnapshot: blogFactoryEditDraft.questionSnapshot,
        sourceSnapshot: blogFactoryEditDraft.sourceSnapshot,
        topicTagSnapshot: blogFactoryEditDraft.topicTagSnapshot,
      });
      invalidateApiCache(["/api/blog-factory", "/api/knowledge"]);
      setSelectedBlogFactoryItem(result.item);
      setBlogFactoryItems((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      setBlogFactorySendBackNotice(`已创建待加工知识 #${result.knowledge.id}，当前任务已标记为跳过。`);
      setFactorySelectedId(result.knowledge.id);
      setFactoryTask("");
      setHasCopiedFactoryTask(false);
      setFactoryCopyError(null);
      setFactorySavedKnowledgeId(null);
      setFactoryQuery("");
      setFactoryUsername(getClearedScopedUsernameFilter(authUser));
      setFactoryPage(1);
      setFactoryRefreshToken((current) => current + 1);
      setBlogFactoryRefreshToken((current) => current + 1);
      setIsMobileBlogFactoryDetailOpen(false);
      setActiveView("factory");
    } catch (error) {
      setBlogFactoryStatusError(error instanceof Error ? error.message : "发回知识加工失败，请稍后重试。");
    } finally {
      setIsBlogFactorySendingToProcessing(false);
    }
  }

  async function handleSaveBlogFactoryItem(): Promise<boolean> {
    if (!selectedBlogFactoryItem || isBlogFactoryItemSaving || blogFactoryAssistSavingTargetsRef.current.size > 0) return false;
    if (!blogFactoryEditDraft.taskContent.trim() || !blogFactoryEditDraft.questionSnapshot.trim() || !blogFactoryEditDraft.answerSnapshot.trim()) {
      setBlogFactoryEditError("任务内容、问题快照和答案快照不能为空。");
      return false;
    }

    setIsBlogFactoryItemSaving(true);
    setBlogFactoryEditError(null);
    try {
      const updated = await updateBlogFactoryItem({
        id: selectedBlogFactoryItem.id,
        taskContent: blogFactoryEditDraft.taskContent,
        questionSnapshot: blogFactoryEditDraft.questionSnapshot,
        answerSnapshot: blogFactoryEditDraft.answerSnapshot,
        sourceSnapshot: blogFactoryEditDraft.sourceSnapshot,
        topicTagSnapshot: blogFactoryEditDraft.topicTagSnapshot,
        assistSummary: blogFactoryEditDraft.assistSummary,
        coverImageMarkdown: blogFactoryEditDraft.coverImageMarkdown,
        coverPromptSnapshot: blogFactoryEditDraft.coverPromptSnapshot,
      });
      invalidateApiCache(["/api/blog-factory"]);
      setSelectedBlogFactoryItem(updated);
      setBlogFactoryItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setBlogFactoryRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      setBlogFactoryEditError(error instanceof Error ? error.message : "任务编辑保存失败，请稍后重试。");
      return false;
    } finally {
      setIsBlogFactoryItemSaving(false);
    }
  }

  async function handleSaveBlogFactoryAssistMetadata(target: "summary" | "cover" | "prompt", value?: string): Promise<void> {
    if (!selectedBlogFactoryItem || isBlogFactoryItemSaving || blogFactoryAssistSavingTargetsRef.current.has(target)) {
      throw new Error("当前任务暂不可保存，请稍后重试。");
    }

    const itemId = selectedBlogFactoryItem.id;
    blogFactoryAssistSavingTargetsRef.current.add(target);
    setBlogFactoryAssistSavingTargets((current) => (current.includes(target) ? current : [...current, target]));
    setBlogFactoryEditError(null);
    try {
      const updated = await updateBlogFactoryAssistMetadata({
        id: itemId,
        ...(target === "summary"
          ? { assistSummary: blogFactoryEditDraft.assistSummary }
          : target === "cover"
            ? { coverImageMarkdown: blogFactoryEditDraft.coverImageMarkdown }
            : { coverPromptSnapshot: value ?? blogFactoryEditDraft.coverPromptSnapshot }),
      });
      invalidateApiCache(["/api/blog-factory"]);
      const mergeSavedAssistField = (item: BlogFactoryItem) =>
        target === "summary"
          ? { ...item, assist_summary: updated.assist_summary }
          : target === "cover"
            ? { ...item, cover_image_markdown: updated.cover_image_markdown }
            : { ...item, cover_prompt_snapshot: updated.cover_prompt_snapshot };
      if (target === "prompt") setBlogFactoryEditDraft((current) => ({ ...current, coverPromptSnapshot: updated.cover_prompt_snapshot ?? "" }));
      setSelectedBlogFactoryItem((current) => (current?.id === itemId ? mergeSavedAssistField(current) : current));
      setBlogFactoryItems((current) => current.map((item) => (item.id === itemId ? mergeSavedAssistField(item) : item)));
      setBlogFactoryRefreshToken((current) => current + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败，请稍后重试。";
      setBlogFactoryEditError(message);
      throw new Error(message);
    } finally {
      blogFactoryAssistSavingTargetsRef.current.delete(target);
      setBlogFactoryAssistSavingTargets((current) => current.filter((savingTarget) => savingTarget !== target));
    }
  }

  function handleOpenBlogFactoryMaskDialog() {
    const selectedRule = blogFactoryMaskRules.find((item) => item.id === selectedBlogFactoryMaskRuleId) ?? null;
    setBlogFactoryMaskRuleDraft(selectedRule ? cloneBlogFactoryMaskRule(selectedRule) : createEmptyBlogFactoryMaskRule());
    setBlogFactoryMaskError(null);
    setIsBlogFactoryMaskDialogOpen(true);
  }

  function handleCreateBlogFactoryMaskRule() {
    setBlogFactoryMaskRuleDraft(createEmptyBlogFactoryMaskRule());
    setBlogFactoryMaskError(null);
  }

  function handleSelectBlogFactoryMaskRule(ruleId: string) {
    const selectedRule = blogFactoryMaskRules.find((item) => item.id === ruleId);
    if (!selectedRule) return;
    setSelectedBlogFactoryMaskRuleId(ruleId);
    setBlogFactoryMaskRuleDraft(cloneBlogFactoryMaskRule(selectedRule));
    setBlogFactoryMaskError(null);
  }

  function handleSaveBlogFactoryMaskRule() {
    const normalizedRule = normalizeBlogFactoryMaskRule(blogFactoryMaskRuleDraft);
    if (!normalizedRule.name) {
      setBlogFactoryMaskError("规则名称不能为空。");
      return;
    }
    if (!hasEnabledBlogFactoryMaskRule(normalizedRule)) {
      setBlogFactoryMaskError("至少配置一个关键词替换或开启一个通用脱敏项。");
      return;
    }

    setBlogFactoryMaskRules((current) => {
      const nextRule = cloneBlogFactoryMaskRule(normalizedRule);
      return current.some((item) => item.id === nextRule.id)
        ? current.map((item) => (item.id === nextRule.id ? nextRule : item))
        : [nextRule, ...current];
    });
    setSelectedBlogFactoryMaskRuleId(normalizedRule.id);
    setBlogFactoryMaskRuleDraft(cloneBlogFactoryMaskRule(normalizedRule));
    setBlogFactoryMaskError(null);
    setBlogFactoryMaskNotice(`已保存脱敏规则“${normalizedRule.name}”。`);
  }

  function handleApplyBlogFactoryMaskRule(ruleId: string | null = selectedBlogFactoryMaskRuleId) {
    if (!blogFactoryEditDraft.taskContent.trim()) {
      setBlogFactoryMaskError("当前任务内容为空，无法执行脱敏。");
      return;
    }

    const selectedRule = blogFactoryMaskRules.find((item) => item.id === ruleId);
    if (!selectedRule) {
      setBlogFactoryMaskError("请先保存并选择一套脱敏规则。");
      return;
    }

    const normalizedRule = normalizeBlogFactoryMaskRule(selectedRule);
    if (!hasEnabledBlogFactoryMaskRule(normalizedRule)) {
      setBlogFactoryMaskError("所选规则未启用任何脱敏项。");
      return;
    }

    const nextTaskContent = applyBlogFactoryMaskRule(blogFactoryEditDraft.taskContent, normalizedRule);
    setBlogFactoryEditDraft((current) => ({
      ...current,
      taskContent: nextTaskContent,
    }));
    setBlogFactoryEditError(null);
    setBlogFactoryMaskError(null);
    setBlogFactoryMaskNotice(
      nextTaskContent === blogFactoryEditDraft.taskContent
        ? `已应用规则“${normalizedRule.name}”，当前内容未命中可脱敏片段。`
        : `已按规则“${normalizedRule.name}”更新当前任务内容。`,
    );
  }

  function handleRequestDeleteBlogFactoryItem() {
    if (!selectedBlogFactoryItem || isBlogFactoryDeleting) return;
    setBlogFactoryDeleteTarget(selectedBlogFactoryItem);
  }

  async function handleConfirmDeleteBlogFactoryItem() {
    if (!blogFactoryDeleteTarget || isBlogFactoryDeleting) return;

    setIsBlogFactoryDeleting(true);
    setBlogFactoryEditError(null);
    try {
      await deleteBlogFactoryItem(blogFactoryDeleteTarget.id);
      invalidateApiCache(["/api/blog-factory"]);
      setBlogFactoryItems((current) => current.filter((item) => item.id !== blogFactoryDeleteTarget.id));
      setBlogFactoryTotal((current) => Math.max(0, current - 1));
      setSelectedBlogFactoryItem(null);
      setIsMobileBlogFactoryDetailOpen(false);
      setBlogFactoryDeleteTarget(null);

      const remainingOnPage = blogFactoryItems.filter((item) => item.id !== blogFactoryDeleteTarget.id).length;
      if (remainingOnPage === 0 && blogFactoryPage > 1) {
        setBlogFactoryPage((current) => Math.max(1, current - 1));
      } else {
        setBlogFactoryRefreshToken((current) => current + 1);
      }
    } catch (error) {
      setBlogFactoryEditError(error instanceof Error ? error.message : "博客工厂任务删除失败，请稍后重试。");
    } finally {
      setIsBlogFactoryDeleting(false);
    }
  }

  async function handleSaveBlogFactoryArticle() {
    if (!selectedBlogFactoryItem || isBlogFactoryArticleSaving || !blogFactoryArticleDraft.trim()) return;

    setIsBlogFactoryArticleSaving(true);
    setBlogFactoryArticleError(null);
    try {
      const updated = await updateBlogFactoryArticle({
        id: selectedBlogFactoryItem.id,
        articleMarkdown: blogFactoryArticleDraft,
        articleFilePath: blogFactoryArticlePathDraft,
      });
      setSelectedBlogFactoryItem(updated);
      setBlogFactoryItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setBlogFactoryRefreshToken((current) => current + 1);
    } catch (error) {
      setBlogFactoryArticleError(error instanceof Error ? error.message : "Markdown 保存失败，请稍后重试。");
    } finally {
      setIsBlogFactoryArticleSaving(false);
    }
  }

  function handleOpenBlogPublishConfigDialog() {
    const preferredConfig = resolvePreferredBlogPublishConfig(blogPublishConfigs, selectedBlogPublishConfigId);
    setSelectedBlogPublishConfigId(preferredConfig?.id ?? null);
    setBlogPublishConfigDraft(preferredConfig ? blogPublishConfigToDraft(preferredConfig) : emptyBlogPublishConfigDraft);
    setBlogPublishConfigError(null);
    setBlogPublishConfigValidationMessage(null);
    setIsBlogPublishConfigDialogOpen(true);
  }

  function handleCreateNewBlogPublishConfig() {
    setSelectedBlogPublishConfigId(null);
    setBlogPublishConfigDraft({
      ...emptyBlogPublishConfigDraft,
      isDefault: blogPublishConfigs.length === 0,
    });
    setBlogPublishConfigError(null);
    setBlogPublishConfigValidationMessage(null);
  }

  function handleSelectBlogPublishConfigForEdit(configId: number) {
    const config = blogPublishConfigs.find((item) => item.id === configId);
    if (!config) return;
    setSelectedBlogPublishConfigId(config.id);
    setBlogPublishConfigDraft(blogPublishConfigToDraft(config));
    setBlogPublishConfigError(null);
    setBlogPublishConfigValidationMessage(null);
  }

  async function handleValidateCurrentBlogPublishConfig() {
    if (isBlogPublishConfigValidating) return;
    if (
      !blogPublishConfigDraft.blogUrl.trim() ||
      !blogPublishConfigDraft.username.trim() ||
      !blogPublishConfigDraft.password.trim() ||
      !blogPublishConfigDraft.apiUrl.trim()
    ) {
      setBlogPublishConfigError("博客网址、账号、密码和 API 地址不能为空。");
      return;
    }

    setIsBlogPublishConfigValidating(true);
    setBlogPublishConfigError(null);
    setBlogPublishConfigValidationMessage(null);
    try {
      const result = await validateBlogPublishConfig({
        blogType: blogPublishConfigDraft.blogType,
        blogUrl: blogPublishConfigDraft.blogUrl,
        username: blogPublishConfigDraft.username,
        password: blogPublishConfigDraft.password,
        apiUrl: blogPublishConfigDraft.apiUrl,
        blogName: blogPublishConfigDraft.blogName,
      });
      setBlogPublishConfigDraft((current) => ({
        ...current,
        blogName: result.blog_name ?? current.blogName,
        validation: result,
      }));
      setBlogPublishConfigValidationMessage(result.message);
    } catch (error) {
      setBlogPublishConfigError(error instanceof Error ? error.message : "Metaweblog 验证失败，请稍后重试。");
    } finally {
      setIsBlogPublishConfigValidating(false);
    }
  }

  async function handleSaveBlogPublishConfig() {
    if (isBlogPublishConfigSaving) return;
    if (
      !blogPublishConfigDraft.blogUrl.trim() ||
      !blogPublishConfigDraft.username.trim() ||
      !blogPublishConfigDraft.apiUrl.trim()
    ) {
      setBlogPublishConfigError("博客网址、账号和 API 地址不能为空。");
      return;
    }
    if (selectedBlogPublishConfigId === null && !blogPublishConfigDraft.password.trim()) {
      setBlogPublishConfigError("首次保存配置时必须填写密码。");
      return;
    }

    setIsBlogPublishConfigSaving(true);
    setBlogPublishConfigError(null);
    try {
      const saved =
        selectedBlogPublishConfigId === null
          ? await createBlogPublishConfig({
              blogType: blogPublishConfigDraft.blogType,
              blogUrl: blogPublishConfigDraft.blogUrl,
              username: blogPublishConfigDraft.username,
              password: blogPublishConfigDraft.password,
              apiUrl: blogPublishConfigDraft.apiUrl,
              blogName: blogPublishConfigDraft.blogName,
              isDefault: blogPublishConfigDraft.isDefault,
            })
          : await updateBlogPublishConfig({
              id: selectedBlogPublishConfigId,
              blogType: blogPublishConfigDraft.blogType,
              blogUrl: blogPublishConfigDraft.blogUrl,
              username: blogPublishConfigDraft.username,
              password: blogPublishConfigDraft.password,
              apiUrl: blogPublishConfigDraft.apiUrl,
              blogName: blogPublishConfigDraft.blogName,
              isDefault: blogPublishConfigDraft.isDefault,
            });
      invalidateApiCache(["/api/blog-factory/publish-configs", "/api/blog-factory"]);
      setBlogPublishConfigs((current) => upsertBlogPublishConfig(current, saved));
      setSelectedBlogPublishConfigId(saved.id);
      setBlogPublishDialogConfigId(saved.id);
      setBlogPublishConfigDraft(blogPublishConfigToDraft(saved));
      setBlogPublishConfigValidationMessage("配置已保存。");
      setBlogFactoryRefreshToken((current) => current + 1);
      setIsBlogPublishConfigDialogOpen(false);
    } catch (error) {
      setBlogPublishConfigError(error instanceof Error ? error.message : "博客发布配置保存失败，请稍后重试。");
    } finally {
      setIsBlogPublishConfigSaving(false);
    }
  }

  function handleRequestDeleteBlogPublishConfig() {
    if (selectedBlogPublishConfigId === null || isBlogPublishConfigDeleting) return;
    const target = blogPublishConfigs.find((item) => item.id === selectedBlogPublishConfigId);
    if (!target) return;
    setBlogPublishConfigDeleteTarget(target);
  }

  async function handleConfirmDeleteBlogPublishConfig() {
    if (!blogPublishConfigDeleteTarget || isBlogPublishConfigDeleting) return;

    setIsBlogPublishConfigDeleting(true);
    setBlogPublishConfigError(null);
    try {
      await deleteBlogPublishConfig(blogPublishConfigDeleteTarget.id);
      invalidateApiCache(["/api/blog-factory/publish-configs", "/api/blog-factory"]);
      setBlogPublishConfigs((current) => current.filter((item) => item.id !== blogPublishConfigDeleteTarget.id));
      const remaining = blogPublishConfigs.filter((item) => item.id !== blogPublishConfigDeleteTarget.id);
      const fallback = resolvePreferredBlogPublishConfig(remaining, null);
      setSelectedBlogPublishConfigId(fallback?.id ?? null);
      setBlogPublishDialogConfigId(fallback?.id ?? null);
      setBlogPublishConfigDraft(fallback ? blogPublishConfigToDraft(fallback) : emptyBlogPublishConfigDraft);
      setBlogPublishConfigDeleteTarget(null);
      setBlogFactoryRefreshToken((current) => current + 1);
    } catch (error) {
      setBlogPublishConfigError(error instanceof Error ? error.message : "博客发布配置删除失败，请稍后重试。");
    } finally {
      setIsBlogPublishConfigDeleting(false);
    }
  }

  function handleOpenBlogPublishDialog(mode: BlogPublishDialogMode) {
    const preferredConfig = resolvePreferredBlogPublishConfig(
      blogPublishConfigs,
      selectedBlogFactoryItem?.remote_publish_config_id ?? blogPublishDialogConfigId ?? selectedBlogPublishConfigId,
    );
    setBlogPublishDialogMode(mode);
    setBlogPublishDialogConfigId(preferredConfig?.id ?? null);
    setBlogPublishSubmissionOption(selectedBlogFactoryItem?.remote_submission_option ?? "CNBLOGS_HOME");
    setBlogPublishCategories([]);
    setBlogPublishSelectedCategories([]);
    setBlogPublishTagDraft(
      selectedBlogFactoryItem?.remote_tags_snapshot ?? blogFactoryEditDraft.topicTagSnapshot ?? selectedBlogFactoryItem?.topic_tag_snapshot ?? "",
    );
    setBlogPublishCategoriesError(null);
    setBlogPublishError(null);
    setBlogPublishSuccess(null);
    setIsBlogPublishDialogOpen(true);
  }

  function handleBlogPublishDialogConfigChange(configId: number) {
    setBlogPublishDialogConfigId(configId);
    setBlogPublishSubmissionOption("CNBLOGS_HOME");
    setBlogPublishCategories([]);
    setBlogPublishSelectedCategories([]);
    setBlogPublishCategoriesError(null);
  }

  async function handleConfirmBlogPublishFromDialog() {
    if (!selectedBlogFactoryItem || !blogPublishDialogConfigId || isBlogPublishing) return;
    const publishMarkdown = resolveBlogFactoryPublishMarkdown(selectedBlogFactoryItem, blogFactoryArticleDraft, blogFactoryEditDraft.taskContent);
    if (!publishMarkdown) {
      setBlogPublishError("没有可发布的正文内容：系统会优先使用已保存文章，否则回退到任务内容。");
      return;
    }

    setIsBlogPublishing(true);
    setBlogPublishError(null);
    setBlogPublishSuccess(null);
    try {
      const result = await publishBlogFactoryArticle({
        id: selectedBlogFactoryItem.id,
        configId: blogPublishDialogConfigId,
        articleMarkdown: publishMarkdown,
        articleTitle: extractMarkdownHeading(publishMarkdown) || selectedBlogFactoryItem.article_title || undefined,
        categories: blogPublishSelectedCategories,
        tags: splitBlogPublishTags(blogPublishTagDraft),
        submissionOption: blogPublishSubmissionOption,
        publish: blogPublishDialogMode === "publish",
      });
      invalidateApiCache(["/api/blog-factory", "/api/knowledge"]);
      setSelectedBlogFactoryItem(result.item);
      setBlogFactoryItems((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      setBlogPublishSuccess(result);
      setBlogFactoryRefreshToken((current) => current + 1);
      setIsBlogPublishDialogOpen(false);
    } catch (error) {
      setBlogPublishError(error instanceof Error ? error.message : "博客发布失败，请稍后重试。");
    } finally {
      setIsBlogPublishing(false);
    }
  }

  async function handleSelectTodo(item: TodoItem) {
    const requestId = ++todoDetailRequestRef.current;
    setSelectedTodoId(item.id);
    selectedTodoSavedDraftRef.current = todoItemToDraft(item);
    selectedTodoSavedStatusRef.current = item.todo_status;
    setIsMobileTodoEditorOpen(true);
    setTodoDraft(resolveTodoEditorDraft(item, todoDraftsByIdRef.current));
    setTodoSaveError(null);
    setTodoCopyError(null);
    setHasCopiedTodoContent(false);
    setIsTodoDetailLoading(true);

    try {
      const detail = await getTodo(item.id);
      if (requestId !== todoDetailRequestRef.current) return;
      const savedDraft = todoItemToDraft(detail);
      selectedTodoSavedDraftRef.current = savedDraft;
      selectedTodoSavedStatusRef.current = detail.todo_status;
      setTodoDraft(resolveTodoEditorDraft(detail, todoDraftsByIdRef.current));
      setTodoItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setTodoError(null);
    } catch (error) {
      if (requestId !== todoDetailRequestRef.current) return;
      setTodoError(error instanceof Error ? error.message : "读取待办事项失败，请稍后重试。");
    } finally {
      if (requestId === todoDetailRequestRef.current) {
        setIsTodoDetailLoading(false);
      }
    }
  }

  function handleSelectAdjacentTodo(direction: "previous" | "next") {
    if (
      selectedTodoId === null ||
      isTodoDetailLoading ||
      isTodoSaving ||
      isConvertingTodoToKnowledge
    ) {
      return;
    }

    const selectedIndex = todoItems.findIndex((item) => item.id === selectedTodoId);
    if (selectedIndex === -1) return;

    if (direction === "previous") {
      const previousItem = todoItems[selectedIndex - 1];
      if (previousItem) {
        void handleSelectTodo(previousItem);
        return;
      }

      if (todoPage > 1) {
        pendingTodoNavigationRef.current = "previous";
        setTodoPage((current) => Math.max(1, current - 1));
      }
      return;
    }

    const nextItem = todoItems[selectedIndex + 1];
    if (nextItem) {
      void handleSelectTodo(nextItem);
      return;
    }

    if (todoPage * TODO_PAGE_SIZE < todoTotal) {
      pendingTodoNavigationRef.current = "next";
      setTodoPage((current) => current + 1);
    }
  }

  async function handleUpdateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTodoId === null || isTodoSaving || !todoDraft.title.trim() || !todoDraft.content.trim()) return;

    const previousTodoStatus =
      selectedTodoSavedStatusRef.current ?? todoItems.find((item) => item.id === selectedTodoId)?.todo_status ?? null;
    setIsTodoSaving(true);
    setTodoSaveError(null);
    setTodoCopyError(null);
    try {
      const updated = await updateTodo(selectedTodoId, todoDraft);
      const savedDraft = todoItemToDraft(updated);
      selectedTodoSavedDraftRef.current = savedDraft;
      selectedTodoSavedStatusRef.current = updated.todo_status;
      setTodoDraft(savedDraft);
      setTodoDraftsById((current) => {
        if (!(selectedTodoId in current)) return current;
        const next = { ...current };
        delete next[selectedTodoId];
        return next;
      });
      setTodoItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTodoRefreshToken((current) => current + 1);
      if (previousTodoStatus !== "已完成" && updated.todo_status === "已完成") {
        void prepareTodoCurrentAppend(updated);
      }
    } catch (error) {
      setTodoSaveError(error instanceof Error ? error.message : "待办事项保存失败，请稍后重试。");
    } finally {
      setIsTodoSaving(false);
    }
  }

  function resetTodoCurrentAppendState() {
    todoCurrentAppendRequestRef.current += 1;
    setPendingTodoCurrentAppend(null);
    setTodoCurrentAppendTarget({ username: "", type: "", week: "", day: "" });
    setTodoCurrentAppendMatchedPoint({ week: "", day: "" });
    setTodoCurrentAppendError(null);
    setIsTodoCurrentAppendOptionsLoading(false);
  }

  async function hydrateTodoCurrentAppendTarget(options: CurrentRecordOptions, preferred?: CurrentAppendTarget) {
    const nextTarget = resolveCurrentAppendTarget(options, preferred);
    const preferredWeek = preferred?.username === nextTarget.username && preferred?.type === nextTarget.type ? preferred.week : "";
    const preferredDay = preferred?.username === nextTarget.username && preferred?.type === nextTarget.type ? preferred.day : "";
    setTodoCurrentAppendTarget(nextTarget);

    if (!nextTarget.username || !nextTarget.type) return;

    const requestId = ++todoCurrentAppendRequestRef.current;
    setIsTodoCurrentAppendOptionsLoading(true);
    setTodoCurrentAppendError(null);
    try {
      const response = await fetchCurrentRecords({
        username: nextTarget.username,
        type: nextTarget.type,
        sortBy: "id",
        sortDir: "desc",
        limit: 1,
        offset: 0,
      });
      if (todoCurrentAppendRequestRef.current !== requestId) return;

      const matched = response.items[0];
      if (!matched) {
        setTodoCurrentAppendMatchedPoint({ week: "", day: "" });
        setTodoCurrentAppendTarget((current) =>
          current.username === nextTarget.username && current.type === nextTarget.type ? { ...current, week: "", day: "" } : current,
        );
        setTodoCurrentAppendError("未找到对应的当前记录，请先检查用户和类型。");
        return;
      }

      setTodoCurrentAppendMatchedPoint({ week: matched.week, day: matched.day });
      setTodoCurrentAppendTarget((current) =>
        current.username === nextTarget.username && current.type === nextTarget.type
          ? {
              ...current,
              week: current.week || preferredWeek || matched.week,
              day: current.day || preferredDay || matched.day,
            }
          : current,
      );
    } catch (error) {
      if (todoCurrentAppendRequestRef.current !== requestId) return;
      setTodoCurrentAppendError(error instanceof Error ? error.message : "当前记录读取失败，请稍后重试。");
    } finally {
      if (todoCurrentAppendRequestRef.current === requestId) {
        setIsTodoCurrentAppendOptionsLoading(false);
      }
    }
  }

  function handleTodoCurrentAppendTargetChange(nextTarget: CurrentAppendTarget) {
    if (nextTarget.username !== todoCurrentAppendTarget.username || nextTarget.type !== todoCurrentAppendTarget.type) {
      setTodoCurrentAppendError(null);
      void hydrateTodoCurrentAppendTarget(currentRecordOptions, nextTarget);
      return;
    }

    setTodoCurrentAppendTarget(nextTarget);
  }

  async function prepareTodoCurrentAppend(todo: TodoItem) {
    setPendingTodoCurrentAppend(todo);
    setTodoCurrentAppendError(null);

    const cached = readCachedCurrentRecordOptions();
    if (cached) {
      const nextOptions = normalizeCurrentRecordOptions(cached);
      setCurrentRecordOptions(nextOptions);
      void hydrateTodoCurrentAppendTarget(nextOptions, todoCurrentAppendTargetRef.current);
    } else {
      void hydrateTodoCurrentAppendTarget(currentRecordOptions, todoCurrentAppendTargetRef.current);
    }

    try {
      const options = normalizeCurrentRecordOptions(await fetchCurrentRecordOptions());
      setCurrentRecordOptions(options);
      void hydrateTodoCurrentAppendTarget(options, todoCurrentAppendTargetRef.current);
    } catch (error) {
      setTodoCurrentAppendError(error instanceof Error ? error.message : "当前记录选项读取失败，请稍后重试。");
    }
  }

  async function confirmTodoCurrentAppend() {
    if (
      pendingTodoCurrentAppend === null ||
      isAppendingTodoToCurrent ||
      !todoCurrentAppendTarget.username ||
      !todoCurrentAppendTarget.type ||
      !todoCurrentAppendTarget.week ||
      !todoCurrentAppendTarget.day
    ) {
      return;
    }

    setIsAppendingTodoToCurrent(true);
    setTodoCurrentAppendError(null);
    try {
      const updated = await appendTodoToCurrent({
        id: pendingTodoCurrentAppend.id,
        username: todoCurrentAppendTarget.username,
        type: todoCurrentAppendTarget.type,
        week: todoCurrentAppendTarget.week,
        day: todoCurrentAppendTarget.day,
        replaceExistingContent:
          todoCurrentAppendTarget.week !== todoCurrentAppendMatchedPoint.week ||
          todoCurrentAppendTarget.day !== todoCurrentAppendMatchedPoint.day,
      });
      invalidateApiCache(["/api/current-records", "/api/todos"]);
      setCurrentRecordItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setCurrentRecordRefreshToken((current) => current + 1);
      resetTodoCurrentAppendState();
    } catch (error) {
      setTodoCurrentAppendError(error instanceof Error ? error.message : "追加到当前记录失败，请稍后重试。");
    } finally {
      setIsAppendingTodoToCurrent(false);
    }
  }

  async function handleCopyTodoContent() {
    const title = todoDraft.title.trim();
    const content = todoDraft.content.trim();
    if (selectedTodoId === null || (!title && !content)) return;

    try {
      await copyText(`任务目标：${title || "未填写"}\n\n任务内容：\n${content || "未填写"}`);
      setTodoCopyError(null);
      setHasCopiedTodoContent(true);
      window.setTimeout(() => setHasCopiedTodoContent(false), 1600);
    } catch {
      setHasCopiedTodoContent(false);
      setTodoCopyError("复制失败。请选中文本后手动复制。");
    }
  }

  async function handleSelectPersonalSecret(item: PersonalSecretItem) {
    setSelectedPersonalSecretId(item.id);
    setIsMobilePersonalSecretDetailOpen(true);
    setPersonalSecretSaveError(null);
    setPersonalSecretCopyNotice(null);
    setPersonalSecretCopiedField(null);
  }

  async function handleLoadPersonalSecretForEdit(secretId: number) {
    setIsPersonalSecretDetailLoading(true);
    setPersonalSecretSaveError(null);
    try {
      const [detail, revealed] = await Promise.all([getPersonalSecret(secretId), revealPersonalSecret(secretId, "all")]);
      const values = revealed.values ?? {};
      setPersonalSecretItems((current) => current.map((item) => (item.id === detail.id ? detail : item)));
      setPersonalSecretDraft({
        system_name: detail.system_name,
        login_url: detail.login_url ?? "",
        username: values.username ?? "",
        password: values.password ?? "",
        notes: values.notes ?? "",
        tags: detail.tags ?? "",
      });
      setIsPersonalSecretEditorOpen(true);
    } catch (error) {
      setPersonalSecretSaveError(error instanceof Error ? error.message : "读取机密详情失败，请稍后重试。");
    } finally {
      setIsPersonalSecretDetailLoading(false);
    }
  }

  async function handleSavePersonalSecret() {
    if (isPersonalSecretSaving || !personalSecretDraft.system_name.trim()) return;

    setIsPersonalSecretSaving(true);
    setPersonalSecretSaveError(null);
    try {
      const saved =
        selectedPersonalSecretId === null
          ? await createPersonalSecret(personalSecretDraft)
          : await updatePersonalSecret(selectedPersonalSecretId, personalSecretDraft);
      setSelectedPersonalSecretId(saved.id);
      setPersonalSecretDraft(emptyPersonalSecretDraft);
      setPersonalSecretRefreshToken((current) => current + 1);
      setPersonalSecretCopyNotice("已保存。");
      setIsPersonalSecretEditorOpen(false);
    } catch (error) {
      setPersonalSecretSaveError(error instanceof Error ? error.message : "机密保存失败，请稍后重试。");
    } finally {
      setIsPersonalSecretSaving(false);
    }
  }

  async function handleDeletePersonalSecret() {
    if (selectedPersonalSecretId === null || isPersonalSecretDeleting) return;
    setIsPersonalSecretDeleting(true);
    setPersonalSecretSaveError(null);
    try {
      await deletePersonalSecret(selectedPersonalSecretId);
      setPersonalSecretItems((current) => current.filter((item) => item.id !== selectedPersonalSecretId));
      setPersonalSecretTotal((current) => Math.max(0, current - 1));
      setSelectedPersonalSecretId(null);
      setPersonalSecretDraft(emptyPersonalSecretDraft);
      setIsPersonalSecretEditorOpen(false);
      setIsMobilePersonalSecretDetailOpen(false);
      setPersonalSecretCopiedField(null);
      setPersonalSecretRefreshToken((current) => current + 1);
    } catch (error) {
      setPersonalSecretSaveError(error instanceof Error ? error.message : "机密删除失败，请稍后重试。");
    } finally {
      setIsPersonalSecretDeleting(false);
    }
  }

  async function handleCopyPersonalSecretField(field: PersonalSecretRevealField) {
    const selectedItem = personalSecretItems.find((item) => item.id === selectedPersonalSecretId);
    if (!selectedItem) return;

    try {
      const revealed = await revealPersonalSecret(selectedItem.id, field);
      const value =
        field === "system_name"
          ? selectedItem.system_name
          : field === "login_url"
            ? selectedItem.login_url ?? ""
            : field === "all"
              ? formatPersonalSecretAllCopy(revealed.values ?? {})
              : revealed.value ?? "";
      await copyText(value);
      setPersonalSecretCopyNotice(null);
      setPersonalSecretCopiedField(field);
      window.setTimeout(() => {
        setPersonalSecretCopiedField((current) => (current === field ? null : current));
      }, 1600);
    } catch {
      setPersonalSecretCopiedField(null);
      setPersonalSecretCopyNotice("复制失败。请稍后重试。");
    }
  }

  function handleTodoDraftChange(nextDraft: TodoDraft) {
    setTodoDraft(nextDraft);
    if (selectedTodoId === null) return;

    setTodoDraftsById((current) => {
      if (areTodoDraftsEqual(nextDraft, selectedTodoSavedDraftRef.current)) {
        if (!(selectedTodoId in current)) return current;
        const next = { ...current };
        delete next[selectedTodoId];
        return next;
      }

      return { ...current, [selectedTodoId]: nextDraft };
    });
  }

  function handleConvertSelectedTodoToKnowledge() {
    if (selectedTodoId === null || isConvertingTodoToKnowledge || isTodoSaving) return;
    setConversionTarget("todoToKnowledge");
  }

  async function confirmConvertSelectedTodoToKnowledge() {
    if (selectedTodoId === null || isConvertingTodoToKnowledge || isTodoSaving) return;

    setConversionTarget(null);
    setIsConvertingTodoToKnowledge(true);
    setTodoSaveError(null);
    try {
      const converted = await convertTodoToKnowledge(selectedTodoId);
      invalidateApiCache(["/api/todos", "/api/knowledge"]);
      setTodoItems((current) => current.filter((item) => item.id !== selectedTodoId));
      setTodoTotal((current) => Math.max(0, current - 1));
      setSelectedTodoId(null);
      selectedTodoSavedStatusRef.current = null;
      selectedTodoSavedDraftRef.current = emptyTodoDraft;
      setIsMobileTodoEditorOpen(false);
      setTodoDraft(emptyTodoDraft);
      setTodoDraftsById((current) => {
        if (!(selectedTodoId in current)) return current;
        const next = { ...current };
        delete next[selectedTodoId];
        return next;
      });
      setTodoCopyError(null);
      setHasCopiedTodoContent(false);
      setDraft(itemToDraft(converted));
      setSelectedId(converted.id);
      setPage(1);
      setStatusFilter("all");
      setTodoRefreshToken((current) => current + 1);
      setRefreshToken((current) => current + 1);
      setActiveView("workbench");
    } catch (error) {
      setTodoSaveError(error instanceof Error ? error.message : "转换为可信知识失败，请稍后重试。");
    } finally {
      setIsConvertingTodoToKnowledge(false);
    }
  }

  async function handleCopyBlogFactoryArticle(mode: BlogFactoryArticleCopyMode) {
    const markdown = selectedBlogFactoryItem?.article_markdown ?? blogFactoryArticleDraft;
    if (!markdown.trim()) return;

    try {
      if (mode === "enhanced") {
        await copyMarkdownAsEnhancedRichText(markdown, {
          downloadFileName: buildBlogFactoryArticleExportFileName(selectedBlogFactoryItem?.id ?? null, selectedBlogFactoryItem?.article_title, markdown),
          documentTitle: selectedBlogFactoryItem?.article_title ?? extractMarkdownHeading(markdown) ?? "博客工厂文章",
          summary: selectedBlogFactoryItem?.assist_summary,
          coverPrompt: selectedBlogFactoryItem?.cover_prompt_snapshot,
        });
      } else {
        await copyText(markdown);
      }
      setBlogFactoryArticleError(null);
      setBlogFactoryArticleCopiedMode(mode);
      window.setTimeout(() => setBlogFactoryArticleCopiedMode(null), 1600);
    } catch {
      setBlogFactoryArticleError("复制失败。请选中文本框内容后手动复制。");
    }
  }

  async function handleCopyBlogFactoryTaskContent(view: BlogFactoryTaskCopyMode) {
    const taskContent = removeLeakedMarkdownCodePlaceholders(selectedBlogFactoryItem?.task_content ?? "");
    if (!taskContent.trim()) return;

    try {
      if (view === "enhanced") {
        await copyMarkdownAsEnhancedRichText(taskContent, {
          downloadFileName: buildBlogFactoryTaskExportFileName(
            selectedBlogFactoryItem?.id ?? null,
            selectedBlogFactoryItem?.knowledge_id ?? null,
          ),
          documentTitle: buildBlogFactoryTaskDocumentTitle(
            selectedBlogFactoryItem?.id ?? null,
            selectedBlogFactoryItem?.knowledge_id ?? null,
          ),
          summary: selectedBlogFactoryItem?.assist_summary,
          coverPrompt: selectedBlogFactoryItem?.cover_prompt_snapshot,
        });
      } else if (view === "rendered") {
        await copyMarkdownAsRichText(taskContent);
      } else {
        await copyMarkdownAsPlainText(taskContent);
      }
      setBlogFactoryTaskCopyError(null);
      setHasCopiedBlogFactoryTask(true);
      window.setTimeout(() => setHasCopiedBlogFactoryTask(false), 1600);
    } catch {
      setBlogFactoryTaskCopyError("复制失败。请选中任务内容后手动复制。");
    }
  }

  function handleUseBlogFactoryTaskAsArticle() {
    const taskContent = removeLeakedMarkdownCodePlaceholders(blogFactoryEditDraft.taskContent);
    if (!taskContent.trim()) {
      setBlogFactoryArticleError("任务内容为空，无法载入到 Markdown 正文。");
      return;
    }

    setBlogFactoryArticleDraft(taskContent);
    setBlogFactoryArticleError(null);
    setBlogFactoryArticleCopiedMode(null);
  }

  async function handleCreateCurrentRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRecordDraft.username.trim() || !currentRecordDraft.type.trim() || isCurrentRecordSaving) return;

    setIsCurrentRecordSaving(true);
    setCurrentRecordSaveError(null);
    try {
      const created = await createCurrentRecord({
        username: currentRecordDraft.username,
        type: currentRecordDraft.type,
        content: currentRecordDraft.content,
      });
      setCurrentRecordDraft((current) => ({ username: current.username, type: "", content: "" }));
      setSelectedCurrentRecord(created);
      setCurrentRecordPage(1);
      setCurrentRecordRefreshToken((current) => current + 1);
    } catch (error) {
      setCurrentRecordSaveError(error instanceof Error ? error.message : "当前记录新增失败，请稍后重试。");
    } finally {
      setIsCurrentRecordSaving(false);
    }
  }

  async function handleUpdateCurrentRecord(record: CurrentRecordItem, next: { week: CurrentWeek; day: CurrentDay; content: string }) {
    if (isCurrentRecordUpdating) return;
    const wrapsToNextLevel = record.week === "W48" && next.week === "W1";
    if (wrapsToNextLevel && (record.learn_level ?? 1) >= 10) {
      setPendingCurrentRecordUpdate({ record, next });
      return;
    }

    await updateCurrentRecordAfterConfirm(record, next);
  }

  async function updateCurrentRecordAfterConfirm(
    record: CurrentRecordItem,
    next: { week: CurrentWeek; day: CurrentDay; content: string },
  ) {
    if (isCurrentRecordUpdating) return;

    setIsCurrentRecordUpdating(true);
    setCurrentRecordSaveError(null);
    try {
      const updated = await updateCurrentRecord({
        id: record.id,
        week: next.week,
        day: next.day,
        content: next.content,
      });
      setSelectedCurrentRecord(null);
      setCurrentRecordItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setCurrentRecordRefreshToken((current) => current + 1);
    } catch (error) {
      setCurrentRecordSaveError(error instanceof Error ? error.message : "当前记录更新失败，请稍后重试。");
    } finally {
      setIsCurrentRecordUpdating(false);
    }
  }

  async function handleCreateEnglishMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!englishMaterialDraft.base_expression.trim() || isEnglishMaterialSaving) return;

    setIsEnglishMaterialSaving(true);
    setEnglishMaterialSaveError(null);
    try {
      const created = await createEnglishMaterial(englishMaterialDraft);
      englishMaterialSequenceTouchedRef.current = false;
      setEnglishMaterialDraft(emptyEnglishMaterialDraft);
      setSelectedEnglishMaterial(created);
      setIsEnglishMaterialDetailOpen(false);
      setIsEnglishMaterialCreateOpen(false);
      setEnglishMaterialPage(1);
      setEnglishMaterialRefreshToken((current) => current + 1);
    } catch (error) {
      setEnglishMaterialSaveError(error instanceof Error ? error.message : "英语素材保存失败，请稍后重试。");
    } finally {
      setIsEnglishMaterialSaving(false);
    }
  }

  function handleEnglishMaterialDraftChange(nextDraft: EnglishMaterialDraft) {
    setEnglishMaterialDraft((current) => {
      if (nextDraft.sequence_no !== current.sequence_no) {
        englishMaterialSequenceTouchedRef.current = true;
      }
      return nextDraft;
    });
  }

  function handleClearEnglishMaterialDraft() {
    if (isEnglishMaterialSaving) return;
    englishMaterialSequenceTouchedRef.current = false;
    setEnglishMaterialDraft(emptyEnglishMaterialDraft);
    setEnglishMaterialSaveError(null);
  }

  async function handleSelectEnglishMaterial(item: EnglishMaterialItem, { openDetail = true }: { openDetail?: boolean } = {}) {
    if (openDetail) {
      writeEnglishMaterialIdToLocation(item.id);
      writeStoredEnglishMaterialDetailState(item.id, true);
    }
    setSelectedEnglishMaterial(item);
    setEnglishMaterialDetailDraft(englishMaterialItemToDraft(item));
    setEnglishMaterialCopiedLabel(null);
    if (openDetail) setIsEnglishMaterialDetailOpen(true);
    setEnglishMaterialSaveError(null);
    setIsEnglishMaterialDetailLoading(true);

    try {
      const detail = await getEnglishMaterial(item.id);
      setSelectedEnglishMaterial(detail);
      setEnglishMaterialDetailDraft(englishMaterialItemToDraft(detail));
      setEnglishMaterialItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setEnglishMaterialError(null);
    } catch (error) {
      setEnglishMaterialError(error instanceof Error ? error.message : "读取英语素材详情失败，请稍后重试。");
    } finally {
      setIsEnglishMaterialDetailLoading(false);
    }
  }

  async function handleSaveEnglishMaterialDetail() {
    if (!selectedEnglishMaterial || isEnglishMaterialDetailSaving || !englishMaterialDetailDraft.base_expression.trim()) return;

    setIsEnglishMaterialDetailSaving(true);
    setEnglishMaterialSaveError(null);
    try {
      const updated = await updateEnglishMaterial(selectedEnglishMaterial.id, englishMaterialDetailDraft);
      setSelectedEnglishMaterial(updated);
      setEnglishMaterialDetailDraft(englishMaterialItemToDraft(updated));
      setEnglishMaterialItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEnglishMaterialRefreshToken((current) => current + 1);
    } catch (error) {
      setEnglishMaterialSaveError(error instanceof Error ? error.message : "英语素材详情保存失败，请稍后重试。");
    } finally {
      setIsEnglishMaterialDetailSaving(false);
    }
  }

  async function handleCopyEnglishMaterialText(value: string, label: string) {
    if (!value.trim()) {
      setEnglishMaterialError(`${label}为空，无法复制。`);
      return;
    }

    try {
      await copyText(value);
      setEnglishMaterialError(null);
      setEnglishMaterialCopiedLabel(label);
      window.setTimeout(() => {
        setEnglishMaterialCopiedLabel((current) => (current === label ? null : current));
      }, 1600);
    } catch {
      setEnglishMaterialError("复制失败。请选中文本后手动复制。");
    }
  }

  function handleRefreshUsage() {
    setUsageRefreshToken((current) => current + 1);
  }

  function handleRefreshOverview() {
    setOverviewRefreshToken((current) => current + 1);
  }

  function handleOpenOverviewView(view: AppView) {
    if (!canAccessView(view, authUser)) {
      return;
    }
    setActiveView(view);
  }

  function handleOpenOverviewTodo(item: TodoItem) {
    setSelectedTodoId(item.id);
    selectedTodoSavedDraftRef.current = todoItemToDraft(item);
    selectedTodoSavedStatusRef.current = item.todo_status;
    setTodoDraft(resolveTodoEditorDraft(item, todoDraftsByIdRef.current));
    setActiveView("todos");
  }

  function handleOpenOverviewKnowledge(item: KnowledgeItem) {
    setSelectedId(item.id);
    setDraft(itemToDraft(item));
    setActiveView("workbench");
  }

  function handleOpenOverviewEnglishMaterial(item: EnglishMaterialItem) {
    setActiveView("englishMaterials");
    void handleSelectEnglishMaterial(item);
  }

  async function handleAskHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = historyAskQuestion.trim();
    if (!question || isHistoryAsking) return;

    setIsHistoryAsking(true);
    setHistoryAskError(null);
    setHasCopiedHistoryAskAnswer(false);
    try {
      const usesConfiguredModel = historyAskModelName === HISTORY_ASK_CONFIGURED_MODEL;
      const answer = await askHistory(
        question,
        historyAskSkillIds,
        usesConfiguredModel ? "history_ask_llm" : "codex",
        historyAskModelName === AI_CODING_DEFAULT_MODEL ? "" : historyAskModelName,
        historyAskDomainCode,
      );
      setHistoryAskAnswer(answer);
    } catch (error) {
      setHistoryAskError(error instanceof Error ? error.message : "AI 问数失败，请稍后重试。");
    } finally {
      setIsHistoryAsking(false);
    }
  }

  async function handleCreateHistoryAskQuickQuestion(question: string) {
    setIsHistoryAskQuickQuestionSaving(true);
    setHistoryAskQuickQuestionError(null);
    try {
      const item = await createHistoryAskQuickQuestion(question, historyAskDomainCode);
      setHistoryAskQuickQuestions((items) => [item, ...items]);
      return true;
    } catch (error) {
      setHistoryAskQuickQuestionError(error instanceof Error ? error.message : "保存快捷问题失败，请稍后重试。");
      return false;
    } finally {
      setIsHistoryAskQuickQuestionSaving(false);
    }
  }

  async function handleUpdateHistoryAskQuickQuestion(id: number, question: string) {
    setIsHistoryAskQuickQuestionSaving(true);
    setHistoryAskQuickQuestionError(null);
    try {
      const item = await updateHistoryAskQuickQuestion(id, question);
      setHistoryAskQuickQuestions((items) => items.map((current) => current.id === item.id ? item : current));
      return true;
    } catch (error) {
      setHistoryAskQuickQuestionError(error instanceof Error ? error.message : "更新快捷问题失败，请稍后重试。");
      return false;
    } finally {
      setIsHistoryAskQuickQuestionSaving(false);
    }
  }

  async function handleDeleteHistoryAskQuickQuestion(id: number) {
    setIsHistoryAskQuickQuestionSaving(true);
    setHistoryAskQuickQuestionError(null);
    try {
      await deleteHistoryAskQuickQuestion(id);
      setHistoryAskQuickQuestions((items) => items.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      setHistoryAskQuickQuestionError(error instanceof Error ? error.message : "删除快捷问题失败，请稍后重试。");
      return false;
    } finally {
      setIsHistoryAskQuickQuestionSaving(false);
    }
  }

  function getPreferredSkillFile(files: SkillFile[]) {
    return files.find((file) => file.path.endsWith("SKILL.md") && file.readable) ?? files.find((file) => file.readable) ?? null;
  }

  async function handleCreateSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSkillDraft.name.trim() || isSkillSaving) return;

    setIsSkillSaving(true);
    setSkillSaveError(null);
    try {
      const created = await createSkill(newSkillDraft);
      setSelectedSkill(created);
      setSkillDraft({ name: created.name, description: created.description, content: "", enabled: created.enabled, published: created.published });
      const preferredFile = getPreferredSkillFile(created.files);
      setSelectedSkillFile(preferredFile);
      setSkillFileContent(preferredFile?.path.endsWith("SKILL.md") ? created.skill_markdown : "");
      setSkillItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSkillTotal((current) => current + 1);
      setSkillSavedLabel("已新建");
      setNewSkillDraft(emptySkillDraft);
      window.setTimeout(() => setSkillSavedLabel(null), 1600);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 新建失败，请稍后重试。");
    } finally {
      setIsSkillSaving(false);
    }
  }

  async function handleSelectSkill(skillId: string) {
    const requestId = skillDetailRequestIdRef.current + 1;
    skillDetailRequestIdRef.current = requestId;
    setIsSkillDetailLoading(true);
    setSkillSaveError(null);
    try {
      const detail = await fetchSkill(skillId);
      if (requestId !== skillDetailRequestIdRef.current) return;
      setSelectedSkill(detail);
      setSkillDraft({ name: detail.name, description: detail.description, content: "", enabled: detail.enabled, published: detail.published });
      const preferredFile = getPreferredSkillFile(detail.files);
      setSelectedSkillFile(preferredFile);
      setSkillFileContent(preferredFile?.path.endsWith("SKILL.md") ? detail.skill_markdown : "");
    } catch (error) {
      if (requestId !== skillDetailRequestIdRef.current) return;
      setSkillSaveError(error instanceof Error ? error.message : "Skill 详情加载失败。");
    } finally {
      if (requestId === skillDetailRequestIdRef.current) setIsSkillDetailLoading(false);
    }
  }

  async function handleSelectSkillFile(file: SkillFile) {
    if (!selectedSkill || !file.readable) return;

    setSelectedSkillFile(file);
    setIsSkillDetailLoading(true);
    setSkillSaveError(null);
    try {
      const response = await fetchSkillFile(selectedSkill.id, file.path);
      setSkillFileContent(response.content);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 文件读取失败。");
    } finally {
      setIsSkillDetailLoading(false);
    }
  }

  async function handleSaveSelectedSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSkill || !selectedSkill.can_edit || !skillDraft.name.trim() || isSkillSaving) return;

    setIsSkillSaving(true);
    setSkillSaveError(null);
    try {
      const updated = await updateSkill(selectedSkill.id, {
        name: skillDraft.name,
        description: skillDraft.description,
        enabled: skillDraft.enabled,
        published: skillDraft.published,
      });
      setSelectedSkill(updated);
      setSkillItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (!updated.enabled) {
        setHistoryAskSkillIds((current) => current.filter((skillId) => skillId !== updated.id));
        setFactorySkillIds((current) => current.filter((skillId) => skillId !== updated.id));
      }
      setSkillSavedLabel("已保存");
      window.setTimeout(() => setSkillSavedLabel(null), 1600);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 保存失败。");
    } finally {
      setIsSkillSaving(false);
    }
  }

  async function handleSaveSelectedSkillFile() {
    if (!selectedSkill || !selectedSkill.can_edit || !selectedSkillFile || !selectedSkillFile.editable || isSkillFileSaving) return;

    setIsSkillFileSaving(true);
    setSkillSaveError(null);
    try {
      await updateSkillFile(selectedSkill.id, selectedSkillFile.path, skillFileContent);
      const detail = await fetchSkill(selectedSkill.id);
      setSelectedSkill(detail);
      setSkillItems((current) => current.map((item) => (item.id === detail.id ? detail : item)));
      setSkillSavedLabel("文件已保存");
      window.setTimeout(() => setSkillSavedLabel(null), 1600);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 文件保存失败。");
    } finally {
      setIsSkillFileSaving(false);
    }
  }

  async function handleCreateManagedUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedUserDraft.username.trim() || !managedUserDraft.password || isUserManagementSaving) return;

    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      await createManagedUser(managedUserDraft);
      setManagedUserDraft(emptyManagedUserDraft);
      markUserManagementSaved("用户已创建");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "用户创建失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  async function handleUpdateManagedUser(
    user: ManagedUserItem,
    payload: { display_name?: string | null; role_code?: ManagedUserRole; is_admin_role?: boolean; status?: ManagedUserStatus },
  ) {
    if (isUserManagementSaving) return;
    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      const updated = await updateManagedUser(user.user_id, payload);
      setManagedUsers((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
      markUserManagementSaved("用户已更新");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "用户更新失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  async function handleResetManagedUserPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPasswordTarget || resetPasswordValue.length < 6 || isUserManagementSaving) return;

    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      const updated = await resetManagedUserPassword(resetPasswordTarget.user_id, resetPasswordValue);
      setManagedUsers((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
      setResetPasswordTarget(null);
      setResetPasswordValue("");
      markUserManagementSaved("密码已重置，旧 session 已失效");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "密码重置失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  async function handleCreateUserRelation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parentUserId = Number(relationDraft.parent_user_id);
    const childUserId = Number(relationDraft.child_user_id);
    if (!parentUserId || !childUserId || isUserManagementSaving) return;

    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      await createUserRelation({
        parent_user_id: parentUserId,
        child_user_id: childUserId,
        relation_type: relationDraft.relation_type,
      });
      setRelationDraft(emptyRelationDraft);
      markUserManagementSaved("关系已创建");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "关系创建失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  async function handleUpdateUserRelation(relation: UserRelationItem, status: ManagedUserStatus) {
    if (isUserManagementSaving) return;
    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      const updated = await updateUserRelation(relation.relation_id, status);
      setUserRelations((current) => current.map((item) => (item.relation_id === updated.relation_id ? updated : item)));
      markUserManagementSaved(status === "ACTIVE" ? "关系已启用" : "关系已停用");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "关系更新失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  async function handleUpdateAdminModuleAccess(moduleCode: AdminModuleAccessItem["module_code"], accessLevel: AdminModuleAccessLevel) {
    if (isUserManagementSaving) return;
    setIsUserManagementSaving(true);
    setUserManagementError(null);
    try {
      const updated = await updateAdminModuleAccess(moduleCode, accessLevel);
      setAdminModuleItems((current) => current.map((item) => (item.module_code === updated.module_code ? updated : item)));
      markUserManagementSaved("模块权限已更新");
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : "模块权限更新失败，请稍后重试。");
    } finally {
      setIsUserManagementSaving(false);
    }
  }

  function markUserManagementSaved(label: string) {
    const nextLabel = `${label} ${Date.now()}`;
    setUserManagementSavedLabel(nextLabel);
    window.setTimeout(() => {
      setUserManagementSavedLabel((current) => (current === nextLabel ? null : current));
    }, 1800);
  }

  async function handleUploadSkillZip(file: File | null) {
    if (!file || isSkillUploading) return;

    setIsSkillUploading(true);
    setSkillSaveError(null);
    try {
      const uploaded = await uploadSkillZip(file);
      setSelectedSkill(uploaded);
      setSkillDraft({ name: uploaded.name, description: uploaded.description, content: "", enabled: uploaded.enabled, published: uploaded.published });
      const preferredFile = getPreferredSkillFile(uploaded.files);
      setSelectedSkillFile(preferredFile);
      setSkillFileContent(preferredFile?.path.endsWith("SKILL.md") ? uploaded.skill_markdown : "");
      setSkillItems((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      setSkillTotal((current) => current + 1);
      setSkillSavedLabel("已上传");
      window.setTimeout(() => setSkillSavedLabel(null), 1600);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill zip 上传失败。");
    } finally {
      setIsSkillUploading(false);
    }
  }

  function handleRequestDeleteSelectedSkill() {
    if (!selectedSkill || !selectedSkill.can_delete || isSkillSaving) return;
    setSkillDeleteTarget(selectedSkill);
  }

  async function handleConfirmDeleteSelectedSkill() {
    if (!skillDeleteTarget || isSkillSaving) return;

    setIsSkillSaving(true);
    setSkillSaveError(null);
    try {
      await deleteSkill(skillDeleteTarget.id);
      setSkillItems((current) => current.filter((item) => item.id !== skillDeleteTarget.id));
      setSkillTotal((current) => Math.max(0, current - 1));
      setHistoryAskSkillIds((current) => current.filter((skillId) => skillId !== skillDeleteTarget.id));
      setFactorySkillIds((current) => current.filter((skillId) => skillId !== skillDeleteTarget.id));
      setSelectedSkill(null);
      setSelectedSkillFile(null);
      setSkillFileContent("");
      setSkillDeleteTarget(null);
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 删除失败。");
    } finally {
      setIsSkillSaving(false);
    }
  }

  async function handleCopyHistoryAskAnswer(view: MarkdownContentView) {
    if (!historyAskAnswer?.answer.trim()) return;

    try {
      if (view === "rendered") {
        await copyMarkdownAsRichText(historyAskAnswer.answer);
      } else {
        await copyText(historyAskAnswer.answer);
      }
      setHasCopiedHistoryAskAnswer(true);
      window.setTimeout(() => setHasCopiedHistoryAskAnswer(false), 1600);
    } catch {
      setHistoryAskError("复制失败。请选中回答后手动复制。");
    }
  }

  async function handleSaveHistoryAskLlmConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isHistoryAskLlmConfigSaving) return;

    setIsHistoryAskLlmConfigSaving(true);
    setHistoryAskLlmConfigError(null);
    setHistoryAskLlmConfigSaved(false);
    try {
      const config = await updateHistoryAskLlmConfig(historyAskLlmConfigDraft);
      setHistoryAskLlmConfig(config);
      setHistoryAskLlmConfigDraft({
        provider_name: config.provider_name,
        base_url: config.base_url,
        model_name: config.model_name,
        enabled: config.enabled,
      });
      setHistoryAskLlmConfigSaved(true);
      window.setTimeout(() => setHistoryAskLlmConfigSaved(false), 1600);
    } catch (error) {
      setHistoryAskLlmConfigError(error instanceof Error ? error.message : "LLM 配置保存失败，请稍后重试。");
    } finally {
      setIsHistoryAskLlmConfigSaving(false);
    }
  }

  async function handleSaveHistoryOntology(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!historyOntologyDraft.name.trim() || isHistoryOntologySaving) return;
    setIsHistoryOntologySaving(true);
    setHistoryOntologyError(null);
    try {
      const saved = historyOntologyEditingId
        ? await updateHistoryOntology(historyOntologyEditingId, historyOntologyDraft)
        : await createHistoryOntology(historyOntologyDraft);
      setHistoryOntologyTerms((current) =>
        historyOntologyEditingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setHistoryOntologyDraft({ ...emptyHistoryOntologyDraft, domain_code: historyAskDomainCode });
      setHistoryOntologyEditingId(null);
    } catch (error) {
      setHistoryOntologyError(error instanceof Error ? error.message : "业务概念保存失败，请稍后重试。");
    } finally {
      setIsHistoryOntologySaving(false);
    }
  }

  function handleEditHistoryOntology(term: HistoryOntologyTerm) {
    setHistoryOntologyEditingId(term.id);
    setHistoryOntologyDraft({ domain_code: term.domain_code, name: term.name, aliases: term.aliases.join("，"), description: term.description, visibility: term.visibility, shared_with_usernames: term.shared_with_usernames.join("，") });
    setHistoryOntologyError(null);
  }

  async function handleDeleteHistoryOntology(termId: number) {
    if (isHistoryOntologySaving) return;
    setIsHistoryOntologySaving(true);
    setHistoryOntologyError(null);
    try {
      await deleteHistoryOntology(termId);
      setHistoryOntologyTerms((current) => current.filter((item) => item.id !== termId));
      if (historyOntologyEditingId === termId) {
        setHistoryOntologyEditingId(null);
        setHistoryOntologyDraft({ ...emptyHistoryOntologyDraft, domain_code: historyAskDomainCode });
      }
    } catch (error) {
      setHistoryOntologyError(error instanceof Error ? error.message : "业务概念删除失败，请稍后重试。");
    } finally {
      setIsHistoryOntologySaving(false);
    }
  }

  function handleOpenHistoryFromAsk() {
    if (!historyAskAnswer) return;

    const keyword = historyAskAnswer.filters.keyword ?? "";
    const username = historyAskAnswer.filters.username ?? "";
    const domainCode = historyAskAnswer.domain.code;

    if (domainCode === "todos") {
      setTodoPage(1);
      setTodoQuery(keyword);
      setTodoUsername(username);
      setTodoStatus(
        historyAskAnswer.filters.type === "待处理" || historyAskAnswer.filters.type === "处理中" || historyAskAnswer.filters.type === "已完成"
          ? historyAskAnswer.filters.type
          : "all",
      );
      setActiveView("todos");
      return;
    }

    if (domainCode === "knowledge") {
      setPage(1);
      setQuery(keyword);
      setWorkbenchUsername(username);
      setStatusFilter(
        historyAskAnswer.filters.type === "未发布" || historyAskAnswer.filters.type === "已发布" || historyAskAnswer.filters.type === "跳过"
          ? historyAskAnswer.filters.type
          : "all",
      );
      setActiveView("workbench");
      return;
    }

    if (domainCode === "english_materials") {
      setEnglishMaterialPage(1);
      setEnglishMaterialQuery(keyword);
      setEnglishMaterialUsername(username);
      setEnglishMaterialFlag(
        historyAskAnswer.filters.type === "已标记" ? "1" : historyAskAnswer.filters.type === "未标记" ? "0" : "",
      );
      setActiveView("englishMaterials");
      return;
    }

    setHistoryPage(1);
    setHistoryQuery(keyword);
    setHistoryUsername(username);
    setHistoryType(historyAskAnswer.filters.type ?? "");
    setHistoryWeek(historyAskAnswer.filters.week ?? "");
    setHistoryDay(historyAskAnswer.filters.day ?? "");
    setHistoryLearnLevel(
      historyAskAnswer.filters.learn_level === null || historyAskAnswer.filters.learn_level === undefined
        ? ""
        : String(historyAskAnswer.filters.learn_level),
    );
    setHistoryVectorStatus(readHistoryAskVectorStatus(historyAskAnswer.filters.vector_status));
    setHistoryDateFrom(historyAskAnswer.filters.date_from ?? "");
    setHistoryDateTo(historyAskAnswer.filters.date_to ?? "");
    setHistorySortBy("history_date");
    setHistorySortDir("desc");
    setActiveView("history");
  }

  async function handleRunCodex(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = aiCodingPrompt.trim();
    if (!prompt || isCodexRunning) return;
    const requestedModelName = aiCodingModelName === AI_CODING_DEFAULT_MODEL ? "" : aiCodingModelName;

    setIsCodexRunning(true);
    setCodexError(null);
    setLiveCodexOutput("");
    setLiveCodexErrorOutput("");
    setLiveCodexLastActivityAt(null);
    setLiveCodexLastEvent(null);
    setLiveCodexStatus("正在启动 Codex...");
    setAiCodingNoticeStatus("running");
    hasRestoredLatestCodexJobRef.current = false;
    try {
      const job = await startCodexJob(prompt, [], "workspace-write", "full", requestedModelName);
      setAiCodingMessages((current) => [
        {
          id: Date.now(),
          jobId: job.job_id,
          prompt,
          modelName: job.model_name,
          status: job.status,
          output: job.output,
          errorOutput: job.error_output,
          errorMessage: job.error_message,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          response: job.response,
        },
        ...current,
      ]);
      setActiveCodexJobId(job.job_id);
      setLiveCodexOutput(job.output);
      setLiveCodexErrorOutput(job.error_output);
      setLiveCodexLastActivityAt(job.last_activity_at);
      setLiveCodexLastEvent(job.last_event);
      setLiveCodexStatus("Codex 任务已提交，正在运行...");
      setAiCodingPrompt("");
    } catch (error) {
      if (error instanceof Error && error.message.includes("A Codex task is already running")) {
        try {
          const latestJob = await restoreLatestAiCodingJob();
          applyAiCodingJobSnapshot(latestJob);
          if (latestJob.status === "running") {
            setLiveCodexStatus("检测到当前账号已有进行中的 Codex 任务，已恢复任务状态。");
            return;
          }
        } catch {
          // Fall through to the original error if the latest job cannot be restored.
        }
      }
      setCodexError(error instanceof Error ? error.message : "Codex 执行失败，请稍后重试。");
      setIsCodexRunning(false);
      setAiCodingNoticeStatus(null);
    }
  }

  async function handleCancelCodex() {
    if (!activeCodexJobId || !isCodexRunning) return;

    setLiveCodexStatus("正在终止 Codex 任务...");
    try {
      const job = await cancelCodexJob(activeCodexJobId);
      applyAiCodingJobSnapshot(job);
    } catch (error) {
      setCodexError(error instanceof Error ? error.message : "终止 Codex 任务失败，请稍后重试。");
      setLiveCodexStatus("终止任务失败，Codex 仍可能在运行。");
    }
  }

  async function handleRestartServices() {
    if (restartConfirm !== "restart" || isRestartingServices) return;

    setIsRestartingServices(true);
    setRestartError(null);
    setRestartResponse(null);
    try {
      const response = await restartServices();
      setRestartResponse(response);
      await waitForBackendRecovery();
      window.location.reload();
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : "服务重启触发失败，请稍后重试。");
      setIsRestartingServices(false);
    }
  }

  async function handleSyncCodeToGithub() {
    if (isGithubSyncing) return;

    setIsGithubSyncing(true);
    setGithubSyncError(null);
    try {
      const response = await syncCodeToGithub();
      setGithubSyncStatus(response);
      if (response.success) setProjectChangelogRefreshToken((current) => current + 1);
    } catch (error) {
      setGithubSyncError(error instanceof Error ? error.message : "同步代码到 GitHub 失败，请稍后重试。");
    } finally {
      setIsGithubSyncing(false);
    }
  }

  async function handleReleaseCodeToGithub(version: string, confirm: string) {
    if (isGithubSyncing) return;

    setIsGithubSyncing(true);
    setGithubSyncError(null);
    try {
      const response = await releaseCodeToGithub(version, confirm);
      setGithubSyncStatus(response);
      if (response.success) setProjectChangelogRefreshToken((current) => current + 1);
    } catch (error) {
      setGithubSyncError(error instanceof Error ? error.message : "发布并打 Tag 失败，请稍后重试。");
    } finally {
      setIsGithubSyncing(false);
    }
  }

  function handleClearGithubSyncStatus() {
    setGithubSyncStatus(null);
    setGithubSyncError(null);
  }

  async function handleArchiveCodexMessage(message: AiCodingMessage) {
    if (!message.response || message.archivedKnowledgeId || codexArchiveLoadingId !== null) return;

    setCodexArchiveLoadingId(message.id);
    setCodexArchiveError(null);
    try {
      const created = await createKnowledge(buildCodexKnowledgeDraft(message));
      invalidateApiCache(["/api/knowledge"]);
      setAiCodingMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, archivedKnowledgeId: created.id } : item)),
      );
    } catch (error) {
      setCodexArchiveError(error instanceof Error ? error.message : "归档到可信知识失败，请稍后重试。");
    } finally {
      setCodexArchiveLoadingId(null);
    }
  }

  function handleClearCodexMessageDisplay(message: AiCodingMessage) {
    setAiCodingMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, isDisplayCleared: true } : item)),
    );
  }

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const viewTitle = FUNCTION_NAV_ITEMS.find((item) => item.view === activeView)?.label ?? "总览";
  const viewSubtitle =
    activeView === "overview"
      ? "Command Center"
      : activeView === "workbench"
      ? "Trusted Knowledge"
      : activeView === "factory"
        ? "Blog Factory"
      : activeView === "blogFactory"
        ? "AI Blog Factory"
        : activeView === "todos"
          ? "AI Todo Items"
        : activeView === "personalSecrets"
          ? "Personal Secrets"
          : activeView === "currentRecords"
            ? "Current Records"
            : activeView === "history"
              ? "History Explorer"
              : activeView === "englishMaterials"
                ? "English Materials"
              : activeView === "aiGraph"
                ? "Module Graph"
              : activeView === "users"
                ? "User Management"
              : activeView === "skills"
                ? "AI Orchestration"
              : activeView === "historyAsk"
                ? "Ask Data"
                : activeView === "aiCoding"
                  ? "Codex Workspace"
              : "AI Usage";
  const selectedKnowledgeIndex = selectedId === null ? -1 : items.findIndex((item) => item.id === selectedId);
  const isKnowledgeNavigationBlocked = isDetailLoading || isSaving || isDeleting || isConvertingKnowledgeToTodo;
  const canSelectPreviousKnowledge =
    (selectedKnowledgeIndex > 0 || (selectedKnowledgeIndex === 0 && page > 1)) && !isKnowledgeNavigationBlocked;
  const canSelectNextKnowledge =
    selectedKnowledgeIndex >= 0 &&
    (selectedKnowledgeIndex < items.length - 1 || page * PAGE_SIZE < totalItems) &&
    !isKnowledgeNavigationBlocked;
  const factorySelectedIndex = factorySelectedId === null ? -1 : factoryItems.findIndex((item) => item.id === factorySelectedId);
  const isFactoryNavigationBlocked = isFactoryGenerating || isFactoryAutoSaving;
  const canSelectPreviousFactoryKnowledge =
    (factorySelectedIndex > 0 || (factorySelectedIndex === 0 && factoryPage > 1)) && !isFactoryNavigationBlocked;
  const canSelectNextFactoryKnowledge =
    factorySelectedIndex >= 0 &&
    (factorySelectedIndex < factoryItems.length - 1 || factoryPage * FACTORY_PAGE_SIZE < factoryTotalItems) &&
    !isFactoryNavigationBlocked;
  const blogFactorySelectedIndex = selectedBlogFactoryItem ? blogFactoryItems.findIndex((item) => item.id === selectedBlogFactoryItem.id) : -1;
  const isBlogFactoryNavigationBlocked =
    isBlogFactoryDetailLoading ||
    isBlogFactoryStatusSaving ||
    isBlogFactoryItemSaving ||
    blogFactoryAssistSavingTargets.length > 0 ||
    isBlogFactorySendingToProcessing ||
    isBlogFactoryArticleSaving ||
    isBlogFactoryDeleting ||
    isBlogPublishing;
  const canSelectPreviousBlogFactoryItem =
    (blogFactorySelectedIndex > 0 || (blogFactorySelectedIndex === 0 && blogFactoryPage > 1)) && !isBlogFactoryNavigationBlocked;
  const canSelectNextBlogFactoryItem =
    blogFactorySelectedIndex >= 0 &&
    (blogFactorySelectedIndex < blogFactoryItems.length - 1 || blogFactoryPage * BLOG_FACTORY_PAGE_SIZE < blogFactoryTotal) &&
    !isBlogFactoryNavigationBlocked;
  const selectedTodoIndex = selectedTodoId === null ? -1 : todoItems.findIndex((item) => item.id === selectedTodoId);
  const isTodoNavigationBlocked = isTodoDetailLoading || isTodoSaving || isConvertingTodoToKnowledge;
  const hasUnsavedSelectedTodoChanges =
    selectedTodoId !== null && !areTodoDraftsEqual(todoDraft, selectedTodoSavedDraftRef.current);
  const canSelectPreviousTodo =
    (selectedTodoIndex > 0 || (selectedTodoIndex === 0 && todoPage > 1)) && !isTodoNavigationBlocked;
  const canSelectNextTodo =
    selectedTodoIndex >= 0 &&
    (selectedTodoIndex < todoItems.length - 1 || todoPage * TODO_PAGE_SIZE < todoTotal) &&
    !isTodoNavigationBlocked;
  const selectedPersonalSecret = personalSecretItems.find((item) => item.id === selectedPersonalSecretId) ?? null;
  const lazyViewFallback = (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <LoadingStack />
        </section>
        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <LoadingStack />
        </aside>
      </div>
    </div>
  );

  // Page composition and modal/sheet boundaries.
  return (
    <main className="tk-app-shell min-h-screen bg-ink-950 text-slate-100">
      <div className="tk-app-backdrop fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(125,211,199,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_22%)]" />
      <div
        className={`relative grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[grid-template-columns] motion-reduce:transition-none ${
          isSidebarExpanded ? "lg:grid-cols-[220px_minmax(0,1fr)]" : "lg:grid-cols-[76px_minmax(0,1fr)]"
        }`}
      >
        <Sidebar
          activeView={activeView}
          availableItems={availableFunctionNavItems}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded((expanded) => !expanded)}
          onViewChange={setActiveView}
        />

        <section className="flex min-w-0 flex-col">
          <Topbar
            activeView={activeView}
            availableItems={availableFunctionNavItems}
            currentUsername={authUser?.username ?? ""}
            query={
              activeView === "overview"
                ? ""
                : activeView === "workbench"
                ? query
                : activeView === "factory"
                  ? factoryQuery
                  : activeView === "blogFactory"
                    ? blogFactoryQuery
                    : activeView === "todos"
                      ? todoQuery
                    : activeView === "personalSecrets"
                      ? personalSecretQuery
                    : activeView === "currentRecords"
                    ? currentRecordQuery
                    : activeView === "englishMaterials"
                      ? englishMaterialQuery
                    : activeView === "aiGraph"
                      ? ""
                      : activeView === "users"
                        ? managedUserQuery
                      : activeView === "skills"
                        ? skillQuery
                      : activeView === "history"
                        ? historyQuery
                        : ""
            }
            title={viewTitle}
            subtitle={viewSubtitle}
            aiCodingNotice={activeView === "aiCoding" || !canAccessAiCoding ? null : aiCodingNoticeStatus}
            isMobileNavVisible={isMobileNavVisible}
            themeMode={themeMode}
            onLogout={handleLogout}
            onMobileNavVisibilityChange={setIsMobileNavVisible}
            onQueryChange={
              activeView === "factory"
                ? setFactoryQuery
                : activeView === "blogFactory"
                  ? setBlogFactoryQuery
                  : activeView === "todos"
                    ? setTodoQuery
                  : activeView === "personalSecrets"
                    ? setPersonalSecretQuery
                  : activeView === "currentRecords"
                      ? setCurrentRecordQuery
                    : activeView === "englishMaterials"
                      ? setEnglishMaterialQuery
                    : activeView === "users"
                      ? setManagedUserQuery
                    : activeView === "skills"
                      ? setSkillQuery
                    : activeView === "history"
                      ? setHistoryQuery
                      : setQuery
            }
            onToggleTheme={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
            onViewChange={setActiveView}
          />

          {activeView === "overview" ? (
            <Suspense fallback={lazyViewFallback}>
              <OverviewDashboard
                canViewUsage={canAccessUsage}
                data={overviewData}
                isLoading={isOverviewLoading}
                isRefreshing={isOverviewRefreshing}
                lastUpdatedAt={overviewUpdatedAt}
                loadError={overviewError}
                sectionErrors={overviewSectionErrors}
                onOpenEnglishMaterial={handleOpenOverviewEnglishMaterial}
                onOpenKnowledge={handleOpenOverviewKnowledge}
                onOpenTodo={handleOpenOverviewTodo}
                onOpenView={handleOpenOverviewView}
                onRefresh={handleRefreshOverview}
                englishLimit={overviewEnglishLimit}
                onEnglishLimitChange={setOverviewEnglishLimit}
              />
            </Suspense>
          ) : activeView === "skills" ? (
            <SkillManager
              detail={selectedSkill}
              draft={skillDraft}
              error={skillError}
              fileContent={skillFileContent}
              isDetailLoading={isSkillDetailLoading}
              isFileSaving={isSkillFileSaving}
              isLoading={isSkillLoading}
              isSaving={isSkillSaving}
              isUploading={isSkillUploading}
              items={skillItems}
              modelOptions={historyAskModelOptions}
              newDraft={newSkillDraft}
              scope={skillListScope}
              saveError={skillSaveError}
              savedLabel={skillSavedLabel}
              selectedFile={selectedSkillFile}
              total={skillTotal}
              onCreate={handleCreateSkill}
              onDelete={handleRequestDeleteSelectedSkill}
              onDraftChange={setSkillDraft}
              onFileChange={setSkillFileContent}
              onFileSelect={handleSelectSkillFile}
              onNewDraftChange={setNewSkillDraft}
              onScopeChange={setSkillListScope}
              onSave={handleSaveSelectedSkill}
              onSaveFile={handleSaveSelectedSkillFile}
              onSelect={handleSelectSkill}
              onUpload={handleUploadSkillZip}
            />
          ) : activeView === "users" ? (
            <UserManagementWorkspace
              adminModules={adminModuleItems}
              graph={userRelationGraph}
              users={managedUsers}
              total={managedUserTotal}
              relations={userRelations}
              createDraft={managedUserDraft}
              relationDraft={relationDraft}
              resetTarget={resetPasswordTarget}
              resetPasswordValue={resetPasswordValue}
              isLoading={isUserManagementLoading}
              isSaving={isUserManagementSaving}
              error={userManagementError}
              savedLabel={userManagementSavedLabel}
              onCreateDraftChange={setManagedUserDraft}
              onRelationDraftChange={setRelationDraft}
              onResetTargetChange={setResetPasswordTarget}
              onResetPasswordValueChange={setResetPasswordValue}
              onCreateUser={handleCreateManagedUser}
              onUpdateUser={handleUpdateManagedUser}
              onResetPassword={handleResetManagedUserPassword}
              onCreateRelation={handleCreateUserRelation}
              onUpdateAdminModule={handleUpdateAdminModuleAccess}
              onUpdateRelation={handleUpdateUserRelation}
            />
          ) : activeView === "historyAsk" ? (
            <HistoryAskPanel
              answer={historyAskAnswer}
              error={historyAskError}
              hasCopiedAnswer={hasCopiedHistoryAskAnswer}
              isLoading={isHistoryAsking}
              isLlmConfigLoading={isHistoryAskLlmConfigLoading}
              isLlmConfigSaving={isHistoryAskLlmConfigSaving}
              llmConfig={historyAskLlmConfig}
              llmConfigDraft={historyAskLlmConfigDraft}
              llmConfigError={historyAskLlmConfigError}
              llmConfigSaved={historyAskLlmConfigSaved}
              ontologyTerms={historyOntologyTerms}
              ontologyDraft={historyOntologyDraft}
              ontologyEditingId={historyOntologyEditingId}
              ontologyError={historyOntologyError}
              ontologyLoading={isHistoryOntologyLoading}
              ontologySaving={isHistoryOntologySaving}
              domainCode={historyAskDomainCode}
              domains={historyAskDomains}
              quickQuestions={historyAskQuickQuestions}
              quickQuestionsError={historyAskQuickQuestionError}
              quickQuestionsLoading={isHistoryAskQuickQuestionsLoading}
              quickQuestionSaving={isHistoryAskQuickQuestionSaving}
              canManageSystemOntology={Boolean(authUser?.is_admin)}
              modelName={historyAskModelName}
              modelOptions={historyAskModelOptions}
              question={historyAskQuestion}
              selectedSkillIds={historyAskSkillIds}
              onCopyAnswer={handleCopyHistoryAskAnswer}
              onLlmConfigDraftChange={setHistoryAskLlmConfigDraft}
              onLlmConfigSave={handleSaveHistoryAskLlmConfig}
              onOntologyDraftChange={setHistoryOntologyDraft}
              onOntologySave={handleSaveHistoryOntology}
              onOntologyEdit={handleEditHistoryOntology}
              onOntologyDelete={handleDeleteHistoryOntology}
              onOntologyCancel={() => {
                setHistoryOntologyEditingId(null);
                setHistoryOntologyDraft({ ...emptyHistoryOntologyDraft, domain_code: historyAskDomainCode });
              }}
              onDomainChange={(code) => {
                setHistoryAskDomainCode(code);
                setHistoryAskAnswer(null);
                setHistoryOntologyEditingId(null);
                setHistoryOntologyDraft({ ...emptyHistoryOntologyDraft, domain_code: code });
              }}
              onCreateQuickQuestion={handleCreateHistoryAskQuickQuestion}
              onUpdateQuickQuestion={handleUpdateHistoryAskQuickQuestion}
              onDeleteQuickQuestion={handleDeleteHistoryAskQuickQuestion}
              onModelNameChange={setHistoryAskModelName}
              onOpenHistory={handleOpenHistoryFromAsk}
              onQuestionChange={setHistoryAskQuestion}
              onSubmit={handleAskHistory}
              onSelectedSkillIdsChange={setHistoryAskSkillIds}
            />
          ) : activeView === "aiCoding" ? (
            <Suspense fallback={lazyViewFallback}>
              <AiCodingWorkspace
                codexError={codexError}
                changelogRefreshToken={projectChangelogRefreshToken}
                githubSyncError={githubSyncError}
                githubSyncStatus={githubSyncStatus}
                isCodexRunning={isCodexRunning}
                isGithubSyncing={isGithubSyncing}
                isRestartingServices={isRestartingServices}
                liveErrorOutput={liveCodexErrorOutput}
                liveLastActivityAt={liveCodexLastActivityAt}
                liveLastEvent={liveCodexLastEvent}
                liveOutput={liveCodexOutput}
                liveStatus={liveCodexStatus}
                modelName={aiCodingModelName}
                messages={aiCodingMessages}
                prompt={aiCodingPrompt}
                archiveError={codexArchiveError}
                archiveLoadingId={codexArchiveLoadingId}
                restartConfirm={restartConfirm}
                restartError={restartError}
                restartResponse={restartResponse}
                onArchiveMessage={handleArchiveCodexMessage}
                onClearMessageDisplay={handleClearCodexMessageDisplay}
                onCancel={handleCancelCodex}
                onClearGithubSyncStatus={handleClearGithubSyncStatus}
                onModelChange={setAiCodingModelName}
                onPromptChange={setAiCodingPrompt}
                onRestartConfirmChange={setRestartConfirm}
                onRestartServices={handleRestartServices}
                onReleaseCodeToGithub={handleReleaseCodeToGithub}
                onSyncCodeToGithub={handleSyncCodeToGithub}
                onSubmit={handleRunCodex}
              />
            </Suspense>
          ) : activeView === "blogFactory" ? (
            <BlogFactoryRecords
              authUser={authUser}
              items={blogFactoryItems}
              total={blogFactoryTotal}
              page={blogFactoryPage}
              selectedItem={selectedBlogFactoryItem}
              canSelectPrevious={canSelectPreviousBlogFactoryItem}
              canSelectNext={canSelectNextBlogFactoryItem}
              isMobileDetailOpen={isMobileBlogFactoryDetailOpen}
              isLoading={isBlogFactoryLoading}
              isDetailLoading={isBlogFactoryDetailLoading}
              isStatusSaving={isBlogFactoryStatusSaving}
              isItemSaving={isBlogFactoryItemSaving}
              isAssistSaving={blogFactoryAssistSavingTargets.length > 0}
              isSendingToProcessing={isBlogFactorySendingToProcessing}
              isArticleSaving={isBlogFactoryArticleSaving}
              isDeleting={isBlogFactoryDeleting}
              loadError={blogFactoryError}
              statusError={blogFactoryStatusError}
              editError={blogFactoryEditError}
              articleError={blogFactoryArticleError}
              taskCopyError={blogFactoryTaskCopyError}
              sendBackNotice={blogFactorySendBackNotice}
              publishConfigs={blogPublishConfigs}
              isPublishConfigsLoading={isBlogPublishConfigsLoading}
              publishConfigsError={blogPublishConfigsError}
              publishError={blogPublishError}
              publishSuccess={blogPublishSuccess}
              isPublishing={isBlogPublishing}
              isVectorRefreshing={isBlogFactoryVectorRefreshing}
              modelOptions={historyAskModelOptions}
              editDraft={blogFactoryEditDraft}
              coverPromptTemplate={blogFactoryCoverPromptTemplate}
              coverPromptConfig={blogFactoryCoverPromptConfig}
              maskRules={blogFactoryMaskRules}
              selectedMaskRuleId={selectedBlogFactoryMaskRuleId}
              maskError={blogFactoryMaskError}
              maskNotice={blogFactoryMaskNotice}
              hasCopiedTask={hasCopiedBlogFactoryTask}
              filters={{
                username: blogFactoryUsername,
                semanticQuery: blogFactorySemanticQuery,
                factoryStatus: blogFactoryStatus,
                topic: blogFactoryTopic,
                knowledgeId: blogFactoryKnowledgeId,
                vectorStatus: blogFactoryVectorStatus,
                sortBy: blogFactorySortBy,
                sortDir: blogFactorySortDir,
              }}
              onClearFilters={() => {
                setBlogFactoryPage(1);
                setBlogFactoryQuery("");
                setBlogFactorySemanticQuery("");
                setBlogFactoryUsername(getClearedScopedUsernameFilter(authUser));
                setBlogFactoryStatus("all");
                setBlogFactoryTopic("");
                setBlogFactoryKnowledgeId("");
                setBlogFactoryVectorStatus("all");
                setBlogFactorySortBy("copied_at");
                setBlogFactorySortDir("desc");
              }}
              onFilterChange={(nextFilters) => {
                setBlogFactoryPage(1);
                if (nextFilters.username !== undefined) setBlogFactoryUsername(nextFilters.username);
                if (nextFilters.semanticQuery !== undefined) setBlogFactorySemanticQuery(nextFilters.semanticQuery);
                if (nextFilters.factoryStatus !== undefined) setBlogFactoryStatus(nextFilters.factoryStatus);
                if (nextFilters.topic !== undefined) setBlogFactoryTopic(nextFilters.topic);
                if (nextFilters.knowledgeId !== undefined) setBlogFactoryKnowledgeId(nextFilters.knowledgeId);
                if (nextFilters.vectorStatus !== undefined) setBlogFactoryVectorStatus(nextFilters.vectorStatus);
                if (nextFilters.sortBy !== undefined) setBlogFactorySortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setBlogFactorySortDir(nextFilters.sortDir);
              }}
              onRefresh={() => {
                setIsBlogFactoryRefreshing(true);
                setBlogFactoryRefreshToken((token) => token + 1);
              }}
              isRefreshing={isBlogFactoryRefreshing}
              onRefreshVectors={() => {
                setIsBlogFactoryVectorRefreshing(true);
                refreshBlogFactoryVectors()
                  .then(() => setBlogFactoryRefreshToken((token) => token + 1))
                  .catch((error: Error) => setBlogFactoryError(error.message))
                  .finally(() => setIsBlogFactoryVectorRefreshing(false));
              }}
              onPageChange={setBlogFactoryPage}
              onEditDraftChange={setBlogFactoryEditDraft}
              onCoverPromptTemplateChange={setBlogFactoryCoverPromptTemplate}
              onCoverPromptConfigChange={setBlogFactoryCoverPromptConfig}
              onMaskRuleChange={setSelectedBlogFactoryMaskRuleId}
              onOpenMaskDialog={handleOpenBlogFactoryMaskDialog}
              onApplyMaskRule={handleApplyBlogFactoryMaskRule}
              onCopyTask={handleCopyBlogFactoryTaskContent}
              onOpenPublishConfig={handleOpenBlogPublishConfigDialog}
              onOpenPublishDialog={handleOpenBlogPublishDialog}
              onSendToProcessing={handleSendBlogFactoryItemToProcessing}
              onDelete={handleRequestDeleteBlogFactoryItem}
              onCloseMobileDetail={() => setIsMobileBlogFactoryDetailOpen(false)}
              onSaveAssist={handleSaveBlogFactoryAssistMetadata}
              onSaveItem={handleSaveBlogFactoryItem}
              onSelect={handleSelectBlogFactoryItem}
              onSelectAdjacent={handleSelectAdjacentBlogFactoryItem}
              onStatusChange={handleUpdateBlogFactoryStatus}
            />
          ) : activeView === "todos" ? (
            <TodoWorkspace
              authUser={authUser}
              items={todoItems}
              total={todoTotal}
              page={todoPage}
              selectedId={selectedTodoId}
              username={todoUsername}
              isMobileEditorOpen={isMobileTodoEditorOpen}
              draft={todoDraft}
              status={todoStatus}
              isLoading={isTodoLoading}
              isDetailLoading={isTodoDetailLoading}
              isSaving={isTodoSaving}
              isConvertingToKnowledge={isConvertingTodoToKnowledge}
              loadError={todoError}
              saveError={todoSaveError || todoCopyError}
              hasUnsavedChanges={hasUnsavedSelectedTodoChanges}
              hasCopiedContent={hasCopiedTodoContent}
              canSelectPrevious={canSelectPreviousTodo}
              canSelectNext={canSelectNextTodo}
              onClearFilters={() => {
                setTodoPage(1);
                setTodoQuery("");
                setTodoUsername(getClearedScopedUsernameFilter(authUser));
                setTodoStatus("all");
              }}
              onCloseMobileEditor={() => setIsMobileTodoEditorOpen(false)}
              onDraftChange={handleTodoDraftChange}
              onPageChange={setTodoPage}
              onSelect={handleSelectTodo}
              onSelectAdjacent={handleSelectAdjacentTodo}
              onCopyContent={handleCopyTodoContent}
              onConvertToKnowledge={handleConvertSelectedTodoToKnowledge}
              onStatusFilterChange={(nextStatus) => {
                setTodoPage(1);
                setTodoStatus(nextStatus);
              }}
              onUsernameFilterChange={(nextUsername) => {
                setTodoPage(1);
                setTodoUsername(nextUsername);
              }}
              onSubmit={handleUpdateTodo}
            />
          ) : activeView === "personalSecrets" ? (
            <PersonalSecretsWorkspace
              items={personalSecretItems}
              total={personalSecretTotal}
              page={personalSecretPage}
              selectedItem={selectedPersonalSecret}
              isMobileDetailOpen={isMobilePersonalSecretDetailOpen}
              isLoading={isPersonalSecretLoading}
              isDetailLoading={isPersonalSecretDetailLoading}
              loadError={personalSecretError}
              saveError={personalSecretSaveError}
              copyNotice={personalSecretCopyNotice}
              copiedField={personalSecretCopiedField}
              onClearSearch={() => {
                setPersonalSecretPage(1);
                setPersonalSecretQuery("");
              }}
              onNew={() => {
                setSelectedPersonalSecretId(null);
                setPersonalSecretDraft(emptyPersonalSecretDraft);
                setPersonalSecretSaveError(null);
                setPersonalSecretCopyNotice(null);
                setIsPersonalSecretEditorOpen(true);
              }}
              onPageChange={setPersonalSecretPage}
              onRefresh={() => setPersonalSecretRefreshToken((current) => current + 1)}
              onSelect={handleSelectPersonalSecret}
              onCloseMobileDetail={() => setIsMobilePersonalSecretDetailOpen(false)}
              onLoadForEdit={handleLoadPersonalSecretForEdit}
              onCopyField={handleCopyPersonalSecretField}
            />
          ) : activeView === "currentRecords" ? (
            <CurrentRecordsWorkspace
              items={currentRecordItems}
              total={currentRecordTotal}
              page={currentRecordPage}
              options={currentRecordOptions}
              authUser={authUser}
              draft={currentRecordDraft}
              selectedItem={selectedCurrentRecord}
              isLoading={isCurrentRecordLoading}
              isOptionsLoading={isCurrentRecordOptionsLoading}
              isSaving={isCurrentRecordSaving}
              isUpdating={isCurrentRecordUpdating}
              loadError={currentRecordError}
              saveError={currentRecordSaveError}
              filters={{
                username: currentRecordUsername,
                type: currentRecordTypeFilter,
                week: currentRecordWeek,
                day: currentRecordDay,
                learnLevel: currentRecordLearnLevel,
                sortBy: currentRecordSortBy,
                sortDir: currentRecordSortDir,
              }}
              onClearFilters={() => {
                setCurrentRecordPage(1);
                setCurrentRecordQuery("");
                setCurrentRecordUsername(getClearedScopedUsernameFilter(authUser, currentRecordOptions.users));
                setCurrentRecordTypeFilter("");
                setCurrentRecordWeek("");
                setCurrentRecordDay("");
                setCurrentRecordLearnLevel("");
                setCurrentRecordSortBy("id");
                setCurrentRecordSortDir("desc");
              }}
              onDraftChange={setCurrentRecordDraft}
              onFilterChange={(nextFilters) => {
                setCurrentRecordPage(1);
                if (nextFilters.username !== undefined) setCurrentRecordUsername(nextFilters.username);
                if (nextFilters.type !== undefined) setCurrentRecordTypeFilter(nextFilters.type);
                if (nextFilters.week !== undefined) setCurrentRecordWeek(nextFilters.week);
                if (nextFilters.day !== undefined) setCurrentRecordDay(nextFilters.day);
                if (nextFilters.learnLevel !== undefined) setCurrentRecordLearnLevel(nextFilters.learnLevel);
                if (nextFilters.sortBy !== undefined) setCurrentRecordSortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setCurrentRecordSortDir(nextFilters.sortDir);
              }}
              onPageChange={setCurrentRecordPage}
              onSelect={setSelectedCurrentRecord}
              onSubmit={handleCreateCurrentRecord}
              onUpdate={handleUpdateCurrentRecord}
              onCloseEditor={() => {
                if (!isCurrentRecordUpdating) setSelectedCurrentRecord(null);
              }}
            />
          ) : activeView === "englishMaterials" ? (
            <EnglishMaterialsWorkspace
              authUser={authUser}
              items={englishMaterialItems}
              total={englishMaterialTotal}
              page={englishMaterialPage}
              selectedItem={selectedEnglishMaterial}
              isDetailOpen={isEnglishMaterialDetailOpen}
              isCreateOpen={isEnglishMaterialCreateOpen}
              draft={englishMaterialDraft}
              detailDraft={englishMaterialDetailDraft}
              isLoading={isEnglishMaterialLoading}
              isDetailLoading={isEnglishMaterialDetailLoading}
              isSaving={isEnglishMaterialSaving}
              isDetailSaving={isEnglishMaterialDetailSaving}
              copiedLabel={englishMaterialCopiedLabel}
              loadError={englishMaterialError}
              saveError={englishMaterialSaveError}
              isVectorRefreshing={isEnglishMaterialVectorRefreshing}
              modelOptions={historyAskModelOptions}
              filters={{
                username: englishMaterialUsername,
                semanticQuery: englishMaterialSemanticQuery,
                category: englishMaterialCategory,
                flag: englishMaterialFlag,
                vectorStatus: englishMaterialVectorStatus,
                sortBy: englishMaterialSortBy,
                sortDir: englishMaterialSortDir,
              }}
              onClearFilters={() => {
                setEnglishMaterialPage(1);
                setEnglishMaterialQuery("");
                setEnglishMaterialSemanticQuery("");
                setEnglishMaterialUsername(getClearedScopedUsernameFilter(authUser));
                setEnglishMaterialCategory("");
                setEnglishMaterialFlag("");
                setEnglishMaterialVectorStatus("all");
                setEnglishMaterialSortBy("id");
                setEnglishMaterialSortDir("desc");
              }}
              onDraftChange={handleEnglishMaterialDraftChange}
              onFilterChange={(nextFilters) => {
                setEnglishMaterialPage(1);
                if (nextFilters.username !== undefined) setEnglishMaterialUsername(nextFilters.username);
                if (nextFilters.semanticQuery !== undefined) setEnglishMaterialSemanticQuery(nextFilters.semanticQuery);
                if (nextFilters.category !== undefined) setEnglishMaterialCategory(nextFilters.category);
                if (nextFilters.flag !== undefined) setEnglishMaterialFlag(nextFilters.flag);
                if (nextFilters.vectorStatus !== undefined) setEnglishMaterialVectorStatus(nextFilters.vectorStatus);
                if (nextFilters.sortBy !== undefined) setEnglishMaterialSortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setEnglishMaterialSortDir(nextFilters.sortDir);
              }}
              onRefreshVectors={() => {
                setIsEnglishMaterialVectorRefreshing(true);
                refreshEnglishMaterialVectors()
                  .then(() => setEnglishMaterialRefreshToken((token) => token + 1))
                  .catch((error: Error) => setEnglishMaterialError(error.message))
                  .finally(() => setIsEnglishMaterialVectorRefreshing(false));
              }}
              onCloseDetail={() => {
                if (!isEnglishMaterialDetailLoading) {
                  writeEnglishMaterialIdToLocation(null);
                  writeStoredEnglishMaterialDetailState(selectedEnglishMaterial?.id ?? null, false);
                  setIsEnglishMaterialDetailOpen(false);
                }
              }}
              onCloseCreate={() => {
                if (!isEnglishMaterialSaving) setIsEnglishMaterialCreateOpen(false);
              }}
              onClearCreateDraft={handleClearEnglishMaterialDraft}
              onCopyText={handleCopyEnglishMaterialText}
              onDetailDraftChange={setEnglishMaterialDetailDraft}
              onPageChange={setEnglishMaterialPage}
              onSaveDetail={handleSaveEnglishMaterialDetail}
              onSelect={handleSelectEnglishMaterial}
              onOpenCreate={() => setIsEnglishMaterialCreateOpen(true)}
              onSubmit={handleCreateEnglishMaterial}
            />
          ) : activeView === "history" ? (
            <Suspense fallback={lazyViewFallback}>
              <HistoryExplorer
                items={historyItems}
                total={historyTotal}
                page={historyPage}
                summary={historySummary}
                authUser={authUser}
                isLoading={isHistoryLoading}
                loadError={historyError}
                isVectorRefreshing={isHistoryVectorRefreshing}
                semanticQuery={historySemanticQuery}
                filters={{
                  type: historyType,
                  username: historyUsername,
                  week: historyWeek,
                  day: historyDay,
                  learnLevel: historyLearnLevel,
                  vectorStatus: historyVectorStatus,
                  dateFrom: historyDateFrom,
                  dateTo: historyDateTo,
                  sortBy: historySortBy,
                  sortDir: historySortDir,
                }}
                onFilterChange={(nextFilters) => {
                  setHistoryPage(1);
                  if (nextFilters.type !== undefined) setHistoryType(nextFilters.type);
                  if (nextFilters.username !== undefined) setHistoryUsername(nextFilters.username);
                  if (nextFilters.week !== undefined) setHistoryWeek(nextFilters.week);
                  if (nextFilters.day !== undefined) setHistoryDay(nextFilters.day);
                  if (nextFilters.learnLevel !== undefined) setHistoryLearnLevel(nextFilters.learnLevel);
                  if (nextFilters.vectorStatus !== undefined) setHistoryVectorStatus(nextFilters.vectorStatus);
                  if (nextFilters.dateFrom !== undefined) setHistoryDateFrom(nextFilters.dateFrom);
                  if (nextFilters.dateTo !== undefined) setHistoryDateTo(nextFilters.dateTo);
                  if (nextFilters.sortBy !== undefined) setHistorySortBy(nextFilters.sortBy);
                  if (nextFilters.sortDir !== undefined) setHistorySortDir(nextFilters.sortDir);
                }}
                onSemanticSearch={(semanticQuery) => {
                  setHistoryPage(1);
                  setHistorySemanticQuery(semanticQuery);
                  if (semanticQuery) setHistoryVectorStatus("0");
                }}
                onRefreshVectors={() => {
                  setIsHistoryVectorRefreshing(true);
                  refreshHistoryVectors()
                    .then(() => setHistoryRefreshToken((token) => token + 1))
                    .catch((error: Error) => setHistoryError(error.message))
                    .finally(() => setIsHistoryVectorRefreshing(false));
                }}
                onClearFilters={() => {
                  setHistoryPage(1);
                  setHistoryQuery("");
                  setHistorySemanticQuery("");
                  setHistoryType("");
                  setHistoryUsername(getClearedScopedUsernameFilter(authUser, historySummary.users));
                  setHistoryWeek("");
                  setHistoryDay("");
                  setHistoryLearnLevel("");
                  setHistoryVectorStatus("all");
                  setHistoryDateFrom("");
                  setHistoryDateTo("");
                  setHistorySortBy("history_date");
                  setHistorySortDir("desc");
                }}
                onPageChange={setHistoryPage}
              />
            </Suspense>
          ) : activeView === "aiGraph" ? (
            <Suspense fallback={lazyViewFallback}>
              <AiGraphWorkspace onOpenView={setActiveView} />
            </Suspense>
          ) : activeView === "usage" ? (
            <Suspense fallback={lazyViewFallback}>
              <LlmUsageDashboard
                items={usageItems}
                total={usageTotal}
                isLoading={isUsageLoading}
                isRefreshing={isUsageRefreshing}
                loadError={usageError}
                onRefresh={handleRefreshUsage}
              />
            </Suspense>
          ) : activeView === "workbench" ? (
            <div
              className={`grid flex-1 gap-4 px-4 pb-4 pt-2 lg:grid-cols-[minmax(440px,0.95fr)_minmax(420px,1.05fr)] xl:gap-x-2 ${
                isKnowledgeEntryCollapsed
                  ? isWorkbenchDetailsCollapsed
                    ? "xl:grid-cols-[28px_minmax(0,1fr)_28px]"
                    : "xl:grid-cols-[28px_minmax(0,1fr)_300px_28px]"
                  : isWorkbenchDetailsCollapsed
                    ? "xl:grid-cols-[minmax(500px,1fr)_28px]"
                    : "xl:grid-cols-[minmax(500px,0.9fr)_minmax(460px,0.72fr)_300px_28px]"
              }`}
            >
              <div className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isKnowledgeEntryCollapsed ? "xl:p-0" : "p-4"}`}>
                <div className={isKnowledgeEntryCollapsed ? "xl:hidden" : "xl:pr-7"}>
                  <KnowledgeForm
                embedded
                isMobileCollapsed={isMobileKnowledgeEntryCollapsed}
                draft={draft}
                mode={isEditing ? "edit" : "create"}
                selectedId={selectedId}
                isSaving={isSaving}
                isDeleting={isDeleting}
                isConvertingToTodo={isConvertingKnowledgeToTodo}
                isDetailLoading={isDetailLoading}
                saveError={saveError}
                trustScore={trustScore}
                hasSensitiveSignal={hasSensitiveSignal}
                isTodoEntry={isTodoEntry}
                todoStatus={newTodoStatus}
                canSelectPrevious={canSelectPreviousKnowledge}
                canSelectNext={canSelectNextKnowledge}
                onDraftChange={setDraft}
                onDelete={handleRequestDelete}
                onConvertToTodo={handleConvertSelectedKnowledgeToTodo}
                onTodoEntryChange={setIsTodoEntry}
                onTodoStatusChange={setNewTodoStatus}
                onNewEntry={handleNewEntry}
                onSelectAdjacent={handleSelectAdjacentKnowledge}
                onToggleMobileCollapsed={() => setIsMobileKnowledgeEntryCollapsed((collapsed) => !collapsed)}
                    onSubmit={handleSubmit}
                  />
                </div>
                <WorkspaceSidebarCollapseToggle isCollapsed={isKnowledgeEntryCollapsed} label="信息录入面板" onToggle={() => setIsKnowledgeEntryCollapsed((collapsed) => !collapsed)} />
              </div>

              <div className={isWorkbenchDetailsCollapsed ? "xl:hidden" : "min-w-0"}>
                <KnowledgeList
                  authUser={authUser}
                  items={items}
                  totalItems={totalItems}
                  page={page}
                  pageSize={PAGE_SIZE}
                  isLoading={isLoading}
                  loadError={loadError}
                  selectedId={selectedId}
                  lastCreatedId={lastCreatedId}
                  username={workbenchUsername}
                  status={statusFilter}
                  onPageChange={setPage}
                  onUsernameChange={(nextUsername) => {
                    setPage(1);
                    setWorkbenchUsername(nextUsername);
                  }}
                  onStatusChange={(nextStatus) => {
                    setPage(1);
                    setStatusFilter(nextStatus);
                  }}
                  onSelect={handleSelectItem}
                />
              </div>

              <div className={isWorkbenchDetailsCollapsed ? "xl:hidden" : "min-w-0"}>
                <TrustPanel
                  draft={draft}
                  trustScore={trustScore}
                  hasSensitiveSignal={hasSensitiveSignal}
                />
              </div>

              <WorkspaceRightSidebarCollapseToggle
                isCollapsed={isWorkbenchDetailsCollapsed}
                label="已录入知识和可信度检查"
                onToggle={() => setIsWorkbenchDetailsCollapsed((collapsed) => !collapsed)}
              />
            </div>
          ) : (
            <KnowledgeFactory
              authUser={authUser}
              items={factoryItems}
              totalItems={factoryTotalItems}
              page={factoryPage}
              pageSize={FACTORY_PAGE_SIZE}
              isLoading={isFactoryLoading}
              isGenerating={isFactoryGenerating}
              loadError={factoryError}
              selectedId={factorySelectedId}
              canSelectPrevious={canSelectPreviousFactoryKnowledge}
              canSelectNext={canSelectNextFactoryKnowledge}
              task={factoryTask}
              selectedSkillIds={factorySkillIds}
              hasCopied={hasCopiedFactoryTask}
              isAutoSaving={isFactoryAutoSaving}
              isCopySaving={isFactoryCopySaving}
              isMerging={isFactoryMerging}
              modelName={factoryModelName}
              modelOptions={factoryModelOptions}
              copyError={factoryCopyError}
              codexStatus={factoryCodexStatus}
              searchQuery={factoryQuery}
              username={factoryUsername}
              onClearSearch={() => {
                setFactoryQuery("");
                setFactoryPage(1);
              }}
              onCopyTask={handleCopyFactoryTask}
              onGenerateTask={handleGenerateFactoryTask}
              onCancelTask={handleCancelFactoryTask}
              onMergeKnowledge={handleMergeFactoryKnowledge}
              onModelNameChange={setFactoryModelName}
              onPageChange={setFactoryPage}
              onUsernameChange={(nextUsername) => {
                setFactoryPage(1);
                setFactoryUsername(nextUsername);
              }}
              onSelect={handleSelectFactoryItem}
              onSelectAdjacent={handleSelectAdjacentFactoryKnowledge}
              onSelectedSkillIdsChange={setFactorySkillIds}
            />
          )}
        </section>
      </div>

      <PersonalSecretEditorDialog
        draft={personalSecretDraft}
        isDeleting={isPersonalSecretDeleting}
        isOpen={activeView === "personalSecrets" && isPersonalSecretEditorOpen}
        isSaving={isPersonalSecretSaving}
        saveError={personalSecretSaveError}
        selectedItem={selectedPersonalSecret}
        onClose={() => {
          if (isPersonalSecretSaving || isPersonalSecretDeleting) return;
          setIsPersonalSecretEditorOpen(false);
          setPersonalSecretSaveError(null);
        }}
        onDelete={handleDeletePersonalSecret}
        onDraftChange={setPersonalSecretDraft}
        onSave={handleSavePersonalSecret}
      />

      <MobileEditorSheet
        icon={<Pencil size={17} />}
        isBusy={isDetailLoading || isSaving || isDeleting || isConvertingKnowledgeToTodo}
        isOpen={activeView === "workbench" && isMobileKnowledgeEditorOpen && selectedId !== null}
        label="Knowledge Detail"
        title="编辑可信知识"
        onClose={() => setIsMobileKnowledgeEditorOpen(false)}
      >
        <KnowledgeForm
          draft={draft}
          mode={isEditing ? "edit" : "create"}
          selectedId={selectedId}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isConvertingToTodo={isConvertingKnowledgeToTodo}
          isDetailLoading={isDetailLoading}
          saveError={saveError}
          trustScore={trustScore}
          hasSensitiveSignal={hasSensitiveSignal}
          isTodoEntry={isTodoEntry}
          todoStatus={newTodoStatus}
          canSelectPrevious={canSelectPreviousKnowledge}
          canSelectNext={canSelectNextKnowledge}
          onDraftChange={setDraft}
          onDelete={handleRequestDelete}
          onConvertToTodo={handleConvertSelectedKnowledgeToTodo}
          onTodoEntryChange={setIsTodoEntry}
          onTodoStatusChange={setNewTodoStatus}
          onNewEntry={handleNewEntry}
          onSelectAdjacent={handleSelectAdjacentKnowledge}
          onSubmit={handleSubmit}
        />
      </MobileEditorSheet>

      <DeleteConfirmDialog
        isDeleting={isDeleting}
        item={deleteTarget}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteSelected}
      />
      <AppConfirmDialog
        confirmLabel={isSkillSaving ? "删除中" : "确认删除"}
        description="删除后将移除该 Skill 及其所有文件，且无法从界面撤销。"
        icon={<Trash2 size={19} />}
        isOpen={skillDeleteTarget !== null}
        isPending={isSkillSaving}
        target={skillDeleteTarget?.name ?? ""}
        title="确认删除 Skill"
        tone="danger"
        onCancel={() => {
          if (!isSkillSaving) setSkillDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleConfirmDeleteSelectedSkill();
        }}
      />
      <AppConfirmDialog
        confirmLabel={
          conversionTarget === "knowledgeToTodo"
            ? isConvertingKnowledgeToTodo
              ? "转换中"
              : "确认转为待办"
            : isConvertingTodoToKnowledge
              ? "转换中"
              : "确认转为知识"
        }
        description={
          conversionTarget === "knowledgeToTodo"
            ? "此操作会创建一条待办事项，并删除当前可信知识。转换会在一个数据库事务中完成，失败时源记录会保留。"
            : "此操作会创建一条可信知识，并删除当前待办事项。转换会在一个数据库事务中完成，失败时源记录会保留。"
        }
        icon={conversionTarget === "knowledgeToTodo" ? <ClipboardCheck size={19} /> : <BookOpenCheck size={19} />}
        isOpen={conversionTarget !== null}
        isPending={isConvertingKnowledgeToTodo || isConvertingTodoToKnowledge}
        target={
          conversionTarget === "knowledgeToTodo"
            ? selectedId
              ? `可信知识 #${selectedId}`
              : "可信知识"
            : selectedTodoId
              ? `待办事项 #${selectedTodoId}`
              : "待办事项"
        }
        title={conversionTarget === "knowledgeToTodo" ? "确认转为待办事项" : "确认转为可信知识"}
        tone="warning"
        onCancel={() => {
          if (!isConvertingKnowledgeToTodo && !isConvertingTodoToKnowledge) setConversionTarget(null);
        }}
        onConfirm={() => {
          if (conversionTarget === "knowledgeToTodo") {
            void confirmConvertSelectedKnowledgeToTodo();
          } else if (conversionTarget === "todoToKnowledge") {
            void confirmConvertSelectedTodoToKnowledge();
          }
        }}
      />
      <TodoCurrentAppendDialog
        error={todoCurrentAppendError}
        isLoadingOptions={isTodoCurrentAppendOptionsLoading}
        isOpen={pendingTodoCurrentAppend !== null}
        isPending={isAppendingTodoToCurrent}
        options={currentRecordOptions}
        target={todoCurrentAppendTarget}
        todo={pendingTodoCurrentAppend}
        onCancel={() => {
          if (!isAppendingTodoToCurrent) resetTodoCurrentAppendState();
        }}
        onConfirm={() => {
          void confirmTodoCurrentAppend();
        }}
        onTargetChange={handleTodoCurrentAppendTargetChange}
      />
      <BlogPublishConfigDialog
        configs={blogPublishConfigs}
        selectedConfigId={selectedBlogPublishConfigId}
        draft={blogPublishConfigDraft}
        error={blogPublishConfigError}
        validationMessage={blogPublishConfigValidationMessage}
        isOpen={isBlogPublishConfigDialogOpen}
        isSaving={isBlogPublishConfigSaving}
        isValidating={isBlogPublishConfigValidating}
        onDraftChange={setBlogPublishConfigDraft}
        onSelectConfig={handleSelectBlogPublishConfigForEdit}
        onCreateNew={handleCreateNewBlogPublishConfig}
        onDelete={handleRequestDeleteBlogPublishConfig}
        onValidate={handleValidateCurrentBlogPublishConfig}
        onSave={handleSaveBlogPublishConfig}
        onClose={() => {
          if (!isBlogPublishConfigSaving && !isBlogPublishConfigValidating) setIsBlogPublishConfigDialogOpen(false);
        }}
      />
      <BlogPublishDialog
        articleTitle={
          selectedBlogFactoryItem
            ? extractMarkdownHeading(
                resolveBlogFactoryPublishMarkdown(selectedBlogFactoryItem, blogFactoryArticleDraft, blogFactoryEditDraft.taskContent),
              ) || selectedBlogFactoryItem.article_title || ""
            : ""
        }
        configs={blogPublishConfigs}
        error={blogPublishError}
        isOpen={isBlogPublishDialogOpen}
        isPending={isBlogPublishing}
        isCategoriesLoading={isBlogPublishCategoriesLoading}
        mode={blogPublishDialogMode}
        categoryOptions={blogPublishCategories}
        categoriesError={blogPublishCategoriesError}
        selectedCategories={blogPublishSelectedCategories}
        submissionOption={blogPublishSubmissionOption}
        selectedConfigId={blogPublishDialogConfigId}
        tags={blogPublishTagDraft}
        onClose={() => {
          if (!isBlogPublishing) setIsBlogPublishDialogOpen(false);
        }}
        onCategoryToggle={(categoryTitle) =>
          setBlogPublishSelectedCategories((current) =>
            current.includes(categoryTitle) ? current.filter((item) => item !== categoryTitle) : [...current, categoryTitle],
          )
        }
        onConfigChange={handleBlogPublishDialogConfigChange}
        onConfirm={handleConfirmBlogPublishFromDialog}
        onModeChange={setBlogPublishDialogMode}
        onSubmissionOptionChange={setBlogPublishSubmissionOption}
        onTagsChange={setBlogPublishTagDraft}
      />
      <BlogFactoryMaskRuleDialog
        draft={blogFactoryMaskRuleDraft}
        error={blogFactoryMaskError}
        isOpen={isBlogFactoryMaskDialogOpen}
        notice={blogFactoryMaskNotice}
        rules={blogFactoryMaskRules}
        selectedRuleId={selectedBlogFactoryMaskRuleId}
        onClose={() => setIsBlogFactoryMaskDialogOpen(false)}
        onCreateRule={handleCreateBlogFactoryMaskRule}
        onDraftChange={setBlogFactoryMaskRuleDraft}
        onSave={handleSaveBlogFactoryMaskRule}
        onSelectRule={handleSelectBlogFactoryMaskRule}
      />
      <AppConfirmDialog
        confirmLabel={isBlogPublishConfigDeleting ? "删除中" : "确认删除"}
        description="删除后将不再保留这套博客发布配置；如果它是默认配置，系统会自动把剩余配置中的一套补为默认。"
        icon={<Trash2 size={19} />}
        isOpen={blogPublishConfigDeleteTarget !== null}
        isPending={isBlogPublishConfigDeleting}
        target={blogPublishConfigDeleteTarget ? `${blogPublishConfigDeleteTarget.blog_name || "未命名博客"} / ${blogPublishConfigDeleteTarget.blog_url}` : ""}
        title="确认删除博客发布配置"
        tone="danger"
        onCancel={() => {
          if (!isBlogPublishConfigDeleting) setBlogPublishConfigDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleConfirmDeleteBlogPublishConfig();
        }}
      />
      <AppConfirmDialog
        confirmLabel={isBlogFactoryDeleting ? "删除中" : "确认删除"}
        description="此操作只删除博客工厂任务记录，不会删除原可信知识内容。删除后无法从界面撤销。"
        icon={<Trash2 size={19} />}
        isOpen={blogFactoryDeleteTarget !== null}
        isPending={isBlogFactoryDeleting}
        target={
          blogFactoryDeleteTarget
            ? `博客工厂任务 #${blogFactoryDeleteTarget.id} / 知识 #${blogFactoryDeleteTarget.knowledge_id}`
            : ""
        }
        title="确认删除博客工厂任务"
        tone="danger"
        onCancel={() => {
          if (!isBlogFactoryDeleting) setBlogFactoryDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleConfirmDeleteBlogFactoryItem();
        }}
      />
      <AppConfirmDialog
        confirmLabel={isCurrentRecordUpdating ? "保存中" : "确认保存"}
        description="当前类型已经到达 Level 10 且即将从 W48 回到 W1。确认后会保持 Level 10 并继续保存本次推进。"
        icon={<CircleGauge size={19} />}
        isOpen={pendingCurrentRecordUpdate !== null}
        isPending={isCurrentRecordUpdating}
        target={
          pendingCurrentRecordUpdate
            ? `${pendingCurrentRecordUpdate.record.username} / ${pendingCurrentRecordUpdate.record.type}`
            : ""
        }
        title="确认完成修炼周期"
        tone="warning"
        onCancel={() => {
          if (!isCurrentRecordUpdating) setPendingCurrentRecordUpdate(null);
        }}
        onConfirm={() => {
          if (!pendingCurrentRecordUpdate) return;
          const { record, next } = pendingCurrentRecordUpdate;
          setPendingCurrentRecordUpdate(null);
          void updateCurrentRecordAfterConfirm(record, next);
        }}
      />
    </main>
  );
}

function Sidebar({
  activeView,
  availableItems,
  isExpanded,
  onToggleExpanded,
  onViewChange,
}: {
  activeView: AppView;
  availableItems: FunctionNavItem[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onViewChange: (view: AppView) => void;
}) {
  type SidebarUtilityItem = {
    icon: typeof BookOpenCheck;
    label: string;
  };

  const utilityItems: SidebarUtilityItem[] = [
    { icon: ShieldCheck, label: "Review" },
    { icon: Database, label: "Sources" },
  ];
  const primaryItems = availableItems.filter((item) => item.view !== "usage");
  const usageItem = availableItems.find((item) => item.view === "usage");
  const usageActive = activeView === "usage";
  const sidebarButtonMotion =
    "transition-[width,gap,color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
  const sidebarLabelMotion = `min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
    isExpanded ? "max-w-36 translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0"
  }`;

  return (
    <aside
      className={`hidden border-r border-white/8 bg-ink-900/78 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col ${
        isExpanded ? "lg:items-stretch" : "lg:items-center"
      }`}
    >
      <button
        className={`mb-8 flex h-10 items-center overflow-hidden rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300 shadow-soft-glow hover:border-mint-300/40 hover:bg-mint-300/15 ${sidebarButtonMotion} ${
          isExpanded ? "w-full justify-start gap-3 px-[10.5px]" : "w-10 justify-start gap-0 px-[10.5px]"
        }`}
        title={isExpanded ? "收起功能名称" : "展开功能名称"}
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "收起左侧功能名称" : "展开左侧功能名称"}
        onClick={onToggleExpanded}
      >
        <Layers3 size={19} className="shrink-0" />
        <span className={`${sidebarLabelMotion} text-sm font-medium text-mint-100`}>功能导航</span>
      </button>
      <nav className="flex flex-1 flex-col gap-3" aria-label="桌面功能页面">
        {primaryItems.map((item) => {
          const active = item.view === activeView;
          return (
            <button
              key={item.view}
              className={`flex h-11 items-center overflow-hidden rounded-lg border text-sm font-medium ${sidebarButtonMotion} ${
                active
                  ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
                  : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200"
              } ${isExpanded ? "w-full justify-start gap-3 px-[12.5px]" : "w-11 justify-start gap-0 px-[12.5px]"}`}
              title={item.label}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onViewChange(item.view)}
            >
              <item.icon size={19} className="shrink-0" />
              <span className={sidebarLabelMotion}>{item.label}</span>
            </button>
          );
        })}
        {utilityItems.map((item) => (
          <button
            key={item.label}
            className={`flex h-11 items-center overflow-hidden rounded-lg border border-transparent text-sm font-medium text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200 ${sidebarButtonMotion} ${
              isExpanded ? "w-full justify-start gap-3 px-[12.5px]" : "w-11 justify-start gap-0 px-[12.5px]"
            }`}
            title={item.label}
            type="button"
          >
            <item.icon size={19} className="shrink-0" />
            <span className={sidebarLabelMotion}>{item.label}</span>
          </button>
        ))}
      </nav>
      {usageItem ? (
        <button
          className={`flex h-10 items-center overflow-hidden rounded-lg border text-xs font-semibold ${sidebarButtonMotion} ${
            usageActive
              ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
              : "border-white/10 text-slate-300 hover:border-mint-300/30 hover:bg-white/[0.04] hover:text-mint-300"
          } ${isExpanded ? "w-full justify-start gap-3 px-2.5" : "w-10 justify-start gap-0 px-2.5"}`}
          title={usageItem.label}
          type="button"
          aria-current={usageActive ? "page" : undefined}
          onClick={() => onViewChange(usageItem.view)}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center">AI</span>
          <span className={`${sidebarLabelMotion} text-sm font-medium`}>{usageItem.label}</span>
        </button>
      ) : null}
    </aside>
  );
}

function WorkspaceSidebarCollapseToggle({
  isCollapsed,
  label,
  onToggle,
}: {
  isCollapsed: boolean;
  label: string;
  onToggle: () => void;
}) {
  const [learningCardStyle, setLearningCardStyle] = useState<"classic" | "learning-card" | "minimal">("learning-card");
  if (isCollapsed) {
    return (
      <button
        className="hidden h-full min-h-[420px] w-full flex-col items-center rounded-md text-mint-200 transition hover:bg-mint-300/10 focus:outline-none focus:ring-2 focus:ring-mint-300/30 xl:flex"
        type="button"
        aria-label={`展开${label}`}
        title={`展开${label}`}
        onClick={onToggle}
      >
        <ChevronRight className="mt-2 shrink-0" size={17} />
      </button>
    );
  }

  return (
    <button
      className="absolute inset-y-0 right-0 hidden w-7 flex-col items-center border-l border-white/10 text-slate-500 transition hover:bg-mint-300/10 hover:text-mint-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-mint-300/30 xl:flex"
      type="button"
      aria-label={`收起${label}`}
      title={`收起${label}，专注右侧内容`}
      onClick={onToggle}
    >
      <ChevronLeft className="mt-2 shrink-0" size={16} />
    </button>
  );
}

function WorkspaceRightSidebarCollapseToggle({
  isCollapsed,
  label,
  onToggle,
}: {
  isCollapsed: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      className="hidden h-full min-h-[420px] w-full flex-col items-center rounded-md text-slate-500 transition hover:bg-mint-300/10 hover:text-mint-200 focus:outline-none focus:ring-2 focus:ring-mint-300/30 xl:flex"
      type="button"
      aria-label={`${isCollapsed ? "展开" : "收起"}${label}`}
      title={isCollapsed ? `展开${label}` : `收起${label}，专注编辑可信知识`}
      onClick={onToggle}
    >
      {isCollapsed ? <ChevronLeft className="mt-2 shrink-0" size={17} /> : <ChevronRight className="mt-2 shrink-0" size={16} />}
    </button>
  );
}

function Topbar({
  activeView,
  aiCodingNotice,
  availableItems,
  currentUsername,
  isMobileNavVisible,
  query,
  themeMode,
  title,
  subtitle,
  onMobileNavVisibilityChange,
  onLogout,
  onQueryChange,
  onToggleTheme,
  onViewChange,
}: {
  activeView: AppView;
  aiCodingNotice: AiCodingNoticeStatus | null;
  availableItems: FunctionNavItem[];
  currentUsername: string;
  isMobileNavVisible: boolean;
  query: string;
  themeMode: ThemeMode;
  title: string;
  subtitle: string;
  onMobileNavVisibilityChange: (visible: boolean) => void;
  onLogout: () => void;
  onQueryChange: (value: string) => void;
  onToggleTheme: () => void;
  onViewChange: (view: AppView) => void;
}) {
  const aiCodingNoticeMeta =
    aiCodingNotice === "running"
      ? {
          icon: <Loader2 className="animate-spin" size={16} />,
          label: "AI 编程任务执行中",
          shortLabel: "执行中",
          className: "border-mint-300/25 bg-mint-300/10 text-mint-200 hover:border-mint-300/40 hover:bg-mint-300/15",
        }
      : aiCodingNotice === "completed"
        ? {
            icon: <CheckCircle2 size={16} />,
            label: "AI 编程任务已完成",
            shortLabel: "已完成",
            className: "border-mint-300/25 bg-mint-300/10 text-mint-200 hover:border-mint-300/40 hover:bg-mint-300/15",
          }
        : aiCodingNotice === "failed"
          ? {
              icon: <TriangleAlert size={16} />,
              label: "AI 编程任务执行失败",
              shortLabel: "失败",
              className: "border-red-400/25 bg-red-400/10 text-red-100 hover:border-red-300/40 hover:bg-red-400/15",
            }
          : aiCodingNotice === "cancelled"
            ? {
                icon: <X size={16} />,
                label: "AI 编程任务已终止",
                shortLabel: "已终止",
                className: "border-amberline/25 bg-amberline/10 text-amber-100 hover:border-amberline/40 hover:bg-amberline/15",
              }
          : null;

  return (
    <header className="relative z-40 flex flex-col gap-4 border-b border-white/8 bg-ink-900/72 px-4 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-3">
      <div className="pr-32 lg:pr-0">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mint-300/80 lg:mb-0.5">
          <ShieldCheck size={14} />
          {subtitle}
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-50 lg:text-xl">{title}</h1>
      </div>
      <div className="absolute right-4 top-4 lg:hidden">
        <button
          className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
            isMobileNavVisible
              ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/16 hover:bg-white/[0.06] hover:text-slate-50"
          }`}
          type="button"
          aria-expanded={isMobileNavVisible}
          aria-controls="mobile-function-nav"
          onClick={() => onMobileNavVisibilityChange(!isMobileNavVisible)}
        >
          <Menu size={17} />
          <span>{isMobileNavVisible ? "隐藏导航" : "显示导航"}</span>
        </button>
      </div>
      {isMobileNavVisible ? (
        <nav id="mobile-function-nav" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden" aria-label="功能页面">
          {availableItems.map((item) => {
            const active = item.view === activeView;
            return (
              <button
                key={item.view}
                className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                  active
                    ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
                    : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/16 hover:bg-white/[0.06] hover:text-slate-50"
                }`}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onViewChange(item.view);
                  onMobileNavVisibilityChange(false);
                }}
              >
                <item.icon size={17} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {activeView !== "overview" &&
        activeView !== "usage" &&
        activeView !== "historyAsk" &&
        activeView !== "aiCoding" &&
        activeView !== "aiGraph" ? (
          <label className="flex h-11 min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-slate-400 md:w-80">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder={
                activeView === "history"
                  ? "搜索历史内容"
                  : activeView === "blogFactory"
                    ? "搜索任务、问题或答案快照"
                    : activeView === "todos"
                      ? "搜索待办标题、内容或标签"
                    : activeView === "personalSecrets"
                      ? "搜索系统名称、登录地址或标签"
                    : activeView === "currentRecords"
                      ? "搜索类型或当前内容"
                      : activeView === "englishMaterials"
                        ? "搜索标题、分类、英文或中文内容"
                      : "搜索问题、来源或标签"
              }
            />
          </label>
        ) : null}
        <button
          className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
          title={themeMode === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          type="button"
          onClick={onToggleTheme}
        >
          {themeMode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          <span className="hidden sm:inline">{themeMode === "dark" ? "浅色" : "深色"}</span>
        </button>
        {aiCodingNoticeMeta ? (
          <button
            className={`flex h-11 max-w-full shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${aiCodingNoticeMeta.className}`}
            title="返回 AI 编程查看任务"
            type="button"
            onClick={() => onViewChange("aiCoding")}
          >
            {aiCodingNoticeMeta.icon}
            <span className="hidden sm:inline">{aiCodingNoticeMeta.label}</span>
            <span className="sm:hidden">AI 编程{aiCodingNoticeMeta.shortLabel}</span>
          </button>
        ) : null}
        <button
          className="flex h-11 min-w-0 max-w-full items-center rounded-lg border border-white/10 bg-white/[0.028] px-3 text-sm text-slate-400 transition hover:border-mint-300/30 hover:bg-mint-300/10 hover:text-mint-200 focus:outline-none focus:ring-2 focus:ring-mint-300/30"
          title={`当前登录用户：${currentUsername}。点击返回总览`}
          type="button"
          onClick={() => {
            onViewChange("overview");
            onMobileNavVisibilityChange(false);
          }}
        >
          <span className="mr-1 hidden text-slate-500 sm:inline">您好，</span>
          <span className="truncate font-medium text-slate-200">{currentUsername}</span>
        </button>
        <button
          className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-red-300/30 hover:text-red-200"
          title="退出登录"
          type="button"
          onClick={onLogout}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (result: {
    api_key: string;
    username: string;
    is_admin: boolean;
    is_admin_role: boolean;
    visible_users: string[];
    visible_admin_modules: string[];
  }) => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const message = readWeChatErrorFromHash();
    if (message) clearLocationHash();
    return message;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWechatEnabled, setIsWechatEnabled] = useState(false);
  const [isWechatStarting, setIsWechatStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchAuthConfig().then((config) => {
      if (mounted) setIsWechatEnabled(config.wechat_enabled);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await login(username.trim(), password);
      onLogin(result);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWeChatLogin() {
    setIsWechatStarting(true);
    setError(null);

    try {
      const authorizationUrl = await startWeChatLogin();
      window.location.assign(authorizationUrl);
    } catch (wechatError) {
      setError(wechatError instanceof Error ? wechatError.message : "微信登录暂不可用");
      setIsWechatStarting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-ink-950 px-4 text-slate-100 md:grid-cols-[minmax(360px,0.95fr)_minmax(360px,1.05fr)] md:items-center md:px-10">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(125,211,199,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_24%)]" />
      <LoginKnowledgeBackdrop />
      <section className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-ink-900/78 p-5 shadow-soft-glow backdrop-blur-xl md:col-start-2 md:justify-self-center">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300">
            <LockKeyhole size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-mint-300/80">Trusted Knowledge</div>
            <h1 className="mt-1 text-xl font-semibold text-slate-50">可信知识管理系统</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="用户名" icon={<ShieldCheck size={16} />}>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="control"
              placeholder="admin"
              autoComplete="username"
            />
          </Field>
          <Field label="密码" icon={<LockKeyhole size={16} />}>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="control"
              placeholder="输入访问密码"
              type="password"
              autoComplete="current-password"
            />
          </Field>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            disabled={isSubmitting || !username.trim() || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            type="submit"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
            {isSubmitting ? "Verifying" : "登录"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">或</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            disabled={!isWechatEnabled || isWechatStarting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] font-medium text-slate-200 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-500"
            type="button"
            onClick={handleWeChatLogin}
          >
            {isWechatStarting ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
            {isWechatEnabled ? (isWechatStarting ? "正在打开微信登录" : "微信扫码登录") : "微信登录未配置"}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoginKnowledgeBackdrop() {
  const nodes = [
    { icon: BookOpenCheck, className: "left-[18%] top-[18%]" },
    { icon: Database, className: "left-[64%] top-[14%]" },
    { icon: ShieldCheck, className: "left-[72%] top-[58%]" },
    { icon: Tags, className: "left-[28%] top-[68%]" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
      <div className="absolute left-[-7%] top-[8%] hidden h-[78vh] w-[58vw] max-w-5xl md:block">
        <div className="absolute left-[14%] top-[13%] h-[68%] w-[68%] rounded-[999px/680px] border border-slate-300/[0.055] rotate-[-10deg]" />
        <div className="absolute left-[20%] top-[20%] h-[52%] w-[54%] rounded-[999px/560px] border border-slate-300/[0.04] rotate-[18deg]" />

        {nodes.map((node) => (
          <div
            key={node.className}
            className={`absolute grid h-12 w-12 place-items-center rounded-lg border border-mint-300/20 bg-ink-850/78 text-mint-300/80 shadow-soft-glow ${node.className}`}
          >
            <node.icon size={20} />
          </div>
        ))}

        <div className="absolute left-[48%] top-[40%] w-64 rounded-lg border border-white/10 bg-ink-900/50 p-4 backdrop-blur-md">
          <div className="mb-3 flex gap-2">
            <div className="h-5 w-16 rounded-full border border-mint-300/20 bg-mint-300/10" />
            <div className="h-5 w-14 rounded-full border border-amberline/20 bg-amberline/10" />
          </div>
          <div className="mb-2 h-2 w-full rounded bg-white/12" />
          <div className="h-2 w-3/4 rounded bg-white/9" />
        </div>

        <div className="absolute left-[22%] top-[76%] flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900/48 px-3 py-2 text-mint-300/70 backdrop-blur-md">
          <ShieldCheck size={16} />
          <div className="h-2 w-28 rounded bg-mint-300/20" />
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  item,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  item: KnowledgeItem | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, item, onCancel]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <section
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-red-300/20 bg-ink-900 p-5 shadow-soft-glow"
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-red-300/25 bg-red-400/10 text-red-200">
            <Trash2 size={19} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-red-200">确认删除知识</div>
            <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">{item.question}</h2>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-slate-400">
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-600">Target</div>
          <div className="text-slate-300">#{item.id}</div>
          <div>{item.source || "unknown source"}</div>
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
          <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
          <span>这会直接从 Oracle 删除该记录，目前无法撤销。</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isDeleting}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-400/12 px-4 font-medium text-red-200 transition hover:bg-red-400/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={isDeleting}
            type="button"
            onClick={onConfirm}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
            {isDeleting ? "删除中" : "确认删除"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AppConfirmDialog({
  confirmLabel,
  description,
  icon,
  isOpen,
  isPending,
  target,
  title,
  tone = "warning",
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  description: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isPending: boolean;
  target: string;
  title: string;
  tone?: "warning" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  const toneClasses =
    tone === "danger"
      ? {
          icon: "border-red-300/25 bg-red-400/10 text-red-200",
          label: "text-red-200",
          notice: "border-red-300/25 bg-red-400/10 text-red-100",
          button: "border-red-300/25 bg-red-400/12 text-red-200 hover:bg-red-400/18",
        }
      : {
          icon: "border-amberline/25 bg-amberline/10 text-amberline",
          label: "text-amber-100",
          notice: "border-amberline/25 bg-amberline/10 text-amber-100",
          button: "border-amberline/25 bg-amberline/10 text-amber-100 hover:bg-amberline/15",
        };

  return (
    <div
      className="tk-confirm-overlay fixed inset-0 z-50 grid place-items-center bg-black/62 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <section
        aria-modal="true"
        className="tk-confirm-panel w-full max-w-md rounded-lg border border-white/10 bg-ink-900 p-5 shadow-soft-glow"
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${toneClasses.icon}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className={`mb-1 text-sm font-medium ${toneClasses.label}`}>需要确认</div>
            <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">{title}</h2>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-slate-400">
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-600">Target</div>
          <div className="text-slate-300">{target}</div>
        </div>

        <div className={`mb-5 flex items-start gap-2 rounded-lg border px-3 py-3 text-sm ${toneClasses.notice}`}>
          <TriangleAlert className="mt-0.5 shrink-0" size={17} />
          <span>{description}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isPending}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 font-medium transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500 ${toneClasses.button}`}
            disabled={isPending}
            type="button"
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : icon}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function BlogFactoryMaskRuleDialog({
  draft,
  error,
  isOpen,
  notice,
  rules,
  selectedRuleId,
  onClose,
  onCreateRule,
  onDraftChange,
  onSave,
  onSelectRule,
}: {
  draft: BlogFactoryMaskRule;
  error: string | null;
  isOpen: boolean;
  notice: string | null;
  rules: BlogFactoryMaskRule[];
  selectedRuleId: string | null;
  onClose: () => void;
  onCreateRule: () => void;
  onDraftChange: (draft: BlogFactoryMaskRule) => void;
  onSave: () => void;
  onSelectRule: (ruleId: string) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/62 px-4 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-modal="true"
        className="mx-auto grid max-h-[calc(100dvh-2rem)] w-full max-w-5xl gap-4 overflow-y-auto rounded-xl border border-white/10 bg-ink-900 p-4 shadow-soft-glow sm:p-5 lg:max-h-[min(92vh,820px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden"
        role="dialog"
      >
        <aside className="min-h-0 rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:flex lg:flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-mint-300">
                <LockKeyhole size={16} />
                Blog Factory 脱敏
              </div>
              <h2 className="text-lg font-semibold text-slate-50">脱敏规则</h2>
            </div>
            <button
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
              type="button"
              onClick={onCreateRule}
            >
              <Plus size={14} />
              新增
            </button>
          </div>

          <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-slate-500">
                还没有保存的脱敏规则。可以先新增一套规则，保存后回到任务内容中直接应用。
              </div>
            ) : (
              rules.map((rule) => (
                <button
                  key={rule.id}
                  className={`block w-full rounded-lg border p-3 text-left transition ${
                    selectedRuleId === rule.id ? "border-mint-300/40 bg-mint-300/10" : "border-white/10 bg-white/[0.02] hover:border-mint-300/25"
                  }`}
                  type="button"
                  onClick={() => onSelectRule(rule.id)}
                >
                  <div className="mb-1 truncate text-sm font-medium text-slate-100">{rule.name || "未命名规则"}</div>
                  <div className="text-xs leading-5 text-slate-500">{describeBlogFactoryMaskRule(rule)}</div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-h-0 rounded-lg border border-white/10 bg-white/[0.028] p-4 lg:overflow-y-auto">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 text-sm text-slate-400">当前配置</div>
              <h3 className="text-lg font-semibold text-slate-50">{draft.name.trim() ? draft.name : "新增脱敏规则"}</h3>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
              {describeBlogFactoryMaskRule(draft)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="规则名称" icon={<FileText size={16} />}>
                <input
                  className="control"
                  maxLength={40}
                  value={draft.name}
                  onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                  placeholder="如：客户信息脱敏"
                />
              </Field>
              <Field label="规则说明" icon={<Tags size={16} />}>
                <input
                  className="control"
                  maxLength={120}
                  value={draft.description}
                  onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                  placeholder="记录适用场景，便于复用"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">关键词替换</div>
                  <div className="text-xs text-slate-500">支持多组“原词 {"->"} 替换词”，按顺序应用。</div>
                </div>
                <button
                  className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                  type="button"
                  onClick={() =>
                    onDraftChange({
                      ...draft,
                      keywordReplacements: [...draft.keywordReplacements, createEmptyBlogFactoryKeywordReplacement()],
                    })
                  }
                >
                  <Plus size={14} />
                  添加替换
                </button>
              </div>

              <div className="space-y-2">
                {draft.keywordReplacements.map((item, index) => (
                  <div key={item.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      className="control"
                      value={item.keyword}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          keywordReplacements: draft.keywordReplacements.map((entry) =>
                            entry.id === item.id ? { ...entry, keyword: event.target.value } : entry,
                          ),
                        })
                      }
                      placeholder={`原词 ${index + 1}`}
                    />
                    <input
                      className="control"
                      value={item.replacement}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          keywordReplacements: draft.keywordReplacements.map((entry) =>
                            entry.id === item.id ? { ...entry, replacement: event.target.value } : entry,
                          ),
                        })
                      }
                      placeholder="替换为"
                    />
                    <button
                      className="grid h-11 w-11 place-items-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/16"
                      disabled={draft.keywordReplacements.length <= 1}
                      type="button"
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          keywordReplacements:
                            draft.keywordReplacements.length <= 1
                              ? [createEmptyBlogFactoryKeywordReplacement()]
                              : draft.keywordReplacements.filter((entry) => entry.id !== item.id),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 text-sm font-medium text-slate-100">通用脱敏项</div>
              <div className="grid gap-3 md:grid-cols-2">
                {BLOG_FACTORY_MASK_TOGGLE_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
                    <input
                      checked={draft[option.key]}
                      className="mt-1 h-4 w-4 rounded border-white/15 bg-white/[0.03]"
                      type="checkbox"
                      onChange={(event) => onDraftChange({ ...draft, [option.key]: event.target.checked })}
                    />
                    <span>
                      <span className="block text-sm text-slate-200">{option.label}</span>
                      <span className="block text-xs leading-5 text-slate-500">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {notice ? <div className="mt-4 rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-3 text-sm text-mint-100">{notice}</div> : null}
          {error ? <div className="mt-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">{error}</div> : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100"
              type="button"
              onClick={onClose}
            >
              关闭
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20"
              type="button"
              onClick={onSave}
            >
              <Save size={17} />
              保存规则
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlogPublishConfigDialog({
  configs,
  selectedConfigId,
  draft,
  error,
  validationMessage,
  isOpen,
  isSaving,
  isValidating,
  onDraftChange,
  onSelectConfig,
  onCreateNew,
  onDelete,
  onValidate,
  onSave,
  onClose,
}: {
  configs: BlogPublishConfig[];
  selectedConfigId: number | null;
  draft: BlogPublishConfigDraft;
  error: string | null;
  validationMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  isValidating: boolean;
  onDraftChange: (draft: BlogPublishConfigDraft) => void;
  onSelectConfig: (configId: number) => void;
  onCreateNew: () => void;
  onDelete: () => void;
  onValidate: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving && !isValidating) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, isValidating, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/62 px-4 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving && !isValidating) onClose();
      }}
    >
      <section
        aria-modal="true"
        className="mx-auto grid max-h-[calc(100dvh-2rem)] w-full max-w-5xl gap-4 overflow-y-auto rounded-xl border border-white/10 bg-ink-900 p-4 shadow-soft-glow sm:p-5 lg:max-h-[min(92vh,820px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden"
        role="dialog"
      >
        <aside className="min-h-0 rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:flex lg:flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-mint-300">
                <Settings2 size={16} />
                Metaweblog API 博客发布
              </div>
              <h2 className="text-lg font-semibold text-slate-50">配置API</h2>
            </div>
            <button
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
              type="button"
              onClick={onCreateNew}
            >
              <Plus size={14} />
              新增
            </button>
          </div>

          <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {configs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-slate-500">
                还没有保存的博客发布配置。点击右上角“新增”开始录入。
              </div>
            ) : (
              configs.map((config) => (
                <button
                  key={config.id}
                  className={`block w-full rounded-lg border p-3 text-left transition ${
                    selectedConfigId === config.id
                      ? "border-mint-300/40 bg-mint-300/10"
                      : "border-white/10 bg-white/[0.02] hover:border-mint-300/25"
                  }`}
                  type="button"
                  onClick={() => onSelectConfig(config.id)}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">{config.blog_name || config.blog_url}</span>
                    {config.is_default ? (
                      <span className="rounded-full border border-mint-300/30 bg-mint-300/10 px-2 py-0.5 text-[11px] text-mint-200">
                        默认
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-slate-500">{config.username}</div>
                  <div className="mt-1 truncate text-xs text-slate-600">{config.api_url}</div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-h-0 rounded-lg border border-white/10 bg-white/[0.028] p-4 lg:overflow-y-auto">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 text-sm text-slate-400">界面配置面板</div>
              <h3 className="text-lg font-semibold text-slate-50">
                {selectedConfigId === null ? "新增博客发布配置" : "编辑博客发布配置"}
              </h3>
            </div>
            {selectedConfigId !== null ? (
              <button
                className="flex h-9 items-center gap-2 rounded-lg border border-red-300/20 bg-red-400/10 px-3 text-xs text-red-200 transition hover:bg-red-400/16"
                disabled={isSaving || isValidating}
                type="button"
                onClick={onDelete}
              >
                <Trash2 size={14} />
                删除
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="博客类型" icon={<Radio size={16} />}>
              <select
                className="control"
                value={draft.blogType}
                onChange={(event) => onDraftChange({ ...draft, blogType: event.target.value as BlogPublishType })}
              >
                <option value="METAWEBLOG_API">Metaweblog API</option>
              </select>
            </Field>
            <Field label="博客名称" icon={<FileText size={16} />}>
              <input
                className="control"
                value={draft.blogName}
                onChange={(event) => onDraftChange({ ...draft, blogName: event.target.value, validation: null })}
                placeholder="验证后自动带出，也可手工填写"
              />
            </Field>
            <Field label="博客网址" icon={<Globe size={16} />}>
              <input
                className="control"
                value={draft.blogUrl}
                onChange={(event) => onDraftChange({ ...draft, blogUrl: event.target.value, validation: null })}
                placeholder="https://www.cnblogs.com/jyzhao"
              />
            </Field>
            <Field label="API地址" icon={<Database size={16} />}>
              <input
                className="control"
                value={draft.apiUrl}
                onChange={(event) => onDraftChange({ ...draft, apiUrl: event.target.value, validation: null })}
                placeholder="https://rpc.cnblogs.com/metaweblog/博客后缀"
              />
            </Field>
            <Field label="账号" icon={<ShieldCheck size={16} />}>
              <input
                className="control"
                value={draft.username}
                onChange={(event) => onDraftChange({ ...draft, username: event.target.value, validation: null })}
                placeholder="博客登录用户名"
              />
            </Field>
            <Field label="密码" icon={<Lock size={16} />}>
              <input
                className="control"
                type="password"
                value={draft.password}
                onChange={(event) => onDraftChange({ ...draft, password: event.target.value, validation: null })}
                placeholder={selectedConfigId === null ? "请输入博客密码" : "留空则保持现有密码"}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              checked={draft.isDefault}
              className="h-4 w-4 rounded border-white/15 bg-white/[0.03]"
              type="checkbox"
              onChange={(event) => onDraftChange({ ...draft, isDefault: event.target.checked })}
            />
            设为默认发布配置
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
              disabled={isSaving || isValidating}
              type="button"
              onClick={onValidate}
            >
              {isValidating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {isValidating ? "验证中" : "验证"}
            </button>
            <span className="text-xs text-slate-500">博客园标准 RPC 模板：`https://rpc.cnblogs.com/metaweblog/博客后缀`</span>
          </div>

          {validationMessage ? (
            <div className="mt-4 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-3 text-sm text-mint-100">
              {validationMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100"
              disabled={isSaving || isValidating}
              type="button"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isSaving || isValidating}
              type="button"
              onClick={onSave}
            >
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {selectedConfigId === null ? "确定并保存" : "确定并更新"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlogPublishDialog({
  articleTitle,
  categoryOptions,
  categoriesError,
  configs,
  error,
  isCategoriesLoading,
  isOpen,
  isPending,
  mode,
  submissionOption,
  selectedConfigId,
  selectedCategories,
  tags,
  onCategoryToggle,
  onClose,
  onConfigChange,
  onConfirm,
  onModeChange,
  onSubmissionOptionChange,
  onTagsChange,
}: {
  articleTitle: string;
  categoryOptions: BlogPublishCategory[];
  categoriesError: string | null;
  configs: BlogPublishConfig[];
  error: string | null;
  isCategoriesLoading: boolean;
  isOpen: boolean;
  isPending: boolean;
  mode: BlogPublishDialogMode;
  submissionOption: BlogPublishSubmissionOption;
  selectedConfigId: number | null;
  selectedCategories: string[];
  tags: string;
  onCategoryToggle: (categoryTitle: string) => void;
  onClose: () => void;
  onConfigChange: (configId: number) => void;
  onConfirm: () => void;
  onModeChange: (mode: BlogPublishDialogMode) => void;
  onSubmissionOptionChange: (option: BlogPublishSubmissionOption) => void;
  onTagsChange: (value: string) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const selectedConfig = configs.find((item) => item.id === selectedConfigId) ?? null;
  const isCnblogsConfig = selectedConfig ? isCnblogsPublishConfig(selectedConfig) : false;
  const parsedTags = splitBlogPublishTags(tags);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/62 px-4 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        aria-modal="true"
        className="mx-auto w-full max-w-2xl rounded-lg border border-white/10 bg-ink-900 p-5 shadow-soft-glow"
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300">
            <Send size={18} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-mint-300">Metaweblog API 博客发布</div>
            <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">发布到博客</h2>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-slate-400">
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-600">Article</div>
          <div className="text-slate-200">{articleTitle || "未识别标题"}</div>
          <div className="mt-2 text-xs text-slate-500">
            {selectedCategories.length > 0 ? `个人分类：${selectedCategories.join(" / ")}` : "个人分类：未设置"}
          </div>
          <div className="mt-1 text-xs text-slate-500">{parsedTags.length > 0 ? `Tag：${parsedTags.join(" / ")}` : "Tag：未设置"}</div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field label="发布配置" icon={<Settings2 size={16} />}>
            <select
              className="control"
              disabled={configs.length === 0 || isPending}
              value={selectedConfigId ?? ""}
              onChange={(event) => onConfigChange(Number(event.target.value))}
            >
              {configs.length === 0 ? <option value="">暂无可用配置</option> : null}
              {configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.blog_name || config.blog_url}
                  {config.is_default ? "（默认）" : ""}
                </option>
              ))}
            </select>
          </Field>
          {isCnblogsConfig ? (
            <Field label="投稿选项" icon={<Send size={16} />}>
              <select
                className="control"
                disabled={isPending}
                value={submissionOption}
                onChange={(event) => onSubmissionOptionChange(event.target.value as BlogPublishSubmissionOption)}
              >
                <option value="CNBLOGS_HOME">投稿至博客园首页</option>
                <option value="PERSONAL_ONLY">仅发布到个人博客</option>
              </select>
            </Field>
          ) : null}
          <Field label="发布状态" icon={<Radio size={16} />}>
            <div className="flex h-11 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              <button
                className={`flex-1 text-sm transition ${mode === "draft" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"}`}
                type="button"
                onClick={() => onModeChange("draft")}
              >
                存为草稿
              </button>
              <button
                className={`flex-1 border-l border-white/10 text-sm transition ${
                  mode === "publish" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                }`}
                type="button"
                onClick={() => onModeChange("publish")}
              >
                直接发布
              </button>
            </div>
          </Field>
        </div>

        {isCnblogsConfig ? (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-200">博客园个人分类</div>
                <div className="text-xs text-slate-500">首页是否投稿由上方“投稿选项”控制；这里仅保留可勾选的随笔分类。</div>
              </div>
              {isCategoriesLoading ? <Loader2 className="animate-spin text-mint-300" size={16} /> : null}
            </div>
            {categoriesError ? <div className="mb-3 text-sm text-red-200">{categoriesError}</div> : null}
            {categoryOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-sm text-slate-500">
                {isCategoriesLoading ? "正在读取随笔分类…" : "当前博客未返回可用的随笔分类，可继续发布但不会自动附带分类。"}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {categoryOptions.map((category) => {
                  const checked = selectedCategories.includes(category.title);
                  return (
                    <label
                      key={`${category.category_id ?? "title"}-${category.title}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                        checked
                          ? "border-mint-300/35 bg-mint-300/10 text-mint-100"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-mint-300/25"
                      }`}
                    >
                      <input
                        checked={checked}
                        className="mt-0.5 h-4 w-4 rounded border-white/15 bg-white/[0.03]"
                        disabled={isPending}
                        type="checkbox"
                        onChange={() => onCategoryToggle(category.title)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{category.title}</span>
                        {category.description ? <span className="mt-1 block text-xs text-slate-500">{category.description}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-slate-200">Tag 标签</div>
            <div className="text-xs text-slate-500">用于写入博客标签；默认取任务记录中的主题标签，可按逗号分隔单独调整。</div>
          </div>
          <input
            className="control"
            disabled={isPending}
            placeholder="例如：AI, Oracle, APEX"
            value={tags}
            onChange={(event) => onTagsChange(event.target.value)}
          />
        </div>

        {selectedConfig ? (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-slate-500">
            <div>{selectedConfig.username}</div>
            <div className="truncate">{selectedConfig.api_url}</div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">{error}</div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100"
            disabled={isPending}
            type="button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!selectedConfigId || configs.length === 0 || isPending}
            type="button"
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
            {isPending ? "发布中" : mode === "publish" ? "确认发布" : "保存草稿"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TodoCurrentAppendDialog({
  error,
  isOpen,
  isLoadingOptions,
  isPending,
  options,
  target,
  todo,
  onCancel,
  onConfirm,
  onTargetChange,
}: {
  error: string | null;
  isOpen: boolean;
  isLoadingOptions: boolean;
  isPending: boolean;
  options: CurrentRecordOptions;
  target: CurrentAppendTarget;
  todo: TodoItem | null;
  onCancel: () => void;
  onConfirm: () => void;
  onTargetChange: (target: CurrentAppendTarget) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  const userOptions = options.users.filter((user) => (options.user_types[user] ?? []).length > 0);
  const typeOptions = target.username ? options.user_types[target.username] ?? [] : [];
  const canConfirm = Boolean(target.username && target.type && target.week && target.day) && !isLoadingOptions && !isPending;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <section
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-white/10 bg-ink-900 p-5 shadow-soft-glow"
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300">
            <ClipboardList size={19} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-mint-300">当前记录</div>
            <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">追加已完成待办</h2>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-slate-400">
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-600">Todo</div>
          <div className="line-clamp-2 text-slate-300">{todo?.title ?? "待办事项"}</div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={isLoadingOptions || isPending}
              value={target.username}
              onChange={(event) => {
                const username = event.target.value;
                onTargetChange(resolveCurrentAppendTarget(options, { username, type: target.type, week: "", day: "" }));
              }}
            >
              {userOptions.length === 0 ? <option value="">暂无用户</option> : null}
              {userOptions.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </Field>
          <Field label="类型" icon={<Tags size={16} />}>
            <select
              className="control"
              disabled={isLoadingOptions || isPending || typeOptions.length === 0}
              value={target.type}
              onChange={(event) => onTargetChange({ ...target, type: event.target.value, week: "", day: "" })}
            >
              {typeOptions.length === 0 ? <option value="">暂无类型</option> : null}
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week" icon={<CalendarClock size={16} />}>
            <select
              className="control"
              disabled={isLoadingOptions || isPending || !target.type}
              value={target.week}
              onChange={(event) => onTargetChange({ ...target, week: event.target.value as CurrentWeek })}
            >
              <option value="">选择 Week</option>
              {options.weeks.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Day" icon={<CalendarClock size={16} />}>
            <select
              className="control"
              disabled={isLoadingOptions || isPending || !target.type}
              value={target.day}
              onChange={(event) => onTargetChange({ ...target, day: event.target.value as CurrentDay })}
            >
              <option value="">选择 Day</option>
              {options.days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-3 text-sm text-mint-100">
          {isLoadingOptions ? <Loader2 className="mt-0.5 shrink-0 animate-spin" size={17} /> : <FilePlus2 className="mt-0.5 shrink-0" size={17} />}
          <span>确认后会把任务目标和任务内容追加到所选当前记录的 CONTENT 最前面，并按你的选择同步更新 Week / Day。</span>
        </div>

        {error ? (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isPending}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!canConfirm}
            type="button"
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <FilePlus2 size={17} />}
            {isPending ? "追加中" : "确认追加"}
          </button>
        </div>
      </section>
    </div>
  );
}

function MobileEditorSheet({
  children,
  icon,
  isBusy,
  isOpen,
  label,
  title,
  onClose,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  isBusy: boolean;
  isOpen: boolean;
  label: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm lg:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <section
        aria-modal="true"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-950 shadow-soft-glow"
        role="dialog"
      >
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                {icon}
                {label}
              </div>
              <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">{title}</h2>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isBusy}
              title="关闭"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </section>
    </div>
  );
}

interface MarkdownEditorViewport {
  selectionStart: number;
  selectionEnd: number;
  scrollTop: number;
  scrollLeft: number;
}

interface MarkdownImageTextareaHandle {
  getViewport: () => MarkdownEditorViewport;
  restoreViewport: (viewport: MarkdownEditorViewport) => void;
}

function getMarkdownPreviewAnchor(markdown: string, selectionStart: number) {
  const lineStart = markdown.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const lineEnd = markdown.indexOf("\n", selectionStart);
  const currentLine = markdown.slice(lineStart, lineEnd === -1 ? markdown.length : lineEnd).trim();
  if (currentLine) return currentLine;

  const precedingContent = markdown.slice(0, lineStart).trimEnd();
  const precedingLineStart = precedingContent.lastIndexOf("\n") + 1;
  return precedingContent.slice(precedingLineStart).trim();
}

const MarkdownImageTextarea = forwardRef<MarkdownImageTextareaHandle, {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
  disabled?: boolean;
}>(function MarkdownImageTextarea({
  value,
  onChange,
  className,
  placeholder,
  disabled,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  function restoreEditorSelection(
    selectionStart: number,
    selectionEnd: number,
    scrollTop: number,
    scrollLeft: number,
  ) {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      // Formatting changes the controlled value and moves focus to the toolbar.
      // Preserve the editor viewport so a long document does not jump back to its
      // first line while the selection is restored.
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(selectionStart, selectionEnd);
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    });
  }

  useImperativeHandle(ref, () => ({
    getViewport: () => {
      const textarea = textareaRef.current;
      return {
        selectionStart: textarea?.selectionStart ?? value.length,
        selectionEnd: textarea?.selectionEnd ?? value.length,
        scrollTop: textarea?.scrollTop ?? 0,
        scrollLeft: textarea?.scrollLeft ?? 0,
      };
    },
    restoreViewport: (viewport) => {
      restoreEditorSelection(viewport.selectionStart, viewport.selectionEnd, viewport.scrollTop, viewport.scrollLeft);
    },
  }), [value]);

  async function uploadAndInsert(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length || disabled) return;

    setIsUploadingImage(true);
    setImageError(null);
    try {
      const uploads = await Promise.all(imageFiles.map((file) => uploadMediaImage(file)));
      insertMarkdown(uploads.map((item) => item.markdown).join("\n\n"));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "图片上传失败，请稍后重试。");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function insertMarkdown(markdown: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const scrollTop = textarea?.scrollTop ?? 0;
    const scrollLeft = textarea?.scrollLeft ?? 0;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
    const insertion = `${prefix}${markdown}${suffix}`;
    const nextValue = `${before}${insertion}${after}`;

    onChange(nextValue);
    const nextCursor = start + insertion.length;
    restoreEditorSelection(nextCursor, nextCursor, scrollTop, scrollLeft);
  }

  function replaceSelection(
    markdown: string,
    selectionStart: number,
    selectionEnd: number,
    selectInserted = false,
    replaceRange?: { start: number; end: number },
  ) {
    const textarea = textareaRef.current;
    const start = replaceRange?.start ?? textarea?.selectionStart ?? value.length;
    const end = replaceRange?.end ?? textarea?.selectionEnd ?? value.length;
    const scrollTop = textarea?.scrollTop ?? 0;
    const scrollLeft = textarea?.scrollLeft ?? 0;
    onChange(`${value.slice(0, start)}${markdown}${value.slice(end)}`);

    const nextStart = start + selectionStart;
    const nextEnd = start + selectionEnd;
    restoreEditorSelection(selectInserted ? nextStart : nextEnd, nextEnd, scrollTop, scrollLeft);
  }

  function applyLineFormat(prefix: string, fallback: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    // Browser line selections can include the trailing newline. Keep that newline
    // outside the replacement so a heading action never formats the next line.
    const selectionEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const lineEndIndex = value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const selected = value.slice(start, selectionEnd);
    const target = selected || value.slice(lineStart, lineEnd) || fallback;
    const matchingPrefix =
      prefix === "- "
        ? /^(?:[-*+]\s+)/
        : prefix === "1. "
          ? /^\d+\.\s+/
          : prefix === "- [ ] "
            ? /^- \[[ xX]\]\s+/
            : new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const lines = target.split("\n");
    const shouldRemove = lines.every((line) => !line || matchingPrefix.test(line));
    let orderedItemNumber = 1;
    const formatted = lines
      .map((line) => {
        if (!line) return line;
        if (shouldRemove) return line.replace(matchingPrefix, "");
        const normalizedLine = line.replace(/^(?:#{1,6}\s+|>\s?|- \[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/, "");
        if (prefix === "1. ") return `${orderedItemNumber++}. ${normalizedLine}`;
        return `${prefix}${normalizedLine}`;
      })
      .join("\n");
    const replaceStart = selected ? start : lineStart;
    const replaceEnd = selected ? selectionEnd : lineEnd;
    replaceSelection(formatted, 0, formatted.length, true, { start: replaceStart, end: replaceEnd });
  }

  function applyInlineCode() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const isWrappedSelection = selected.length > 0 && value[start - 1] === "`" && value[end] === "`";
    const isFormatted =
      (selected.length >= 2 && selected.startsWith("`") && selected.endsWith("`")) || isWrappedSelection;
    const content = selected.startsWith("`") && selected.endsWith("`") ? selected.slice(1, -1) : selected || "代码";
    const markdown = isFormatted ? content : `\`${content}\``;
    const offset = isFormatted ? 0 : 1;
    replaceSelection(markdown, offset, offset + content.length, true, isWrappedSelection ? { start: start - 1, end: end + 1 } : undefined);
  }

  function applyBold() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    // Selecting a whole line in a textarea can include its trailing newline.
    // Keep that newline outside the bold markers so the next line remains
    // structurally separate and a second click can recognize the toggle.
    const selectionEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const selected = value.slice(start, selectionEnd);
    const isWrappedSelection = selected.length > 0 && value.slice(Math.max(0, start - 2), start) === "**" && value.slice(selectionEnd, selectionEnd + 2) === "**";
    const isFormatted = (selected.startsWith("**") && selected.endsWith("**")) || isWrappedSelection;
    const content = selected.startsWith("**") && selected.endsWith("**") ? selected.slice(2, -2) : selected || "加粗文字";
    const markdown = isFormatted ? content : `**${content}**`;
    const offset = isFormatted ? 0 : 2;
    replaceSelection(
      markdown,
      offset,
      offset + content.length,
      true,
      isWrappedSelection ? { start: start - 2, end: selectionEnd + 2 } : { start, end: selectionEnd },
    );
  }

  function applyCodeBlock() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const isWrappedSelection = selected.length > 0 && value.slice(Math.max(0, start - 4), start) === "```\n" && value.slice(end, end + 4) === "\n```";
    const isFormatted = (selected.startsWith("```\n") && selected.endsWith("\n```")) || isWrappedSelection;
    const content = selected.startsWith("```\n") && selected.endsWith("\n```") ? selected.slice(4, -4) : selected || "代码内容";
    const markdown = isFormatted ? content : `\`\`\`\n${content}\n\`\`\``;
    const offset = isFormatted ? 0 : 4;
    replaceSelection(markdown, offset, offset + content.length, true, isWrappedSelection ? { start: start - 4, end: end + 4 } : undefined);
  }

  function insertTable() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    // The table action selects the inserted table. Recognize that selection on
    // the next click so this shortcut behaves as a toggle instead of nesting
    // another table in the first cell.
    const tableLines = selected.trimEnd().split("\n");
    const isTable =
      tableLines.length >= 2 &&
      /^\s*\|.*\|\s*$/.test(tableLines[0]) &&
      /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(tableLines[1]) &&
      tableLines.slice(2).every((line) => !line.trim() || /^\s*\|.*\|\s*$/.test(line));

    if (isTable) {
      const plainLines = tableLines
        .slice(2)
        .filter((line) => line.trim())
        .map((line) => line.trim().replace(/^\|\s*/, "").split("|")[0].trim());
      const markdown = plainLines.join("\n") || "内容";
      replaceSelection(markdown, 0, markdown.length, true);
      return;
    }

    const selectedLines = selected.split("\n").filter((line) => line.trim());
    const rows = selectedLines.length
      ? selectedLines.map((line) => `| ${line.trim()} |  |`).join("\n")
      : "| 内容 | 内容 |";
    const markdown = `| 标题 1 | 标题 2 |\n| --- | --- |\n${rows}`;
    replaceSelection(markdown, 0, markdown.length, true);
  }

  function applyHtmlComment() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const isWrappedSelection = selected.length > 0 && value.slice(Math.max(0, start - 5), start) === "<!-- " && value.slice(end, end + 4) === " -->";
    const isFormatted = (selected.startsWith("<!-- ") && selected.endsWith(" -->")) || isWrappedSelection;
    const content = selected.startsWith("<!-- ") && selected.endsWith(" -->") ? selected.slice(5, -4) : selected || "备注";
    const markdown = isFormatted ? content : `<!-- ${content} -->`;
    const offset = isFormatted ? 0 : 5;
    replaceSelection(markdown, offset, offset + content.length, true, isWrappedSelection ? { start: start - 5, end: end + 4 } : undefined);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (!files.length) return;
    event.preventDefault();
    void uploadAndInsert(files);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    void uploadAndInsert(files);
  }

  function openImagePicker() {
    if (disabled || isUploadingImage) return;
    fileInputRef.current?.click();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.altKey || event.shiftKey || (!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "i") return;
    if (disabled || isUploadingImage) return;

    event.preventDefault();
    openImagePicker();
  }

  return (
    <div className="space-y-2">
      <div className="markdown-toolbar rounded-lg p-2">
        <div className="space-y-2">
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Markdown</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "H1", title: "一级标题", onClick: () => applyLineFormat("# ", "一级标题") },
              { label: "H2", title: "二级标题", onClick: () => applyLineFormat("## ", "二级标题") },
              { label: "H3", title: "三级标题", onClick: () => applyLineFormat("### ", "三级标题") },
            ].map((tool) => (
              <button
                key={tool.label}
                aria-label={tool.title}
                className="markdown-tool-button markdown-tool-button-heading"
                disabled={disabled}
                title={tool.title}
                type="button"
                onClick={tool.onClick}
              >
                {tool.label}
              </button>
            ))}
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <button className="markdown-tool-button" disabled={disabled} title="加粗" type="button" onClick={applyBold}>
              <Bold size={15} /> <span>加粗</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="行内代码" type="button" onClick={applyInlineCode}>
              <Code2 size={15} /> <span>行内代码</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="代码块" type="button" onClick={applyCodeBlock}>
              <Code2 size={15} /> <span>代码块</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="无序列表" type="button" onClick={() => applyLineFormat("- ", "列表项")}>
              <List size={15} /> <span>列表</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="有序列表" type="button" onClick={() => applyLineFormat("1. ", "列表项")}>
              <ListOrdered size={15} /> <span>编号</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="任务清单" type="button" onClick={() => applyLineFormat("- [ ] ", "待办项")}>
              <ListChecks size={15} /> <span>清单</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="引用" type="button" onClick={() => applyLineFormat("> ", "引用内容")}>
              <Quote size={15} /> <span>引用</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="插入表格" type="button" onClick={insertTable}>
              <Table2 size={15} /> <span>表格</span>
            </button>
            <button className="markdown-tool-button" disabled={disabled} title="HTML 注释" type="button" onClick={applyHtmlComment}>
              <span className="font-mono text-[11px]">&lt;!--</span><span>注释</span>
            </button>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <button
              className="markdown-tool-button ml-auto"
              disabled={disabled || isUploadingImage}
              title="插入图片（⌘/Ctrl + I）"
              type="button"
              onClick={openImagePicker}
            >
              {isUploadingImage ? <Loader2 className="animate-spin" size={15} /> : <ImagePlus size={15} />}
              <span>{isUploadingImage ? "上传中" : "图片"}</span>
            </button>
          </div>
        </div>
        {imageError ? (
          <span className="mt-2 block text-sm text-red-200">{imageError}</span>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        multiple
        type="file"
        onChange={handleFileChange}
      />
      <textarea
        ref={textareaRef}
        className={className}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
});

function isMarkdownViewToggleShortcut(event: KeyboardEvent) {
  if (event.code !== "Backslash" || event.altKey || event.shiftKey || event.isComposing) return false;
  const isMac = /Macintosh|Mac OS X/.test(navigator.userAgent);
  return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

function getMarkdownViewToggleShortcutLabel() {
  return /Macintosh|Mac OS X/.test(navigator.userAgent) ? "⌘ + \\" : "Ctrl + \\";
}

function EditorField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block min-w-0">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function KnowledgeForm({
  embedded = false,
  isMobileCollapsed = false,
  draft,
  mode,
  selectedId,
  isSaving,
  isDeleting,
  isConvertingToTodo,
  isDetailLoading,
  saveError,
  trustScore,
  hasSensitiveSignal,
  isTodoEntry,
  todoStatus,
  canSelectPrevious,
  canSelectNext,
  onDraftChange,
  onDelete,
  onConvertToTodo,
  onTodoEntryChange,
  onTodoStatusChange,
  onNewEntry,
  onSelectAdjacent,
  onToggleMobileCollapsed,
  onSubmit,
}: {
  embedded?: boolean;
  isMobileCollapsed?: boolean;
  draft: KnowledgeDraft;
  mode: "create" | "edit";
  selectedId: number | null;
  isSaving: boolean;
  isDeleting: boolean;
  isConvertingToTodo: boolean;
  isDetailLoading: boolean;
  saveError: string | null;
  trustScore: number;
  hasSensitiveSignal: boolean;
  isTodoEntry: boolean;
  todoStatus: TodoStatus;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  onDraftChange: (draft: KnowledgeDraft) => void;
  onDelete: () => void;
  onConvertToTodo: () => void;
  onTodoEntryChange: (isTodoEntry: boolean) => void;
  onTodoStatusChange: (status: TodoStatus) => void;
  onNewEntry: () => void;
  onSelectAdjacent: (direction: "previous" | "next") => void;
  onToggleMobileCollapsed?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [answerView, setAnswerView] = useState<"edit" | "preview">("edit");
  const [answerPreviewAnchor, setAnswerPreviewAnchor] = useState("");
  const answerEditorRef = useRef<MarkdownImageTextareaHandle | null>(null);
  const answerViewportRef = useRef<MarkdownEditorViewport | null>(null);
  const markdownViewShortcutLabel = getMarkdownViewToggleShortcutLabel();
  const canSubmit = draft.question.trim().length > 0 && draft.answer.trim().length > 0 && !isSaving;
  const isEditing = mode === "edit";
  const formTitle = isEditing ? "编辑可信知识" : isTodoEntry ? "录入待办事项" : "录入可信知识";
  const titleFieldLabel = isTodoEntry ? "待办事项标题" : "问题 / 标题";
  const contentFieldLabel = isTodoEntry ? "待办事项内容" : "可信答案";
  const titlePlaceholder = isTodoEntry
    ? "例如：整理 Linux 防火墙开放端口操作步骤"
    : "例如：Linux 主机防火墙如何同时开启 80 和 443？";
  const contentPlaceholder = isTodoEntry
    ? "补充待办事项背景、验收标准或下一步动作。"
    : "写入可验证、可复用、上下文完整的答案...";

  useEffect(() => {
    if (!isEditing) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !isMarkdownViewToggleShortcut(event)) return;
      event.preventDefault();
      setAnswerDisplay(answerView === "edit" ? "preview" : "edit");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answerView, isEditing]);

  useEffect(() => {
    if (answerView !== "edit" || !answerViewportRef.current) return;
    answerEditorRef.current?.restoreViewport(answerViewportRef.current);
  }, [answerView]);

  function setAnswerDisplay(nextView: "edit" | "preview") {
    if (nextView === answerView) return;
    if (answerView === "edit") {
      const viewport = answerEditorRef.current?.getViewport();
      if (viewport) {
        answerViewportRef.current = viewport;
        setAnswerPreviewAnchor(getMarkdownPreviewAnchor(draft.answer, viewport.selectionStart));
      }
    }
    setAnswerView(nextView);
  }

  return (
    <section className={`min-w-0 ${embedded ? "" : "rounded-lg border border-white/10 bg-ink-900/74 p-4 shadow-soft-glow backdrop-blur-xl"}`}>
      <div className={`${isMobileCollapsed ? "mb-0 xl:mb-4" : "mb-4"} flex flex-col gap-4 md:flex-row md:items-start md:justify-between`}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              {isEditing ? <Pencil size={17} /> : <FilePlus2 size={17} />}
              {isEditing ? `Editing #${selectedId}` : "New Entry"}
            </div>
            <h2 className="text-xl font-semibold text-slate-50">
              {formTitle}
            </h2>
          </div>
          {onToggleMobileCollapsed ? (
            <button
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 focus:outline-none focus:ring-2 focus:ring-mint-300/30 xl:hidden"
              type="button"
              aria-expanded={!isMobileCollapsed}
              aria-label={`${isMobileCollapsed ? "展开" : "收起"}${formTitle}区域`}
              onClick={onToggleMobileCollapsed}
            >
              {isMobileCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              {isMobileCollapsed ? "展开录入" : "收起录入"}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {isEditing ? (
            <>
              <button
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600 sm:flex-none"
                disabled={!canSelectPrevious}
                title="上一条可信知识"
                type="button"
                onClick={() => onSelectAdjacent("previous")}
              >
                <ChevronLeft size={16} />
                上一条
              </button>
              <button
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600 sm:flex-none"
                disabled={!canSelectNext}
                title="下一条可信知识"
                type="button"
                onClick={() => onSelectAdjacent("next")}
              >
                下一条
                <ChevronRight size={16} />
              </button>
            </>
          ) : null}
          {isEditing ? (
            <button
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition hover:border-mint-300/30 hover:text-mint-300"
              title="新建"
              type="button"
              onClick={onNewEntry}
            >
              <X size={17} />
            </button>
          ) : null}
          <div className={`${isMobileCollapsed ? "hidden xl:block" : ""} rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-right`}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trust</div>
            <div className="text-lg font-semibold text-mint-300">{trustScore}%</div>
          </div>
        </div>
      </div>

      <form className={`space-y-4 ${isMobileCollapsed ? "hidden xl:block" : ""}`} onSubmit={onSubmit}>
        {!isEditing ? (
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.028] px-3 py-3">
            <input
              checked={isTodoEntry}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/[0.035] text-mint-300 accent-[#7dd3c7]"
              type="checkbox"
              onChange={(event) => onTodoEntryChange(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-200">这是待办事项</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                勾选后本次新增会写入待办事项表，不进入可信知识库。
              </span>
            </span>
          </label>
        ) : null}

        <Field label={titleFieldLabel} icon={<Sparkles size={16} />}>
          <input
            value={draft.question}
            onChange={(event) => onDraftChange({ ...draft, question: event.target.value })}
            className="control"
            placeholder={titlePlaceholder}
            maxLength={4000}
          />
        </Field>

        {isEditing ? (
          <div className="block min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-slate-500"><Archive size={16} /></span>
                {contentFieldLabel}
              </div>
              <div className="flex rounded-lg border border-white/10 bg-white/[0.025] p-1 text-xs" role="group" aria-label="可信答案显示模式">
                <button
                  className={`rounded-md px-3 py-1.5 transition ${
                    answerView === "edit" ? "bg-mint-300/15 text-mint-200" : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-keyshortcuts={/Macintosh|Mac OS X/.test(navigator.userAgent) ? "Meta+Backslash" : "Control+Backslash"}
                  title={`切换到编辑（${markdownViewShortcutLabel}）`}
                  type="button"
                  onClick={() => setAnswerDisplay("edit")}
                >
                  编辑
                </button>
                <button
                  className={`rounded-md px-3 py-1.5 transition ${
                    answerView === "preview" ? "bg-mint-300/15 text-mint-200" : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-keyshortcuts={/Macintosh|Mac OS X/.test(navigator.userAgent) ? "Meta+Backslash" : "Control+Backslash"}
                  title={`切换到 Markdown 预览（${markdownViewShortcutLabel}）`}
                  type="button"
                  onClick={() => setAnswerDisplay("preview")}
                >
                  Markdown 预览
                </button>
              </div>
            </div>
            {answerView === "edit" ? (
              <MarkdownImageTextarea
                ref={answerEditorRef}
                value={draft.answer}
                className="control min-h-[330px] resize-none leading-7"
                onChange={(answer) => onDraftChange({ ...draft, answer })}
                placeholder={contentPlaceholder}
              />
            ) : draft.answer.trim() ? (
              <MarkdownPreview markdown={draft.answer} scrollAnchor={answerPreviewAnchor} />
            ) : (
              <div className="grid min-h-[330px] place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-4 text-center text-sm text-slate-500">
                暂无可信答案可预览。
              </div>
            )}
          </div>
        ) : (
          <EditorField label={contentFieldLabel} icon={<Archive size={16} />}>
            <MarkdownImageTextarea
              value={draft.answer}
              className="control min-h-[330px] resize-none leading-7"
              onChange={(answer) => onDraftChange({ ...draft, answer })}
              placeholder={contentPlaceholder}
            />
          </EditorField>
        )}

        <div className={`grid gap-4 ${isTodoEntry ? "md:grid-cols-2" : "md:grid-cols-[1fr_1fr_220px]"}`}>
          <Field label="来源" icon={<Database size={16} />}>
            <input
              value={draft.source}
              onChange={(event) => onDraftChange({ ...draft, source: event.target.value })}
              className="control"
              placeholder="oracle / manual / internal"
              maxLength={200}
            />
          </Field>
          <Field label="标签" icon={<Tags size={16} />}>
            <input
              value={draft.topic_tag}
              onChange={(event) => onDraftChange({ ...draft, topic_tag: event.target.value })}
              className="control"
              placeholder="Linux,APEX"
              maxLength={100}
            />
          </Field>
          {isTodoEntry ? (
            <Field label="待办状态" icon={<CheckCircle2 size={16} />}>
              <TodoStatusSegmentedControl value={todoStatus} onChange={onTodoStatusChange} />
            </Field>
          ) : (
            <Field label="状态" icon={<CheckCircle2 size={16} />}>
              <StatusSegmentedControl
                value={draft.blog_status}
                onChange={(blog_status) => onDraftChange({ ...draft, blog_status })}
              />
            </Field>
          )}
        </div>

        {hasSensitiveSignal ? (
          <div className="flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
            <span>检测到疑似敏感字段，正式接入后将要求二次确认并默认遮罩展示。</span>
          </div>
        ) : null}

        {isDetailLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-mint-300/20 bg-mint-300/8 px-3 py-3 text-sm text-mint-300">
            <Loader2 className="animate-spin" size={17} />
            正在读取完整详情...
          </div>
        ) : null}

        {saveError ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
            <span>{saveError}</span>
          </div>
        ) : null}

        <div className={`grid gap-3 ${isEditing ? "sm:grid-cols-[1fr_auto_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
          <button
            disabled={!canSubmit || isDeleting || isConvertingToTodo}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            type="submit"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isEditing ? (
              <Pencil size={18} />
            ) : (
              <Plus size={18} />
            )}
            {isSaving
              ? "Validating · Writing to Oracle"
              : isEditing
                ? "保存修改"
                : isTodoEntry
                  ? "提交到待办事项"
                  : "提交到知识库"}
          </button>

          {isEditing ? (
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-4 font-medium text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isDeleting || isSaving || isConvertingToTodo}
              type="button"
              onClick={onConvertToTodo}
            >
              {isConvertingToTodo ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />}
              {isConvertingToTodo ? "转换中" : "转为待办"}
            </button>
          ) : null}

          {isEditing ? (
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-400/10 px-4 font-medium text-red-200 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isDeleting || isSaving || isConvertingToTodo}
              type="button"
              onClick={onDelete}
            >
              {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              {isDeleting ? "删除中" : "删除"}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function StatusSegmentedControl({
  value,
  onChange,
}: {
  value: KnowledgeStatus;
  onChange: (status: KnowledgeStatus) => void;
}) {
  const statuses: KnowledgeStatus[] = ["未发布", "已发布", "跳过"];

  return (
    <div className="grid h-[46px] grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
      {statuses.map((status) => {
        const active = status === value;
        return (
          <button
            key={status}
            className={`min-w-0 rounded-md border px-2 text-sm font-medium transition ${
              active
                ? statusStyles[status]
                : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-200"
            }`}
            type="button"
            onClick={() => onChange(status)}
          >
            {status}
          </button>
        );
      })}
    </div>
  );
}

function TodoStatusSegmentedControl({
  value,
  onChange,
}: {
  value: TodoStatus;
  onChange: (status: TodoStatus) => void;
}) {
  return (
    <div className="grid h-[46px] grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
      {todoStatuses.map((status) => {
        const active = status === value;
        return (
          <button
            key={status}
            className={`min-w-0 rounded-md border px-2 text-sm font-medium transition ${
              active
                ? todoStatusStyles[status]
                : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-200"
            }`}
            type="button"
            onClick={() => onChange(status)}
          >
            {status}
          </button>
        );
      })}
    </div>
  );
}

function KnowledgeList({
  authUser,
  items,
  totalItems,
  page,
  pageSize,
  isLoading,
  loadError,
  selectedId,
  lastCreatedId,
  username,
  status,
  onPageChange,
  onUsernameChange,
  onStatusChange,
  onSelect,
}: {
  authUser: AuthUser | null;
  items: KnowledgeItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  loadError: string | null;
  selectedId: number | null;
  lastCreatedId: number | null;
  username: string;
  status: KnowledgeStatus | "all";
  onPageChange: (page: number) => void;
  onUsernameChange: (username: string) => void;
  onStatusChange: (status: KnowledgeStatus | "all") => void;
  onSelect: (item: KnowledgeItem) => void;
}) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  const statusOptions: Array<{ label: string; value: KnowledgeStatus | "all" }> = [
    { label: "全部状态", value: "all" },
    { label: "未发布", value: "未发布" },
    { label: "已发布", value: "已发布" },
    { label: "跳过", value: "跳过" },
  ];
  const activeFilterCount = [username, status === "all" ? "" : status].filter(Boolean).length;

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/68 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <BookOpenCheck size={17} />
            Library
          </div>
          <h2 className="text-xl font-semibold text-slate-50">已录入知识</h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
          {totalItems} 条
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Filter className="text-mint-300" size={16} />
            查询条件
            {activeFilterCount > 0 ? (
              <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-1.5 py-0.5 text-[11px] font-medium text-mint-200">
                已筛选 {activeFilterCount} 项
              </span>
            ) : null}
          </div>
          <button
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
            type="button"
            aria-expanded={isFiltersExpanded}
            onClick={() => setIsFiltersExpanded((expanded) => !expanded)}
          >
            {isFiltersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {isFiltersExpanded ? "收起" : "展开"}
          </button>
        </div>
        {isFiltersExpanded ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                disabled={hasSingleVisibleUser}
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
              >
                <option value="">{allUsersLabel}</option>
                {visibleUsers.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="状态" icon={<CheckCircle2 size={16} />}>
              <select className="control" value={status} onChange={(event) => onStatusChange(event.target.value as KnowledgeStatus | "all")}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingStack />
      ) : loadError ? (
        <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
            <TriangleAlert size={16} />
            后端连接待就绪
          </div>
          <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center text-sm text-slate-500">
          暂无匹配知识。
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`cursor-pointer rounded-lg border bg-white/[0.028] p-4 transition ${
                  selectedId === item.id
                    ? "border-mint-300/45 bg-mint-300/[0.055]"
                    : lastCreatedId === item.id
                    ? "border-mint-300/35 shadow-[0_0_0_1px_rgba(125,211,199,0.08)]"
                    : "border-white/10 hover:border-white/18"
                }`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-semibold text-slate-50">
                      {item.question}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>{item.source || "unknown source"}</span>
                      <span>{formatDate(item.created_date)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyles[item.blog_status]}`}>
                    {item.blog_status}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-400">{maskSensitive(item.answer)}</p>
                {item.topic_tag ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.topic_tag.split(",").map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {rangeStart}-{rangeEnd} / {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={page <= 1}
                title="上一页"
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-16 text-center text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={page >= totalPages}
                title="下一页"
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function KnowledgeFactory({
  authUser,
  items,
  totalItems,
  page,
  pageSize,
  isLoading,
  isGenerating,
  loadError,
  selectedId,
  canSelectPrevious,
  canSelectNext,
  task,
  selectedSkillIds,
  hasCopied,
  isAutoSaving,
  isCopySaving,
  isMerging,
  modelName,
  modelOptions,
  copyError,
  codexStatus,
  searchQuery,
  username,
  onClearSearch,
  onCopyTask,
  onGenerateTask,
  onCancelTask,
  onMergeKnowledge,
  onModelNameChange,
  onPageChange,
  onUsernameChange,
  onSelect,
  onSelectAdjacent,
  onSelectedSkillIdsChange,
}: {
  authUser: AuthUser | null;
  items: KnowledgeItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isGenerating: boolean;
  loadError: string | null;
  selectedId: number | null;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  task: string;
  selectedSkillIds: string[];
  hasCopied: boolean;
  isAutoSaving: boolean;
  isCopySaving: boolean;
  isMerging: boolean;
  modelName: string;
  modelOptions: { value: string; label: string }[];
  copyError: string | null;
  codexStatus: string;
  searchQuery: string;
  username: string;
  onClearSearch: () => void;
  onCopyTask: (view: MarkdownContentView) => void;
  onGenerateTask: (item: KnowledgeItem) => void;
  onCancelTask: () => void;
  onMergeKnowledge: (knowledgeIds: number[], mergeDraft: KnowledgeDraft) => Promise<KnowledgeItem>;
  onModelNameChange: (modelName: string) => void;
  onPageChange: (page: number) => void;
  onUsernameChange: (username: string) => void;
  onSelect: (item: KnowledgeItem) => void;
  onSelectAdjacent: (direction: "previous" | "next") => void;
  onSelectedSkillIdsChange: (skillIds: string[]) => void;
}) {
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const [selectedMergeItems, setSelectedMergeItems] = useState<KnowledgeItem[]>([]);
  const [mergeDraft, setMergeDraft] = useState<KnowledgeDraft | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<MarkdownContentView>("rendered");
  const [isKnowledgeListCollapsed, setIsKnowledgeListCollapsed] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const selectedMergeIds = selectedMergeItems.map((item) => item.id);
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedMergeIds.includes(item.id));
  const trimmedSearchQuery = searchQuery.trim();
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  useEffect(() => {
    setSelectedMergeItems((current) => current.map((selected) => items.find((item) => item.id === selected.id) ?? selected));
  }, [items]);

  function toggleMergeSelection(item: KnowledgeItem) {
    setSelectedMergeItems((current) =>
      current.some((selected) => selected.id === item.id)
        ? current.filter((selected) => selected.id !== item.id)
        : [...current, item],
    );
  }

  function handleToggleVisibleSelection() {
    setSelectedMergeItems((current) => {
      if (allVisibleSelected) {
        return current.filter((selected) => !items.some((item) => item.id === selected.id));
      }

      const currentIds = new Set(current.map((item) => item.id));
      return [...current, ...items.filter((item) => !currentIds.has(item.id))];
    });
  }

  function handleOpenMergeDialog() {
    if (selectedMergeItems.length < 2) return;
    setMergeDraft(buildMergedKnowledgeDraft(selectedMergeItems));
    setMergeError(null);
  }

  async function handleConfirmMerge() {
    if (!mergeDraft || selectedMergeItems.length < 2) return;

    setMergeError(null);
    try {
      await onMergeKnowledge(
        selectedMergeItems.map((item) => item.id),
        mergeDraft,
      );
      setSelectedMergeItems([]);
      setMergeDraft(null);
    } catch (error) {
      setMergeError(error instanceof Error ? error.message : "合并失败，请稍后重试。");
    }
  }

  return (
    <div className={`grid flex-1 gap-4 px-4 pb-4 pt-2 xl:gap-x-2 ${isKnowledgeListCollapsed ? "xl:grid-cols-[28px_minmax(440px,1fr)_minmax(360px,0.82fr)]" : "xl:grid-cols-[360px_minmax(440px,1fr)_minmax(360px,0.82fr)]"}`}>
      <section className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isKnowledgeListCollapsed ? "p-4 xl:p-0" : "p-4"}`}>
        <div className={isKnowledgeListCollapsed ? "xl:hidden" : "xl:pr-7"}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <FlaskConical size={17} />
              Unpublished Queue
            </div>
            <h2 className="text-xl font-semibold text-slate-50">待加工知识</h2>
          </div>
          <div className="rounded-lg border border-slate-500/30 bg-slate-400/10 px-3 py-2 text-sm text-slate-200">
            {totalItems} 条
          </div>
        </div>

        <div className="mb-4">
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={hasSingleVisibleUser}
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
            >
              <option value="">{allUsersLabel}</option>
              {visibleUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isLoading ? (
          <LoadingStack />
        ) : loadError ? (
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
              <TriangleAlert size={16} />
              后端连接待就绪
            </div>
            <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center text-sm leading-6 text-slate-500">
            {trimmedSearchQuery ? (
              <div>
                <div className="mb-1 font-medium text-slate-300">没有匹配的未发布知识</div>
                <p>当前搜索：{trimmedSearchQuery}</p>
                <button
                  className="mt-4 h-9 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-sm font-medium text-mint-200 transition hover:bg-mint-300/16"
                  type="button"
                  onClick={onClearSearch}
                >
                  清除搜索
                </button>
              </div>
            ) : (
              "暂无未发布知识。可以回到信息录入新增，或把状态切换为未发布。"
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400">
              <div className="flex items-center justify-between gap-3">
                <span>已选择 {selectedMergeItems.length} 条</span>
                <button
                  className="text-xs text-slate-300 transition hover:text-mint-300"
                  type="button"
                  onClick={handleToggleVisibleSelection}
                >
                  {allVisibleSelected ? "清空本页" : "全选本页"}
                </button>
              </div>
              <button
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-sm font-medium text-mint-200 transition hover:bg-mint-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
                disabled={selectedMergeItems.length < 2}
                type="button"
                onClick={handleOpenMergeDialog}
              >
                <Layers3 size={16} />
                合并所选
              </button>
            </div>

            {items.map((item) => (
              <article
                key={item.id}
                className={`block w-full rounded-lg border bg-white/[0.028] p-4 text-left transition ${
                  selectedId === item.id
                    ? "border-mint-300/45 bg-mint-300/[0.055]"
                    : "border-white/10 hover:border-white/18"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    checked={selectedMergeIds.includes(item.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-mint-300"
                    title="选择用于合并"
                    type="checkbox"
                    onChange={() => toggleMergeSelection(item)}
                  />
                  <button
                    className="min-w-0 flex-1 text-left disabled:cursor-wait"
                    disabled={isGenerating || isAutoSaving}
                    type="button"
                    onClick={() => onSelect(item)}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-6 text-slate-50">
                        {item.question}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyles[item.blog_status]}`}
                      >
                        {item.blog_status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>{item.source || "unknown source"}</span>
                      <span>{formatDate(item.created_date)}</span>
                    </div>
                  </button>
                </div>
              </article>
            ))}

            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400">
              <span>
                {rangeStart}-{rangeEnd} / {totalItems}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:text-slate-600"
                  disabled={page <= 1}
                  title="上一页"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-16 text-center text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:text-slate-600"
                  disabled={page >= totalPages}
                  title="下一页"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        <WorkspaceSidebarCollapseToggle isCollapsed={isKnowledgeListCollapsed} label="待加工知识列表" onToggle={() => setIsKnowledgeListCollapsed((collapsed) => !collapsed)} />
      </section>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/68 p-4 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <FileText size={17} />
                Source Context
              </div>
              <h2 className="text-xl font-semibold text-slate-50">知识原文</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={!canSelectPrevious}
                title="上一条待加工知识"
                type="button"
                onClick={() => onSelectAdjacent("previous")}
              >
                <ChevronLeft size={16} />
                上一条
              </button>
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={!canSelectNext}
                title="下一条待加工知识"
                type="button"
                onClick={() => onSelectAdjacent("next")}
              >
                下一条
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <Field label="执行模型" icon={<Settings2 size={16} />}>
              <select
                className="control h-10 sm:w-52"
                disabled={isGenerating}
                value={modelName}
                onChange={(event) => onModelNameChange(event.target.value)}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {modelName === FACTORY_CUSTOM_MODEL ? (
              <p className="max-w-sm text-xs leading-5 text-slate-500">
                使用“AI 问数”中已启用的供应商、Base URL、模型名和后端 API Key 配置。
              </p>
            ) : null}
            {selectedItem ? (
              isGenerating ? (
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-amberline/30 bg-amberline/10 px-3 text-sm font-medium text-amberline transition hover:bg-amberline/20"
                  title="停止当前模型加工任务"
                  type="button"
                  onClick={onCancelTask}
                >
                  <X size={17} />
                  取消加工
                </button>
              ) : (
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                  disabled={selectedSkillIds.length === 0}
                  title={selectedSkillIds.length === 0 ? "请先选择 Skill" : "使用所选 Skill 直接生成结果"}
                  type="button"
                  onClick={() => onGenerateTask(selectedItem)}
                >
                  <Sparkles size={17} />
                  生成结果
                </button>
              )
            ) : null}
          </div>
          <SkillSelector
            agentCode="knowledge-processing"
            disabled={isGenerating}
            mode="single"
            selectedSkillIds={selectedSkillIds}
            onSelectedSkillIdsChange={onSelectedSkillIdsChange}
          />
        </div>

        {copyError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
            <span>{copyError}</span>
          </div>
        ) : null}
        {codexStatus ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-slate-400">
            {isGenerating ? <Loader2 className="animate-spin text-mint-300" size={15} /> : <CheckCircle2 className="text-mint-300" size={15} />}
            <span>{codexStatus}</span>
          </div>
        ) : null}

        {selectedItem ? (
          <article className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>#{selectedItem.id}</span>
                <span>{selectedItem.source || "unknown source"}</span>
                <span>{formatDate(selectedItem.created_date)}</span>
              </div>
              <h3 className="text-lg font-semibold leading-7 text-slate-50">{selectedItem.question}</h3>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                <Archive size={16} />
                可信答案
              </div>
              <MarkdownPreview markdown={maskSensitive(selectedItem.answer)} />
            </div>

            {selectedItem.topic_tag ? (
              <div className="flex flex-wrap gap-2">
                {selectedItem.topic_tag.split(",").map((tag) => (
                  <span
                    key={`${selectedItem.id}-${tag}`}
                    className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ) : (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <Bot className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">选择一条未发布知识</div>
              <p className="text-sm text-slate-500">选择 skill 后会直接生成加工结果。</p>
            </div>
          </div>
        )}
      </section>

      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Bot size={17} />
              Skill 加工
            </div>
            <h2 className="text-lg font-semibold text-slate-50">加工结果</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <div className="flex h-10 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
              <button
                className={`px-3 text-xs transition ${
                  taskView === "rendered" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                }`}
                type="button"
                onClick={() => setTaskView("rendered")}
              >
                美化
              </button>
              <button
                className={`border-l border-white/10 px-3 text-xs transition ${
                  taskView === "raw" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                }`}
                type="button"
                onClick={() => setTaskView("raw")}
              >
                裸文本
              </button>
            </div>
            <button
              className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                hasCopied
                  ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
              }`}
              disabled={!task || isCopySaving || isAutoSaving}
              title={isAutoSaving ? "正在发送到博客工厂" : isCopySaving ? "正在复制" : hasCopied ? "已复制" : "复制加工结果"}
              type="button"
              onClick={() => onCopyTask(taskView)}
            >
              {isCopySaving || isAutoSaving ? (
                <Loader2 className="animate-spin" size={15} />
              ) : hasCopied ? (
                <ClipboardCheck size={15} />
              ) : (
                <Copy size={15} />
              )}
              {hasCopied ? "已复制" : taskView === "rendered" ? "复制美化" : "复制裸文本"}
            </button>
          </div>
        </div>

        {isGenerating ? (
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent animate-scan" />
            <div className="mb-4 h-4 w-2/3 rounded bg-white/10" />
            <div className="mb-3 h-3 w-full rounded bg-white/7" />
            <div className="mb-3 h-3 w-5/6 rounded bg-white/7" />
            <div className="h-3 w-1/2 rounded bg-white/7" />
          </div>
        ) : task ? (
          taskView === "rendered" ? (
            <MarkdownPreview markdown={task} />
          ) : (
            <textarea
              className="control min-h-[420px] resize-none font-mono text-xs leading-6 text-slate-200"
              readOnly
              value={task}
            />
          )
        ) : (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <WandSparkles className="mx-auto mb-3 text-slate-600" size={34} />
              <div className="mb-1 font-medium text-slate-300">等待生成</div>
              <p className="text-sm leading-6 text-slate-500">选择 skill 后点击“生成结果”。</p>
            </div>
          </div>
        )}
      </aside>
      <MergeKnowledgeDialog
        draft={mergeDraft}
        error={mergeError}
        isMerging={isMerging}
        items={selectedMergeItems}
        onCancel={() => {
          if (!isMerging) {
            setMergeDraft(null);
            setMergeError(null);
          }
        }}
        onConfirm={handleConfirmMerge}
        onDraftChange={setMergeDraft}
      />
    </div>
  );
}

function MergeKnowledgeDialog({
  items,
  draft,
  isMerging,
  error,
  onDraftChange,
  onCancel,
  onConfirm,
}: {
  items: KnowledgeItem[];
  draft: KnowledgeDraft | null;
  isMerging: boolean;
  error: string | null;
  onDraftChange: (draft: KnowledgeDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!draft) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isMerging) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, isMerging, onCancel]);

  if (!draft) return null;

  const canSubmit = draft.question.trim().length > 0 && draft.answer.trim().length > 0 && items.length >= 2;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isMerging) {
          onCancel();
        }
      }}
    >
      <section
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Layers3 size={17} />
              Merge Knowledge
            </div>
            <h2 className="text-lg font-semibold text-slate-50">合并待加工知识</h2>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isMerging}
            title="关闭"
            type="button"
            onClick={onCancel}
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-160px)] gap-4 overflow-y-auto p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="mb-3 text-sm font-medium text-slate-200">已选择 {items.length} 条</div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>#{item.id}</span>
                    <span>{item.source || "unknown source"}</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.question}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">合并后问题 / 主题</span>
              <input
                className="control"
                disabled={isMerging}
                value={draft.question}
                onChange={(event) => onDraftChange({ ...draft, question: event.target.value })}
              />
            </label>

            <div className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">合并后可信答案 / 素材</span>
              <MarkdownImageTextarea
                className="control min-h-[300px] resize-none leading-7"
                disabled={isMerging}
                value={draft.answer}
                onChange={(answer) => onDraftChange({ ...draft, answer })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">来源</span>
                <input
                  className="control"
                  disabled={isMerging}
                  value={draft.source}
                  onChange={(event) => onDraftChange({ ...draft, source: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">标签</span>
                <input
                  className="control"
                  disabled={isMerging}
                  value={draft.topic_tag}
                  onChange={(event) => onDraftChange({ ...draft, topic_tag: event.target.value })}
                />
              </label>
            </div>

            <div className="rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm leading-6 text-amber-100">
              合并会生成一条新的未发布知识，并移除这些已被合并的原始未发布知识。
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isMerging}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/12 px-4 font-medium text-mint-200 transition hover:bg-mint-300/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!canSubmit || isMerging}
            type="button"
            onClick={onConfirm}
          >
            {isMerging ? <Loader2 className="animate-spin" size={17} /> : <Layers3 size={17} />}
            {isMerging ? "合并中" : "确认合并"}
          </button>
        </div>
      </section>
    </div>
  );
}

type HistoryFilters = {
  type: string;
  username: string;
  week: string;
  day: string;
  learnLevel: string;
  vectorStatus: "all" | "0" | "1";
  dateFrom: string;
  dateTo: string;
  sortBy: "history_date" | "id" | "type" | "username" | "learn_level";
  sortDir: "asc" | "desc";
};

type BlogFactoryFilters = {
  username: string;
  semanticQuery: string;
  factoryStatus: BlogFactoryStatus | "all";
  topic: string;
  knowledgeId: string;
  vectorStatus: "all" | "0" | "1";
  sortBy: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir: "asc" | "desc";
};

type BlogPublishDialogMode = "publish" | "draft";

type CurrentRecordFilters = {
  username: string;
  type: string;
  week: string;
  day: string;
  learnLevel: string;
  sortBy: "id" | "type" | "week" | "day" | "username" | "learn_level";
  sortDir: "asc" | "desc";
};

type EnglishMaterialFilters = {
  username: string;
  semanticQuery: string;
  category: string;
  flag: "" | "0" | "1";
  vectorStatus: "all" | "0" | "1";
  sortBy: "id" | "sequence_no" | "category" | "base_expression" | "title" | "flag";
  sortDir: "asc" | "desc";
};

function BlogFactoryRecords({
  authUser,
  items,
  total,
  page,
  selectedItem,
  canSelectPrevious,
  canSelectNext,
  isMobileDetailOpen,
  isLoading,
  isDetailLoading,
  isStatusSaving,
  isItemSaving,
  isAssistSaving,
  isSendingToProcessing,
  isArticleSaving,
  isDeleting,
  loadError,
  statusError,
  editError,
  articleError,
  taskCopyError,
  sendBackNotice,
  publishConfigs,
  isPublishConfigsLoading,
  publishConfigsError,
  publishError,
  publishSuccess,
  isPublishing,
  editDraft,
  coverPromptTemplate,
  coverPromptConfig,
  maskRules,
  selectedMaskRuleId,
  maskError,
  maskNotice,
  hasCopiedTask,
  isRefreshing,
  isVectorRefreshing,
  modelOptions,
  filters,
  onFilterChange,
  onRefresh,
  onRefreshVectors,
  onClearFilters,
  onPageChange,
  onEditDraftChange,
  onCoverPromptTemplateChange,
  onCoverPromptConfigChange,
  onMaskRuleChange,
  onOpenMaskDialog,
  onApplyMaskRule,
  onCopyTask,
  onOpenPublishConfig,
  onOpenPublishDialog,
  onSendToProcessing,
  onDelete,
  onCloseMobileDetail,
  onSaveAssist,
  onSaveItem,
  onSelect,
  onSelectAdjacent,
  onStatusChange,
}: {
  authUser: AuthUser | null;
  items: BlogFactoryItem[];
  total: number;
  page: number;
  selectedItem: BlogFactoryItem | null;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  isMobileDetailOpen: boolean;
  isLoading: boolean;
  isDetailLoading: boolean;
  isStatusSaving: boolean;
  isItemSaving: boolean;
  isAssistSaving: boolean;
  isSendingToProcessing: boolean;
  isArticleSaving: boolean;
  isDeleting: boolean;
  loadError: string | null;
  statusError: string | null;
  editError: string | null;
  articleError: string | null;
  taskCopyError: string | null;
  sendBackNotice: string | null;
  publishConfigs: BlogPublishConfig[];
  isPublishConfigsLoading: boolean;
  publishConfigsError: string | null;
  publishError: string | null;
  publishSuccess: BlogFactoryPublishResult | null;
  isPublishing: boolean;
  editDraft: BlogFactoryEditDraft;
  coverPromptTemplate: string;
  coverPromptConfig: BlogFactoryCoverPromptConfig;
  maskRules: BlogFactoryMaskRule[];
  selectedMaskRuleId: string | null;
  maskError: string | null;
  maskNotice: string | null;
  hasCopiedTask: boolean;
  isRefreshing: boolean;
  isVectorRefreshing: boolean;
  modelOptions: { value: string; label: string }[];
  filters: BlogFactoryFilters;
  onFilterChange: (filters: Partial<BlogFactoryFilters>) => void;
  onRefresh: () => void;
  onRefreshVectors: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onEditDraftChange: (draft: BlogFactoryEditDraft) => void;
  onCoverPromptTemplateChange: (template: string) => void;
  onCoverPromptConfigChange: (config: BlogFactoryCoverPromptConfig) => void;
  onMaskRuleChange: (ruleId: string | null) => void;
  onOpenMaskDialog: () => void;
  onApplyMaskRule: (ruleId?: string | null) => void;
  onCopyTask: (view: BlogFactoryTaskCopyMode) => void;
  onOpenPublishConfig: () => void;
  onOpenPublishDialog: (mode: BlogPublishDialogMode) => void;
  onSendToProcessing: () => void;
  onDelete: () => void;
  onCloseMobileDetail: () => void;
  onSaveAssist: (target: "summary" | "cover" | "prompt", value?: string) => Promise<void>;
  onSaveItem: () => Promise<boolean>;
  onSelect: (item: BlogFactoryItem) => void;
  onSelectAdjacent: (direction: "previous" | "next") => void;
  onStatusChange: (status: BlogFactoryStatus) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / BLOG_FACTORY_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * BLOG_FACTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * BLOG_FACTORY_PAGE_SIZE, total);
  const [taskCopyView, setTaskCopyView] = useState<BlogFactoryTaskCopyMode>("enhanced");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [semanticQueryDraft, setSemanticQueryDraft] = useState(filters.semanticQuery);
  const [isTaskListCollapsed, setIsTaskListCollapsed] = useState(false);
  const [isTaskContentEditing, setIsTaskContentEditing] = useState(false);
  const [isMaskToolsExpanded, setIsMaskToolsExpanded] = useState(false);
  const [assistView, setAssistView] = useState<"summary" | "coverPrompt">("summary");
  const [assistCopiedTarget, setAssistCopiedTarget] = useState<"summary" | "coverPrompt" | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [assistSaveFeedback, setAssistSaveFeedback] = useState<Partial<Record<"summary" | "cover" | "prompt", "saving" | "success" | "error">>>({});
  const assistSaveFeedbackTimerRefs = useRef<Partial<Record<"summary" | "cover" | "prompt", number>>>({});
  const [isCoverPromptTemplateEditing, setIsCoverPromptTemplateEditing] = useState(false);
  const [coverPromptTextDraft, setCoverPromptTextDraft] = useState("");
  const [coverPromptCategory, setCoverPromptCategory] = useState("");
  const [coverPromptTemplateDraft, setCoverPromptTemplateDraft] = useState(coverPromptTemplate);
  const coverImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingContentAssistTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contentAssistScrollRequestRef = useRef(0);
  const [pendingContentAssistTarget, setPendingContentAssistTarget] = useState<{
    itemId: number;
    view: "summary" | "coverPrompt";
  } | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const defaultedSummaryItemIdRef = useRef<number | null>(null);
  const summaryCandidateIndexRef = useRef(-1);
  useEffect(() => setSemanticQueryDraft(filters.semanticQuery), [filters.semanticQuery]);
  const summarySaveStatus = assistSaveFeedback.summary;
  const coverSaveStatus = assistSaveFeedback.cover;
  const promptSaveStatus = assistSaveFeedback.prompt;
  const isSummarySavePending = summarySaveStatus === "saving";
  const isCoverSavePending = coverSaveStatus === "saving";
  const isPromptSavePending = promptSaveStatus === "saving";
  const isRecordSaving = isItemSaving || isAssistSaving;
  const activeFilterCount = [
    filters.username,
    filters.semanticQuery,
    filters.factoryStatus === "all" ? "" : filters.factoryStatus,
    filters.topic.trim(),
    filters.knowledgeId,
    filters.vectorStatus === "all" ? "" : filters.vectorStatus,
  ].filter(Boolean).length;
  const publishMarkdown = selectedItem ? resolveBlogFactoryPublishMarkdown(selectedItem, selectedItem.article_markdown, editDraft.taskContent) : "";
  const publishTitle = selectedItem ? extractMarkdownHeading(publishMarkdown) || selectedItem.article_title || "" : "";
  const assistSource = editDraft.taskContent;
  const assistSummaryCandidates = useMemo(() => buildBlogFactoryTaskSummaryCandidates(assistSource), [assistSource]);
  const coverPromptSource = coverPromptTextDraft.trim() || selectedItem?.article_markdown?.trim() || assistSource;
  const coverPromptSummary = editDraft.assistSummary.trim() || buildBlogFactoryTaskSummary(coverPromptSource);
  const coverPromptTitle = publishTitle || editDraft.questionSnapshot || selectedItem?.question_snapshot || "";
  const coverImageMarkdown = editDraft.coverImageMarkdown;
  const resolvedCoverPromptConfig = useMemo(() => normalizeBlogFactoryCoverPromptConfig(coverPromptConfig), [coverPromptConfig]);
  const coverImagePrompt = useMemo(
    () =>
      buildBlogFactoryCoverImagePrompt(
        coverPromptSource,
        coverPromptSummary,
        coverPromptTitle,
        coverPromptTemplate,
        resolvedCoverPromptConfig,
      ),
    [coverPromptSource, coverPromptSummary, coverPromptTemplate, resolvedCoverPromptConfig, coverPromptTitle],
  );
  const canPublish = publishMarkdown.trim().length > 0 && publishConfigs.length > 0 && !isPublishing;
  const selectedMaskRule = maskRules.find((item) => item.id === selectedMaskRuleId) ?? null;
  const canApplyMaskRule =
    selectedItem !== null &&
    editDraft.taskContent.trim().length > 0 &&
    selectedMaskRule !== null &&
    hasEnabledBlogFactoryMaskRule(selectedMaskRule) &&
    !isRecordSaving &&
    !isDeleting;
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  const statusOptions: Array<{ label: string; value: BlogFactoryStatus | "all" }> = [
    { label: "全部状态", value: "all" },
    { label: "待处理", value: "待处理" },
    { label: "已处理", value: "已处理" },
    { label: "已发布", value: "已发布" },
    { label: "跳过", value: "跳过" },
  ];
  const nextStatusOptions: BlogFactoryStatus[] = ["待处理", "已处理", "已发布", "跳过"];
  const canSaveItem =
    selectedItem !== null &&
    editDraft.taskContent.trim().length > 0 &&
    editDraft.questionSnapshot.trim().length > 0 &&
    editDraft.answerSnapshot.trim().length > 0 &&
    !isRecordSaving &&
    !isDeleting;
  const canSendToProcessing =
    selectedItem !== null &&
    selectedItem.factory_status === "待处理" &&
    editDraft.taskContent.trim().length > 0 &&
    editDraft.questionSnapshot.trim().length > 0 &&
    !isSendingToProcessing &&
    !isRecordSaving &&
    !isDeleting;
  useEffect(() => {
    contentAssistScrollRequestRef.current += 1;
    pendingContentAssistTriggerRef.current = null;
    setAssistView("summary");
    setIsTaskContentEditing(false);
    setIsMaskToolsExpanded(false);
    setPendingContentAssistTarget(null);
    setAssistCopiedTarget(null);
    setAssistError(null);
    Object.values(assistSaveFeedbackTimerRefs.current).forEach((timer) => window.clearTimeout(timer));
    assistSaveFeedbackTimerRefs.current = {};
    setAssistSaveFeedback({});
    setIsCoverPromptTemplateEditing(false);
    setCoverPromptTextDraft("");
    setCoverImageError(null);
    defaultedSummaryItemIdRef.current = null;
    summaryCandidateIndexRef.current = -1;
  }, [selectedItem?.id]);

  useEffect(() => {
    if (
      !selectedItem ||
      selectedItem.assist_summary?.trim() ||
      editDraft.assistSummary.trim() ||
      defaultedSummaryItemIdRef.current === selectedItem.id
    ) {
      return;
    }

    const defaultSummary = assistSummaryCandidates[0];
    if (!defaultSummary) return;

    defaultedSummaryItemIdRef.current = selectedItem.id;
    summaryCandidateIndexRef.current = 0;
    onEditDraftChange({ ...editDraft, assistSummary: defaultSummary });
  }, [assistSummaryCandidates, editDraft, onEditDraftChange, selectedItem]);

  function handleCancelTaskContentEditing() {
    if (selectedItem) onEditDraftChange(blogFactoryItemToEditDraft(selectedItem));
    setIsTaskContentEditing(false);
    setIsMaskToolsExpanded(false);
    setAssistError(null);
  }

  async function handleSaveTaskContent() {
    const saved = await onSaveItem();
    if (saved) {
      setIsTaskContentEditing(false);
      setIsMaskToolsExpanded(false);
    }
  }

  useEffect(() => {
    if (!pendingContentAssistTarget) return;

    if (pendingContentAssistTarget.itemId !== selectedItem?.id) {
      setPendingContentAssistTarget(null);
      return;
    }

    if (isDetailLoading) return;

    const requestId = ++contentAssistScrollRequestRef.current;
    scrollContentAssist(pendingContentAssistTriggerRef.current, requestId);
    setPendingContentAssistTarget(null);
  }, [isDetailLoading, pendingContentAssistTarget, selectedItem?.id]);

  function scrollContentAssist(trigger: HTMLButtonElement | null, requestId: number) {
    const scrollTarget = trigger
      ?.closest<HTMLElement>("[data-blog-factory-item-id]")
      ?.querySelector<HTMLElement>("[data-content-assist]");

    if (!scrollTarget) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (requestId !== contentAssistScrollRequestRef.current) return;
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function handleOpenContentAssist(event: React.MouseEvent<HTMLButtonElement>, view: "summary" | "coverPrompt") {
    if (!selectedItem) return;

    const requestId = ++contentAssistScrollRequestRef.current;
    pendingContentAssistTriggerRef.current = event.currentTarget;
    setAssistView(view);
    if (!isDetailLoading) {
      scrollContentAssist(event.currentTarget, requestId);
      return;
    }

    setPendingContentAssistTarget({ itemId: selectedItem.id, view });
  }

  useEffect(() => {
    setCoverPromptTemplateDraft(coverPromptTemplate);
  }, [coverPromptTemplate]);

  async function handleCopyAssistText(value: string, target: "summary" | "coverPrompt") {
    if (!value.trim()) return;

    try {
      await copyText(value);
      setAssistError(null);
      setAssistCopiedTarget(target);
      window.setTimeout(() => setAssistCopiedTarget(null), 1600);
    } catch {
      setAssistCopiedTarget(null);
      setAssistError("复制失败。请选中文本后手动复制。");
    }
  }

  async function handleSaveAssist(target: "summary" | "cover" | "prompt", value?: string) {
    const previousTimer = assistSaveFeedbackTimerRefs.current[target];
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    setAssistSaveFeedback((current) => ({ ...current, [target]: "saving" }));

    try {
      await onSaveAssist(target, value);
      setAssistSaveFeedback((current) => ({ ...current, [target]: "success" }));
    } catch {
      setAssistSaveFeedback((current) => ({ ...current, [target]: "error" }));
    }

    assistSaveFeedbackTimerRefs.current[target] = window.setTimeout(() => {
      setAssistSaveFeedback((current) => {
        const { [target]: _clearedStatus, ...remainingStatuses } = current;
        return remainingStatuses;
      });
      delete assistSaveFeedbackTimerRefs.current[target];
    }, 2600);
  }

  function handleRegenerateSummary() {
    if (assistSummaryCandidates.length === 0) return;

    const currentSummary = editDraft.assistSummary.trim();
    const currentIndex = assistSummaryCandidates.indexOf(currentSummary);
    const startIndex = currentIndex >= 0 ? currentIndex : summaryCandidateIndexRef.current;
    const nextIndex = Array.from({ length: assistSummaryCandidates.length }, (_, offset) => (startIndex + offset + 1) % assistSummaryCandidates.length).find(
      (index) => assistSummaryCandidates[index] !== currentSummary,
    );
    if (nextIndex === undefined) {
      setAssistError("当前文章暂无不同摘要可替换。");
      return;
    }

    summaryCandidateIndexRef.current = nextIndex;
    setAssistError(null);
    onEditDraftChange({ ...editDraft, assistSummary: assistSummaryCandidates[nextIndex] });
  }

  function handleSaveCoverPromptTemplate() {
    const nextTemplate = coverPromptTemplateDraft.trim();
    if (!nextTemplate) {
      setAssistError("模板不能为空。");
      return;
    }

    onCoverPromptTemplateChange(nextTemplate);
    setCoverPromptTemplateDraft(nextTemplate);
    setIsCoverPromptTemplateEditing(false);
    setAssistError(null);
  }

  function handleRestoreDefaultCoverPromptTemplate() {
    onCoverPromptTemplateChange(DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE);
    setCoverPromptTemplateDraft(DEFAULT_BLOG_FACTORY_COVER_PROMPT_TEMPLATE);
    setAssistError(null);
  }

  function handleCoverPromptStylePresetChange(stylePresetId: BlogFactoryCoverStylePresetId) {
    const stylePreset = resolveBlogFactoryCoverStylePreset(stylePresetId);
    setCoverPromptCategory(
      BLOG_FACTORY_COVER_CATEGORY_STYLE_PRESETS.find((preset) => preset.stylePresetId === stylePreset.id)?.category ?? "",
    );
    const nextConfig = normalizeBlogFactoryCoverPromptConfig({
      ...resolvedCoverPromptConfig,
      stylePresetId: stylePreset.id,
    });
    onCoverPromptConfigChange(nextConfig);
    setAssistError(null);
  }

  function handleCoverPromptCategoryChange(category: string) {
    setCoverPromptCategory(category);
    const categoryPreset = BLOG_FACTORY_COVER_CATEGORY_STYLE_PRESETS.find((preset) => preset.category === category);
    if (categoryPreset) handleCoverPromptStylePresetChange(categoryPreset.stylePresetId);
  }

  async function handleUploadCoverImage(files: File[]) {
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;

    setIsCoverImageUploading(true);
    setCoverImageError(null);
    try {
      const uploaded = await uploadMediaImage(imageFile);
      onEditDraftChange({
        ...editDraft,
        coverImageMarkdown: uploaded.markdown,
      });
    } catch (error) {
      setCoverImageError(error instanceof Error ? error.message : "封面图片上传失败，请稍后重试。");
    } finally {
      setIsCoverImageUploading(false);
      if (coverImageFileInputRef.current) coverImageFileInputRef.current.value = "";
    }
  }

  function handleCoverImagePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (!files.length) return;
    event.preventDefault();
    void handleUploadCoverImage(files);
  }

  function handleRemoveCoverImage() {
    onEditDraftChange({
      ...editDraft,
      coverImageMarkdown: "",
    });
    setCoverImageError(null);
  }

  const renderDetailPanel = () => (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <FileText size={17} />
            Record Detail
          </div>
          <h2 className="text-lg font-semibold text-slate-50">任务详情</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={!canSelectPrevious}
            title="上一条博客工厂任务"
            type="button"
            onClick={() => onSelectAdjacent("previous")}
          >
            <ChevronLeft size={15} />
            上一条
          </button>
          <button
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={!canSelectNext}
            title="下一条博客工厂任务"
            type="button"
            onClick={() => onSelectAdjacent("next")}
          >
            下一条
            <ChevronRight size={15} />
          </button>
          {isDetailLoading ? <Loader2 className="animate-spin text-mint-300" size={17} /> : null}
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
            disabled={!selectedItem || isDeleting || isRecordSaving || isArticleSaving}
            title="删除任务"
            type="button"
            onClick={onDelete}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {selectedItem ? (
        <div className="flex flex-col gap-4" data-blog-factory-item-id={selectedItem.id}>
          <div className="order-3 rounded-lg border border-white/10 bg-white/[0.028] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>#{selectedItem.id}</span>
              <span>知识 #{selectedItem.knowledge_id}</span>
              <span>{formatHistoryDate(selectedItem.copied_at)}</span>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs ${blogFactoryStatusStyles[selectedItem.factory_status]}`}>
                工厂 {selectedItem.factory_status}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${statusStyles[selectedItem.blog_status_snapshot || "未发布"]}`}>
                内容 {selectedItem.blog_status_snapshot || "未记录"}
              </span>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-slate-300">工厂状态</div>
              <div className="grid grid-cols-2 gap-2">
                {nextStatusOptions.map((status) => (
                  <button
                    key={status}
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed ${
                      selectedItem.factory_status === status
                        ? blogFactoryStatusStyles[status]
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300 disabled:text-slate-600"
                    }`}
                    disabled={isStatusSaving || selectedItem.factory_status === status}
                    type="button"
                    onClick={() => onStatusChange(status)}
                  >
                    {isStatusSaving && selectedItem.factory_status !== status ? <Loader2 className="animate-spin" size={15} /> : null}
                    {status}
                  </button>
                ))}
              </div>
              <button
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canSendToProcessing}
                title={
                  selectedItem.factory_status === "待处理"
                    ? "把当前任务内容创建为新的待加工知识"
                    : "只有待处理任务可以发回知识加工"
                }
                type="button"
                onClick={onSendToProcessing}
              >
                {isSendingToProcessing ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                {isSendingToProcessing ? "发回中" : "发回知识加工"}
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-sm leading-6 text-slate-400">
              发送到博客工厂后，源知识内容状态会自动同步为“已发布”；待处理任务可将当前任务内容发回知识加工再次生成。
            </div>
          </div>

          {sendBackNotice ? (
            <div className="order-4 flex items-start gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-3 text-sm text-mint-100">
              <CheckCircle2 className="mt-0.5 shrink-0 text-mint-300" size={17} />
              <span>{sendBackNotice}</span>
            </div>
          ) : null}

          {statusError ? (
            <div className="order-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{statusError}</span>
            </div>
          ) : null}

          <div className="order-1 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 text-sm font-medium text-slate-300">任务内容</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{publishConfigs.length > 0 ? `已保存 ${publishConfigs.length} 套博客配置` : "未配置博客 API"}</span>
                  {isPublishConfigsLoading ? <span>读取配置中…</span> : null}
                  {publishConfigsError ? <span className="text-red-200">{publishConfigsError}</span> : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <div className="flex h-9 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
                    <button
                      className={`px-3 text-xs transition ${
                        taskCopyView === "rendered" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                      }`}
                      type="button"
                      onClick={() => setTaskCopyView("rendered")}
                    >
                      美化
                    </button>
                    <button
                      className={`border-l border-white/10 px-3 text-xs transition ${
                        taskCopyView === "enhanced" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                      }`}
                      type="button"
                      onClick={() => setTaskCopyView("enhanced")}
                    >
                      增强美化
                    </button>
                    <button
                      className={`border-l border-white/10 px-3 text-xs transition ${
                        taskCopyView === "raw" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                      }`}
                      type="button"
                      onClick={() => setTaskCopyView("raw")}
                    >
                      裸文本
                    </button>
                  </div>
                  <button
                    className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                      hasCopiedTask
                        ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                    }`}
                    disabled={!selectedItem.task_content.trim()}
                    title={
                      hasCopiedTask
                        ? "已复制"
                        : taskCopyView === "enhanced"
                          ? "复制增强美化任务内容"
                          : taskCopyView === "rendered"
                            ? "复制美化任务内容"
                            : "复制裸文本任务内容"
                    }
                    type="button"
                    onClick={() => onCopyTask(taskCopyView)}
                  >
                    {hasCopiedTask ? <ClipboardCheck size={15} /> : <Copy size={15} />}
                    {hasCopiedTask
                      ? "已复制"
                      : taskCopyView === "enhanced"
                        ? "复制增强美化"
                      : taskCopyView === "rendered"
                          ? "复制美化"
                          : "复制裸文本"}
                  </button>
                  <button
                    className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                      isTaskContentEditing
                        ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                    }`}
                    disabled={isRecordSaving || isDeleting}
                    type="button"
                    onClick={() => {
                      setIsMaskToolsExpanded(false);
                      setIsTaskContentEditing(true);
                    }}
                  >
                    <Pencil size={15} />
                    {isTaskContentEditing ? "编辑中" : "编辑任务内容"}
                  </button>
                  <BlogFactoryAiReview
                    key={`blog-factory-review-${selectedItem.id}`}
                    answerSnapshot={editDraft.answerSnapshot}
                    disabled={isRecordSaving || isDeleting}
                    modelOptions={modelOptions}
                    questionSnapshot={editDraft.questionSnapshot}
                    taskId={selectedItem.id}
                    taskContent={editDraft.taskContent}
                    onApply={(targetItemId, expectedTaskContent, taskContent) => {
                      if (selectedItem.id !== targetItemId || editDraft.taskContent !== expectedTaskContent) return false;
                      onEditDraftChange({ ...editDraft, taskContent });
                      setIsTaskContentEditing(true);
                      setIsMaskToolsExpanded(false);
                      return true;
                    }}
                  />
                  <BlogFactoryAiEnhancement
                    key={`blog-factory-enhancement-${selectedItem.id}`}
                    answerSnapshot={editDraft.answerSnapshot}
                    disabled={isRecordSaving || isDeleting}
                    modelOptions={modelOptions}
                    questionSnapshot={editDraft.questionSnapshot}
                    taskId={selectedItem.id}
                    taskContent={editDraft.taskContent}
                    onApply={(targetItemId, expectedTaskContent, taskContent) => {
                      if (selectedItem.id !== targetItemId || editDraft.taskContent !== expectedTaskContent) return false;
                      onEditDraftChange({ ...editDraft, taskContent });
                      setIsTaskContentEditing(true);
                      setIsMaskToolsExpanded(false);
                      return true;
                    }}
                  />
                  {isTaskContentEditing ? (
                    <button
                      aria-expanded={isMaskToolsExpanded}
                      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition ${
                        isMaskToolsExpanded
                          ? "border-amberline/30 bg-amberline/10 text-amber-100"
                          : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-amberline/30 hover:text-amber-100"
                      }`}
                      type="button"
                      onClick={() => setIsMaskToolsExpanded((expanded) => !expanded)}
                    >
                      <LockKeyhole size={15} />
                      脱敏
                      {isMaskToolsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  ) : null}
                </div>
                <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                  <button
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                      assistView === "summary"
                        ? "border-mint-300/30 bg-mint-300/14 text-mint-200"
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                    }`}
                    disabled={!assistSource.trim()}
                    title="提取并查看任务内容摘要"
                    type="button"
                    onClick={(event) => handleOpenContentAssist(event, "summary")}
                  >
                    <Sparkles size={14} />
                    提取摘要
                  </button>
                  <button
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                      assistView === "coverPrompt"
                        ? "border-mint-300/30 bg-mint-300/14 text-mint-200"
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                    }`}
                    disabled={!assistSource.trim()}
                    title="生成并查看封面生图提示词"
                    type="button"
                    onClick={(event) => handleOpenContentAssist(event, "coverPrompt")}
                  >
                    <ImagePlus size={14} />
                    生图提示词
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-mint-300/30 bg-mint-300/14 px-2 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                    disabled={!canPublish}
                    title="发布当前博客文章"
                    type="button"
                    onClick={() => onOpenPublishDialog("publish")}
                  >
                    <Send size={14} />
                    发布到博客
                  </button>
                </div>
              </div>
            </div>

            {isTaskContentEditing ? (
              <div className="space-y-3">
                {isMaskToolsExpanded ? (
                  <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <select
                        className="control"
                        value={selectedMaskRuleId ?? ""}
                        onChange={(event) => onMaskRuleChange(event.target.value || null)}
                      >
                        <option value="">{maskRules.length > 0 ? "选择脱敏规则" : "暂无已保存规则"}</option>
                        {maskRules.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                        type="button"
                        onClick={onOpenMaskDialog}
                      >
                        <LockKeyhole size={16} />
                        脱敏规则
                      </button>
                      <button
                        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-4 text-sm text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                        disabled={!canApplyMaskRule}
                        type="button"
                        onClick={() => onApplyMaskRule(selectedMaskRuleId)}
                      >
                        <ShieldCheck size={16} />
                        应用脱敏
                      </button>
                    </div>
                    {selectedMaskRule ? (
                      <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-6 text-slate-400">
                        当前规则：{selectedMaskRule.name} · {describeBlogFactoryMaskRule(selectedMaskRule)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <MarkdownImageTextarea
                  className="control min-h-[420px] resize-y font-mono text-xs leading-6 text-slate-200"
                  value={editDraft.taskContent}
                  onChange={(taskContent) => onEditDraftChange({ ...editDraft, taskContent })}
                />
                {maskNotice ? (
                  <div className="rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-2 text-xs leading-6 text-mint-100">{maskNotice}</div>
                ) : null}
                {maskError ? (
                  <div className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-6 text-red-100">{maskError}</div>
                ) : null}
                {editError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                    <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                    <span>{editError}</span>
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 transition hover:border-white/20 hover:text-slate-100"
                    disabled={isRecordSaving}
                    type="button"
                    onClick={handleCancelTaskContentEditing}
                  >
                    <X size={16} />
                    取消编辑
                  </button>
                  <button
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                    disabled={!canSaveItem}
                    type="button"
                    onClick={() => void handleSaveTaskContent()}
                  >
                    {isItemSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isItemSaving ? "保存中" : "保存任务内容"}
                  </button>
                </div>
              </div>
            ) : selectedItem.task_content.trim() ? (
              taskCopyView === "raw" ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-400 [overflow-wrap:anywhere]">
                  {removeLeakedMarkdownCodePlaceholders(selectedItem.task_content)}
                </p>
              ) : (
                <MarkdownPreview markdown={selectedItem.task_content} />
              )
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-400 [overflow-wrap:anywhere]">未记录</p>
            )}

            <div data-content-assist className="mt-4 scroll-mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <WandSparkles size={16} />
                    内容辅助
                  </div>
                  <div className="text-xs leading-6 text-slate-500">
                    当前标题：{editDraft.questionSnapshot || selectedItem.question_snapshot || "未记录"}
                  </div>
                </div>
                <div className="flex h-9 w-full shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] sm:w-auto">
                  <button
                    className={`flex flex-1 items-center justify-center whitespace-nowrap px-3 text-xs transition ${
                      assistView === "summary" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                    }`}
                    type="button"
                    onClick={() => setAssistView("summary")}
                  >
                    提取摘要
                  </button>
                  <button
                    className={`flex flex-1 items-center justify-center whitespace-nowrap border-l border-white/10 px-3 text-xs transition ${
                      assistView === "coverPrompt" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                    }`}
                    type="button"
                    onClick={() => setAssistView("coverPrompt")}
                  >
                    生图提示词
                  </button>
                </div>
              </div>

              {assistView === "coverPrompt" || assistSource.trim() ? (
                assistView === "summary" ? (
                  <div className="space-y-3">
                    <textarea
                      className="control min-h-24 resize-y text-sm leading-7"
                      maxLength={100}
                      placeholder="已自动提取摘要；也可直接编辑。"
                      value={editDraft.assistSummary}
                      onChange={(event) => onEditDraftChange({ ...editDraft, assistSummary: event.target.value })}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs text-slate-500">{Array.from(editDraft.assistSummary).length} / 100 字</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                          disabled={assistSummaryCandidates.length < 2}
                          type="button"
                          onClick={handleRegenerateSummary}
                        >
                          <RefreshCw size={15} />
                          换一条摘要
                        </button>
                        <button
                          className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500 ${
                            summarySaveStatus === "error"
                              ? "border-red-400/30 bg-red-400/10 text-red-100"
                              : "border-mint-300/30 bg-mint-300/14 text-mint-300 hover:bg-mint-300/20"
                          }`}
                          disabled={isItemSaving || isSummarySavePending}
                          type="button"
                          onClick={() => void handleSaveAssist("summary")}
                        >
                          {isSummarySavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                          {summarySaveStatus === "success"
                            ? "摘要已保存"
                            : summarySaveStatus === "error"
                              ? "保存失败"
                              : isSummarySavePending
                                ? "保存中"
                                : "保存摘要"}
                        </button>
                        <button
                          className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                            assistCopiedTarget === "summary"
                              ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                          }`}
                          disabled={!editDraft.assistSummary}
                          type="button"
                          onClick={() => void handleCopyAssistText(editDraft.assistSummary, "summary")}
                        >
                          {assistCopiedTarget === "summary" ? <ClipboardCheck size={15} /> : <Copy size={15} />}
                          {assistCopiedTarget === "summary" ? "已复制" : "复制摘要"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3 rounded-lg border border-white/10 bg-black/15 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-300">
                            <Sparkles size={16} />
                            文本解析
                          </div>
                          <div className="text-xs leading-6 text-slate-500">
                            输入文章内容后，生成“标题、核心内容、想要的感觉”三项简洁提示词。
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                            disabled={!assistSource.trim() && !coverPromptTextDraft.trim()}
                            type="button"
                            onClick={() => {
                              if (!coverPromptTextDraft.trim()) setCoverPromptTextDraft(assistSource);
                              setAssistError(null);
                            }}
                          >
                            <WandSparkles size={15} />
                            一键转配图
                          </button>
                          <button
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                            disabled={!assistSource.trim()}
                            type="button"
                            onClick={() => {
                              setCoverPromptTextDraft(assistSource);
                              setAssistError(null);
                            }}
                          >
                            <FileText size={15} />
                            使用任务内容
                          </button>
                          <button
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-red-400/30 hover:text-red-100 disabled:cursor-not-allowed disabled:text-slate-600"
                            disabled={!coverPromptTextDraft.trim()}
                            type="button"
                            onClick={() => setCoverPromptTextDraft("")}
                          >
                            <X size={15} />
                            清空
                          </button>
                        </div>
                      </div>
                      <textarea
                        className="control min-h-[120px] resize-y text-sm leading-7"
                        placeholder="粘贴文章标题、摘要或正文片段。留空时使用当前任务内容生成。"
                        value={coverPromptTextDraft}
                        onChange={(event) => setCoverPromptTextDraft(event.target.value)}
                      />
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                      <Field label="文章分类预设" icon={<Tags size={16} />}>
                        <select
                          className="control"
                          value={coverPromptCategory}
                          onChange={(event) => handleCoverPromptCategoryChange(event.target.value)}
                        >
                          <option value="">按需选择分类并应用推荐风格</option>
                          {BLOG_FACTORY_COVER_CATEGORY_STYLE_PRESETS.map((preset) => (
                            <option key={preset.category} value={preset.category}>
                              {preset.category} · {resolveBlogFactoryCoverStylePreset(preset.stylePresetId).styleName}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {coverPromptCategory ? (
                        <div className="mt-2 text-xs leading-6 text-slate-500">
                          {BLOG_FACTORY_COVER_CATEGORY_STYLE_PRESETS.find((preset) => preset.category === coverPromptCategory)?.description}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                      <Field label="画面风格" icon={<Sparkles size={16} />}>
                        <select
                          className="control"
                          value={resolvedCoverPromptConfig.stylePresetId}
                          onChange={(event) => handleCoverPromptStylePresetChange(event.target.value as BlogFactoryCoverStylePresetId)}
                        >
                          {BLOG_FACTORY_COVER_STYLE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.styleName}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="mt-2 text-xs leading-6 text-slate-500">
                        选择一个最贴合文章主题的感觉；分类预设也会自动带入推荐风格。
                      </div>
                    </div>
                    {coverPromptSource.trim() ? (
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/15 p-3 text-xs leading-6 text-slate-300 [overflow-wrap:anywhere]">
                        {coverImagePrompt}
                      </pre>
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm leading-6 text-slate-500">
                        输入文字后自动生成提示词。
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-h-5 text-xs leading-5 text-slate-500">
                        标题取当前文章标题，核心内容优先取当前摘要；修改后会即时更新预览，仍需点击保存提示词才会更新导出版本。
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                          type="button"
                          onClick={() => {
                            setCoverPromptTemplateDraft(coverPromptTemplate);
                            setIsCoverPromptTemplateEditing((current) => !current);
                            setAssistError(null);
                          }}
                        >
                          <Settings2 size={15} />
                          {isCoverPromptTemplateEditing ? "收起模板" : "编辑模板"}
                        </button>
                        <button
                          className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                            assistCopiedTarget === "coverPrompt"
                              ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                          }`}
                          disabled={!coverImagePrompt || !coverPromptSource.trim()}
                          type="button"
                          onClick={() => void handleCopyAssistText(coverImagePrompt, "coverPrompt")}
                        >
                          {assistCopiedTarget === "coverPrompt" ? <ClipboardCheck size={15} /> : <Copy size={15} />}
                          {assistCopiedTarget === "coverPrompt" ? "已复制" : "复制提示词"}
                        </button>
                        <button
                          className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500 ${
                            promptSaveStatus === "error"
                              ? "border-red-400/30 bg-red-400/10 text-red-100"
                              : "border-mint-300/30 bg-mint-300/14 text-mint-300 hover:bg-mint-300/20"
                          }`}
                          disabled={!coverImagePrompt || !coverPromptSource.trim() || isItemSaving || isPromptSavePending}
                          type="button"
                          onClick={() => void handleSaveAssist("prompt", coverImagePrompt)}
                        >
                          {isPromptSavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                          {promptSaveStatus === "success"
                            ? "提示词已保存"
                            : promptSaveStatus === "error"
                              ? "保存失败"
                              : isPromptSavePending
                                ? "保存中"
                                : "保存提示词"}
                        </button>
                      </div>
                    </div>
                    {isCoverPromptTemplateEditing ? (
                      <div className="space-y-3 rounded-lg border border-white/10 bg-black/15 p-3">
                        <div className="text-xs leading-6 text-slate-500">
                          默认使用三个变量：{"{{title}}"} / {"{{summary}}"} / {"{{style}}"}
                        </div>
                        <textarea
                          className="control min-h-[220px] resize-y font-mono text-xs leading-6"
                          value={coverPromptTemplateDraft}
                          onChange={(event) => setCoverPromptTemplateDraft(event.target.value)}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20"
                            type="button"
                            onClick={handleSaveCoverPromptTemplate}
                          >
                            <Save size={15} />
                            保存模板
                          </button>
                          <button
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-amberline/30 hover:text-amber-100"
                            type="button"
                            onClick={handleRestoreDefaultCoverPromptTemplate}
                          >
                            <RefreshCw size={15} />
                            恢复默认
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm leading-6 text-slate-500">
                  当前任务内容为空。
                </div>
              )}

              <div
                className="mt-4 rounded-lg border border-white/10 bg-black/15 p-3"
                tabIndex={0}
                onPaste={handleCoverImagePaste}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-300">
                      <ImagePlus size={16} />
                      封面图片
                    </div>
                    <div className="text-xs leading-6 text-slate-500">点击上传，或先聚焦此区域后粘贴剪贴板图片。</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                      disabled={isCoverImageUploading || isItemSaving || isCoverSavePending}
                      type="button"
                      onClick={() => coverImageFileInputRef.current?.click()}
                    >
                      {isCoverImageUploading ? <Loader2 className="animate-spin" size={15} /> : <ImagePlus size={15} />}
                      {isCoverImageUploading ? "上传中" : coverImageMarkdown ? "替换图片" : "上传图片"}
                    </button>
                    <button
                      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-red-400/30 hover:text-red-100 disabled:cursor-not-allowed disabled:text-slate-600"
                      disabled={!coverImageMarkdown || isCoverImageUploading || isItemSaving || isCoverSavePending}
                      type="button"
                      onClick={handleRemoveCoverImage}
                    >
                      <X size={15} />
                      移除
                    </button>
                    <button
                      className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500 ${
                        coverSaveStatus === "error"
                          ? "border-red-400/30 bg-red-400/10 text-red-100"
                          : "border-mint-300/30 bg-mint-300/14 text-mint-300 hover:bg-mint-300/20"
                      }`}
                      disabled={isCoverImageUploading || isItemSaving || isCoverSavePending}
                      type="button"
                      onClick={() => void handleSaveAssist("cover")}
                    >
                      {isCoverSavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                      {coverSaveStatus === "success"
                        ? "封面已保存"
                        : coverSaveStatus === "error"
                          ? "保存失败"
                          : isCoverSavePending
                            ? "保存中"
                            : "保存封面"}
                    </button>
                  </div>
                </div>
                <input
                  ref={coverImageFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  type="file"
                  onChange={(event) => void handleUploadCoverImage(Array.from(event.target.files ?? []))}
                />
                {coverImageMarkdown ? (
                  <MarkdownPreview markdown={coverImageMarkdown} />
                ) : (
                  <div className="grid min-h-[150px] place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm leading-6 text-slate-500">
                    暂无封面图片。上传后会独立保存，不会写入任务内容。
                  </div>
                )}
                {coverImageError ? (
                  <div className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-6 text-red-100">
                    {coverImageError}
                  </div>
                ) : null}
              </div>

              {assistError ? (
                <div className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-6 text-red-100">
                  {assistError}
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-mint-300/18 bg-mint-300/[0.06] p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-mint-200">
                    <Send size={16} />
                    博客发布
                  </div>
                  <div className="text-xs leading-6 text-slate-300">
                    <span>
                      {publishConfigs.length > 0
                        ? publishTitle
                          ? `当前将发布：${publishTitle}`
                          : "将优先发布已保存文章；没有已保存文章时回退到任务内容"
                        : "请先配置 Metaweblog API"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
                  <button
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                    type="button"
                    onClick={onOpenPublishConfig}
                  >
                    <Settings2 size={15} />
                    配置API
                  </button>
                  <button
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                    disabled={!canPublish}
                    type="button"
                    onClick={() => onOpenPublishDialog("publish")}
                  >
                    {isPublishing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                    {isPublishing ? "发布中" : "发布到博客"}
                  </button>
                </div>
              </div>
              {publishSuccess ? (
                <div className="mt-3 rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-2 text-xs leading-6 text-mint-100">
                  已{publishSuccess.published ? "发布" : "保存草稿"}到 {publishSuccess.blog_name || "目标博客"}，文章 ID{" "}
                  {publishSuccess.post_id}
                </div>
              ) : null}
              {publishError ? (
                <div className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-6 text-red-100">
                  {publishError}
                </div>
              ) : null}
            </div>
          </div>
          {taskCopyError ? (
            <div className="order-2 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{taskCopyError}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
          <div>
            <ClipboardList className="mx-auto mb-3 text-slate-600" size={36} />
            <div className="mb-1 font-medium text-slate-300">选择一条任务</div>
            <p className="text-sm leading-6 text-slate-500">详情中可编辑任务内容、更新状态、发布到博客或删除任务。</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`grid flex-1 gap-4 px-4 pb-4 pt-2 xl:gap-x-2 ${
        isTaskListCollapsed
          ? "xl:grid-cols-[28px_minmax(0,1fr)]"
          : "xl:grid-cols-[minmax(400px,0.75fr)_minmax(600px,1.25fr)]"
      }`}
    >
      <section
        className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${
          isTaskListCollapsed ? "p-0" : "p-4"
        }`}
      >
        <div className={isTaskListCollapsed ? "xl:hidden" : "xl:pr-7"}>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <ClipboardList size={17} />
              AI_BLOG_FACTORY
            </div>
            <h2 className="text-xl font-semibold text-slate-50">博客工厂任务</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
            {total} 条匹配
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="text-mint-300" size={16} />
              查询条件
              {activeFilterCount > 0 ? (
                <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-1.5 py-0.5 text-[11px] font-medium text-mint-200">
                  已筛选 {activeFilterCount} 项
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={isLoading || isRefreshing}
                type="button"
                onClick={onRefresh}
              >
                <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={15} />
                {isRefreshing ? "刷新中" : "刷新列表"}
              </button>
              {authUser?.is_admin ? <VectorRefreshButton isRefreshing={isVectorRefreshing} onRefresh={onRefreshVectors} /> : null}
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                type="button"
                aria-expanded={isFiltersExpanded}
                onClick={() => setIsFiltersExpanded((expanded) => !expanded)}
              >
                {isFiltersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {isFiltersExpanded ? "收起" : "展开"}
              </button>
            </div>
          </div>
          {isFiltersExpanded ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SemanticSearchField
              isActive={Boolean(filters.semanticQuery)}
              value={semanticQueryDraft}
              placeholder="按任务内容语义检索"
              onChange={setSemanticQueryDraft}
              onSearch={() => onFilterChange({ semanticQuery: semanticQueryDraft.trim() })}
            />
            <Field label="用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                disabled={hasSingleVisibleUser}
                value={filters.username}
                onChange={(event) => onFilterChange({ username: event.target.value })}
              >
                <option value="">{allUsersLabel}</option>
                {visibleUsers.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="工厂状态" icon={<CheckCircle2 size={16} />}>
              <select
                className="control"
                value={filters.factoryStatus}
                onChange={(event) => onFilterChange({ factoryStatus: event.target.value as BlogFactoryFilters["factoryStatus"] })}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="主题标签" icon={<Tags size={16} />}>
              <input
                className="control"
                value={filters.topic}
                onChange={(event) => onFilterChange({ topic: event.target.value })}
                placeholder="如 APEX"
              />
            </Field>
            <Field label="知识 ID" icon={<Database size={16} />}>
              <input
                className="control"
                inputMode="numeric"
                value={filters.knowledgeId}
                onChange={(event) => onFilterChange({ knowledgeId: event.target.value.replace(/\D/g, "") })}
                placeholder="全部"
              />
            </Field>
            <Field label="向量状态" icon={<Database size={16} />}>
              <select className="control" value={filters.vectorStatus} onChange={(event) => onFilterChange({ vectorStatus: event.target.value as BlogFactoryFilters["vectorStatus"] })}>
                <option value="all">全部</option>
                <option value="1">待更新</option>
                <option value="0">已就绪</option>
              </select>
            </Field>
            <div className="grid min-w-0 grid-cols-2 items-end gap-2 sm:col-span-2 sm:grid-cols-[minmax(100px,3fr)_minmax(108px,1fr)_auto]">
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <Field label="排序字段" icon={<ChartLine size={16} />}>
                  <select
                    className="control"
                    value={filters.sortBy}
                    onChange={(event) => onFilterChange({ sortBy: event.target.value as BlogFactoryFilters["sortBy"] })}
                  >
                    <option value="copied_at">复制时间</option>
                    <option value="id">ID</option>
                    <option value="knowledge_id">知识 ID</option>
                    <option value="factory_status">状态</option>
                  </select>
                </Field>
              </div>
              <div className="min-w-0">
                <Field label="方向" icon={<ChartLine size={16} />}>
                  <select
                    className="control"
                    value={filters.sortDir}
                    onChange={(event) => onFilterChange({ sortDir: event.target.value as BlogFactoryFilters["sortDir"] })}
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </Field>
              </div>
              <FilterClearButton className="w-full sm:w-auto" onClick={onClearFilters} />
            </div>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingStack />
        ) : loadError ? (
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
              <TriangleAlert size={16} />
              博客工厂读取失败
            </div>
            <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <ClipboardList className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">没有匹配的工厂任务</div>
              <p className="text-sm text-slate-500">复制并保存 Blog 加工包后，这里会显示任务记录。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const markdownTitle = extractMarkdownHeading(item.task_content);
              const displayTitle = item.article_title || markdownTitle || item.question_snapshot || "无问题快照";
              const isOriginalQuestionTitle = !item.article_title && !markdownTitle;

              return (
                <article
                key={item.id}
                className={`cursor-pointer rounded-lg border bg-white/[0.028] p-4 transition ${
                  selectedItem?.id === item.id ? "border-mint-300/45 bg-mint-300/[0.055]" : "border-white/10 hover:border-white/18"
                }`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>知识 #{item.knowledge_id}</span>
                      <span>{formatHistoryDate(item.copied_at)}</span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-50">
                      {isOriginalQuestionTitle ? `原始问题：${displayTitle}` : displayTitle}
                    </h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${blogFactoryStatusStyles[item.factory_status]}`}>
                    {item.factory_status}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-400">{item.task_content || "无任务内容"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.similarity !== null ? (
                    <span className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-200">相似度 {(item.similarity * 100).toFixed(1)}%</span>
                  ) : null}
                  <VectorStatusBadge value={item.v_needs_update} />
                  {item.has_article ? (
                    <span className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-200">
                      {item.article_title || "已生成 Markdown"}
                    </span>
                  ) : (
                    <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-500">
                      未生成文章
                    </span>
                  )}
                  <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
                    内容 {item.blog_status_snapshot || "未记录"}
                  </span>
                  {item.topic_tag_snapshot ? (
                    <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
                      {item.topic_tag_snapshot}
                    </span>
                  ) : null}
                </div>
                </article>
              );
            })}

            <div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {rangeStart}-{rangeEnd} / {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page <= 1}
                  title="上一页"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-16 text-center text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page >= totalPages}
                  title="下一页"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        {isTaskListCollapsed ? (
          <button
            className="hidden h-full min-h-[420px] w-full flex-col items-center rounded-md text-mint-200 transition hover:bg-mint-300/10 focus:outline-none focus:ring-2 focus:ring-mint-300/30 xl:flex"
            type="button"
            aria-label="展开任务列表"
            title="展开任务列表"
            onClick={() => setIsTaskListCollapsed(false)}
          >
            <ChevronRight className="mt-2 shrink-0" size={17} />
          </button>
        ) : null}
        {!isTaskListCollapsed ? (
          <button
            className="absolute inset-y-0 right-0 hidden w-7 flex-col items-center border-l border-white/10 text-slate-500 transition hover:bg-mint-300/10 hover:text-mint-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-mint-300/30 xl:flex"
            type="button"
            aria-label="收起任务列表"
            title="收起任务列表，专注任务内容"
            onClick={() => setIsTaskListCollapsed(true)}
          >
            <ChevronLeft className="mt-2 shrink-0" size={16} />
          </button>
        ) : null}
      </section>

      <aside className="hidden min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl lg:block">
        {renderDetailPanel()}
      </aside>

      <MobileEditorSheet
        icon={<FileText size={17} />}
        isBusy={isDetailLoading || isStatusSaving || isRecordSaving || isSendingToProcessing || isArticleSaving || isDeleting}
        isOpen={isMobileDetailOpen && selectedItem !== null}
        label="Record Detail"
        title="博客工厂任务详情"
        onClose={onCloseMobileDetail}
      >
        <div className="rounded-lg border border-white/10 bg-ink-900/64 p-4">{renderDetailPanel()}</div>
      </MobileEditorSheet>
    </div>
  );
}

function DetailBlock({
  title,
  value,
  compact = false,
  action,
}: {
  title: string;
  value: string;
  compact?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-300">{title}</div>
        {action}
      </div>
      <p className={`whitespace-pre-wrap break-words text-sm leading-7 text-slate-400 [overflow-wrap:anywhere] ${compact ? "line-clamp-4" : ""}`}>
        {value || "未记录"}
      </p>
    </div>
  );
}

function BlogFactoryAiEnhancement({
  answerSnapshot,
  disabled,
  modelOptions,
  questionSnapshot,
  taskId,
  taskContent,
  onApply,
}: {
  answerSnapshot: string;
  disabled: boolean;
  modelOptions: { value: string; label: string }[];
  questionSnapshot: string;
  taskId: number;
  taskContent: string;
  onApply: (targetItemId: number, expectedTaskContent: string, taskContent: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [enhancementJobId, setEnhancementJobId] = useState<string | null>(null);
  const [sourceTaskContent, setSourceTaskContent] = useState<string | null>(null);
  const [modelName, setModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const canEnhance = !disabled && !isEnhancing && taskContent.trim().length > 0;

  function clearStoredEnhancementJob() {
    try {
      window.sessionStorage.removeItem(`trustedKnowledge.blogFactoryEnhancementJob.v2.${taskId}`);
    } catch {
      // Do not make enhancement availability depend on browser storage.
    }
  }

  function storeEnhancementJob(jobId: string) {
    try {
      window.sessionStorage.setItem(`trustedKnowledge.blogFactoryEnhancementJob.v2.${taskId}`, JSON.stringify({ jobId, taskContent }));
    } catch {
      // An active task can still finish in this tab.
    }
  }

  useEffect(() => {
    if (!isOpen || !enhancementJobId) return;
    const jobId = enhancementJobId;
    let cancelled = false;
    let timer: number | undefined;

    async function pollEnhancementJob() {
      try {
        const job = await getBlogFactoryEnhancementJob(jobId);
        if (cancelled) return;
        if (job.status === "running") {
          timer = window.setTimeout(pollEnhancementJob, 1500);
          return;
        }
        setIsEnhancing(false);
        setEnhancementJobId(null);
        if (job.status === "completed" && job.result) {
          setResult(job.result.content);
          return;
        }
        clearStoredEnhancementJob();
        setError(job.error_message ?? (job.status === "cancelled" ? "增强已取消。" : "AI 增强失败，请稍后重试。"));
      } catch (enhancementError) {
        if (cancelled) return;
        setIsEnhancing(false);
        setEnhancementJobId(null);
        clearStoredEnhancementJob();
        setError(enhancementError instanceof Error ? enhancementError.message : "读取增强任务状态失败，请稍后重试。");
      }
    }

    void pollEnhancementJob();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, enhancementJobId]);

  useEffect(() => {
    if (!isOpen || enhancementJobId || result) return;
    try {
      const raw = window.sessionStorage.getItem(`trustedKnowledge.blogFactoryEnhancementJob.v2.${taskId}`);
      const stored = raw ? JSON.parse(raw) as { jobId?: unknown; taskContent?: unknown } : null;
      if (typeof stored?.jobId !== "string" || stored.taskContent !== taskContent) return;
      setSourceTaskContent(stored.taskContent);
      setIsEnhancing(true);
      setEnhancementJobId(stored.jobId);
    } catch {
      clearStoredEnhancementJob();
    }
  }, [isOpen, enhancementJobId, result, taskContent, taskId]);

  function closeDialog() {
    if (isEnhancing) return;
    setIsOpen(false);
    setError(null);
    setResult(null);
    setEnhancementJobId(null);
    setSourceTaskContent(null);
  }

  async function handleEnhance() {
    if (!canEnhance) return;
    setIsEnhancing(true);
    setError(null);
    setSourceTaskContent(taskContent);
    try {
      const usesConfiguredModel = modelName === HISTORY_ASK_CONFIGURED_MODEL;
      const job = await startBlogFactoryEnhancementJob({
        taskContent,
        questionSnapshot,
        answerSnapshot,
        skillIds: selectedSkillIds,
        executionProvider: usesConfiguredModel ? "history_ask_llm" : "codex",
        modelName: modelName === AI_CODING_DEFAULT_MODEL ? "" : modelName,
      });
      storeEnhancementJob(job.job_id);
      setEnhancementJobId(job.job_id);
    } catch (enhancementError) {
      setError(enhancementError instanceof Error ? enhancementError.message : "AI 增强失败，请稍后重试。");
      setIsEnhancing(false);
    }
  }

  async function cancelEnhancement() {
    if (!enhancementJobId) return;
    try {
      await cancelBlogFactoryEnhancementJob(enhancementJobId);
      clearStoredEnhancementJob();
      setEnhancementJobId(null);
      setIsEnhancing(false);
      setIsOpen(false);
    } catch (enhancementError) {
      setError(enhancementError instanceof Error ? enhancementError.message : "取消增强失败，请稍后重试。");
    }
  }

  function applyEnhancement() {
    if (!result || !sourceTaskContent || !onApply(taskId, sourceTaskContent, result)) {
      setError("原任务或任务内容已变化，不能覆盖当前编辑内容；请重新发起增强或手动复制结果。");
      return;
    }
    clearStoredEnhancementJob();
    closeDialog();
  }

  return <>
    <button className="flex h-9 items-center gap-2 rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!taskContent.trim() || disabled} title={taskContent.trim() ? "增强当前任务内容，不会自动保存" : "当前任务内容为空"} type="button" onClick={() => { setError(null); setResult(null); setIsOpen(true); }}><WandSparkles size={15} />AI 增强</button>
    {isOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-start sm:justify-center sm:px-4 sm:py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg border border-fuchsia-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[calc(100dvh-3rem)] sm:rounded-lg" role="dialog" aria-label="AI 增强任务内容">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><div className="mb-2 flex items-center gap-2 text-sm text-fuchsia-200"><WandSparkles size={17} />AI Enhancement</div><h2 className="text-xl font-semibold text-slate-50">增强任务内容</h2><p className="mt-1 text-xs leading-5 text-slate-500">生成完整的增强版文章。确认回填后会进入编辑模式，仍须由你点击保存才会更新任务内容。</p></div><button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:text-fuchsia-200 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isEnhancing} title="关闭" type="button" onClick={closeDialog}><X size={17} /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!result ? <><div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-7 text-slate-400">将生成完整 Markdown，并遵循所选增强 Skill。在适合的位置可插入 Mermaid 图表；不会编造事实、删除图片链接或自动保存。</div>{isEnhancing ? <div className="flex items-center gap-2 rounded-lg border border-fuchsia-300/25 bg-fuchsia-300/10 p-3 text-sm text-fuchsia-100"><Loader2 className="animate-spin" size={17} />增强任务正在后台执行；刷新此页面后重新打开此窗口可继续查看结果。</div> : <><Field label="执行模型" icon={<Settings2 size={16} />}><select className="control" value={modelName} onChange={(event) => setModelName(event.target.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><SkillSelector agentCode="blog-enhancement" selectedSkillIds={selectedSkillIds} onSelectedSkillIdsChange={setSelectedSkillIds} /></>}</> : <div className="space-y-2"><p className="text-sm leading-6 text-slate-300">以下完整内容将回填到任务编辑区：</p><textarea className="control min-h-96 resize-y font-mono text-xs leading-6" readOnly value={result} /></div>}
          {error ? <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} /><span>{error}</span></div> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4">{isEnhancing ? <button className="h-11 rounded-lg border border-red-300/30 bg-red-300/10 px-4 text-sm text-red-100 transition hover:bg-red-300/16" type="button" onClick={() => void cancelEnhancement()}>取消增强</button> : <button className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 disabled:cursor-not-allowed disabled:text-slate-600" type="button" onClick={closeDialog}>取消</button>}{result ? <button className="flex h-11 items-center gap-2 rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/14 px-4 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-300/20" type="button" onClick={applyEnhancement}><ClipboardCheck size={17} />确认回填</button> : !isEnhancing ? <button className="flex h-11 items-center gap-2 rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/14 px-4 text-sm font-medium text-fuchsia-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!canEnhance} type="button" onClick={() => void handleEnhance()}><WandSparkles size={17} />生成增强内容</button> : null}</div>
      </section>
    </div> : null}
  </>;
}

function BlogFactoryAiReview({
  answerSnapshot,
  disabled,
  modelOptions,
  questionSnapshot,
  taskId,
  taskContent,
  onApply,
}: {
  answerSnapshot: string;
  disabled: boolean;
  modelOptions: { value: string; label: string }[];
  questionSnapshot: string;
  taskId: number;
  taskContent: string;
  onApply: (targetItemId: number, expectedTaskContent: string, taskContent: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlogFactoryReviewResult | null>(null);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [sourceTaskContent, setSourceTaskContent] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modelName, setModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const canReview = !disabled && !isReviewing && taskContent.trim().length > 0;

  function clearStoredReviewJob() {
    try {
      window.sessionStorage.removeItem(`trustedKnowledge.blogFactoryReviewJob.v2.${taskId}`);
    } catch {
      // Session storage is optional; an active task can still finish in this tab.
    }
  }

  function storeReviewJob(jobId: string) {
    try {
      window.sessionStorage.setItem(`trustedKnowledge.blogFactoryReviewJob.v2.${taskId}`, JSON.stringify({ jobId, taskContent }));
    } catch {
      // Do not make review availability depend on browser storage.
    }
  }

  useEffect(() => {
    if (!isOpen || !reviewJobId) return;
    const jobId = reviewJobId;
    let cancelled = false;
    let timer: number | undefined;

    async function pollReviewJob() {
      try {
        const job = await getBlogFactoryReviewJob(jobId);
        if (cancelled) return;
        if (job.status === "running") {
          timer = window.setTimeout(pollReviewJob, 1500);
          return;
        }
        setIsReviewing(false);
        setReviewJobId(null);
        if (job.status === "completed" && job.result) {
          setResult(job.result);
          setSelectedIds(job.result.suggestions.map((suggestion) => suggestion.id));
          return;
        }
        clearStoredReviewJob();
        setError(job.error_message ?? (job.status === "cancelled" ? "审阅已取消。" : "AI 审阅失败，请稍后重试。"));
      } catch (reviewError) {
        if (cancelled) return;
        setIsReviewing(false);
        setReviewJobId(null);
        clearStoredReviewJob();
        setError(reviewError instanceof Error ? reviewError.message : "读取审阅任务状态失败，请稍后重试。");
      }
    }

    void pollReviewJob();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, reviewJobId]);

  useEffect(() => {
    if (!isOpen || reviewJobId || result) return;
    try {
      const raw = window.sessionStorage.getItem(`trustedKnowledge.blogFactoryReviewJob.v2.${taskId}`);
      const stored = raw ? JSON.parse(raw) as { jobId?: unknown; taskContent?: unknown } : null;
      if (typeof stored?.jobId !== "string" || stored.taskContent !== taskContent) return;
      setSourceTaskContent(stored.taskContent);
      setIsReviewing(true);
      setReviewJobId(stored.jobId);
    } catch {
      clearStoredReviewJob();
    }
  }, [isOpen, reviewJobId, result, taskContent, taskId]);

  function closeDialog() {
    if (isReviewing) return;
    setIsOpen(false);
    setError(null);
    setResult(null);
    setSelectedIds([]);
    setReviewJobId(null);
    setSourceTaskContent(null);
  }

  async function handleReview() {
    if (!canReview) return;
    setIsReviewing(true);
    setError(null);
    setSourceTaskContent(taskContent);
    try {
      const usesConfiguredModel = modelName === HISTORY_ASK_CONFIGURED_MODEL;
      const job = await startBlogFactoryReviewJob({
        taskContent,
        questionSnapshot,
        answerSnapshot,
        skillIds: selectedSkillIds,
        executionProvider: usesConfiguredModel ? "history_ask_llm" : "codex",
        modelName: modelName === AI_CODING_DEFAULT_MODEL ? "" : modelName,
      });
      storeReviewJob(job.job_id);
      setReviewJobId(job.job_id);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "AI 审阅失败，请稍后重试。");
      setIsReviewing(false);
    }
  }

  async function cancelReview() {
    if (!reviewJobId) return;
    try {
      await cancelBlogFactoryReviewJob(reviewJobId);
      clearStoredReviewJob();
      setReviewJobId(null);
      setIsReviewing(false);
      setIsOpen(false);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "取消审阅失败，请稍后重试。");
    }
  }

  function toggleSuggestion(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]));
  }

  function applySuggestions() {
    if (!result || !sourceTaskContent || taskContent !== sourceTaskContent) {
      setError("原任务或任务内容已变化，不能应用审阅建议；请重新发起审阅或手动修改。");
      return;
    }
    let nextContent = sourceTaskContent;
    const failures: string[] = [];
    for (const suggestion of result.suggestions.filter((item) => selectedIds.includes(item.id))) {
      const firstIndex = nextContent.indexOf(suggestion.before);
      if (firstIndex === -1 || firstIndex !== nextContent.lastIndexOf(suggestion.before)) {
        failures.push(suggestion.id);
        continue;
      }
      nextContent = `${nextContent.slice(0, firstIndex)}${suggestion.after}${nextContent.slice(firstIndex + suggestion.before.length)}`;
    }
    if (failures.length > 0) {
      setError(`有 ${failures.length} 条建议无法安全定位原文；请刷新审阅结果或手动修改。其余建议已保留在当前选择中。`);
      return;
    }
    if (!onApply(taskId, sourceTaskContent, nextContent)) {
      setError("原任务或任务内容已变化，不能应用审阅建议；请重新发起审阅或手动修改。");
      return;
    }
    clearStoredReviewJob();
    closeDialog();
  }

  return <>
    <button className="flex h-9 items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-xs font-medium text-sky-200 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!taskContent.trim() || disabled} title={taskContent.trim() ? "审阅当前任务内容，不会自动保存" : "当前任务内容为空"} type="button" onClick={() => { setError(null); setResult(null); setSelectedIds([]); setIsOpen(true); }}><WandSparkles size={15} />AI 审阅</button>
    {isOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-start sm:justify-center sm:px-4 sm:py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[calc(100dvh-3rem)] sm:rounded-lg" role="dialog" aria-label="AI 审阅任务内容">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><WandSparkles size={17} />AI 审阅</div><h2 className="text-xl font-semibold text-slate-50">审阅任务内容</h2><p className="mt-1 text-xs leading-5 text-slate-500">审阅结果不会自动保存。可勾选部分建议，应用后会进入编辑模式，由你确认保存。</p></div><button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isReviewing} title="关闭" type="button" onClick={closeDialog}><X size={17} /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!result ? <><div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-7 text-slate-400">将审阅结构、逻辑、表达、与问题/答案快照的一致性及 Markdown。不会联网核验事实；Skill 只能调整审阅侧重点，不能改变安全替换和不自动保存规则。</div>{isReviewing ? <div className="flex items-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 p-3 text-sm text-mint-100"><Loader2 className="animate-spin" size={17} />审阅任务正在后台执行；刷新此页面后重新打开此窗口可继续查看结果。</div> : <><Field label="执行模型" icon={<Settings2 size={16} />}><select className="control" value={modelName} onChange={(event) => setModelName(event.target.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><SkillSelector agentCode="blog-review" selectedSkillIds={selectedSkillIds} onSelectedSkillIdsChange={setSelectedSkillIds} /></>}</> : result.status === "no_issues" ? <div className="rounded-lg border border-mint-300/25 bg-mint-300/10 p-4 text-sm leading-7 text-mint-100"><div className="mb-1 flex items-center gap-2 font-medium text-mint-200"><CheckCircle2 size={17} />未发现需要修改的问题</div>{result.summary}</div> : <div className="space-y-3"><div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-slate-300">{result.summary}</div>{result.suggestions.map((suggestion) => <label key={suggestion.id} className="block cursor-pointer rounded-lg border border-white/10 bg-white/[0.025] p-4 transition hover:border-mint-300/25"><div className="flex items-start gap-3"><input checked={selectedIds.includes(suggestion.id)} className="mt-1" type="checkbox" onChange={() => toggleSuggestion(suggestion.id)} /><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-md border border-red-300/25 bg-red-300/10 px-2 py-1 text-red-100">{suggestion.severity}</span><span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-300">{suggestion.category}</span></div><p className="text-sm text-slate-200">{suggestion.problem}</p><p className="text-sm leading-6 text-slate-400">建议：{suggestion.suggestion}</p><div className="rounded bg-black/20 p-2 font-mono text-xs leading-5 text-slate-400">定位：{suggestion.quote}</div><div className="grid gap-2 lg:grid-cols-2"><div className="rounded bg-red-400/5 p-2 text-xs leading-5 text-red-100"><span className="mb-1 block text-red-200">替换前</span>{suggestion.before}</div><div className="rounded bg-mint-300/5 p-2 text-xs leading-5 text-mint-100"><span className="mb-1 block text-mint-200">替换后</span>{suggestion.after}</div></div></div></div></label>)}</div>}
          {error ? <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} /><span>{error}</span></div> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4">{isReviewing ? <button className="h-11 rounded-lg border border-red-300/30 bg-red-300/10 px-4 text-sm text-red-100" type="button" onClick={() => void cancelReview()}>取消审阅</button> : <button className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300" type="button" onClick={closeDialog}>取消</button>}{result?.status === "issues_found" ? <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={selectedIds.length === 0} type="button" onClick={applySuggestions}><Pencil size={17} />应用所选建议</button> : !isReviewing ? <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!canReview} type="button" onClick={() => void handleReview()}><WandSparkles size={17} />开始审阅</button> : null}</div>
      </section>
    </div> : null}
  </>;
}

function PersonalSecretsWorkspace({
  items,
  total,
  page,
  selectedItem,
  isMobileDetailOpen,
  isLoading,
  isDetailLoading,
  loadError,
  saveError,
  copyNotice,
  copiedField,
  onClearSearch,
  onNew,
  onPageChange,
  onRefresh,
  onSelect,
  onCloseMobileDetail,
  onLoadForEdit,
  onCopyField,
}: {
  items: PersonalSecretItem[];
  total: number;
  page: number;
  selectedItem: PersonalSecretItem | null;
  isMobileDetailOpen: boolean;
  isLoading: boolean;
  isDetailLoading: boolean;
  loadError: string | null;
  saveError: string | null;
  copyNotice: string | null;
  copiedField: PersonalSecretRevealField | null;
  onClearSearch: () => void;
  onNew: () => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSelect: (item: PersonalSecretItem) => void;
  onCloseMobileDetail: () => void;
  onLoadForEdit: (secretId: number) => void;
  onCopyField: (field: PersonalSecretRevealField) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PERSONAL_SECRETS_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PERSONAL_SECRETS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PERSONAL_SECRETS_PAGE_SIZE, total);
  const [isSecretListCollapsed, setIsSecretListCollapsed] = useState(false);

  const copyButton = (field: PersonalSecretRevealField, label = "复制") => {
    const isCopied = copiedField === field;
    return (
      <button
        className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition ${
          isCopied
            ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
            : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
        }`}
        title={isCopied ? "已复制" : label}
        type="button"
        onClick={() => onCopyField(field)}
      >
        {isCopied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
        {isCopied ? "已复制" : label}
      </button>
    );
  };

  const renderDetailPanel = () => (
    <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <LockKeyhole size={17} />
            Secret Detail
          </div>
          <h2 className="text-lg font-semibold text-slate-50">{selectedItem ? selectedItem.system_name : "选择一条机密"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">字段可单独复制；整体复制会临时解密所需字段。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedItem ? (
            <>
              <button
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                disabled={isDetailLoading}
                type="button"
                onClick={() => onLoadForEdit(selectedItem.id)}
              >
                {isDetailLoading ? <Loader2 className="animate-spin" size={15} /> : <Pencil size={15} />}
                编辑
              </button>
              <button
                className={`flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${
                  copiedField === "all"
                    ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                    : "border-mint-300/30 bg-mint-300/14 text-mint-300 hover:bg-mint-300/20"
                }`}
                title={copiedField === "all" ? "已复制" : "复制整体"}
                type="button"
                onClick={() => onCopyField("all")}
              >
                {copiedField === "all" ? <ClipboardCheck size={15} /> : <Copy size={15} />}
                {copiedField === "all" ? "已复制" : "复制整体"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {saveError ? <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{saveError}</div> : null}
      {copyNotice ? <div className="mb-4 rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-2 text-sm text-mint-100">{copyNotice}</div> : null}

      {selectedItem ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <SecretDisplayField label="系统名称" value={selectedItem.system_name} action={copyButton("system_name")} />
          <SecretDisplayField label="登录地址" value={selectedItem.login_url || "未记录"} action={copyButton("login_url")} />
          <SecretDisplayField label="用户名" value={selectedItem.username_preview || "未记录"} action={copyButton("username")} />
          <SecretDisplayField label="密码" value={selectedItem.has_password ? "••••••••" : "未记录"} action={copyButton("password")} />
          <SecretDisplayField label="备注" value={selectedItem.notes_preview || "未记录"} action={copyButton("notes")} />
          <SecretDisplayField label="标签" value={selectedItem.tags || "未记录"} />
        </div>
      ) : (
        <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <div>
            <LockKeyhole className="mx-auto mb-3 text-slate-600" size={34} />
            <div className="mb-1 font-medium text-slate-300">选择一条机密</div>
            <p className="text-sm leading-6 text-slate-500">从左侧列表查看安全摘要，或点击新增创建一条记录。</p>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className={`grid gap-4 xl:gap-x-2 ${isSecretListCollapsed ? "xl:grid-cols-[28px_minmax(420px,1.1fr)]" : "xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]"}`}>
      <section className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isSecretListCollapsed ? "p-4 xl:p-0" : "p-4"}`}>
        <div className={isSecretListCollapsed ? "xl:hidden" : "xl:pr-7"}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <KeyRound size={17} />
              Personal Secrets
            </div>
            <h2 className="text-lg font-semibold text-slate-50">个人机密</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">仅展示当前账号记录；密码不会在列表中显示。</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading}
              title="刷新列表"
              type="button"
              onClick={onRefresh}
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20"
              type="button"
              onClick={onNew}
            >
              <Plus size={16} />
              新增
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {rangeStart}-{rangeEnd} / {total}
          </div>
          <FilterClearButton label="清空搜索" onClick={onClearSearch} />
        </div>

        {loadError ? (
          <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">{loadError}</div>
        ) : null}

        {isLoading ? (
          <LoadingStack />
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
            暂无个人机密记录。
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedItem?.id === item.id
                    ? "border-mint-300/35 bg-mint-300/10"
                    : "border-white/10 bg-white/[0.025] hover:border-mint-300/25 hover:bg-white/[0.04]"
                }`}
                type="button"
                onClick={() => onSelect(item)}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 font-medium text-slate-100">{item.system_name}</div>
                  <span className="shrink-0 text-xs text-slate-500">#{item.id}</span>
                </div>
                <div className="truncate text-xs text-slate-500">{item.login_url || "未记录登录地址"}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {item.username_preview ? <span>用户 {item.username_preview}</span> : null}
                  {item.tags ? <span>{item.tags}</span> : null}
                </div>
              </button>
            ))}

            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={page <= 1}
                title="上一页"
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                disabled={page >= totalPages}
                title="下一页"
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
        </div>
        <WorkspaceSidebarCollapseToggle isCollapsed={isSecretListCollapsed} label="个人机密列表" onToggle={() => setIsSecretListCollapsed((collapsed) => !collapsed)} />
      </section>

      <div className="hidden xl:block">{renderDetailPanel()}</div>

      <PersonalSecretDetailDialog
        isBusy={isDetailLoading}
        isOpen={isMobileDetailOpen && selectedItem !== null}
        title={selectedItem?.system_name || "个人机密详情"}
        onClose={onCloseMobileDetail}
      >
        {renderDetailPanel()}
      </PersonalSecretDetailDialog>
    </div>
  );
}

function PersonalSecretDetailDialog({
  children,
  isBusy,
  isOpen,
  title,
  onClose,
}: {
  children: React.ReactNode;
  isBusy: boolean;
  isOpen: boolean;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm xl:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <section aria-label="个人机密详情" aria-modal="true" className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-950 shadow-soft-glow" role="dialog">
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <LockKeyhole size={17} />
                Secret Detail
              </div>
              <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">{title}</h2>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isBusy}
              title="关闭"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3" data-session-scroll="personal-secret-detail">{children}</div>
      </section>
    </div>
  );
}

function SecretDisplayField({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-400">{label}</div>
        {action}
      </div>
      <div className="break-words text-sm leading-6 text-slate-300 [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}

function PersonalSecretEditorDialog({
  draft,
  isDeleting,
  isOpen,
  isSaving,
  saveError,
  selectedItem,
  onClose,
  onDelete,
  onDraftChange,
  onSave,
}: {
  draft: PersonalSecretDraft;
  isDeleting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  saveError: string | null;
  selectedItem: PersonalSecretItem | null;
  onClose: () => void;
  onDelete: () => void;
  onDraftChange: (draft: PersonalSecretDraft) => void;
  onSave: () => void;
}) {
  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <section
        aria-modal="true"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-950 shadow-soft-glow sm:max-h-[calc(100dvh-48px)] sm:max-w-3xl sm:rounded-lg"
        role="dialog"
      >
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Pencil size={17} />
                Secret Editor
              </div>
              <h2 className="line-clamp-2 text-lg font-semibold text-slate-50">{selectedItem ? "编辑机密" : "新增机密"}</h2>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isBusy}
              title="关闭"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <PersonalSecretEditorForm
            draft={draft}
            isDeleting={isDeleting}
            isSaving={isSaving}
            saveError={saveError}
            selectedItem={selectedItem}
            onDelete={onDelete}
            onDraftChange={onDraftChange}
            onSave={onSave}
          />
        </div>
      </section>
    </div>
  );
}

function PersonalSecretEditorForm({
  draft,
  isDeleting,
  isSaving,
  saveError,
  selectedItem,
  onDelete,
  onDraftChange,
  onSave,
}: {
  draft: PersonalSecretDraft;
  isDeleting: boolean;
  isSaving: boolean;
  saveError: string | null;
  selectedItem: PersonalSecretItem | null;
  onDelete: () => void;
  onDraftChange: (draft: PersonalSecretDraft) => void;
  onSave: () => void;
}) {
  const canSave = draft.system_name.trim().length > 0 && !isSaving && !isDeleting;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="系统名称" icon={<Database size={16} />}>
          <input
            className="control"
            maxLength={200}
            value={draft.system_name}
            onChange={(event) => onDraftChange({ ...draft, system_name: event.target.value })}
          />
        </Field>
        <Field label="登录地址" icon={<Globe size={16} />}>
          <input
            className="control"
            autoComplete="off"
            maxLength={1000}
            value={draft.login_url}
            onChange={(event) => onDraftChange({ ...draft, login_url: event.target.value })}
          />
        </Field>
        <Field label="用户名" icon={<UserCog size={16} />}>
          <input
            className="control"
            autoComplete="off"
            maxLength={500}
            value={draft.username}
            onChange={(event) => onDraftChange({ ...draft, username: event.target.value })}
          />
        </Field>
        <Field label="密码" icon={<KeyRound size={16} />}>
          <input
            className="control"
            autoComplete="new-password"
            maxLength={4000}
            type="password"
            value={draft.password}
            onChange={(event) => onDraftChange({ ...draft, password: event.target.value })}
          />
        </Field>
        <Field label="标签" icon={<Tags size={16} />}>
          <input
            className="control"
            maxLength={500}
            value={draft.tags}
            onChange={(event) => onDraftChange({ ...draft, tags: event.target.value })}
          />
        </Field>
      </div>
      <Field label="备注" icon={<FileText size={16} />}>
        <textarea
          className="control min-h-[120px] resize-y leading-7"
          maxLength={4000}
          value={draft.notes}
          onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
        />
      </Field>

      {saveError ? <div className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{saveError}</div> : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <button
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
          disabled={!canSave}
          type="button"
          onClick={onSave}
        >
          {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
          {isSaving ? "保存中" : selectedItem ? "保存修改" : "保存机密"}
        </button>
        {selectedItem ? (
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-300/20 bg-red-400/10 px-4 text-sm text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
            disabled={isDeleting || isSaving}
            type="button"
            onClick={onDelete}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
            删除
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatPersonalSecretAllCopy(values: Record<string, string | null>) {
  return [
    `系统名称：${values.system_name || "未填写"}`,
    `登录地址：${values.login_url || "未填写"}`,
    `用户名：${values.username || "未填写"}`,
    `密码：${values.password || "未填写"}`,
    `备注：${values.notes || "未填写"}`,
    `标签：${values.tags || "未填写"}`,
  ].join("\n");
}

function TodoWorkspace({
  authUser,
  items,
  total,
  page,
  selectedId,
  username,
  isMobileEditorOpen,
  draft,
  status,
  isLoading,
  isDetailLoading,
  isSaving,
  isConvertingToKnowledge,
  loadError,
  saveError,
  hasUnsavedChanges,
  hasCopiedContent,
  canSelectPrevious,
  canSelectNext,
  onDraftChange,
  onClearFilters,
  onPageChange,
  onSelect,
  onSelectAdjacent,
  onCopyContent,
  onConvertToKnowledge,
  onCloseMobileEditor,
  onStatusFilterChange,
  onUsernameFilterChange,
  onSubmit,
}: {
  authUser: AuthUser | null;
  items: TodoItem[];
  total: number;
  page: number;
  selectedId: number | null;
  username: string;
  isMobileEditorOpen: boolean;
  draft: TodoDraft;
  status: TodoStatus | "all";
  isLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  isConvertingToKnowledge: boolean;
  loadError: string | null;
  saveError: string | null;
  hasUnsavedChanges: boolean;
  hasCopiedContent: boolean;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  onDraftChange: (draft: TodoDraft) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onSelect: (item: TodoItem) => void;
  onSelectAdjacent: (direction: "previous" | "next") => void;
  onCopyContent: () => void;
  onConvertToKnowledge: () => void;
  onCloseMobileEditor: () => void;
  onStatusFilterChange: (status: TodoStatus | "all") => void;
  onUsernameFilterChange: (username: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [taskContentView, setTaskContentView] = useState<"edit" | "preview">("edit");
  const [taskPreviewAnchor, setTaskPreviewAnchor] = useState("");
  const taskEditorRef = useRef<MarkdownImageTextareaHandle | null>(null);
  const taskViewportRef = useRef<MarkdownEditorViewport | null>(null);
  const markdownViewShortcutLabel = getMarkdownViewToggleShortcutLabel();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isTodoListCollapsed, setIsTodoListCollapsed] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / TODO_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * TODO_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * TODO_PAGE_SIZE, total);
  const statusOptions: Array<{ label: string; value: TodoStatus | "all" }> = [
    { label: "全部状态", value: "all" },
    { label: "待处理", value: "待处理" },
    { label: "处理中", value: "处理中" },
    { label: "已完成", value: "已完成" },
  ];
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  const activeFilterCount = [username, status === "all" ? "" : status].filter(Boolean).length;
  const canSave =
    selectedId !== null &&
    draft.title.trim().length > 0 &&
    draft.content.trim().length > 0 &&
    !isSaving &&
    !isConvertingToKnowledge;
  const canCopyContent = selectedId !== null && (draft.title.trim().length > 0 || draft.content.trim().length > 0);

  useEffect(() => {
    if (selectedId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !isMarkdownViewToggleShortcut(event)) return;
      event.preventDefault();
      setTaskContentDisplay(taskContentView === "edit" ? "preview" : "edit");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, taskContentView]);

  useEffect(() => {
    if (taskContentView !== "edit" || !taskViewportRef.current) return;
    taskEditorRef.current?.restoreViewport(taskViewportRef.current);
  }, [taskContentView]);

  function setTaskContentDisplay(nextView: "edit" | "preview") {
    if (nextView === taskContentView) return;
    if (taskContentView === "edit") {
      const viewport = taskEditorRef.current?.getViewport();
      if (viewport) {
        taskViewportRef.current = viewport;
        setTaskPreviewAnchor(getMarkdownPreviewAnchor(draft.content, viewport.selectionStart));
      }
    }
    setTaskContentView(nextView);
  }
  const todoDetailPanel = (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <Pencil size={17} />
            Todo Detail
          </div>
          <h2 className="text-lg font-semibold text-slate-50">编辑待办事项</h2>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-start">
          <button
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600 sm:flex-none"
            disabled={!canSelectPrevious}
            title="上一条待办事项"
            type="button"
            onClick={() => onSelectAdjacent("previous")}
          >
            <ChevronLeft size={16} />
            上一条
          </button>
          <button
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600 sm:flex-none"
            disabled={!canSelectNext}
            title="下一条待办事项"
            type="button"
            onClick={() => onSelectAdjacent("next")}
          >
            下一条
            <ChevronRight size={16} />
          </button>
          {isDetailLoading ? <Loader2 className="shrink-0 animate-spin text-mint-300" size={17} /> : null}
        </div>
      </div>

      {selectedId !== null && hasUnsavedChanges ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
          <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
          <span>当前修改尚未保存。你可以先切换到其他待办，未保存内容会按事项暂存在本地，返回后可继续编辑。</span>
        </div>
      ) : null}

      {selectedId !== null ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="任务目标" icon={<Sparkles size={16} />}>
            <input
              className="control"
              maxLength={4000}
              value={draft.title}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              placeholder="任务目标"
            />
          </Field>

          <div className="block min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-slate-500"><FileText size={16} /></span>
                任务内容
              </div>
              <div className="flex rounded-lg border border-white/10 bg-white/[0.025] p-1 text-xs" role="group" aria-label="任务内容显示模式">
                <button
                  className={`rounded-md px-3 py-1.5 transition ${
                    taskContentView === "edit" ? "bg-mint-300/15 text-mint-200" : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-keyshortcuts={/Macintosh|Mac OS X/.test(navigator.userAgent) ? "Meta+Backslash" : "Control+Backslash"}
                  title={`切换到编辑（${markdownViewShortcutLabel}）`}
                  type="button"
                  onClick={() => setTaskContentDisplay("edit")}
                >
                  编辑
                </button>
                <button
                  className={`rounded-md px-3 py-1.5 transition ${
                    taskContentView === "preview" ? "bg-mint-300/15 text-mint-200" : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-keyshortcuts={/Macintosh|Mac OS X/.test(navigator.userAgent) ? "Meta+Backslash" : "Control+Backslash"}
                  title={`切换到 Markdown 预览（${markdownViewShortcutLabel}）`}
                  type="button"
                  onClick={() => setTaskContentDisplay("preview")}
                >
                  Markdown 预览
                </button>
              </div>
            </div>
            {taskContentView === "edit" ? (
              <MarkdownImageTextarea
                ref={taskEditorRef}
                className="control min-h-[320px] resize-none leading-7 xl:min-h-[380px]"
                value={draft.content}
                onChange={(content) => onDraftChange({ ...draft, content })}
                placeholder="补充待办事项背景、验收标准或下一步动作。"
              />
            ) : draft.content.trim() ? (
              <MarkdownPreview markdown={draft.content} scrollAnchor={taskPreviewAnchor} />
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-4 text-center text-sm text-slate-500 xl:min-h-[380px]">
                暂无任务内容可预览。
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="来源" icon={<Database size={16} />}>
              <input
                className="control"
                maxLength={200}
                value={draft.source}
                onChange={(event) => onDraftChange({ ...draft, source: event.target.value })}
                placeholder="manual / internal"
              />
            </Field>
            <Field label="标签" icon={<Tags size={16} />}>
              <input
                className="control"
                maxLength={100}
                value={draft.topic_tag}
                onChange={(event) => onDraftChange({ ...draft, topic_tag: event.target.value })}
                placeholder="APEX,TODO"
              />
            </Field>
          </div>

          <Field label="状态" icon={<CheckCircle2 size={16} />}>
            <TodoStatusSegmentedControl value={draft.todo_status} onChange={(todo_status) => onDraftChange({ ...draft, todo_status })} />
          </Field>

          {saveError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{saveError}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canSave}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Pencil size={18} />}
              {isSaving ? "保存中" : "保存待办事项"}
            </button>
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-500"
              disabled={!canCopyContent}
              title={hasCopiedContent ? "已复制" : "复制当前待办内容"}
              type="button"
              onClick={onCopyContent}
            >
              {hasCopiedContent ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {hasCopiedContent ? "已复制" : "复制内容"}
            </button>
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-4 font-medium text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isSaving || isConvertingToKnowledge}
              type="button"
              onClick={onConvertToKnowledge}
            >
              {isConvertingToKnowledge ? <Loader2 className="animate-spin" size={18} /> : <BookOpenCheck size={18} />}
              {isConvertingToKnowledge ? "转换中" : "转为知识"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
          <div>
            <ClipboardCheck className="mx-auto mb-3 text-slate-600" size={36} />
            <div className="mb-1 font-medium text-slate-300">选择一条待办事项</div>
            <p className="text-sm leading-6 text-slate-500">右侧会显示完整内容，并允许编辑内容和状态。</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={`grid flex-1 gap-4 px-4 pb-4 pt-2 xl:gap-x-2 ${isTodoListCollapsed ? "xl:grid-cols-[28px_minmax(520px,1.2fr)]" : "xl:grid-cols-[minmax(340px,0.8fr)_minmax(520px,1.2fr)]"}`}>
      <section className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isTodoListCollapsed ? "p-4 xl:p-0" : "p-4"}`}>
        <div className={isTodoListCollapsed ? "xl:hidden" : "xl:pr-7"}>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <ClipboardCheck size={17} />
              AI_TODO_ITEMS
            </div>
            <h2 className="text-xl font-semibold text-slate-50">待办事项列表</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
            {total} 条匹配
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="text-mint-300" size={16} />
              查询条件
              {activeFilterCount > 0 ? <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-1.5 py-0.5 text-[11px] font-medium text-mint-200">已筛选 {activeFilterCount} 项</span> : null}
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200" type="button" aria-expanded={isFiltersExpanded} onClick={() => setIsFiltersExpanded((expanded) => !expanded)}>
              {isFiltersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {isFiltersExpanded ? "收起" : "展开"}
            </button>
          </div>
          {isFiltersExpanded ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]">
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={hasSingleVisibleUser}
              value={username}
              onChange={(event) => onUsernameFilterChange(event.target.value)}
            >
              <option value="">{allUsersLabel}</option>
              {visibleUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </Field>
          <Field label="待办状态" icon={<CheckCircle2 size={16} />}>
            <select
              className="control"
              value={status}
              onChange={(event) => onStatusFilterChange(event.target.value as TodoStatus | "all")}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <FilterClearButton className="sm:mt-7" label="清空筛选条件" onClick={onClearFilters} />
          </div>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingStack />
        ) : loadError ? (
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
              <TriangleAlert size={16} />
              待办事项读取失败
            </div>
            <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <ClipboardCheck className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">没有匹配的待办事项</div>
              <p className="text-sm text-slate-500">在信息录入勾选待办事项后，这里会显示记录。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`cursor-pointer rounded-lg border bg-white/[0.028] p-4 transition ${
                  selectedId === item.id ? "border-mint-300/45 bg-mint-300/[0.055]" : "border-white/10 hover:border-white/18"
                }`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>{formatHistoryDate(item.created_at)}</span>
                      {item.updated_at ? <span>更新 {formatHistoryDate(item.updated_at)}</span> : null}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-50">{item.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${todoStatusStyles[item.todo_status]}`}>
                    {item.todo_status}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-400">{item.content}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.source ? (
                    <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
                      {item.source}
                    </span>
                  ) : null}
                  {item.topic_tag ? (
                    <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
                      {item.topic_tag}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}

            <div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {rangeStart}-{rangeEnd} / {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page <= 1}
                  title="上一页"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-16 text-center text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page >= totalPages}
                  title="下一页"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        <WorkspaceSidebarCollapseToggle isCollapsed={isTodoListCollapsed} label="待办事项列表" onToggle={() => setIsTodoListCollapsed((collapsed) => !collapsed)} />
      </section>

      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        {todoDetailPanel}
      </aside>

      <MobileEditorSheet
        icon={<Pencil size={17} />}
        isBusy={isDetailLoading || isSaving || isConvertingToKnowledge}
        isOpen={isMobileEditorOpen && selectedId !== null}
        label="Todo Detail"
        title="编辑待办事项"
        onClose={onCloseMobileEditor}
      >
        <div className="rounded-lg border border-white/10 bg-ink-900/64 p-4">
          {todoDetailPanel}
        </div>
      </MobileEditorSheet>
    </div>
  );
}

function CurrentRecordsWorkspace({
  items,
  total,
  page,
  options,
  authUser,
  draft,
  selectedItem,
  isLoading,
  isOptionsLoading,
  isSaving,
  isUpdating,
  loadError,
  saveError,
  filters,
  onDraftChange,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onSelect,
  onSubmit,
  onUpdate,
  onCloseEditor,
}: {
  items: CurrentRecordItem[];
  total: number;
  page: number;
  options: CurrentRecordOptions;
  authUser: AuthUser | null;
  draft: { username: string; type: string; content: string };
  selectedItem: CurrentRecordItem | null;
  isLoading: boolean;
  isOptionsLoading: boolean;
  isSaving: boolean;
  isUpdating: boolean;
  loadError: string | null;
  saveError: string | null;
  filters: CurrentRecordFilters;
  onDraftChange: (draft: { username: string; type: string; content: string }) => void;
  onFilterChange: (filters: Partial<CurrentRecordFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onSelect: (item: CurrentRecordItem) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (record: CurrentRecordItem, next: { week: CurrentWeek; day: CurrentDay; content: string }) => void;
  onCloseEditor: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / CURRENT_RECORDS_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * CURRENT_RECORDS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * CURRENT_RECORDS_PAGE_SIZE, total);
  const canSubmit = draft.username.trim().length > 0 && draft.type.trim().length > 0 && !isSaving;
  const currentTypeOptions = filters.username ? options.user_types[filters.username] ?? [] : options.types;
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && options.users.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const activeFilterCount = [filters.username, filters.type, filters.week, filters.day, filters.learnLevel].filter(Boolean).length;
  const wasCreateSavingRef = useRef(isSaving);

  useEffect(() => {
    if (
      isCreateDialogOpen &&
      wasCreateSavingRef.current &&
      !isSaving &&
      !saveError &&
      !draft.type.trim() &&
      !draft.content.trim()
    ) {
      setIsCreateDialogOpen(false);
    }

    wasCreateSavingRef.current = isSaving;
  }, [draft.content, draft.type, isCreateDialogOpen, isSaving, saveError]);

  return (
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(440px,1fr)_320px]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <ClipboardList size={17} />
              Current Queue
            </div>
            <h2 className="text-xl font-semibold text-slate-50">当前记录列表</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              className="flex h-10 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/12 px-4 text-sm font-medium text-mint-200 transition hover:bg-mint-300/18"
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus size={16} />
              新增分类
            </button>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
              {total} 条匹配
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="text-mint-300" size={16} />
              查询条件
              {activeFilterCount > 0 ? <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-1.5 py-0.5 text-[11px] font-medium text-mint-200">已筛选 {activeFilterCount} 项</span> : null}
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200" type="button" aria-expanded={isFiltersExpanded} onClick={() => setIsFiltersExpanded((expanded) => !expanded)}>
              {isFiltersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {isFiltersExpanded ? "收起" : "展开"}
            </button>
          </div>
          {isFiltersExpanded ? (
          <>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={hasSingleVisibleUser}
              value={filters.username}
              onChange={(event) => {
                const username = event.target.value;
                const nextTypeOptions = username ? options.user_types[username] ?? [] : options.types;
                onFilterChange({
                  username,
                  type: filters.type && !nextTypeOptions.includes(filters.type) ? "" : filters.type,
                });
              }}
            >
              <option value="">{allUsersLabel}</option>
              {options.users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </Field>
          <Field label="类型" icon={<Tags size={16} />}>
            <select className="control" value={filters.type} onChange={(event) => onFilterChange({ type: event.target.value })}>
              <option value="">全部类型</option>
              {currentTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week / Day" icon={<CalendarClock size={16} />}>
            <div className="grid grid-cols-2 gap-2">
              <select className="control" value={filters.week} onChange={(event) => onFilterChange({ week: event.target.value })}>
                <option value="">全部</option>
                {options.weeks.map((week) => (
                  <option key={week} value={week}>
                    {week}
                  </option>
                ))}
              </select>
              <select className="control" value={filters.day} onChange={(event) => onFilterChange({ day: event.target.value })}>
                <option value="">全部</option>
                {options.days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Level" icon={<CircleGauge size={16} />}>
            <select
              className="control"
              value={filters.learnLevel}
              onChange={(event) => onFilterChange({ learnLevel: event.target.value })}
            >
              <option value="">全部等级</option>
              {options.learn_levels.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
          <Field label="排序字段" icon={<ChartLine size={16} />}>
            <select
              className="control"
              value={filters.sortBy}
              onChange={(event) => onFilterChange({ sortBy: event.target.value as CurrentRecordFilters["sortBy"] })}
            >
              <option value="id">ID</option>
              <option value="type">类型</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="username">用户</option>
              <option value="learn_level">等级</option>
            </select>
          </Field>
          <Field label="方向" icon={<ChartLine size={16} />}>
            <select
              className="control"
              value={filters.sortDir}
              onChange={(event) => onFilterChange({ sortDir: event.target.value as CurrentRecordFilters["sortDir"] })}
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </Field>
          <FilterClearButton className="col-span-2 w-full md:col-span-1 md:mt-7 md:w-auto" label="清空筛选条件" onClick={onClearFilters} />
        </div>
          </>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingStack />
        ) : loadError ? (
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
              <TriangleAlert size={16} />
              当前记录读取失败
            </div>
            <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <FilePlus2 className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">没有匹配的当前记录</div>
              <p className="text-sm text-slate-500">新增一个用户类型后，这里会显示当前进度。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.028] p-4 transition hover:border-white/18"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
              >
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>{item.username}</span>
                      <span>{item.week}</span>
                      <span>{item.day}</span>
                      <span>Level {item.learn_level ?? 1}</span>
                    </div>
                    <h3 className="line-clamp-1 text-sm font-semibold text-slate-50">{item.type}</h3>
                  </div>
                  <button
                    className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-xs font-medium text-mint-200 transition hover:bg-mint-300/16"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(item);
                    }}
                  >
                    <Pencil size={14} />
                    编辑
                  </button>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-400">{item.content || "当前内容未填写"}</p>
              </article>
            ))}

            <div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {rangeStart}-{rangeEnd} / {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page <= 1}
                  title="上一页"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-16 text-center text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page >= totalPages}
                  title="下一页"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <TriangleAlert size={17} />
            Trigger Rules
          </div>
          <h2 className="text-lg font-semibold text-slate-50">同步规则</h2>
        </div>
        <div className="space-y-3 text-sm leading-6 text-slate-400">
          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
            保存只写入 <span className="text-slate-200">T_CURRENT</span>，历史记录由数据库触发器同步。
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
            只改内容会修正当前 <span className="text-slate-200">week/day</span> 的历史记录。
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
            改 week 或 day 表示推进到新的记录点；week 只能前进一周，W48 后回到 W1。
          </div>
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-amber-100">
            不开放删除，因为删除 T_CURRENT 也会触发写入 T_HISTORY。
          </div>
        </div>
      </aside>

      <CurrentRecordEditDialog
        item={selectedItem}
        isUpdating={isUpdating}
        options={options}
        onCancel={onCloseEditor}
        onConfirm={onUpdate}
      />

      <CurrentRecordCreateDialog
        canSubmit={canSubmit}
        draft={draft}
        hasSingleVisibleUser={hasSingleVisibleUser}
        isOpen={isCreateDialogOpen}
        isOptionsLoading={isOptionsLoading}
        isSaving={isSaving}
        options={options}
        saveError={saveError}
        onClose={() => setIsCreateDialogOpen(false)}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function CurrentRecordCreateDialog({
  isOpen,
  options,
  draft,
  isOptionsLoading,
  hasSingleVisibleUser,
  isSaving,
  canSubmit,
  saveError,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  isOpen: boolean;
  options: CurrentRecordOptions;
  draft: { username: string; type: string; content: string };
  isOptionsLoading: boolean;
  hasSingleVisibleUser: boolean;
  isSaving: boolean;
  canSubmit: boolean;
  saveError: string | null;
  onClose: () => void;
  onDraftChange: (draft: { username: string; type: string; content: string }) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/62 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <section
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[92vh]"
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <FilePlus2 size={17} />
              T_CURRENT
            </div>
            <h2 className="text-lg font-semibold text-slate-50">新增当前分类</h2>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isSaving}
            title="关闭"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <form className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5" onSubmit={onSubmit}>
          <div className="space-y-4">
            <Field label="用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                disabled={isOptionsLoading || hasSingleVisibleUser}
                value={draft.username}
                onChange={(event) => onDraftChange({ ...draft, username: event.target.value })}
              >
                <option value="">选择用户</option>
                {options.users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="新类型" icon={<Tags size={16} />}>
              <input
                className="control"
                list="current-record-type-options"
                maxLength={40}
                value={draft.type}
                onChange={(event) => onDraftChange({ ...draft, type: event.target.value })}
                placeholder="输入新的 type"
              />
              <datalist id="current-record-type-options">
                {options.types.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <MetricTile icon={<CalendarClock size={17} />} label="默认周" value="W1" detail="新增类型起点" />
              <MetricTile icon={<CalendarClock size={17} />} label="默认天" value="D1" detail="第一天" />
              <MetricTile icon={<CircleGauge size={17} />} label="等级" value="1" detail="初始级别" />
            </div>

            <Field label="内容" icon={<FileText size={16} />}>
              <textarea
                className="control min-h-[220px] resize-none leading-7"
                maxLength={4000}
                value={draft.content}
                onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
                placeholder="可留空，后续从列表中编辑当前记录补充。"
              />
            </Field>

            {saveError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                <span>{saveError}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isSaving}
              type="button"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canSubmit}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              {isSaving ? "写入中" : "新增到 T_CURRENT"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EnglishMaterialsWorkspace({
  authUser,
  items,
  total,
  page,
  selectedItem,
  isDetailOpen,
  isCreateOpen,
  draft,
  detailDraft,
  isLoading,
  isDetailLoading,
  isSaving,
  isDetailSaving,
  copiedLabel,
  loadError,
  saveError,
  isVectorRefreshing,
  modelOptions,
  filters,
  onDraftChange,
  onFilterChange,
  onRefreshVectors,
  onClearFilters,
  onClearCreateDraft,
  onCloseCreate,
  onCloseDetail,
  onCopyText,
  onDetailDraftChange,
  onPageChange,
  onSaveDetail,
  onSelect,
  onOpenCreate,
  onSubmit,
}: {
  authUser: AuthUser | null;
  items: EnglishMaterialItem[];
  total: number;
  page: number;
  selectedItem: EnglishMaterialItem | null;
  isDetailOpen: boolean;
  isCreateOpen: boolean;
  draft: EnglishMaterialDraft;
  detailDraft: EnglishMaterialDraft;
  isLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  isDetailSaving: boolean;
  copiedLabel: string | null;
  loadError: string | null;
  saveError: string | null;
  isVectorRefreshing: boolean;
  modelOptions: { value: string; label: string }[];
  filters: EnglishMaterialFilters;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
  onFilterChange: (filters: Partial<EnglishMaterialFilters>) => void;
  onRefreshVectors: () => void;
  onClearFilters: () => void;
  onClearCreateDraft: () => void;
  onCloseCreate: () => void;
  onCloseDetail: () => void;
  onCopyText: (value: string, label: string) => void;
  onDetailDraftChange: (draft: EnglishMaterialDraft) => void;
  onPageChange: (page: number) => void;
  onSaveDetail: () => void;
  onSelect: (item: EnglishMaterialItem) => void;
  onOpenCreate: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / ENGLISH_MATERIALS_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * ENGLISH_MATERIALS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * ENGLISH_MATERIALS_PAGE_SIZE, total);
  const canSubmit = draft.base_expression.trim().length > 0 && !isSaving;
  const selectedIndex = selectedItem ? items.findIndex((item) => item.id === selectedItem.id) : -1;
  const previousItem = selectedIndex > 0 ? items[selectedIndex - 1] : null;
  const nextItem = selectedIndex >= 0 && selectedIndex < items.length - 1 ? items[selectedIndex + 1] : null;
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isEnglishMaterialListCollapsed, setIsEnglishMaterialListCollapsed] = useState(false);
  const [semanticQueryDraft, setSemanticQueryDraft] = useState(filters.semanticQuery);
  useEffect(() => setSemanticQueryDraft(filters.semanticQuery), [filters.semanticQuery]);
  const activeFilterCount = [filters.username, filters.semanticQuery, filters.category, filters.flag, filters.vectorStatus === "all" ? "" : filters.vectorStatus].filter(Boolean).length;
  const hasCreateDraft = Boolean(
    draft.title.trim() ||
      draft.sequence_no ||
      draft.base_expression.trim() ||
      draft.professional_sentence.trim() ||
      draft.chinese_translation.trim() ||
      draft.full_script.trim(),
  );

  return (
    <div className={`grid flex-1 gap-4 px-4 pb-4 pt-2 xl:gap-x-2 ${isEnglishMaterialListCollapsed ? "xl:grid-cols-[28px_minmax(0,1fr)]" : "xl:grid-cols-[minmax(520px,1fr)_380px]"}`}>
      <section className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isEnglishMaterialListCollapsed ? "p-4 xl:p-0" : "p-4"}`}>
        <div className={isEnglishMaterialListCollapsed ? "xl:hidden" : "xl:pr-7"}>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <BookOpenCheck size={17} />
              T_ENGLISH
            </div>
            <h2 className="text-xl font-semibold text-slate-50">英语素材列表</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
              {total} 条素材
            </div>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 xl:hidden"
              type="button"
              onClick={onOpenCreate}
            >
              <Plus size={16} />
              {hasCreateDraft ? "继续录入" : "录入素材"}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Filter className="text-mint-300" size={16} />
              查询条件
              {activeFilterCount > 0 ? <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-1.5 py-0.5 text-[11px] font-medium text-mint-200">已筛选 {activeFilterCount} 项</span> : null}
            </div>
            <div className="flex items-center gap-2">
              {authUser?.is_admin ? <VectorRefreshButton isRefreshing={isVectorRefreshing} onRefresh={onRefreshVectors} /> : null}
              <button className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200" type="button" aria-expanded={isFiltersExpanded} onClick={() => setIsFiltersExpanded((expanded) => !expanded)}>
                {isFiltersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {isFiltersExpanded ? "收起" : "展开"}
              </button>
            </div>
          </div>
          {isFiltersExpanded ? (
          <div className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(130px,0.42fr)_minmax(130px,0.42fr)]">
          <SemanticSearchField
            isActive={Boolean(filters.semanticQuery)}
            value={semanticQueryDraft}
            placeholder="按完整脚本语义检索"
            onChange={setSemanticQueryDraft}
            onSearch={() => onFilterChange({ semanticQuery: semanticQueryDraft.trim() })}
          />
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={hasSingleVisibleUser}
              value={filters.username}
              onChange={(event) => onFilterChange({ username: event.target.value })}
            >
              <option value="">{allUsersLabel}</option>
              {visibleUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </Field>
          <Field label="分类标识" icon={<Tags size={16} />}>
            <select
              className="control"
              value={filters.category}
              onChange={(event) => onFilterChange({ category: event.target.value })}
            >
              <option value="">全部分类</option>
              {ENGLISH_MATERIAL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(150px,0.85fr)_minmax(360px,1fr)_auto] md:items-end">
          <Field label="发布状态" icon={<CircleGauge size={16} />}>
            <select
              className="control"
              value={filters.flag}
              onChange={(event) => onFilterChange({ flag: event.target.value as EnglishMaterialFilters["flag"] })}
            >
              <option value="">全部状态</option>
              <option value="0">{englishMaterialFlagLabels["0"]}</option>
              <option value="1">{englishMaterialFlagLabels["1"]}</option>
            </select>
          </Field>
          <Field label="向量状态" icon={<Database size={16} />}>
            <select className="control" value={filters.vectorStatus} onChange={(event) => onFilterChange({ vectorStatus: event.target.value as EnglishMaterialFilters["vectorStatus"] })}>
              <option value="all">全部</option>
              <option value="1">待更新</option>
              <option value="0">已就绪</option>
            </select>
          </Field>
          <Field label="排序" icon={<ChartLine size={16} />}>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="control"
                value={filters.sortBy}
                onChange={(event) => onFilterChange({ sortBy: event.target.value as EnglishMaterialFilters["sortBy"] })}
              >
                <option value="id">ID</option>
                <option value="sequence_no">序号</option>
                <option value="category">分类</option>
                <option value="base_expression">基础表达</option>
                <option value="title">标题</option>
                <option value="flag">发布状态</option>
              </select>
              <select
                className="control"
                value={filters.sortDir}
                onChange={(event) => onFilterChange({ sortDir: event.target.value as EnglishMaterialFilters["sortDir"] })}
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </Field>
          <FilterClearButton label="清空筛选条件" onClick={onClearFilters} />
          </div>
          </div>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingStack />
        ) : loadError ? (
          <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
              <TriangleAlert size={16} />
              英语素材读取失败
            </div>
            <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <BookOpenCheck className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">没有匹配的英语素材</div>
              <p className="text-sm text-slate-500">新增素材后，这里会展示 `T_ENGLISH` 记录。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const active = selectedItem?.id === item.id;
              return (
                <article
                  key={item.id}
                  className={`cursor-pointer rounded-lg border p-4 transition ${
                    active ? "border-mint-300/25 bg-mint-300/8" : "border-white/10 bg-white/[0.028] hover:border-white/18"
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item);
                    }
                  }}
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>#{item.id}</span>
                        <span>序号 {item.sequence_no ?? "-"}</span>
                        <span>{item.category || "未分类"}</span>
                        <span
                          className={`rounded-md border px-2 py-1 ${
                            englishMaterialFlagStyles[item.flag === 1 ? "1" : "0"]
                          }`}
                        >
                          {englishMaterialFlagLabels[item.flag === 1 ? "1" : "0"]}
                        </span>
                      </div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-slate-50">
                        {item.title || item.base_expression || "未命名素材"}
                      </h3>
                      {item.similarity !== null ? (
                        <span className="mt-2 inline-block rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-200">相似度 {(item.similarity * 100).toFixed(1)}%</span>
                      ) : null}
                      <span className="mt-2 inline-block"><VectorStatusBadge value={item.v_needs_update} /></span>
                    </div>
                    <button
                      className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-xs font-medium text-mint-200 transition hover:bg-mint-300/16"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(item);
                      }}
                    >
                      <Search size={14} />
                      打开
                    </button>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-300">{item.base_expression || "基础表达未填写"}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.chinese_translation || "中文翻译未填写"}</p>
                </article>
              );
            })}

            <div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {rangeStart}-{rangeEnd} / {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page <= 1}
                  title="上一页"
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-16 text-center text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={page >= totalPages}
                  title="下一页"
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        <WorkspaceSidebarCollapseToggle isCollapsed={isEnglishMaterialListCollapsed} label="英语素材列表" onToggle={() => setIsEnglishMaterialListCollapsed((collapsed) => !collapsed)} />
      </section>

      <section className="hidden min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl xl:block">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <Plus size={17} />
            New Material
          </div>
          <h2 className="text-xl font-semibold text-slate-50">录入英语素材</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <EnglishMaterialAiGeneration draft={draft} modelOptions={modelOptions} onGenerated={onDraftChange} onOpen={() => setIsEnglishMaterialListCollapsed(true)} />
            <EnglishMaterialAiCompletion draft={draft} disabled={isSaving} modelOptions={modelOptions} onCompleted={onDraftChange} onOpen={() => setIsEnglishMaterialListCollapsed(true)} />
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <EnglishMaterialCreateFields draft={draft} onDraftChange={onDraftChange} />

          {saveError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{saveError}</span>
            </div>
          ) : null}

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!canSubmit}
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {isSaving ? "写入中" : "保存到 T_ENGLISH"}
          </button>
        </form>
      </section>

      <EnglishMaterialCreateDialog
        draft={draft}
        hasDraft={hasCreateDraft}
        isOpen={isCreateOpen}
        isSaving={isSaving}
        saveError={saveError}
        onClearDraft={onClearCreateDraft}
        onClose={onCloseCreate}
        onDraftChange={onDraftChange}
        modelOptions={modelOptions}
        onSubmit={onSubmit}
      />

      <EnglishMaterialDetailDialog
        copiedLabel={copiedLabel}
        draft={detailDraft}
        isLoading={isDetailLoading}
        isSaving={isDetailSaving}
        item={isDetailOpen ? selectedItem : null}
        modelOptions={modelOptions}
        nextItem={nextItem}
        onClose={onCloseDetail}
        onCopyText={onCopyText}
        onDraftChange={onDetailDraftChange}
        onNext={nextItem ? () => onSelect(nextItem) : undefined}
        onPrevious={previousItem ? () => onSelect(previousItem) : undefined}
        onSave={onSaveDetail}
        previousItem={previousItem}
      />
    </div>
  );
}

function EnglishMaterialCreateFields({
  draft,
  onDraftChange,
}: {
  draft: EnglishMaterialDraft;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <Field label="标题" icon={<FileText size={16} />}>
          <input
            className="control"
            maxLength={200}
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            placeholder="素材标题"
          />
        </Field>
        <Field label="序号" icon={<CircleGauge size={16} />}>
          <input
            className="control"
            min={1}
            type="number"
            value={draft.sequence_no}
            onChange={(event) => onDraftChange({ ...draft, sequence_no: event.target.value.replace(/\D/g, "") })}
            placeholder="可空"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="分类标识" icon={<Tags size={16} />}>
          <select className="control" disabled={draft.category === "AI生成"} value={draft.category} onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}>
            {ENGLISH_MATERIAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {draft.category === "AI生成" ? <p className="mt-1 text-xs leading-5 text-sky-200">AI 生成内容统一归类为“AI生成”。</p> : null}
        </Field>
        <Field label="发布状态" icon={<CircleGauge size={16} />}>
          <select className="control" value={draft.flag} onChange={(event) => onDraftChange({ ...draft, flag: event.target.value as EnglishMaterialDraft["flag"] })}>
            <option value="0">{englishMaterialFlagLabels["0"]}</option>
            <option value="1">{englishMaterialFlagLabels["1"]}</option>
          </select>
        </Field>
      </div>

      <Field label="基础表达" icon={<BookOpenCheck size={16} />}>
        <input
          className="control"
          maxLength={50}
          value={draft.base_expression}
          onChange={(event) => onDraftChange({ ...draft, base_expression: event.target.value })}
          placeholder="必填，例如 make it happen"
        />
      </Field>

      <Field label="职业完整句式" icon={<FileText size={16} />}>
        <textarea
          className="control min-h-[110px] resize-none leading-7"
          maxLength={255}
          value={draft.professional_sentence}
          onChange={(event) => onDraftChange({ ...draft, professional_sentence: event.target.value })}
          placeholder="适合职场场景的完整英文句式。"
        />
      </Field>

      <Field label="地道中文翻译" icon={<FileText size={16} />}>
        <textarea
          className="control min-h-[110px] resize-none leading-7"
          maxLength={255}
          value={draft.chinese_translation}
          onChange={(event) => onDraftChange({ ...draft, chinese_translation: event.target.value })}
          placeholder="中文解释或翻译。"
        />
      </Field>

      <Field label="完整口播内容" icon={<ClipboardList size={16} />}>
        <textarea
          className="control min-h-[180px] resize-none leading-7"
          maxLength={4000}
          value={draft.full_script}
          onChange={(event) => onDraftChange({ ...draft, full_script: event.target.value })}
          placeholder="用于短视频口播的完整内容。"
        />
      </Field>
    </>
  );
}

function EnglishMaterialCreateDialog({
  draft,
  hasDraft,
  isOpen,
  isSaving,
  saveError,
  onClearDraft,
  onClose,
  onDraftChange,
  onSubmit,
  modelOptions,
}: {
  draft: EnglishMaterialDraft;
  hasDraft: boolean;
  isOpen: boolean;
  isSaving: boolean;
  saveError: string | null;
  onClearDraft: () => void;
  onClose: () => void;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  modelOptions: { value: string; label: string }[];
}) {
  const canSubmit = draft.base_expression.trim().length > 0 && !isSaving;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm xl:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section aria-modal="true" className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-900 shadow-soft-glow" role="dialog">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Plus size={17} />
              New Material
            </div>
            <h2 className="text-xl font-semibold text-slate-50">{hasDraft ? "继续录入英语素材" : "录入英语素材"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <EnglishMaterialAiGeneration draft={draft} modelOptions={modelOptions} onGenerated={onDraftChange} />
              <EnglishMaterialAiCompletion draft={draft} disabled={isSaving} modelOptions={modelOptions} onCompleted={onDraftChange} />
            </div>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isSaving}
            title="关闭并保留草稿"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <form id="english-material-create-form" className="min-h-0 flex-1 overflow-y-auto p-4" onSubmit={onSubmit}>
          <div className="space-y-4">
            {hasDraft ? <p className="rounded-lg border border-mint-300/20 bg-mint-300/8 px-3 py-2 text-xs leading-5 text-mint-100">当前显示的是本机保留的未提交草稿；关闭、网络失败或刷新页面都不会清空内容。</p> : null}
            <EnglishMaterialCreateFields draft={draft} onDraftChange={onDraftChange} />
            {saveError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                <span>{saveError}</span>
              </div>
            ) : null}
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4">
          {hasDraft ? (
            <button
              className="mr-auto h-11 rounded-lg border border-red-300/20 bg-red-400/10 px-4 text-sm font-medium text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
              disabled={isSaving}
              type="button"
              onClick={onClearDraft}
            >
              清空草稿
            </button>
          ) : null}
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            保留草稿并关闭
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!canSubmit}
            form="english-material-create-form"
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {isSaving ? "写入中" : "保存到 T_ENGLISH"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AgentNavigation() {
  const [agents, setAgents] = useState<CapabilityAgent[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const agentButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => { fetchCapabilityAgents().then((response) => { setAgents(response.items); setSelectedCode((current) => current ?? response.items[0]?.code ?? null); }).catch(() => setAgents([])); }, []);
  function selectAgent(code: string, focus = false) {
    setSelectedCode(code);
    window.dispatchEvent(new CustomEvent("capability-agent-selected", { detail: code }));
    if (focus) agentButtonRefs.current.get(code)?.focus();
  }
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key !== "ArrowUp" && event.key !== "ArrowDown") || event.altKey || event.ctrlKey || event.metaKey || agents.length === 0) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable)) return;
      event.preventDefault();
      const currentIndex = Math.max(0, agents.findIndex((agent) => agent.code === selectedCode));
      const nextIndex = event.key === "ArrowDown" ? Math.min(currentIndex + 1, agents.length - 1) : Math.max(currentIndex - 1, 0);
      selectAgent(agents[nextIndex].code, true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [agents, selectedCode]);
  return <nav aria-label="Agent 列表" className="space-y-1">{agents.map((agent) => {
    const selected = agent.code === selectedCode;
    return <button key={agent.code} ref={(element) => { if (element) agentButtonRefs.current.set(agent.code, element); else agentButtonRefs.current.delete(agent.code); }} className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300/55 ${selected ? "border-mint-300/30 bg-mint-300/10 text-mint-100" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-100"}`} type="button" onClick={() => selectAgent(agent.code)}><Bot className={`shrink-0 ${selected ? "text-mint-300" : "text-slate-500"}`} size={15} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{agent.name}</span><span className={`shrink-0 text-[11px] ${selected ? "text-mint-200/75" : "text-slate-600"}`}>{agent.module_label}</span></button>;
  })}</nav>;
}

function CapabilityManager() {
  const [agents, setAgents] = useState<CapabilityAgent[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([fetchCapabilityAgents(), fetchSkills({ enabled: true, scope: "callable" })]).then(([a, s]) => { setAgents(a.items); setSkills(s.items); setSelectedCode(a.items[0]?.code ?? null); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { const select = (event: Event) => setSelectedCode((event as CustomEvent<string>).detail); window.addEventListener("capability-agent-selected", select); return () => window.removeEventListener("capability-agent-selected", select); }, []);
  const agent = agents.find((item) => item.code === selectedCode) ?? null;
  const admin = Boolean(agent?.can_manage);
  const own = skills.filter((skill) => skill.can_edit);
  const active = admin ? (agent?.system_skill_ids ?? []) : (agent?.personal_skill_ids ?? []);
  const defaults = admin ? (agent?.default_skill_ids ?? []) : (agent?.personal_default_skill_ids ?? []);
  function toggle(id: string) { if (!agent) return; const next = active.includes(id) ? active.filter((value) => value !== id) : [...active, id]; setAgents((all) => all.map((item) => item.code === agent.code ? { ...item, [admin ? "system_skill_ids" : "personal_skill_ids"]: next, [admin ? "default_skill_ids" : "personal_default_skill_ids"]: defaults.filter((value) => value !== id || next.includes(id)) } : item)); }
  function toggleDefault(id: string) { if (!agent) return; setAgents((all) => all.map((item) => item.code === agent.code ? { ...item, [admin ? "default_skill_ids" : "personal_default_skill_ids"]: defaults.includes(id) ? defaults.filter((value) => value !== id) : [...defaults, id] } : item)); }
  async function save() { if (!agent) return; setSaving(true); setError(null); try { if (admin) await updateCapabilityAgent(agent.code, { system_skill_ids: agent.system_skill_ids, default_skill_ids: agent.default_skill_ids.filter((id) => agent.system_skill_ids.includes(id)), allow_personal_skills: agent.allow_personal_skills }); else await updateMyAgentSkills(agent.code, agent.personal_skill_ids, agent.personal_default_skill_ids.filter((id) => agent.personal_skill_ids.includes(id))); window.dispatchEvent(new Event("capability-agents-updated")); } catch (e) { setError(e instanceof Error ? e.message : "保存失败。"); } finally { setSaving(false); } }
  const connectedSkills = skills.filter((skill) => active.includes(skill.id));
  return <section className="mb-5 rounded-lg border border-mint-300/20 bg-white/[0.02] p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm text-mint-300">Agent Workspace</div><h2 className="text-lg font-semibold text-slate-50">Agent 与 Skill</h2></div><div className="flex flex-wrap gap-1.5">{agents.map((item) => <button key={item.code} className={`rounded-md border px-2 py-1 text-xs ${item.code === selectedCode ? "border-mint-300/30 bg-mint-300/10 text-mint-200" : "border-white/10 text-slate-400"}`} type="button" onClick={() => setSelectedCode(item.code)}>{item.name}</button>)}</div></div>
    {agent ? <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(220px,0.8fr)]"><div className="rounded-lg border border-white/10 bg-black/10 p-3"><div className="text-xs text-slate-500">使用模块</div><div className="mt-1 font-medium text-slate-100">{agent.module_label}</div><div className="mt-3 text-xs text-slate-500">内部标识</div><div className="mt-1 break-all font-mono text-xs text-slate-300">{agent.code}</div><div className="mt-3 text-xs text-slate-500">个人挂载</div><div className="mt-1 text-sm text-slate-300">{agent.allow_personal_skills ? "允许" : "不允许"}</div></div><div className="rounded-lg border border-mint-300/20 bg-mint-300/[0.04] p-3"><div className="mb-3 text-xs text-slate-500">实时关系图</div><div className="flex min-h-32 items-center gap-3 overflow-x-auto"><div className="shrink-0 rounded-lg border border-mint-300/35 bg-mint-300/10 px-3 py-2 text-sm font-medium text-mint-100">{agent.name}<div className="mt-1 text-[11px] text-mint-200">Agent</div></div><div className="h-px min-w-8 flex-1 bg-mint-300/35" /> <div className="flex min-w-40 flex-col gap-2">{connectedSkills.length ? connectedSkills.map((skill) => <div key={skill.id} className={`rounded-md border px-2 py-1.5 text-xs ${skill.is_personal_binding ? "border-sky-300/30 bg-sky-300/10 text-sky-100" : "border-white/15 bg-white/[0.04] text-slate-200"}`}>{skill.name}{defaults.includes(skill.id) ? <span className="ml-2 text-[10px] text-mint-200">默认</span> : null}</div>) : <div className="text-xs text-slate-500">尚未关联 Skill</div>}</div></div><div className="mt-2 flex gap-3 text-[11px]"><span className="text-slate-400">系统 Skill</span><span className="text-sky-200">我的 Skill</span></div></div><div className="rounded-lg border border-white/10 bg-black/10 p-3"><div className="mb-2 text-xs text-slate-500">关联配置</div>{admin && active.length === 0 ? <p className="mb-2 text-xs text-amber-100">待配置：当前仍使用旧版范围。</p> : null}{(admin ? skills : own).map((skill) => <div key={skill.id} className="mb-1 flex items-center gap-2 text-xs text-slate-300"><label className="flex min-w-0 flex-1 items-center gap-2"><input checked={active.includes(skill.id)} className="accent-mint-300" disabled={saving || (!admin && !agent.allow_personal_skills)} type="checkbox" onChange={() => toggle(skill.id)} /><span className="truncate">{skill.name}</span></label>{active.includes(skill.id) ? <label className="flex items-center gap-1 text-[10px] text-mint-200"><input checked={defaults.includes(skill.id)} className="accent-mint-300" type="checkbox" onChange={() => toggleDefault(skill.id)} />默认</label> : null}</div>)}{admin ? <label className="mt-2 flex items-center gap-2 text-xs text-slate-400"><input checked={agent.allow_personal_skills} className="accent-mint-300" type="checkbox" onChange={() => setAgents((all) => all.map((item) => item.code === agent.code ? { ...item, allow_personal_skills: !item.allow_personal_skills } : item))} />允许个人挂载</label> : null}<button className="mt-3 rounded-md border border-mint-300/30 bg-mint-300/10 px-3 py-1.5 text-xs text-mint-200 disabled:opacity-50" disabled={saving || (!admin && !agent.allow_personal_skills)} type="button" onClick={() => void save()}>{saving ? "保存中" : "保存关联"}</button></div></div> : <p className="text-sm text-slate-500">正在加载 Agent…</p>}{error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
  </section>;
}

function SkillSelector({
  agentCode,
  disabled = false,
  maxSelections,
  mode = "multiple",
  selectedSkillIds,
  onSelectedSkillIdsChange,
}: {
  agentCode: string;
  disabled?: boolean;
  maxSelections?: number;
  mode?: "single" | "multiple";
  selectedSkillIds: string[];
  onSelectedSkillIdsChange: (skillIds: string[]) => void;
}) {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentRevision, setAgentRevision] = useState(0);
  const selectedSkillIdsRef = useRef(selectedSkillIds);
  const selectionSourceRef = useRef<"empty" | "system_default" | "personal_default" | "manual">("empty");
  const selectionLimit = mode === "single" ? 1 : maxSelections;

  useEffect(() => {
    selectedSkillIdsRef.current = selectedSkillIds;
    if (selectedSkillIds.length === 0) selectionSourceRef.current = "empty";
  }, [selectedSkillIds]);

  useEffect(() => {
    const refresh = () => setAgentRevision((value) => value + 1);
    window.addEventListener("capability-agents-updated", refresh);
    return () => window.removeEventListener("capability-agents-updated", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function reconcileSelection(availableSkills: SkillSummary[]) {
      const allowedIds = new Set(availableSkills.map((skill) => skill.id));
      const nextSelectedSkillIds = selectedSkillIdsRef.current.filter((skillId) => allowedIds.has(skillId));
      const selectionUnchanged =
        nextSelectedSkillIds.length === selectedSkillIdsRef.current.length &&
        nextSelectedSkillIds.every((skillId, index) => skillId === selectedSkillIdsRef.current[index]);
      if (!selectionUnchanged) onSelectedSkillIdsChange(nextSelectedSkillIds);
    }

    setIsLoading(true);
    setError(null);

    fetchSkills({ enabled: true, scope: "callable", agentCode })
      .then((response) => {
        if (cancelled) return;
        setSkills(response.items);
        reconcileSelection(response.items);
        const canApplyDefault = selectedSkillIdsRef.current.length === 0 || selectionSourceRef.current === "system_default" || selectionSourceRef.current === "personal_default";
        if (canApplyDefault) {
          const defaults = response.items.filter((skill) => skill.is_default).map((skill) => skill.id);
          const nextDefaults = selectionLimit === undefined ? defaults : defaults.slice(0, selectionLimit);
          if (nextDefaults.length) {
            onSelectedSkillIdsChange(nextDefaults);
            selectionSourceRef.current = response.items.some((skill) => skill.is_default && skill.is_personal_binding) ? "personal_default" : "system_default";
          }
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentCode, agentRevision, onSelectedSkillIdsChange, selectionLimit]);

  function handleToggleSkill(skillId: string) {
    selectionSourceRef.current = "manual";
    if (mode === "single") {
      onSelectedSkillIdsChange(selectedSkillIds.includes(skillId) ? [] : [skillId]);
      return;
    }

    if (selectedSkillIds.includes(skillId)) {
      onSelectedSkillIdsChange(selectedSkillIds.filter((currentId) => currentId !== skillId));
      return;
    }

    if (selectionLimit !== undefined && selectedSkillIds.length >= selectionLimit) return;
    onSelectedSkillIdsChange([...selectedSkillIds, skillId]);
  }

  return (
    <section className="min-h-48 min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Layers3 className="text-mint-300" size={16} />
          选择 Skill
        </div>
        {isLoading ? <Loader2 className="animate-spin text-mint-300" size={14} /> : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>仅显示当前 Agent 允许调用的 Skill。</span>
        <span>已选择 {formatAmount(selectedSkillIds.length)} 个{selectionLimit ? ` / ${selectionLimit}` : ""}</span>
      </div>
      {isLoading && skills.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={15} />正在加载 Skill...</div>
      ) : error ? (
        <div className="mt-3 text-sm text-red-200">{error}</div>
      ) : skills.length ? (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {skills.map((skill) => {
            const selected = selectedSkillIds.includes(skill.id);
            const reachedLimit = !selected && selectionLimit !== undefined && selectedSkillIds.length >= selectionLimit;
            return (
              <button
                key={skill.id}
                className={`min-h-16 min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${selected ? "border-mint-300/30 bg-mint-300/10 text-mint-100" : "border-white/10 bg-white/[0.028] text-slate-300 hover:border-mint-300/25"}`}
                disabled={disabled || isLoading || reachedLimit}
                type="button"
                onClick={() => handleToggleSkill(skill.id)}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
                  {selected ? <CheckCircle2 className="shrink-0 text-mint-300" size={15} /> : null}
                </div>
                <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">{skill.description || "无描述"}</p>
                {skill.is_default || skill.is_personal_binding ? <div className="mt-2 text-[11px] text-slate-600">{skill.is_default ? "默认" : "我的 Skill"}</div> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-5 text-slate-500">
          当前 Agent 暂无可调用 Skill。
        </p>
      )}
    </section>
  );
}

function SkillAiCreation({
  draft,
  disabled,
  modelOptions,
  onApply,
}: {
  draft: SkillDraft;
  disabled: boolean;
  modelOptions: { value: string; label: string }[];
  onApply: (content: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [modelName, setModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const canGenerate = !disabled && !isGenerating && draft.name.trim().length > 0 && draft.description.trim().length > 0;

  function closeDialog() {
    if (isGenerating) return;
    setIsOpen(false);
    setError(null);
    setResult(null);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError(null);
    try {
      const usesConfiguredModel = modelName === HISTORY_ASK_CONFIGURED_MODEL;
      const next = await generateSkillDraft({
        name: draft.name,
        description: draft.description,
        skillIds: selectedSkillIds,
        executionProvider: usesConfiguredModel ? "history_ask_llm" : "codex",
        modelName: modelName === AI_CODING_DEFAULT_MODEL ? "" : modelName,
      });
      setResult(next.content);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "AI 创建失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  }

  return <>
    <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-sm font-medium text-sky-200 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={disabled || !draft.name.trim() || !draft.description.trim()} title={draft.name.trim() && draft.description.trim() ? "选择模型和创建规范，生成 SKILL.md 草稿" : "请先填写 Skill 名称和描述"} type="button" onClick={() => { setError(null); setResult(null); setIsOpen(true); }}><WandSparkles size={16} />AI 创建</button>
    {isOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[88vh] sm:rounded-lg" role="dialog" aria-label="AI 创建自定义 Skill">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><WandSparkles size={17} />AI Skill</div><h2 className="text-xl font-semibold text-slate-50">AI 创建自定义 Skill</h2><p className="mt-1 text-xs leading-5 text-slate-500">选择模型和创建规范，生成标准 SKILL.md。确认回填后仍可编辑，且不会自动新建或保存。</p></div><button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isGenerating} type="button" title="关闭" onClick={closeDialog}><X size={17} /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!result ? <><div className="grid gap-3 sm:grid-cols-2"><Field label="执行模型" icon={<Settings2 size={16} />}><select className="control" disabled={isGenerating} value={modelName} onChange={(event) => setModelName(event.target.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field></div><SkillSelector agentCode="skill-generation" disabled={isGenerating} maxSelections={1} selectedSkillIds={selectedSkillIds} onSelectedSkillIdsChange={setSelectedSkillIds} /></> : <div className="space-y-2"><p className="text-sm leading-6 text-slate-300">以下内容将回填到 SKILL.md 编辑框：</p><textarea className="control min-h-80 resize-y font-mono text-xs leading-6" readOnly value={result} /></div>}
          {error ? <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} /><span>{error}</span></div> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4"><button className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isGenerating} type="button" onClick={closeDialog}>取消</button>{result ? <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20" type="button" onClick={() => { onApply(result); closeDialog(); }}><ClipboardCheck size={17} />确认回填</button> : <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!canGenerate} type="button" onClick={() => void handleGenerate()}>{isGenerating ? <Loader2 className="animate-spin" size={17} /> : <WandSparkles size={17} />}{isGenerating ? "创建中" : "生成创建建议"}</button>}</div>
      </section>
    </div> : null}
  </>;
}

function EnglishMaterialAiGeneration({
  draft,
  modelOptions,
  onGenerated,
  onOpen,
}: {
  draft: EnglishMaterialDraft;
  modelOptions: { value: string; label: string }[];
  onGenerated: (draft: EnglishMaterialDraft) => void;
  onOpen?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [topicMode, setTopicMode] = useState<"trend" | "truth" | "motivation" | "workplace" | "custom">("trend");
  const [topic, setTopic] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const canGenerate = !isGenerating && (topicMode !== "custom" || topic.trim().length > 0);

  async function handleGenerate() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError(null);
    try {
      const usesConfiguredModel = modelName === HISTORY_ASK_CONFIGURED_MODEL;
      const result = await generateEnglishMaterial({
        topicMode,
        topic,
        skillIds: selectedSkillIds,
        executionProvider: usesConfiguredModel ? "history_ask_llm" : "codex",
        modelName: modelName === AI_CODING_DEFAULT_MODEL ? "" : modelName,
      });
      onGenerated({
        ...draft,
        category: "AI生成",
        title: result.title,
        base_expression: result.base_expression,
        professional_sentence: result.professional_sentence,
        chinese_translation: result.chinese_translation,
        full_script: result.full_script,
        flag: "0",
      });
      setIsOpen(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "AI 生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-sm font-medium text-sky-200 transition hover:bg-sky-300/16"
        type="button"
        onClick={() => { onOpen?.(); setError(null); setIsOpen(true); }}
      >
        <WandSparkles size={16} />
        AI生成
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isGenerating) setIsOpen(false); }}>
          <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[88vh] sm:rounded-lg" role="dialog" aria-label="AI 生成英语素材">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><WandSparkles size={17} />AI Material</div>
                <h2 className="text-xl font-semibold text-slate-50">AI生成英语素材</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">生成后仅回填当前草稿，不会自动保存。趋势话题基于通用知识，不代表实时热点。</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isGenerating} type="button" title="关闭" onClick={() => setIsOpen(false)}><X size={17} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="执行模型" icon={<Settings2 size={16} />}>
                  <select className="control" disabled={isGenerating} value={modelName} onChange={(event) => setModelName(event.target.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </Field>
                <Field label="主题方向" icon={<Sparkles size={16} />}>
                  <select className="control" disabled={isGenerating} value={topicMode} onChange={(event) => setTopicMode(event.target.value as typeof topicMode)}>
                    <option value="trend">趋势型话题</option><option value="truth">人生真理</option><option value="motivation">励志成长</option><option value="workplace">职场成长</option><option value="custom">自定义主题</option>
                  </select>
                </Field>
              </div>
              {topicMode === "custom" ? <Field label="自定义主题" icon={<FileText size={16} />}><input className="control" disabled={isGenerating} maxLength={300} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例如：在不确定中保持行动力" /></Field> : null}
              <SkillSelector
                agentCode="english-generation"
                disabled={isGenerating}
                selectedSkillIds={selectedSkillIds}
                onSelectedSkillIdsChange={setSelectedSkillIds}
              />
              {error ? <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} /><span>{error}</span></div> : null}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4"><button className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isGenerating} type="button" onClick={() => setIsOpen(false)}>取消</button><button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!canGenerate} type="button" onClick={() => void handleGenerate()}>{isGenerating ? <Loader2 className="animate-spin" size={17} /> : <WandSparkles size={17} />}{isGenerating ? "生成中" : "生成并回填"}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function EnglishMaterialDetailBlock({ label, value, tall = false }: { label: string; value: string | null; tall?: boolean }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.028] p-4 ${tall ? "min-h-[160px]" : ""}`}>
      <div className="mb-2 text-xs uppercase text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{value || "未填写"}</div>
    </div>
  );
}

function EnglishMaterialDetailDialog({
  copiedLabel,
  draft,
  isLoading,
  isSaving,
  item,
  modelOptions,
  nextItem,
  onClose,
  onCopyText,
  onDraftChange,
  onNext,
  onPrevious,
  onSave,
  previousItem,
}: {
  copiedLabel: string | null;
  draft: EnglishMaterialDraft;
  isLoading: boolean;
  isSaving: boolean;
  item: EnglishMaterialItem | null;
  modelOptions: { value: string; label: string }[];
  nextItem: EnglishMaterialItem | null;
  onClose: () => void;
  onCopyText: (value: string, label: string) => void;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSave: () => void;
  previousItem: EnglishMaterialItem | null;
}) {
  const [learningCardStyle, setLearningCardStyle] = useState<"classic" | "learning-card" | "minimal">("learning-card");
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      } else if (event.key === "ArrowLeft" && onPrevious && !isLoading) {
        onPrevious();
      } else if (event.key === "ArrowRight" && onNext && !isLoading) {
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, item, onClose, onNext, onPrevious]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <section
        aria-modal="true"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-900 shadow-soft-glow sm:max-h-[88vh] sm:max-w-3xl sm:rounded-lg"
        role="dialog"
      >
        <div className="shrink-0 border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <BookOpenCheck size={17} />
                Material Detail
              </div>
              <h2 className="line-clamp-2 text-xl font-semibold text-slate-50">
                {draft.title || draft.base_expression || item.title || item.base_expression || "未命名素材"}
              </h2>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading}
              title="关闭"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">#{item.id}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
              序号 {draft.sequence_no || "-"}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
              {draft.category || "未分类"}
            </span>
            <span className={`rounded-md border px-2 py-1 ${englishMaterialFlagStyles[draft.flag]}`}>
              {englishMaterialFlagLabels[draft.flag]}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <LoadingStack />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                <Field label="标题" icon={<FileText size={16} />}>
                  <input
                    className="control"
                    maxLength={200}
                    value={draft.title}
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                    placeholder="素材标题"
                  />
                </Field>
                <Field label="序号" icon={<CircleGauge size={16} />}>
                  <input
                    className="control"
                    min={1}
                    type="number"
                    value={draft.sequence_no}
                    onChange={(event) => onDraftChange({ ...draft, sequence_no: event.target.value.replace(/\D/g, "") })}
                    placeholder="可空"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="分类标识" icon={<Tags size={16} />}>
                  <select
                    className="control"
                    value={draft.category}
                    onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}
                  >
                    {ENGLISH_MATERIAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="发布状态" icon={<CircleGauge size={16} />}>
                  <select
                    className="control"
                    value={draft.flag}
                    onChange={(event) => onDraftChange({ ...draft, flag: event.target.value as EnglishMaterialDraft["flag"] })}
                  >
                    <option value="0">{englishMaterialFlagLabels["0"]}</option>
                    <option value="1">{englishMaterialFlagLabels["1"]}</option>
                  </select>
                </Field>
              </div>

              <Field label="基础表达" icon={<BookOpenCheck size={16} />}>
                <input
                  className="control"
                  maxLength={50}
                  value={draft.base_expression}
                  onChange={(event) => onDraftChange({ ...draft, base_expression: event.target.value })}
                  placeholder="必填，例如 make it happen"
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="职业完整句式" icon={<FileText size={16} />}>
                  <textarea
                    className="control min-h-[130px] resize-none leading-7"
                    maxLength={255}
                    value={draft.professional_sentence}
                    onChange={(event) => onDraftChange({ ...draft, professional_sentence: event.target.value })}
                    placeholder="适合职场场景的完整英文句式。"
                  />
                </Field>
                <Field label="地道中文翻译" icon={<FileText size={16} />}>
                  <textarea
                    className="control min-h-[130px] resize-none leading-7"
                    maxLength={255}
                    value={draft.chinese_translation}
                    onChange={(event) => onDraftChange({ ...draft, chinese_translation: event.target.value })}
                    placeholder="中文解释或翻译。"
                  />
                </Field>
              </div>

              <Field label="完整口播内容" icon={<ClipboardList size={16} />}>
                <textarea
                  className="control min-h-[220px] resize-none leading-7"
                  maxLength={4000}
                  value={draft.full_script}
                  onChange={(event) => onDraftChange({ ...draft, full_script: event.target.value })}
                  placeholder="用于短视频口播的完整内容。"
                />
              </Field>
              {draft.card_sections?.sections
                .filter((section) => section.visible && section.value.trim())
                .sort((left, right) => left.order - right.order)
                .map((section) => <EnglishMaterialDetailBlock key={section.key} label={section.label} value={section.value} />)}
              <div className="flex justify-end">
                <EnglishMaterialAiCompletion draft={draft} disabled={isLoading || isSaving} modelOptions={modelOptions} onCompleted={onDraftChange} />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-ink-900/96 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading || !draft.title}
              type="button"
              onClick={() => onCopyText(draft.title, "标题")}
            >
              {copiedLabel === "标题" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copiedLabel === "标题" ? "已复制" : "复制标题"}
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading || !draft.professional_sentence}
              type="button"
              onClick={() => onCopyText(draft.professional_sentence, "职业完整句式")}
            >
              {copiedLabel === "职业完整句式" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copiedLabel === "职业完整句式" ? "已复制" : "复制句式"}
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading || !draft.chinese_translation}
              type="button"
              onClick={() => onCopyText(draft.chinese_translation, "地道中文翻译")}
            >
              {copiedLabel === "地道中文翻译" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copiedLabel === "地道中文翻译" ? "已复制" : "复制翻译"}
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading || !draft.full_script}
              type="button"
              onClick={() => onCopyText(draft.full_script, "完整口播内容")}
            >
              {copiedLabel === "完整口播内容" ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}
              {copiedLabel === "完整口播内容" ? "已复制" : "复制脚本"}
            </button>
            {draft.card_sections?.sections
              .filter((section) => section.copyable && section.value.trim())
              .sort((left, right) => left.order - right.order)
              .map((section) => (
                <button
                  key={section.key}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                  type="button"
                  onClick={() => onCopyText(section.value, section.label)}
                >
                  {copiedLabel === section.label ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedLabel === section.label ? "已复制" : `复制${section.label}`}
                </button>
              ))}
            <select className="control h-11" value={learningCardStyle} onChange={(event) => setLearningCardStyle(event.target.value as typeof learningCardStyle)}>
              <option value="learning-card">学习卡</option><option value="classic">经典文章</option><option value="minimal">极简笔记</option>
            </select>
            <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 disabled:opacity-50" disabled={isLoading || !draft.title} type="button" onClick={() => void copyMarkdownAsEnhancedRichText(`# ${draft.title}\n\n${draft.full_script}`, { downloadFileName: `英语学习卡-${item?.id ?? "draft"}.html`, documentTitle: draft.title, exportStyle: learningCardStyle, sections: [{ id: "expression", label: "核心表达", value: draft.base_expression }, { id: "sentence", label: "职业完整句式", value: draft.professional_sentence }, { id: "translation", label: "中文翻译", value: draft.chinese_translation }, ...(draft.card_sections?.sections.filter((section) => section.visible && section.value.trim()).sort((left, right) => left.order - right.order).map((section) => ({ id: section.key, label: section.label, value: section.value })) ?? [])] })}>
              <FileText size={16} />下载学习卡
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-600"
              disabled={isLoading || !previousItem || !onPrevious}
              type="button"
              onClick={onPrevious}
            >
              <ChevronLeft size={16} />
              上一个
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-sm font-medium text-mint-200 transition hover:bg-mint-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
              disabled={isLoading || !nextItem || !onNext}
              type="button"
              onClick={onNext}
            >
              <ChevronRight size={16} />
              下一个
            </button>
          </div>
          <button
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={isLoading || isSaving || !draft.base_expression.trim()}
            type="button"
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="animate-spin" size={17} /> : <ClipboardCheck size={17} />}
            {isSaving ? "保存中" : "保存修改"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EnglishMaterialAiCompletion({
  draft,
  disabled,
  modelOptions,
  onCompleted,
  onOpen,
}: {
  draft: EnglishMaterialDraft;
  disabled: boolean;
  modelOptions: { value: string; label: string }[];
  onCompleted: (draft: EnglishMaterialDraft) => void;
  onOpen?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnglishMaterialCompletionResult | null>(null);
  const [completionJobId, setCompletionJobId] = useState<string | null>(null);
  const [modelName, setModelName] = useState(AI_CODING_DEFAULT_MODEL);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const canComplete = !disabled && !isCompleting && draft.full_script.trim().length > 0;

  function clearStoredCompletionJob() {
    try {
      window.sessionStorage.removeItem("trustedKnowledge.englishMaterialCompletionJob.v1");
    } catch {
      // Session storage is optional; an active task can still finish in this tab.
    }
  }

  function storeCompletionJob(jobId: string) {
    try {
      window.sessionStorage.setItem("trustedKnowledge.englishMaterialCompletionJob.v1", JSON.stringify({ jobId, fullScript: draft.full_script }));
    } catch {
      // Do not make completion availability depend on browser storage.
    }
  }

  useEffect(() => {
    if (!isOpen || !completionJobId) return;
    const jobId = completionJobId;
    let cancelled = false;
    let timer: number | undefined;
    let pollFailureCount = 0;

    async function pollCompletionJob() {
      try {
        const job = await getEnglishMaterialCompletionJob(jobId);
        if (cancelled) return;
        pollFailureCount = 0;
        setError(null);
        if (job.status === "running") {
          timer = window.setTimeout(pollCompletionJob, 1500);
          return;
        }
        setIsCompleting(false);
        setCompletionJobId(null);
        clearStoredCompletionJob();
        if (job.status === "completed" && job.result) {
          setResult(job.result);
          return;
        }
        setError(job.error_message ?? (job.status === "cancelled" ? "AI 补全已取消。" : "AI 补全失败，请稍后重试。"));
      } catch (completionError) {
        if (cancelled) return;
        const message = completionError instanceof Error ? completionError.message : "读取 AI 补全任务状态失败，请稍后重试。";
        if (message.includes("AI 补全任务不存在")) {
          setIsCompleting(false);
          setCompletionJobId(null);
          clearStoredCompletionJob();
          setError(message);
          return;
        }
        pollFailureCount += 1;
        setError(`${message}（正在重试，第 ${pollFailureCount} 次）`);
        timer = window.setTimeout(pollCompletionJob, 1500);
      }
    }

    void pollCompletionJob();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, completionJobId]);

  useEffect(() => {
    if (!isOpen || completionJobId || result) return;
    try {
      const raw = window.sessionStorage.getItem("trustedKnowledge.englishMaterialCompletionJob.v1");
      const stored = raw ? JSON.parse(raw) as { jobId?: unknown; fullScript?: unknown } : null;
      if (typeof stored?.jobId !== "string" || stored.fullScript !== draft.full_script) return;
      setIsCompleting(true);
      setCompletionJobId(stored.jobId);
    } catch {
      clearStoredCompletionJob();
    }
  }, [isOpen, completionJobId, result, draft.full_script]);

  function closeDialog() {
    if (isCompleting) return;
    setIsOpen(false);
    setError(null);
    setResult(null);
    setCompletionJobId(null);
  }

  async function handleComplete() {
    if (!canComplete) return;
    setIsCompleting(true);
    setError(null);
    try {
      const usesConfiguredModel = modelName === HISTORY_ASK_CONFIGURED_MODEL;
      const job = await startEnglishMaterialCompletionJob({
        fullScript: draft.full_script,
        skillIds: selectedSkillIds,
        executionProvider: usesConfiguredModel ? "history_ask_llm" : "codex",
        modelName: modelName === AI_CODING_DEFAULT_MODEL ? "" : modelName,
      });
      storeCompletionJob(job.job_id);
      setCompletionJobId(job.job_id);
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : "AI 补全失败，请稍后重试。");
      setIsCompleting(false);
    }
  }

  async function cancelCompletion() {
    if (!completionJobId) return;
    try {
      await cancelEnglishMaterialCompletionJob(completionJobId);
      clearStoredCompletionJob();
      setCompletionJobId(null);
      setIsCompleting(false);
      setIsOpen(false);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "取消 AI 补全失败，请稍后重试。");
    }
  }

  function applyResult() {
    if (!result) return;
    onCompleted({
      ...draft,
      title: draft.title.trim() ? draft.title : result.title,
      base_expression: draft.base_expression.trim() ? draft.base_expression : result.base_expression,
      professional_sentence: draft.professional_sentence.trim() ? draft.professional_sentence : result.professional_sentence,
      chinese_translation: draft.chinese_translation.trim() ? draft.chinese_translation : result.chinese_translation,
      card_sections: draft.card_sections ?? result.card_sections,
    });
    closeDialog();
  }

  return <>
    <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-sm font-medium text-sky-200 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!draft.full_script.trim() || disabled} title={draft.full_script.trim() ? "根据完整口播内容补全空字段" : "请先填写完整口播内容"} type="button" onClick={() => { onOpen?.(); setError(null); setResult(null); setIsOpen(true); }}><WandSparkles size={16} />AI补全</button>
    {isOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[88vh] sm:rounded-lg" role="dialog" aria-label="AI 补全英语素材">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><WandSparkles size={17} />AI Material</div><h2 className="text-xl font-semibold text-slate-50">AI补全英语素材</h2><p className="mt-1 text-xs leading-5 text-slate-500">只根据当前完整口播内容提炼字段。确认回填时仅填充空字段，不会自动保存。</p></div><button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600" disabled={isCompleting} type="button" title="关闭" onClick={closeDialog}><X size={17} /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!result ? isCompleting ? <div className="flex items-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 p-3 text-sm text-mint-100"><Loader2 className="animate-spin" size={17} />AI 补全正在后台执行；刷新此页面后重新打开此窗口可继续查看结果。</div> : <><div className="grid gap-3 sm:grid-cols-2"><Field label="执行模型" icon={<Settings2 size={16} />}><select className="control" value={modelName} onChange={(event) => setModelName(event.target.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field></div><SkillSelector agentCode="english-extraction" mode="single" selectedSkillIds={selectedSkillIds} onSelectedSkillIdsChange={setSelectedSkillIds} /></> : <div className="space-y-3"><p className="text-sm leading-6 text-slate-300">以下结果将只填入当前为空的字段：</p><EnglishMaterialDetailBlock label="标题" value={result.title} /><EnglishMaterialDetailBlock label="基础表达" value={result.base_expression} /><EnglishMaterialDetailBlock label="职业完整句式" value={result.professional_sentence} /><EnglishMaterialDetailBlock label="地道中文翻译" value={result.chinese_translation} />{result.card_sections?.sections.filter((section) => section.visible && section.value.trim()).sort((left, right) => left.order - right.order).map((section) => <EnglishMaterialDetailBlock key={section.key} label={section.label} value={section.value} />)}</div>}
          {error ? <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100"><TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} /><span>{error}</span></div> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 p-4">{isCompleting ? <button className="h-11 rounded-lg border border-red-300/30 bg-red-300/10 px-4 text-sm text-red-100" type="button" onClick={() => void cancelCompletion()}>取消补全</button> : <button className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300" type="button" onClick={closeDialog}>取消</button>}{result ? <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20" type="button" onClick={applyResult}><ClipboardCheck size={17} />确认回填</button> : !isCompleting ? <button className="flex h-11 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500" disabled={!canComplete} type="button" onClick={() => void handleComplete()}><WandSparkles size={17} />生成补全建议</button> : null}</div>
      </section>
    </div> : null}
  </>;
}

function CurrentRecordEditDialog({
  item,
  options,
  isUpdating,
  onCancel,
  onConfirm,
}: {
  item: CurrentRecordItem | null;
  options: CurrentRecordOptions;
  isUpdating: boolean;
  onCancel: () => void;
  onConfirm: (record: CurrentRecordItem, next: { week: CurrentWeek; day: CurrentDay; content: string }) => void;
}) {
  const [week, setWeek] = useState<CurrentWeek>("W1");
  const [day, setDay] = useState<CurrentDay>("D1");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!item) return;
    setWeek(item.week);
    setDay(item.day);
    setContent(item.content ?? "");
  }, [item]);

  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isUpdating) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUpdating, item, onCancel]);

  if (!item) return null;

  const record = item;
  const allowedWeeks = compactUnique([record.week, getNextWeek(record.week)]);
  const progressChanged = week !== record.week || day !== record.day;
  const nextLevel = record.week === "W48" && week === "W1" ? Math.min((record.learn_level ?? 1) + 1, 10) : (record.learn_level ?? 1);

  function handleWeekChange(value: CurrentWeek) {
    setWeek(value);
    if (value !== record.week || day !== record.day) {
      setContent("");
    }
  }

  function handleDayChange(value: CurrentDay) {
    setDay(value);
    if (week !== record.week || value !== record.day) {
      setContent("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/62 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isUpdating) {
          onCancel();
        }
      }}
    >
      <section
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[92vh]"
        role="dialog"
      >
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Pencil size={17} />
              Edit Current Record
            </div>
            <h2 className="text-lg font-semibold text-slate-50">{item.type}</h2>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isUpdating}
            title="关闭"
            type="button"
            onClick={onCancel}
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <MetricTile icon={<ShieldCheck size={17} />} label="用户" value={item.username} detail={`#${item.id}`} />
            <MetricTile icon={<CalendarClock size={17} />} label="当前周" value={item.week} detail="原始值" />
            <MetricTile icon={<CalendarClock size={17} />} label="当前天" value={item.day} detail="原始值" />
            <MetricTile icon={<CircleGauge size={17} />} label="等级" value={`Level ${nextLevel}`} detail="保存后级别" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Week" icon={<CalendarClock size={16} />}>
              <select className="control" disabled={isUpdating} value={week} onChange={(event) => handleWeekChange(event.target.value as CurrentWeek)}>
                {allowedWeeks.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day" icon={<CalendarClock size={16} />}>
              <select className="control" disabled={isUpdating} value={day} onChange={(event) => handleDayChange(event.target.value as CurrentDay)}>
                {options.days.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {progressChanged ? (
            <div className="mt-4 rounded-lg border border-mint-300/20 bg-mint-300/8 px-3 py-3 text-sm leading-6 text-mint-100/85">
              已选择新的 week/day，内容已切换为新记录点草稿；可以留空保存，稍后再补。
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.028] px-3 py-3 text-sm leading-6 text-slate-400">
              当前未推进进度，保存会修正这个 week/day 的历史内容。
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <span className="text-slate-500">
                <FileText size={16} />
              </span>
              内容
            </span>
            <textarea
              className="control min-h-[180px] resize-none leading-7 sm:min-h-[260px]"
              disabled={isUpdating}
              maxLength={4000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="可留空保存，后续再补充内容。"
            />
          </label>
        </div>

        <div className="shrink-0 flex flex-col gap-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-5">
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={isUpdating}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/12 px-4 font-medium text-mint-200 transition hover:bg-mint-300/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={isUpdating}
            type="button"
            onClick={() => onConfirm(item, { week, day, content })}
          >
            {isUpdating ? <Loader2 className="animate-spin" size={17} /> : <Pencil size={17} />}
            {isUpdating ? "保存中" : progressChanged ? "保存并推进" : "保存内容"}
          </button>
        </div>
      </section>
    </div>
  );
}

function UserManagementWorkspace({
  adminModules,
  graph,
  users,
  total,
  relations,
  createDraft,
  relationDraft,
  resetTarget,
  resetPasswordValue,
  isLoading,
  isSaving,
  error,
  savedLabel,
  onCreateDraftChange,
  onRelationDraftChange,
  onResetTargetChange,
  onResetPasswordValueChange,
  onCreateUser,
  onUpdateUser,
  onResetPassword,
  onCreateRelation,
  onUpdateAdminModule,
  onUpdateRelation,
}: {
  adminModules: AdminModuleAccessItem[];
  graph: UserRelationGraphResponse | null;
  users: ManagedUserItem[];
  total: number;
  relations: UserRelationItem[];
  createDraft: ManagedUserCreateDraft;
  relationDraft: typeof emptyRelationDraft;
  resetTarget: ManagedUserItem | null;
  resetPasswordValue: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  savedLabel: string | null;
  onCreateDraftChange: (draft: ManagedUserCreateDraft) => void;
  onRelationDraftChange: (draft: typeof emptyRelationDraft) => void;
  onResetTargetChange: (user: ManagedUserItem | null) => void;
  onResetPasswordValueChange: (value: string) => void;
  onCreateUser: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateUser: (
    user: ManagedUserItem,
    payload: { display_name?: string | null; role_code?: ManagedUserRole; is_admin_role?: boolean; status?: ManagedUserStatus },
  ) => void;
  onResetPassword: (event: React.FormEvent<HTMLFormElement>) => void;
  onCreateRelation: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateAdminModule: (moduleCode: AdminModuleAccessItem["module_code"], accessLevel: AdminModuleAccessLevel) => void;
  onUpdateRelation: (relation: UserRelationItem, status: ManagedUserStatus) => void;
}) {
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const parentUsers = users.filter((user) => user.role_code === "PARENT").length;
  const adminRoleUsers = users.filter((user) => user.is_admin_role).length;
  const canCreateUser = createDraft.username.trim().length > 0 && createDraft.password.length >= 6 && !isSaving;
  const canCreateRelation = Boolean(relationDraft.parent_user_id && relationDraft.child_user_id) && !isSaving;

  return (
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(520px,1fr)_360px]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <UserCog size={17} />
              TK Users
            </div>
            <h2 className="text-xl font-semibold text-slate-50">用户管理</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
            <MetricTile icon={<ShieldCheck size={17} />} label="用户" value={String(total)} detail="总数" />
            <MetricTile icon={<CheckCircle2 size={17} />} label="启用" value={String(activeUsers)} detail="ACTIVE" />
            <MetricTile icon={<UserCog size={17} />} label="家长" value={String(parentUsers)} detail="PARENT" />
            <MetricTile icon={<LockKeyhole size={17} />} label="Admin 角色" value={String(adminRoleUsers)} detail="独立授权" />
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>
        ) : null}
        {savedLabel ? (
          <div className="mb-4 rounded-lg border border-mint-300/25 bg-mint-300/10 p-3 text-sm text-mint-200">
            {savedLabel.replace(/\s\d+$/, "")}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingStack />
        ) : users.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <UserCog className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="font-medium text-slate-300">没有匹配用户</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <article key={user.user_id} className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>#{user.user_id}</span>
                      <span>{user.role_code}</span>
                      <span>{user.is_admin_role ? "ADMIN_ROLE" : "NO_ADMIN_ROLE"}</span>
                      <span>{user.status}</span>
                      <span>孩子 {user.child_count}</span>
                      <span>家长 {user.parent_count}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-50">{user.username}</div>
                    <div className="mt-1 text-xs text-slate-500">{user.display_name || "未设置显示名"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="flex h-9 items-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-xs font-medium text-mint-200 transition hover:bg-mint-300/16"
                      type="button"
                      onClick={() => {
                        onResetTargetChange(user);
                        onResetPasswordValueChange("");
                      }}
                    >
                      <KeyRound size={14} />
                      重置密码
                    </button>
                    <button
                      className="h-9 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                      type="button"
                      onClick={() => onUpdateUser(user, { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
                    >
                      {user.status === "ACTIVE" ? "停用" : "启用"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_160px_180px]">
                  <Field label="显示名" icon={<Pencil size={16} />}>
                    <input
                      className="control"
                      defaultValue={user.display_name ?? ""}
                      maxLength={100}
                      onBlur={(event) => {
                        const nextValue = event.target.value.trim();
                        if (nextValue !== (user.display_name ?? "")) {
                          onUpdateUser(user, { display_name: nextValue || null });
                        }
                      }}
                    />
                  </Field>
                  <Field label="角色" icon={<ShieldCheck size={16} />}>
                    <select
                      className="control"
                      value={user.role_code}
                      onChange={(event) => onUpdateUser(user, { role_code: event.target.value as ManagedUserRole })}
                    >
                      <option value="USER">USER</option>
                      <option value="PARENT">PARENT</option>
                    </select>
                  </Field>
                  <Field label="Admin 角色" icon={<LockKeyhole size={16} />}>
                    <label className="flex h-11 items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-200">
                      <span>{user.is_admin_role ? "已授予" : "未授予"}</span>
                      <input
                        checked={user.is_admin_role}
                        className="h-4 w-4 accent-emerald-400"
                        type="checkbox"
                        onChange={(event) => onUpdateUser(user, { is_admin_role: event.target.checked })}
                      />
                    </label>
                  </Field>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-mint-300">
            <Plus size={17} />
            新建用户
          </div>
          <form className="space-y-4" onSubmit={onCreateUser}>
            <Field label="用户名" icon={<ShieldCheck size={16} />}>
              <input
                className="control"
                maxLength={100}
                value={createDraft.username}
                onChange={(event) => onCreateDraftChange({ ...createDraft, username: event.target.value })}
              />
            </Field>
            <Field label="显示名" icon={<Pencil size={16} />}>
              <input
                className="control"
                maxLength={100}
                value={createDraft.display_name}
                onChange={(event) => onCreateDraftChange({ ...createDraft, display_name: event.target.value })}
              />
            </Field>
            <Field label="初始密码" icon={<KeyRound size={16} />}>
              <input
                className="control"
                minLength={6}
                type="password"
                value={createDraft.password}
                onChange={(event) => onCreateDraftChange({ ...createDraft, password: event.target.value })}
              />
            </Field>
            <Field label="角色" icon={<UserCog size={16} />}>
              <select
                className="control"
                value={createDraft.role_code}
                onChange={(event) => onCreateDraftChange({ ...createDraft, role_code: event.target.value as ManagedUserRole })}
              >
                <option value="USER">USER</option>
                <option value="PARENT">PARENT</option>
              </select>
            </Field>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-slate-200">
              <div>
                <div className="font-medium">授予 Admin 角色</div>
                <div className="text-xs text-slate-500">不影响 USER/PARENT 身份和家长关系。</div>
              </div>
              <input
                checked={createDraft.is_admin_role}
                className="h-4 w-4 accent-emerald-400"
                type="checkbox"
                onChange={(event) => onCreateDraftChange({ ...createDraft, is_admin_role: event.target.checked })}
              />
            </label>
            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canCreateUser}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
              创建用户
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-mint-300">
            <LockKeyhole size={17} />
            Admin 模块授权
          </div>
          <div className="space-y-3">
            {adminModules.map((module) => (
              <div key={module.module_code} className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
                <div className="mb-2 text-sm font-medium text-slate-100">{module.label}</div>
                <div className="mb-3 text-xs leading-5 text-slate-500">{module.description}</div>
                <select
                  className="control"
                  disabled={isSaving}
                  value={module.access_level}
                  onChange={(event) =>
                    onUpdateAdminModule(module.module_code, event.target.value as AdminModuleAccessLevel)
                  }
                >
                  <option value="SUPER_ADMIN_ONLY">仅 admin 用户</option>
                  <option value="ADMIN_ROLE">admin 用户 + admin 角色</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-mint-300">
            <UserCog size={17} />
            家长关系
          </div>
          <form className="mb-4 space-y-4" onSubmit={onCreateRelation}>
            <Field label="家长用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                value={relationDraft.parent_user_id}
                onChange={(event) => onRelationDraftChange({ ...relationDraft, parent_user_id: event.target.value })}
              >
                <option value="">选择家长</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="孩子用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                value={relationDraft.child_user_id}
                onChange={(event) => onRelationDraftChange({ ...relationDraft, child_user_id: event.target.value })}
              >
                <option value="">选择孩子</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] font-medium text-slate-200 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-500"
              disabled={!canCreateRelation}
              type="submit"
            >
              建立关系
            </button>
          </form>
          <div className="space-y-2">
            {relations.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-slate-500">暂无关系</div>
            ) : (
              relations.map((relation) => (
                <div key={relation.relation_id} className="rounded-lg border border-white/10 bg-white/[0.028] p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-slate-200">
                      {relation.parent_username} / {relation.child_username}
                    </span>
                    <span className={relation.status === "ACTIVE" ? "text-mint-300" : "text-slate-500"}>{relation.status}</span>
                  </div>
                  <button
                    className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                    type="button"
                    onClick={() => onUpdateRelation(relation, relation.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
                  >
                    {relation.status === "ACTIVE" ? "停用关系" : "启用关系"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 shadow-soft-glow backdrop-blur-xl xl:col-span-2">
        <UserRelationGraphPanel graph={graph} isLoading={isLoading} />
      </section>

      {resetTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-ink-900 p-4 shadow-soft-glow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-mint-300">
                <KeyRound size={18} />
                重置 {resetTarget.username} 密码
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-white/16"
                type="button"
                onClick={() => onResetTargetChange(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={onResetPassword}>
              <Field label="新密码" icon={<KeyRound size={16} />}>
                <input
                  className="control"
                  minLength={6}
                  type="password"
                  value={resetPasswordValue}
                  onChange={(event) => onResetPasswordValueChange(event.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <button
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300 transition hover:border-white/16"
                  type="button"
                  onClick={() => onResetTargetChange(null)}
                >
                  取消
                </button>
                <button
                  className="flex h-10 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:text-slate-500"
                  disabled={resetPasswordValue.length < 6 || isSaving}
                  type="submit"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserRelationGraphPanel({
  graph,
  isLoading,
}: {
  graph: UserRelationGraphResponse | null;
  isLoading: boolean;
}) {
  const [focusUserId, setFocusUserId] = useState("");
  const [relationFilter, setRelationFilter] = useState<"ACTIVE" | "ALL" | "DISABLED">("ACTIVE");
  const [scopeMode, setScopeMode] = useState<"FULL" | "RELATED">("FULL");

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const selectedUserId = focusUserId ? Number(focusUserId) : null;

  useEffect(() => {
    if (!focusUserId) return;
    if (nodes.some((node) => String(node.user_id) === focusUserId)) return;
    setFocusUserId("");
  }, [focusUserId, nodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((edge) => {
      if (relationFilter === "ACTIVE") return edge.status === "ACTIVE";
      if (relationFilter === "DISABLED") return edge.status === "DISABLED";
      return true;
    });
  }, [edges, relationFilter]);

  const visibleNodeIds = useMemo(() => {
    if (scopeMode === "FULL") {
      return new Set(nodes.map((node) => node.user_id));
    }

    const relatedIds = new Set<number>();
    for (const edge of visibleEdges) {
      if (selectedUserId === null || edge.source_user_id === selectedUserId || edge.target_user_id === selectedUserId) {
        relatedIds.add(edge.source_user_id);
        relatedIds.add(edge.target_user_id);
      }
    }
    if (selectedUserId !== null) relatedIds.add(selectedUserId);
    return relatedIds;
  }, [nodes, scopeMode, selectedUserId, visibleEdges]);

  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => visibleNodeIds.has(node.user_id));
  }, [nodes, visibleNodeIds]);

  const orderedNodes = useMemo(() => {
    return [...visibleNodes].sort((left, right) => {
      if (selectedUserId !== null) {
        if (left.user_id === selectedUserId) return -1;
        if (right.user_id === selectedUserId) return 1;
      }
      return right.degree - left.degree || left.username.localeCompare(right.username, "zh-CN");
    });
  }, [selectedUserId, visibleNodes]);

  const graphLayout = useMemo(() => {
    const width = 960;
    const height = 420;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions = new Map<number, { x: number; y: number }>();

    if (orderedNodes.length === 0) {
      return { width, height, positions };
    }

    if (orderedNodes.length === 1) {
      positions.set(orderedNodes[0].user_id, { x: centerX, y: centerY });
      return { width, height, positions };
    }

    if (selectedUserId !== null && orderedNodes.some((node) => node.user_id === selectedUserId)) {
      positions.set(selectedUserId, { x: centerX, y: centerY });
      const surrounding = orderedNodes.filter((node) => node.user_id !== selectedUserId);
      const radiusX = Math.min(330, 180 + surrounding.length * 10);
      const radiusY = Math.min(150, 96 + surrounding.length * 6);

      surrounding.forEach((node, index) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * index) / surrounding.length;
        positions.set(node.user_id, {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
        });
      });
      return { width, height, positions };
    }

    const radiusX = Math.min(340, 190 + orderedNodes.length * 9);
    const radiusY = Math.min(160, 108 + orderedNodes.length * 4);
    orderedNodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / orderedNodes.length;
      positions.set(node.user_id, {
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    });
    return { width, height, positions };
  }, [orderedNodes, selectedUserId]);

  const focusNode =
    orderedNodes.find((node) => node.user_id === selectedUserId) ??
    orderedNodes[0] ??
    null;

  const visibleRelationCount = visibleEdges.filter(
    (edge) => visibleNodeIds.has(edge.source_user_id) && visibleNodeIds.has(edge.target_user_id),
  ).length;
  const legendItems = [
    { label: "焦点用户", tone: "border-mint-300/30 bg-mint-300/12 text-mint-200" },
    { label: "家长用户", tone: "border-sky-300/25 bg-sky-300/12 text-sky-200" },
    { label: "Admin 角色", tone: "border-amber-300/25 bg-amber-300/12 text-amber-100" },
    { label: "停用用户 / 关系", tone: "border-white/10 bg-white/[0.04] text-slate-400" },
  ];

  if (isLoading && !graph) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 text-sm text-mint-300">
          <Network size={17} />
          用户关系图
        </div>
        <LoadingStack />
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 text-sm text-mint-300">
          <Network size={17} />
          用户关系图
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
          当前没有可展示的用户图谱数据。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <Network size={17} />
            用户关系图
          </div>
          <h3 className="text-lg font-semibold text-slate-50">Property Graph 预览</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            当前图谱预览直接映射 `TK_USERS` 顶点与 `TK_RELATIONS` 边，先用现有关系验证展示和筛选语义，再平滑升级到 Oracle
            Property Graph 元数据层。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
          <MetricTile icon={<ShieldCheck size={17} />} label="顶点" value={String(graph.summary.total_users)} detail="TK_USERS" />
          <MetricTile icon={<UserCog size={17} />} label="边" value={String(graph.summary.total_relations)} detail="TK_RELATIONS" />
          <MetricTile icon={<CheckCircle2 size={17} />} label="启用边" value={String(graph.summary.active_relations)} detail="ACTIVE" />
          <MetricTile icon={<LockKeyhole size={17} />} label="孤立用户" value={String(graph.summary.isolated_users)} detail="无有效关系" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="焦点用户" icon={<ShieldCheck size={16} />}>
          <select className="control" value={focusUserId} onChange={(event) => setFocusUserId(event.target.value)}>
            <option value="">全量图谱</option>
            {graph.nodes.map((node) => (
              <option key={node.user_id} value={node.user_id}>
                {node.username}
              </option>
            ))}
          </select>
        </Field>
        <Field label="关系状态" icon={<CheckCircle2 size={16} />}>
          <select
            className="control"
            value={relationFilter}
            onChange={(event) => setRelationFilter(event.target.value as "ACTIVE" | "ALL" | "DISABLED")}
          >
            <option value="ACTIVE">仅 ACTIVE</option>
            <option value="ALL">全部关系</option>
            <option value="DISABLED">仅 DISABLED</option>
          </select>
        </Field>
        <Field label="展示范围" icon={<Filter size={16} />}>
          <select className="control" value={scopeMode} onChange={(event) => setScopeMode(event.target.value as "FULL" | "RELATED")}>
            <option value="FULL">完整图谱</option>
            <option value="RELATED">仅相关节点</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-white/10 bg-white/[0.028] p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {legendItems.map((item) => (
              <span key={item.label} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.tone}`}>
                {item.label}
              </span>
            ))}
          </div>
          {orderedNodes.length === 0 ? (
            <div className="grid min-h-[420px] place-items-center text-center text-sm text-slate-500">
              当前筛选条件下没有匹配的关系网络。
            </div>
          ) : (
            <svg className="h-[420px] w-full" viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}>
              <defs>
                <linearGradient id="user-graph-bg" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(12, 20, 33, 0.98)" />
                  <stop offset="55%" stopColor="rgba(15, 23, 42, 0.94)" />
                  <stop offset="100%" stopColor="rgba(10, 15, 26, 0.98)" />
                </linearGradient>
                <radialGradient id="user-graph-glow-left" cx="22%" cy="20%" r="48%">
                  <stop offset="0%" stopColor="rgba(125, 211, 252, 0.16)" />
                  <stop offset="100%" stopColor="rgba(125, 211, 252, 0)" />
                </radialGradient>
                <radialGradient id="user-graph-glow-right" cx="78%" cy="72%" r="52%">
                  <stop offset="0%" stopColor="rgba(110, 231, 183, 0.14)" />
                  <stop offset="100%" stopColor="rgba(110, 231, 183, 0)" />
                </radialGradient>
                <filter id="user-graph-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur result="blur" stdDeviation="8" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <marker
                  id="user-graph-arrow-active"
                  markerHeight="6"
                  markerWidth="6"
                  orient="auto-start-reverse"
                  refX="5"
                  refY="3"
                >
                  <path d="M0,0 L6,3 L0,6 z" fill="rgba(125, 211, 252, 0.72)" />
                </marker>
                <marker
                  id="user-graph-arrow-muted"
                  markerHeight="6"
                  markerWidth="6"
                  orient="auto-start-reverse"
                  refX="5"
                  refY="3"
                >
                  <path d="M0,0 L6,3 L0,6 z" fill="rgba(148, 163, 184, 0.4)" />
                </marker>
              </defs>

              <rect fill="url(#user-graph-bg)" height={graphLayout.height} rx="18" width={graphLayout.width} />
              <rect fill="url(#user-graph-glow-left)" height={graphLayout.height} rx="18" width={graphLayout.width} />
              <rect fill="url(#user-graph-glow-right)" height={graphLayout.height} rx="18" width={graphLayout.width} />
              <circle cx={graphLayout.width / 2} cy={graphLayout.height / 2} fill="none" r="78" stroke="rgba(110, 231, 183, 0.09)" />
              <circle cx={graphLayout.width / 2} cy={graphLayout.height / 2} fill="none" r="156" stroke="rgba(148, 163, 184, 0.07)" />
              <path
                d={`M120 ${graphLayout.height / 2} H ${graphLayout.width - 120}`}
                fill="none"
                stroke="rgba(148, 163, 184, 0.06)"
                strokeDasharray="5 8"
              />
              <path
                d={`M${graphLayout.width / 2} 84 V ${graphLayout.height - 84}`}
                fill="none"
                stroke="rgba(148, 163, 184, 0.05)"
                strokeDasharray="4 10"
              />

              {visibleEdges.map((edge) => {
                const source = graphLayout.positions.get(edge.source_user_id);
                const target = graphLayout.positions.get(edge.target_user_id);
                if (!source || !target) return null;
                const isActive = edge.status === "ACTIVE";
                const isFocused =
                  selectedUserId === null || edge.source_user_id === selectedUserId || edge.target_user_id === selectedUserId;
                return (
                  <g key={edge.relation_id}>
                    <line
                      stroke={isActive ? "rgba(125, 211, 252, 0.14)" : "rgba(148, 163, 184, 0.08)"}
                      strokeWidth={isActive ? 7 : 4}
                      x1={source.x}
                      x2={target.x}
                      y1={source.y}
                      y2={target.y}
                      opacity={isFocused ? 1 : 0.18}
                      filter="url(#user-graph-soft-glow)"
                    />
                    <line
                      markerEnd={isActive ? "url(#user-graph-arrow-active)" : "url(#user-graph-arrow-muted)"}
                      stroke={isActive ? "rgba(125, 211, 252, 0.62)" : "rgba(148, 163, 184, 0.32)"}
                      strokeWidth={isActive ? 2.2 : 1.4}
                      strokeDasharray={isActive ? undefined : "5 6"}
                      x1={source.x}
                      x2={target.x}
                      y1={source.y}
                      y2={target.y}
                      opacity={isFocused ? 0.95 : 0.28}
                    />
                  </g>
                );
              })}

              {orderedNodes.map((node) => {
                const position = graphLayout.positions.get(node.user_id);
                if (!position) return null;
                const isFocused = node.user_id === selectedUserId;
                const radius = Math.min(18, 10 + Math.max(0, node.degree) * 1.2);
                const badgeFill = isFocused
                  ? "#7dd3c7"
                  : node.status === "DISABLED"
                    ? "#475569"
                    : node.is_admin_role
                      ? "#f59e0b"
                      : node.role_code === "PARENT"
                        ? "#38bdf8"
                        : "#cbd5e1";
                const ringStroke = isFocused
                  ? "rgba(125, 211, 252, 0.72)"
                  : node.status === "DISABLED"
                    ? "rgba(148, 163, 184, 0.25)"
                    : "rgba(255, 255, 255, 0.12)";
                const labelWidth = estimateGraphNodeLabelWidth(node.username, node.display_name, node.is_admin_role);
                const labelX = position.x - labelWidth / 2;
                const labelY = position.y + radius + 12;
                const titleColor = node.status === "DISABLED" ? "#cbd5e1" : "#f8fafc";
                const subtitleColor = isFocused ? "#99f6e4" : "#94a3b8";
                const relationLabel = [node.role_code, node.is_admin_role ? "ADMIN" : null].filter(Boolean).join(" · ");
                const subtitle = node.display_name || relationLabel || "USER";

                return (
                  <g
                    key={node.user_id}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => setFocusUserId(String(node.user_id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setFocusUserId(String(node.user_id));
                      }
                    }}
                  >
                    <circle
                      cx={position.x}
                      cy={position.y}
                      fill={isFocused ? "rgba(125, 211, 252, 0.16)" : "rgba(15, 23, 42, 0.6)"}
                      r={radius + 10}
                      opacity={isFocused ? 1 : 0.75}
                      filter="url(#user-graph-soft-glow)"
                    />
                    <circle
                      cx={position.x}
                      cy={position.y}
                      fill="rgba(15, 23, 42, 0.92)"
                      r={radius}
                      stroke={ringStroke}
                      strokeWidth={isFocused ? 2.8 : 1.8}
                    />
                    <circle cx={position.x} cy={position.y} fill={badgeFill} r={Math.max(4, radius - 5)} opacity={0.98} />
                    <rect
                      x={labelX}
                      y={labelY}
                      width={labelWidth}
                      height="42"
                      rx="12"
                      fill={isFocused ? "rgba(15, 23, 42, 0.96)" : "rgba(15, 23, 42, 0.86)"}
                      stroke={isFocused ? "rgba(125, 211, 252, 0.42)" : "rgba(255, 255, 255, 0.1)"}
                      strokeWidth={isFocused ? 1.6 : 1}
                    />
                    <text
                      fill={titleColor}
                      fontSize="12.5"
                      fontWeight="600"
                      textAnchor="middle"
                      x={position.x}
                      y={labelY + 17}
                    >
                      {truncateGraphNodeText(node.username, 16)}
                    </text>
                    <text
                      fill={subtitleColor}
                      fontSize="10.5"
                      fontWeight="500"
                      textAnchor="middle"
                      x={position.x}
                      y={labelY + 31}
                    >
                      {truncateGraphNodeText(subtitle, 20)}
                    </text>
                    {isFocused ? (
                      <rect
                        x={labelX + labelWidth - 44}
                        y={labelY + 10}
                        width="32"
                        height="16"
                        rx="8"
                        fill="rgba(125, 211, 252, 0.16)"
                        stroke="rgba(125, 211, 252, 0.22)"
                      />
                    ) : null}
                    {isFocused ? (
                      <text fill="#bae6fd" fontSize="9.5" fontWeight="600" textAnchor="middle" x={labelX + labelWidth - 28} y={labelY + 21}>
                        Focus
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
            <div className="mb-3 text-sm font-medium text-slate-100">当前筛选</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-slate-500">可见节点</div>
                <div className="mt-1 text-lg font-semibold text-slate-50">{orderedNodes.length}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-slate-500">可见边</div>
                <div className="mt-1 text-lg font-semibold text-slate-50">{visibleRelationCount}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">图名 {graph.recommendation.graph_name}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">{graph.recommendation.graph_type}</span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
            <div className="mb-3 text-sm font-medium text-slate-100">焦点用户</div>
            {focusNode ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-50">{focusNode.username}</div>
                  <div className="mt-1 text-xs text-slate-500">{focusNode.display_name || "未设置显示名"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-slate-500">角色</div>
                    <div className="mt-1 text-slate-200">{focusNode.role_code}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-slate-500">状态</div>
                    <div className="mt-1 text-slate-200">{focusNode.status}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-slate-500">家长数</div>
                    <div className="mt-1 text-slate-200">{focusNode.parent_count}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-slate-500">孩子数</div>
                    <div className="mt-1 text-slate-200">{focusNode.child_count}</div>
                  </div>
                </div>
                <button
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
                  type="button"
                  onClick={() => setFocusUserId("")}
                >
                  清除焦点
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500">选择一个用户，查看局部关系和角色属性。</div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
            <div className="mb-3 text-sm font-medium text-slate-100">Oracle Property Graph 实施建议</div>
            <div className="mb-3 text-xs leading-5 text-slate-400">{graph.recommendation.implementation_status}</div>
            <div className="mb-3 grid gap-2 text-xs text-slate-300">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                顶点表: {graph.recommendation.vertex_tables.join(", ")}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                边表: {graph.recommendation.edge_tables.join(", ")}
              </div>
            </div>
            <div className="space-y-2 text-xs leading-5 text-slate-400">
              {graph.recommendation.notes.map((note) => (
                <div key={note} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncateGraphNodeText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}

function estimateGraphNodeLabelWidth(username: string, displayName: string | null, isAdminRole: boolean) {
  const subtitle = displayName || (isAdminRole ? "ADMIN" : "USER");
  const contentWidth = Math.max(username.length * 7.6, subtitle.length * 6.3);
  return Math.min(170, Math.max(108, contentWidth + 28));
}

function SkillManager({
  detail,
  draft,
  error,
  fileContent,
  isDetailLoading,
  isFileSaving,
  isLoading,
  isSaving,
  isUploading,
  items,
  modelOptions,
  newDraft,
  scope,
  saveError,
  savedLabel,
  selectedFile,
  total,
  onCreate,
  onDelete,
  onDraftChange,
  onFileChange,
  onFileSelect,
  onNewDraftChange,
  onScopeChange,
  onSave,
  onSaveFile,
  onSelect,
  onUpload,
}: {
  detail: SkillDetail | null;
  draft: SkillDraft;
  error: string | null;
  fileContent: string;
  isDetailLoading: boolean;
  isFileSaving: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  items: SkillSummary[];
  modelOptions: { value: string; label: string }[];
  newDraft: SkillDraft;
  scope: "owned" | "shared";
  saveError: string | null;
  savedLabel: string | null;
  selectedFile: SkillFile | null;
  total: number;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onDraftChange: (draft: SkillDraft) => void;
  onFileChange: (content: string) => void;
  onFileSelect: (file: SkillFile) => void;
  onNewDraftChange: (draft: SkillDraft) => void;
  onScopeChange: (scope: "owned" | "shared") => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveFile: () => void;
  onSelect: (skillId: string) => void;
  onUpload: (file: File | null) => void;
}) {
  const skillPromptCharacterLimit = 6000;
  const canCreate = newDraft.name.trim().length > 0 && !isSaving;
  const canSave = Boolean(detail?.can_edit) && draft.name.trim().length > 0 && !isSaving;
  const canSaveFile = Boolean(detail?.can_edit && selectedFile?.editable) && !isFileSaving;
  const newSkillContentCharacterCount = Array.from(newDraft.content).length;
  const isSelectedSkillMarkdown = selectedFile?.path.endsWith("SKILL.md") ?? false;
  const selectedSkillMarkdownCharacterCount = Array.from(fileContent).length;
  const [isCreateSkillDialogOpen, setIsCreateSkillDialogOpen] = useState(false);
  const [isUploadSkillZipDialogOpen, setIsUploadSkillZipDialogOpen] = useState(false);
  const [isSkillSidebarCollapsed, setIsSkillSidebarCollapsed] = useState(false);
  const [abilityMode, setAbilityMode] = useState<"agents" | "skills">("agents");
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const skillButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [expandedSkillDirectories, setExpandedSkillDirectories] = useState<Set<string>>(() => new Set());
  const skillFileGroups = useMemo(() => {
    const rootFiles: SkillFile[] = [];
    const directoryMap = new Map<string, SkillFile[]>();

    for (const file of detail?.files ?? []) {
      const separatorIndex = file.path.indexOf("/");
      if (separatorIndex === -1) {
        rootFiles.push(file);
        continue;
      }

      const directoryName = file.path.slice(0, separatorIndex);
      const directoryFiles = directoryMap.get(directoryName) ?? [];
      directoryFiles.push(file);
      directoryMap.set(directoryName, directoryFiles);
    }

    return {
      rootFiles,
      directories: Array.from(directoryMap, ([name, files]) => ({ name, files })),
    };
  }, [detail?.files]);

  useEffect(() => {
    setExpandedSkillDirectories(new Set());
  }, [detail?.id]);

  useEffect(() => {
    if (detail?.id) setActiveSkillId(detail.id);
  }, [detail?.id]);

  useEffect(() => {
    if (activeSkillId && !items.some((skill) => skill.id === activeSkillId)) setActiveSkillId(null);
  }, [activeSkillId, items]);

  function selectSkill(skillId: string, focus = false) {
    setActiveSkillId(skillId);
    onSelect(skillId);
    if (focus) skillButtonRefs.current.get(skillId)?.focus();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (abilityMode !== "skills" || (event.key !== "ArrowUp" && event.key !== "ArrowDown") || event.altKey || event.ctrlKey || event.metaKey || items.length === 0) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable)) return;
      event.preventDefault();
      const currentIndex = items.findIndex((skill) => skill.id === activeSkillId);
      const nextIndex = currentIndex === -1 ? (event.key === "ArrowDown" ? 0 : items.length - 1) : event.key === "ArrowDown" ? Math.min(currentIndex + 1, items.length - 1) : Math.max(currentIndex - 1, 0);
      selectSkill(items[nextIndex].id, true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abilityMode, activeSkillId, items]);

  function handleToggleSkillDirectory(directoryName: string) {
    setExpandedSkillDirectories((current) => {
      const next = new Set(current);
      if (next.has(directoryName)) {
        next.delete(directoryName);
      } else {
        next.add(directoryName);
      }
      return next;
    });
  }

  function renderSkillFileButton(file: SkillFile, nested = false) {
    const fileName = nested ? file.path.split("/").slice(1).join("/") : file.path;

    return (
      <button
        key={file.path}
        className={`block w-full rounded-md border px-3 py-2 text-left text-xs transition ${
          selectedFile?.path === file.path
            ? "border-mint-300/30 bg-mint-300/10 text-mint-100"
            : "border-white/10 bg-white/[0.028] text-slate-400 hover:border-mint-300/25"
        } ${file.readable ? "" : "opacity-55"} ${nested ? "ml-5 w-[calc(100%-1.25rem)]" : ""}`}
        disabled={!file.readable}
        type="button"
        onClick={() => onFileSelect(file)}
      >
        <span className="block truncate">{fileName}</span>
        <span className="mt-1 block text-[11px] text-slate-600">
          {formatAmount(file.size)} bytes{file.readable ? (file.editable ? " · 可编辑" : " · 只读") : " · 不可预览"}
        </span>
      </button>
    );
  }

  return (
    <div className={`grid flex-1 gap-4 px-4 pb-4 pt-2 xl:gap-x-2 ${isSkillSidebarCollapsed ? "xl:grid-cols-[28px_minmax(0,1fr)]" : "xl:grid-cols-[380px_minmax(0,1fr)]"}`}>
      <aside className={`relative min-w-0 rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl ${isSkillSidebarCollapsed ? "xl:p-0" : "p-2.5"}`}>
        <div className={isSkillSidebarCollapsed ? "space-y-4 xl:hidden" : "space-y-4 xl:pr-7"}>
        <section className="rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Layers3 size={17} />
                AI Orchestration
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Agent 与 Skill</h2>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
              {formatAmount(total)}
            </span>
          </div>

          <div className="mb-4 flex gap-2">
            <button className={`rounded-lg border px-3 py-2 text-xs transition ${abilityMode === "agents" ? "border-mint-300/30 bg-mint-300/12 text-mint-200" : "border-white/10 bg-white/[0.03] text-slate-400"}`} type="button" onClick={() => setAbilityMode("agents")}>Agent</button>
            <button className={`rounded-lg border px-3 py-2 text-xs transition ${abilityMode === "skills" ? "border-mint-300/30 bg-mint-300/12 text-mint-200" : "border-white/10 bg-white/[0.03] text-slate-400"}`} type="button" onClick={() => setAbilityMode("skills")}>Skill</button>
          </div>
          {abilityMode === "skills" ? <>
          <div className="mb-4 flex gap-2">
            <button
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                scope === "owned"
                  ? "border-mint-300/30 bg-mint-300/12 text-mint-200"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-mint-300/25 hover:text-slate-200"
              }`}
              type="button"
              onClick={() => onScopeChange("owned")}
            >
              我的 Skill
            </button>
            <button
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                scope === "shared"
                  ? "border-mint-300/30 bg-mint-300/12 text-mint-200"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-mint-300/25 hover:text-slate-200"
              }`}
              type="button"
              onClick={() => onScopeChange("shared")}
            >
              共享与系统 Skill
            </button>
          </div>

          {isLoading ? (
            <LoadingStack />
          ) : error ? (
            <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>
          ) : items.length > 0 ? (
            <nav aria-label="Skill 列表" className="space-y-1">
              {items.map((skill) => {
                const selected = activeSkillId === skill.id;
                return (
                  <button
                    key={skill.id}
                    ref={(element) => { if (element) skillButtonRefs.current.set(skill.id, element); else skillButtonRefs.current.delete(skill.id); }}
                    className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300/55 ${
                      selected
                        ? "border-mint-300/30 bg-mint-300/10 text-mint-100"
                        : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-100"
                    }`}
                    type="button"
                    title={skill.description || skill.name}
                    onClick={() => selectSkill(skill.id)}
                  >
                    <Layers3 className={`shrink-0 ${selected ? "text-mint-300" : "text-slate-500"}`} size={15} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
                    <span className={`shrink-0 text-[11px] ${selected ? "text-mint-200/75" : "text-slate-600"}`}>{skill.skill_type === "system" ? "系统" : skill.published ? "已分享" : "自建"}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
              暂无 skill。可以新建自定义 skill，或上传标准 skill zip 包。
            </div>
          )}
          </> : <AgentNavigation />}
        </section>

        </div>
        <WorkspaceSidebarCollapseToggle isCollapsed={isSkillSidebarCollapsed} label="Skill 列表与操作面板" onToggle={() => setIsSkillSidebarCollapsed((collapsed) => !collapsed)} />
      </aside>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        {abilityMode === "agents" ? <CapabilityManager /> : detail ? (
          <div className="space-y-5">
            <form className="rounded-lg border border-white/10 bg-white/[0.025] p-4" onSubmit={onSave}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                    <ShieldCheck size={17} />
                    Metadata
                  </div>
                  <h2 className="text-lg font-semibold text-slate-50">Skill 元信息</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{detail.skill_type === "system" ? "系统自带" : "用户自建"}</span>
                    <span>{detail.owner_username ? `Owner: ${detail.owner_username}` : "Owner: 系统"}</span>
                    <span>{detail.published ? "已分享" : "仅自己可见"}</span>
                    {!detail.can_edit ? <span>当前仅可调用，不可编辑</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs font-medium text-slate-200 transition hover:border-mint-300/30 hover:text-mint-300"
                    type="button"
                    onClick={() => setIsUploadSkillZipDialogOpen(true)}
                  >
                    <Archive size={15} />
                    导入 Zip
                  </button>
                  <button
                    className="flex h-9 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20"
                    type="button"
                    onClick={() => setIsCreateSkillDialogOpen(true)}
                  >
                    <FilePlus2 size={15} />
                    新建 Skill
                  </button>
                  <button
                    className="flex h-9 items-center gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 text-xs font-medium text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSaving || !detail.can_delete}
                    type="button"
                    onClick={onDelete}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                  <button
                    className="flex h-9 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                    disabled={!canSave}
                    type="submit"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                    {savedLabel ?? "保存"}
                  </button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
                <label className="block text-xs font-medium text-slate-500">
                  名称
                  <input
                    className="control mt-2 h-10"
                    disabled={!detail.can_edit}
                    value={draft.name}
                    onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 self-end rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-sm text-slate-300">
                  <span>启用</span>
                  <input
                    checked={draft.enabled}
                    className="h-4 w-4 accent-mint-300"
                    disabled={!detail.can_edit}
                    type="checkbox"
                    onChange={(event) => onDraftChange({ ...draft, enabled: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 self-end rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-sm text-slate-300">
                  <span>分享</span>
                  <input
                    checked={draft.published}
                    className="h-4 w-4 accent-mint-300"
                    disabled={!detail.can_edit}
                    type="checkbox"
                    onChange={(event) => onDraftChange({ ...draft, published: event.target.checked })}
                  />
                </label>
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-500">
                描述
                <textarea
                  className="control mt-2 min-h-24 resize-y"
                  disabled={!detail.can_edit}
                  value={draft.description}
                  onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                />
              </label>
            </form>

            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <FileText className="text-mint-300" size={16} />
                  文件
                </div>
                <div className="space-y-2">
                  {skillFileGroups.rootFiles.map((file) => renderSkillFileButton(file))}
                  {skillFileGroups.directories.map((directory) => {
                    const expanded = expandedSkillDirectories.has(directory.name);

                    return (
                      <div key={directory.name} className="space-y-2">
                        <button
                          className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.028] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-mint-300/25 hover:bg-white/[0.045]"
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => handleToggleSkillDirectory(directory.name)}
                        >
                          {expanded ? (
                            <FolderOpen className="shrink-0 text-mint-300" size={15} />
                          ) : (
                            <Folder className="shrink-0 text-slate-500" size={15} />
                          )}
                          <span className="min-w-0 flex-1 truncate">{directory.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-600">
                            {formatAmount(directory.files.length)} files
                          </span>
                          {expanded ? (
                            <ChevronUp className="shrink-0 text-slate-500" size={14} />
                          ) : (
                            <ChevronDown className="shrink-0 text-slate-500" size={14} />
                          )}
                        </button>
                        {expanded ? directory.files.map((file) => renderSkillFileButton(file, true)) : null}
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-200">{selectedFile?.path ?? "未选择文件"}</div>
                    <div className="text-xs text-slate-600">
                      {selectedFile
                        ? selectedFile.editable
                          ? "支持在线编辑。"
                          : selectedFile.readable
                            ? "当前文件仅支持只读预览。"
                            : "当前文件不可在线预览。"
                        : "支持编辑 Markdown、JSON、YAML、代码和文本文件。"}
                    </div>
                    {isSelectedSkillMarkdown ? (
                      <div className="mt-2">
                        <SkillPromptCharacterNotice characterCount={selectedSkillMarkdownCharacterCount} limit={skillPromptCharacterLimit} />
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                    disabled={!canSaveFile}
                    type="button"
                    onClick={onSaveFile}
                  >
                    {isFileSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                    保存文件
                  </button>
                </div>
                {isDetailLoading ? (
                  <LoadingStack />
                ) : selectedFile?.readable ? (
                  <textarea
                    className="control min-h-[520px] resize-y font-mono text-xs leading-6"
                    readOnly={!selectedFile.editable || !detail.can_edit}
                    value={fileContent}
                    onChange={(event) => onFileChange(event.target.value)}
                  />
                ) : (
                  <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-black/10 text-center text-sm text-slate-500">
                    选择一个可预览文件后在这里查看或修改内容。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[620px] place-items-center text-center">
            <div>
              <Layers3 className="mx-auto mb-3 text-slate-600" size={40} />
              <div className="mb-1 font-medium text-slate-300">选择或创建 Skill</div>
              <p className="text-sm text-slate-500">Skill 的描述和 SKILL.md 内容可被 AI 问数等模块调用，用于影响输出结构和排版。</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button className="flex h-10 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300" type="button" onClick={() => setIsCreateSkillDialogOpen(true)}><FilePlus2 size={16} />新建 Skill</button>
                <button className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300" type="button" onClick={() => setIsUploadSkillZipDialogOpen(true)}><Archive size={16} />导入 Zip</button>
              </div>
            </div>
          </div>
        )}

        {saveError ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
            <span>{saveError}</span>
          </div>
        ) : null}
      </section>
      {isCreateSkillDialogOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setIsCreateSkillDialogOpen(false); }}>
        <section aria-modal="true" className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg border border-mint-300/20 bg-ink-900 shadow-soft-glow sm:max-h-[88vh] sm:rounded-lg" role="dialog" aria-label="新建自定义 Skill">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><FilePlus2 size={17} />New Skill</div><h2 className="text-xl font-semibold text-slate-50">新建自定义 Skill</h2><p className="mt-1 text-xs leading-5 text-slate-500">填写内容或使用 AI 创建生成草稿；点击新建才会保存。</p></div><button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300" disabled={isSaving} title="关闭" type="button" onClick={() => setIsCreateSkillDialogOpen(false)}><X size={17} /></button></div>
          <form className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" onSubmit={onCreate}>
            <input className="control h-10" value={newDraft.name} onChange={(event) => onNewDraftChange({ ...newDraft, name: event.target.value })} placeholder="Skill 名称" />
            <textarea className="control min-h-20 resize-none" value={newDraft.description} onChange={(event) => onNewDraftChange({ ...newDraft, description: event.target.value })} placeholder="描述这个 skill 会如何影响输出结构、语气或排版。" />
            <SkillAiCreation draft={newDraft} disabled={isSaving} modelOptions={modelOptions} onApply={(content) => onNewDraftChange({ ...newDraft, content })} />
            <textarea className="control min-h-52 resize-y font-mono text-xs leading-6" value={newDraft.content} onChange={(event) => onNewDraftChange({ ...newDraft, content: event.target.value })} placeholder={"# Skill 名称\n\n描述：...\n\n## 使用规则\n- ..."} />
            <SkillPromptCharacterNotice characterCount={newSkillContentCharacterCount} limit={skillPromptCharacterLimit} />
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-sm text-slate-300"><span>与其他用户分享</span><input checked={newDraft.published} className="h-4 w-4 accent-mint-300" type="checkbox" onChange={(event) => onNewDraftChange({ ...newDraft, published: event.target.checked })} /></label>
            <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 pt-4"><button className="h-10 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-slate-300" disabled={isSaving} type="button" onClick={() => setIsCreateSkillDialogOpen(false)}>取消</button><button className="flex h-10 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canCreate} type="submit">{isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}新建 Skill</button></div>
          </form>
        </section>
      </div> : null}
      {isUploadSkillZipDialogOpen ? <div className="fixed inset-0 z-[60] flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUploading) setIsUploadSkillZipDialogOpen(false); }}>
        <section aria-modal="true" className="w-full max-w-lg rounded-t-lg border border-mint-300/20 bg-ink-900 p-4 shadow-soft-glow sm:rounded-lg sm:p-5" role="dialog" aria-label="导入标准 Skill Zip"><div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><Archive size={17} />Import Skill</div><h2 className="text-xl font-semibold text-slate-50">导入标准 Skill Zip</h2></div><button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300" disabled={isUploading} title="关闭" type="button" onClick={() => setIsUploadSkillZipDialogOpen(false)}><X size={17} /></button></div><input className="control mt-5 h-10 cursor-pointer leading-10 file:mr-3 file:h-full file:border-0 file:bg-white/[0.07] file:px-3 file:text-sm file:font-medium file:text-slate-200" accept=".zip,application/zip" disabled={isUploading} type="file" onChange={(event) => { onUpload(event.target.files?.[0] ?? null); event.target.value = ""; }} />{isUploading ? <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={15} />正在上传并解析...</div> : null}</section>
      </div> : null}
    </div>
  );
}

function SkillPromptCharacterNotice({ characterCount, limit }: { characterCount: number; limit: number }) {
  const overflow = Math.max(0, characterCount - limit);
  const remaining = Math.max(0, limit - characterCount);

  return (
    <div className={`text-xs leading-5 ${overflow > 0 ? "text-amberline" : "text-slate-500"}`}>
      <span>AI 调用内容：{formatAmount(characterCount)} / {formatAmount(limit)} 字符</span>
      {overflow > 0 ? (
        <span> · 超出 {formatAmount(overflow)} 字符；调用时仅使用前 {formatAmount(limit)} 字符。</span>
      ) : (
        <span> · 剩余 {formatAmount(remaining)} 字符</span>
      )}
    </div>
  );
}

function HistoryAskPanel({
  answer,
  error,
  hasCopiedAnswer,
  isLoading,
  isLlmConfigLoading,
  isLlmConfigSaving,
  llmConfig,
  llmConfigDraft,
  llmConfigError,
  llmConfigSaved,
  ontologyTerms,
  ontologyDraft,
  ontologyEditingId,
  ontologyError,
  ontologyLoading,
  ontologySaving,
  domainCode,
  domains,
  quickQuestions,
  quickQuestionsError,
  quickQuestionsLoading,
  quickQuestionSaving,
  canManageSystemOntology,
  modelName,
  modelOptions,
  question,
  selectedSkillIds,
  onCopyAnswer,
  onLlmConfigDraftChange,
  onLlmConfigSave,
  onOntologyDraftChange,
  onOntologySave,
  onOntologyEdit,
  onOntologyDelete,
  onOntologyCancel,
  onDomainChange,
  onCreateQuickQuestion,
  onUpdateQuickQuestion,
  onDeleteQuickQuestion,
  onModelNameChange,
  onOpenHistory,
  onQuestionChange,
  onSubmit,
  onSelectedSkillIdsChange,
}: {
  answer: HistoryAskResponse | null;
  error: string | null;
  hasCopiedAnswer: boolean;
  isLoading: boolean;
  isLlmConfigLoading: boolean;
  isLlmConfigSaving: boolean;
  llmConfig: LlmConfig | null;
  llmConfigDraft: LlmConfigDraft;
  llmConfigError: string | null;
  llmConfigSaved: boolean;
  ontologyTerms: HistoryOntologyTerm[];
  ontologyDraft: HistoryOntologyDraft;
  ontologyEditingId: number | null;
  ontologyError: string | null;
  ontologyLoading: boolean;
  ontologySaving: boolean;
  domainCode: "history" | "todos" | "knowledge" | "english_materials";
  domains: HistoryAskDomain[];
  quickQuestions: HistoryAskQuickQuestion[];
  quickQuestionsError: string | null;
  quickQuestionsLoading: boolean;
  quickQuestionSaving: boolean;
  canManageSystemOntology: boolean;
  modelName: string;
  modelOptions: { value: string; label: string }[];
  question: string;
  selectedSkillIds: string[];
  onCopyAnswer: (view: MarkdownContentView) => void;
  onLlmConfigDraftChange: (draft: LlmConfigDraft) => void;
  onLlmConfigSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onOntologyDraftChange: (draft: HistoryOntologyDraft) => void;
  onOntologySave: (event: React.FormEvent<HTMLFormElement>) => void;
  onOntologyEdit: (term: HistoryOntologyTerm) => void;
  onOntologyDelete: (termId: number) => void;
  onOntologyCancel: () => void;
  onDomainChange: (code: "history" | "todos" | "knowledge" | "english_materials") => void;
  onCreateQuickQuestion: (question: string) => Promise<boolean>;
  onUpdateQuickQuestion: (id: number, question: string) => Promise<boolean>;
  onDeleteQuickQuestion: (id: number) => Promise<boolean>;
  onModelNameChange: (modelName: string) => void;
  onOpenHistory: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectedSkillIdsChange: (skillIds: string[]) => void;
}) {
  const [answerView, setAnswerView] = useState<MarkdownContentView>("rendered");
  const [isModelConfigExpanded, setIsModelConfigExpanded] = useState(false);
  const [isOntologyExpanded, setIsOntologyExpanded] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [isQuickQuestionManagerOpen, setIsQuickQuestionManagerOpen] = useState(false);
  const [quickQuestionDraft, setQuickQuestionDraft] = useState("");
  const [editingQuickQuestionId, setEditingQuickQuestionId] = useState<number | null>(null);
  const [showQuerySql, setShowQuerySql] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const canSubmit = question.trim().length >= 2 && !isLoading;
  const canSaveLlmConfig =
    !isLlmConfigSaving &&
    (!llmConfigDraft.enabled ||
      (llmConfigDraft.base_url.trim().length > 0 &&
        llmConfigDraft.model_name.trim().length > 0 &&
        Boolean(llmConfig?.has_api_key)));
  const examplesByDomain: Record<typeof domainCode, string[]> = {
    history: ["总结最近30天关于“中信泰富”的工作记录。", "针对 alfred 最近一周的工作记录，总结一份周报。", "向量待更新的历史记录里哪类工作最多？"],
    todos: ["列出最近一周待处理的事项。", "总结本月已完成待办的主题分布。"],
    knowledge: ["查询与“项目上线”相关的可信知识。", "总结本月新增的未发布知识。"],
    english_materials: ["查询与会议沟通相关的英语表达。", "列出已标记的英语素材。"],
  };
  const examples = quickQuestions.length ? quickQuestions.map((item) => item.question) : examplesByDomain[domainCode];
  const selectedDomain = domains.find((domain) => domain.code === domainCode);
  const answerDomainCode = answer?.domain?.code;
  const recordDestinationLabel = answerDomainCode === "todos" ? "查看待办事项" : answerDomainCode === "knowledge" ? "查看可信知识" : answerDomainCode === "english_materials" ? "查看英语素材" : "查看历史记录";

  useEffect(() => {
    setIsQuickQuestionManagerOpen(false);
    setQuickQuestionDraft("");
    setEditingQuickQuestionId(null);
  }, [domainCode]);

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Bot size={17} />
                Ask Data
              </div>
              <h2 className="text-xl font-semibold text-slate-50">自然语言问数</h2>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[420px]">
              <Field label="业务域" icon={<Database size={16} />}>
                <select
                  className="control"
                  disabled={isLoading}
                  value={domainCode}
                  onChange={(event) => onDomainChange(event.target.value as "history" | "todos" | "knowledge" | "english_materials")}
                >
                  {domains.map((domain) => <option key={domain.code} value={domain.code}>{domain.name}</option>)}
                </select>
              </Field>
              <Field label="执行模型" icon={<Settings2 size={16} />}>
                <select
                  className="control"
                  disabled={isLoading}
                  value={modelName}
                  onChange={(event) => onModelNameChange(event.target.value)}
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
            <span>{selectedDomain?.description ?? "正在加载可用业务域..."}</span>
            {selectedDomain?.source_tables.length ? <span>数据来源（受控只读）：{selectedDomain.source_tables.join("、")}</span> : null}
            <span>{modelName === HISTORY_ASK_CONFIGURED_MODEL ? "使用已启用的 OpenAI 兼容模型配置。" : "使用 Codex CLI 在只读模式下生成问数总结。"}</span>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <textarea
              className="control min-h-[150px] resize-none leading-7"
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="例如：针对 alfred 的工作记录，请总结关于“中信泰富”项目的工作量统计。"
            />
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300"><Sparkles size={14} className="text-mint-300" />快捷问题</div>
                <button className="text-xs text-mint-200 transition hover:text-mint-100" type="button" onClick={() => setIsQuickQuestionManagerOpen((open) => !open)}>
                  {isQuickQuestionManagerOpen ? "收起维护" : "维护快捷问题"}
                </button>
              </div>
              {quickQuestionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={14} />正在加载快捷问题...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button key={example} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400 transition hover:border-mint-300/30 hover:text-mint-200" type="button" onClick={() => onQuestionChange(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              )}
              {!quickQuestions.length && !quickQuestionsLoading ? <p className="mt-2 text-xs leading-5 text-slate-500">当前展示系统示例；添加后将仅展示你在该业务域维护的问题。</p> : null}
              {isQuickQuestionManagerOpen ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input className="control flex-1" disabled={quickQuestionSaving} value={quickQuestionDraft} onChange={(event) => setQuickQuestionDraft(event.target.value)} placeholder="输入一个常用自然语言问题" />
                    <button
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:text-slate-500"
                      disabled={quickQuestionSaving || quickQuestionDraft.trim().length < 2}
                      type="button"
                      onClick={async () => {
                        const saved = editingQuickQuestionId
                          ? await onUpdateQuickQuestion(editingQuickQuestionId, quickQuestionDraft.trim())
                          : await onCreateQuickQuestion(quickQuestionDraft.trim());
                        if (saved) {
                          setQuickQuestionDraft("");
                          setEditingQuickQuestionId(null);
                        }
                      }}
                    >
                      {quickQuestionSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      {editingQuickQuestionId ? "更新" : "添加"}
                    </button>
                    {editingQuickQuestionId ? <button className="h-10 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:text-mint-200" type="button" onClick={() => { setEditingQuickQuestionId(null); setQuickQuestionDraft(""); }}>取消</button> : null}
                  </div>
                  {quickQuestionsError ? <p className="mt-2 text-xs text-red-200">{quickQuestionsError}</p> : null}
                  {quickQuestions.length ? (
                    <div className="mt-3 space-y-2">
                      {quickQuestions.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-md border border-white/8 bg-black/10 px-2 py-2">
                          <button className="min-w-0 flex-1 truncate text-left text-xs text-slate-300 hover:text-mint-200" type="button" onClick={() => { setEditingQuickQuestionId(item.id); setQuickQuestionDraft(item.question); }}>{item.question}</button>
                          <button className="p-1 text-slate-500 transition hover:text-mint-200" type="button" aria-label={`编辑快捷问题 ${item.question}`} onClick={() => { setEditingQuickQuestionId(item.id); setQuickQuestionDraft(item.question); }}><Pencil size={14} /></button>
                          <button className="p-1 text-slate-500 transition hover:text-red-200 disabled:opacity-50" disabled={quickQuestionSaving} type="button" aria-label={`删除快捷问题 ${item.question}`} onClick={() => void onDeleteQuickQuestion(item.id)}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <SkillSelector
              agentCode={domainCode === "todos" ? "todo-ask" : domainCode === "knowledge" ? "knowledge-ask" : domainCode === "english_materials" ? "english-ask" : "history-ask"}
              disabled={isLoading}
              maxSelections={8}
              selectedSkillIds={selectedSkillIds}
              onSelectedSkillIdsChange={onSelectedSkillIdsChange}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-slate-500">
                当前按记录数、活跃日期、类型分布和代表性记录统计；不会直接让 AI 执行任意 SQL。
              </div>
              <button
                className="flex h-11 min-w-32 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canSubmit}
                type="submit"
              >
                {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                {isLoading ? "分析中" : "开始问数"}
              </button>
            </div>
          </form>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            {isLoading ? (
              <LoadingStack />
            ) : answer ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/15 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-md border px-2 py-1 ${
                        answer.llm_used
                          ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                          : "border-amberline/25 bg-amberline/10 text-amber-100"
                      }`}
                    >
                      {answer.llm_used ? "LLM 总结" : "统计兜底"}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                      {formatAmount(answer.stats.matched_count)} 条记录
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                      {formatAmount(answer.stats.active_days)} 个活跃日期
                    </span>
                    {(answer.filters?.semantic_terms ?? []).map((term) => (
                      <span key={term} className="rounded-md border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 py-1 text-fuchsia-100">
                        概念：{term}
                      </span>
                    ))}
                    {(answer.selected_skills ?? []).map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-md border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-sky-200"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex h-9 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
                      <button
                        className={`px-3 text-xs transition ${
                          answerView === "rendered" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                        }`}
                        type="button"
                        onClick={() => setAnswerView("rendered")}
                      >
                        美化
                      </button>
                      <button
                        className={`border-l border-white/10 px-3 text-xs transition ${
                          answerView === "raw" ? "bg-mint-300/14 text-mint-200" : "text-slate-400 hover:text-mint-200"
                        }`}
                        type="button"
                        onClick={() => setAnswerView("raw")}
                      >
                        裸文本
                      </button>
                    </div>
                    <button
                      className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                      type="button"
                      onClick={() => onCopyAnswer(answerView)}
                    >
                      {hasCopiedAnswer ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                      {hasCopiedAnswer ? "已复制" : answerView === "rendered" ? "复制美化" : "复制裸文本"}
                    </button>
                    <button
                      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition ${
                        isAuditExpanded
                          ? "border-mint-300/30 bg-mint-300/10 text-mint-200"
                          : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-200"
                      }`}
                      type="button"
                      onClick={() => setIsAuditExpanded((expanded) => {
                        if (expanded) {
                          setShowQuerySql(false);
                          setShowPrompt(false);
                        }
                        return !expanded;
                      })}
                    >
                      <Code2 size={15} />
                      {isAuditExpanded ? "收起审计" : "审计"}
                    </button>
                    <button
                      className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                      type="button"
                      onClick={onOpenHistory}
                    >
                      <Database size={15} />
                      {recordDestinationLabel}
                    </button>
                  </div>
                </div>
                {isAuditExpanded ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                    <button
                      className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition ${showQuerySql ? "border-mint-300/30 bg-mint-300/10 text-mint-200" : "border-white/10 bg-white/[0.035] text-slate-300 hover:text-mint-200"}`}
                      type="button"
                      onClick={() => setShowQuerySql((visible) => !visible)}
                    >
                      <Code2 size={15} /> {showQuerySql ? "隐藏 SQL" : "显示 SQL"}
                    </button>
                    <button
                      className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition ${showPrompt ? "border-mint-300/30 bg-mint-300/10 text-mint-200" : "border-white/10 bg-white/[0.035] text-slate-300 hover:text-mint-200"}`}
                      type="button"
                      onClick={() => setShowPrompt((visible) => !visible)}
                    >
                      <Bot size={15} /> {showPrompt ? "隐藏提示词" : "显示提示词"}
                    </button>
                  </div>
                ) : null}
                {showQuerySql ? <HistoryAskQueryAudit queryDebug={answer.query_debug} /> : null}
                {showPrompt ? <HistoryAskPromptAudit promptDebug={answer.prompt_debug} /> : null}
                {(answer.selected_skills ?? []).length === 0 ? (
                  <HistoryAskDefaultResult answer={answer} />
                ) : answerView === "rendered" ? (
                  <MarkdownPreview markdown={answer.answer} />
                ) : (
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-black/15 p-4 font-mono text-xs leading-6 text-slate-300 [overflow-wrap:anywhere]">
                    {answer.answer}
                  </div>
                )}
                {answer.warning ? (
                  <div className="rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
                    LLM 总结未完全可用，当前展示后端统计兜底结果：{answer.warning}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid min-h-[260px] place-items-center text-center">
                <div>
                  <Bot className="mx-auto mb-3 text-slate-600" size={36} />
                  <div className="mb-1 font-medium text-slate-300">等待提问</div>
                  <p className="text-sm text-slate-500">输入自然语言问题后，系统会检索{selectedDomain?.name ?? "当前业务域"}并生成受控统计结果。</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                  <ShieldCheck size={17} />
                  LLM Config
                </div>
                <h2 className="text-lg font-semibold text-slate-50">模型配置</h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-xs ${
                    llmConfig?.enabled
                      ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                      : "border-white/10 bg-white/[0.035] text-slate-400"
                  }`}
                >
                  {llmConfig?.enabled ? "已启用" : "未启用"}
                </span>
                <button
                  className="text-xs text-mint-200 transition hover:text-mint-100"
                  type="button"
                  onClick={() => setIsModelConfigExpanded((expanded) => !expanded)}
                >
                  {isModelConfigExpanded ? "收起" : "配置"}
                </button>
              </div>
            </div>

            {isModelConfigExpanded && isLlmConfigLoading ? (
              <LoadingStack />
            ) : isModelConfigExpanded ? (
              <form className="space-y-3" onSubmit={onLlmConfigSave}>
                <label className="block text-xs font-medium text-slate-500">
                  供应商
                  <input
                    className="control mt-2 h-10"
                    value={llmConfigDraft.provider_name}
                    onChange={(event) =>
                      onLlmConfigDraftChange({ ...llmConfigDraft, provider_name: event.target.value })
                    }
                    placeholder="OpenAI Compatible"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Base URL
                  <input
                    className="control mt-2 h-10"
                    value={llmConfigDraft.base_url}
                    onChange={(event) =>
                      onLlmConfigDraftChange({ ...llmConfigDraft, base_url: event.target.value })
                    }
                    placeholder="https://api.example.com/v1"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  模型
                  <input
                    className="control mt-2 h-10"
                    value={llmConfigDraft.model_name}
                    onChange={(event) =>
                      onLlmConfigDraftChange({ ...llmConfigDraft, model_name: event.target.value })
                    }
                    placeholder="deepseek-chat"
                  />
                </label>
                <div className="rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-xs leading-5 text-slate-500">
                  API Key 仅从后端环境变量读取：{llmConfig?.has_api_key ? "已配置" : "未配置"}
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-sm text-slate-300">
                  <span>启用 AI 总结</span>
                  <input
                    checked={llmConfigDraft.enabled}
                    className="h-4 w-4 accent-mint-300"
                    type="checkbox"
                    onChange={(event) =>
                      onLlmConfigDraftChange({ ...llmConfigDraft, enabled: event.target.checked })
                    }
                  />
                </label>
                <button
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                  disabled={!canSaveLlmConfig}
                  type="submit"
                >
                  {isLlmConfigSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {llmConfigSaved ? "已保存" : "保存配置"}
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">模型配置仅在切换供应商或维护连接时需要展开；日常问数可直接在标题区选择执行模型。</p>
            )}

            {isModelConfigExpanded && llmConfigError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={15} />
                <span>{llmConfigError}</span>
              </div>
            ) : null}
          </div>

          <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                  <Network size={17} />
                  Semantic Layer
                </div>
                <h2 className="text-lg font-semibold text-slate-50">业务概念</h2>
              </div>
              <button
                className="text-xs text-mint-200 transition hover:text-mint-100"
                type="button"
                onClick={() => setIsOntologyExpanded((expanded) => !expanded)}
              >
                {isOntologyExpanded ? "收起" : "维护"}
              </button>
            </div>
            {isOntologyExpanded ? <>
            <p className="mb-3 mt-2 text-xs leading-5 text-slate-500">
              定义业务名称、别名和口径说明。提问命中别名时，系统会扩展检索并把口径提供给 AI。
            </p>
            <form className="space-y-2" onSubmit={onOntologySave}>
              <input
                className="control h-10"
                value={ontologyDraft.name}
                onChange={(event) => onOntologyDraftChange({ ...ontologyDraft, name: event.target.value })}
                placeholder="概念名称，例如：中信泰富项目"
              />
              <input
                className="control h-10"
                value={ontologyDraft.aliases}
                onChange={(event) => onOntologyDraftChange({ ...ontologyDraft, aliases: event.target.value })}
                placeholder="别名，用逗号分隔，例如：CITIC、泰富"
              />
              <textarea
                className="control min-h-20 resize-y text-sm leading-6"
                value={ontologyDraft.description}
                onChange={(event) => onOntologyDraftChange({ ...ontologyDraft, description: event.target.value })}
                placeholder="业务口径，例如：包含需求、联调和上线支持，不等同于工时"
              />
              <select
                className="control h-10"
                value={ontologyDraft.visibility}
                onChange={(event) => onOntologyDraftChange({ ...ontologyDraft, visibility: event.target.value as HistoryOntologyDraft["visibility"] })}
              >
                <option value="PERSONAL">个人词典（仅自己）</option>
                <option value="TEAM">团队词典（指定用户）</option>
                {canManageSystemOntology ? <option value="SYSTEM">系统词典（全员只读）</option> : null}
              </select>
              {ontologyDraft.visibility === "TEAM" ? (
                <input
                  className="control h-10"
                  value={ontologyDraft.shared_with_usernames}
                  onChange={(event) => onOntologyDraftChange({ ...ontologyDraft, shared_with_usernames: event.target.value })}
                  placeholder="共享给的用户名，用逗号分隔"
                />
              ) : null}
              <div className="flex gap-2">
                <button
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-xs font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                  disabled={!ontologyDraft.name.trim() || ontologySaving}
                  type="submit"
                >
                  {ontologySaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  {ontologyEditingId ? "更新概念" : "添加概念"}
                </button>
                {ontologyEditingId ? (
                  <button
                    className="h-9 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:text-mint-200"
                    type="button"
                    onClick={onOntologyCancel}
                  >
                    取消
                  </button>
                ) : null}
              </div>
            </form>
            {ontologyError ? <div className="mt-3 text-xs leading-5 text-red-200">{ontologyError}</div> : null}
            <div className="mt-4 space-y-2">
              {ontologyLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={14} />正在加载概念...</div>
              ) : ontologyTerms.length ? (
                ontologyTerms.map((term) => (
                  <div key={term.id} className="rounded-lg border border-white/10 bg-white/[0.028] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-200">{term.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-sky-200">
                          <span>{term.visibility === "SYSTEM" ? "系统词典" : term.visibility === "TEAM" ? "团队词典" : "个人词典"}</span>
                          {term.aliases.length ? <span>别名：{term.aliases.join("、")}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {term.can_edit ? <>
                        <button className="p-1 text-slate-500 hover:text-mint-200" type="button" onClick={() => onOntologyEdit(term)} aria-label={`编辑 ${term.name}`}><Pencil size={14} /></button>
                        <button className="p-1 text-slate-500 hover:text-red-200" type="button" onClick={() => onOntologyDelete(term.id)} aria-label={`删除 ${term.name}`}><Trash2 size={14} /></button>
                        </> : null}
                      </div>
                    </div>
                    {term.description ? <p className="mt-1.5 text-xs leading-5 text-slate-500">{term.description}</p> : null}
                  </div>
                ))
              ) : (
                <div className="text-xs leading-5 text-slate-500">尚未定义业务概念。建议先添加常用项目简称、系统名称或团队术语。</div>
              )}
            </div>
            </> : (
              <p className="mt-3 text-xs leading-5 text-slate-500">维护当前业务域的别名与业务口径；提问命中后会扩展检索并进入提示词上下文。</p>
            )}
          </div>

          {answer ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300"><CircleGauge size={16} />查询摘要</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-300">{formatAmount(answer.stats.matched_count)} 条记录</span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-300">{formatAmount(getHistoryAskFilterEntries(answer.filters).length)} 个条件</span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-300">{answer.domain?.name ?? "历史工作记录"}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">完整统计、图表和实际记录已在左侧结果区展示。</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function HistoryAskQueryAudit({ queryDebug }: { queryDebug: HistoryAskResponse["query_debug"] }) {
  const parameters = Object.entries(queryDebug.parameters ?? {});
  return (
    <div className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
          <Code2 size={16} />
          本次执行 SQL（只读）
        </div>
        <span className="text-xs text-slate-500">固定查询模板，绑定参数已脱敏</span>
      </div>
      <pre className="max-h-80 overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-200 [overflow-wrap:anywhere]">
        {queryDebug.sql}
      </pre>
      <div className="mt-3">
        <div className="mb-2 text-xs font-medium text-slate-400">绑定参数</div>
        {parameters.length ? (
          <div className="flex flex-wrap gap-2">
            {parameters.map(([name, value]) => (
              <span key={name} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[11px] text-slate-300">
                {name} = {value}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">本次未使用筛选参数。</div>
        )}
      </div>
    </div>
  );
}

function HistoryAskPromptAudit({ promptDebug }: { promptDebug: HistoryAskResponse["prompt_debug"] }) {
  return (
    <div className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.05] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-100">
          <Bot size={16} />
          本次生成提示词
        </div>
        <span className="text-xs text-slate-500">
          {promptDebug.llm_requested ? "本次已请求 LLM" : "本次未请求 LLM，展示查询解析上下文"}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-medium text-slate-400">系统提示词</div>
          <pre className="max-h-48 overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-200 [overflow-wrap:anywhere]">
            {promptDebug.system}
          </pre>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-slate-400">查询上下文（含命中的业务概念和 Skill）</div>
          <pre className="max-h-80 overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-200 [overflow-wrap:anywhere]">
            {promptDebug.prompt}
          </pre>
        </div>
      </div>
    </div>
  );
}

function HistoryAskDefaultResult({ answer }: { answer: HistoryAskResponse }) {
  const pageSize = 10;
  const records = answer.query_results ?? answer.evidence;
  const domainCode = answer.domain?.code ?? "history";
  const isEnglishMaterials = domainCode === "english_materials";
  const typeTitle = domainCode === "todos" ? "状态分布" : domainCode === "knowledge" ? "发布状态分布" : isEnglishMaterials ? "标记状态分布" : "类型分布";
  const groupTitle = domainCode === "todos" ? "标签分布" : domainCode === "knowledge" ? "主题标签分布" : isEnglishMaterials ? "分类分布" : "周期分布";
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const currentRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setPage(1), [answer]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-mint-300/20 bg-mint-300/[0.06] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-mint-200">
          <ChartLine size={16} />
          基础查询结果
        </div>
        <p className="text-sm leading-6 text-slate-300">
          本次查询匹配 <span className="font-semibold text-mint-200">{formatAmount(answer.stats.matched_count)}</span> 条记录，
          {isEnglishMaterials ? (
            <>
              覆盖 <span className="font-semibold text-mint-200">{formatAmount(answer.stats.active_days)}</span> 个素材分类。
            </>
          ) : (
            <>
              覆盖 <span className="font-semibold text-mint-200">{formatAmount(answer.stats.active_days)}</span> 个活跃日期，时间范围为{" "}
              {formatDateOnly(answer.stats.min_date)} 至 {formatDateOnly(answer.stats.max_date)}。
            </>
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <HistoryAskBarChart title={typeTitle} items={answer.stats.type_counts} tone="bg-sky-300" />
        <HistoryAskBarChart title={groupTitle} items={answer.stats.week_counts} tone="bg-fuchsia-300" />
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-200">查询记录</div>
          <div className="text-xs text-slate-500">
            当前展示 {records.length} 条{answer.query_debug.result_truncated ? `（最多 ${answer.query_debug.result_limit} 条）` : ""}
          </div>
        </div>
        {records.length ? (
          <div className="space-y-2">
            {currentRecords.map((item) => (
              <div key={item.id} className="rounded-md border border-white/8 bg-black/10 px-3 py-2">
                <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span>#{item.id}</span><span>{formatHistoryDate(item.history_date)}</span><span>{item.type || "未分类"}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{item.content || "无内容"}</p>
              </div>
            ))}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                <span>第 {currentPage} / {totalPages} 页</span>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-white/10 px-2 py-1 transition hover:border-mint-300/30 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage <= 1}
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    上一页
                  </button>
                  <button
                    className="rounded-md border border-white/10 px-2 py-1 transition hover:border-mint-300/30 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage >= totalPages}
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-slate-500">没有可展示的匹配记录。</div>
        )}
      </div>
    </div>
  );
}

function HistoryAskBarChart({ title, items, tone }: { title: string; items: Record<string, number>; tone: string }) {
  const entries = Object.entries(items).slice(0, 8);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
      <div className="mb-3 text-sm font-medium text-slate-200">{title}</div>
      {entries.length ? (
        <div className="space-y-2.5">
          {entries.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_34px] items-center gap-2 text-xs">
              <div className="min-w-0">
                <div className="mb-1 truncate text-slate-400">{label}</div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
                </div>
              </div>
              <span className="text-right text-slate-200">{formatAmount(value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500">暂无分布数据</div>
      )}
    </div>
  );
}

function HistoryAskFilterSummary({ filters }: { filters: HistoryAskResponse["filters"] }) {
  const entries = getHistoryAskFilterEntries(filters);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
      <div className="mb-3 text-sm font-medium text-slate-200">识别条件</div>
      {entries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <span
              key={entry.label}
              className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-100"
            >
              {entry.label}: {entry.value}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500">未识别到明确筛选条件，按全部历史记录统计。</div>
      )}
    </div>
  );
}

function TrustPanel({
  draft,
  trustScore,
  hasSensitiveSignal,
}: {
  draft: KnowledgeDraft;
  trustScore: number;
  hasSensitiveSignal: boolean;
}) {
  const checks = [
    { label: "问题具备检索价值", done: draft.question.trim().length >= 8 },
    { label: "答案包含可执行上下文", done: draft.answer.trim().length >= 24 },
    { label: "来源可追踪", done: Boolean(draft.source.trim()) },
    { label: "标签格式清晰", done: Boolean(draft.topic_tag.trim()) },
  ];

  return (
    <aside className="hidden rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl xl:block">
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
          <ShieldCheck size={17} />
          Verification
        </div>
        <h2 className="text-lg font-semibold text-slate-50">可信度检查</h2>
      </div>

      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-end justify-between">
          <span className="text-sm text-slate-400">Readiness</span>
          <span className="text-2xl font-semibold text-mint-300">{trustScore}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-mint-300 transition-all duration-500"
            style={{ width: `${trustScore}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-3 text-sm">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border ${
                check.done
                  ? "border-mint-300/30 bg-mint-300/10 text-mint-300"
                  : "border-white/10 bg-white/[0.035] text-slate-600"
              }`}
            >
              <CheckCircle2 size={14} />
            </span>
            <span className={check.done ? "text-slate-200" : "text-slate-500"}>{check.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.028] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
          {hasSensitiveSignal ? (
            <TriangleAlert className="text-amberline" size={16} />
          ) : (
            <ShieldCheck className="text-mint-300" size={16} />
          )}
          敏感信息
        </div>
        <p className="text-sm leading-6 text-slate-500">
          {hasSensitiveSignal
            ? "发现疑似敏感字段。正式链路会遮罩、打标，并要求确认。"
            : "当前草稿未发现明显敏感字段信号。"}
        </p>
      </div>
    </aside>
  );
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function isEditableElement(element: EventTarget | Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;

  return element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable;
}

function restoreMobileViewportScale({ blurActiveElement = true }: { blurActiveElement?: boolean } = {}) {
  if (!isMobileViewport()) return;

  const activeElement = document.activeElement;
  if (blurActiveElement && isEditableElement(activeElement)) {
    activeElement.blur();
  }

  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });

  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) return;

  viewport.setAttribute("content", MOBILE_VIEWPORT_RESET_CONTENT);
  window.setTimeout(() => {
    viewport.setAttribute("content", MOBILE_VIEWPORT_CONTENT);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, 220);
}

export default App;
