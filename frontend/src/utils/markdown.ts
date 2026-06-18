export function markdownToHtml(markdown: string) {
  const lines = removeLeakedMarkdownCodePlaceholders(markdown).replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${formatInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushCodeBlock = () => {
    const languageClass = codeLanguage ? ` class="language-${escapeAttribute(codeLanguage)}"` : "";
    html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    inCodeBlock = false;
    codeLanguage = "";
    codeLines = [];
  };

  for (const line of lines) {
    const codeFence = line.match(/^```(\S*)\s*$/);
    if (codeFence) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLanguage = codeFence[1] ?? "";
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${formatInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${formatInlineMarkdown(quote[1])}</p></blockquote>`);
      continue;
    }

    const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (unorderedItem) {
      flushParagraph();
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedItem[1]);
      continue;
    }

    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedItem[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCodeBlock) flushCodeBlock();
  flushParagraph();
  flushList();

  return html.join("");
}

export async function copyMarkdownAsRichText(markdown: string) {
  const html = buildRichClipboardHtml(markdownToHtml(markdown));
  if (copyRichHtmlViaCopyEvent(html, markdown)) {
    return;
  }

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Fall back to plain Markdown when rich clipboard writes are blocked.
    }
  }

  await copyMarkdownAsPlainText(markdown);
}

export async function copyMarkdownAsPlainText(markdown: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(markdown);
      return;
    } catch {
      // Fall back for browsers that block Clipboard API on this origin.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = markdown;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("copy command rejected");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export function removeLeakedMarkdownCodePlaceholders(markdown: string) {
  return markdown
    .replace(/[ \t]*(?:@@CODE_?\d+@@|\uE000CODE_?\d+\uE001)[ \t]*/g, (match: string, offset: number, source: string) => {
      const before = offset > 0 ? source[offset - 1] : "";
      const after = source[offset + match.length] ?? "";
      return shouldKeepPlaceholderGap(before, after) ? " " : "";
    })
    .replace(/[ \t]{2,}/g, " ");
}

function buildRichClipboardHtml(innerHtml: string) {
  return [
    '<article style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, Arial, sans-serif; color: #000000; line-height: 1.65; font-size: 14px;">',
    inlineClipboardStyles(innerHtml),
    "</article>",
  ].join("");
}

function copyRichHtmlViaCopyEvent(html: string, text: string) {
  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", text);
  };

  document.addEventListener("copy", handleCopy, { once: true });
  try {
    return document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", handleCopy);
  }
}

function inlineClipboardStyles(html: string) {
  return html
    .replace(/<h1>/g, '<h1 style="margin: 0 0 12px; color: #111827; font-size: 22px; line-height: 1.35; font-weight: 700;">')
    .replace(/<h2>/g, '<h2 style="margin: 16px 0 8px; color: #111827; font-size: 18px; line-height: 1.35; font-weight: 700;">')
    .replace(/<h3>/g, '<h3 style="margin: 14px 0 8px; color: #111827; font-size: 16px; line-height: 1.35; font-weight: 700;">')
    .replace(/<p>/g, '<p style="margin: 0 0 10px; color: #000000;">')
    .replace(/<ul>/g, '<ul style="margin: 0 0 10px; padding-left: 22px; color: #000000;">')
    .replace(/<ol>/g, '<ol style="margin: 0 0 10px; padding-left: 22px; color: #000000;">')
    .replace(/<li>/g, '<li style="margin: 0 0 4px; color: #000000;">')
    .replace(/<blockquote>/g, '<blockquote style="margin: 0 0 10px; padding-left: 12px; border-left: 3px solid #d1d5db; color: #374151;">')
    .replace(/<pre>/g, '<pre style="margin: 0 0 10px; padding: 0; color: #000000; white-space: pre-wrap;">')
    .replace(/<code([^>]*)>/g, '<code$1 style="font-family: Consolas, Menlo, Monaco, monospace; color: #000000;">')
    .replace(/<strong>/g, '<strong style="color: #000000; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #000000;">')
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ');
}

function formatInlineMarkdown(value: string) {
  const codeSegments: string[] = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code: string) => {
    const index = codeSegments.push(`<code>${code}</code>`) - 1;
    return `${INLINE_CODE_MARKER_PREFIX}${index}${INLINE_CODE_MARKER_SUFFIX}`;
  });

  html = html
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = sanitizeMarkdownUrl(href);
      return safeHref ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");

  return html.replace(INLINE_CODE_MARKER_PATTERN, (_match, index: string) => codeSegments[Number(index)] ?? "");
}

const INLINE_CODE_MARKER_PREFIX = "TKMDINLINECODE";
const INLINE_CODE_MARKER_SUFFIX = "ENDTK";
const INLINE_CODE_MARKER_PATTERN = new RegExp(`${INLINE_CODE_MARKER_PREFIX}(\\d+)${INLINE_CODE_MARKER_SUFFIX}`, "g");

function shouldKeepPlaceholderGap(before: string, after: string) {
  return /[A-Za-z0-9)\]]/.test(before) && /[A-Za-z0-9([]/.test(after);
}

function sanitizeMarkdownUrl(value: string) {
  const unescaped = value.replace(/&amp;/g, "&");
  if (/^(https?:|mailto:)/i.test(unescaped)) return unescaped;
  if (unescaped.startsWith("#") || unescaped.startsWith("/")) return unescaped;
  return "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
