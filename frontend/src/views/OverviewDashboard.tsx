import type { ReactNode } from "react";
import { BookOpenCheck, ChartLine, ClipboardCheck, FileText, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

import { MetricTile, LoadingStack } from "../components/AppShellPrimitives";
import type { AppView, EnglishMaterialItem, KnowledgeItem, LlmUsageSample, TodoItem } from "../types";
import { clampPercent, formatAmount, formatDate, formatDateTime, formatPercent } from "../utils/appUtils";

type OverviewData = {
  usageItems: LlmUsageSample[];
  usageTotal: number;
  processingTodos: TodoItem[];
  processingTodoTotal: number;
  recentKnowledge: KnowledgeItem[];
  knowledgeTotal: number;
  unpublishedKnowledgeTotal: number;
  recentEnglishMaterials: EnglishMaterialItem[];
  englishMaterialTotal: number;
};

type OverviewSectionErrors = {
  usage: string | null;
  todos: string | null;
  knowledge: string | null;
  english: string | null;
};

const statusStyles: Record<KnowledgeItem["blog_status"], string> = {
  未发布: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  已发布: "border-mint-300/30 bg-mint-300/10 text-mint-300",
  跳过: "border-amberline/30 bg-amberline/10 text-amberline",
};

const todoStatusStyles: Record<TodoItem["todo_status"], string> = {
  待处理: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  处理中: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  已完成: "border-mint-300/30 bg-mint-300/10 text-mint-300",
};

export default function OverviewDashboard({
  canViewUsage,
  data,
  isLoading,
  isRefreshing,
  lastUpdatedAt,
  loadError,
  sectionErrors,
  onOpenEnglishMaterial,
  onOpenKnowledge,
  onOpenTodo,
  onOpenView,
  onRefresh,
  englishLimit,
  onEnglishLimitChange,
}: {
  canViewUsage: boolean;
  data: OverviewData;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  loadError: string | null;
  sectionErrors: OverviewSectionErrors;
  onOpenEnglishMaterial: (item: EnglishMaterialItem) => void;
  onOpenKnowledge: (item: KnowledgeItem) => void;
  onOpenTodo: (item: TodoItem) => void;
  onOpenView: (view: AppView) => void;
  onRefresh: () => void;
  englishLimit: number;
  onEnglishLimitChange: (limit: number) => void;
}) {
  const latestUsage = canViewUsage && data.usageItems.length > 0 ? data.usageItems[data.usageItems.length - 1] : null;
  const remainingPercent = latestUsage ? clampPercent((latestUsage.remaining_budget / latestUsage.total_budget) * 100) : 0;
  const recentEnglish = data.recentEnglishMaterials;
  const hasOverviewData =
    latestUsage ||
    data.processingTodos.length > 0 ||
    data.recentKnowledge.length > 0 ||
    data.processingTodoTotal > 0 ||
    recentEnglish.length > 0 ||
    data.knowledgeTotal > 0 ||
    data.englishMaterialTotal > 0;

  if (isLoading) {
    return (
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
  }

  if (loadError && !hasOverviewData) {
    return (
      <div className="flex-1 px-4 pb-4 pt-2">
        <section className="rounded-lg border border-amberline/25 bg-amberline/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amberline">
            <TriangleAlert size={16} />
            总览读取失败
          </div>
          <p className="text-sm leading-6 text-amber-100/80">{loadError}</p>
          <button
            className="mt-4 flex h-9 items-center gap-2 rounded-lg border border-amberline/30 bg-amberline/10 px-3 text-sm text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={15} />
            {isRefreshing ? "重试中" : "重试"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 pb-4 pt-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <ChartLine size={17} />
            Overview
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h2 className="text-xl font-semibold text-slate-50">关键状态</h2>
                <span className="text-xs text-slate-500">
                  {isRefreshing ? "正在读取最新数据" : lastUpdatedAt ? `最后更新 ${formatDateTime(lastUpdatedAt)}` : "尚未完成在线更新"}
                </span>
              </div>
            </div>
            {canViewUsage ? <LlmBatteryIndicator remainingPercent={remainingPercent} hasUsage={Boolean(latestUsage)} onClick={() => onOpenView("usage")} /> : null}
          </div>
        </div>
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 transition hover:border-mint-300/30 hover:bg-white/[0.055] hover:text-mint-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={16} />
          {isRefreshing ? "刷新中" : "刷新总览"}
        </button>
      </div>

      {loadError ? <div className="mb-4 rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-sm text-amber-100/80">{loadError}</div> : null}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <MetricTile
          icon={<ClipboardCheck size={17} />}
          label="处理中 Todo"
          value={formatAmount(data.processingTodoTotal)}
          detail={data.processingTodos.length > 0 ? `列表显示最近 ${formatAmount(data.processingTodos.length)} 条` : "暂无处理中"}
        />
        <MetricTile
          icon={<BookOpenCheck size={17} />}
          label="未发布知识"
          value={formatAmount(data.unpublishedKnowledgeTotal)}
          detail={data.recentKnowledge.length > 0 ? `列表显示最近 ${formatAmount(data.recentKnowledge.length)} 条` : "暂无未发布"}
        />
      </div>

      {canViewUsage && sectionErrors.usage ? <OverviewInlineError message={`LLM 用量读取失败：${sectionErrors.usage}`} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <OverviewSectionHeader icon={<ClipboardCheck size={17} />} title="处理中 Todo" actionLabel="查看待办" onAction={() => onOpenView("todos")} />
          {sectionErrors.todos ? <OverviewInlineError message={`处理中 Todo 读取失败：${sectionErrors.todos}`} /> : null}
          {data.processingTodos.length > 0 ? (
            <div className="space-y-3">
              {data.processingTodos.map((item) => (
                <button
                  key={item.id}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.028] p-3 text-left transition hover:border-mint-300/25 hover:bg-white/[0.045]"
                  type="button"
                  onClick={() => onOpenTodo(item)}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="line-clamp-2 text-sm font-medium leading-6 text-slate-100">{item.title}</div>
                    <span className={`shrink-0 rounded border px-2 py-1 text-xs ${todoStatusStyles[item.todo_status]}`}>{item.todo_status}</span>
                  </div>
                  <div className="line-clamp-2 text-sm leading-6 text-slate-500">{item.content}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.topic_tag ? <span>#{item.topic_tag}</span> : null}
                    <span>{formatDate(item.updated_at ?? item.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <OverviewEmpty icon={<ClipboardCheck size={28} />} title="暂无处理中 Todo" />
          )}
        </section>

        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <OverviewSectionHeader icon={<ShieldCheck size={17} />} title="可信知识" actionLabel="进入知识库" onAction={() => onOpenView("workbench")} />
          {sectionErrors.knowledge ? <OverviewInlineError message={`可信知识读取失败：${sectionErrors.knowledge}`} /> : null}
          {data.recentKnowledge.length > 0 ? (
            <div className="space-y-3">
              {data.recentKnowledge.map((item) => (
                <button
                  key={item.id}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.028] p-3 text-left transition hover:border-mint-300/25 hover:bg-white/[0.045]"
                  type="button"
                  onClick={() => onOpenKnowledge(item)}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="line-clamp-2 text-sm font-medium leading-6 text-slate-100">{item.question}</div>
                    <span className={`shrink-0 rounded border px-2 py-1 text-xs ${statusStyles[item.blog_status]}`}>{item.blog_status}</span>
                  </div>
                  <div className="line-clamp-2 text-sm leading-6 text-slate-500">{item.answer}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.topic_tag ? <span>#{item.topic_tag}</span> : null}
                    <span>{formatDate(item.created_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <OverviewEmpty icon={<ShieldCheck size={28} />} title="暂无可信知识" />
          )}
        </aside>
      </div>

      <section className="mt-4 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-mint-300">
            <BookOpenCheck size={17} />
            <span>最近 English</span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              显示
              <select
                className="h-9 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-xs text-slate-200 outline-none transition hover:border-mint-300/30 focus:border-mint-300/50"
                value={englishLimit}
                onChange={(event) => onEnglishLimitChange(Number(event.target.value))}
              >
                {[1, 3, 5, 8].map((limit) => (
                  <option key={limit} value={limit} className="bg-ink-900">
                    最近 {limit} 条
                  </option>
                ))}
              </select>
            </label>
            <button
              className="shrink-0 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-300 transition hover:border-mint-300/30 hover:bg-white/[0.055] hover:text-mint-300"
              type="button"
              onClick={() => onOpenView("englishMaterials")}
            >
              查看素材
            </button>
          </div>
        </div>
        {sectionErrors.english ? <OverviewInlineError message={`English 素材读取失败：${sectionErrors.english}`} /> : null}
        {recentEnglish.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentEnglish.map((item) => (
              <button
                key={item.id}
                className="block min-w-0 rounded-lg border border-mint-300/20 bg-mint-300/8 p-4 text-left transition hover:border-mint-300/35 hover:bg-mint-300/10"
                type="button"
                onClick={() => onOpenEnglishMaterial(item)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-mint-100">{item.category ?? "未分类"}</span>
                  <span className="text-xs text-mint-100/70">{item.flag === 1 ? "已发表" : "草稿箱"}</span>
                </div>
                <div className="mb-2 line-clamp-2 text-base font-semibold leading-6 text-slate-50">{item.title || item.base_expression || "未命名素材"}</div>
                <div className="line-clamp-3 text-sm leading-6 text-mint-100/80">{item.professional_sentence || item.base_expression || "暂无英文内容"}</div>
                <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{item.chinese_translation || "暂无中文翻译"}</div>
              </button>
            ))}
          </div>
        ) : (
          <OverviewEmpty icon={<FileText size={28} />} title="暂无 English 素材" />
        )}
      </section>
    </div>
  );
}

function LlmBatteryIndicator({
  remainingPercent,
  hasUsage,
  onClick,
}: {
  remainingPercent: number;
  hasUsage: boolean;
  onClick: () => void;
}) {
  const isLow = hasUsage && remainingPercent < 20;
  const tone = isLow ? "border-red-400 text-red-300" : "border-mint-300 text-mint-300";
  const fillTone = isLow ? "bg-red-400" : "bg-mint-300";
  const label = hasUsage ? `LLM 剩余 ${formatPercent(remainingPercent)}，查看 AI 用量详情` : "暂无 LLM 用量采样，查看 AI 用量详情";

  return (
    <button
      className="group -mr-1 -mt-1 flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300/70"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span className="text-xs font-medium text-slate-400">LLM</span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className={`relative h-6 w-11 rounded-[5px] border-2 ${tone}`}>
          <span className="absolute inset-[3px] overflow-hidden rounded-[2px]">
            <span className={`absolute inset-y-0 left-0 rounded-[2px] ${fillTone} animate-[battery-fill_700ms_ease-out] transition-[width,background-color] duration-700 motion-reduce:animate-none motion-reduce:transition-none`} style={{ width: `${remainingPercent}%` }} />
          </span>
          <span className={`absolute -right-[5px] top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-r-sm ${fillTone}`} />
        </span>
        <span className={`min-w-9 text-right text-sm font-semibold ${isLow ? "text-red-300" : "text-slate-200"}`}>{hasUsage ? formatPercent(remainingPercent) : "--"}</span>
      </span>
    </button>
  );
}

function OverviewSectionHeader({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-mint-300">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <button
        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-300 transition hover:border-mint-300/30 hover:bg-white/[0.055] hover:text-mint-300"
        type="button"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function OverviewEmpty({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="grid min-h-[160px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
      <div>
        <div className="mb-3 flex justify-center text-slate-600">{icon}</div>
        <div className="text-sm font-medium text-slate-400">{title}</div>
      </div>
    </div>
  );
}

function OverviewInlineError({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-sm leading-6 text-amber-100/80">
      <TriangleAlert className="mt-0.5 shrink-0 text-amberline" size={15} />
      <span>{message}</span>
    </div>
  );
}
