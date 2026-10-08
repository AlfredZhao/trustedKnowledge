import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, List, Maximize, Minimize, Moon, Sun, X } from "lucide-react";

import { MarkdownPreview } from "./MarkdownPreview";
import { copyText } from "../utils/appUtils";
import { paginateMarkdownSlides, prepareMarkdownSlides, slideIndexForAnchor, type MarkdownSlide, type SlideAnchor } from "../utils/markdownSlides";
import type { SlideSnapshot } from "../utils/markdownSlidesSession";

export default function MarkdownSlides({ snapshot, onClose, notice = "", standalone = false }: {
  snapshot: SlideSnapshot;
  onClose: () => void;
  notice?: string;
  standalone?: boolean;
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<SlideAnchor | null>(null);
  const refreshTimer = useRef<number | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [slides, setSlides] = useState<MarkdownSlide[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(notice);
  const [directory, setDirectory] = useState(false);
  const [detail, setDetail] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [light, setLight] = useState(document.documentElement.dataset.theme === "light");
  const prepared = useMemo(() => prepareMarkdownSlides(snapshot.markdown), [snapshot.markdown]);
  const slide = slides[index];

  const refresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => setRevision((value) => value + 1), 80);
  }, []);
  const rendered = useCallback(() => { setReady(true); refresh(); }, [refresh]);

  useEffect(() => {
    screenRef.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    const originalTheme = document.documentElement.dataset.theme;
    const originalColorScheme = document.documentElement.style.colorScheme;
    if (standalone) document.body.style.overflow = "hidden";
    const viewport = viewportRef.current!;
    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      setDimensions((current) => {
        const next = { width: Math.floor(rect.width), height: Math.floor(rect.height) };
        return current.width === next.width && current.height === next.height ? current : next;
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    const onFullscreen = () => setFullscreen(document.fullscreenElement === screenRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.fonts.addEventListener("loadingdone", refresh);
    document.fonts.addEventListener("loadingerror", refresh);
    let active = true;
    void document.fonts.ready.then(() => { if (active) refresh(); });
    return () => {
      active = false;
      window.clearTimeout(refreshTimer.current);
      observer.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.fonts.removeEventListener("loadingdone", refresh);
      document.fonts.removeEventListener("loadingerror", refresh);
      if (standalone) document.body.style.overflow = overflow;
      else {
        if (originalTheme) document.documentElement.dataset.theme = originalTheme;
        else delete document.documentElement.dataset.theme;
        document.documentElement.style.colorScheme = originalColorScheme;
      }
    };
  }, [refresh, standalone]);

  useEffect(() => {
    sourceRef.current?.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
  }, [prepared.markdown]);

  useEffect(() => {
    if (!ready || dimensions.width < 40 || dimensions.height < 40 || !sourceRef.current || !measureRef.current) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    void paginateMarkdownSlides(sourceRef.current, measureRef.current, dimensions.width, dimensions.height, prepared.breaks, () => cancelled)
      .then((pages) => {
        if (cancelled) return;
        let nextIndex = anchorRef.current ? slideIndexForAnchor(pages, anchorRef.current) : pages.findIndex((page) => page.sourceEnd >= snapshot.sourceLine);
        if (nextIndex < 0) nextIndex = Math.max(0, pages.length - 1);
        setSlides(pages);
        setIndex(nextIndex);
        anchorRef.current = pages[nextIndex]?.anchor ?? null;
        setBusy(false);
      }).catch(() => {
        if (cancelled) return;
        setError("自动分页失败，请重试或返回编辑器使用普通预览。");
        setBusy(false);
      });
    return () => { cancelled = true; };
  }, [ready, dimensions, prepared.breaks, revision, snapshot.sourceLine]);

  const goTo = (next: number) => {
    if (busy) return;
    const bounded = Math.max(0, Math.min(slides.length - 1, next));
    setIndex(bounded);
    anchorRef.current = slides[bounded]?.anchor ?? null;
    setDirectory(false);
    setDetail(false);
  };

  const close = () => {
    if (document.fullscreenElement === screenRef.current) void document.exitFullscreen().catch(() => undefined);
    onClose();
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === screenRef.current) await document.exitFullscreen();
      else if (screenRef.current?.requestFullscreen) await screenRef.current.requestFullscreen();
      else setMessage("此浏览器不支持全屏，仍可在当前页面放映。");
    } catch { setMessage("浏览器未允许全屏，仍可在当前页面放映。"); }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Portals still bubble through the editor's React tree. Don't trigger editor/dialog shortcuts.
    event.stopPropagation();
    if (event.key === "Tab") {
      const scope = screenRef.current?.querySelector<HTMLElement>("[data-slide-panel]") ?? screenRef.current;
      const controls = Array.from(scope?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], select, input, [tabindex='0']") ?? [])
        .filter((node) => !node.closest("[data-slide-hidden]") && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (first && (!scope?.contains(document.activeElement) || document.activeElement === screenRef.current
        || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (detail || directory) {
        setDetail(false);
        setDirectory(false);
        screenRef.current?.focus({ preventScroll: true });
      }
      else if (document.fullscreenElement === screenRef.current) void toggleFullscreen();
      else close();
      return;
    }
    if (detail || directory || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    const target = event.target as Element;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (["ArrowDown", "ArrowRight", "PageDown", "ArrowUp", "ArrowLeft", "PageUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") goTo(0);
      else if (event.key === "End") goTo(slides.length - 1);
      else goTo(index + (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key) ? 1 : -1));
    }
  };

  const handleContentClick = async (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    const button = target.closest<HTMLButtonElement>("[data-copy-code-block]");
    if (button) {
      const code = button.closest("[data-code-block]")?.querySelector("code")?.textContent;
      if (code === undefined || code === null) return;
      const label = button.textContent;
      try { await copyText(code); button.textContent = "已复制"; } catch { button.textContent = "复制失败"; }
      window.setTimeout(() => { button.textContent = label; }, 1600);
    } else if (target.closest("img, svg, .tk-math-block") && !target.closest("a")) setDetail(true);
  };

  const sizeStyle = { width: dimensions.width, "--slide-height": `${dimensions.height}px` } as CSSProperties;
  return <div ref={screenRef} className="slide-screen" role="dialog" aria-modal="true" aria-label="Markdown 幻灯片" tabIndex={-1}
    onKeyDown={handleKeyDown} onClick={(event) => event.stopPropagation()}>
    <header className="slide-header">
      <div className="slide-heading"><strong title={snapshot.title}>{snapshot.title}</strong><span>只读快照 · 不修改正文</span></div>
      <div className="slide-actions">
        <button className="slide-control" type="button" disabled={!slides.length || busy} aria-expanded={directory} onClick={() => { setDirectory(!directory); setDetail(false); }}><List size={16} />目录</button>
        <button className="slide-control" type="button" onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}<span>{fullscreen ? "退出全屏" : "全屏"}</span></button>
        <button className="slide-control" type="button" aria-label={light ? "切换深色主题" : "切换浅色主题"} onClick={() => {
          setBusy(true);
          document.documentElement.dataset.theme = light ? "dark" : "light";
          document.documentElement.style.colorScheme = light ? "dark" : "light";
          setLight(!light);
        }}>{light ? <Moon size={16} /> : <Sun size={16} />}{light ? "深色" : "浅色"}</button>
        <button className="slide-control" type="button" onClick={close}><X size={16} />{standalone ? "关闭" : "返回编辑"}</button>
      </div>
    </header>

    <main className="slide-stage">
      <article className="slide-page" aria-busy={busy}>
        <div ref={viewportRef} className="slide-viewport">
          {slide && !error && <div className="markdown-preview slide-content" style={{ "--slide-height": `${dimensions.height}px` } as CSSProperties}
            data-slide-page={index + 1} dangerouslySetInnerHTML={{ __html: slide.html }} onClick={(event) => void handleContentClick(event)} />}
          {(!slide || busy || error) && <div className="slide-loading" role="status">
            {error || (busy ? "正在按屏幕尺寸分页…" : "暂无可放映的内容。")}
            {error && <button className="slide-control" type="button" onClick={refresh}>重试</button>}
          </div>}
        </div>
      </article>
    </main>

    <footer className="slide-footer">
      <div className="slide-navigation">
        <button className="slide-control" type="button" disabled={busy || index <= 0} onClick={() => goTo(index - 1)}><ChevronLeft size={18} />上一页</button>
        <label className="slide-page-picker"><span className="sr-only">跳转页码</span>
          <input aria-label="跳转页码" inputMode="numeric" type="number" min={1} max={slides.length || 1} disabled={busy || !slides.length}
            key={`${index}-${slides.length}`} defaultValue={slides.length ? index + 1 : 0}
            onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1) goTo(value - 1); event.target.value = String(index + 1); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
          <span aria-live="polite">/ {slides.length}</span>
        </label>
        <button className="slide-control" type="button" disabled={busy || !slides.length || index >= slides.length - 1} onClick={() => goTo(index + 1)}>下一页<ChevronRight size={18} /></button>
      </div>
      <div className="slide-caption">
        <span title={message || slide?.title}>{message || slide?.title || "幻灯片"}{slide?.scaled ? " · 复杂内容已适配缩放" : ""}</span>
        <button type="button" disabled={!slide || busy} onClick={() => setDetail(true)}>展开本页</button>
      </div>
    </footer>

    {(directory || detail) && <div className="slide-panel-backdrop" onClick={(event) => { if (event.target === event.currentTarget) { setDirectory(false); setDetail(false); screenRef.current?.focus({ preventScroll: true }); } }}>
      <section className="slide-panel" data-slide-panel role="dialog" aria-modal="true" aria-label={directory ? "幻灯片目录" : "本页详细内容"}>
        <header><strong>{directory ? "目录 · 点击跳转" : "本页详细内容（可滚动）"}</strong><button className="slide-control" type="button" autoFocus onClick={() => { setDirectory(false); setDetail(false); screenRef.current?.focus(); }}>返回放映</button></header>
        {directory ? <nav className="slide-directory">{slides.map((page, pageIndex) => <button key={pageIndex} type="button" aria-current={pageIndex === index ? "page" : undefined} onClick={() => { goTo(pageIndex); screenRef.current?.focus(); }}><span>{pageIndex + 1}</span><span>{page.title}{pageIndex > 0 && slides[pageIndex - 1].title === page.title ? "（续）" : ""}</span></button>)}</nav>
          : <div className="markdown-preview slide-detail-content" dangerouslySetInnerHTML={{ __html: slide?.detailHtml ?? "" }} onClick={(event) => void handleContentClick(event)} />}
      </section>
    </div>}

    <div data-slide-hidden className="slide-hidden" aria-hidden="true" inert style={sizeStyle}
      onLoadCapture={refresh} onErrorCapture={() => { setMessage("部分图片加载失败，保留原图链接；可返回普通预览检查。"); refresh(); }}>
      <MarkdownPreview ref={sourceRef} markdown={prepared.markdown} sourceMap className="markdown-preview slide-content" onRenderSettled={rendered} />
    </div>
    <div ref={measureRef} data-slide-hidden className="slide-hidden markdown-preview slide-content" aria-hidden="true" inert style={sizeStyle} />
  </div>;
}
