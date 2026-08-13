import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  Bot,
  CheckCircle2,
  Github,
  History,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";

import { Field } from "../components/AppShellPrimitives";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { fetchProjectChangelog } from "../api/codex";
import type { GithubSyncResponse, ProjectChangelog, SystemRestartResponse } from "../types";
import {
  buildCodexKnowledgeDraft,
  extractCodexResultText,
  formatDateTime,
  getCodexCompletionSummary,
  type AiCodingMessage,
} from "../utils/appUtils";
import { buildAiCodingModelOptions, formatAiCodingModelLabel } from "./aiCodingShared";

export default function AiCodingWorkspace({
  codexError,
  changelogRefreshToken,
  githubSyncError,
  githubSyncStatus,
  isCodexRunning,
  isGithubSyncing,
  isRestartingServices,
  liveErrorOutput,
  liveOutput,
  liveStatus,
  modelName,
  messages,
  prompt,
  archiveError,
  archiveLoadingId,
  restartConfirm,
  restartError,
  restartResponse,
  onArchiveMessage,
  onClearMessageDisplay,
  onCancel,
  onClearGithubSyncStatus,
  onModelChange,
  onPromptChange,
  onRestartConfirmChange,
  onRestartServices,
  onReleaseCodeToGithub,
  onSyncCodeToGithub,
  onSubmit,
}: {
  codexError: string | null;
  changelogRefreshToken: number;
  githubSyncError: string | null;
  githubSyncStatus: GithubSyncResponse | null;
  isCodexRunning: boolean;
  isGithubSyncing: boolean;
  isRestartingServices: boolean;
  liveErrorOutput: string;
  liveOutput: string;
  liveStatus: string;
  modelName: string;
  messages: AiCodingMessage[];
  prompt: string;
  archiveError: string | null;
  archiveLoadingId: number | null;
  restartConfirm: string;
  restartError: string | null;
  restartResponse: SystemRestartResponse | null;
  onArchiveMessage: (message: AiCodingMessage) => void;
  onClearMessageDisplay: (message: AiCodingMessage) => void;
  onCancel: () => void;
  onClearGithubSyncStatus: () => void;
  onModelChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onRestartConfirmChange: (value: string) => void;
  onRestartServices: () => void;
  onReleaseCodeToGithub: (version: string, confirm: string) => void;
  onSyncCodeToGithub: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canRunCodex = prompt.trim().length >= 2 && !isCodexRunning;
  const canSyncCode = !isGithubSyncing;
  const canRestart = restartConfirm === "RESTART" && !isRestartingServices;
  const latestMessage = messages[0];
  const visibleLatestMessage = latestMessage?.archivedKnowledgeId || latestMessage?.isDisplayCleared ? null : latestMessage;
  const modelOptions = useMemo(() => buildAiCodingModelOptions(null), []);
  const [projectChangelog, setProjectChangelog] = useState<ProjectChangelog | null>(null);
  const [projectChangelogError, setProjectChangelogError] = useState<string | null>(null);
  const [isProjectChangelogLoading, setIsProjectChangelogLoading] = useState(true);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState("");
  const [releaseConfirm, setReleaseConfirm] = useState("");
  const releaseVersionSuggestion = useMemo(() => {
    const match = projectChangelog?.markdown.match(/^### \[(\d+)\.(\d+)\.(\d+)]/m);
    if (!match) return "0.3.9";
    return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
  }, [projectChangelog?.markdown]);
  const canReleaseCode = !isGithubSyncing && /^\d+\.\d+\.\d+$/.test(releaseVersion) && releaseConfirm === "ok";

  const loadProjectChangelog = () => {
    setIsProjectChangelogLoading(true);
    setProjectChangelogError(null);
    return fetchProjectChangelog()
      .then(setProjectChangelog)
      .catch((error) => {
        setProjectChangelogError(error instanceof Error ? error.message : "读取 CHANGELOG.md 失败，请稍后重试。");
      })
      .finally(() => setIsProjectChangelogLoading(false));
  };

  useEffect(() => {
    void loadProjectChangelog();
  }, [changelogRefreshToken]);

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
            <div className="max-w-xs">
              <Field label="执行模型" icon={<Settings2 size={16} />}>
                <select
                  className="control h-10"
                  disabled={isCodexRunning}
                  value={modelName}
                  onChange={(event) => onModelChange(event.target.value)}
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <textarea
              className="control min-h-[170px] resize-none leading-7"
              disabled={isCodexRunning}
              maxLength={50000}
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

          {codexError ? <ErrorNotice message={codexError} tone="danger" /> : null}
          {archiveError ? <ErrorNotice message={archiveError} tone="danger" /> : null}

          <div className="mt-5 space-y-4">
            {isCodexRunning ? (
              <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-sm text-mint-200">
                  <Loader2 className="animate-spin" size={17} />
                  <span>{liveStatus || "Codex 正在运行..."}</span>
                </div>
                <CodexOutputBlock title="Live Output" value={liveOutput || "等待 Codex 输出事件..."} />
                {liveErrorOutput ? <CodexOutputBlock title="Live Error Output" value={liveErrorOutput} tone="warning" /> : null}
                <button
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-red-300/35 bg-red-300/10 px-4 text-sm font-medium text-red-200 transition hover:bg-red-300/16"
                  type="button"
                  onClick={onCancel}
                >
                  终止当前任务
                </button>
              </div>
            ) : !visibleLatestMessage ? (
              <div className="grid min-h-[260px] place-items-center rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
                <div>
                  <Bot className="mx-auto mb-3 text-slate-600" size={36} />
                  <div className="mb-1 font-medium text-slate-300">等待编程任务</div>
                  <p className="text-sm text-slate-500">提交后会显示 Codex 输出、退出码和本次工作区变更。</p>
                </div>
              </div>
            ) : (
              <AiCodingMessageCard
                defaultModelName={null}
                archiveLoadingId={archiveLoadingId}
                message={visibleLatestMessage}
                onArchiveMessage={onArchiveMessage}
                onClearMessageDisplay={onClearMessageDisplay}
              />
            )}
          </div>

          <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <History size={16} />
                  项目变更日志
                </div>
                <div className="text-xs leading-5 text-slate-500">当前项目的 CHANGELOG.md，代码同步成功后会自动刷新。</div>
              </div>
              <button
                className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-xs text-slate-300 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={isProjectChangelogLoading}
                type="button"
                onClick={() => void loadProjectChangelog()}
              >
                <RefreshCw className={isProjectChangelogLoading ? "animate-spin" : ""} size={14} />
                刷新
              </button>
            </div>

            {projectChangelog ? (
              <>
                <div className="mb-3 text-xs text-slate-500">文件更新时间：{formatDateTime(projectChangelog.updated_at)}</div>
                <div className="max-h-[720px] overflow-auto rounded-lg">
                  <MarkdownPreview markdown={projectChangelog.markdown} />
                </div>
              </>
            ) : isProjectChangelogLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/10 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                正在读取 CHANGELOG.md...
              </div>
            ) : null}

            {projectChangelogError ? <ErrorNotice message={projectChangelogError} tone="danger" /> : null}
          </section>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/10 bg-ink-900/64 p-4 backdrop-blur-xl">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
              <Github size={17} />
              Operations
            </div>
            <h2 className="text-lg font-semibold text-slate-50">代码与服务</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <Github size={16} />
                  同步到 GitHub
                </div>
                <div className="text-xs leading-5 text-slate-500">调用服务端 `scripts/commit-to-github.sh` 提交并推送当前代码。</div>
              </div>

              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/30 bg-mint-300/14 px-4 text-sm font-medium text-mint-300 transition hover:bg-mint-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canSyncCode}
                type="button"
                onClick={onSyncCodeToGithub}
              >
                {isGithubSyncing ? <Loader2 className="animate-spin" size={17} /> : <Github size={17} />}
                {isGithubSyncing ? "同步中" : "同步代码到 GitHub"}
              </button>

              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amberline/30 bg-amberline/10 px-4 text-sm font-medium text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                disabled={!canSyncCode}
                type="button"
                onClick={() => {
                  setReleaseVersion(releaseVersionSuggestion);
                  setReleaseConfirm("");
                  setIsReleaseDialogOpen(true);
                }}
              >
                <Github size={17} />
                发布并打 Tag
              </button>

              <div className="text-xs leading-5 text-slate-500">
                发布会使用 `CHANGELOG.md` 的 Unreleased 内容创建版本提交并推送对应 Git Tag。
              </div>

              {githubSyncStatus ? (
                <div className="space-y-3 rounded-lg border border-white/10 bg-black/15 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-md border px-2 py-1 ${
                          githubSyncStatus.success
                            ? "border-mint-300/25 bg-mint-300/10 text-mint-200"
                            : "border-red-400/25 bg-red-400/10 text-red-100"
                        }`}
                      >
                        {githubSyncStatus.success
                          ? githubSyncStatus.message === "GitHub release completed."
                            ? "发布完成"
                            : "同步完成"
                          : githubSyncStatus.message === "GitHub release failed."
                            ? "发布失败"
                            : "同步失败"}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-400">
                        exit {githubSyncStatus.exit_code}
                      </span>
                    </div>
                    <button
                      className="flex h-8 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-400 transition hover:border-red-400/30 hover:text-red-100"
                      type="button"
                      onClick={onClearGithubSyncStatus}
                    >
                      <Trash2 size={14} />
                      清理结果
                    </button>
                  </div>
                  <div className="text-xs leading-5 text-slate-500">
                    {formatDateTime(githubSyncStatus.completed_at)} · Log: {githubSyncStatus.log_path}
                  </div>
                  <CodexOutputBlock title="最近 5 行日志" value={githubSyncStatus.output_tail || githubSyncStatus.message} />
                </div>
              ) : null}

              {githubSyncError ? (
                <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
                  {githubSyncError}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <RefreshCw size={16} />
                  服务重启
                </div>
                <div className="text-xs leading-5 text-slate-500">人工确认后调用服务端重启脚本。</div>
              </div>

              <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-sm leading-6 text-amber-100">
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

          </div>
        </aside>
      </div>

      {isReleaseDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center sm:p-6">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-ink-900 p-4 shadow-soft-glow sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amberline">
                  <Github size={17} />
                  发布并打 Tag
                </div>
                <p className="text-sm leading-6 text-slate-400">将提交当前全部改动、发布并推送 Git Tag，同时将 Unreleased 变更日志归档为该版本。</p>
              </div>
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-slate-100"
                type="button"
                aria-label="关闭发布确认"
                onClick={() => setIsReleaseDialogOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="发布版本" icon={<Github size={16} />}>
                <input
                  className="control"
                  disabled={isGithubSyncing}
                  inputMode="decimal"
                  value={releaseVersion}
                  onChange={(event) => setReleaseVersion(event.target.value.trim())}
                  placeholder={releaseVersionSuggestion}
                />
              </Field>
              <Field label="确认文本" icon={<ShieldCheck size={16} />}>
                <input
                  className="control"
                  disabled={isGithubSyncing}
                  value={releaseConfirm}
                  onChange={(event) => setReleaseConfirm(event.target.value)}
                  placeholder="输入 ok"
                />
              </Field>
              <div className="rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-3 text-xs leading-5 text-amber-100">
                此操作会创建并推送 `v{releaseVersion || "版本号"}`。请输入 `ok` 后继续。
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-300 transition hover:text-slate-100"
                  disabled={isGithubSyncing}
                  type="button"
                  onClick={() => setIsReleaseDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-amberline/30 bg-amberline/14 px-3 text-sm font-medium text-amber-100 transition hover:bg-amberline/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-500"
                  disabled={!canReleaseCode}
                  type="button"
                  onClick={() => {
                    onReleaseCodeToGithub(releaseVersion, releaseConfirm);
                    setIsReleaseDialogOpen(false);
                  }}
                >
                  <Github size={16} />
                  确认发布 v{releaseVersion || "…"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ErrorNotice({ message, tone }: { message: string; tone: "warning" | "danger" }) {
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-3 text-sm ${
        tone === "warning"
          ? "border border-amberline/25 bg-amberline/10 text-amber-100"
          : "border border-red-400/25 bg-red-400/10 text-red-100"
      }`}
    >
      <TriangleAlert className={`mt-0.5 shrink-0 ${tone === "warning" ? "text-amberline" : "text-red-300"}`} size={17} />
      <span>{message}</span>
    </div>
  );
}

function AiCodingMessageCard({
  defaultModelName,
  archiveLoadingId,
  message,
  onArchiveMessage,
  onClearMessageDisplay,
}: {
  defaultModelName: string | null;
  archiveLoadingId: number | null;
  message: AiCodingMessage;
  onArchiveMessage: (message: AiCodingMessage) => void;
  onClearMessageDisplay: (message: AiCodingMessage) => void;
}) {
  const resultText = message.response ? extractCodexResultText(message.response) : "";
  const failedWithoutResponse = message.status === "failed" && !message.response;

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      {message.response ? (
        <CodexCompletionSummaryCard
          isArchiving={archiveLoadingId === message.id}
          message={message}
          defaultModelName={defaultModelName}
          onArchive={() => onArchiveMessage(message)}
          onClearDisplay={() => onClearMessageDisplay(message)}
        />
      ) : null}

      <div className="mb-3 rounded-lg border border-mint-300/15 bg-mint-300/8 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-mint-300/80">
          <span>Prompt</span>
          <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-2 py-1 normal-case tracking-normal text-mint-100/90">
            {formatAiCodingModelLabel(message.modelName ?? message.response?.model_name, defaultModelName)}
          </span>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.prompt}</div>
      </div>

      {failedWithoutResponse ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-100">
              <TriangleAlert size={17} />
              任务执行失败
            </div>
            <div className="text-sm leading-6 text-red-50">{message.errorMessage || "Codex 任务未能完成，请稍后重试。"}</div>
            <div className="mt-2 text-xs leading-5 text-red-100/75">{formatDateTime(message.completedAt ?? message.startedAt)}</div>
          </div>

          {message.output ? <CodexOutputBlock title="Raw Output" value={message.output} /> : null}
          {message.errorOutput ? <CodexOutputBlock title="Error Output" value={message.errorOutput} tone="warning" /> : null}
        </div>
      ) : null}

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

          <CodexOutputBlock
            title="任务结论"
            value={resultText || "未能从 Codex 输出中提取到可读结论，请展开调试日志查看原始输出。"}
          />
          {message.response.error_output ? <CodexOutputBlock title="Error Output" value={message.response.error_output} tone="warning" /> : null}
          <details className="rounded-lg border border-white/10 bg-black/15 p-3">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.18em] text-slate-500">调试日志</summary>
            <div className="mt-3 space-y-3">
              <CodexOutputBlock title="Raw Output" value={message.response.output || "Codex 未返回标准输出。"} />
              <CodexOutputBlock title="Git Status" value={message.response.git_status || "工作区没有新增变更。"} />
            </div>
          </details>
        </div>
      ) : null}
    </article>
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
    <div className={`rounded-lg border p-3 ${tone === "warning" ? "border-amberline/25 bg-amberline/10" : "border-white/10 bg-black/20"}`}>
      <div className={`mb-2 text-xs font-medium uppercase tracking-[0.18em] ${tone === "warning" ? "text-amberline" : "text-slate-500"}`}>
        {title}
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{value}</pre>
    </div>
  );
}

function CodexCompletionSummaryCard({
  defaultModelName,
  isArchiving,
  message,
  onArchive,
  onClearDisplay,
}: {
  defaultModelName: string | null;
  isArchiving: boolean;
  message: AiCodingMessage;
  onArchive: () => void;
  onClearDisplay: () => void;
}) {
  if (!message.response) return null;

  const summary = getCodexCompletionSummary(message.response);
  const success = message.response.exit_code === 0;
  const knowledgePreview = buildCodexKnowledgeDraft(message);
  const resultText = extractCodexResultText(message.response);

  return (
    <div className={`mb-3 rounded-lg border p-3 ${success ? "border-mint-300/25 bg-mint-300/10" : "border-red-400/25 bg-red-400/10"}`}>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className={`mb-1 flex items-center gap-2 text-sm font-medium ${success ? "text-mint-100" : "text-red-100"}`}>
            {success ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}
            {success ? "任务已完成" : "任务执行结束，但返回非零退出码"}
          </div>
          <div className="text-xs leading-5 text-slate-400">
            exit {message.response.exit_code} · {message.response.duration_seconds}s · {summary.changedFiles.length} 个变更文件
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            模型：{formatAiCodingModelLabel(message.modelName ?? message.response.model_name, defaultModelName)}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:border-mint-300/30 hover:text-mint-200 disabled:cursor-not-allowed disabled:text-slate-500"
            disabled={isArchiving || Boolean(message.archivedKnowledgeId)}
            type="button"
            onClick={onArchive}
          >
            {isArchiving ? <Loader2 className="animate-spin" size={16} /> : <Archive size={16} />}
            {message.archivedKnowledgeId ? `已归档 #${message.archivedKnowledgeId}` : isArchiving ? "归档中" : "归档精简记录"}
          </button>
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:text-red-100"
            type="button"
            onClick={onClearDisplay}
          >
            <Trash2 size={16} />
            清空当前展示
          </button>
        </div>
      </div>

      {resultText ? (
        <div className="mb-3 rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">任务结论</div>
          <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{resultText}</div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">重启判断</div>
          <div className={`text-sm leading-6 ${summary.restartRecommended ? "text-amber-100" : "text-slate-300"}`}>{summary.restartText}</div>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">变更文件</div>
          {summary.changedFiles.length > 0 ? (
            <div className="min-w-0 space-y-1 text-xs leading-5 text-slate-300">
              {summary.changedFiles.slice(0, 6).map((file) => (
                <div key={file} className="min-w-0 truncate">
                  {file}
                </div>
              ))}
              {summary.changedFiles.length > 6 ? <div className="text-slate-500">还有 {summary.changedFiles.length - 6} 个文件，见 Git Status。</div> : null}
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
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">{knowledgePreview.answer}</pre>
      </div>
    </div>
  );
}
