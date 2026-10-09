import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { MarkdownSlidesBoundary } from "./MarkdownSlidesBoundary";
import { watchSlideSession, type SlideSnapshot } from "../utils/markdownSlidesSession";

const Workspace = lazy(() => import("./MarkdownOfficeWorkspace"));

export default function MarkdownOfficeButton({ markdown, disabled, getSourceLine, onReturn }: {
  markdown: string; disabled?: boolean; getSourceLine?: () => number; onReturn?: () => void;
}) {
  const [snapshot, setSnapshot] = useState<SlideSnapshot | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const returnRef = useRef(onReturn); returnRef.current = onReturn;
  useEffect(() => {
    if (!snapshot) return;
    const root = document.getElementById("root"), wasInert = root?.inert, overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    const stop = watchSlideSession(() => setSnapshot(null));
    return () => {
      stop(); if (root) root.inert = wasInert ?? false; document.body.style.overflow = overflow;
      button.current?.focus({ preventScroll: true }); returnRef.current?.();
    };
  }, [snapshot]);
  return <>
    <button ref={button} className="markdown-tool-button" type="button" title="按 AIBS 模板导出当前 Markdown 为 PPTX 或 DOCX；无需先保存" disabled={disabled || !markdown.trim()} onMouseDown={event => event.preventDefault()} onClick={() => setSnapshot({ markdown, sourceLine: getSourceLine?.() || 0, title: markdown.match(/^#{1,2}\s+(.+)$/m)?.[1]?.slice(0, 120) || "Markdown 文档" })}><Download size={15} /><span>导出</span></button>
    {snapshot && createPortal(<MarkdownSlidesBoundary onClose={() => setSnapshot(null)}><Suspense fallback={<div className="slide-screen slide-status" role="dialog" aria-modal="true" aria-label="加载 Office 导出"><p role="status">正在加载导出工具…</p><button className="slide-control" type="button" autoFocus onClick={() => setSnapshot(null)}>返回编辑</button></div>}><Workspace snapshot={snapshot} onClose={() => setSnapshot(null)} /></Suspense></MarkdownSlidesBoundary>, document.body)}
  </>;
}
