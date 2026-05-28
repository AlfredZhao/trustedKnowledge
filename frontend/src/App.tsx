import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bot,
  ChevronLeft,
  ChevronRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FilePlus2,
  Filter,
  FileText,
  FlaskConical,
  Layers3,
  LogOut,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import { API_KEY_STORAGE_KEY, fetchAuthConfig, login, startWeChatLogin } from "./api/auth";
import { createKnowledge, deleteKnowledge, fetchKnowledge, getKnowledge, updateKnowledge } from "./api/knowledge";
import type { KnowledgeDraft, KnowledgeItem, KnowledgeStatus } from "./types";

const emptyDraft: KnowledgeDraft = {
  question: "",
  answer: "",
  source: "",
  topic_tag: "",
  blog_status: "未发布",
};

const PAGE_SIZE = 5;
const FACTORY_PAGE_SIZE = 6;

const statusStyles: Record<KnowledgeStatus, string> = {
  未发布: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  已发布: "border-mint-300/30 bg-mint-300/10 text-mint-300",
  跳过: "border-amberline/30 bg-amberline/10 text-amberline",
};

function App() {
  const [apiKey, setApiKey] = useState(() => {
    const wechatApiKey = readWeChatApiKeyFromHash();
    if (wechatApiKey) {
      window.sessionStorage.setItem(API_KEY_STORAGE_KEY, wechatApiKey);
      clearLocationHash();
      return wechatApiKey;
    }

    return window.sessionStorage.getItem(API_KEY_STORAGE_KEY);
  });
  const [activeView, setActiveView] = useState<"workbench" | "factory">("workbench");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [draft, setDraft] = useState<KnowledgeDraft>(emptyDraft);
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

  useEffect(() => {
    const handleUnauthorized = () => {
      setApiKey(null);
      setItems([]);
      setSelectedId(null);
      setDraft(emptyDraft);
    };

    window.addEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trusted-knowledge:unauthorized", handleUnauthorized);
  }, []);

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

        const selectedStillVisible = data.items.some((item) => item.id === factorySelectedId);
        if (!selectedStillVisible) {
          setFactorySelectedId(data.items[0]?.id ?? null);
          setFactoryTask("");
          setHasCopiedFactoryTask(false);
        }
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
  }, [activeView, apiKey, debouncedFactoryQuery, factoryPage, factorySelectedId]);

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
    setDraft(emptyDraft);
    setSaveError(null);
  }

  function handleLogin(nextApiKey: string) {
    window.sessionStorage.setItem(API_KEY_STORAGE_KEY, nextApiKey);
    setApiKey(nextApiKey);
    setPage(1);
    setDebouncedQuery("");
    setQuery("");
  }

  function handleLogout() {
    window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey(null);
    setItems([]);
    setSelectedId(null);
    setDraft(emptyDraft);
    setFactoryItems([]);
    setFactorySelectedId(null);
    setFactoryTask("");
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

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-ink-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(125,211,199,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_22%)]" />
      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[76px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <section className="flex min-w-0 flex-col">
          <Topbar
            activeView={activeView}
            query={activeView === "workbench" ? query : factoryQuery}
            statusFilter={activeView === "workbench" ? statusFilter : undefined}
            title={activeView === "workbench" ? "可信知识录入工作台" : "可信知识加工厂"}
            subtitle={activeView === "workbench" ? "Trusted Knowledge" : "Blog Factory"}
            onLogout={handleLogout}
            onQueryChange={activeView === "workbench" ? setQuery : setFactoryQuery}
            onViewChange={setActiveView}
            onStatusFilterChange={(nextStatus) => {
              setStatusFilter(nextStatus);
              setPage(1);
            }}
          />

          {activeView === "workbench" ? (
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
  activeView: "workbench" | "factory";
  onViewChange: (view: "workbench" | "factory") => void;
}) {
  type SidebarItem = {
    icon: typeof BookOpenCheck;
    label: string;
    view?: "workbench" | "factory";
  };

  const items: SidebarItem[] = [
    { icon: BookOpenCheck, label: "录入工作台", view: "workbench" as const },
    { icon: FlaskConical, label: "知识加工厂", view: "factory" as const },
    { icon: ShieldCheck, label: "Review" },
    { icon: Database, label: "Sources" },
  ];

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
      <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-xs font-semibold text-slate-300">
        AI
      </div>
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
  activeView: "workbench" | "factory";
  query: string;
  statusFilter?: KnowledgeStatus | "all";
  title: string;
  subtitle: string;
  onLogout: () => void;
  onQueryChange: (value: string) => void;
  onViewChange: (view: "workbench" | "factory") => void;
  onStatusFilterChange?: (status: KnowledgeStatus | "all") => void;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const mobileNavItems = [
    { icon: BookOpenCheck, label: "录入工作台", view: "workbench" as const },
    { icon: FlaskConical, label: "知识加工厂", view: "factory" as const },
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
      <nav className="grid grid-cols-2 gap-2 lg:hidden" aria-label="功能页面">
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
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-slate-400 md:w-80">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="搜索问题、来源或标签"
          />
        </label>
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
            className="control min-h-[220px] resize-none leading-7"
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

export default App;
