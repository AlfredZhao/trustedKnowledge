import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { copyText } from "../utils/appUtils";
import { markdownToHtml } from "../utils/markdown";

export const MarkdownPreview = memo(
  forwardRef<HTMLDivElement, { markdown: string; sourceLine?: number | null }>(function MarkdownPreview({ markdown, sourceLine }, ref) {
    const html = useMemo(() => markdownToHtml(markdown, { sourceMap: sourceLine !== undefined && sourceLine !== null }), [markdown, sourceLine]);
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
      if (sourceLine === undefined || sourceLine === null || !previewRef.current) return;

      const preview = previewRef.current;
      const blocks = Array.from(preview.querySelectorAll<HTMLElement>("[data-markdown-source-start]"));
      const exactLineTargets = Array.from(preview.querySelectorAll<HTMLElement>(`[data-markdown-source-line="${sourceLine}"]`));
      const target = exactLineTargets.find((element) => element.tagName === "IMG") ?? exactLineTargets[0] ?? blocks.find((element) => {
        const start = Number(element.dataset.markdownSourceStart);
        const end = Number(element.dataset.markdownSourceEnd);
        return start <= sourceLine && sourceLine <= end;
      }) ?? (() => {
        const precedingBlocks = blocks.filter((element) => Number(element.dataset.markdownSourceEnd) < sourceLine);
        return precedingBlocks[precedingBlocks.length - 1] ?? blocks[0];
      })();
      if (!target) return;

      let isActive = true;
      let hasUserInteracted = false;
      let frameId: number | null = null;
      const stopAutoPositioning = () => {
        hasUserInteracted = true;
      };
      const positionTarget = () => {
        if (!isActive || hasUserInteracted) return;
        target.scrollIntoView({ block: "center" });
      };
      const schedulePositioning = () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        frameId = window.requestAnimationFrame(() => {
          frameId = null;
          positionTarget();
        });
      };
      const stopAfterImageLayoutSettles = window.setTimeout(() => {
        isActive = false;
      }, 2_000);

      // Images are lazy-loaded and can change the document height after the
      // preview first appears. Reapply the source-line position while the
      // transition is still active, but never take scrolling away from a user.
      const images = Array.from(preview.querySelectorAll("img"));
      images.forEach((image) => {
        if (!image.complete) {
          image.addEventListener("load", schedulePositioning);
          image.addEventListener("error", schedulePositioning);
        }
      });
      window.addEventListener("wheel", stopAutoPositioning, { capture: true, passive: true });
      window.addEventListener("touchstart", stopAutoPositioning, { capture: true, passive: true });
      window.addEventListener("pointerdown", stopAutoPositioning, { capture: true, passive: true });
      window.addEventListener("keydown", stopAutoPositioning, true);
      schedulePositioning();

      return () => {
        isActive = false;
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        window.clearTimeout(stopAfterImageLayoutSettles);
        images.forEach((image) => {
          image.removeEventListener("load", schedulePositioning);
          image.removeEventListener("error", schedulePositioning);
        });
        window.removeEventListener("wheel", stopAutoPositioning, true);
        window.removeEventListener("touchstart", stopAutoPositioning, true);
        window.removeEventListener("pointerdown", stopAutoPositioning, true);
        window.removeEventListener("keydown", stopAutoPositioning, true);
      };
    }, [html, sourceLine]);

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
