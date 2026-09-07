import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ChartLine, RefreshCw, ShieldCheck } from "lucide-react";

import { fetchAiAuditDashboard, type AiAuditDashboard, type AiAuditEvent } from "../api/aiAudit";
import { LoadingStack, MetricTile } from "../components/AppShellPrimitives";
import { formatDateTime } from "../utils/appUtils";

const number = new Intl.NumberFormat("zh-CN");
const eventLabels: Record<AiAuditEvent, string> = { completed: "完成", failed: "失败", timed_out: "超时", cancelled: "已取消", started: "进行中" };

export default function AiAuditDashboard() {
  const [days, setDays] = useState(30);
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");
  const [event, setEvent] = useState<AiAuditEvent | "">("");
  const [data, setData] = useState<AiAuditDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (data) setIsRefreshing(true); else setIsLoading(true);
    fetchAiAuditDashboard({ days, username, source, event: event || undefined })
      .then((result) => { if (mounted) { setData(result); setError(null); } })
      .catch((reason: Error) => { if (mounted) setError(reason.message); })
      .finally(() => { if (mounted) { setIsLoading(false); setIsRefreshing(false); } });
    return () => { mounted = false; };
  }, [days, username, source, event, refreshToken]);

  if (isLoading) return <div className="flex-1 px-4 pb-4 pt-2"><LoadingStack /></div>;
  if (error) return <div className="flex-1 px-4 pb-4 pt-2"><section className="rounded-lg border border-amberline/25 bg-amberline/10 p-4 text-sm text-amber-100"><AlertTriangle className="mb-2" size={18} />审计日志读取失败：{error}</section></div>;
  if (!data) return null;
  const maxDailyCalls = Math.max(...data.daily.map((item) => item.calls), 1);
  const summary = data.summary;

  return <div className="flex-1 px-4 pb-4 pt-2">
    <section className="rounded-lg border border-white/10 bg-ink-900/72 p-4 shadow-soft-glow backdrop-blur-xl">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="mb-1 flex items-center gap-2 text-sm text-mint-300"><ShieldCheck size={17} />Administrator only</div><h2 className="text-xl font-semibold text-slate-50">AI 使用审计</h2><p className="mt-1 text-sm text-slate-500">仅展示隐私安全的调用元数据，不包含提示词、响应或密钥。</p></div>
        <button type="button" disabled={isRefreshing} onClick={() => setRefreshToken((value) => value + 1)} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 hover:text-mint-300 disabled:opacity-60"><RefreshCw className={isRefreshing ? "animate-spin" : ""} size={15} />刷新</button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs text-slate-500">时间范围<select value={days} onChange={(e) => setDays(Number(e.target.value))} className="control mt-1 w-full"><option value={7}>近 7 天</option><option value={30}>近 30 天</option><option value={90}>近 90 天</option><option value={365}>近 365 天</option></select></label>
        <label className="text-xs text-slate-500">用户<select value={username} onChange={(e) => setUsername(e.target.value)} className="control mt-1 w-full"><option value="">全部用户</option>{data.available_users.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-slate-500">来源<select value={source} onChange={(e) => setSource(e.target.value)} className="control mt-1 w-full"><option value="">全部来源</option>{data.available_sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-slate-500">状态<select value={event} onChange={(e) => setEvent(e.target.value as AiAuditEvent | "")} className="control mt-1 w-full"><option value="">全部状态</option>{Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </section>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricTile icon={<Activity size={17} />} label="终态调用" value={number.format(summary.total_calls)} detail={`成功率 ${summary.success_rate === null ? "—" : `${summary.success_rate}%`}`} />
      <MetricTile icon={<ChartLine size={17} />} label="总 Token" value={number.format(summary.total_tokens)} detail={`输入 ${number.format(summary.input_tokens)} · 输出 ${number.format(summary.output_tokens)}`} />
      <MetricTile icon={<AlertTriangle size={17} />} label="异常调用" value={number.format(summary.failed_calls + summary.timed_out_calls + summary.cancelled_calls)} detail={`超时 ${summary.timed_out_calls} · 取消 ${summary.cancelled_calls}${summary.in_progress_calls ? ` · 未终态 ${summary.in_progress_calls}` : ""}`} />
      <MetricTile icon={<ShieldCheck size={17} />} label="估算成本" value={summary.estimated_cost_usd === null ? "暂无" : `$${summary.estimated_cost_usd.toFixed(4)}`} detail={summary.estimated_cost_call_count ? `${summary.estimated_cost_call_count} 次已计价` : "需配置模型价格"} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <section className="rounded-lg border border-white/10 bg-ink-900/72 p-4"><h3 className="mb-4 font-medium text-slate-100">每日调用趋势</h3><div className="flex h-48 items-end gap-2 overflow-x-auto border-b border-white/10 pb-6">{data.daily.length ? data.daily.map((item) => <div key={item.date} className="flex h-full min-w-9 flex-1 flex-col justify-end"><div title={`${item.date} · ${item.calls} 次 · ${number.format(item.total_tokens)} tokens`} className="rounded-t bg-mint-300/70" style={{ height: `${Math.max(5, item.calls / maxDailyCalls * 100)}%` }} /><span className="mt-2 whitespace-nowrap text-center text-[10px] text-slate-500">{item.date.slice(5)}</span></div>) : <div className="grid w-full place-items-center text-sm text-slate-500">该筛选条件下暂无终态调用</div>}</div></section>
      <section className="rounded-lg border border-white/10 bg-ink-900/72 p-4"><h3 className="mb-3 font-medium text-slate-100">来源分布</h3><Breakdown items={data.by_source} /><h3 className="mb-3 mt-5 font-medium text-slate-100">用户分布</h3><Breakdown items={data.by_user} /></section>
    </div>
    <section className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-ink-900/72"><div className="flex items-center justify-between border-b border-white/10 p-4"><h3 className="font-medium text-slate-100">审计明细</h3><span className="text-xs text-slate-500">{data.total} 条</span></div><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-white/[0.025] text-xs text-slate-500"><tr><th className="p-3">时间</th><th>用户</th><th>来源 / 模型</th><th>状态</th><th>Token</th><th>耗时</th><th>异常</th></tr></thead><tbody>{data.items.map((item, index) => <tr key={`${item.timestamp}-${item.job_id ?? index}`} className="border-t border-white/8 text-slate-300"><td className="p-3 text-xs text-slate-500">{formatDateTime(item.timestamp)}</td><td>{item.username ?? "未记录"}</td><td><div>{item.source ?? "未记录"}</div><div className="text-xs text-slate-500">{item.model_name ?? item.provider ?? "未记录"}</div></td><td><span className={item.event === "completed" ? "text-mint-300" : "text-amberline"}>{eventLabels[item.event]}</span></td><td>{item.total_tokens === null ? "—" : number.format(item.total_tokens)}</td><td>{item.duration_ms === null ? "—" : `${(item.duration_ms / 1000).toFixed(1)}s`}</td><td className="text-xs text-slate-500">{item.error_type ?? "—"}</td></tr>)}{!data.items.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无审计记录</td></tr>}</tbody></table></div></section>
  </div>;
}

function Breakdown({ items }: { items: AiAuditDashboard["by_source"] }) { return <div className="space-y-2">{items.slice(0, 5).map((item) => <div key={item.key} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-300">{item.key}</span><span className="shrink-0 text-xs text-slate-500">{item.calls} 次 · {number.format(item.total_tokens)}</span></div>)}{!items.length && <div className="text-sm text-slate-500">暂无数据</div>}</div>; }
