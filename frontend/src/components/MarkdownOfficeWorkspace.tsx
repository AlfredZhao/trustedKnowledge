import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Download, List, Loader2, Maximize, Minimize, Settings2, X } from "lucide-react";
import { downloadOffice, getOfficeLimits, previewOffice } from "../api/office";
import { assertOfficeAssets } from "../utils/officeAssetLimits";
import { prepareOfficeSource } from "../utils/officeSource";
import type { OfficeLimits, OfficeMetadata, OfficePreview, OfficeSource } from "../utils/officeTypes";
import { sessionIdentity, watchSlideSession, type SlideSnapshot } from "../utils/markdownSlidesSession";
import OfficeCanvas, { OfficePageText } from "./OfficeCanvas";

const emptyMetadata: OfficeMetadata = { subtitle: "", version: "", footer: "" };

export default function MarkdownOfficeWorkspace({ snapshot, onClose, onReading, standalone = false }: {
  snapshot: SlideSnapshot; onClose: () => void; onReading?: () => void; standalone?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const sourceCache = useRef<OfficeSource | null>(null);
  const controller = useRef<AbortController | null>(null);
  const valid = useRef(true);
  const owner = useRef(sessionIdentity());
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const [source, setSource] = useState<OfficeSource | null>(null);
  const [preview, setPreview] = useState<OfficePreview | null>(null);
  const [metadata, setMetadata] = useState<OfficeMetadata>(emptyMetadata);
  const [draft, setDraft] = useState<OfficeMetadata>(emptyMetadata);
  const [panel, setPanel] = useState<"settings" | "directory" | "detail" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [limits, setLimits] = useState<OfficeLimits | null>(null);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [light, setLight] = useState(document.documentElement.dataset.theme === "light");
  const page = preview?.pages[index];

  const run = async (action: (signal: AbortSignal, content: OfficeSource) => Promise<void>, initial: string) => {
    if (owner.current !== sessionIdentity()) { closeRef.current(); return; }
    controller.current?.abort();
    const next = new AbortController(); controller.current = next;
    setBusy(true); setError(""); setMessage(initial);
    let timer = window.setTimeout(() => next.abort("timeout"), 30_000);
    const active = () => valid.current && controller.current === next && owner.current === sessionIdentity();
    try {
      const policy = await getOfficeLimits(next.signal);
      next.signal.throwIfAborted();
      if (!active()) return;
      setLimits(policy);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => next.abort("timeout"), policy.client_timeout_seconds * 1000);
      const content = sourceCache.current ?? await prepareOfficeSource(snapshot.markdown, next.signal, text => { if (active()) setMessage(text); }, policy);
      // A cached snapshot must still respect a newly lowered administrator limit.
      assertOfficeAssets(content.assets, policy);
      next.signal.throwIfAborted();
      if (!active()) return;
      sourceCache.current = content; setSource(content);
      setMessage(initial);
      await action(next.signal, content);
    } catch (cause) {
      if (active()) {
        if (next.signal.aborted) setMessage(next.signal.reason === "timeout" ? "处理超时，请缩小内容后重试。" : "已取消，可重试。");
        else { setError(cause instanceof Error ? cause.message : "导出失败，请重试。"); setMessage(""); }
      }
    } finally {
      window.clearTimeout(timer);
      if (active()) { setBusy(false); controller.current = null; }
    }
  };

  const build = (settings: OfficeMetadata) => {
    setPreview(null);
    void run(async (signal, content) => {
      const result = await previewOffice({ template: "aibs-v1", source: content, metadata: settings }, signal);
      signal.throwIfAborted();
      if (!valid.current || owner.current !== sessionIdentity()) return;
      setPreview(result);
      const start = snapshot.sourceLine <= 0 ? 0 : result.pages.findIndex(item => item.elements.some(element => content.blocks.some(block => block.id === element.block && block.sourceEnd >= snapshot.sourceLine)));
      setIndex(Math.max(0, start));
      setMessage("固定 16:9 近似预览 · 不随窗口尺寸重新分页");
    }, "正在按 AIBS 模板排版…");
  };

  useEffect(() => {
    valid.current = true;
    root.current?.focus({ preventScroll: true });
    setLight(document.documentElement.dataset.theme === "light");
    const overflow = document.body.style.overflow;
    const theme = document.documentElement.dataset.theme;
    const colorScheme = document.documentElement.style.colorScheme;
    document.body.style.overflow = "hidden";
    const expired = watchSlideSession(() => { valid.current = false; controller.current?.abort(); sourceCache.current = null; closeRef.current(); });
    const full = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", full);
    if (snapshot.markdown.trim()) build(emptyMetadata);
    else setMessage("暂无可导出的内容。");
    return () => {
      valid.current = false; controller.current?.abort(); sourceCache.current = null;
      expired(); document.removeEventListener("fullscreenchange", full);
      document.body.style.overflow = overflow;
      if (!standalone) {
        if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
        document.documentElement.style.colorScheme = colorScheme;
      }
    };
    // This workspace owns a fixed click-time snapshot, not live editor state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.markdown, standalone]);

  const closePanel = () => { setPanel(null); root.current?.focus({ preventScroll: true }); };
  const leave = () => { controller.current?.abort(); if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => undefined); onClose(); };
  const changePage = (value: number) => {
    if (!preview || busy) return index;
    const target = Math.max(0, Math.min(preview.pages.length - 1, Math.trunc(value)));
    setIndex(target); closePanel(); return target;
  };
  const full = async () => {
    try {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setMessage("此浏览器不支持全屏，仍可在当前页面使用。");
    } catch { setMessage("浏览器未允许全屏，仍可在当前页面使用。"); }
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Tab") {
      const scope = root.current?.querySelector<HTMLElement>("[data-office-panel]") ?? root.current;
      const controls = Array.from(scope?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),select,a[href],summary") || []).filter(node => node.getClientRects().length && !node.closest("[hidden]"));
      const first = controls[0], last = controls[controls.length - 1];
      if (first && (!scope?.contains(document.activeElement) || document.activeElement === root.current || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    } else if (event.key === "Escape") {
      event.preventDefault(); if (panel) closePanel(); else if (document.fullscreenElement === root.current) void full(); else leave();
    } else if (!panel && !event.altKey && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing && !(event.target as Element).closest("input,select,textarea")) {
      if (["ArrowRight", "ArrowDown", "PageDown", "ArrowLeft", "ArrowUp", "PageUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        changePage(event.key === "Home" ? 0 : event.key === "End" ? (preview?.pages.length || 1) - 1 : index + (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key) ? 1 : -1));
      }
    }
  };
  const download = (format: "pptx" | "docx") => void run(async (signal, content) => {
    await downloadOffice({ template: "aibs-v1", source: content, metadata }, format, snapshot.title, signal);
    signal.throwIfAborted(); if (valid.current) setMessage(`${format.toUpperCase()} 已生成并请求下载，请在 Office 中检查后交付。`);
  }, `正在生成 ${format.toUpperCase()}…`);

  return <div ref={root} className="slide-screen office-screen" role="dialog" aria-modal="true" aria-label="Markdown 模板与 Office 导出" tabIndex={-1} onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
    <header className="slide-header">
      <div className="slide-heading"><strong title={snapshot.title}>{snapshot.title}</strong><span>只读快照 · 不修改正文</span></div>
      <div className="slide-actions">
        {onReading ? <select className="slide-control" aria-label="演示模板" value="aibs" onChange={() => { controller.current?.abort(); if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => undefined); onReading(); }}><option value="reading">默认阅读模式</option><option value="aibs">AIBS 模板 · 16:9</option></select> : <span className="slide-control">AIBS 内置模板</span>}
        <button className="slide-control" type="button" disabled={busy} onClick={() => { setDraft(metadata); setPanel("settings"); }}><Settings2 size={15} />导出设置</button>
        <button className="slide-control" type="button" aria-label={light ? "切换深色主题" : "切换浅色主题"} onClick={() => { document.documentElement.dataset.theme = light ? "dark" : "light"; document.documentElement.style.colorScheme = light ? "dark" : "light"; setLight(!light); }}>{light ? "深色" : "浅色"}</button>
        <button className="slide-control" type="button" onClick={() => void full()}>{fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}{fullscreen ? "退出全屏" : "全屏"}</button>
        <button className="slide-control" type="button" onClick={leave}><X size={15} />{standalone ? "关闭" : "返回编辑"}</button>
      </div>
    </header>
    <div className="office-toolbar">
      <button className="slide-control" type="button" disabled={busy || !snapshot.markdown.trim()} onClick={() => download("pptx")}><Download size={15} />导出 PPTX</button>
      <button className="slide-control" type="button" disabled={busy || !snapshot.markdown.trim()} onClick={() => download("docx")}><Download size={15} />导出 DOCX</button>
      <button className="slide-control" type="button" disabled={busy || !snapshot.markdown.trim()} onClick={() => build(metadata)}>重新预览</button>
      {busy && <button className="slide-control" type="button" onClick={() => controller.current?.abort()}>取消处理</button>}
      <span className="office-notice">网页仅近似展示 PPT；Word 为连续文档。交付前请用 Office 核对字体与排版。{limits && ` 当前上限：${limits.max_assets} 个素材／总编码 ${limits.max_total_bytes / 1_000_000} MB。`}</span>
    </div>
    <div className="office-status" role={error ? "alert" : "status"}>{busy && <Loader2 size={16} className="animate-spin" />}{error || message}</div>
    <main className="office-main" aria-busy={busy}>
      {preview && page && source ? <OfficeCanvas preview={preview} page={page} assets={source.assets} /> : <div className="office-empty">{busy ? "正在准备模板内容…" : error ? "可重新预览，或尝试直接导出 DOCX。" : "暂无模板预览，可点击“重新预览”。"}</div>}
    </main>
    <footer className="slide-footer office-footer">
      <div className="slide-navigation">
        <button className="slide-control" type="button" disabled={busy || !preview || index <= 0} onClick={() => changePage(index - 1)}><ChevronLeft size={16} />上一页</button>
        <label className="slide-page-picker"><span className="sr-only">跳转页码</span><input key={`${index}-${preview?.pages.length}`} aria-label="跳转页码" type="number" inputMode="numeric" min={1} max={preview?.pages.length || 1} defaultValue={preview ? index + 1 : 0} disabled={busy || !preview} onBlur={event => { const value = Number(event.target.value); const target = changePage(Number.isFinite(value) && value >= 1 ? value - 1 : index); event.target.value = String(target + 1); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span>/ {preview?.pages.length || 0}</span></label>
        <button className="slide-control" type="button" disabled={busy || !preview || index >= preview.pages.length - 1} onClick={() => changePage(index + 1)}>下一页<ChevronRight size={16} /></button>
        <button className="slide-control" type="button" disabled={busy || !preview} onClick={() => setPanel("directory")}><List size={15} />目录</button>
        <button className="slide-control" type="button" disabled={busy || !page} onClick={() => setPanel("detail")}>展开本页</button>
      </div>
    </footer>
    {panel && <div className="slide-panel-backdrop" onClick={event => { if (event.target === event.currentTarget) closePanel(); }}><section className="slide-panel office-panel" data-office-panel role="dialog" aria-modal="true" aria-label={panel === "settings" ? "Office 导出设置" : panel === "directory" ? "模板目录" : "本页详细内容"}>
      <header><strong>{panel === "settings" ? "模板与封面信息" : panel === "directory" ? "模板目录" : "本页详细内容"}</strong><button className="slide-control" type="button" autoFocus onClick={closePanel}>返回放映</button></header>
      {panel === "settings" ? <form className="office-settings" onSubmit={event => { event.preventDefault(); setMetadata(draft); closePanel(); build(draft); }}>
        <label>PPTX 模板<select aria-label="PPTX 模板" value="aibs-v1" onChange={() => undefined}><option value="aibs-v1">aibs_ppt_template.pptx</option></select></label>
        <label>DOCX 模板<select aria-label="DOCX 模板" value="aibs-v1" onChange={() => undefined}><option value="aibs-v1">aibs_word_template.docx（通用文档）</option></select></label>
        <label>副标题（可选）<input value={draft.subtitle} maxLength={28} onChange={event => setDraft({ ...draft, subtitle: event.target.value })} /></label>
        <label>版本说明（可选）<input value={draft.version} maxLength={24} onChange={event => setDraft({ ...draft, version: event.target.value })} /></label>
        <label>页脚说明 / 保密级别（可选）<input value={draft.footer} maxLength={24} onChange={event => setDraft({ ...draft, footer: event.target.value })} /></label>
        <p>默认保留全文，不做 AI 摘要；不自动填写作者、版本或保密级别。沿用模板版权年份，不自动加入 SOD 专用声明。</p>
        <p>文字和表格可编辑；图表/公式为 PNG，Mermaid 源码进入 PPT 备注。中文使用 Noto Sans CJK SC，未嵌入字体；Word 自动目录与自动列表编号暂未适配。外链图片请先上传到本系统。</p>
        <button className="slide-control" type="submit">应用设置并预览</button>
      </form> : panel === "directory" ? <nav className="slide-directory">{preview?.pages.map((item, i) => <button key={i} type="button" aria-current={i === index ? "page" : undefined} onClick={() => changePage(i)}><span>{i + 1}</span><span>{item.title}</span></button>)}</nav> : page && source && <OfficePageText page={page} assets={source.assets} />}
    </section></div>}
  </div>;
}
