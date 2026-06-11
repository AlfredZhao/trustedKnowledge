import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bot,
  CalendarClock,
  ChartLine,
  ChevronLeft,
  ChevronRight,
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
  History,
  Layers3,
  LogOut,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import {
  clearStoredApiKey,
  fetchAuthConfig,
  login,
  persistApiKey,
  readStoredApiKey,
  startWeChatLogin,
} from "./api/auth";
import {
  convertKnowledgeToTodo,
  convertTodoToKnowledge,
  createBlogFactoryItem,
  createKnowledge,
  createTodo,
  deleteKnowledge,
  fetchBlogFactoryItems,
  fetchKnowledge,
  fetchTodos,
  getBlogFactoryItem,
  getKnowledge,
  getTodo,
  mergeKnowledge,
  readCachedBlogFactoryItems,
  readCachedKnowledge,
  readCachedTodos,
  updateBlogFactoryArticle,
  updateBlogFactoryStatus,
  updateKnowledge,
  updateTodo,
} from "./api/knowledge";
import { fetchHistory, readCachedHistory } from "./api/history";
import { askHistory } from "./api/historyAsk";
import { streamCodex } from "./api/codex";
import {
  createCurrentRecord,
  fetchCurrentRecordOptions,
  fetchCurrentRecords,
  readCachedCurrentRecordOptions,
  readCachedCurrentRecords,
  updateCurrentRecord,
} from "./api/currentRecords";
import { checkBackendHealth, restartServices } from "./api/system";
import {
  createEnglishMaterial,
  fetchEnglishMaterials,
  getEnglishMaterial,
  readCachedEnglishMaterials,
  updateEnglishMaterial,
} from "./api/englishMaterials";
import { clearApiResponseCache } from "./api/localCache";
import { fetchLlmUsage, readCachedLlmUsage } from "./api/usage";
import type {
  AppView,
  BlogFactoryItem,
  BlogFactoryStatus,
  CodexRunResponse,
  CurrentDay,
  CurrentRecordItem,
  CurrentRecordOptions,
  CurrentWeek,
  EnglishMaterialDraft,
  EnglishMaterialItem,
  HistoryAskResponse,
  HistoryItem,
  HistorySummary,
  KnowledgeDraft,
  KnowledgeItem,
  KnowledgeStatus,
  LlmUsageSample,
  SystemRestartResponse,
  TodoDraft,
  TodoItem,
  TodoStatus,
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

const PAGE_SIZE = 5;
const FACTORY_PAGE_SIZE = 6;
const BLOG_FACTORY_PAGE_SIZE = 8;
const TODO_PAGE_SIZE = 8;
const CURRENT_RECORDS_PAGE_SIZE = 10;
const ENGLISH_MATERIALS_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 10;
const USAGE_SAMPLE_LIMIT = 72;
const RESET_READY_DELAY_MS = 60 * 60 * 1000;
const NEW_KNOWLEDGE_DRAFT_STORAGE_KEY = "trustedKnowledge.newDraft";
const UI_STATE_STORAGE_KEY = "trustedKnowledge.uiState.v1";
const MOBILE_VIEWPORT_CONTENT = "width=device-width, initial-scale=1.0, viewport-fit=cover";
const MOBILE_VIEWPORT_RESET_CONTENT =
  "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover";
const APP_VIEWS: AppView[] = [
  "workbench",
  "factory",
  "blogFactory",
  "todos",
  "currentRecords",
  "history",
  "englishMaterials",
  "historyAsk",
  "aiCoding",
  "usage",
];
type FunctionNavItem = {
  icon: typeof BookOpenCheck;
  label: string;
  view: AppView;
};
const FUNCTION_NAV_ITEMS: FunctionNavItem[] = [
  { icon: BookOpenCheck, label: "录入工作台", view: "workbench" },
  { icon: FlaskConical, label: "知识加工厂", view: "factory" },
  { icon: ClipboardList, label: "博客工厂", view: "blogFactory" },
  { icon: ClipboardCheck, label: "待办事项", view: "todos" },
  { icon: FilePlus2, label: "当前记录", view: "currentRecords" },
  { icon: History, label: "历史查询", view: "history" },
  { icon: BookOpenCheck, label: "英语素材", view: "englishMaterials" },
  { icon: Bot, label: "AI 问数", view: "historyAsk" },
  { icon: WandSparkles, label: "AI 编程", view: "aiCoding" },
  { icon: Bot, label: "AI 用量", view: "usage" },
];
const BLOG_FACTORY_SORT_FIELDS = ["copied_at", "id", "knowledge_id", "factory_status"] as const;
const CURRENT_RECORD_SORT_FIELDS = ["id", "type", "week", "day", "username", "learn_level"] as const;
const HISTORY_SORT_FIELDS = ["history_date", "id", "type", "username", "learn_level"] as const;
const ENGLISH_MATERIAL_SORT_FIELDS = ["id", "sequence_no", "category", "base_expression", "title", "flag"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

type BlogFactorySortBy = (typeof BLOG_FACTORY_SORT_FIELDS)[number];
type CurrentRecordSortBy = (typeof CURRENT_RECORD_SORT_FIELDS)[number];
type HistorySortBy = (typeof HISTORY_SORT_FIELDS)[number];
type EnglishMaterialSortBy = (typeof ENGLISH_MATERIAL_SORT_FIELDS)[number];
type SortDirection = (typeof SORT_DIRECTIONS)[number];
type HistoryVectorStatus = "all" | "0" | "1";

interface StoredUiState {
  activeView: AppView;
  sidebarExpanded: boolean;
  workbench: {
    query: string;
    statusFilter: KnowledgeStatus | "all";
    page: number;
    selectedId: number | null;
    draft: KnowledgeDraft | null;
  };
  factory: {
    query: string;
    page: number;
    selectedId: number | null;
    task: string;
  };
  blogFactory: {
    query: string;
    page: number;
    status: BlogFactoryStatus | "all";
    topic: string;
    knowledgeId: string;
    sortBy: BlogFactorySortBy;
    sortDir: SortDirection;
    selectedItemId: number | null;
    articleDraft: string;
    articlePathDraft: string;
  };
  todos: {
    query: string;
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
  };
}

interface UsageChangeItem extends LlmUsageSample {
  period_start: string;
  period_end: string;
  sample_count: number;
}

interface AiCodingMessage {
  id: number;
  prompt: string;
  response: CodexRunResponse | null;
  archivedKnowledgeId?: number;
}

type ConversionTarget = "knowledgeToTodo" | "todoToKnowledge";

interface PendingCurrentRecordUpdate {
  record: CurrentRecordItem;
  next: { week: CurrentWeek; day: CurrentDay; content: string };
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

function App() {
  const [restoredUiState] = useState<StoredUiState>(() => readStoredUiState());
  const restoredBlogFactoryArticleDraftRef = useRef(Boolean(restoredUiState.blogFactory.articleDraft));
  const restoredBlogFactorySelectionRef = useRef(restoredUiState.blogFactory.selectedItemId);
  const [apiKey, setApiKey] = useState(() => {
    const wechatApiKey = readWeChatApiKeyFromHash();
    if (wechatApiKey) {
      persistApiKey(wechatApiKey);
      clearLocationHash();
      return wechatApiKey;
    }

    return readStoredApiKey();
  });
  const [activeView, setActiveView] = useState<AppView>(restoredUiState.activeView);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(restoredUiState.sidebarExpanded);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [draft, setDraft] = useState<KnowledgeDraft>(() => restoredUiState.workbench.draft ?? readStoredNewDraft() ?? emptyDraft);
  const [query, setQuery] = useState(restoredUiState.workbench.query);
  const [debouncedQuery, setDebouncedQuery] = useState(restoredUiState.workbench.query.trim());
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">(restoredUiState.workbench.statusFilter);
  const [isTodoEntry, setIsTodoEntry] = useState(false);
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
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [factoryItems, setFactoryItems] = useState<KnowledgeItem[]>([]);
  const [factoryTotalItems, setFactoryTotalItems] = useState(0);
  const [factoryPage, setFactoryPage] = useState(restoredUiState.factory.page);
  const [factoryQuery, setFactoryQuery] = useState(restoredUiState.factory.query);
  const [debouncedFactoryQuery, setDebouncedFactoryQuery] = useState(restoredUiState.factory.query.trim());
  const [factorySelectedId, setFactorySelectedId] = useState<number | null>(restoredUiState.factory.selectedId);
  const [factoryTask, setFactoryTask] = useState(restoredUiState.factory.task);
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [isFactoryLoading, setIsFactoryLoading] = useState(false);
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(false);
  const [hasCopiedFactoryTask, setHasCopiedFactoryTask] = useState(false);
  const [factoryCopyError, setFactoryCopyError] = useState<string | null>(null);
  const [isFactoryCopySaving, setIsFactoryCopySaving] = useState(false);
  const [isFactoryMerging, setIsFactoryMerging] = useState(false);
  const [factoryRefreshToken, setFactoryRefreshToken] = useState(0);
  const [blogFactoryItems, setBlogFactoryItems] = useState<BlogFactoryItem[]>([]);
  const [blogFactoryTotal, setBlogFactoryTotal] = useState(0);
  const [blogFactoryPage, setBlogFactoryPage] = useState(restoredUiState.blogFactory.page);
  const [blogFactoryQuery, setBlogFactoryQuery] = useState(restoredUiState.blogFactory.query);
  const [debouncedBlogFactoryQuery, setDebouncedBlogFactoryQuery] = useState(restoredUiState.blogFactory.query.trim());
  const [blogFactoryStatus, setBlogFactoryStatus] = useState<BlogFactoryStatus | "all">(restoredUiState.blogFactory.status);
  const [blogFactoryTopic, setBlogFactoryTopic] = useState(restoredUiState.blogFactory.topic);
  const [blogFactoryKnowledgeId, setBlogFactoryKnowledgeId] = useState(restoredUiState.blogFactory.knowledgeId);
  const [blogFactorySortBy, setBlogFactorySortBy] = useState<BlogFactorySortBy>(restoredUiState.blogFactory.sortBy);
  const [blogFactorySortDir, setBlogFactorySortDir] = useState<SortDirection>(restoredUiState.blogFactory.sortDir);
  const [selectedBlogFactoryItem, setSelectedBlogFactoryItem] = useState<BlogFactoryItem | null>(null);
  const [isBlogFactoryLoading, setIsBlogFactoryLoading] = useState(false);
  const [isBlogFactoryDetailLoading, setIsBlogFactoryDetailLoading] = useState(false);
  const [isBlogFactoryStatusSaving, setIsBlogFactoryStatusSaving] = useState(false);
  const [isBlogFactoryArticleSaving, setIsBlogFactoryArticleSaving] = useState(false);
  const [blogFactoryArticleDraft, setBlogFactoryArticleDraft] = useState(restoredUiState.blogFactory.articleDraft);
  const [blogFactoryArticlePathDraft, setBlogFactoryArticlePathDraft] = useState(restoredUiState.blogFactory.articlePathDraft);
  const [blogFactoryArticleError, setBlogFactoryArticleError] = useState<string | null>(null);
  const [hasCopiedBlogFactoryArticle, setHasCopiedBlogFactoryArticle] = useState(false);
  const [blogFactoryError, setBlogFactoryError] = useState<string | null>(null);
  const [blogFactoryStatusError, setBlogFactoryStatusError] = useState<string | null>(null);
  const [blogFactoryRefreshToken, setBlogFactoryRefreshToken] = useState(0);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoTotal, setTodoTotal] = useState(0);
  const [todoPage, setTodoPage] = useState(restoredUiState.todos.page);
  const [todoQuery, setTodoQuery] = useState(restoredUiState.todos.query);
  const [debouncedTodoQuery, setDebouncedTodoQuery] = useState(restoredUiState.todos.query.trim());
  const [todoStatus, setTodoStatus] = useState<TodoStatus | "all">(restoredUiState.todos.status);
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(restoredUiState.todos.selectedId);
  const [todoDraft, setTodoDraft] = useState<TodoDraft>(restoredUiState.todos.draft ?? emptyTodoDraft);
  const [isTodoLoading, setIsTodoLoading] = useState(false);
  const [isTodoDetailLoading, setIsTodoDetailLoading] = useState(false);
  const [isTodoSaving, setIsTodoSaving] = useState(false);
  const [isConvertingTodoToKnowledge, setIsConvertingTodoToKnowledge] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [todoSaveError, setTodoSaveError] = useState<string | null>(null);
  const [todoRefreshToken, setTodoRefreshToken] = useState(0);
  const [conversionTarget, setConversionTarget] = useState<ConversionTarget | null>(null);
  const [currentRecordItems, setCurrentRecordItems] = useState<CurrentRecordItem[]>([]);
  const [currentRecordTotal, setCurrentRecordTotal] = useState(0);
  const [currentRecordPage, setCurrentRecordPage] = useState(restoredUiState.currentRecords.page);
  const [currentRecordQuery, setCurrentRecordQuery] = useState(restoredUiState.currentRecords.query);
  const [debouncedCurrentRecordQuery, setDebouncedCurrentRecordQuery] = useState(restoredUiState.currentRecords.query.trim());
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
  const [debouncedEnglishMaterialQuery, setDebouncedEnglishMaterialQuery] = useState(restoredUiState.englishMaterials.query.trim());
  const [englishMaterialCategory, setEnglishMaterialCategory] = useState(restoredUiState.englishMaterials.category);
  const [englishMaterialFlag, setEnglishMaterialFlag] = useState(restoredUiState.englishMaterials.flag);
  const [englishMaterialSortBy, setEnglishMaterialSortBy] = useState<EnglishMaterialSortBy>(restoredUiState.englishMaterials.sortBy);
  const [englishMaterialSortDir, setEnglishMaterialSortDir] = useState<SortDirection>(restoredUiState.englishMaterials.sortDir);
  const [selectedEnglishMaterial, setSelectedEnglishMaterial] = useState<EnglishMaterialItem | null>(null);
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
  const [debouncedHistoryQuery, setDebouncedHistoryQuery] = useState(restoredUiState.history.query.trim());
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
  const [usageItems, setUsageItems] = useState<LlmUsageSample[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [isUsageRefreshing, setIsUsageRefreshing] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);
  const [aiCodingPrompt, setAiCodingPrompt] = useState("");
  const [aiCodingMessages, setAiCodingMessages] = useState<AiCodingMessage[]>([]);
  const [liveCodexOutput, setLiveCodexOutput] = useState("");
  const [liveCodexErrorOutput, setLiveCodexErrorOutput] = useState("");
  const [liveCodexStatus, setLiveCodexStatus] = useState("");
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  const [codexError, setCodexError] = useState<string | null>(null);
  const [codexArchiveLoadingId, setCodexArchiveLoadingId] = useState<number | null>(null);
  const [codexArchiveError, setCodexArchiveError] = useState<string | null>(null);
  const [restartConfirm, setRestartConfirm] = useState("");
  const [restartResponse, setRestartResponse] = useState<SystemRestartResponse | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [isRestartingServices, setIsRestartingServices] = useState(false);

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
      setItems([]);
      setSelectedId(null);
      setIsConvertingKnowledgeToTodo(false);
      setBlogFactoryItems([]);
      setBlogFactoryTotal(0);
      setSelectedBlogFactoryItem(null);
      setTodoItems([]);
      setTodoTotal(0);
      setSelectedTodoId(null);
      setIsConvertingTodoToKnowledge(false);
      setConversionTarget(null);
      setCurrentRecordItems([]);
      setCurrentRecordTotal(0);
      setSelectedCurrentRecord(null);
      setPendingCurrentRecordUpdate(null);
      setEnglishMaterialItems([]);
      setEnglishMaterialTotal(0);
      setSelectedEnglishMaterial(null);
      setUsageItems([]);
      setUsageTotal(0);
      setHistoryItems([]);
      setHistoryTotal(0);
      setHistoryAskAnswer(null);
      setHasCopiedHistoryAskAnswer(false);
      setAiCodingMessages([]);
      setLiveCodexOutput("");
      setLiveCodexErrorOutput("");
      setLiveCodexStatus("");
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

    writeStoredUiState({
      activeView,
      sidebarExpanded: isSidebarExpanded,
      workbench: {
        query,
        statusFilter,
        page,
        selectedId,
        draft,
      },
      factory: {
        query: factoryQuery,
        page: factoryPage,
        selectedId: factorySelectedId,
        task: factoryTask,
      },
      blogFactory: {
        query: blogFactoryQuery,
        page: blogFactoryPage,
        status: blogFactoryStatus,
        topic: blogFactoryTopic,
        knowledgeId: blogFactoryKnowledgeId,
        sortBy: blogFactorySortBy,
        sortDir: blogFactorySortDir,
        selectedItemId: selectedBlogFactoryItem?.id ?? restoredBlogFactorySelectionRef.current,
        articleDraft: blogFactoryArticleDraft,
        articlePathDraft: blogFactoryArticlePathDraft,
      },
      todos: {
        query: todoQuery,
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
      },
    });
  }, [
    activeView,
    apiKey,
    blogFactoryArticleDraft,
    blogFactoryArticlePathDraft,
    blogFactoryKnowledgeId,
    blogFactoryPage,
    blogFactoryQuery,
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
    englishMaterialSortBy,
    englishMaterialSortDir,
    draft,
    factoryPage,
    factoryQuery,
    factorySelectedId,
    factoryTask,
    historyAskAnswer,
    historyAskQuestion,
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
    isSidebarExpanded,
    page,
    query,
    selectedBlogFactoryItem?.id,
    selectedEnglishMaterial?.id,
    selectedId,
    statusFilter,
    todoDraft,
    todoPage,
    todoQuery,
    todoStatus,
    selectedTodoId,
  ]);

  useEffect(() => {
    if (selectedId !== null) return;

    if (isEmptyDraft(draft)) {
      window.localStorage.removeItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, selectedId]);

  useEffect(() => {
    if (!apiKey || activeView !== "workbench") return;
    const nextQuery = query.trim();
    if (nextQuery === debouncedQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedQuery(nextQuery);
      setPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [activeView, apiKey, debouncedQuery, query]);

  useEffect(() => {
    if (!apiKey || activeView !== "workbench") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedQuery,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
    };
    const cached = readCachedKnowledge(requestQuery);
    if (cached) {
      setItems(cached.items);
      setTotalItems(cached.total);
      setLoadError(null);
    }

    setIsLoading(!cached);
    fetchKnowledge(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setItems(data.items);
        setTotalItems(data.total);
        setLoadError(null);
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
  }, [activeView, apiKey, debouncedQuery, page, refreshToken, statusFilter]);

  useEffect(() => {
    if (!apiKey) return;
    const nextQuery = factoryQuery.trim();
    if (nextQuery === debouncedFactoryQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedFactoryQuery(nextQuery);
      setFactoryPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, debouncedFactoryQuery, factoryQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "factory") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedFactoryQuery,
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
  }, [activeView, apiKey, debouncedFactoryQuery, factoryPage, factoryRefreshToken]);

  useEffect(() => {
    if (!apiKey) return;
    const nextQuery = blogFactoryQuery.trim();
    if (nextQuery === debouncedBlogFactoryQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedBlogFactoryQuery(nextQuery);
      setBlogFactoryPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, blogFactoryQuery, debouncedBlogFactoryQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "blogFactory") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedBlogFactoryQuery,
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
    debouncedBlogFactoryQuery,
  ]);

  useEffect(() => {
    if (!apiKey) return;
    const nextQuery = todoQuery.trim();
    if (nextQuery === debouncedTodoQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedTodoQuery(nextQuery);
      setTodoPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, debouncedTodoQuery, todoQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "todos") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedTodoQuery,
      limit: TODO_PAGE_SIZE,
      offset: (todoPage - 1) * TODO_PAGE_SIZE,
      status: todoStatus === "all" ? undefined : todoStatus,
    };
    const cached = readCachedTodos(requestQuery);
    if (cached) {
      setTodoItems(cached.items);
      setTodoTotal(cached.total);
      setTodoError(null);
    }

    setIsTodoLoading(!cached);
    fetchTodos(requestQuery)
      .then((data) => {
        if (!mounted) return;
        setTodoItems(data.items);
        setTodoTotal(data.total);
        setTodoError(null);

        setSelectedTodoId((currentSelectedId) => {
          if (currentSelectedId && data.items.some((item) => item.id === currentSelectedId)) return currentSelectedId;
          const nextItem = data.items[0] ?? null;
          setTodoDraft(nextItem ? todoItemToDraft(nextItem) : emptyTodoDraft);
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
  }, [activeView, apiKey, debouncedTodoQuery, todoPage, todoRefreshToken, todoStatus]);

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
        setCurrentRecordOptions({
          ...options,
          user_types: options.user_types ?? {},
          weeks: options.weeks.length > 0 ? options.weeks : buildWeekOptions(),
          days: options.days.length > 0 ? options.days : buildDayOptions(),
          learn_levels: options.learn_levels.length > 0 ? options.learn_levels : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        });
        setCurrentRecordDraft((current) => ({
          ...current,
          username: current.username || options.users[0] || "",
        }));
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
  }, [activeView, apiKey, currentRecordRefreshToken]);

  useEffect(() => {
    if (!apiKey) return;
    const nextQuery = currentRecordQuery.trim();
    if (nextQuery === debouncedCurrentRecordQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedCurrentRecordQuery(nextQuery);
      setCurrentRecordPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, currentRecordQuery, debouncedCurrentRecordQuery]);

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
    if (!apiKey) return;
    const nextQuery = englishMaterialQuery.trim();
    if (nextQuery === debouncedEnglishMaterialQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedEnglishMaterialQuery(nextQuery);
      setEnglishMaterialPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, englishMaterialQuery, debouncedEnglishMaterialQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "englishMaterials") return;

    let mounted = true;
    const requestQuery = {
      query: debouncedEnglishMaterialQuery,
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
  ]);

  useEffect(() => {
    if (!apiKey) return;
    const nextQuery = historyQuery.trim();
    if (nextQuery === debouncedHistoryQuery) return;

    const timer = window.setTimeout(() => {
      setDebouncedHistoryQuery(nextQuery);
      setHistoryPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, debouncedHistoryQuery, historyQuery]);

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
    if (!apiKey || activeView !== "usage") return;

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
  }, [activeView, apiKey, usageRefreshToken]);

  useEffect(() => {
    if (restoredBlogFactoryArticleDraftRef.current && !selectedBlogFactoryItem) return;

    if (
      restoredBlogFactoryArticleDraftRef.current &&
      selectedBlogFactoryItem?.id === restoredUiState.blogFactory.selectedItemId
    ) {
      restoredBlogFactoryArticleDraftRef.current = false;
      setBlogFactoryArticleError(null);
      setHasCopiedBlogFactoryArticle(false);
      return;
    }

    restoredBlogFactoryArticleDraftRef.current = false;
    setBlogFactoryArticleDraft(selectedBlogFactoryItem?.article_markdown ?? "");
    setBlogFactoryArticlePathDraft(selectedBlogFactoryItem?.article_file_path ?? "");
    setBlogFactoryArticleError(null);
    setHasCopiedBlogFactoryArticle(false);
  }, [selectedBlogFactoryItem?.id, selectedBlogFactoryItem?.article_markdown, selectedBlogFactoryItem?.article_file_path]);

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
            todo_status: "待处理",
          });
          setDraft(emptyDraft);
          clearStoredNewDraft();
          setIsTodoEntry(false);
          setTodoDraft(todoItemToDraft(created));
          setSelectedTodoId(created.id);
          setTodoPage(1);
          setTodoRefreshToken((current) => current + 1);
          setActiveView("todos");
          return;
        }

        const created = await createKnowledge(draft);
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

  async function handleDeleteSelected() {
    if (deleteTarget === null) return;

    setIsDeleting(true);
    setSaveError(null);

    try {
      await deleteKnowledge(deleteTarget.id);
      setSelectedId(null);
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
      setItems((current) => current.filter((item) => item.id !== selectedId));
      setTotalItems((current) => Math.max(0, current - 1));
      setSelectedId(null);
      setDraft(emptyDraft);
      setLastCreatedId(null);
      setTodoDraft(todoItemToDraft(converted));
      setSelectedTodoId(converted.id);
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
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setIsTodoEntry(false);
    setSaveError(null);
    restoreMobileViewportScale();
  }

  function handleLogin(nextApiKey: string) {
    persistApiKey(nextApiKey);
    setApiKey(nextApiKey);
    setPage(1);
    setDebouncedQuery("");
    setQuery("");
    setSelectedId(null);
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setIsTodoEntry(false);
  }

  function handleLogout() {
    clearStoredApiKey();
    clearApiResponseCache();
    clearStoredNewDraft();
    clearStoredUiState();
    setApiKey(null);
    setItems([]);
    setSelectedId(null);
    setDraft(emptyDraft);
    setFactoryItems([]);
    setFactorySelectedId(null);
    setFactoryTask("");
    setBlogFactoryItems([]);
    setBlogFactoryTotal(0);
    setSelectedBlogFactoryItem(null);
    setTodoItems([]);
    setTodoTotal(0);
    setSelectedTodoId(null);
    setTodoDraft(emptyTodoDraft);
    setCurrentRecordItems([]);
    setCurrentRecordTotal(0);
    setSelectedCurrentRecord(null);
      setEnglishMaterialItems([]);
      setEnglishMaterialTotal(0);
      setSelectedEnglishMaterial(null);
      setIsEnglishMaterialDetailOpen(false);
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
  }

  async function handleGenerateFactoryTask(item: KnowledgeItem) {
    setIsFactoryGenerating(true);
    setFactorySelectedId(item.id);
    setHasCopiedFactoryTask(false);
    setFactoryCopyError(null);

    window.setTimeout(() => {
      setFactoryTask(buildBlogSkillTask(item));
      setIsFactoryGenerating(false);
    }, 520);
  }

  async function handleCopyFactoryTask() {
    if (!factoryTask || factorySelectedId === null || isFactoryCopySaving) return;

    setIsFactoryCopySaving(true);
    try {
      await copyText(factoryTask);
    } catch {
      setHasCopiedFactoryTask(false);
      setFactoryCopyError("复制失败。请选中文本框内容后手动复制。");
      setIsFactoryCopySaving(false);
      return;
    }

    try {
      await createBlogFactoryItem({
        knowledgeId: factorySelectedId,
        taskContent: factoryTask,
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
    setBlogFactoryStatusError(null);
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

  async function handleSelectTodo(item: TodoItem) {
    setSelectedTodoId(item.id);
    setTodoDraft(todoItemToDraft(item));
    setTodoSaveError(null);
    setIsTodoDetailLoading(true);

    try {
      const detail = await getTodo(item.id);
      setTodoDraft(todoItemToDraft(detail));
      setTodoItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      setTodoError(null);
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "读取待办事项失败，请稍后重试。");
    } finally {
      setIsTodoDetailLoading(false);
    }
  }

  async function handleUpdateTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTodoId === null || isTodoSaving || !todoDraft.title.trim() || !todoDraft.content.trim()) return;

    setIsTodoSaving(true);
    setTodoSaveError(null);
    try {
      const updated = await updateTodo(selectedTodoId, todoDraft);
      setTodoDraft(todoItemToDraft(updated));
      setTodoItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTodoRefreshToken((current) => current + 1);
    } catch (error) {
      setTodoSaveError(error instanceof Error ? error.message : "待办事项保存失败，请稍后重试。");
    } finally {
      setIsTodoSaving(false);
    }
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
      setTodoItems((current) => current.filter((item) => item.id !== selectedTodoId));
      setTodoTotal((current) => Math.max(0, current - 1));
      setSelectedTodoId(null);
      setTodoDraft(emptyTodoDraft);
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

  async function handleCopyBlogFactoryArticle() {
    const markdown = selectedBlogFactoryItem?.article_markdown ?? blogFactoryArticleDraft;
    if (!markdown.trim()) return;

    try {
      await copyText(markdown);
      setHasCopiedBlogFactoryArticle(true);
      window.setTimeout(() => setHasCopiedBlogFactoryArticle(false), 1600);
    } catch {
      setBlogFactoryArticleError("复制失败。请选中文本框内容后手动复制。");
    }
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

  async function handleAskHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = historyAskQuestion.trim();
    if (!question || isHistoryAsking) return;

    setIsHistoryAsking(true);
    setHistoryAskError(null);
    setHasCopiedHistoryAskAnswer(false);
    try {
      const answer = await askHistory(question);
      setHistoryAskAnswer(answer);
    } catch (error) {
      setHistoryAskError(error instanceof Error ? error.message : "AI 问数失败，请稍后重试。");
    } finally {
      setIsHistoryAsking(false);
    }
  }

  async function handleCopyHistoryAskAnswer() {
    if (!historyAskAnswer?.answer.trim()) return;

    try {
      await copyText(historyAskAnswer.answer);
      setHasCopiedHistoryAskAnswer(true);
      window.setTimeout(() => setHasCopiedHistoryAskAnswer(false), 1600);
    } catch {
      setHistoryAskError("复制失败。请选中回答后手动复制。");
    }
  }

  function handleOpenHistoryFromAsk() {
    if (!historyAskAnswer) return;

    const keyword = historyAskAnswer.filters.keyword ?? "";
    const username = historyAskAnswer.filters.username ?? "";
    setHistoryPage(1);
    setHistoryQuery(keyword);
    setDebouncedHistoryQuery(keyword.trim());
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

    setIsCodexRunning(true);
    setCodexError(null);
    setLiveCodexOutput("");
    setLiveCodexErrorOutput("");
    setLiveCodexStatus("正在启动 Codex...");
    try {
      const response = await streamCodex(prompt, (event) => {
        if (event.type === "stdout") {
          setLiveCodexOutput((current) => appendLogLine(current, event.message));
          setLiveCodexStatus("Codex 正在输出结果...");
        } else if (event.type === "stderr") {
          setLiveCodexErrorOutput((current) => appendLogLine(current, event.message));
          setLiveCodexStatus("Codex 正在输出诊断信息...");
        } else if (event.type === "status" || event.type === "heartbeat") {
          setLiveCodexStatus(event.message);
        } else if (event.type === "error") {
          setLiveCodexErrorOutput((current) => appendLogLine(current, event.message));
          setLiveCodexStatus("Codex 执行出现错误。");
        } else if (event.type === "complete") {
          setLiveCodexStatus("Codex 执行完成。");
        }
      });
      setAiCodingMessages((current) => [
        {
          id: Date.now(),
          prompt,
          response,
        },
        ...current,
      ]);
      setAiCodingPrompt("");
    } catch (error) {
      setCodexError(error instanceof Error ? error.message : "Codex 执行失败，请稍后重试。");
    } finally {
      setIsCodexRunning(false);
      setLiveCodexStatus("");
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

  async function handleArchiveCodexMessage(message: AiCodingMessage) {
    if (!message.response || message.archivedKnowledgeId || codexArchiveLoadingId !== null) return;

    setCodexArchiveLoadingId(message.id);
    setCodexArchiveError(null);
    try {
      const created = await createKnowledge(buildCodexKnowledgeDraft(message));
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
    activeView === "workbench"
      ? "可信知识录入工作台"
      : activeView === "factory"
        ? "可信知识加工厂"
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
              : activeView === "historyAsk"
                ? "AI 问数"
                : activeView === "aiCoding"
                  ? "AI 编程界面"
                : "LLM 使用情况";
  const viewSubtitle =
    activeView === "workbench"
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
              : activeView === "historyAsk"
                ? "Ask History"
                : activeView === "aiCoding"
                  ? "Codex Workspace"
                : "AI Usage";

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(125,211,199,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_22%)]" />
      <div
        className={`relative grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-200 ${
          isSidebarExpanded ? "lg:grid-cols-[220px_minmax(0,1fr)]" : "lg:grid-cols-[76px_minmax(0,1fr)]"
        }`}
      >
        <Sidebar
          activeView={activeView}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded((expanded) => !expanded)}
          onViewChange={setActiveView}
        />

        <section className="flex min-w-0 flex-col">
          <Topbar
            activeView={activeView}
            query={
              activeView === "workbench"
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
                      : activeView === "history"
                        ? historyQuery
                        : ""
            }
            statusFilter={activeView === "workbench" ? statusFilter : undefined}
            title={viewTitle}
            subtitle={viewSubtitle}
            onLogout={handleLogout}
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
                    : activeView === "history"
                      ? setHistoryQuery
                      : setQuery
            }
            onViewChange={setActiveView}
            onStatusFilterChange={(nextStatus) => {
              setStatusFilter(nextStatus);
              setPage(1);
            }}
          />

          {activeView === "historyAsk" ? (
            <HistoryAskPanel
              answer={historyAskAnswer}
              error={historyAskError}
              hasCopiedAnswer={hasCopiedHistoryAskAnswer}
              isLoading={isHistoryAsking}
              question={historyAskQuestion}
              onCopyAnswer={handleCopyHistoryAskAnswer}
              onOpenHistory={handleOpenHistoryFromAsk}
              onQuestionChange={setHistoryAskQuestion}
              onSubmit={handleAskHistory}
            />
          ) : activeView === "aiCoding" ? (
            <AiCodingWorkspace
              codexError={codexError}
              isCodexRunning={isCodexRunning}
              isRestartingServices={isRestartingServices}
              liveErrorOutput={liveCodexErrorOutput}
              liveOutput={liveCodexOutput}
              liveStatus={liveCodexStatus}
              messages={aiCodingMessages}
              prompt={aiCodingPrompt}
              archiveError={codexArchiveError}
              archiveLoadingId={codexArchiveLoadingId}
              restartConfirm={restartConfirm}
              restartError={restartError}
              restartResponse={restartResponse}
              onArchiveMessage={handleArchiveCodexMessage}
              onPromptChange={setAiCodingPrompt}
              onRestartConfirmChange={setRestartConfirm}
              onRestartServices={handleRestartServices}
              onSubmit={handleRunCodex}
            />
          ) : activeView === "blogFactory" ? (
            <BlogFactoryRecords
              items={blogFactoryItems}
              total={blogFactoryTotal}
              page={blogFactoryPage}
              selectedItem={selectedBlogFactoryItem}
              isLoading={isBlogFactoryLoading}
              isDetailLoading={isBlogFactoryDetailLoading}
              isStatusSaving={isBlogFactoryStatusSaving}
              isArticleSaving={isBlogFactoryArticleSaving}
              loadError={blogFactoryError}
              statusError={blogFactoryStatusError}
              articleError={blogFactoryArticleError}
              articleDraft={blogFactoryArticleDraft}
              articlePathDraft={blogFactoryArticlePathDraft}
              hasCopiedArticle={hasCopiedBlogFactoryArticle}
              filters={{
                factoryStatus: blogFactoryStatus,
                topic: blogFactoryTopic,
                knowledgeId: blogFactoryKnowledgeId,
                sortBy: blogFactorySortBy,
                sortDir: blogFactorySortDir,
              }}
              onClearFilters={() => {
                setBlogFactoryPage(1);
                setBlogFactoryQuery("");
                setDebouncedBlogFactoryQuery("");
                setBlogFactoryStatus("all");
                setBlogFactoryTopic("");
                setBlogFactoryKnowledgeId("");
                setBlogFactorySortBy("copied_at");
                setBlogFactorySortDir("desc");
              }}
              onFilterChange={(nextFilters) => {
                setBlogFactoryPage(1);
                if (nextFilters.factoryStatus !== undefined) setBlogFactoryStatus(nextFilters.factoryStatus);
                if (nextFilters.topic !== undefined) setBlogFactoryTopic(nextFilters.topic);
                if (nextFilters.knowledgeId !== undefined) setBlogFactoryKnowledgeId(nextFilters.knowledgeId);
                if (nextFilters.sortBy !== undefined) setBlogFactorySortBy(nextFilters.sortBy);
                if (nextFilters.sortDir !== undefined) setBlogFactorySortDir(nextFilters.sortDir);
              }}
              onPageChange={setBlogFactoryPage}
              onArticleChange={setBlogFactoryArticleDraft}
              onArticlePathChange={setBlogFactoryArticlePathDraft}
              onCopyArticle={handleCopyBlogFactoryArticle}
              onSaveArticle={handleSaveBlogFactoryArticle}
              onSelect={handleSelectBlogFactoryItem}
              onStatusChange={handleUpdateBlogFactoryStatus}
            />
          ) : activeView === "todos" ? (
            <TodoWorkspace
              items={todoItems}
              total={todoTotal}
              page={todoPage}
              selectedId={selectedTodoId}
              draft={todoDraft}
              status={todoStatus}
              isLoading={isTodoLoading}
              isDetailLoading={isTodoDetailLoading}
              isSaving={isTodoSaving}
              isConvertingToKnowledge={isConvertingTodoToKnowledge}
              loadError={todoError}
              saveError={todoSaveError}
              onClearFilters={() => {
                setTodoPage(1);
                setTodoQuery("");
                setDebouncedTodoQuery("");
                setTodoStatus("all");
              }}
              onDraftChange={setTodoDraft}
              onPageChange={setTodoPage}
              onSelect={handleSelectTodo}
              onConvertToKnowledge={handleConvertSelectedTodoToKnowledge}
              onStatusFilterChange={(nextStatus) => {
                setTodoPage(1);
                setTodoStatus(nextStatus);
              }}
              onSubmit={handleUpdateTodo}
            />
          ) : activeView === "currentRecords" ? (
            <CurrentRecordsWorkspace
              items={currentRecordItems}
              total={currentRecordTotal}
              page={currentRecordPage}
              options={currentRecordOptions}
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
                setDebouncedCurrentRecordQuery("");
                setCurrentRecordUsername("");
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
                category: englishMaterialCategory,
                flag: englishMaterialFlag,
                sortBy: englishMaterialSortBy,
                sortDir: englishMaterialSortDir,
              }}
              onClearFilters={() => {
                setEnglishMaterialPage(1);
                setEnglishMaterialQuery("");
                setDebouncedEnglishMaterialQuery("");
                setEnglishMaterialCategory("");
                setEnglishMaterialFlag("");
                setEnglishMaterialSortBy("id");
                setEnglishMaterialSortDir("desc");
              }}
              onDraftChange={setEnglishMaterialDraft}
              onFilterChange={(nextFilters) => {
                setEnglishMaterialPage(1);
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
            <HistoryExplorer
              items={historyItems}
              total={historyTotal}
              page={historyPage}
              summary={historySummary}
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
                setDebouncedHistoryQuery("");
                setHistoryType("");
                setHistoryUsername("");
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
          ) : activeView === "usage" ? (
            <LlmUsageDashboard
              items={usageItems}
              total={usageTotal}
              isLoading={isUsageLoading}
              isRefreshing={isUsageRefreshing}
              loadError={usageError}
              onRefresh={handleRefreshUsage}
            />
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
                onDraftChange={setDraft}
                onDelete={handleRequestDelete}
                onConvertToTodo={handleConvertSelectedKnowledgeToTodo}
                onTodoEntryChange={setIsTodoEntry}
                onNewEntry={handleNewEntry}
                onSubmit={handleSubmit}
              />

              <KnowledgeList
                items={items}
                totalItems={totalItems}
                page={page}
                pageSize={PAGE_SIZE}
                isLoading={isLoading}
                loadError={loadError}
                selectedId={selectedId}
                lastCreatedId={lastCreatedId}
                onPageChange={setPage}
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
              items={factoryItems}
              totalItems={factoryTotalItems}
              page={factoryPage}
              pageSize={FACTORY_PAGE_SIZE}
              isLoading={isFactoryLoading}
              isGenerating={isFactoryGenerating}
              loadError={factoryError}
              selectedId={factorySelectedId}
              task={factoryTask}
              hasCopied={hasCopiedFactoryTask}
              isCopySaving={isFactoryCopySaving}
              isMerging={isFactoryMerging}
              copyError={factoryCopyError}
              onCopyTask={handleCopyFactoryTask}
              onGenerateTask={handleGenerateFactoryTask}
              onMergeKnowledge={handleMergeFactoryKnowledge}
              onPageChange={setFactoryPage}
              onSelect={(item) => {
                setFactorySelectedId(item.id);
                setFactoryTask("");
                setHasCopiedFactoryTask(false);
                setFactoryCopyError(null);
              }}
            />
          )}
        </section>
      </div>

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
  isExpanded,
  onToggleExpanded,
  onViewChange,
}: {
  activeView: AppView;
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
  const primaryItems = FUNCTION_NAV_ITEMS.filter((item) => item.view !== "usage");
  const usageItem = FUNCTION_NAV_ITEMS.find((item) => item.view === "usage");
  const usageActive = activeView === "usage";

  return (
    <aside
      className={`hidden border-r border-white/8 bg-ink-900/78 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col ${
        isExpanded ? "lg:items-stretch" : "lg:items-center"
      }`}
    >
      <button
        className={`mb-8 flex h-10 items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300 shadow-soft-glow transition hover:border-mint-300/40 hover:bg-mint-300/15 ${
          isExpanded ? "w-full justify-start gap-3 px-3" : "w-10 justify-center"
        }`}
        title={isExpanded ? "收起功能名称" : "展开功能名称"}
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "收起左侧功能名称" : "展开左侧功能名称"}
        onClick={onToggleExpanded}
      >
        <Layers3 size={19} />
        {isExpanded ? <span className="truncate text-sm font-medium text-mint-100">功能导航</span> : null}
      </button>
      <nav className="flex flex-1 flex-col gap-3" aria-label="桌面功能页面">
        {primaryItems.map((item) => {
          const active = item.view === activeView;
          return (
            <button
              key={item.view}
              className={`flex h-11 items-center rounded-lg border text-sm font-medium transition ${
                active
                  ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
                  : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200"
              } ${isExpanded ? "w-full justify-start gap-3 px-3" : "w-11 justify-center"}`}
              title={item.label}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onViewChange(item.view)}
            >
              <item.icon size={19} className="shrink-0" />
              {isExpanded ? <span className="truncate">{item.label}</span> : null}
            </button>
          );
        })}
        {utilityItems.map((item) => (
          <button
            key={item.label}
            className={`flex h-11 items-center rounded-lg border border-transparent text-sm font-medium text-slate-500 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200 ${
              isExpanded ? "w-full justify-start gap-3 px-3" : "w-11 justify-center"
            }`}
            title={item.label}
            type="button"
          >
            <item.icon size={19} className="shrink-0" />
            {isExpanded ? <span className="truncate">{item.label}</span> : null}
          </button>
        ))}
      </nav>
      {usageItem ? (
        <button
          className={`flex h-10 items-center rounded-lg border text-xs font-semibold transition ${
            usageActive
              ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
              : "border-white/10 text-slate-300 hover:border-mint-300/30 hover:bg-white/[0.04] hover:text-mint-300"
          } ${isExpanded ? "w-full justify-start gap-3 px-3" : "w-10 justify-center"}`}
          title={usageItem.label}
          type="button"
          aria-current={usageActive ? "page" : undefined}
          onClick={() => onViewChange(usageItem.view)}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center">AI</span>
          {isExpanded ? <span className="truncate text-sm font-medium">{usageItem.label}</span> : null}
        </button>
      ) : null}
    </aside>
  );
}

function Topbar({
  activeView,
  query,
  statusFilter,
  title,
  subtitle,
  onLogout,
  onQueryChange,
  onViewChange,
  onStatusFilterChange,
}: {
  activeView: AppView;
  query: string;
  statusFilter?: KnowledgeStatus | "all";
  title: string;
  subtitle: string;
  onLogout: () => void;
  onQueryChange: (value: string) => void;
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

  return (
    <header className="relative z-40 flex flex-col gap-4 border-b border-white/8 bg-ink-900/72 px-4 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mint-300/80">
          <ShieldCheck size={14} />
          {subtitle}
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-50">{title}</h1>
      </div>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden" aria-label="功能页面">
        {FUNCTION_NAV_ITEMS.map((item) => {
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
              onClick={() => onViewChange(item.view)}
            >
              <item.icon size={17} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex min-w-0 items-center gap-2">
        {activeView !== "usage" && activeView !== "historyAsk" && activeView !== "aiCoding" ? (
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-slate-400 md:w-80">
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

function LoginScreen({ onLogin }: { onLogin: (apiKey: string) => void }) {
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
      const nextApiKey = await login(username.trim(), password);
      onLogin(nextApiKey);
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
  onDraftChange,
  onDelete,
  onConvertToTodo,
  onTodoEntryChange,
  onNewEntry,
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
  onDraftChange: (draft: KnowledgeDraft) => void;
  onDelete: () => void;
  onConvertToTodo: () => void;
  onTodoEntryChange: (isTodoEntry: boolean) => void;
  onNewEntry: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = draft.question.trim().length > 0 && draft.answer.trim().length > 0 && !isSaving;
  const isEditing = mode === "edit";

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/74 p-4 shadow-soft-glow backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            {isEditing ? <Pencil size={17} /> : <FilePlus2 size={17} />}
            {isEditing ? `Editing #${selectedId}` : "New Entry"}
          </div>
          <h2 className="text-xl font-semibold text-slate-50">
            {isEditing ? "编辑可信知识" : "录入可信知识"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
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

        <Field label="问题 / 标题" icon={<Sparkles size={16} />}>
          <input
            value={draft.question}
            onChange={(event) => onDraftChange({ ...draft, question: event.target.value })}
            className="control"
            placeholder="例如：Linux 主机防火墙如何同时开启 80 和 443？"
            maxLength={4000}
          />
        </Field>

        <Field label="可信答案" icon={<Archive size={16} />}>
          <textarea
            value={draft.answer}
            onChange={(event) => onDraftChange({ ...draft, answer: event.target.value })}
            className="control min-h-[330px] resize-none leading-7"
            placeholder="写入可验证、可复用、上下文完整的答案..."
          />
        </Field>

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
          {!isTodoEntry ? (
            <Field label="状态" icon={<CheckCircle2 size={16} />}>
              <StatusSegmentedControl
                value={draft.blog_status}
                onChange={(blog_status) => onDraftChange({ ...draft, blog_status })}
              />
            </Field>
          ) : null}
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

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
        <span className="text-slate-500">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function KnowledgeList({
  items,
  totalItems,
  page,
  pageSize,
  isLoading,
  loadError,
  selectedId,
  lastCreatedId,
  onPageChange,
  onSelect,
}: {
  items: KnowledgeItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  loadError: string | null;
  selectedId: number | null;
  lastCreatedId: number | null;
  onPageChange: (page: number) => void;
  onSelect: (item: KnowledgeItem) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

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
  items,
  totalItems,
  page,
  pageSize,
  isLoading,
  isGenerating,
  loadError,
  selectedId,
  task,
  hasCopied,
  isCopySaving,
  isMerging,
  copyError,
  onCopyTask,
  onGenerateTask,
  onMergeKnowledge,
  onPageChange,
  onSelect,
}: {
  items: KnowledgeItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isGenerating: boolean;
  loadError: string | null;
  selectedId: number | null;
  task: string;
  hasCopied: boolean;
  isCopySaving: boolean;
  isMerging: boolean;
  copyError: string | null;
  onCopyTask: () => void;
  onGenerateTask: (item: KnowledgeItem) => void;
  onMergeKnowledge: (knowledgeIds: number[], mergeDraft: KnowledgeDraft) => Promise<KnowledgeItem>;
  onPageChange: (page: number) => void;
  onSelect: (item: KnowledgeItem) => void;
}) {
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const [selectedMergeItems, setSelectedMergeItems] = useState<KnowledgeItem[]>([]);
  const [mergeDraft, setMergeDraft] = useState<KnowledgeDraft | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const selectedMergeIds = selectedMergeItems.map((item) => item.id);
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedMergeIds.includes(item.id));

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
            暂无未发布知识。可以回到录入工作台新增，或把状态切换为未发布。
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
              disabled={isGenerating}
              type="button"
              onClick={() => onGenerateTask(selectedItem)}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <WandSparkles size={17} />}
              {isGenerating ? "生成中" : "生成加工任务"}
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
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300 [overflow-wrap:anywhere]">
                {maskSensitive(selectedItem.answer)}
              </p>
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
              <p className="text-sm text-slate-500">加工厂会把它整理成 Blog skill 可直接消费的任务包。</p>
            </div>
          </div>
        )}
      </section>

      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Bot size={17} />
              Codex Skill
            </div>
            <h2 className="text-lg font-semibold text-slate-50">Blog 加工包</h2>
          </div>
          <button
            className={`grid h-10 w-10 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:text-slate-600 ${
              hasCopied
                ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
            }`}
            disabled={!task || isCopySaving}
            title={isCopySaving ? "正在保存" : hasCopied ? "已复制并保存" : "复制并保存加工任务"}
            type="button"
            onClick={onCopyTask}
          >
            {isCopySaving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : hasCopied ? (
              <ClipboardCheck size={17} />
            ) : (
              <Copy size={17} />
            )}
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-mint-300/20 bg-mint-300/8 p-3 text-sm leading-6 text-mint-100/85">
          这里生成的是 Codex Blog skill 的标准输入。复制后交给 Codex 执行，skill 会按规则生成 Markdown 并写入博客目录。
        </div>

        {copyError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={17} />
            <span>{copyError}</span>
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
          <textarea
            className="control min-h-[520px] resize-none font-mono text-xs leading-6 text-slate-200"
            readOnly
            value={task}
          />
        ) : (
          <div className="grid min-h-[520px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <WandSparkles className="mx-auto mb-3 text-slate-600" size={34} />
              <div className="mb-1 font-medium text-slate-300">等待生成</div>
              <p className="text-sm leading-6 text-slate-500">选择知识后点击“生成加工任务”。</p>
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">合并后可信答案 / 素材</span>
              <textarea
                className="control min-h-[300px] resize-none leading-7"
                disabled={isMerging}
                value={draft.answer}
                onChange={(event) => onDraftChange({ ...draft, answer: event.target.value })}
              />
            </label>

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
  factoryStatus: BlogFactoryStatus | "all";
  topic: string;
  knowledgeId: string;
  sortBy: "copied_at" | "id" | "knowledge_id" | "factory_status";
  sortDir: "asc" | "desc";
};

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
  category: string;
  flag: "" | "0" | "1";
  sortBy: "id" | "sequence_no" | "category" | "base_expression" | "title" | "flag";
  sortDir: "asc" | "desc";
};

function BlogFactoryRecords({
  items,
  total,
  page,
  selectedItem,
  isLoading,
  isDetailLoading,
  isStatusSaving,
  isArticleSaving,
  loadError,
  statusError,
  articleError,
  articleDraft,
  articlePathDraft,
  hasCopiedArticle,
  filters,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onArticleChange,
  onArticlePathChange,
  onCopyArticle,
  onSaveArticle,
  onSelect,
  onStatusChange,
}: {
  items: BlogFactoryItem[];
  total: number;
  page: number;
  selectedItem: BlogFactoryItem | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  isStatusSaving: boolean;
  isArticleSaving: boolean;
  loadError: string | null;
  statusError: string | null;
  articleError: string | null;
  articleDraft: string;
  articlePathDraft: string;
  hasCopiedArticle: boolean;
  filters: BlogFactoryFilters;
  onFilterChange: (filters: Partial<BlogFactoryFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onArticleChange: (value: string) => void;
  onArticlePathChange: (value: string) => void;
  onCopyArticle: () => void;
  onSaveArticle: () => void;
  onSelect: (item: BlogFactoryItem) => void;
  onStatusChange: (status: BlogFactoryStatus) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / BLOG_FACTORY_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * BLOG_FACTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * BLOG_FACTORY_PAGE_SIZE, total);
  const statusOptions: Array<{ label: string; value: BlogFactoryStatus | "all" }> = [
    { label: "全部状态", value: "all" },
    { label: "待处理", value: "待处理" },
    { label: "已处理", value: "已处理" },
    { label: "已发布", value: "已发布" },
    { label: "跳过", value: "跳过" },
  ];
  const nextStatusOptions: BlogFactoryStatus[] = ["待处理", "已处理", "已发布", "跳过"];

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

          <button
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
            type="button"
            onClick={onClearFilters}
          >
            清空条件
          </button>
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
                    原状态 {item.blog_status_snapshot || "未记录"}
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

      <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <FileText size={17} />
              Record Detail
            </div>
            <h2 className="text-lg font-semibold text-slate-50">任务详情</h2>
          </div>
          {isDetailLoading ? <Loader2 className="mt-1 animate-spin text-mint-300" size={17} /> : null}
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
                  {selectedItem.factory_status}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-400">
                  原状态 {selectedItem.blog_status_snapshot || "未记录"}
                </span>
              </div>
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

            {statusError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                <span>{statusError}</span>
              </div>
            ) : null}

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <FileText size={16} />
                    Markdown 文章
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{selectedItem.article_title || "标题待写入"}</span>
                    <span>{selectedItem.article_saved_at ? formatHistoryDate(selectedItem.article_saved_at) : "未保存"}</span>
                  </div>
                </div>
                <button
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:text-slate-600 ${
                    hasCopiedArticle
                      ? "border-mint-300/30 bg-mint-300/14 text-mint-300"
                      : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-mint-300/30 hover:text-mint-300"
                  }`}
                  disabled={!articleDraft.trim()}
                  title={hasCopiedArticle ? "已复制" : "复制 Markdown"}
                  type="button"
                  onClick={onCopyArticle}
                >
                  {hasCopiedArticle ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <Field label="文件路径" icon={<Database size={16} />}>
                <input
                  className="control"
                  value={articlePathDraft}
                  onChange={(event) => onArticlePathChange(event.target.value)}
                  placeholder="/home/alfred/projects/blogs/文章标题.md"
                />
              </Field>

              <label className="mt-4 block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-slate-500">
                    <FileText size={16} />
                  </span>
                  Markdown 正文
                </span>
                <textarea
                  className="control min-h-[260px] resize-none font-mono text-xs leading-6 text-slate-200"
                  value={articleDraft}
                  onChange={(event) => onArticleChange(event.target.value)}
                  placeholder="# 文章标题&#10;&#10;把 blog skill 生成的 Markdown 粘贴到这里。"
                />
              </label>

              {selectedItem.article_checksum ? (
                <div className="mt-3 truncate text-xs text-slate-600" title={selectedItem.article_checksum}>
                  SHA-256 {selectedItem.article_checksum}
                </div>
              ) : null}

              {articleError ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                  <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                  <span>{articleError}</span>
                </div>
              ) : null}

              <button
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={isArticleSaving || !articleDraft.trim()}
                type="button"
                onClick={onSaveArticle}
              >
                {isArticleSaving ? <Loader2 className="animate-spin" size={17} /> : <ClipboardCheck size={17} />}
                {isArticleSaving ? "保存中" : "保存 Markdown"}
              </button>
            </div>

            <DetailBlock title="任务内容" value={selectedItem.task_content} />
            <DetailBlock title="问题快照" value={selectedItem.question_snapshot} />
            <DetailBlock title="答案快照" value={maskSensitive(selectedItem.answer_snapshot)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBlock title="来源" value={selectedItem.source_snapshot || "未记录"} compact />
              <DetailBlock title="标签" value={selectedItem.topic_tag_snapshot || "未记录"} compact />
            </div>
          </div>
        ) : (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
            <div>
              <ClipboardList className="mx-auto mb-3 text-slate-600" size={36} />
              <div className="mb-1 font-medium text-slate-300">选择一条任务</div>
              <p className="text-sm leading-6 text-slate-500">右侧会显示快照内容，并允许人工更新工厂状态。</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailBlock({ title, value, compact = false }: { title: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 text-sm font-medium text-slate-300">{title}</div>
      <p className={`whitespace-pre-wrap break-words text-sm leading-7 text-slate-400 [overflow-wrap:anywhere] ${compact ? "line-clamp-4" : ""}`}>
        {value || "未记录"}
      </p>
    </div>
  );
}

function TodoWorkspace({
  items,
  total,
  page,
  selectedId,
  draft,
  status,
  isLoading,
  isDetailLoading,
  isSaving,
  isConvertingToKnowledge,
  loadError,
  saveError,
  onDraftChange,
  onClearFilters,
  onPageChange,
  onSelect,
  onConvertToKnowledge,
  onStatusFilterChange,
  onSubmit,
}: {
  items: TodoItem[];
  total: number;
  page: number;
  selectedId: number | null;
  draft: TodoDraft;
  status: TodoStatus | "all";
  isLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  isConvertingToKnowledge: boolean;
  loadError: string | null;
  saveError: string | null;
  onDraftChange: (draft: TodoDraft) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onSelect: (item: TodoItem) => void;
  onConvertToKnowledge: () => void;
  onStatusFilterChange: (status: TodoStatus | "all") => void;
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
  const canSave =
    selectedId !== null &&
    draft.title.trim().length > 0 &&
    draft.content.trim().length > 0 &&
    !isSaving &&
    !isConvertingToKnowledge;

  return (
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(420px,1fr)_minmax(360px,0.78fr)]">
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

        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,240px)_auto]">
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
          <button
            className="mt-7 h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
            type="button"
            onClick={onClearFilters}
          >
            清空条件
          </button>
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
              <p className="text-sm text-slate-500">在录入工作台勾选待办事项后，这里会显示记录。</p>
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
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Pencil size={17} />
              Todo Detail
            </div>
            <h2 className="text-lg font-semibold text-slate-50">编辑待办事项</h2>
          </div>
          {isDetailLoading ? <Loader2 className="mt-1 animate-spin text-mint-300" size={17} /> : null}
        </div>

        {selectedId !== null ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="标题" icon={<Sparkles size={16} />}>
              <input
                className="control"
                maxLength={4000}
                value={draft.title}
                onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                placeholder="待办事项标题"
              />
            </Field>

            <Field label="内容" icon={<FileText size={16} />}>
              <textarea
                className="control min-h-[260px] resize-none leading-7"
                value={draft.content}
                onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
                placeholder="补充待办事项背景、验收标准或下一步动作。"
              />
            </Field>

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
              <div className="grid h-[46px] grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
                {(["待处理", "处理中", "已完成"] as TodoStatus[]).map((nextStatus) => {
                  const active = draft.todo_status === nextStatus;
                  return (
                    <button
                      key={nextStatus}
                      className={`min-w-0 rounded-md border px-2 text-sm font-medium transition ${
                        active
                          ? todoStatusStyles[nextStatus]
                          : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-200"
                      }`}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, todo_status: nextStatus })}
                    >
                      {nextStatus}
                    </button>
                  );
                })}
              </div>
            </Field>

            {saveError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                <span>{saveError}</span>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canSave}
                type="submit"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Pencil size={18} />}
                {isSaving ? "保存中" : "保存待办事项"}
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
      </aside>
    </div>
  );
}

function CurrentRecordsWorkspace({
  items,
  total,
  page,
  options,
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

  return (
    <div className="grid flex-1 gap-4 px-4 pb-4 pt-2 xl:grid-cols-[minmax(440px,1fr)_340px_320px]">
      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <ClipboardList size={17} />
              Current Queue
            </div>
            <h2 className="text-xl font-semibold text-slate-50">当前记录列表</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
            {total} 条匹配
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
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
              <option value="">全部用户</option>
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

        <div className="mb-4 grid grid-cols-[1fr_120px_auto] gap-3">
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
          <button
            className="mt-7 h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
            type="button"
            onClick={onClearFilters}
          >
            清空
          </button>
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

      <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <FilePlus2 size={17} />
            T_CURRENT
          </div>
          <h2 className="text-xl font-semibold text-slate-50">新增当前分类</h2>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="用户" icon={<ShieldCheck size={16} />}>
            <select
              className="control"
              disabled={isOptionsLoading}
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

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
            disabled={!canSubmit}
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {isSaving ? "写入中" : "新增到 T_CURRENT"}
          </button>
        </form>
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
    </div>
  );
}

function EnglishMaterialsWorkspace({
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

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
          <Field label="分类标识" icon={<Tags size={16} />}>
            <input
              className="control"
              maxLength={50}
              value={filters.category}
              onChange={(event) => onFilterChange({ category: event.target.value })}
              placeholder="按分类精确筛选"
            />
          </Field>
          <Field label="Flag" icon={<CircleGauge size={16} />}>
            <select
              className="control"
              value={filters.flag}
              onChange={(event) => onFilterChange({ flag: event.target.value as EnglishMaterialFilters["flag"] })}
            >
              <option value="">全部</option>
              <option value="0">0</option>
              <option value="1">1</option>
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
                <option value="flag">Flag</option>
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
          <button
            className="mt-7 h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
            type="button"
            onClick={onClearFilters}
          >
            清空
          </button>
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
                        <span>FLAG {item.flag}</span>
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
            <Field label="Flag" icon={<CircleGauge size={16} />}>
              <select
                className="control"
                value={draft.flag}
                onChange={(event) => onDraftChange({ ...draft, flag: event.target.value as EnglishMaterialDraft["flag"] })}
              >
                <option value="0">0</option>
                <option value="1">1</option>
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
            <span className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-mint-200">FLAG {draft.flag}</span>
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
                <Field label="Flag" icon={<CircleGauge size={16} />}>
                  <select
                    className="control"
                    value={draft.flag}
                    onChange={(event) => onDraftChange({ ...draft, flag: event.target.value as EnglishMaterialDraft["flag"] })}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
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

function HistoryAskPanel({
  answer,
  error,
  hasCopiedAnswer,
  isLoading,
  question,
  onCopyAnswer,
  onOpenHistory,
  onQuestionChange,
  onSubmit,
}: {
  answer: HistoryAskResponse | null;
  error: string | null;
  hasCopiedAnswer: boolean;
  isLoading: boolean;
  question: string;
  onCopyAnswer: () => void;
  onOpenHistory: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = question.trim().length >= 2 && !isLoading;
  const examples = [
    "总结最近30天关于“中信泰富”的工作记录。",
    "针对 alfred 的 W01 工作记录，统计 Level 3 的工作量。",
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200"
                      type="button"
                      onClick={onCopyAnswer}
                    >
                      {hasCopiedAnswer ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                      {hasCopiedAnswer ? "已复制" : "复制回答"}
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
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{answer.answer}</div>
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

function AiCodingWorkspace({
  codexError,
  isCodexRunning,
  isRestartingServices,
  liveErrorOutput,
  liveOutput,
  liveStatus,
  messages,
  prompt,
  archiveError,
  archiveLoadingId,
  restartConfirm,
  restartError,
  restartResponse,
  onArchiveMessage,
  onPromptChange,
  onRestartConfirmChange,
  onRestartServices,
  onSubmit,
}: {
  codexError: string | null;
  isCodexRunning: boolean;
  isRestartingServices: boolean;
  liveErrorOutput: string;
  liveOutput: string;
  liveStatus: string;
  messages: AiCodingMessage[];
  prompt: string;
  archiveError: string | null;
  archiveLoadingId: number | null;
  restartConfirm: string;
  restartError: string | null;
  restartResponse: SystemRestartResponse | null;
  onArchiveMessage: (message: AiCodingMessage) => void;
  onPromptChange: (value: string) => void;
  onRestartConfirmChange: (value: string) => void;
  onRestartServices: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const canRunCodex = prompt.trim().length >= 2 && !isCodexRunning;
  const canRestart = restartConfirm === "RESTART" && !isRestartingServices;

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <WandSparkles size={17} />
              Codex
            </div>
            <h2 className="text-xl font-semibold text-slate-50">AI 编程任务</h2>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <textarea
              className="control min-h-[170px] resize-none leading-7"
              disabled={isCodexRunning}
              maxLength={12000}
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="例如：请调整 AI 编程界面的移动端布局，并运行前端构建验证。"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-slate-500">
                Codex 会在当前项目目录内运行；需要重启服务时，请使用右侧人工确认按钮。
              </div>
              <button
                className="flex h-11 min-w-32 items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canRunCodex}
                type="submit"
              >
                {isCodexRunning ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                {isCodexRunning ? "执行中" : "提交任务"}
              </button>
            </div>
          </form>

          {codexError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{codexError}</span>
            </div>
          ) : null}

          {archiveError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
              <span>{archiveError}</span>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            {isCodexRunning ? (
              <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-sm text-mint-200">
                  <Loader2 className="animate-spin" size={17} />
                  <span>{liveStatus || "Codex 正在运行..."}</span>
                </div>
                <CodexOutputBlock
                  title="Live Output"
                  value={liveOutput || "等待 Codex 输出事件..."}
                />
                {liveErrorOutput ? (
                  <CodexOutputBlock title="Live Error Output" value={liveErrorOutput} tone="warning" />
                ) : null}
              </div>
            ) : messages.length === 0 ? (
              <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
                <div>
                  <Bot className="mx-auto mb-3 text-slate-600" size={36} />
                  <div className="mb-1 font-medium text-slate-300">等待编程任务</div>
                  <p className="text-sm text-slate-500">提交后会显示 Codex 输出、退出码和本次工作区变更。</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const resultText = message.response ? extractCodexResultText(message.response) : "";

                return (
                  <article key={message.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                    {message.response ? (
                      <CodexCompletionSummaryCard
                        isArchiving={archiveLoadingId === message.id}
                        message={message}
                        onArchive={() => onArchiveMessage(message)}
                      />
                    ) : null}

                    <div className="mb-3 rounded-lg border border-mint-300/15 bg-mint-300/8 p-3">
                      <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-mint-300/80">Prompt</div>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.prompt}</div>
                    </div>

                    {message.response ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-md border px-2 py-1 ${
                              message.response.exit_code === 0
                                ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                                : "border-red-400/25 bg-red-400/10 text-red-100"
                            }`}
                          >
                            exit {message.response.exit_code}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                            {message.response.duration_seconds}s
                          </span>
                        </div>

                        {resultText ? (
                          <CodexOutputBlock title="任务结论" value={resultText} />
                        ) : (
                          <CodexOutputBlock title="任务结论" value="未能从 Codex 输出中提取到可读结论，请展开调试日志查看原始输出。" />
                        )}
                        {message.response.error_output ? (
                          <CodexOutputBlock title="Error Output" value={message.response.error_output} tone="warning" />
                        ) : null}
                        <details className="rounded-lg border border-white/10 bg-black/15 p-3">
                          <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                            调试日志
                          </summary>
                          <div className="mt-3 space-y-3">
                            <CodexOutputBlock title="Raw Output" value={message.response.output || "Codex 未返回标准输出。"} />
                            <CodexOutputBlock title="Git Status" value={message.response.git_status || "工作区没有新增变更。"} />
                          </div>
                        </details>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <RefreshCw size={17} />
              Operations
            </div>
            <h2 className="text-lg font-semibold text-slate-50">服务重启</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-sm leading-6 text-amber-100/85">
              该操作会调用服务端 `scripts/restart-all.sh`，前端和后端会短暂不可用。
            </div>

            <Field label="确认文本" icon={<ShieldCheck size={16} />}>
              <input
                className="control"
                disabled={isRestartingServices}
                value={restartConfirm}
                onChange={(event) => onRestartConfirmChange(event.target.value)}
                placeholder="输入 RESTART"
              />
            </Field>

            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-4 text-sm font-medium text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={!canRestart}
              type="button"
              onClick={onRestartServices}
            >
              {isRestartingServices ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              {isRestartingServices ? "重启中" : "确认重启全部服务"}
            </button>

            {restartResponse ? (
              <div className="rounded-lg border border-mint-300/25 bg-mint-300/10 p-3 text-sm leading-6 text-mint-100">
                <div>{restartResponse.message}</div>
                <div className="mt-2 break-all text-xs text-mint-200/75">Log: {restartResponse.log_path}</div>
              </div>
            ) : null}

            {restartError ? (
              <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
                {restartError}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CodexOutputBlock({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "warning" ? "border-amberline/25 bg-amberline/10" : "border-white/10 bg-black/20"
      }`}
    >
      <div className={`mb-2 text-xs font-medium uppercase tracking-[0.18em] ${tone === "warning" ? "text-amberline" : "text-slate-500"}`}>
        {title}
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{value}</pre>
    </div>
  );
}

function CodexCompletionSummaryCard({
  isArchiving,
  message,
  onArchive,
}: {
  isArchiving: boolean;
  message: AiCodingMessage;
  onArchive: () => void;
}) {
  if (!message.response) return null;

  const summary = getCodexCompletionSummary(message.response);
  const success = message.response.exit_code === 0;
  const knowledgePreview = buildCodexKnowledgeDraft(message);
  const resultText = extractCodexResultText(message.response);

  return (
    <div
      className={`mb-3 rounded-lg border p-3 ${
        success ? "border-mint-300/25 bg-mint-300/10" : "border-red-400/25 bg-red-400/10"
      }`}
    >
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className={`mb-1 flex items-center gap-2 text-sm font-medium ${success ? "text-mint-100" : "text-red-100"}`}>
            {success ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}
            {success ? "任务已完成" : "任务执行结束，但返回非零退出码"}
          </div>
          <div className="text-xs leading-5 text-slate-400">
            exit {message.response.exit_code} · {message.response.duration_seconds}s · {summary.changedFiles.length} 个变更文件
          </div>
        </div>

        <button
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-500"
          disabled={isArchiving || Boolean(message.archivedKnowledgeId)}
          type="button"
          onClick={onArchive}
        >
          {isArchiving ? <Loader2 className="animate-spin" size={16} /> : <Archive size={16} />}
          {message.archivedKnowledgeId ? `已归档 #${message.archivedKnowledgeId}` : isArchiving ? "归档中" : "归档精简记录"}
        </button>
      </div>

      {resultText ? (
        <div className="mb-3 rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">任务结论</div>
          <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
            {resultText}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">重启判断</div>
          <div className={`text-sm leading-6 ${summary.restartRecommended ? "text-amber-100" : "text-slate-300"}`}>
            {summary.restartText}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">变更文件</div>
          {summary.changedFiles.length > 0 ? (
            <div className="space-y-1 text-xs leading-5 text-slate-300">
              {summary.changedFiles.slice(0, 6).map((file) => (
                <div key={file} className="truncate">
                  {file}
                </div>
              ))}
              {summary.changedFiles.length > 6 ? (
                <div className="text-slate-500">还有 {summary.changedFiles.length - 6} 个文件，见 Git Status。</div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-500">没有检测到工作区变更。</div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          <Archive size={14} />
          归档预览
        </div>
        <div className="mb-2 text-sm font-medium leading-6 text-slate-200">{knowledgePreview.question}</div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">
          {knowledgePreview.answer}
        </pre>
      </div>
    </div>
  );
}

function HistoryExplorer({
  items,
  total,
  page,
  summary,
  isLoading,
  loadError,
  filters,
  onFilterChange,
  onClearFilters,
  onPageChange,
}: {
  items: HistoryItem[];
  total: number;
  page: number;
  summary: HistorySummary;
  isLoading: boolean;
  loadError: string | null;
  filters: HistoryFilters;
  onFilterChange: (filters: Partial<HistoryFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * HISTORY_PAGE_SIZE, total);
  const historyTypeOptions = filters.username ? summary.user_types[filters.username] ?? [] : summary.types;

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
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
                value={filters.username}
                onChange={(event) => {
                  const username = event.target.value;
                  const nextTypeOptions = username ? summary.user_types[username] ?? [] : summary.types;
                  onFilterChange({
                    username,
                    type: filters.type && !nextTypeOptions.includes(filters.type) ? "" : filters.type,
                  });
                }}
              >
                <option value="">全部用户</option>
                {summary.users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="类型" icon={<Layers3 size={16} />}>
              <select
                className="control"
                value={filters.type}
                onChange={(event) => onFilterChange({ type: event.target.value })}
              >
                <option value="">全部类型</option>
                {historyTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Week" icon={<CalendarClock size={16} />}>
                <input
                  className="control"
                  value={filters.week}
                  onChange={(event) => onFilterChange({ week: event.target.value })}
                  placeholder="如 2026-W01"
                />
              </Field>
              <Field label="Day" icon={<CalendarClock size={16} />}>
                <input
                  className="control"
                  value={filters.day}
                  onChange={(event) => onFilterChange({ day: event.target.value })}
                  placeholder="如 Monday"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="开始日期" icon={<CalendarClock size={16} />}>
                <input
                  className="control history-date-control"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => onFilterChange({ dateFrom: event.target.value })}
                />
              </Field>
              <Field label="结束日期" icon={<CalendarClock size={16} />}>
                <input
                  className="control history-date-control"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => onFilterChange({ dateTo: event.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="等级" icon={<CircleGauge size={16} />}>
                <input
                  className="control"
                  inputMode="numeric"
                  value={filters.learnLevel}
                  onChange={(event) => onFilterChange({ learnLevel: event.target.value.replace(/\D/g, "") })}
                  placeholder="全部"
                />
              </Field>
              <Field label="向量状态" icon={<Database size={16} />}>
                <select
                  className="control"
                  value={filters.vectorStatus}
                  onChange={(event) => onFilterChange({ vectorStatus: event.target.value as HistoryFilters["vectorStatus"] })}
                >
                  <option value="all">全部</option>
                  <option value="1">待更新</option>
                  <option value="0">已就绪</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="排序字段" icon={<ChartLine size={16} />}>
                <select
                  className="control"
                  value={filters.sortBy}
                  onChange={(event) => onFilterChange({ sortBy: event.target.value as HistoryFilters["sortBy"] })}
                >
                  <option value="history_date">历史日期</option>
                  <option value="id">ID</option>
                  <option value="type">类型</option>
                  <option value="username">用户</option>
                  <option value="learn_level">等级</option>
                </select>
              </Field>
              <Field label="方向" icon={<ChartLine size={16} />}>
                <select
                  className="control"
                  value={filters.sortDir}
                  onChange={(event) => onFilterChange({ sortDir: event.target.value as HistoryFilters["sortDir"] })}
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </Field>
            </div>

            <button
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
              type="button"
              onClick={onClearFilters}
            >
              清空条件
            </button>
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <History size={17} />
                T_HISTORY
              </div>
              <h2 className="text-xl font-semibold text-slate-50">历史记录</h2>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
              {total} 条匹配
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <MetricTile icon={<Database size={17} />} label="总量" value={formatAmount(summary.total)} detail="当前查询结果" />
            <MetricTile icon={<Layers3 size={17} />} label="类型" value={formatAmount(summary.types.length)} detail="可筛选类型" />
            <MetricTile icon={<ShieldCheck size={17} />} label="用户" value={formatAmount(summary.users.length)} detail="可筛选用户" />
            <MetricTile
              icon={<CalendarClock size={17} />}
              label="日期范围"
              value={formatDateOnly(summary.max_date)}
              detail={`起始 ${formatDateOnly(summary.min_date)}`}
            />
          </div>

          {isLoading ? (
            <LoadingStack />
          ) : loadError ? (
            <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
                <TriangleAlert size={16} />
                历史查询失败
              </div>
              <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
              <div>
                <History className="mx-auto mb-3 text-slate-600" size={36} />
                <div className="mb-1 font-medium text-slate-300">没有匹配的历史记录</div>
                <p className="text-sm text-slate-500">调整关键词、日期或筛选条件后再查询。</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>#{item.id}</span>
                        <span>{formatHistoryDate(item.history_date)}</span>
                        <span>{item.username || "unknown user"}</span>
                        <span>{item.week || "week -"}</span>
                        <span>{item.day || "day -"}</span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.content || "无内容"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                      <span className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-200">
                        {item.type || "未分类"}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">
                        Level {item.learn_level ?? "-"}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs ${
                          item.v_needs_update === 1
                            ? "border-amberline/30 bg-amberline/10 text-amberline"
                            : "border-mint-300/20 bg-mint-300/8 text-mint-200"
                        }`}
                      >
                        {item.v_needs_update === 1 ? "向量待更新" : "向量就绪"}
                      </span>
                    </div>
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
      </div>
    </div>
  );
}

function LlmUsageDashboard({
  items,
  total,
  isLoading,
  isRefreshing,
  loadError,
  onRefresh,
}: {
  items: LlmUsageSample[];
  total: number;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  onRefresh: () => void;
}) {
  const latest = items.length > 0 ? items[items.length - 1] : null;
  const usagePercent = latest ? clampPercent((latest.used_amount / latest.total_budget) * 100) : 0;
  const remainingPercent = latest ? clampPercent((latest.remaining_budget / latest.total_budget) * 100) : 0;
  const hasRemainingBudget = latest ? latest.remaining_budget > 0 : false;
  const resetAt = latest ? parseUtcDate(latest.next_reset_at) : null;
  const readyAt = getResetReadyAt(resetAt);
  const sampleWindow =
    items.length > 0
      ? `${formatDateTime(items[0].sample_time)} - ${formatDateTime(items[items.length - 1]?.sample_time ?? null)}`
      : "暂无采样";
  const recentItems = collapseStableUsageSamples(items).slice(-8).reverse();
  const trendItems = items.slice(-36);
  const trendPercents = trendItems.map(getUsagePercent);
  const minTrendPercent = trendPercents.length > 0 ? Math.min(...trendPercents) : 0;
  const maxTrendPercent = trendPercents.length > 0 ? Math.max(...trendPercents) : 0;
  const trendRange = maxTrendPercent - minTrendPercent;
  const trendChanged = trendRange > 0.000001;
  const latestTrendPercent = trendPercents[trendPercents.length - 1] ?? usagePercent;
  const trendScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = trendScrollRef.current;
    if (!element) return;
    element.scrollLeft = element.scrollWidth;
  }, [trendItems.length, latest?.sample_time]);

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
            <LoadingStack />
          </section>
          <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
            <LoadingStack />
          </aside>
        </div>
      ) : loadError ? (
        <section className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
            <TriangleAlert size={16} />
            用量视图读取失败
          </div>
          <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
        </section>
      ) : !latest ? (
        <section className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
          <div>
            <Bot className="mx-auto mb-3 text-slate-600" size={36} />
            <div className="mb-1 font-medium text-slate-300">暂无 LLM 用量采样</div>
            <p className="text-sm text-slate-500">`v_llm_usage` 当前没有可展示的数据。</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                  <ChartLine size={17} />
                  Usage Overview
                </div>
                <h2 className="text-xl font-semibold text-slate-50">当前周期用量</h2>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
                {total} 个采样点
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile
                icon={<CircleGauge size={17} />}
                label="已使用"
                value={formatAmount(latest.used_amount)}
                detail={`${formatPercent(usagePercent)} / ${formatAmount(latest.total_budget)}`}
              />
              <MetricTile
                icon={<Database size={17} />}
                label="剩余额度"
                value={formatAmount(latest.remaining_budget)}
                detail={`${formatPercent(remainingPercent)} 可用`}
              />
              <MetricTile
                icon={<CalendarClock size={17} />}
                label={hasRemainingBudget ? "本周期状态" : "下个周期可用"}
                value={hasRemainingBudget ? "可用中" : formatResetDate(readyAt)}
                detail={
                  hasRemainingBudget
                    ? `${formatAmount(latest.remaining_budget)} 额度剩余`
                    : formatResetDistance(readyAt, "可用")
                }
              />
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.028] p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm font-medium text-slate-200">预算消耗</div>
                <div className="text-sm text-slate-400">{formatPercent(usagePercent)}</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-mint-300 transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>采样窗口：{sampleWindow}</span>
                <span>周期：{latest.budget_duration ?? "未记录"}</span>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                    <ChartLine size={16} />
                    最近趋势
                    {!trendChanged ? (
                      <span className="text-xs font-normal text-slate-500">
                        {latestTrendPercent > 0 ? `稳定在 ${formatPercent(latestTrendPercent)}` : "用量暂无变化"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-mint-200">
                      当前 {formatPercent(latestTrendPercent)}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                      峰值 {formatPercent(maxTrendPercent)}
                    </span>
                  </div>
                </div>
                <button
                  className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300 transition hover:border-mint-300/30 hover:bg-white/[0.055] hover:text-mint-300 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  title="刷新用量采样"
                  disabled={isRefreshing}
                  onClick={onRefresh}
                >
                  <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={15} />
                  <span>刷新</span>
                </button>
              </div>
              <div className="grid h-48 grid-cols-[38px_minmax(0,1fr)] gap-2 overflow-hidden rounded-lg border border-white/8 bg-ink-950/36 px-3 py-4">
                <div className="relative h-full text-[11px] text-slate-600">
                  {[100, 80, 60, 40, 20].map((tick) => (
                    <span
                      key={tick}
                      className="absolute right-0 translate-y-1/2 tabular-nums"
                      style={{ bottom: `${tick}%` }}
                    >
                      {tick}%
                    </span>
                  ))}
                </div>
                <div className="relative h-full min-w-0">
                  {[20, 40, 60, 80, 100].map((tick) => (
                    <div
                      key={tick}
                      className={`absolute inset-x-0 border-t ${tick === 100 ? "border-mint-300/35" : "border-white/8"}`}
                      style={{ bottom: `${tick}%` }}
                    />
                  ))}
                  <div
                    ref={trendScrollRef}
                    className="relative z-10 flex h-full items-end gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {trendItems.map((item) => {
                      const percent = getUsagePercent(item);
                      const trendHeight = getTrendBarHeight(percent);
                      return (
                        <div key={item.sample_time} className="flex h-full min-w-4 flex-[0_0_14px] flex-col justify-end sm:flex-1">
                          <div
                            className="w-full rounded-t border border-mint-300/20 bg-mint-300/70 transition-all duration-300"
                            style={{ height: `${trendHeight}%` }}
                            title={`${formatDateTime(item.sample_time)} · ${formatPercent(percent)} · ${formatAmount(item.used_amount)} used`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{formatTimeOnly(trendItems[0]?.sample_time ?? null)}</span>
                <span>
                  {trendChanged
                    ? `${formatPercent(minTrendPercent)} - ${formatPercent(maxTrendPercent)}`
                    : `当前 ${formatPercent(usagePercent)}`}
                </span>
                <span>{formatTimeOnly(trendItems[trendItems.length - 1]?.sample_time ?? null)}</span>
              </div>
            </div>
          </section>

          <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Bot size={17} />
                Reset Tracking
              </div>
              <h2 className="text-lg font-semibold text-slate-50">重置时间</h2>
            </div>

            <div className="mb-4 rounded-lg border border-mint-300/20 bg-mint-300/8 p-4">
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-mint-300/70">NEXT_RESET_AT</div>
              <div className="text-lg font-semibold leading-7 text-mint-100">
                {formatResetDate(resetAt)}
              </div>
              <div className="mt-2 text-sm text-mint-100/75">UTC 换算 · Asia/Shanghai</div>
            </div>

            {hasRemainingBudget ? (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">CURRENT_CYCLE</div>
                <div className="text-lg font-semibold leading-7 text-slate-100">可用中</div>
                <div className="mt-2 text-sm text-slate-500">
                  当前周期仍有 {formatAmount(latest.remaining_budget)} 额度，无需等待下个周期。
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">NEXT_CYCLE_READY</div>
                <div className="text-lg font-semibold leading-7 text-slate-100">
                  {formatResetDate(readyAt)}
                </div>
                <div className="mt-2 text-sm text-slate-500">{formatResetDistance(readyAt, "可用")}</div>
              </div>
            )}

            <div className="space-y-3">
              {recentItems.map((item) => {
                const percent = clampPercent((item.used_amount / item.total_budget) * 100);
                return (
                  <div key={item.sample_time} className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-200">{formatPercent(percent)}</span>
                      <span className="text-right text-xs text-slate-500">{formatUsagePeriod(item)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-mint-300/80" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {formatAmount(item.used_amount)} used · {formatAmount(item.remaining_budget)} left
                      {item.sample_count > 1 ? ` · 合并 ${item.sample_count} 个采样` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
        <span className="text-mint-300">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
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

function LoadingStack() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent animate-scan" />
          <div className="mb-4 h-4 w-2/3 rounded bg-white/10" />
          <div className="mb-3 h-3 w-full rounded bg-white/7" />
          <div className="h-3 w-1/2 rounded bg-white/7" />
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "created date pending";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatHistoryDate(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
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

function formatTimeOnly(value: string | null) {
  if (!value) return "--:--";
  const date = parseServerLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatResetDate(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatResetDistance(value: Date | null, action = "重置") {
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

function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHistoryAskVectorStatus(value: number | null | undefined) {
  if (value === 1) return "待更新";
  if (value === 0) return "已就绪";
  return "";
}

function readHistoryAskVectorStatus(value: number | null | undefined): HistoryVectorStatus {
  if (value === 1) return "1";
  if (value === 0) return "0";
  return "all";
}

function getHistoryAskFilterEntries(filters: HistoryAskResponse["filters"]) {
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getUsagePercent(item: LlmUsageSample) {
  return clampPercent((item.used_amount / item.total_budget) * 100);
}

function getTrendBarHeight(percent: number) {
  if (percent <= 0) return 0;
  return Math.max(4, percent);
}

function parseServerLocalDate(value: string | null) {
  if (!value) return null;
  return new Date(value.replace(" ", "T"));
}

function parseUtcDate(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return new Date(hasTimeZone ? normalized : `${normalized}Z`);
}

function getResetReadyAt(resetAt: Date | null) {
  if (!resetAt || Number.isNaN(resetAt.getTime())) return null;
  return new Date(resetAt.getTime() + RESET_READY_DELAY_MS);
}

function collapseStableUsageSamples(items: LlmUsageSample[]): UsageChangeItem[] {
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

function formatUsagePeriod(item: UsageChangeItem) {
  if (item.sample_count <= 1 || item.period_start === item.period_end) return formatTimeOnly(item.sample_time);
  return `${formatTimeOnly(item.period_start)} - ${formatTimeOnly(item.period_end)}`;
}

function maskSensitive(value: string) {
  return value.replace(/(密码|password|token|secret|密钥|账号)(\s*[:：]?\s*)\S+/gi, "$1$2••••••");
}

function readWeChatApiKeyFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("wechat_api_key");
}

function readWeChatErrorFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("wechat_error");
}

function clearLocationHash() {
  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
}

async function copyText(value: string) {
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

function buildBlogSkillTask(item: KnowledgeItem) {
  const tags = item.topic_tag?.trim() || "未标注";
  const source = item.source?.trim() || "未填写";
  const createdDate = item.created_date ? new Date(item.created_date).toISOString() : "未记录";

  return `请使用 blog skill，把下面这条可信知识加工成一篇适合技术初学者阅读的中文技术博客。

硬性要求：
- 只允许基于 Context 中给出的事实写作，不要补充未提供的版本、案例、数字或结论。
- 输出纯 Markdown，全文不超过 1500 个中文字符。
- 使用“笔者”作为第一人称，不要使用“我”“我们”“本人”。
- 标题使用一级标题；二级标题使用“## 01 | 标题内容”的格式。
- 结尾必须单独一段写：关注我，和AI一起成长~

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

function buildMergedKnowledgeDraft(items: KnowledgeItem[]): KnowledgeDraft {
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

function buildWeekOptions(): CurrentWeek[] {
  return Array.from({ length: 48 }, (_, index) => `W${index + 1}` as CurrentWeek);
}

function buildDayOptions(): CurrentDay[] {
  return Array.from({ length: 7 }, (_, index) => `D${index + 1}` as CurrentDay);
}

function getNextWeek(value: CurrentWeek): CurrentWeek {
  const index = Number(value.replace("W", ""));
  if (!Number.isFinite(index) || index >= 48) return "W1";
  return `W${index + 1}` as CurrentWeek;
}

function compactUnique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return false;
    seen.add(normalized.toLowerCase());
    return true;
  });
}

function truncateField(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function isSafeTopicTag(value: string) {
  return /^[a-zA-Z0-9_]+$/.test(value);
}

function itemToDraft(item: KnowledgeItem): KnowledgeDraft {
  return {
    question: item.question,
    answer: item.answer,
    source: item.source ?? "",
    topic_tag: item.topic_tag ?? "",
    blog_status: item.blog_status,
  };
}

function todoItemToDraft(item: TodoItem): TodoDraft {
  return {
    title: item.title,
    content: item.content,
    source: item.source ?? "",
    topic_tag: item.topic_tag ?? "",
    todo_status: item.todo_status,
  };
}

function readStoredNewDraft(): KnowledgeDraft | null {
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

function clearStoredNewDraft() {
  window.localStorage.removeItem(NEW_KNOWLEDGE_DRAFT_STORAGE_KEY);
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

function readStoredUiState(): StoredUiState {
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
    const workbenchDraft = readKnowledgeDraft(workbench.draft);
    const todoDraft = readTodoDraft(todos.draft);
    const currentRecordDraft = readRecord(currentRecords.draft);
    const englishMaterialDraft = readEnglishMaterialDraft(englishMaterials.draft);

    return {
      activeView: readAppView(stored.activeView, defaults.activeView),
      sidebarExpanded: typeof stored.sidebarExpanded === "boolean" ? stored.sidebarExpanded : defaults.sidebarExpanded,
      workbench: {
        query: readString(workbench.query),
        statusFilter: readKnowledgeStatusFilter(workbench.statusFilter, defaults.workbench.statusFilter),
        page: readPositiveInteger(workbench.page, defaults.workbench.page),
        selectedId: readNullablePositiveInteger(workbench.selectedId),
        draft: workbenchDraft && !isEmptyDraft(workbenchDraft) ? workbenchDraft : null,
      },
      factory: {
        query: readString(factory.query),
        page: readPositiveInteger(factory.page, defaults.factory.page),
        selectedId: readNullablePositiveInteger(factory.selectedId),
        task: readString(factory.task),
      },
      blogFactory: {
        query: readString(blogFactory.query),
        page: readPositiveInteger(blogFactory.page, defaults.blogFactory.page),
        status: readBlogFactoryStatusFilter(blogFactory.status, defaults.blogFactory.status),
        topic: readString(blogFactory.topic),
        knowledgeId: readString(blogFactory.knowledgeId).replace(/\D/g, ""),
        sortBy: readStringUnion(blogFactory.sortBy, BLOG_FACTORY_SORT_FIELDS, defaults.blogFactory.sortBy),
        sortDir: readStringUnion(blogFactory.sortDir, SORT_DIRECTIONS, defaults.blogFactory.sortDir),
        selectedItemId: readNullablePositiveInteger(blogFactory.selectedItemId),
        articleDraft: readString(blogFactory.articleDraft),
        articlePathDraft: readString(blogFactory.articlePathDraft),
      },
      todos: {
        query: readString(todos.query),
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
      },
    };
  } catch {
    clearStoredUiState();
    return buildDefaultUiState();
  }
}

function writeStoredUiState(state: StoredUiState) {
  try {
    window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private mode or under quota pressure.
  }
}

function clearStoredUiState() {
  window.localStorage.removeItem(UI_STATE_STORAGE_KEY);
}

function buildDefaultUiState(): StoredUiState {
  return {
    activeView: "workbench",
    sidebarExpanded: false,
    workbench: {
      query: "",
      statusFilter: "all",
      page: 1,
      selectedId: null,
      draft: null,
    },
    factory: {
      query: "",
      page: 1,
      selectedId: null,
      task: "",
    },
    blogFactory: {
      query: "",
      page: 1,
      status: "all",
      topic: "",
      knowledgeId: "",
      sortBy: "copied_at",
      sortDir: "desc",
      selectedItemId: null,
      articleDraft: "",
      articlePathDraft: "",
    },
    todos: {
      query: "",
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
    },
  };
}

function readKnowledgeDraft(value: unknown): KnowledgeDraft | null {
  const draft = readRecord(value);
  const nextDraft: KnowledgeDraft = {
    question: readString(draft.question),
    answer: readString(draft.answer),
    source: readString(draft.source),
    topic_tag: readString(draft.topic_tag),
    blog_status: isKnowledgeStatus(draft.blog_status) ? draft.blog_status : "未发布",
  };

  return nextDraft;
}

function readTodoDraft(value: unknown): TodoDraft | null {
  const draft = readRecord(value);
  const nextDraft: TodoDraft = {
    title: readString(draft.title),
    content: readString(draft.content),
    source: readString(draft.source),
    topic_tag: readString(draft.topic_tag),
    todo_status: isTodoStatus(draft.todo_status) ? draft.todo_status : "待处理",
  };

  return nextDraft;
}

function readEnglishMaterialDraft(value: unknown): EnglishMaterialDraft {
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

function englishMaterialItemToDraft(item: EnglishMaterialItem): EnglishMaterialDraft {
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
  return value as unknown as HistoryAskResponse;
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

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyDraft(draft: KnowledgeDraft) {
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

async function waitForBackendRecovery() {
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

function appendLogLine(current: string, line: string) {
  return current ? `${current}\n${line}` : line;
}

function buildCodexKnowledgeDraft(message: AiCodingMessage): KnowledgeDraft {
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

function extractCodexResultText(response: CodexRunResponse) {
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

function getCodexCompletionSummary(response: CodexRunResponse) {
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

export default App;
