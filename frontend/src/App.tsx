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
import { createKnowledge, deleteKnowledge, fetchKnowledge, getKnowledge, updateKnowledge } from "./api/knowledge";
import { fetchHistory } from "./api/history";
import { askHistory } from "./api/historyAsk";
import { fetchLlmUsage } from "./api/usage";
import type {
  AppView,
  HistoryAskResponse,
  HistoryItem,
  HistorySummary,
  KnowledgeDraft,
  KnowledgeItem,
  KnowledgeStatus,
  LlmUsageSample,
} from "./types";

const emptyDraft: KnowledgeDraft = {
  question: "",
  answer: "",
  source: "",
  topic_tag: "",
  blog_status: "未发布",
};

const PAGE_SIZE = 5;
const FACTORY_PAGE_SIZE = 6;
const HISTORY_PAGE_SIZE = 10;
const USAGE_SAMPLE_LIMIT = 72;
const RESET_SOURCE_TIME_ZONE = "UTC";
const RESET_DISPLAY_TIME_ZONE = "Asia/Shanghai";
const RESET_READY_DELAY_MS = 60 * 60 * 1000;
const NEW_KNOWLEDGE_DRAFT_STORAGE_KEY = "trustedKnowledge.newDraft";

interface UsageChangeItem extends LlmUsageSample {
  period_start: string;
  period_end: string;
  sample_count: number;
}

const statusStyles: Record<KnowledgeStatus, string> = {
  未发布: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  已发布: "border-mint-300/30 bg-mint-300/10 text-mint-300",
  跳过: "border-amberline/30 bg-amberline/10 text-amberline",
};

function App() {
  const [apiKey, setApiKey] = useState(() => {
    const wechatApiKey = readWeChatApiKeyFromHash();
    if (wechatApiKey) {
      persistApiKey(wechatApiKey);
      clearLocationHash();
      return wechatApiKey;
    }

    return readStoredApiKey();
  });
  const [activeView, setActiveView] = useState<AppView>("workbench");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [draft, setDraft] = useState<KnowledgeDraft>(() => readStoredNewDraft() ?? emptyDraft);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [factoryItems, setFactoryItems] = useState<KnowledgeItem[]>([]);
  const [factoryTotalItems, setFactoryTotalItems] = useState(0);
  const [factoryPage, setFactoryPage] = useState(1);
  const [factoryQuery, setFactoryQuery] = useState("");
  const [debouncedFactoryQuery, setDebouncedFactoryQuery] = useState("");
  const [factorySelectedId, setFactorySelectedId] = useState<number | null>(null);
  const [factoryTask, setFactoryTask] = useState("");
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [isFactoryLoading, setIsFactoryLoading] = useState(false);
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(false);
  const [hasCopiedFactoryTask, setHasCopiedFactoryTask] = useState(false);
  const [factoryCopyError, setFactoryCopyError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySummary, setHistorySummary] = useState<HistorySummary>({
    total: 0,
    types: [],
    users: [],
    min_date: null,
    max_date: null,
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyQuery, setHistoryQuery] = useState("");
  const [debouncedHistoryQuery, setDebouncedHistoryQuery] = useState("");
  const [historyType, setHistoryType] = useState("");
  const [historyUsername, setHistoryUsername] = useState("");
  const [historyWeek, setHistoryWeek] = useState("");
  const [historyDay, setHistoryDay] = useState("");
  const [historyLearnLevel, setHistoryLearnLevel] = useState("");
  const [historyVectorStatus, setHistoryVectorStatus] = useState<"all" | "0" | "1">("all");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historySortBy, setHistorySortBy] = useState<"history_date" | "id" | "type" | "username" | "learn_level">(
    "history_date",
  );
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyAskQuestion, setHistoryAskQuestion] = useState("");
  const [historyAskAnswer, setHistoryAskAnswer] = useState<HistoryAskResponse | null>(null);
  const [historyAskError, setHistoryAskError] = useState<string | null>(null);
  const [isHistoryAsking, setIsHistoryAsking] = useState(false);
  const [usageItems, setUsageItems] = useState<LlmUsageSample[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [isUsageRefreshing, setIsUsageRefreshing] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);

  useEffect(() => {
    const handleUnauthorized = () => {
      setApiKey(null);
      setItems([]);
      setSelectedId(null);
      setUsageItems([]);
      setUsageTotal(0);
      setHistoryItems([]);
      setHistoryTotal(0);
      setHistoryAskAnswer(null);
    };

    window.addEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
  }, []);

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

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, query]);

  useEffect(() => {
    if (!apiKey) return;

    let mounted = true;

    setIsLoading(true);
    fetchKnowledge({
      query: debouncedQuery,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
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

    const timer = window.setTimeout(() => {
      setDebouncedFactoryQuery(factoryQuery.trim());
      setFactoryPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, factoryQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "factory") return;

    let mounted = true;
    setIsFactoryLoading(true);
    fetchKnowledge({
      query: debouncedFactoryQuery,
      limit: FACTORY_PAGE_SIZE,
      offset: (factoryPage - 1) * FACTORY_PAGE_SIZE,
      status: "未发布",
    })
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
  }, [activeView, apiKey, debouncedFactoryQuery, factoryPage]);

  useEffect(() => {
    if (!apiKey) return;

    const timer = window.setTimeout(() => {
      setDebouncedHistoryQuery(historyQuery.trim());
      setHistoryPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [apiKey, historyQuery]);

  useEffect(() => {
    if (!apiKey || activeView !== "history") return;

    let mounted = true;
    setIsHistoryLoading(true);
    fetchHistory({
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
    })
      .then((data) => {
        if (!mounted) return;
        setHistoryItems(data.items);
        setHistoryTotal(data.total);
        setHistorySummary(data.summary);
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

    if (refreshOnly) {
      setIsUsageRefreshing(true);
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

  function handleNewEntry() {
    setSelectedId(null);
    setDraft(readStoredNewDraft() ?? emptyDraft);
    setSaveError(null);
  }

  function handleLogin(nextApiKey: string) {
    persistApiKey(nextApiKey);
    setApiKey(nextApiKey);
    setPage(1);
    setDebouncedQuery("");
    setQuery("");
    setSelectedId(null);
    setDraft(readStoredNewDraft() ?? emptyDraft);
  }

  function handleLogout() {
    clearStoredApiKey();
    clearStoredNewDraft();
    setApiKey(null);
    setItems([]);
    setSelectedId(null);
    setDraft(emptyDraft);
    setFactoryItems([]);
    setFactorySelectedId(null);
    setFactoryTask("");
    setUsageItems([]);
    setUsageTotal(0);
    setHistoryItems([]);
    setHistoryTotal(0);
    setHistoryAskAnswer(null);
    setHistoryAskQuestion("");
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
    if (!factoryTask) return;

    try {
      await copyText(factoryTask);
      setFactoryCopyError(null);
      setHasCopiedFactoryTask(true);
      window.setTimeout(() => setHasCopiedFactoryTask(false), 1600);
    } catch {
      setHasCopiedFactoryTask(false);
      setFactoryCopyError("复制失败。请选中文本框内容后手动复制。");
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
    try {
      const answer = await askHistory(question);
      setHistoryAskAnswer(answer);
    } catch (error) {
      setHistoryAskError(error instanceof Error ? error.message : "AI 问数失败，请稍后重试。");
    } finally {
      setIsHistoryAsking(false);
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
        : activeView === "history"
          ? "历史记录查询"
          : activeView === "historyAsk"
            ? "AI 问数"
            : "LLM 使用情况";
  const viewSubtitle =
    activeView === "workbench"
      ? "Trusted Knowledge"
      : activeView === "factory"
        ? "Blog Factory"
        : activeView === "history"
          ? "History Explorer"
          : activeView === "historyAsk"
            ? "Ask History"
            : "AI Usage";

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(125,211,199,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_22%)]" />
      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[76px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <section className="flex min-w-0 flex-col">
          <Topbar
            activeView={activeView}
            query={activeView === "workbench" ? query : activeView === "factory" ? factoryQuery : activeView === "history" ? historyQuery : ""}
            statusFilter={activeView === "workbench" ? statusFilter : undefined}
            title={viewTitle}
            subtitle={viewSubtitle}
            onLogout={handleLogout}
            onQueryChange={activeView === "factory" ? setFactoryQuery : activeView === "history" ? setHistoryQuery : setQuery}
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
              isLoading={isHistoryAsking}
              question={historyAskQuestion}
              onQuestionChange={setHistoryAskQuestion}
              onSubmit={handleAskHistory}
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
                isDetailLoading={isDetailLoading}
                saveError={saveError}
                trustScore={trustScore}
                hasSensitiveSignal={hasSensitiveSignal}
                onDraftChange={setDraft}
                onDelete={handleRequestDelete}
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
              copyError={factoryCopyError}
              onCopyTask={handleCopyFactoryTask}
              onGenerateTask={handleGenerateFactoryTask}
              onPageChange={setFactoryPage}
              onSelect={(item) => {
                setFactorySelectedId(item.id);
                setFactoryTask("");
                setHasCopiedFactoryTask(false);
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
    </main>
  );
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}) {
  type SidebarItem = {
    icon: typeof BookOpenCheck;
    label: string;
    view?: AppView;
  };

  const items: SidebarItem[] = [
    { icon: BookOpenCheck, label: "录入工作台", view: "workbench" as const },
    { icon: FlaskConical, label: "知识加工厂", view: "factory" as const },
    { icon: History, label: "历史查询", view: "history" as const },
    { icon: Bot, label: "AI 问数", view: "historyAsk" as const },
    { icon: ShieldCheck, label: "Review" },
    { icon: Database, label: "Sources" },
  ];

  const usageActive = activeView === "usage";

  return (
    <aside className="hidden border-r border-white/8 bg-ink-900/78 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col lg:items-center">
      <div className="mb-8 grid h-10 w-10 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300 shadow-soft-glow">
        <Layers3 size={19} />
      </div>
      <nav className="flex flex-1 flex-col gap-3">
        {items.map((item) => {
          const active = "view" in item && item.view === activeView;
          return (
          <button
            key={item.label}
            className={`grid h-11 w-11 place-items-center rounded-lg border transition ${
              active
                ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
                : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200"
            }`}
            title={item.label}
            type="button"
            onClick={() => {
              if (item.view) onViewChange(item.view);
            }}
          >
            <item.icon size={19} />
          </button>
          );
        })}
      </nav>
      <button
        className={`grid h-10 w-10 place-items-center rounded-lg border text-xs font-semibold transition ${
          usageActive
            ? "border-mint-300/25 bg-mint-300/10 text-mint-300"
            : "border-white/10 text-slate-300 hover:border-mint-300/30 hover:bg-white/[0.04] hover:text-mint-300"
        }`}
        title="LLM 使用情况"
        type="button"
        aria-current={usageActive ? "page" : undefined}
        onClick={() => onViewChange("usage")}
      >
        AI
      </button>
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
  const mobileNavItems = [
    { icon: BookOpenCheck, label: "录入工作台", view: "workbench" as const },
    { icon: FlaskConical, label: "知识加工厂", view: "factory" as const },
    { icon: History, label: "历史查询", view: "history" as const },
    { icon: Bot, label: "AI 问数", view: "historyAsk" as const },
    { icon: Bot, label: "AI 用量", view: "usage" as const },
  ];
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
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:hidden" aria-label="功能页面">
        {mobileNavItems.map((item) => {
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
        {activeView !== "usage" && activeView !== "historyAsk" ? (
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-slate-400 md:w-80">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder={activeView === "history" ? "搜索历史内容" : "搜索问题、来源或标签"}
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

function KnowledgeForm({
  draft,
  mode,
  selectedId,
  isSaving,
  isDeleting,
  isDetailLoading,
  saveError,
  trustScore,
  hasSensitiveSignal,
  onDraftChange,
  onDelete,
  onNewEntry,
  onSubmit,
}: {
  draft: KnowledgeDraft;
  mode: "create" | "edit";
  selectedId: number | null;
  isSaving: boolean;
  isDeleting: boolean;
  isDetailLoading: boolean;
  saveError: string | null;
  trustScore: number;
  hasSensitiveSignal: boolean;
  onDraftChange: (draft: KnowledgeDraft) => void;
  onDelete: () => void;
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

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_220px]">
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
          <Field label="状态" icon={<CheckCircle2 size={16} />}>
            <StatusSegmentedControl
              value={draft.blog_status}
              onChange={(blog_status) => onDraftChange({ ...draft, blog_status })}
            />
          </Field>
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

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            disabled={!canSubmit || isDeleting}
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
                : "提交到知识库"}
          </button>

          {isEditing ? (
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-400/10 px-4 font-medium text-red-200 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
              disabled={isDeleting || isSaving}
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
    <label className="block">
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
  copyError,
  onCopyTask,
  onGenerateTask,
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
  copyError: string | null;
  onCopyTask: () => void;
  onGenerateTask: (item: KnowledgeItem) => void;
  onPageChange: (page: number) => void;
  onSelect: (item: KnowledgeItem) => void;
}) {
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

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
            {items.map((item) => (
              <button
                key={item.id}
                className={`block w-full rounded-lg border bg-white/[0.028] p-4 text-left transition ${
                  selectedId === item.id
                    ? "border-mint-300/45 bg-mint-300/[0.055]"
                    : "border-white/10 hover:border-white/18"
                }`}
                type="button"
                onClick={() => onSelect(item)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-6 text-slate-50">
                    {item.question}
                  </h3>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyles[item.blog_status]}`}>
                    {item.blog_status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>#{item.id}</span>
                  <span>{item.source || "unknown source"}</span>
                  <span>{formatDate(item.created_date)}</span>
                </div>
              </button>
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
            disabled={!task}
            title={hasCopied ? "已复制" : "复制加工任务"}
            type="button"
            onClick={onCopyTask}
          >
            {hasCopied ? <ClipboardCheck size={17} /> : <Copy size={17} />}
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

function HistoryAskPanel({
  answer,
  error,
  isLoading,
  question,
  onQuestionChange,
  onSubmit,
}: {
  answer: HistoryAskResponse | null;
  error: string | null;
  isLoading: boolean;
  question: string;
  onQuestionChange: (question: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = question.trim().length >= 2 && !isLoading;

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
                  label="识别关键词"
                  value={answer.filters.keyword || "未限定"}
                  detail={answer.filters.username ? `用户 ${answer.filters.username}` : "未限定用户"}
                />
                <MetricTile
                  icon={<CalendarClock size={17} />}
                  label="日期范围"
                  value={formatDateOnly(answer.stats.max_date)}
                  detail={`起始 ${formatDateOnly(answer.stats.min_date)}`}
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.028] p-3">
                <div className="mb-3 text-sm font-medium text-slate-200">类型分布</div>
                <div className="space-y-2">
                  {Object.entries(answer.stats.type_counts).length > 0 ? (
                    Object.entries(answer.stats.type_counts).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-slate-400">{label}</span>
                        <span className="text-slate-200">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">暂无分布数据</div>
                  )}
                </div>
              </div>

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
            <Field label="类型" icon={<Layers3 size={16} />}>
              <select
                className="control"
                value={filters.type}
                onChange={(event) => onFilterChange({ type: event.target.value })}
              >
                <option value="">全部类型</option>
                {summary.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="用户" icon={<ShieldCheck size={16} />}>
              <select
                className="control"
                value={filters.username}
                onChange={(event) => onFilterChange({ username: event.target.value })}
              >
                <option value="">全部用户</option>
                {summary.users.map((user) => (
                  <option key={user} value={user}>
                    {user}
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="开始日期" icon={<CalendarClock size={16} />}>
                <input
                  className="control"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => onFilterChange({ dateFrom: event.target.value })}
                />
              </Field>
              <Field label="结束日期" icon={<CalendarClock size={16} />}>
                <input
                  className="control"
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
                value={hasRemainingBudget ? "可用中" : formatResetDate(readyAt, RESET_DISPLAY_TIME_ZONE)}
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
                {formatResetDate(resetAt, RESET_SOURCE_TIME_ZONE)}
              </div>
              <div className="mt-2 text-sm text-mint-100/75">官方重置时间 · GMT</div>
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
                  {formatResetDate(readyAt, RESET_DISPLAY_TIME_ZONE)}
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
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: RESET_DISPLAY_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

function formatTimeOnly(value: string | null) {
  if (!value) return "--:--";
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: RESET_DISPLAY_TIME_ZONE,
  }).format(date);
}

function formatResetDate(value: Date | null, timeZone?: string) {
  if (!value || Number.isNaN(value.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone, timeZoneName: "short" } : {}),
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

function parseUtcDate(value: string | null) {
  if (!value) return null;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTimeZone ? value : `${value.replace(" ", "T")}Z`);
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

function itemToDraft(item: KnowledgeItem): KnowledgeDraft {
  return {
    question: item.question,
    answer: item.answer,
    source: item.source ?? "",
    topic_tag: item.topic_tag ?? "",
    blog_status: item.blog_status,
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

function isEmptyDraft(draft: KnowledgeDraft) {
  return !draft.question.trim() && !draft.answer.trim() && !draft.source.trim() && !draft.topic_tag.trim();
}

function isKnowledgeStatus(value: unknown): value is KnowledgeStatus {
  return value === "未发布" || value === "已发布" || value === "跳过";
}

export default App;
