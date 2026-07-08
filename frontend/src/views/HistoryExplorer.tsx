import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarClock,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Database,
  FileText,
  Filter,
  History,
  Layers3,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

import type { AuthUser } from "../api/auth";
import { Field, FilterClearButton, LoadingStack, MetricTile } from "../components/AppShellPrimitives";
import type { HistoryItem, HistorySummary } from "../types";
import { HISTORY_PAGE_SIZE } from "../uiConfig";
import { formatAmount, formatDateOnly, formatHistoryDate } from "../utils/appUtils";

export type HistoryFilters = {
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

export default function HistoryExplorer({
  items,
  total,
  page,
  summary,
  authUser,
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
  authUser: AuthUser | null;
  isLoading: boolean;
  loadError: string | null;
  filters: HistoryFilters;
  onFilterChange: (filters: Partial<HistoryFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * HISTORY_PAGE_SIZE, total);
  const historyTypeOptions = filters.username ? summary.user_types[filters.username] ?? [] : summary.types;
  const isAdminUser = authUser?.is_admin ?? false;
  const hasSingleVisibleUser = !isAdminUser && summary.users.length <= 1;
  const allUsersLabel = isAdminUser ? "全部用户" : "全部可见用户";

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
                disabled={hasSingleVisibleUser}
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
                <option value="">{allUsersLabel}</option>
                {summary.users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="类型" icon={<Layers3 size={16} />}>
              <select className="control" value={filters.type} onChange={(event) => onFilterChange({ type: event.target.value })}>
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
                <input className="control" value={filters.week} onChange={(event) => onFilterChange({ week: event.target.value })} placeholder="如 2026-W01" />
              </Field>
              <Field label="Day" icon={<CalendarClock size={16} />}>
                <input className="control" value={filters.day} onChange={(event) => onFilterChange({ day: event.target.value })} placeholder="如 Monday" />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="开始日期" icon={<CalendarClock size={16} />}>
                <input className="control history-date-control" type="date" value={filters.dateFrom} onChange={(event) => onFilterChange({ dateFrom: event.target.value })} />
              </Field>
              <Field label="结束日期" icon={<CalendarClock size={16} />}>
                <input className="control history-date-control" type="date" value={filters.dateTo} onChange={(event) => onFilterChange({ dateTo: event.target.value })} />
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
                <select className="control" value={filters.vectorStatus} onChange={(event) => onFilterChange({ vectorStatus: event.target.value as HistoryFilters["vectorStatus"] })}>
                  <option value="all">全部</option>
                  <option value="1">待更新</option>
                  <option value="0">已就绪</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="排序字段" icon={<ChartLine size={16} />}>
                <select className="control" value={filters.sortBy} onChange={(event) => onFilterChange({ sortBy: event.target.value as HistoryFilters["sortBy"] })}>
                  <option value="history_date">历史日期</option>
                  <option value="id">ID</option>
                  <option value="type">类型</option>
                  <option value="username">用户</option>
                  <option value="learn_level">等级</option>
                </select>
              </Field>
              <Field label="方向" icon={<ChartLine size={16} />}>
                <select className="control" value={filters.sortDir} onChange={(event) => onFilterChange({ sortDir: event.target.value as HistoryFilters["sortDir"] })}>
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
                <History size={17} />
                T_HISTORY
              </div>
              <h2 className="text-xl font-semibold text-slate-50">历史记录</h2>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">{total} 条匹配</div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile icon={<Database size={17} />} label="总量" value={formatAmount(summary.total)} detail="当前查询结果" />
            <MetricTile icon={<Layers3 size={17} />} label="类型" value={formatAmount(summary.types.length)} detail="可筛选类型" />
            <MetricTile icon={<ShieldCheck size={17} />} label="用户" value={formatAmount(summary.users.length)} detail="可筛选用户" />
            <MetricTile icon={<CalendarClock size={17} />} label="日期范围" value={formatDateOnly(summary.max_date)} detail={`起始 ${formatDateOnly(summary.min_date)}`} />
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
                <article
                  key={item.id}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.028] p-4 transition hover:border-mint-300/30 hover:bg-white/[0.045] focus:outline-none focus:ring-2 focus:ring-mint-300/35"
                  role="button"
                  tabIndex={0}
                  title="查看详情"
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-500">#{item.id}</span>
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">{formatHistoryDate(item.history_date)}</span>
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">{item.username || "unknown user"}</span>
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                          {item.week || "week -"} / {item.day || "day -"}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.content || "无内容"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                      <span className="rounded-md border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-xs text-mint-200">{item.type || "未分类"}</span>
                      <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-slate-400">Level {item.learn_level ?? "-"}</span>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs ${
                          item.v_needs_update === 1 ? "border-amberline/30 bg-amberline/10 text-amberline" : "border-mint-300/20 bg-mint-300/8 text-mint-200"
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

      <HistoryDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

function HistoryDetailDialog({ item, onClose }: { item: HistoryItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/62 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
                <History size={17} />
                History Detail
              </div>
              <h2 className="line-clamp-2 text-xl font-semibold text-slate-50">{item.type || "未分类历史记录"}</h2>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-mint-300/30 hover:text-mint-300"
              title="关闭"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">#{item.id}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">{formatHistoryDate(item.history_date)}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">Level {item.learn_level ?? "-"}</span>
            <span
              className={`rounded-md border px-2 py-1 ${
                item.v_needs_update === 1 ? "border-amberline/30 bg-amberline/10 text-amberline" : "border-mint-300/20 bg-mint-300/8 text-mint-200"
              }`}
            >
              {item.v_needs_update === 1 ? "向量待更新" : "向量就绪"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <HistoryDetailMetaTile icon={<CalendarClock size={17} />} label="Week" value={item.week || "-"} detail="历史周期" />
            <HistoryDetailMetaTile icon={<CalendarClock size={17} />} label="Day" value={item.day || "-"} detail="历史日期" />
            <HistoryDetailMetaTile icon={<ShieldCheck size={17} />} label="用户" value={item.username || "unknown"} detail={`#${item.id}`} />
            <HistoryDetailMetaTile icon={<Layers3 size={17} />} label="类型" value={item.type || "未分类"} detail={`Level ${item.learn_level ?? "-"}`} />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
              <FileText size={16} />
              详细内容
            </div>
            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{item.content || "无内容"}</div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-ink-900/96 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}

function HistoryDetailMetaTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.028] p-3 sm:p-4">
      <div className="mb-2 flex min-w-0 items-center gap-2 text-xs text-slate-400 sm:text-sm">
        <span className="shrink-0 text-mint-300">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 truncate text-lg font-semibold text-slate-50 sm:text-xl" title={value}>
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-slate-500" title={detail}>
        {detail}
      </div>
    </div>
  );
}
