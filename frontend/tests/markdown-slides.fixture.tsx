import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MarkdownSlidesButton } from "../src/components/MarkdownSlidesButton";
import { MarkdownPreview } from "../src/components/MarkdownPreview";
import { markdownToHtml } from "../src/utils/markdown";
import { paginateMarkdownSlides, prepareMarkdownSlides } from "../src/utils/markdownSlides";
import { officeMediaPath, prepareOfficeSource } from "../src/utils/officeSource";
import "katex/dist/katex.min.css";
import "../src/styles.css";

Object.assign(window, { slidesTest: { markdownToHtml, paginateMarkdownSlides, prepareMarkdownSlides } });
Object.assign(window, { officeTest: { officeMediaPath, prepareOfficeSource } });

function Fixture() {
  const [markdown, setMarkdown] = useState("# 未保存草稿\n\n正文。");
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const viewport = useRef({ start: 0, end: 0, scroll: 0 });
  return <div style={{ padding: 24 }}>
    <h1>公共编辑器放映测试</h1>
    <textarea ref={ref} aria-label="测试正文" value={markdown} onChange={(event) => setMarkdown(event.target.value)} style={{ width: "100%", height: 200, color: "black" }} />
    <MarkdownSlidesButton markdown={markdown} getSourceLine={() => {
      const textarea = ref.current!;
      viewport.current = { start: textarea.selectionStart, end: textarea.selectionEnd, scroll: textarea.scrollTop };
      return markdown.slice(0, textarea.selectionStart).split("\n").length - 1;
    }} onReturn={() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(viewport.current.start, viewport.current.end);
      if (ref.current) ref.current.scrollTop = viewport.current.scroll;
    }} />
    <button type="button" onClick={() => setPreview(!preview)}>普通预览</button>
    {preview && <MarkdownPreview markdown={markdown} showSlides />}
  </div>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Fixture /></React.StrictMode>);
