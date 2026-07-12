import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
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
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
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
  updateBlogFactoryArticle,
  updateBlogFactoryItem,
  updateBlogFactoryStatus,
  updateBlogPublishConfig,
  updateKnowledge,
  updateTodo,
  validateBlogPublishConfig,
  publishBlogFactoryArticle,
} from "./api/knowledge";
import { fetchHistory, readCachedHistory } from "./api/history";
import { askHistory, fetchHistoryAskLlmConfig, updateHistoryAskLlmConfig } from "./api/historyAsk";
import { fetchCodexConfig, getCodexJob, getLatestCodexJobByOutputMode, startCodexJob } from "./api/codex";
import {
  createCurrentRecord,
  fetchCurrentRecordOptions,
  fetchCurrentRecords,
  readCachedCurrentRecordOptions,
  readCachedCurrentRecords,
  updateCurrentRecord,
} from "./api/currentRecords";
import { restartServices, syncCodeToGithub } from "./api/system";
import {
  createEnglishMaterial,
  fetchEnglishMaterials,
  fetchNextEnglishMaterialSequence,
  getEnglishMaterial,
  readCachedEnglishMaterials,
  updateEnglishMaterial,
} from "./api/englishMaterials";
import {
  createSkill,
  deleteSkill,
  fetchSkill,
  fetchSkillFile,
  fetchSkills,
  updateSkill,
  updateSkillFile,
  uploadSkillZip,
} from "./api/skills";
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
import { Field, FilterClearButton, LoadingStack, MetricTile } from "./components/AppShellPrimitives";
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
  BLOG_FACTORY_MASK_TOGGLE_OPTIONS,
  appendLogLine,
  applyBlogFactoryMaskRule,
  areTodoDraftsEqual,
  blogFactoryItemToEditDraft,
  blogPublishConfigToDraft,
  buildBlogFactoryArticleExportFileName,
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
  describeBlogFactoryMaskRule,
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
  normalizeBlogFactoryMaskRule,
  normalizeCurrentRecordOptions,
  normalizeFactoryTaskResult,
  parseUtcDate,
  readHistoryAskVectorStatus,
  readOverviewRefreshError,
  readStoredNewDraft,
  readStoredUiState,
  readWeChatApiKeyFromHash,
  readWeChatErrorFromHash,
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
  writeStoredNewDraft,
  writeStoredUiState,
  type AiCodingMessage,
  type AiCodingNoticeStatus,
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
import { AI_CODING_DEFAULT_MODEL, AI_CODING_MODEL_FALLBACK_OPTIONS } from "./views/aiCodingShared";

const OverviewDashboard = lazy(() => import("./views/OverviewDashboard"));
const LlmUsageDashboard = lazy(() => import("./views/LlmUsageDashboard"));
const HistoryExplorer = lazy(() => import("./views/HistoryExplorer"));
const AiCodingWorkspace = lazy(() => import("./views/AiCodingWorkspace"));
import type {
  AdminModuleAccessItem,
  AdminModuleAccessLevel,
  AppView,
  BlogPublishCategory,
  BlogFactoryItem,
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
  EnglishMaterialDraft,
  EnglishMaterialItem,
  GithubSyncResponse,
  HistoryAskResponse,
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

const emptyLlmConfigDraft: LlmConfigDraft = {
  provider_name: "OpenAI Compatible",
  base_url: "",
  model_name: "",
  enabled: false,
};

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
  latestEnglishMaterial: EnglishMaterialItem | null;
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

function App() {
  // Restored UI state and long-lived workspace state.
  const [restoredUiState] = useState<StoredUiState>(() => readStoredUiState());
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
  const [activeView, setActiveView] = useState<AppView>(restoredUiState.activeView);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(restoredUiState.sidebarExpanded);
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
  const [factoryItems, setFactoryItems] = useState<KnowledgeItem[]>([]);
  const [factoryTotalItems, setFactoryTotalItems] = useState(0);
  const [factoryPage, setFactoryPage] = useState(restoredUiState.factory.page);
  const [factoryQuery, setFactoryQuery] = useState(restoredUiState.factory.query);
  const debouncedFactoryQuery = useDebouncedValue(factoryQuery.trim(), 320, () => setFactoryPage(1));
  const [factoryUsername, setFactoryUsername] = useState(restoredUiState.factory.username);
  const [factorySelectedId, setFactorySelectedId] = useState<number | null>(restoredUiState.factory.selectedId);
  const [factoryTask, setFactoryTask] = useState(restoredUiState.factory.task);
  const [factorySkillIds, setFactorySkillIds] = useState<string[]>(restoredUiState.factory.skillIds);
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [isFactoryLoading, setIsFactoryLoading] = useState(false);
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(Boolean(restoredUiState.factory.codexJobId));
  const [hasCopiedFactoryTask, setHasCopiedFactoryTask] = useState(false);
  const [factoryCopyError, setFactoryCopyError] = useState<string | null>(null);
  const [isFactoryCopySaving, setIsFactoryCopySaving] = useState(false);
  const [isFactoryMerging, setIsFactoryMerging] = useState(false);
  const [factoryCodexJobId, setFactoryCodexJobId] = useState<string | null>(restoredUiState.factory.codexJobId);
  const [factoryCodexStatus, setFactoryCodexStatus] = useState(
    restoredUiState.factory.codexJobId ? "正在恢复 Codex 加工状态..." : "",
  );
  const [factoryCodexErrorOutput, setFactoryCodexErrorOutput] = useState("");
  const [factoryRefreshToken, setFactoryRefreshToken] = useState(0);
  const [blogFactoryItems, setBlogFactoryItems] = useState<BlogFactoryItem[]>([]);
  const [blogFactoryTotal, setBlogFactoryTotal] = useState(0);
  const [blogFactoryPage, setBlogFactoryPage] = useState(restoredUiState.blogFactory.page);
  const [blogFactoryQuery, setBlogFactoryQuery] = useState(restoredUiState.blogFactory.query);
  const debouncedBlogFactoryQuery = useDebouncedValue(blogFactoryQuery.trim(), 320, () => setBlogFactoryPage(1));
  const [blogFactoryUsername, setBlogFactoryUsername] = useState(restoredUiState.blogFactory.username);
  const [blogFactoryStatus, setBlogFactoryStatus] = useState<BlogFactoryStatus | "all">(restoredUiState.blogFactory.status);
  const [blogFactoryTopic, setBlogFactoryTopic] = useState(restoredUiState.blogFactory.topic);
  const [blogFactoryKnowledgeId, setBlogFactoryKnowledgeId] = useState(restoredUiState.blogFactory.knowledgeId);
  const [blogFactorySortBy, setBlogFactorySortBy] = useState<BlogFactorySortBy>(restoredUiState.blogFactory.sortBy);
  const [blogFactorySortDir, setBlogFactorySortDir] = useState<SortDirection>(restoredUiState.blogFactory.sortDir);
  const [selectedBlogFactoryItem, setSelectedBlogFactoryItem] = useState<BlogFactoryItem | null>(null);
  const [isBlogFactoryLoading, setIsBlogFactoryLoading] = useState(false);
  const [isBlogFactoryDetailLoading, setIsBlogFactoryDetailLoading] = useState(false);
  const [isBlogFactoryStatusSaving, setIsBlogFactoryStatusSaving] = useState(false);
  const [isBlogFactoryItemSaving, setIsBlogFactoryItemSaving] = useState(false);
  const [isBlogFactoryArticleSaving, setIsBlogFactoryArticleSaving] = useState(false);
  const [isBlogFactoryDeleting, setIsBlogFactoryDeleting] = useState(false);
  const [isMobileBlogFactoryDetailOpen, setIsMobileBlogFactoryDetailOpen] = useState(false);
  const [blogFactoryEditDraft, setBlogFactoryEditDraft] = useState<BlogFactoryEditDraft>({
    taskContent: "",
    questionSnapshot: "",
    answerSnapshot: "",
    sourceSnapshot: "",
    topicTagSnapshot: "",
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
  const [blogFactoryTaskCopyError, setBlogFactoryTaskCopyError] = useState<string | null>(null);
  const [hasCopiedBlogFactoryTask, setHasCopiedBlogFactoryTask] = useState(false);
  const [blogFactoryError, setBlogFactoryError] = useState<string | null>(null);
  const [blogFactoryStatusError, setBlogFactoryStatusError] = useState<string | null>(null);
  const [blogFactoryEditError, setBlogFactoryEditError] = useState<string | null>(null);
  const [blogFactoryDeleteTarget, setBlogFactoryDeleteTarget] = useState<BlogFactoryItem | null>(null);
  const [blogFactoryRefreshToken, setBlogFactoryRefreshToken] = useState(0);
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
  const [englishMaterialUsername, setEnglishMaterialUsername] = useState(restoredUiState.englishMaterials.username);
  const [englishMaterialCategory, setEnglishMaterialCategory] = useState(restoredUiState.englishMaterials.category);
  const [englishMaterialFlag, setEnglishMaterialFlag] = useState(restoredUiState.englishMaterials.flag);
  const [englishMaterialSortBy, setEnglishMaterialSortBy] = useState<EnglishMaterialSortBy>(restoredUiState.englishMaterials.sortBy);
  const [englishMaterialSortDir, setEnglishMaterialSortDir] = useState<SortDirection>(restoredUiState.englishMaterials.sortDir);
  const [selectedEnglishMaterial, setSelectedEnglishMaterial] = useState<EnglishMaterialItem | null>(null);
  todoCurrentAppendTargetRef.current = todoCurrentAppendTarget;
  const [isEnglishMaterialDetailOpen, setIsEnglishMaterialDetailOpen] = useState(false);
  const [englishMaterialDraft, setEnglishMaterialDraft] = useState<EnglishMaterialDraft>(restoredUiState.englishMaterials.draft);
  const [englishMaterialDetailDraft, setEnglishMaterialDetailDraft] = useState<EnglishMaterialDraft>(emptyEnglishMaterialDraft);
  const [isEnglishMaterialLoading, setIsEnglishMaterialLoading] = useState(false);
  const [isEnglishMaterialDetailLoading, setIsEnglishMaterialDetailLoading] = useState(false);
  const [isEnglishMaterialSaving, setIsEnglishMaterialSaving] = useState(false);
  const [isEnglishMaterialDetailSaving, setIsEnglishMaterialDetailSaving] = useState(false);
  const [englishMaterialCopiedLabel, setEnglishMaterialCopiedLabel] = useState<string | null>(null);
  const [englishMaterialError, setEnglishMaterialError] = useState<string | null>(null);
  const [englishMaterialSaveError, setEnglishMaterialSaveError] = useState<string | null>(null);
  const [englishMaterialRefreshToken, setEnglishMaterialRefreshToken] = useState(0);
  const englishMaterialSequenceTouchedRef = useRef(
    Boolean(restoredUiState.englishMaterials.draft.sequence_no) &&
      !isBlankEnglishMaterialDraftExceptSequence(restoredUiState.englishMaterials.draft),
  );
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
  const [historyAskQuestion, setHistoryAskQuestion] = useState(restoredUiState.historyAsk.question);
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
  const [skillItems, setSkillItems] = useState<SkillSummary[]>([]);
  const [skillTotal, setSkillTotal] = useState(0);
  const [skillQuery, setSkillQuery] = useState("");
  const debouncedSkillQuery = useDebouncedValue(skillQuery.trim());
  const [skillListScope, setSkillListScope] = useState<"owned" | "callable">("owned");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [newSkillDraft, setNewSkillDraft] = useState<SkillDraft>(emptySkillDraft);
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(emptySkillDraft);
  const [selectedSkillFile, setSelectedSkillFile] = useState<SkillFile | null>(null);
  const [skillFileContent, setSkillFileContent] = useState("");
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [isSkillDetailLoading, setIsSkillDetailLoading] = useState(false);
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
    latestEnglishMaterial: null,
    englishMaterialTotal: 0,
  });
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isOverviewRefreshing, setIsOverviewRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewSectionErrors, setOverviewSectionErrors] =
    useState<OverviewSectionErrors>(emptyOverviewSectionErrors);
  const [overviewUpdatedAt, setOverviewUpdatedAt] = useState<string | null>(null);
  const [overviewRefreshToken, setOverviewRefreshToken] = useState(0);
  const [aiCodingPrompt, setAiCodingPrompt] = useState(restoredUiState.aiCoding.prompt);
  const [aiCodingModelName, setAiCodingModelName] = useState(
    restoredUiState.aiCoding.modelName || AI_CODING_DEFAULT_MODEL,
  );
  const [aiCodingMessages, setAiCodingMessages] = useState<AiCodingMessage[]>(restoredUiState.aiCoding.messages);
  const [activeCodexJobId, setActiveCodexJobId] = useState<string | null>(restoredUiState.aiCoding.activeJobId);
  const [liveCodexOutput, setLiveCodexOutput] = useState("");
  const [liveCodexErrorOutput, setLiveCodexErrorOutput] = useState("");
  const [liveCodexStatus, setLiveCodexStatus] = useState(restoredUiState.aiCoding.activeJobId ? "正在恢复 Codex 任务状态..." : "");
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
    setAiCodingNoticeStatus(job.status === "completed" ? "completed" : "failed");
    setLiveCodexStatus(job.status === "completed" ? "Codex 执行完成。" : "Codex 执行出现错误。");
    setCodexError(job.status === "failed" ? job.error_message ?? "Codex 执行失败，请稍后重试。" : null);
  }

  async function restoreLatestAiCodingJob() {
    return getLatestCodexJobByOutputMode("full");
  }

  // Loading, polling, cache hydration, and persistence effects.
  useEffect(() => {
    if (!apiKey || !canAccessAiCoding || activeView !== "aiCoding") return;
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
  }, [activeView, apiKey, canAccessAiCoding, codexConfig, isCodexConfigLoading]);

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
      setFactoryUsername("");
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
        latestEnglishMaterial: null,
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
        codexJobId: factoryCodexJobId,
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
        draft: englishMaterialDraft,
      },
      history: {
        query: historyQuery,
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
    historyQuery,
    historySortBy,
    historySortDir,
    historyType,
    historyUsername,
    historyVectorStatus,
    historyWeek,
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
    let cancelled = false;
    let timer: number | undefined;

    async function pollFactoryCodexJob() {
      try {
        const job = await getCodexJob(jobId);
        if (cancelled) return;

        setFactoryTask(job.output);
        setFactoryCodexErrorOutput(job.error_output);

        if (job.status === "running") {
          setIsFactoryGenerating(true);
          setFactoryCodexStatus("Codex 正在按所选 skill 加工...");
          timer = window.setTimeout(pollFactoryCodexJob, 1500);
          return;
        }

        setIsFactoryGenerating(false);
        setFactoryCodexJobId(null);

        if (job.status === "failed") {
          setFactoryCodexStatus("Codex 加工失败。");
          setFactoryCopyError(job.error_message ?? "Codex 加工失败，请稍后重试。");
          return;
        }

        const result = job.response
          ? extractCodexResultText(job.response) || job.response.output || job.output
          : job.output;
        setFactoryTask(normalizeFactoryTaskResult(result));
        setFactoryCodexStatus("Codex 加工完成。");
      } catch (error) {
        if (cancelled) return;
        setIsFactoryGenerating(false);
        setFactoryCodexJobId(null);
        setFactoryCodexStatus("Codex 加工失败。");
        setFactoryCopyError(error instanceof Error ? error.message : "恢复 Codex 加工状态失败。");
      }
    }

    pollFactoryCodexJob();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiKey, factoryCodexJobId]);

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
    if (!apiKey || activeView !== "historyAsk") return;

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
    if (!apiKey || (activeView !== "skills" && activeView !== "historyAsk" && activeView !== "factory")) return;

    let cancelled = false;
    setIsSkillLoading(true);
    setSkillError(null);
    fetchSkills({
      q: activeView === "skills" ? debouncedSkillQuery : undefined,
      enabled: activeView === "historyAsk" || activeView === "factory" ? true : undefined,
      scope: activeView === "skills" ? skillListScope : "callable",
    })
      .then((response) => {
        if (cancelled) return;
        setSkillItems(response.items);
        setSkillTotal(response.total);
        setHistoryAskSkillIds((current) => current.filter((skillId) => response.items.some((item) => item.id === skillId)));
        setFactorySkillIds((current) => current.filter((skillId) => response.items.some((item) => item.id === skillId)));
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
      username: blogFactoryUsername,
      limit: BLOG_FACTORY_PAGE_SIZE,
      offset: (blogFactoryPage - 1) * BLOG_FACTORY_PAGE_SIZE,
      factoryStatus: blogFactoryStatus === "all" ? undefined : blogFactoryStatus,
      topic: blogFactoryTopic,
      knowledgeId: blogFactoryKnowledgeId,
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
    blogFactoryPage,
    blogFactoryRefreshToken,
    blogFactorySortBy,
    blogFactorySortDir,
    blogFactoryStatus,
    blogFactoryTopic,
    blogFactoryUsername,
    debouncedBlogFactoryQuery,
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
      username: englishMaterialUsername,
      category: englishMaterialCategory,
      flag: englishMaterialFlag,
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
    englishMaterialPage,
    englishMaterialRefreshToken,
    englishMaterialSortBy,
    englishMaterialSortDir,
    englishMaterialUsername,
  ]);

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
      includeTotal: false,
    };
    const unpublishedKnowledgeQueryConfig = {
      username: overviewUsername,
      status: "未发布" as const,
      limit: OVERVIEW_KNOWLEDGE_LIMIT,
      offset: 0,
      includeTotal: false,
    };
    const latestEnglishMaterialQueryConfig = {
      username: overviewUsername,
      sortBy: "id" as const,
      sortDir: "desc" as const,
      limit: 1,
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
        processingTodoTotal: cachedTodos.items.length,
        recentKnowledge: cachedUnpublishedKnowledge.items,
        knowledgeTotal: cachedUnpublishedKnowledge.items.length,
        unpublishedKnowledgeTotal: cachedUnpublishedKnowledge.items.length,
        latestEnglishMaterial: cachedEnglishMaterial.items[0] ?? null,
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
              processingTodoTotal: todoResult.value.items.length,
            };
          }

          if (unpublishedKnowledgeResult.status === "fulfilled") {
            next = {
              ...next,
              recentKnowledge: unpublishedKnowledgeResult.value.items,
              knowledgeTotal: unpublishedKnowledgeResult.value.items.length,
              unpublishedKnowledgeTotal: unpublishedKnowledgeResult.value.items.length,
            };
          }

          if (englishMaterialResult.status === "fulfilled") {
            next = {
              ...next,
              latestEnglishMaterial: englishMaterialResult.value.items[0] ?? null,
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
  }, [activeView, apiKey, authUser, overviewRefreshToken, canAccessUsage]);

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
      setSaveError(error instanceof Error ? error.message : "提交失败，请稍后重试。");
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
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setIsTodoEntry(false);
    setFactoryUsername(getDefaultOwnedUsername(nextAuthUser));
    setBlogFactoryUsername(getDefaultOwnedUsername(nextAuthUser));
    setTodoUsername(getDefaultOwnedUsername(nextAuthUser));
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
    setDraft(emptyDraft);
    setNewTodoStatus("处理中");
    setFactoryItems([]);
    setFactorySelectedId(null);
    setFactoryUsername("");
    setFactoryTask("");
    setFactorySkillIds([]);
    setFactoryCodexJobId(null);
    setAdminModuleItems([]);
    setFactoryCodexStatus("");
    setFactoryCodexErrorOutput("");
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

  async function handleGenerateFactoryTask(item: KnowledgeItem) {
    if (isFactoryGenerating) return;
    if (factorySkillIds.length === 0) {
      setFactoryCopyError("请先选择 skill，再生成加工结果。");
      setFactoryCodexStatus("");
      return;
    }

    setIsFactoryGenerating(true);
    setFactorySelectedId(item.id);
    setFactoryTask("");
    setFactoryCodexStatus("正在提交 Codex 加工任务...");
    setFactoryCodexErrorOutput("");
    setHasCopiedFactoryTask(false);
    setFactoryCopyError(null);

    try {
      const prompt = buildFactorySkillPrompt(item);
      const job = await startCodexJob(prompt, factorySkillIds, "read-only", "final");
      setFactoryCodexJobId(job.job_id);
      setFactoryTask(job.output);
      setFactoryCodexErrorOutput(job.error_output);
      setFactoryCodexStatus("Codex 任务已提交，正在加工...");
    } catch (error) {
      setIsFactoryGenerating(false);
      setFactoryCodexJobId(null);
      setFactoryCodexStatus("Codex 加工失败。");
      setFactoryCopyError(error instanceof Error ? error.message : "Codex 加工失败，请稍后重试。");
    }
  }

  async function handleCopyFactoryTask(view: MarkdownContentView) {
    const taskContent = normalizeFactoryTaskResult(factoryTask);
    if (!taskContent || factorySelectedId === null || isFactoryCopySaving) return;

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
      await createBlogFactoryItem({
        knowledgeId: factorySelectedId,
        taskContent,
      });
      setFactoryCopyError(null);
      setHasCopiedFactoryTask(true);
      window.setTimeout(() => setHasCopiedFactoryTask(false), 1600);
    } catch (error) {
      setHasCopiedFactoryTask(false);
      setFactoryCopyError(
        error instanceof Error ? `已复制，但保存到数据库失败：${error.message}` : "已复制，但保存到数据库失败。",
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
      setFactoryPage(1);
      setFactoryRefreshToken((current) => current + 1);
      return merged;
    } finally {
      setIsFactoryMerging(false);
    }
  }

  async function handleSelectBlogFactoryItem(item: BlogFactoryItem) {
    setSelectedBlogFactoryItem(item);
    setIsMobileBlogFactoryDetailOpen(true);
    setBlogFactoryStatusError(null);
    setBlogFactoryEditError(null);
    setBlogFactoryTaskCopyError(null);
    setHasCopiedBlogFactoryTask(false);
    setIsBlogFactoryDetailLoading(true);

    try {
      const detail = await getBlogFactoryItem(item.id);
      setSelectedBlogFactoryItem(detail);
      setBlogFactoryItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setBlogFactoryError(null);
    } catch (error) {
      setBlogFactoryError(error instanceof Error ? error.message : "读取博客工厂记录失败，请稍后重试。");
    } finally {
      setIsBlogFactoryDetailLoading(false);
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

  async function handleSaveBlogFactoryItem() {
    if (!selectedBlogFactoryItem || isBlogFactoryItemSaving) return;
    if (!blogFactoryEditDraft.taskContent.trim() || !blogFactoryEditDraft.questionSnapshot.trim() || !blogFactoryEditDraft.answerSnapshot.trim()) {
      setBlogFactoryEditError("任务内容、问题快照和答案快照不能为空。");
      return;
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
      });
      invalidateApiCache(["/api/blog-factory"]);
      setSelectedBlogFactoryItem(updated);
      setBlogFactoryItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setBlogFactoryRefreshToken((current) => current + 1);
    } catch (error) {
      setBlogFactoryEditError(error instanceof Error ? error.message : "任务编辑保存失败，请稍后重试。");
    } finally {
      setIsBlogFactoryItemSaving(false);
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
        setTodoSaveError("未找到对应的当前记录，请先检查用户和类型。");
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
      setTodoSaveError(error instanceof Error ? error.message : "当前记录读取失败，请稍后重试。");
    } finally {
      if (todoCurrentAppendRequestRef.current === requestId) {
        setIsTodoCurrentAppendOptionsLoading(false);
      }
    }
  }

  function handleTodoCurrentAppendTargetChange(nextTarget: CurrentAppendTarget) {
    if (nextTarget.username !== todoCurrentAppendTarget.username || nextTarget.type !== todoCurrentAppendTarget.type) {
      setTodoSaveError(null);
      void hydrateTodoCurrentAppendTarget(currentRecordOptions, nextTarget);
      return;
    }

    setTodoCurrentAppendTarget(nextTarget);
  }

  async function prepareTodoCurrentAppend(todo: TodoItem) {
    setPendingTodoCurrentAppend(todo);
    setTodoSaveError(null);

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
      setTodoSaveError(error instanceof Error ? error.message : "当前记录选项读取失败，请稍后重试。");
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
    setTodoSaveError(null);
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
      setTodoSaveError(error instanceof Error ? error.message : "追加到当前记录失败，请稍后重试。");
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

  async function handleSelectEnglishMaterial(item: EnglishMaterialItem, { openDetail = true }: { openDetail?: boolean } = {}) {
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
    setSelectedEnglishMaterial(item);
    setEnglishMaterialDetailDraft(englishMaterialItemToDraft(item));
    setIsEnglishMaterialDetailOpen(true);
    setActiveView("englishMaterials");
  }

  async function handleAskHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = historyAskQuestion.trim();
    if (!question || isHistoryAsking) return;

    setIsHistoryAsking(true);
    setHistoryAskError(null);
    setHasCopiedHistoryAskAnswer(false);
    try {
      const answer = await askHistory(question, historyAskSkillIds);
      setHistoryAskAnswer(answer);
    } catch (error) {
      setHistoryAskError(error instanceof Error ? error.message : "AI 问数失败，请稍后重试。");
    } finally {
      setIsHistoryAsking(false);
    }
  }

  function handleToggleHistoryAskSkill(skillId: string) {
    setHistoryAskSkillIds((current) =>
      current.includes(skillId) ? current.filter((item) => item !== skillId) : [...current, skillId].slice(0, 8),
    );
  }

  function handleToggleFactorySkill(skillId: string) {
    setFactorySkillIds((current) =>
      current.includes(skillId) ? current.filter((item) => item !== skillId) : [...current, skillId].slice(0, 8),
    );
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
    if (isSkillDetailLoading) return;

    setIsSkillDetailLoading(true);
    setSkillSaveError(null);
    try {
      const detail = await fetchSkill(skillId);
      setSelectedSkill(detail);
      setSkillDraft({ name: detail.name, description: detail.description, content: "", enabled: detail.enabled, published: detail.published });
      const preferredFile = getPreferredSkillFile(detail.files);
      setSelectedSkillFile(preferredFile);
      setSkillFileContent(preferredFile?.path.endsWith("SKILL.md") ? detail.skill_markdown : "");
    } catch (error) {
      setSkillSaveError(error instanceof Error ? error.message : "Skill 详情加载失败。");
    } finally {
      setIsSkillDetailLoading(false);
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

  async function handleDeleteSelectedSkill() {
    if (!selectedSkill || !selectedSkill.can_delete || isSkillSaving) return;
    const confirmed = window.confirm(`确定删除 Skill「${selectedSkill.name}」吗？`);
    if (!confirmed) return;

    setIsSkillSaving(true);
    setSkillSaveError(null);
    try {
      await deleteSkill(selectedSkill.id);
      setSkillItems((current) => current.filter((item) => item.id !== selectedSkill.id));
      setSkillTotal((current) => Math.max(0, current - 1));
      setHistoryAskSkillIds((current) => current.filter((skillId) => skillId !== selectedSkill.id));
      setFactorySkillIds((current) => current.filter((skillId) => skillId !== selectedSkill.id));
      setSelectedSkill(null);
      setSelectedSkillFile(null);
      setSkillFileContent("");
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

  function handleOpenHistoryFromAsk() {
    if (!historyAskAnswer) return;

    const keyword = historyAskAnswer.filters.keyword ?? "";
    const username = historyAskAnswer.filters.username ?? "";
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

  async function handleRestartServices() {
    if (restartConfirm !== "RESTART" || isRestartingServices) return;

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
    } catch (error) {
      setGithubSyncError(error instanceof Error ? error.message : "同步代码到 GitHub 失败，请稍后重试。");
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

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const viewTitle =
    activeView === "overview"
      ? "总览"
      : activeView === "workbench"
      ? "可信信息录入"
      : activeView === "factory"
        ? "可信知识加工"
      : activeView === "blogFactory"
        ? "博客工厂记录"
        : activeView === "todos"
          ? "待办事项"
          : activeView === "currentRecords"
            ? "当前记录录入"
            : activeView === "history"
              ? "历史记录查询"
              : activeView === "englishMaterials"
                ? "英语素材管理"
              : activeView === "users"
                ? "用户管理"
              : activeView === "skills"
                ? "Skill 管理"
              : activeView === "historyAsk"
                ? "AI 问数"
                : activeView === "aiCoding"
                  ? "AI 编程界面"
                : "LLM 使用情况";
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
          : activeView === "currentRecords"
            ? "Current Records"
            : activeView === "history"
              ? "History Explorer"
              : activeView === "englishMaterials"
                ? "English Materials"
              : activeView === "users"
                ? "User Management"
              : activeView === "skills"
                ? "Skill Registry"
              : activeView === "historyAsk"
                ? "Ask History"
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
                    : activeView === "currentRecords"
                      ? currentRecordQuery
                      : activeView === "englishMaterials"
                        ? englishMaterialQuery
                      : activeView === "users"
                        ? managedUserQuery
                      : activeView === "skills"
                        ? skillQuery
                      : activeView === "history"
                        ? historyQuery
                        : ""
            }
            statusFilter={activeView === "workbench" ? statusFilter : undefined}
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
            onStatusFilterChange={(nextStatus) => {
              setStatusFilter(nextStatus);
              setPage(1);
            }}
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
              newDraft={newSkillDraft}
              scope={skillListScope}
              saveError={skillSaveError}
              savedLabel={skillSavedLabel}
              selectedFile={selectedSkillFile}
              total={skillTotal}
              onCreate={handleCreateSkill}
              onDelete={handleDeleteSelectedSkill}
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
              question={historyAskQuestion}
              selectedSkillIds={historyAskSkillIds}
              skills={skillItems}
              skillsError={skillError}
              skillsLoading={isSkillLoading}
              onCopyAnswer={handleCopyHistoryAskAnswer}
              onLlmConfigDraftChange={setHistoryAskLlmConfigDraft}
              onLlmConfigSave={handleSaveHistoryAskLlmConfig}
              onOpenHistory={handleOpenHistoryFromAsk}
              onQuestionChange={setHistoryAskQuestion}
              onSubmit={handleAskHistory}
              onToggleSkill={handleToggleHistoryAskSkill}
            />
          ) : activeView === "aiCoding" ? (
            <Suspense fallback={lazyViewFallback}>
              <AiCodingWorkspace
                codexConfig={codexConfig}
                codexConfigError={codexConfigError}
                codexError={codexError}
                githubSyncError={githubSyncError}
                githubSyncStatus={githubSyncStatus}
                isCodexConfigLoading={isCodexConfigLoading}
                isCodexRunning={isCodexRunning}
                isGithubSyncing={isGithubSyncing}
                isRestartingServices={isRestartingServices}
                liveErrorOutput={liveCodexErrorOutput}
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
                onClearGithubSyncStatus={handleClearGithubSyncStatus}
                onModelChange={setAiCodingModelName}
                onPromptChange={setAiCodingPrompt}
                onRestartConfirmChange={setRestartConfirm}
                onRestartServices={handleRestartServices}
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
              isMobileDetailOpen={isMobileBlogFactoryDetailOpen}
              isLoading={isBlogFactoryLoading}
              isDetailLoading={isBlogFactoryDetailLoading}
              isStatusSaving={isBlogFactoryStatusSaving}
              isItemSaving={isBlogFactoryItemSaving}
              isArticleSaving={isBlogFactoryArticleSaving}
              isDeleting={isBlogFactoryDeleting}
              loadError={blogFactoryError}
              statusError={blogFactoryStatusError}
              editError={blogFactoryEditError}
              articleError={blogFactoryArticleError}
              taskCopyError={blogFactoryTaskCopyError}
              publishConfigs={blogPublishConfigs}
              isPublishConfigsLoading={isBlogPublishConfigsLoading}
              publishConfigsError={blogPublishConfigsError}
              publishError={blogPublishError}
              publishSuccess={blogPublishSuccess}
              isPublishing={isBlogPublishing}
              editDraft={blogFactoryEditDraft}
              maskRules={blogFactoryMaskRules}
              selectedMaskRuleId={selectedBlogFactoryMaskRuleId}
              maskError={blogFactoryMaskError}
              maskNotice={blogFactoryMaskNotice}
              hasCopiedTask={hasCopiedBlogFactoryTask}
              filters={{
                username: blogFactoryUsername,
                factoryStatus: blogFactoryStatus,
                topic: blogFactoryTopic,
                knowledgeId: blogFactoryKnowledgeId,
                sortBy: blogFactorySortBy,
                sortDir: blogFactorySortDir,
              }}
              onClearFilters={() => {
                setBlogFactoryPage(1);
                setBlogFactoryQuery("");
                setBlogFactoryUsername(getClearedScopedUsernameFilter(authUser));
                setBlogFactoryStatus("all");
                setBlogFactoryTopic("");
                setBlogFactoryKnowledgeId("");
                setBlogFactorySortBy("copied_at");
                setBlogFactorySortDir("desc");
              }}
              onFilterChange={(nextFilters) => {
                setBlogFactoryPage(1);
                if (nextFilters.username !== undefined) setBlogFactoryUsername(nextFilters.username);
                if (nextFilters.factoryStatus !== undefined) setBlogFactoryStatus(nextFilters.factoryStatus);
                if (nextFilters.topic !== undefined) setBlogFactoryTopic(nextFilters.topic);
                if (nextFilters.knowledgeId !== undefined) setBlogFactoryKnowledgeId(nextFilters.knowledgeId);
                if (nextFilters.sortBy !== undefined) setBlogFactorySortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setBlogFactorySortDir(nextFilters.sortDir);
              }}
              onPageChange={setBlogFactoryPage}
              onEditDraftChange={setBlogFactoryEditDraft}
              onMaskRuleChange={setSelectedBlogFactoryMaskRuleId}
              onOpenMaskDialog={handleOpenBlogFactoryMaskDialog}
              onApplyMaskRule={handleApplyBlogFactoryMaskRule}
              onCopyTask={handleCopyBlogFactoryTaskContent}
              onOpenPublishConfig={handleOpenBlogPublishConfigDialog}
              onOpenPublishDialog={handleOpenBlogPublishDialog}
              onDelete={handleRequestDeleteBlogFactoryItem}
              onCloseMobileDetail={() => setIsMobileBlogFactoryDetailOpen(false)}
              onSaveItem={handleSaveBlogFactoryItem}
              onSelect={handleSelectBlogFactoryItem}
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
              draft={englishMaterialDraft}
              detailDraft={englishMaterialDetailDraft}
              isLoading={isEnglishMaterialLoading}
              isDetailLoading={isEnglishMaterialDetailLoading}
              isSaving={isEnglishMaterialSaving}
              isDetailSaving={isEnglishMaterialDetailSaving}
              copiedLabel={englishMaterialCopiedLabel}
              loadError={englishMaterialError}
              saveError={englishMaterialSaveError}
              filters={{
                username: englishMaterialUsername,
                category: englishMaterialCategory,
                flag: englishMaterialFlag,
                sortBy: englishMaterialSortBy,
                sortDir: englishMaterialSortDir,
              }}
              onClearFilters={() => {
                setEnglishMaterialPage(1);
                setEnglishMaterialQuery("");
                setEnglishMaterialUsername(getClearedScopedUsernameFilter(authUser));
                setEnglishMaterialCategory("");
                setEnglishMaterialFlag("");
                setEnglishMaterialSortBy("id");
                setEnglishMaterialSortDir("desc");
              }}
              onDraftChange={handleEnglishMaterialDraftChange}
              onFilterChange={(nextFilters) => {
                setEnglishMaterialPage(1);
                if (nextFilters.username !== undefined) setEnglishMaterialUsername(nextFilters.username);
                if (nextFilters.category !== undefined) setEnglishMaterialCategory(nextFilters.category);
                if (nextFilters.flag !== undefined) setEnglishMaterialFlag(nextFilters.flag);
                if (nextFilters.sortBy !== undefined) setEnglishMaterialSortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setEnglishMaterialSortDir(nextFilters.sortDir);
              }}
              onCloseDetail={() => {
                if (!isEnglishMaterialDetailLoading) setIsEnglishMaterialDetailOpen(false);
              }}
              onCopyText={handleCopyEnglishMaterialText}
              onDetailDraftChange={setEnglishMaterialDetailDraft}
              onPageChange={setEnglishMaterialPage}
              onSaveDetail={handleSaveEnglishMaterialDetail}
              onSelect={handleSelectEnglishMaterial}
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
                onClearFilters={() => {
                  setHistoryPage(1);
                  setHistoryQuery("");
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
            <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 lg:grid-cols-[minmax(440px,0.95fr)_minmax(420px,1.05fr)] xl:grid-cols-[minmax(500px,0.9fr)_minmax(460px,0.72fr)_300px]">
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
                onPageChange={setPage}
                onUsernameChange={(nextUsername) => {
                  setPage(1);
                  setWorkbenchUsername(nextUsername);
                }}
                onSelect={handleSelectItem}
              />

              <TrustPanel
                draft={draft}
                trustScore={trustScore}
                hasSensitiveSignal={hasSensitiveSignal}
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
              task={factoryTask}
              selectedSkillIds={factorySkillIds}
              skills={skillItems}
              skillsError={skillError}
              skillsLoading={isSkillLoading}
              hasCopied={hasCopiedFactoryTask}
              isCopySaving={isFactoryCopySaving}
              isMerging={isFactoryMerging}
              copyError={factoryCopyError}
              codexErrorOutput={factoryCodexErrorOutput}
              codexStatus={factoryCodexStatus}
              searchQuery={factoryQuery}
              username={factoryUsername}
              onClearSearch={() => {
                setFactoryQuery("");
                setFactoryPage(1);
              }}
              onCopyTask={handleCopyFactoryTask}
              onGenerateTask={handleGenerateFactoryTask}
              onMergeKnowledge={handleMergeFactoryKnowledge}
              onPageChange={setFactoryPage}
              onUsernameChange={(nextUsername) => {
                setFactoryPage(1);
                setFactoryUsername(nextUsername);
              }}
              onSelect={(item) => {
                setFactorySelectedId(item.id);
                setFactoryTask("");
                setFactoryCodexStatus("");
                setFactoryCodexErrorOutput("");
                setHasCopiedFactoryTask(false);
                setFactoryCopyError(null);
              }}
              onToggleSkill={handleToggleFactorySkill}
            />
          )}
        </section>
      </div>

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

function Topbar({
  activeView,
  aiCodingNotice,
  availableItems,
  currentUsername,
  isMobileNavVisible,
  query,
  statusFilter,
  themeMode,
  title,
  subtitle,
  onMobileNavVisibilityChange,
  onLogout,
  onQueryChange,
  onToggleTheme,
  onViewChange,
  onStatusFilterChange,
}: {
  activeView: AppView;
  aiCodingNotice: AiCodingNoticeStatus | null;
  availableItems: FunctionNavItem[];
  currentUsername: string;
  isMobileNavVisible: boolean;
  query: string;
  statusFilter?: KnowledgeStatus | "all";
  themeMode: ThemeMode;
  title: string;
  subtitle: string;
  onMobileNavVisibilityChange: (visible: boolean) => void;
  onLogout: () => void;
  onQueryChange: (value: string) => void;
  onToggleTheme: () => void;
  onViewChange: (view: AppView) => void;
  onStatusFilterChange?: (status: KnowledgeStatus | "all") => void;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const statusOptions: Array<{ label: string; value: KnowledgeStatus | "all" }> = [
    { label: "全部状态", value: "all" },
    { label: "未发布", value: "未发布" },
    { label: "已发布", value: "已发布" },
    { label: "跳过", value: "跳过" },
  ];
  const activeLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? "全部状态";
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
          : null;

  return (
    <header className="relative z-40 flex flex-col gap-4 border-b border-white/8 bg-ink-900/72 px-4 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mint-300/80">
          <ShieldCheck size={14} />
          {subtitle}
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-50">{title}</h1>
      </div>
      <div className="flex items-center gap-2 lg:hidden">
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
        {activeView !== "overview" && activeView !== "usage" && activeView !== "historyAsk" && activeView !== "aiCoding" ? (
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
        {statusFilter !== undefined && onStatusFilterChange ? (
        <div className="relative">
          <button
            className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm transition ${
              statusFilter === "all"
                ? "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                : "border-mint-300/25 bg-mint-300/10 text-mint-300"
            }`}
            title="状态筛选"
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
          >
            <Filter size={17} />
            <span className="hidden sm:inline">{activeLabel}</span>
          </button>
          {isFilterOpen ? (
            <div className="absolute right-0 top-12 z-50 w-40 rounded-lg border border-white/14 bg-ink-950 p-1.5 shadow-soft-glow">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={`flex h-9 w-full items-center justify-between rounded-md px-3 text-sm transition ${
                    statusFilter === option.value
                      ? "border border-mint-300/25 bg-mint-300/14 text-mint-300"
                      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-50"
                  }`}
                  type="button"
                  onClick={() => {
                    onStatusFilterChange(option.value);
                    setIsFilterOpen(false);
                  }}
                >
                  {option.label}
                  {statusFilter === option.value ? <CheckCircle2 size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        ) : null}
        <div
          className="flex h-11 min-w-0 max-w-full items-center rounded-lg border border-white/10 bg-white/[0.028] px-3 text-sm text-slate-400"
          title={`当前登录用户：${currentUsername}`}
        >
          <span className="mr-1 hidden text-slate-500 sm:inline">您好，</span>
          <span className="truncate font-medium text-slate-200">{currentUsername}</span>
        </div>
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

function MarkdownImageTextarea({
  value,
  onChange,
  className,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
    const insertion = `${prefix}${markdown}${suffix}`;
    const nextValue = `${before}${insertion}${after}`;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const nextCursor = start + insertion.length;
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300 disabled:cursor-not-allowed disabled:text-slate-600"
          disabled={disabled || isUploadingImage}
          title="插入图片"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploadingImage ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
          {isUploadingImage ? "上传中" : "图片"}
        </button>
        {imageError ? (
          <span className="text-sm text-red-200">{imageError}</span>
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
        onPaste={handlePaste}
      />
    </div>
  );
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
  onSubmit,
}: {
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
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
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

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/74 p-4 shadow-soft-glow backdrop-blur-xl">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            {isEditing ? <Pencil size={17} /> : <FilePlus2 size={17} />}
            {isEditing ? `Editing #${selectedId}` : "New Entry"}
          </div>
          <h2 className="text-xl font-semibold text-slate-50">
            {formTitle}
          </h2>
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
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trust</div>
            <div className="text-lg font-semibold text-mint-300">{trustScore}%</div>
          </div>
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
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

        <EditorField label={contentFieldLabel} icon={<Archive size={16} />}>
          <MarkdownImageTextarea
            value={draft.answer}
            className="control min-h-[330px] resize-none leading-7"
            onChange={(answer) => onDraftChange({ ...draft, answer })}
            placeholder={contentPlaceholder}
          />
        </EditorField>

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
  onPageChange,
  onUsernameChange,
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
  onPageChange: (page: number) => void;
  onUsernameChange: (username: string) => void;
  onSelect: (item: KnowledgeItem) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const visibleUsers = getVisibleUsers(authUser);
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && visibleUsers.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";

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
  task,
  selectedSkillIds,
  skills,
  skillsError,
  skillsLoading,
  hasCopied,
  isCopySaving,
  isMerging,
  copyError,
  codexErrorOutput,
  codexStatus,
  searchQuery,
  username,
  onClearSearch,
  onCopyTask,
  onGenerateTask,
  onMergeKnowledge,
  onPageChange,
  onUsernameChange,
  onSelect,
  onToggleSkill,
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
  task: string;
  selectedSkillIds: string[];
  skills: SkillSummary[];
  skillsError: string | null;
  skillsLoading: boolean;
  hasCopied: boolean;
  isCopySaving: boolean;
  isMerging: boolean;
  copyError: string | null;
  codexErrorOutput: string;
  codexStatus: string;
  searchQuery: string;
  username: string;
  onClearSearch: () => void;
  onCopyTask: (view: MarkdownContentView) => void;
  onGenerateTask: (item: KnowledgeItem) => void;
  onMergeKnowledge: (knowledgeIds: number[], mergeDraft: KnowledgeDraft) => Promise<KnowledgeItem>;
  onPageChange: (page: number) => void;
  onUsernameChange: (username: string) => void;
  onSelect: (item: KnowledgeItem) => void;
  onToggleSkill: (skillId: string) => void;
}) {
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const [selectedMergeItems, setSelectedMergeItems] = useState<KnowledgeItem[]>([]);
  const [mergeDraft, setMergeDraft] = useState<KnowledgeDraft | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<MarkdownContentView>("rendered");
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
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[360px_minmax(440px,1fr)_minmax(360px,0.82fr)]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
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
                  <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onSelect(item)}>
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
      </section>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/68 p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <FileText size={17} />
              Source Context
            </div>
            <h2 className="text-xl font-semibold text-slate-50">知识原文</h2>
          </div>
          {selectedItem ? (
            <button
              className="flex h-10 items-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isGenerating || selectedSkillIds.length === 0}
              title={selectedSkillIds.length === 0 ? "请先选择 skill" : "使用所选 skill 直接生成结果"}
              type="button"
              onClick={() => onGenerateTask(selectedItem)}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
              {isGenerating ? "生成中" : "生成结果"}
            </button>
          ) : null}
        </div>

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
              disabled={!task || isCopySaving}
              title={isCopySaving ? "正在保存" : hasCopied ? "已复制并保存" : "复制并保存加工结果"}
              type="button"
              onClick={() => onCopyTask(taskView)}
            >
              {isCopySaving ? (
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

        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Layers3 className="text-mint-300" size={16} />
              选择 Skill
            </div>
            <span className="text-xs text-slate-500">已选择 {formatAmount(selectedSkillIds.length)} 个</span>
          </div>
          {skillsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              正在加载可用 skill...
            </div>
          ) : skillsError ? (
            <div className="text-sm text-red-200">{skillsError}</div>
          ) : skills.length > 0 ? (
            <div className="grid gap-2">
              {skills.map((skill) => {
                const selected = selectedSkillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
                      selected
                        ? "border-mint-300/30 bg-mint-300/10 text-mint-100"
                        : "border-white/10 bg-white/[0.028] text-slate-300 hover:border-mint-300/25"
                    }`}
                    type="button"
                    onClick={() => onToggleSkill(skill.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{skill.name}</span>
                      {selected ? <CheckCircle2 className="shrink-0 text-mint-300" size={15} /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{skill.description || "无描述"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span>{skill.skill_type === "system" ? "系统自带" : "用户自建"}</span>
                      <span>{skill.owner_username ? skill.owner_username : "系统"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">暂无启用的 skill，可在 Skill 管理中新增或上传。</div>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-mint-300/20 bg-mint-300/8 p-3 text-sm leading-6 text-mint-100/85">
          选择知识和 skill 后会以只读模式提交 Codex，加工结果会显示在下方。
        </div>

        {copyError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
            <span>{copyError}</span>
          </div>
        ) : null}

        {codexStatus ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-slate-400">
            {isGenerating ? (
              <Loader2 className="animate-spin text-mint-300" size={15} />
            ) : copyError ? (
              <TriangleAlert className="text-amberline" size={15} />
            ) : (
              <CheckCircle2 className="text-mint-300" size={15} />
            )}
            <span>{codexStatus}</span>
          </div>
        ) : null}

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
        {codexErrorOutput ? (
          <details className="mt-4 rounded-lg border border-amberline/20 bg-amberline/8 p-3">
            <summary className="cursor-pointer text-sm font-medium text-amber-100">Error Output</summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-amber-100/80">
              {codexErrorOutput}
            </pre>
          </details>
        ) : null}
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
  factoryStatus: BlogFactoryStatus | "all";
  topic: string;
  knowledgeId: string;
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
  category: string;
  flag: "" | "0" | "1";
  sortBy: "id" | "sequence_no" | "category" | "base_expression" | "title" | "flag";
  sortDir: "asc" | "desc";
};

function BlogFactoryRecords({
  authUser,
  items,
  total,
  page,
  selectedItem,
  isMobileDetailOpen,
  isLoading,
  isDetailLoading,
  isStatusSaving,
  isItemSaving,
  isArticleSaving,
  isDeleting,
  loadError,
  statusError,
  editError,
  articleError,
  taskCopyError,
  publishConfigs,
  isPublishConfigsLoading,
  publishConfigsError,
  publishError,
  publishSuccess,
  isPublishing,
  editDraft,
  maskRules,
  selectedMaskRuleId,
  maskError,
  maskNotice,
  hasCopiedTask,
  filters,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onEditDraftChange,
  onMaskRuleChange,
  onOpenMaskDialog,
  onApplyMaskRule,
  onCopyTask,
  onOpenPublishConfig,
  onOpenPublishDialog,
  onDelete,
  onCloseMobileDetail,
  onSaveItem,
  onSelect,
  onStatusChange,
}: {
  authUser: AuthUser | null;
  items: BlogFactoryItem[];
  total: number;
  page: number;
  selectedItem: BlogFactoryItem | null;
  isMobileDetailOpen: boolean;
  isLoading: boolean;
  isDetailLoading: boolean;
  isStatusSaving: boolean;
  isItemSaving: boolean;
  isArticleSaving: boolean;
  isDeleting: boolean;
  loadError: string | null;
  statusError: string | null;
  editError: string | null;
  articleError: string | null;
  taskCopyError: string | null;
  publishConfigs: BlogPublishConfig[];
  isPublishConfigsLoading: boolean;
  publishConfigsError: string | null;
  publishError: string | null;
  publishSuccess: BlogFactoryPublishResult | null;
  isPublishing: boolean;
  editDraft: BlogFactoryEditDraft;
  maskRules: BlogFactoryMaskRule[];
  selectedMaskRuleId: string | null;
  maskError: string | null;
  maskNotice: string | null;
  hasCopiedTask: boolean;
  filters: BlogFactoryFilters;
  onFilterChange: (filters: Partial<BlogFactoryFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onEditDraftChange: (draft: BlogFactoryEditDraft) => void;
  onMaskRuleChange: (ruleId: string | null) => void;
  onOpenMaskDialog: () => void;
  onApplyMaskRule: (ruleId?: string | null) => void;
  onCopyTask: (view: BlogFactoryTaskCopyMode) => void;
  onOpenPublishConfig: () => void;
  onOpenPublishDialog: (mode: BlogPublishDialogMode) => void;
  onDelete: () => void;
  onCloseMobileDetail: () => void;
  onSaveItem: () => void;
  onSelect: (item: BlogFactoryItem) => void;
  onStatusChange: (status: BlogFactoryStatus) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / BLOG_FACTORY_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * BLOG_FACTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * BLOG_FACTORY_PAGE_SIZE, total);
  const [taskCopyView, setTaskCopyView] = useState<BlogFactoryTaskCopyMode>("rendered");
  const publishMarkdown = selectedItem ? resolveBlogFactoryPublishMarkdown(selectedItem, selectedItem.article_markdown, editDraft.taskContent) : "";
  const publishTitle = selectedItem ? extractMarkdownHeading(publishMarkdown) || selectedItem.article_title || "" : "";
  const canPublish = publishMarkdown.trim().length > 0 && publishConfigs.length > 0 && !isPublishing;
  const selectedMaskRule = maskRules.find((item) => item.id === selectedMaskRuleId) ?? null;
  const canApplyMaskRule =
    selectedItem !== null &&
    editDraft.taskContent.trim().length > 0 &&
    selectedMaskRule !== null &&
    hasEnabledBlogFactoryMaskRule(selectedMaskRule) &&
    !isItemSaving &&
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
    !isItemSaving &&
    !isDeleting;
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
        <div className="flex items-center gap-2">
          {isDetailLoading ? <Loader2 className="animate-spin text-mint-300" size={17} /> : null}
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
            disabled={!selectedItem || isDeleting || isItemSaving || isArticleSaving}
            title="删除任务"
            type="button"
            onClick={onDelete}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {selectedItem ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
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
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-sm leading-6 text-slate-400">
              发送到博客工厂后，源知识内容状态会自动同步为“已发布”；此处只需要维护工厂状态。
            </div>
          </div>

          {statusError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{statusError}</span>
            </div>
          ) : null}

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Pencil size={16} />
              编辑任务记录
            </div>
            <div className="space-y-4">
              <Field label="任务内容" icon={<FileText size={16} />}>
                <div className="space-y-3">
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
                      {describeBlogFactoryMaskRule(selectedMaskRule)}
                    </div>
                  ) : null}
                  <textarea
                    className="control min-h-[180px] resize-none font-mono text-xs leading-6 text-slate-200"
                    value={editDraft.taskContent}
                    onChange={(event) => onEditDraftChange({ ...editDraft, taskContent: event.target.value })}
                  />
                  {maskNotice ? (
                    <div className="rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-2 text-xs leading-6 text-mint-100">
                      {maskNotice}
                    </div>
                  ) : null}
                  {maskError ? (
                    <div className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-6 text-red-100">
                      {maskError}
                    </div>
                  ) : null}
                </div>
              </Field>
              <Field label="问题快照" icon={<Sparkles size={16} />}>
                <textarea
                  className="control min-h-[92px] resize-none leading-7"
                  maxLength={4000}
                  value={editDraft.questionSnapshot}
                  onChange={(event) => onEditDraftChange({ ...editDraft, questionSnapshot: event.target.value })}
                />
              </Field>
              <Field label="答案快照" icon={<FileText size={16} />}>
                <textarea
                  className="control min-h-[160px] resize-none leading-7"
                  value={editDraft.answerSnapshot}
                  onChange={(event) => onEditDraftChange({ ...editDraft, answerSnapshot: event.target.value })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="来源" icon={<Database size={16} />}>
                  <input
                    className="control"
                    maxLength={200}
                    value={editDraft.sourceSnapshot}
                    onChange={(event) => onEditDraftChange({ ...editDraft, sourceSnapshot: event.target.value })}
                  />
                </Field>
                <Field label="主题标签" icon={<Tags size={16} />}>
                  <input
                    className="control"
                    maxLength={100}
                    value={editDraft.topicTagSnapshot}
                    onChange={(event) => onEditDraftChange({ ...editDraft, topicTagSnapshot: event.target.value })}
                  />
                </Field>
              </div>
            </div>

            {editError ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                <span>{editError}</span>
              </div>
            ) : null}

            <button
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canSaveItem}
              type="button"
              onClick={onSaveItem}
            >
              {isItemSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {isItemSaving ? "保存中" : "保存任务记录"}
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
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
                </div>
              </div>
            </div>

            {selectedItem.task_content.trim() ? (
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
            <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
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
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[300px_minmax(420px,1fr)_minmax(360px,0.86fr)]">
      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <Filter size={17} />
            Query Controls
          </div>
          <h2 className="text-lg font-semibold text-slate-50">查询条件</h2>
        </div>

        <div className="space-y-4">
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

          <div className="grid grid-cols-[1fr_110px] gap-3">
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

          <FilterClearButton className="w-full" onClick={onClearFilters} />
        </div>
      </aside>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
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
            {items.map((item) => (
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
                      {item.question_snapshot || "无问题快照"}
                    </h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${blogFactoryStatusStyles[item.factory_status]}`}>
                    {item.factory_status}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-400">{item.task_content || "无任务内容"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
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

      <aside className="hidden min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl lg:block">
        {renderDetailPanel()}
      </aside>

      <MobileEditorSheet
        icon={<FileText size={17} />}
        isBusy={isDetailLoading || isStatusSaving || isItemSaving || isArticleSaving || isDeleting}
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
  const canSave =
    selectedId !== null &&
    draft.title.trim().length > 0 &&
    draft.content.trim().length > 0 &&
    !isSaving &&
    !isConvertingToKnowledge;
  const canCopyContent = selectedId !== null && (draft.title.trim().length > 0 || draft.content.trim().length > 0);
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

          <EditorField label="任务内容" icon={<FileText size={16} />}>
            <MarkdownImageTextarea
              className="control min-h-[320px] resize-none leading-7 xl:min-h-[380px]"
              value={draft.content}
              onChange={(content) => onDraftChange({ ...draft, content })}
              placeholder="补充待办事项背景、验收标准或下一步动作。"
            />
          </EditorField>

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
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(340px,0.8fr)_minmax(520px,1.2fr)]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
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

        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]">
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

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
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
  draft,
  detailDraft,
  isLoading,
  isDetailLoading,
  isSaving,
  isDetailSaving,
  copiedLabel,
  loadError,
  saveError,
  filters,
  onDraftChange,
  onFilterChange,
  onClearFilters,
  onCloseDetail,
  onCopyText,
  onDetailDraftChange,
  onPageChange,
  onSaveDetail,
  onSelect,
  onSubmit,
}: {
  authUser: AuthUser | null;
  items: EnglishMaterialItem[];
  total: number;
  page: number;
  selectedItem: EnglishMaterialItem | null;
  isDetailOpen: boolean;
  draft: EnglishMaterialDraft;
  detailDraft: EnglishMaterialDraft;
  isLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  isDetailSaving: boolean;
  copiedLabel: string | null;
  loadError: string | null;
  saveError: string | null;
  filters: EnglishMaterialFilters;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
  onFilterChange: (filters: Partial<EnglishMaterialFilters>) => void;
  onClearFilters: () => void;
  onCloseDetail: () => void;
  onCopyText: (value: string, label: string) => void;
  onDetailDraftChange: (draft: EnglishMaterialDraft) => void;
  onPageChange: (page: number) => void;
  onSaveDetail: () => void;
  onSelect: (item: EnglishMaterialItem) => void;
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

  return (
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(520px,1fr)_380px]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <BookOpenCheck size={17} />
              T_DOUYIN_DETAILS
            </div>
            <h2 className="text-xl font-semibold text-slate-50">英语素材列表</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
            {total} 条素材
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_120px_1fr_auto]">
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
            <input
              className="control"
              maxLength={50}
              value={filters.category}
              onChange={(event) => onFilterChange({ category: event.target.value })}
              placeholder="按分类精确筛选"
            />
          </Field>
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
          <FilterClearButton className="md:mt-7" label="清空筛选条件" onClick={onClearFilters} />
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
              <p className="text-sm text-slate-500">新增素材后，这里会展示 `T_DOUYIN_DETAILS` 记录。</p>
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
      </section>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <Plus size={17} />
            New Material
          </div>
          <h2 className="text-xl font-semibold text-slate-50">录入英语素材</h2>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-[1fr_110px] gap-3">
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

          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="分类标识" icon={<Tags size={16} />}>
              <input
                className="control"
                maxLength={50}
                value={draft.category}
                onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}
                placeholder="如 workplace"
              />
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
            {isSaving ? "写入中" : "保存到 T_DOUYIN_DETAILS"}
          </button>
        </form>
      </section>

      <EnglishMaterialDetailDialog
        copiedLabel={copiedLabel}
        draft={detailDraft}
        isLoading={isDetailLoading}
        isSaving={isDetailSaving}
        item={isDetailOpen ? selectedItem : null}
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
  nextItem: EnglishMaterialItem | null;
  onClose: () => void;
  onCopyText: (value: string, label: string) => void;
  onDraftChange: (draft: EnglishMaterialDraft) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSave: () => void;
  previousItem: EnglishMaterialItem | null;
}) {
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

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                <Field label="分类标识" icon={<Tags size={16} />}>
                  <input
                    className="control"
                    maxLength={50}
                    value={draft.category}
                    onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}
                    placeholder="如 workplace"
                  />
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
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-ink-900/96 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <div className="grid gap-2 sm:grid-cols-4">
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
              disabled={isLoading || !draft.full_script}
              type="button"
              onClick={() => onCopyText(draft.full_script, "完整口播内容")}
            >
              {copiedLabel === "完整口播内容" ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}
              {copiedLabel === "完整口播内容" ? "已复制" : "复制脚本"}
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
  newDraft: SkillDraft;
  scope: "owned" | "callable";
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
  onScopeChange: (scope: "owned" | "callable") => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveFile: () => void;
  onSelect: (skillId: string) => void;
  onUpload: (file: File | null) => void;
}) {
  const canCreate = newDraft.name.trim().length > 0 && !isSaving;
  const canSave = Boolean(detail?.can_edit) && draft.name.trim().length > 0 && !isSaving;
  const canSaveFile = Boolean(detail?.can_edit && selectedFile?.editable) && !isFileSaving;
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
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4">
        <section className="rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Layers3 size={17} />
                Skill Registry
              </div>
              <h2 className="text-lg font-semibold text-slate-50">已安装 Skill</h2>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
              {formatAmount(total)}
            </span>
          </div>

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
                scope === "callable"
                  ? "border-mint-300/30 bg-mint-300/12 text-mint-200"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-mint-300/25 hover:text-slate-200"
              }`}
              type="button"
              onClick={() => onScopeChange("callable")}
            >
              可调用 Skill
            </button>
          </div>

          {isLoading ? (
            <LoadingStack />
          ) : error ? (
            <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {items.map((skill) => {
                const selected = detail?.id === skill.id;
                return (
                  <button
                    key={skill.id}
                    className={`block w-full rounded-lg border p-3 text-left transition ${
                      selected
                        ? "border-mint-300/30 bg-mint-300/10"
                        : "border-white/10 bg-white/[0.028] hover:border-mint-300/25 hover:bg-white/[0.045]"
                    }`}
                    type="button"
                    onClick={() => onSelect(skill.id)}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">{skill.name}</span>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${
                          skill.enabled
                            ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                            : "border-white/10 bg-white/[0.035] text-slate-500"
                        }`}
                      >
                        {skill.enabled ? "启用" : "停用"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-500">{skill.description || "无描述"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span>{skill.skill_type === "system" ? "系统自带" : "用户自建"}</span>
                      <span>{skill.published ? "已发布" : "仅自己可见"}</span>
                      <span>{skill.owner_username ? `Owner: ${skill.owner_username}` : "Owner: 系统"}</span>
                      <span>{formatAmount(skill.file_count)} files</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
              暂无 skill。可以新建自定义 skill，或上传标准 skill zip 包。
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
            <FilePlus2 className="text-mint-300" size={17} />
            新建自定义 Skill
          </div>
          <form className="space-y-3" onSubmit={onCreate}>
            <input
              className="control h-10"
              value={newDraft.name}
              onChange={(event) => onNewDraftChange({ ...newDraft, name: event.target.value })}
              placeholder="Skill 名称"
            />
            <textarea
              className="control min-h-20 resize-none"
              value={newDraft.description}
              onChange={(event) => onNewDraftChange({ ...newDraft, description: event.target.value })}
              placeholder="描述这个 skill 会如何影响输出结构、语气或排版。"
            />
            <textarea
              className="control min-h-32 resize-y font-mono text-xs leading-6"
              value={newDraft.content}
              onChange={(event) => onNewDraftChange({ ...newDraft, content: event.target.value })}
              placeholder={"# Skill 名称\n\n描述：...\n\n## 使用规则\n- ..."}
            />
            <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.028] px-3 py-2 text-sm text-slate-300">
              <span>发布给其他用户调用</span>
              <input
                checked={newDraft.published}
                className="h-4 w-4 accent-mint-300"
                type="checkbox"
                onChange={(event) => onNewDraftChange({ ...newDraft, published: event.target.checked })}
              />
            </label>
            <button
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-3 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canCreate}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              新建 Skill
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <label className="block">
            <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Archive className="text-mint-300" size={17} />
              上传标准 Skill Zip
            </span>
            <input
              className="control"
              accept=".zip,application/zip"
              disabled={isUploading}
              type="file"
              onChange={(event) => {
                onUpload(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
          {isUploading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              正在上传并解析...
            </div>
          ) : null}
        </section>
      </aside>

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        {detail ? (
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
                    <span>{detail.published ? "已发布" : "未发布"}</span>
                    {!detail.can_edit ? <span>当前仅可调用，不可编辑</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
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
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]">
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
                  <span>发布</span>
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
  question,
  selectedSkillIds,
  skills,
  skillsError,
  skillsLoading,
  onCopyAnswer,
  onLlmConfigDraftChange,
  onLlmConfigSave,
  onOpenHistory,
  onQuestionChange,
  onSubmit,
  onToggleSkill,
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
  question: string;
  selectedSkillIds: string[];
  skills: SkillSummary[];
  skillsError: string | null;
  skillsLoading: boolean;
  onCopyAnswer: (view: MarkdownContentView) => void;
  onLlmConfigDraftChange: (draft: LlmConfigDraft) => void;
  onLlmConfigSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpenHistory: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggleSkill: (skillId: string) => void;
}) {
  const [answerView, setAnswerView] = useState<MarkdownContentView>("rendered");
  const canSubmit = question.trim().length >= 2 && !isLoading;
  const canSaveLlmConfig =
    !isLlmConfigSaving &&
    (!llmConfigDraft.enabled ||
      (llmConfigDraft.base_url.trim().length > 0 &&
        llmConfigDraft.model_name.trim().length > 0 &&
        Boolean(llmConfig?.has_api_key)));
  const examples = [
    "总结最近30天关于“中信泰富”的工作记录。",
    "针对 alfred 最近一周的工作记录，总结一份周报。",
    "向量待更新的历史记录里哪类工作最多？",
  ];

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Bot size={17} />
              Ask History
            </div>
            <h2 className="text-xl font-semibold text-slate-50">自然语言问数</h2>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <textarea
              className="control min-h-[150px] resize-none leading-7"
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="例如：针对 alfred 的工作记录，请总结关于“中信泰富”项目的工作量统计。"
            />
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400 transition hover:border-mint-300/30 hover:text-mint-200"
                  type="button"
                  onClick={() => onQuestionChange(example)}
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Layers3 className="text-mint-300" size={16} />
                  调用 Skill
                </div>
                <span className="text-xs text-slate-500">已选择 {formatAmount(selectedSkillIds.length)} 个</span>
              </div>
              {skillsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="animate-spin" size={15} />
                  正在加载可用 skill...
                </div>
              ) : skillsError ? (
                <div className="text-sm text-red-200">{skillsError}</div>
              ) : skills.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {skills.map((skill) => {
                    const selected = selectedSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
                          selected
                            ? "border-mint-300/30 bg-mint-300/10 text-mint-100"
                            : "border-white/10 bg-white/[0.028] text-slate-300 hover:border-mint-300/25"
                        }`}
                        type="button"
                        onClick={() => onToggleSkill(skill.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{skill.name}</span>
                          {selected ? <CheckCircle2 className="shrink-0 text-mint-300" size={15} /> : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{skill.description || "无描述"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span>{skill.skill_type === "system" ? "系统自带" : "用户自建"}</span>
                          <span>{skill.owner_username ? skill.owner_username : "系统"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500">暂无启用的 skill，可在 Skill 管理中新增或上传。</div>
              )}
            </div>
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
                      className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                      type="button"
                      onClick={onOpenHistory}
                    >
                      <History size={15} />
                      查看记录
                    </button>
                  </div>
                </div>
                {answerView === "rendered" ? (
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
                  <p className="text-sm text-slate-500">输入自然语言问题后，系统会检索 t_history 并生成统计总结。</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                  <ShieldCheck size={17} />
                  LLM Config
                </div>
                <h2 className="text-lg font-semibold text-slate-50">模型配置</h2>
              </div>
              <span
                className={`rounded-md border px-2 py-1 text-xs ${
                  llmConfig?.enabled
                    ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                    : "border-white/10 bg-white/[0.035] text-slate-400"
                }`}
              >
                {llmConfig?.enabled ? "已启用" : "未启用"}
              </span>
            </div>

            {isLlmConfigLoading ? (
              <LoadingStack />
            ) : (
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
            )}

            {llmConfigError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={15} />
                <span>{llmConfigError}</span>
              </div>
            ) : null}
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <CircleGauge size={17} />
              Evidence
            </div>
            <h2 className="text-lg font-semibold text-slate-50">统计依据</h2>
          </div>

          {answer ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                <MetricTile
                  icon={<Database size={17} />}
                  label="匹配记录"
                  value={formatAmount(answer.stats.matched_count)}
                  detail={`${formatAmount(answer.stats.active_days)} 个活跃日期`}
                />
                <MetricTile
                  icon={<Search size={17} />}
                  label="识别条件"
                  value={formatAmount(getHistoryAskFilterEntries(answer.filters).length)}
                  detail="可带入历史筛选"
                />
                <MetricTile
                  icon={<CalendarClock size={17} />}
                  label="日期范围"
                  value={formatDateOnly(answer.stats.max_date)}
                  detail={`起始 ${formatDateOnly(answer.stats.min_date)}`}
                />
              </div>

              <HistoryAskFilterSummary filters={answer.filters} />
              <HistoryAskDistribution title="类型分布" items={answer.stats.type_counts} />
              <HistoryAskDistribution title="周期分布" items={answer.stats.week_counts} />
              <HistoryAskDistribution title="等级分布" items={answer.stats.learn_level_counts} />

              <div className="space-y-3">
                {answer.evidence.map((item) => (
                  <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
                    <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>#{item.id}</span>
                      <span>{formatHistoryDate(item.history_date)}</span>
                      <span>{item.type || "未分类"}</span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.content || "无内容"}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
              问数结果会展示识别出的查询条件、统计分布和代表性记录，方便核对答案来源。
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function HistoryAskDistribution({
  title,
  items,
}: {
  title: string;
  items: Record<string, number>;
}) {
  const entries = Object.entries(items);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
      <div className="mb-3 text-sm font-medium text-slate-200">{title}</div>
      <div className="space-y-2">
        {entries.length > 0 ? (
          entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-400">{label}</span>
              <span className="text-slate-200">{formatAmount(value)}</span>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">暂无分布数据</div>
        )}
      </div>
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
