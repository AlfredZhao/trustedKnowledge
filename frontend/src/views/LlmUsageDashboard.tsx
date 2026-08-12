import { useEffect, useRef } from "react";
import { Bot, CalendarClock, ChartLine, CircleGauge, Database, RefreshCw, TriangleAlert } from "lucide-react";

import { LoadingStack, MetricTile } from "../components/AppShellPrimitives";
import type { LlmUsageSample } from "../types";
import {
  clampPercent,
  collapseStableUsageSamples,
  formatDateTime,
  formatPercent,
  formatUsdAmount,
  formatResetDate,
  formatResetDistance,
  formatTimeOnly,
  formatUsagePeriod,
  getResetReadyAt,
  getTrendBarHeight,
  getUsagePercent,
  parseUtcDate,
} from "../utils/appUtils";

export default function LlmUsageDashboard({
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
              <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">{total} 个采样点</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile icon={<CircleGauge size={17} />} label="已使用" value={formatUsdAmount(latest.used_amount)} detail={`${formatPercent(usagePercent)} / 总额度 ${formatUsdAmount(latest.total_budget)}`} />
              <MetricTile icon={<Database size={17} />} label="剩余额度" value={formatUsdAmount(latest.remaining_budget)} detail={`${formatPercent(remainingPercent)} 可用`} />
              <MetricTile
                icon={<CalendarClock size={17} />}
                label={hasRemainingBudget ? "本周期状态" : "下个周期可用"}
                value={hasRemainingBudget ? "可用中" : formatResetDate(readyAt)}
                detail={hasRemainingBudget ? `${formatUsdAmount(latest.remaining_budget)} 额度剩余` : formatResetDistance(readyAt, "可用")}
              />
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.028] p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm font-medium text-slate-200">预算消耗</div>
                <div className="text-sm text-slate-400">{formatPercent(usagePercent)}</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-mint-300 transition-all duration-500" style={{ width: `${usagePercent}%` }} />
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
                    {!trendChanged ? <span className="text-xs font-normal text-slate-500">{latestTrendPercent > 0 ? `稳定在 ${formatPercent(latestTrendPercent)}` : "用量暂无变化"}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded border border-mint-300/20 bg-mint-300/8 px-2 py-1 text-mint-200">当前 {formatPercent(latestTrendPercent)}</span>
                    <span className="rounded border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">峰值 {formatPercent(maxTrendPercent)}</span>
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
                    <span key={tick} className="absolute right-0 translate-y-1/2 tabular-nums" style={{ bottom: `${tick}%` }}>
                      {tick}%
                    </span>
                  ))}
                </div>
                <div className="relative h-full min-w-0">
                  {[20, 40, 60, 80, 100].map((tick) => (
                    <div key={tick} className={`absolute inset-x-0 border-t ${tick === 100 ? "border-mint-300/35" : "border-white/8"}`} style={{ bottom: `${tick}%` }} />
                  ))}
                  <div ref={trendScrollRef} className="relative z-10 flex h-full items-end gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {trendItems.map((item) => {
                      const percent = getUsagePercent(item);
                      const trendHeight = getTrendBarHeight(percent);
                      return (
                        <div key={item.sample_time} className="flex h-full min-w-4 flex-[0_0_14px] flex-col justify-end sm:flex-1">
                          <div
                            className="w-full rounded-t border border-mint-300/20 bg-mint-300/70 transition-all duration-300"
                            style={{ height: `${trendHeight}%` }}
                            title={`${formatDateTime(item.sample_time)} · ${formatPercent(percent)} · 已使用 ${formatUsdAmount(item.used_amount)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{formatTimeOnly(trendItems[0]?.sample_time ?? null)}</span>
                <span>{trendChanged ? `${formatPercent(minTrendPercent)} - ${formatPercent(maxTrendPercent)}` : `当前 ${formatPercent(usagePercent)}`}</span>
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
              <div className="text-lg font-semibold leading-7 text-mint-100">{formatResetDate(resetAt)}</div>
              <div className="mt-2 text-sm text-mint-100/75">UTC 换算 · Asia/Shanghai</div>
            </div>

            {hasRemainingBudget ? (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">CURRENT_CYCLE</div>
                <div className="text-lg font-semibold leading-7 text-slate-100">可用中</div>
                <div className="mt-2 text-sm text-slate-500">当前周期仍有 {formatUsdAmount(latest.remaining_budget)} 额度，无需等待下个周期。</div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">NEXT_CYCLE_READY</div>
                <div className="text-lg font-semibold leading-7 text-slate-100">{formatResetDate(readyAt)}</div>
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
                      已使用: {formatUsdAmount(item.used_amount)} · 剩余: {formatUsdAmount(item.remaining_budget)}
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
