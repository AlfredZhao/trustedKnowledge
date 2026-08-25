import { forwardRef, memo, useMemo } from "react";

import { copyText } from "../utils/appUtils";
import { markdownToHtml } from "../utils/markdown";

export const MarkdownPreview = memo(
  forwardRef<HTMLDivElement, { markdown: string }>(function MarkdownPreview({ markdown }, ref) {
    const html = useMemo(() => markdownToHtml(markdown), [markdown]);

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
        ref={ref}
        className="markdown-preview rounded-lg border border-white/8 bg-black/10 p-4 text-sm leading-7 text-slate-200"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handlePreviewClick}
      />
    );
  }),
);
