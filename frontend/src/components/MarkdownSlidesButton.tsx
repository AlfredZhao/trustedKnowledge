import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Presentation } from "lucide-react";
import { MarkdownSlidesBoundary } from "./MarkdownSlidesBoundary";
import MarkdownOfficeButton from "./MarkdownOfficeButton";

import { openSlideWindow, preferInlineSlides, watchSlideSession, type SlideSnapshot } from "../utils/markdownSlidesSession";

const MarkdownSlides = lazy(() => import("./MarkdownSlides"));

export function MarkdownSlidesButton({ markdown, getSourceLine, onReturn, disabled = false }: {
  markdown: string;
  getSourceLine?: () => number;
  onReturn?: () => void;
  disabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<SlideSnapshot | null>(null);
  const [notice, setNotice] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef(onReturn);
  returnRef.current = onReturn;

  useEffect(() => {
    if (!snapshot) return;
    const root = document.getElementById("root");
    const wasInert = root?.inert;
    const overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    const stopWatching = watchSlideSession(() => setSnapshot(null));
    return () => {
      stopWatching();
      if (root) root.inert = wasInert ?? false;
      document.body.style.overflow = overflow;
      buttonRef.current?.focus({ preventScroll: true });
      returnRef.current?.();
    };
  }, [snapshot]);

  const open = () => {
    const next = {
      markdown,
      sourceLine: getSourceLine?.() ?? 0,
      title: markdown.match(/^#{1,2}\s+(.+)$/m)?.[1]?.slice(0, 120) || "Markdown 幻灯片",
    };
    if (!preferInlineSlides() && openSlideWindow(next)) return;
    setNotice(preferInlineSlides() ? "" : "新标签页未能打开，已在当前页面放映。");
    setSnapshot(next);
  };

  return <>
    <span className="markdown-output-tools inline-flex max-w-full flex-wrap items-center gap-1.5">
    <button ref={buttonRef} className="markdown-tool-button" disabled={disabled || !markdown.trim()}
      title="幻灯片：桌面新标签页放映，手机/PWA 在当前页放映；不保存或修改正文" type="button"
      onMouseDown={(event) => event.preventDefault()} onClick={open}>
      <Presentation size={15} /><span>幻灯片</span>
    </button>
    <MarkdownOfficeButton markdown={markdown} disabled={disabled} getSourceLine={getSourceLine} onReturn={onReturn} />
    </span>
    {snapshot && createPortal(
      <MarkdownSlidesBoundary onClose={() => setSnapshot(null)}>
      <Suspense fallback={<div className="slide-screen slide-status" role="dialog" aria-modal="true" aria-label="加载幻灯片"><p role="status">正在加载幻灯片…</p><button className="slide-control" type="button" autoFocus onClick={() => setSnapshot(null)}>返回编辑</button></div>}>
        <MarkdownSlides snapshot={snapshot} notice={notice} onClose={() => setSnapshot(null)} />
      </Suspense></MarkdownSlidesBoundary>, document.body,
    )}
  </>;
}
