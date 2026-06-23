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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
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

    if (isMarkdownTableHeader(line) && index + 1 < lines.length && isMarkdownTableDelimiter(lines[index + 1])) {
      flushParagraph();
      flushList();

      const headerCells = parseMarkdownTableCells(line);
      const alignments = parseMarkdownTableAlignments(lines[index + 1]);
      const bodyRows: string[][] = [];

      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        bodyRows.push(parseMarkdownTableCells(lines[index]));
        index += 1;
      }
      index -= 1;

      html.push(renderMarkdownTable(headerCells, alignments, bodyRows));
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

export async function copyMarkdownAsEnhancedRichText(markdown: string) {
  const html = buildEnhancedRichClipboardHtml(markdownToHtml(markdown));
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

function buildEnhancedRichClipboardHtml(innerHtml: string) {
  return [
    '<article style="font-family: Georgia, Cambria, Times New Roman, serif; color: #2f1b1b; line-height: 1.85; font-size: 16px; background: #fffdfb;">',
    inlineEnhancedClipboardStyles(innerHtml),
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
    .replace(/<div class="tk-table-wrapper">/g, '<div style="margin: 0 0 12px; overflow-x: auto;">')
    .replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; border-spacing: 0; font-size: 14px; color: #111827;">')
    .replace(/<thead>/g, '<thead style="background: #f3f4f6;">')
    .replace(/<tbody>/g, '<tbody>')
    .replace(/<tr>/g, '<tr>')
    .replace(/<th(?=[\s>])/g, '<th style="border: 1px solid #d1d5db; padding: 8px 10px; font-weight: 700; text-align: left;"')
    .replace(/<td(?=[\s>])/g, '<td style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top;"')
    .replace(/<strong>/g, '<strong style="color: #000000; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #000000;">')
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ');
}

function inlineEnhancedClipboardStyles(html: string) {
  return html
    .replace(
      /<h1>(.*?)<\/h1>/g,
      '<h1 style="margin: 0 0 20px; padding-bottom: 14px; border-bottom: 1px solid #ead9d3; color: #5f1d1d; font-size: 28px; line-height: 1.32; font-weight: 700; letter-spacing: 0.02em; text-align: center;">$1</h1>',
    )
    .replace(
      /<h2>(.*?)<\/h2>/g,
      '<h2 style="margin: 28px 0 14px; padding: 10px 14px 10px 16px; border-left: 4px solid #7f1d1d; border-radius: 10px; background: linear-gradient(90deg, #f9ece8 0%, #fff7f3 100%); color: #7f1d1d; font-size: 20px; line-height: 1.45; font-weight: 700;">$1</h2>',
    )
    .replace(
      /<h3>(.*?)<\/h3>/g,
      '<h3 style="margin: 22px 0 10px; display: inline-block; padding: 0 0 4px; border-bottom: 2px solid #d6a79c; color: #8f2d2d; font-size: 17px; line-height: 1.45; font-weight: 700;">$1</h3>',
    )
    .replace(/<p>/g, '<p style="margin: 0 0 14px; color: #2f1b1b; text-align: justify;">')
    .replace(/<ul>/g, '<ul style="margin: 0 0 14px; padding-left: 24px; color: #2f1b1b;">')
    .replace(/<ol>/g, '<ol style="margin: 0 0 14px; padding-left: 24px; color: #2f1b1b;">')
    .replace(/<li>/g, '<li style="margin: 0 0 6px; color: #2f1b1b;">')
    .replace(
      /<blockquote>/g,
      '<blockquote style="margin: 0 0 14px; padding: 12px 14px; border-left: 3px solid #c08475; border-radius: 0 10px 10px 0; background: #fbf4f1; color: #6b3a32;">',
    )
    .replace(
      /<pre>/g,
      '<pre style="margin: 0 0 14px; padding: 14px 16px; border-radius: 12px; background: #2a1f1d; color: #fdf4f1; white-space: pre-wrap;">',
    )
    .replace(
      /<code([^>]*)>/g,
      '<code$1 style="font-family: Consolas, Menlo, Monaco, monospace; border-radius: 4px; background: rgba(127, 29, 29, 0.08); color: #7f1d1d; padding: 0.08rem 0.32rem;">',
    )
    .replace(/<div class="tk-table-wrapper">/g, '<div style="margin: 0 0 16px; overflow-x: auto; border-radius: 12px; border: 1px solid #ead9d3;">')
    .replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; border-spacing: 0; font-size: 15px; color: #2f1b1b; background: #fffdfb;">')
    .replace(/<thead>/g, '<thead style="background: linear-gradient(90deg, #f8ebe6 0%, #fdf7f4 100%);">')
    .replace(/<tbody>/g, '<tbody>')
    .replace(/<tr>/g, '<tr>')
    .replace(/<th(?=[\s>])/g, '<th style="border: 1px solid #ead9d3; padding: 10px 12px; font-weight: 700; text-align: left; color: #7f1d1d;"')
    .replace(/<td(?=[\s>])/g, '<td style="border: 1px solid #f1dfda; padding: 10px 12px; text-align: left; vertical-align: top;"')
    .replace(/<pre([^>]*)><code([^>]*) style="([^"]*)">/g, '<pre$1><code$2 style="font-family: Consolas, Menlo, Monaco, monospace; background: transparent; color: #fdf4f1; padding: 0;">')
    .replace(/<strong>/g, '<strong style="color: #5f1d1d; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #7c4a43;">')
    .replace(/<a /g, '<a style="color: #8f2d2d; text-decoration: underline; text-decoration-color: #d6a79c; text-underline-offset: 3px;" ');
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

function isMarkdownTableHeader(line: string) {
  const trimmed = line.trim();
  return trimmed.includes("|") && parseMarkdownTableCells(trimmed).length > 1;
}

function isMarkdownTableDelimiter(line: string) {
  const cells = parseMarkdownTableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes("|")) return false;
  if (/^```/.test(trimmed)) return false;
  return parseMarkdownTableCells(trimmed).length > 1;
}

function parseMarkdownTableAlignments(line: string) {
  return parseMarkdownTableCells(line).map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
    if (trimmed.endsWith(":")) return "right";
    if (trimmed.startsWith(":")) return "left";
    return "";
  });
}

function parseMarkdownTableCells(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of trimmed) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function renderMarkdownTable(headers: string[], alignments: string[], rows: string[][]) {
  const normalizeCellCount = (cells: string[]) =>
    Array.from({ length: headers.length }, (_value, index) => cells[index] ?? "");
  const renderAlignment = (alignment: string) => (alignment ? ` data-align="${alignment}"` : "");

  const headerHtml = normalizeCellCount(headers)
    .map((cell, index) => `<th${renderAlignment(alignments[index] ?? "")}>${formatInlineMarkdown(cell)}</th>`)
    .join("");

  const bodyHtml = rows
    .map((row) => {
      const cells = normalizeCellCount(row)
        .map((cell, index) => `<td${renderAlignment(alignments[index] ?? "")}>${formatInlineMarkdown(cell)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div class="tk-table-wrapper"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
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
