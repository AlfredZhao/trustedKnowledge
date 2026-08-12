import type { ReactNode } from "react";
import { BookOpenCheck, ChartLine, CircleGauge, ClipboardCheck, FileText, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

import { MetricTile, LoadingStack } from "../components/AppShellPrimitives";
import type { AppView, EnglishMaterialItem, KnowledgeItem, LlmUsageSample, TodoItem } from "../types";
import { formatAmount, formatDate, formatDateTime, formatPercent, formatUsdAmount, getUsagePercent } from "../utils/appUtils";

type OverviewData = {
  usageItems: LlmUsageSample[];
  usageTotal: number;
  processingTodos: TodoItem[];
  processingTodoTotal: number;
  recentKnowledge: KnowledgeItem[];
  knowledgeTotal: number;
  unpublishedKnowledgeTotal: number;
  latestEnglishMaterial: EnglishMaterialItem | null;
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
}) {
  const latestUsage = canViewUsage && data.usageItems.length > 0 ? data.usageItems[data.usageItems.length - 1] : null;
  const usagePercent = latestUsage ? getUsagePercent(latestUsage) : 0;
  const latestEnglish = data.latestEnglishMaterial;
  const hasOverviewData =
    latestUsage ||
    data.processingTodos.length > 0 ||
    data.recentKnowledge.length > 0 ||
    data.processingTodoTotal > 0 ||
    latestEnglish ||
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
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
            <ChartLine size={17} />
            Overview
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold text-slate-50">关键状态</h2>
            <span className="text-xs text-slate-500">
              {isRefreshing ? "正在读取最新数据" : lastUpdatedAt ? `最后更新 ${formatDateTime(lastUpdatedAt)}` : "尚未完成在线更新"}
            </span>
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

      <div className={`mb-4 grid grid-cols-2 gap-4 ${canViewUsage ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {canViewUsage ? (
          <MetricTile
            icon={<CircleGauge size={17} />}
            label="LLM 用量"
            value={latestUsage ? formatPercent(usagePercent) : "暂无"}
            detail={latestUsage ? `已使用: ${formatUsdAmount(latestUsage.used_amount)} · 剩余: ${formatUsdAmount(latestUsage.remaining_budget)}` : "暂无采样"}
            actionLabel="查看用量"
            onAction={() => onOpenView("usage")}
          />
        ) : null}
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
        <MetricTile icon={<FileText size={17} />} label="English 素材" value={latestEnglish?.sequence_no ? `#${latestEnglish.sequence_no}` : formatAmount(data.englishMaterialTotal)} detail={latestEnglish ? "最近 1 条" : "暂无最近素材"} />
      </div>

      {canViewUsage && sectionErrors.usage ? <OverviewInlineError message={`LLM 用量读取失败：${sectionErrors.usage}`} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.58fr)]">
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
          <OverviewSectionHeader icon={<BookOpenCheck size={17} />} title="最近 English" actionLabel="查看素材" onAction={() => onOpenView("englishMaterials")} />
          {sectionErrors.english ? <OverviewInlineError message={`English 素材读取失败：${sectionErrors.english}`} /> : null}
          {latestEnglish ? (
            <button
              className="block w-full rounded-lg border border-mint-300/20 bg-mint-300/8 p-4 text-left transition hover:border-mint-300/35 hover:bg-mint-300/10"
              type="button"
              onClick={() => onOpenEnglishMaterial(latestEnglish)}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-mint-100">{latestEnglish.category ?? "未分类"}</span>
                <span className="text-xs text-mint-100/70">{latestEnglish.flag === 1 ? "已发表" : "草稿箱"}</span>
              </div>
              <div className="mb-2 line-clamp-2 text-base font-semibold leading-6 text-slate-50">{latestEnglish.title || latestEnglish.base_expression || "未命名素材"}</div>
              <div className="line-clamp-3 text-sm leading-6 text-mint-100/80">{latestEnglish.professional_sentence || latestEnglish.base_expression || "暂无英文内容"}</div>
              <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{latestEnglish.chinese_translation || "暂无中文翻译"}</div>
            </button>
          ) : (
            <OverviewEmpty icon={<FileText size={28} />} title="暂无 English 素材" />
          )}
        </aside>
      </div>

      <section className="mt-4 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
        <OverviewSectionHeader icon={<ShieldCheck size={17} />} title="可信知识" actionLabel="进入知识库" onAction={() => onOpenView("workbench")} />
        {sectionErrors.knowledge ? <OverviewInlineError message={`可信知识读取失败：${sectionErrors.knowledge}`} /> : null}
        {data.recentKnowledge.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {data.recentKnowledge.map((item) => (
              <button
                key={item.id}
                className="block min-w-0 rounded-lg border border-white/10 bg-white/[0.028] p-4 text-left transition hover:border-mint-300/25 hover:bg-white/[0.045]"
                type="button"
                onClick={() => onOpenKnowledge(item)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="line-clamp-2 text-sm font-medium leading-6 text-slate-100">{item.question}</div>
                  <span className={`shrink-0 rounded border px-2 py-1 text-xs ${statusStyles[item.blog_status]}`}>{item.blog_status}</span>
                </div>
                <div className="line-clamp-3 text-sm leading-6 text-slate-500">{item.answer}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {item.source ? <span>{item.source}</span> : null}
                  {item.topic_tag ? <span>#{item.topic_tag}</span> : null}
                  <span>{formatDate(item.created_date)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <OverviewEmpty icon={<ShieldCheck size={28} />} title="暂无可信知识" />
        )}
      </section>
    </div>
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
