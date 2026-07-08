import { forwardRef, memo, useMemo } from "react";

import { markdownToHtml } from "../utils/markdown";

export const MarkdownPreview = memo(
  forwardRef<HTMLDivElement, { markdown: string }>(function MarkdownPreview({ markdown }, ref) {
    const html = useMemo(() => markdownToHtml(markdown), [markdown]);

    return (
      <div
        ref={ref}
        className="markdown-preview rounded-lg border border-white/8 bg-black/10 p-4 text-sm leading-7 text-slate-200"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }),
);
