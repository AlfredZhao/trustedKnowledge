interface EnhancedCopyOptions {
  downloadFileName?: string | null;
  documentTitle?: string | null;
}

export function markdownToHtml(markdown: string) {
  const lines = removeLeakedMarkdownCodePlaceholders(markdown).replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];
  let inMathBlock = false;
  let mathLines: string[] = [];

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

  const flushMathBlock = () => {
    html.push(renderLatexBlock(mathLines.join("\n")));
    inMathBlock = false;
    mathLines = [];
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

    if (inMathBlock) {
      const trimmed = line.trim();
      if (trimmed.endsWith("$$")) {
        const closingContent = trimmed.slice(0, -2).trim();
        if (closingContent) mathLines.push(closingContent);
        flushMathBlock();
      } else {
        mathLines.push(line);
      }
      continue;
    }

    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("$$")) {
      flushParagraph();
      flushList();

      const inlineMathContent = extractSingleLineMathBlock(trimmedLine);
      if (inlineMathContent !== null) {
        html.push(renderLatexBlock(inlineMathContent));
        continue;
      }

      const openingContent = trimmedLine.slice(2).trim();
      inMathBlock = true;
      mathLines = openingContent ? [openingContent] : [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isMarkdownHorizontalRule(line)) {
      flushParagraph();
      flushList();
      html.push("<hr />");
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

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
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
  if (inMathBlock) flushMathBlock();
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

export async function copyMarkdownAsEnhancedRichText(markdown: string, options?: EnhancedCopyOptions) {
  const html = await inlineClipboardImages(buildEnhancedRichClipboardHtml(markdownToHtml(markdown)));
  const fullDocument = buildStandaloneClipboardDocument(html, options?.documentTitle);

  try {
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
  } finally {
    triggerHtmlDownload(fullDocument, options?.downloadFileName);
  }
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
    });
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

function buildStandaloneClipboardDocument(bodyHtml: string, title: string | null | undefined) {
  const safeTitle = escapeHtml(title?.trim() || "trustedKnowledge export");
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${safeTitle}</title>`,
    "</head>",
    `<body style="margin:0; padding:32px 20px; background:#f7f1ee;">${buildStandaloneCopyToolbar()}${bodyHtml}${buildStandaloneCopyScript()}</body>`,
    "</html>",
  ].join("");
}

function buildStandaloneCopyToolbar() {
  const buttonStyle =
    "display:inline-flex;align-items:center;justify-content:center;min-height:36px;border:1px solid #d8b8ae;border-radius:8px;background:#fffdfb;color:#7f1d1d;padding:0 14px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(95,29,29,0.08);";

  return [
    '<div data-tk-export-toolbar style="max-width:760px;margin:0 auto 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-end;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Microsoft YaHei,Arial,sans-serif;">',
    `<button type="button" data-copy-title style="${buttonStyle}">复制标题</button>`,
    `<button type="button" data-copy-body style="${buttonStyle}">复制正文</button>`,
    "</div>",
  ].join("");
}

function buildStandaloneCopyScript() {
  return [
    "<script>",
    "(() => {",
    "  const titleButton = document.querySelector('[data-copy-title]');",
    "  const bodyButton = document.querySelector('[data-copy-body]');",
    "  const article = document.querySelector('article');",
    "  const buttonDefaults = new WeakMap();",
    "  const setButtonState = (button, text) => {",
    "    if (!button) return;",
    "    if (!buttonDefaults.has(button)) buttonDefaults.set(button, button.textContent || '');",
    "    button.textContent = text;",
    "    window.setTimeout(() => { button.textContent = buttonDefaults.get(button) || ''; }, 1400);",
    "  };",
    "  const copyPlainText = async (text) => {",
    "    if (navigator.clipboard?.writeText) {",
    "      try {",
    "        await navigator.clipboard.writeText(text);",
    "        return;",
    "      } catch {",
    "        // Fall back to a selection-based copy when local files cannot use Clipboard API.",
    "      }",
    "    }",
    "    const textarea = document.createElement('textarea');",
    "    textarea.value = text;",
    "    textarea.setAttribute('readonly', 'true');",
    "    textarea.style.position = 'fixed';",
    "    textarea.style.left = '-9999px';",
    "    document.body.appendChild(textarea);",
    "    textarea.select();",
    "    try { document.execCommand('copy'); } finally { document.body.removeChild(textarea); }",
    "  };",
    "  const copyElementRichText = async (element) => {",
    "    const container = document.createElement('div');",
    "    container.style.position = 'fixed';",
    "    container.style.left = '-9999px';",
    "    container.style.top = '0';",
    "    container.appendChild(element);",
    "    document.body.appendChild(container);",
    "    const html = container.innerHTML;",
    "    const text = (container.innerText || container.textContent || '').trim();",
    "    try {",
    "      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {",
    "        try {",
    "          await navigator.clipboard.write([new ClipboardItem({",
    "            'text/html': new Blob([html], { type: 'text/html' }),",
    "            'text/plain': new Blob([text], { type: 'text/plain' }),",
    "          })]);",
    "          return;",
    "        } catch {",
    "          // Fall back to document selection when rich Clipboard API is blocked.",
    "        }",
    "      }",
    "      const range = document.createRange();",
    "      range.selectNodeContents(container);",
    "      const selection = window.getSelection();",
    "      selection?.removeAllRanges();",
    "      selection?.addRange(range);",
    "      document.execCommand('copy');",
    "      selection?.removeAllRanges();",
    "    } finally {",
    "      document.body.removeChild(container);",
    "    }",
    "  };",
    "  titleButton?.addEventListener('click', async () => {",
    "    const title = (article?.querySelector('h1')?.textContent || document.title || '').trim();",
    "    if (!title) return;",
    "    try { await copyPlainText(title); setButtonState(titleButton, '已复制标题'); } catch { setButtonState(titleButton, '复制失败'); }",
    "  });",
    "  bodyButton?.addEventListener('click', async () => {",
    "    if (!article) return;",
    "    const clone = article.cloneNode(true);",
    "    if (clone.firstElementChild?.tagName?.toLowerCase() === 'h1') clone.firstElementChild.remove();",
    "    if (!(clone.textContent || '').trim()) return;",
    "    try { await copyElementRichText(clone); setButtonState(bodyButton, '已复制正文'); } catch { setButtonState(bodyButton, '复制失败'); }",
    "  });",
    "})();",
    "</script>",
  ].join("\n");
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
    .replace(
      /<pre>/g,
      '<pre style="margin: 0 0 10px; padding: 0; color: #000000; white-space: pre; overflow-x: auto; overflow-y: hidden;">',
    )
    .replace(/<code([^>]*)>/g, '<code$1 style="font-family: Consolas, Menlo, Monaco, monospace; color: #000000;">')
    .replace(
      /<div class="tk-math-block">/g,
      '<div style="margin: 0 0 12px; overflow-x: auto; border: 1px solid #d1d5db; border-radius: 12px; background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%); padding: 14px 16px; text-align: center;">',
    )
    .replace(
      /<div class="tk-math-content">/g,
      '<div style="display: inline-block; min-width: max-content; color: #111827; font-family: Cambria Math, STIX Two Math, Times New Roman, serif; font-size: 18px; line-height: 1.75; white-space: nowrap;">',
    )
    .replace(/<span class="tk-math-text">/g, '<span style="font-style: normal; font-size: 0.92em; color: #374151;">')
    .replace(/<span class="tk-math-frac">/g, '<span style="display: inline-flex; flex-direction: column; align-items: stretch; vertical-align: middle; margin: 0 0.18em;">')
    .replace(/<span class="tk-math-frac-top">/g, '<span style="display: block; padding: 0 0.22em 0.08em; border-bottom: 1px solid rgba(17, 24, 39, 0.55);">')
    .replace(/<span class="tk-math-frac-bottom">/g, '<span style="display: block; padding: 0.08em 0.22em 0;">')
    .replace(/<span class="tk-math-sqrt">/g, '<span style="display: inline-flex; align-items: flex-start; gap: 0.1em; vertical-align: middle;">')
    .replace(/<span class="tk-math-sqrt-body">/g, '<span style="display: inline-block; border-top: 1px solid rgba(17, 24, 39, 0.55); padding: 0.08em 0.12em 0;">')
    .replace(/<div class="tk-table-wrapper">/g, '<div style="margin: 0 0 12px; overflow-x: auto;">')
    .replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; border-spacing: 0; font-size: 14px; color: #111827;">')
    .replace(/<thead>/g, '<thead style="background: #f3f4f6;">')
    .replace(/<tbody>/g, '<tbody>')
    .replace(/<tr>/g, '<tr>')
    .replace(/<th(?=[\s>])/g, '<th style="border: 1px solid #d1d5db; padding: 8px 10px; font-weight: 700; text-align: left;"')
    .replace(/<td(?=[\s>])/g, '<td style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top;"')
    .replace(/<strong>/g, '<strong style="color: #000000; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #000000;">')
    .replace(/<img /g, '<img style="display: block; max-width: 100%; height: auto; margin: 14px 0; border-radius: 10px;" ')
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
      '<pre style="margin: 0 0 14px; padding: 14px 16px; border-radius: 12px; background: #2a1f1d; color: #fdf4f1; white-space: pre; overflow-x: auto; overflow-y: hidden;">',
    )
    .replace(
      /<code([^>]*)>/g,
      '<code$1 style="font-family: Consolas, Menlo, Monaco, monospace; border-radius: 4px; background: rgba(127, 29, 29, 0.08); color: #7f1d1d; padding: 0.08rem 0.32rem;">',
    )
    .replace(
      /<div class="tk-math-block">/g,
      '<div style="margin: 0 0 18px; overflow-x: auto; border: 1px solid #ead9d3; border-radius: 16px; background: linear-gradient(180deg, #fff9f6 0%, #fffdfb 100%); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72); padding: 18px 20px; text-align: center;">',
    )
    .replace(
      /<div class="tk-math-content">/g,
      '<div style="display: inline-block; min-width: max-content; color: #5f1d1d; font-family: Cambria Math, STIX Two Math, Times New Roman, serif; font-size: 22px; line-height: 1.8; white-space: nowrap;">',
    )
    .replace(/<span class="tk-math-text">/g, '<span style="font-style: normal; font-size: 0.92em; color: #7c4a43;">')
    .replace(/<span class="tk-math-frac">/g, '<span style="display: inline-flex; flex-direction: column; align-items: stretch; vertical-align: middle; margin: 0 0.2em;">')
    .replace(/<span class="tk-math-frac-top">/g, '<span style="display: block; padding: 0 0.24em 0.08em; border-bottom: 1px solid rgba(95, 29, 29, 0.55);">')
    .replace(/<span class="tk-math-frac-bottom">/g, '<span style="display: block; padding: 0.08em 0.24em 0;">')
    .replace(/<span class="tk-math-sqrt">/g, '<span style="display: inline-flex; align-items: flex-start; gap: 0.1em; vertical-align: middle;">')
    .replace(/<span class="tk-math-sqrt-body">/g, '<span style="display: inline-block; border-top: 1px solid rgba(95, 29, 29, 0.48); padding: 0.08em 0.14em 0;">')
    .replace(/<div class="tk-table-wrapper">/g, '<div style="margin: 0 0 16px; overflow-x: auto; border-radius: 12px; border: 1px solid #ead9d3;">')
    .replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; border-spacing: 0; font-size: 15px; color: #2f1b1b; background: #fffdfb;">')
    .replace(/<thead>/g, '<thead style="background: linear-gradient(90deg, #f8ebe6 0%, #fdf7f4 100%);">')
    .replace(/<tbody>/g, '<tbody>')
    .replace(/<tr>/g, '<tr>')
    .replace(/<th(?=[\s>])/g, '<th style="border: 1px solid #ead9d3; padding: 10px 12px; font-weight: 700; text-align: left; color: #7f1d1d;"')
    .replace(/<td(?=[\s>])/g, '<td style="border: 1px solid #f1dfda; padding: 10px 12px; text-align: left; vertical-align: top;"')
    .replace(
      /<pre([^>]*)><code([^>]*) style="([^"]*)">/g,
      '<pre$1><code$2 style="display: block; min-width: max-content; font-family: Consolas, Menlo, Monaco, monospace; white-space: inherit; background: transparent; color: #fdf4f1; padding: 0;">',
    )
    .replace(/<strong>/g, '<strong style="color: #5f1d1d; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #7c4a43;">')
    .replace(/<img /g, '<img style="display: block; max-width: 100%; height: auto; margin: 18px auto; border-radius: 14px; box-shadow: 0 8px 24px rgba(95, 29, 29, 0.08);" ')
    .replace(/<a /g, '<a style="color: #8f2d2d; text-decoration: underline; text-decoration-color: #d6a79c; text-underline-offset: 3px;" ');
}

async function inlineClipboardImages(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const images = Array.from(container.querySelectorAll("img[src]"));

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src")?.trim();
      if (!source || source.startsWith("data:")) return;

      const dataUrl = await readImageAsDataUrl(source);
      if (dataUrl) {
        image.setAttribute("src", dataUrl);
      }
    }),
  );

  return container.innerHTML;
}

async function readImageAsDataUrl(source: string) {
  let resolvedUrl: URL;
  try {
    resolvedUrl = new URL(source, window.location.href);
  } catch {
    return null;
  }

  try {
    const response = await fetch(resolvedUrl.toString());
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function triggerHtmlDownload(html: string, fileName: string | null | undefined) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = normalizeHtmlDownloadName(fileName);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function normalizeHtmlDownloadName(fileName: string | null | undefined) {
  const trimmed = (fileName ?? "").trim();
  if (!trimmed) return "trustedKnowledge-export.html";
  return /\.html?$/i.test(trimmed) ? trimmed : `${trimmed}.html`;
}

function formatInlineMarkdown(value: string) {
  const codeSegments: string[] = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code: string) => {
    const index = codeSegments.push(`<code>${code}</code>`) - 1;
    return `${INLINE_CODE_MARKER_PREFIX}${index}${INLINE_CODE_MARKER_SUFFIX}`;
  });

  html = html
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, src: string) => {
      const safeSrc = sanitizeMarkdownUrl(src);
      if (!safeSrc) return alt;
      const safeAlt = escapeAttribute(alt);
      return `<img src="${escapeAttribute(safeSrc)}" alt="${safeAlt}" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = sanitizeMarkdownUrl(href);
      return safeHref ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    // A single underscore inside an identifier or filename is literal text, not emphasis.
    // Keep `_emphasis_` for standalone Markdown while leaving `foo_bar_baz` intact.
    .replace(/(^|[^\p{L}\p{N}_])_([^\s_](?:[^_\n]*[^\s_])?)_(?![\p{L}\p{N}_])/gu, "$1<em>$2</em>");

  return html.replace(INLINE_CODE_MARKER_PATTERN, (_match, index: string) => codeSegments[Number(index)] ?? "");
}

function extractSingleLineMathBlock(line: string) {
  if (!line.startsWith("$$")) return null;
  const lastDelimiterIndex = line.lastIndexOf("$$");
  if (lastDelimiterIndex <= 1) return null;
  return line.slice(2, lastDelimiterIndex).trim();
}

function renderLatexBlock(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const rendered = renderLatexSequence({ source: normalized, index: 0 });
  return `<div class="tk-math-block"><div class="tk-math-content">${rendered || escapeHtml(normalized)}</div></div>`;
}

function renderLatexSequence(state: LatexParserState, stopChar?: string): string {
  const fragments: string[] = [];

  while (state.index < state.source.length) {
    const current = state.source[state.index];
    if (stopChar && current === stopChar) break;

    if (current === "\n") {
      fragments.push("<br />");
      state.index += 1;
      continue;
    }

    if (/\s/.test(current)) {
      state.index += 1;
      if (fragments[fragments.length - 1] !== " ") fragments.push(" ");
      continue;
    }

    if (current === "{") {
      state.index += 1;
      fragments.push(renderLatexSequence(state, "}"));
      if (state.source[state.index] === "}") state.index += 1;
      continue;
    }

    if (current === "^" || current === "_") {
      const tag = current === "^" ? "sup" : "sub";
      state.index += 1;
      fragments.push(`<${tag}>${renderLatexArgument(state)}</${tag}>`);
      continue;
    }

    if (current === "\\") {
      fragments.push(renderLatexCommand(state));
      continue;
    }

    fragments.push(escapeHtml(current));
    state.index += 1;
  }

  return fragments.join("");
}

function renderLatexArgument(state: LatexParserState): string {
  skipLatexWhitespace(state);
  if (state.index >= state.source.length) return "";

  if (state.source[state.index] === "{") {
    state.index += 1;
    const value = renderLatexSequence(state, "}");
    if (state.source[state.index] === "}") state.index += 1;
    return value;
  }

  if (state.source[state.index] === "\\") {
    return renderLatexCommand(state);
  }

  const value = escapeHtml(state.source[state.index]);
  state.index += 1;
  return value;
}

function renderLatexCommand(state: LatexParserState): string {
  const command = readLatexCommand(state);
  if (!command) return "";

  if (command in LATEX_SYMBOL_MAP) return LATEX_SYMBOL_MAP[command];

  switch (command) {
    case "text":
    case "textrm":
    case "mathrm":
    case "operatorname":
    case "mbox":
      return `<span class="tk-math-text">${renderLatexArgument(state)}</span>`;
    case "mathbf":
      return `<strong>${renderLatexArgument(state)}</strong>`;
    case "frac": {
      const numerator = renderLatexArgument(state);
      const denominator = renderLatexArgument(state);
      return `<span class="tk-math-frac"><span class="tk-math-frac-top">${numerator}</span><span class="tk-math-frac-bottom">${denominator}</span></span>`;
    }
    case "sqrt":
      return `<span class="tk-math-sqrt">√<span class="tk-math-sqrt-body">${renderLatexArgument(state)}</span></span>`;
    case "left":
    case "right":
      return "";
    case ",":
    case ":":
      return "&thinsp;";
    case ";":
      return "&#8197;";
    case "quad":
      return "&nbsp;&nbsp;";
    case "qquad":
      return "&nbsp;&nbsp;&nbsp;&nbsp;";
    case "!":
      return "";
    case "\\":
      return "<br />";
    case "begin":
    case "end":
      renderLatexArgument(state);
      return "";
    default:
      return `\\${escapeHtml(command)}`;
  }
}

function readLatexCommand(state: LatexParserState): string {
  state.index += 1;
  if (state.index >= state.source.length) return "";

  const next = state.source[state.index];
  if (/[A-Za-z]/.test(next)) {
    const start = state.index;
    while (state.index < state.source.length && /[A-Za-z]/.test(state.source[state.index])) {
      state.index += 1;
    }
    return state.source.slice(start, state.index);
  }

  state.index += 1;
  return next;
}

function isMarkdownTableHeader(line: string) {
  const trimmed = line.trim();
  return trimmed.includes("|") && parseMarkdownTableCells(trimmed).length > 1;
}

function isMarkdownHorizontalRule(line: string) {
  return /^(?: {0,3})(?:\*[ \t]*){3,}$/.test(line) || /^(?: {0,3})(?:-[ \t]*){3,}$/.test(line) || /^(?: {0,3})(?:_[ \t]*){3,}$/.test(line);
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
  if (unescaped.startsWith("./") || unescaped.startsWith("../")) return unescaped;
  if (/^[^:/?#\s][^\s]*$/.test(unescaped)) return unescaped;
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

function skipLatexWhitespace(state: LatexParserState) {
  while (state.index < state.source.length && /\s/.test(state.source[state.index])) {
    state.index += 1;
  }
}

type LatexParserState = {
  source: string;
  index: number;
};

const LATEX_SYMBOL_MAP: Record<string, string> = {
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Theta: "Θ",
  Lambda: "Λ",
  Mu: "Μ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  cdot: "·",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  approx: "≈",
  sim: "∼",
  neq: "≠",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  to: "→",
  gets: "←",
  leftarrow: "←",
  Rightarrow: "⇒",
  rightarrow: "→",
  infty: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
  partial: "∂",
  nabla: "∇",
  degree: "°",
  percent: "%",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  in: "∈",
  notin: "∉",
  forall: "∀",
  exists: "∃",
  land: "∧",
  lor: "∨",
  "%": "%",
  "{": "{",
  "}": "}",
  "#": "#",
  "&": "&amp;",
  _: "_",
};
