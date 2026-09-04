import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { copyText } from "../utils/appUtils";
import { markdownToHtml } from "../utils/markdown";

export const MarkdownPreview = memo(
  forwardRef<HTMLDivElement, { markdown: string; scrollAnchor?: string }>(function MarkdownPreview({ markdown, scrollAnchor }, ref) {
    const html = useMemo(() => markdownToHtml(markdown), [markdown]);
    const previewRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => previewRef.current as HTMLDivElement, []);

    useEffect(() => {
      let disposed = false;

      async function renderMermaidDiagrams() {
        const preview = previewRef.current;
        if (!preview) return;
        const targets = Array.from(preview.querySelectorAll<HTMLElement>("[data-mermaid-render]"));
        if (!targets.length) return;
        const { default: mermaid } = await import("mermaid");
        if (disposed) return;
        const isLight = document.documentElement.dataset.theme === "light";
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          htmlLabels: false,
          theme: "base",
          themeVariables: isLight
            ? { primaryColor: "#e0f2fe", primaryTextColor: "#0f172a", primaryBorderColor: "#0284c7", lineColor: "#334155", secondaryColor: "#f8fafc", tertiaryColor: "#f0fdfa" }
            : { primaryColor: "#123047", primaryTextColor: "#e2e8f0", primaryBorderColor: "#7dd3fc", lineColor: "#cbd5e1", secondaryColor: "#0f172a", tertiaryColor: "#112c36" },
        });
        for (const [index, target] of targets.entries()) {
          const block = target.closest("[data-mermaid-block]");
          const source = block?.querySelector<HTMLElement>("[data-mermaid-source]")?.textContent ?? "";
          if (source.length > 20_000) {
            target.textContent = "Mermaid 源码超过 20,000 字符，未渲染。";
            continue;
          }
          try {
            const rendered = await mermaid.render(`tk-mermaid-${Date.now()}-${index}`, source);
            if (disposed) return;
            target.innerHTML = rendered.svg;
            rendered.bindFunctions?.(target);
          } catch {
            if (!disposed) target.textContent = "Mermaid 图表渲染失败，请查看下方源码。";
          }
        }
      }

      void renderMermaidDiagrams();
      const observer = new MutationObserver(() => void renderMermaidDiagrams());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => {
        disposed = true;
        observer.disconnect();
      };
    }, [html]);

    useEffect(() => {
      const anchor = scrollAnchor?.trim();
      if (!anchor || !previewRef.current) return;

      const normalize = (value: string) => value
        .replace(/^(?:#{1,4}\s+|>\s?|[-*]\s+|\d+\.\s+|- \[[ xX]\]\s+)/, "")
        .replace(/[`*_~|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const targetText = normalize(anchor);
      if (targetText.length < 2) return;

      const target = Array.from(previewRef.current.querySelectorAll<HTMLElement>(
        "h1, h2, h3, h4, p, li, blockquote, .markdown-code-block, .markdown-mermaid-block, .tk-table-wrapper",
      )).find((element) => normalize(element.textContent ?? "").includes(targetText));
      target?.scrollIntoView({ block: "center" });
    }, [html, scrollAnchor]);

    async function handlePreviewClick(event: React.MouseEvent<HTMLDivElement>) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("[data-copy-code-block]");
      if (!button) return;
      const code = button.closest("[data-code-block]")?.querySelector("code")?.textContent;
      if (code === undefined || code === null) return;

      const originalLabel = button.textContent;
      try {
        await copyText(code);
        button.textContent = "已复制";
      } catch {
        button.textContent = "复制失败";
      }
      window.setTimeout(() => {
        button.textContent = originalLabel || "复制";
      }, 1600);
    }

    return (
      <div
        ref={previewRef}
        className="markdown-preview rounded-lg border border-white/8 bg-black/10 p-4 text-sm leading-7 text-slate-200"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handlePreviewClick}
      />
    );
  }),
);
