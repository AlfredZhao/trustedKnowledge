import type { ReactNode } from "react";
import { ChevronRight, Database, RefreshCw, Search, X } from "lucide-react";

export function MetricTile({
  icon,
  label,
  value,
  detail,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
          <span className="text-mint-300">{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        {actionLabel ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-mint-300">
            {actionLabel}
            <ChevronRight size={14} />
          </span>
        ) : null}
      </div>
      <div className="text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </>
  );

  if (onAction) {
    return (
      <button
        className="block w-full rounded-lg border border-white/10 bg-white/[0.028] p-4 text-left transition hover:border-mint-300/25 hover:bg-white/[0.045]"
        type="button"
        onClick={onAction}
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">{content}</div>;
}

export function LoadingStack() {
  return (
    <div className="tk-loading-stack space-y-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="tk-loading-card relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="tk-loading-scan absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent animate-scan" />
          <div className="tk-loading-block mb-4 h-4 w-2/3 rounded bg-white/10" />
          <div className="tk-loading-line mb-3 h-3 w-full rounded bg-white/7" />
          <div className="tk-loading-line h-3 w-1/2 rounded bg-white/7" />
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
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

export function FilterClearButton({
  label = "清空筛选条件",
  className = "",
  onClick,
}: {
  label?: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-300 transition hover:border-mint-300/30 hover:bg-white/[0.055] hover:text-mint-300 ${className}`}
      type="button"
      onClick={onClick}
    >
      <X size={15} />
      <span>{label}</span>
    </button>
  );
}

export function SemanticSearchField({
  value,
  placeholder,
  isActive = false,
  onChange,
  onSearch,
}: {
  value: string;
  placeholder: string;
  isActive?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <Field label="近似检索" icon={<Search size={16} />}>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <input className="control min-w-0 flex-1" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        <button
          className="shrink-0 rounded-md border border-mint-300/30 bg-mint-300/10 px-3 text-xs font-medium text-mint-200 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!value.trim() && !isActive}
          type="submit"
        >
          搜索
        </button>
      </form>
    </Field>
  );
}

export function VectorRefreshButton({ isRefreshing, onRefresh }: { isRefreshing: boolean; onRefresh: () => void }) {
  return (
    <button
      className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-mint-300/30 bg-mint-300/10 px-2.5 text-xs font-medium text-mint-200 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isRefreshing}
      type="button"
      onClick={onRefresh}
    >
      <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={15} />
      {isRefreshing ? "刷新中" : "刷新向量"}
    </button>
  );
}

export function VectorStatusBadge({ value }: { value: number | null | undefined }) {
  const needsUpdate = value === 1;
  return (
    <span className={`rounded-md border px-2 py-1 text-xs ${needsUpdate ? "border-amberline/30 bg-amberline/10 text-amberline" : "border-mint-300/20 bg-mint-300/8 text-mint-200"}`}>
      <Database className="mr-1 inline-block align-[-2px]" size={13} />
      {needsUpdate ? "向量待更新" : "向量就绪"}
    </span>
  );
}
