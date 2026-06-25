#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputArg = args[0];
  const outputArg = args[1];
  const inputPath = path.resolve(process.cwd(), inputArg);

  let markdown;
  try {
    markdown = await fs.readFile(inputPath, "utf8");
  } catch (error) {
    fail(`无法读取 Markdown 文件: ${inputPath}\n${formatError(error)}`);
  }

  const inputDir = path.dirname(inputPath);
  const articleTitle = extractMarkdownHeading(markdown) || path.basename(inputPath, path.extname(inputPath));
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.join(inputDir, `${sanitizeFileBaseName(articleTitle)}.html`);

  const htmlBody = await markdownToHtml(markdown, inputDir);
  const documentHtml = buildStandaloneHtml(buildEnhancedRichHtml(htmlBody), articleTitle);

  try {
    await fs.writeFile(outputPath, documentHtml, "utf8");
  } catch (error) {
    fail(`无法写入 HTML 文件: ${outputPath}\n${formatError(error)}`);
  }

  process.stdout.write(`已生成: ${outputPath}\n`);
}

function printUsage() {
  process.stdout.write(
    [
      "用法:",
      "  node scripts/export-enhanced-html.mjs <input.md> [output.html]",
      "",
      "示例:",
      "  node scripts/export-enhanced-html.mjs ~/Documents/post.md",
      "  node scripts/export-enhanced-html.mjs ./article.md ./article-export.html",
      "",
      "说明:",
      "  - 相对图片路径会按 Markdown 文件所在目录解析。",
      "  - 可访问到的本地图片会内联为 base64，因此生成的 HTML 可直接本机打开。",
    ].join("\n"),
  );
}

async function markdownToHtml(markdown, inputDir) {
  const lines = removeLeakedMarkdownCodePlaceholders(markdown).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines = [];

  const flushParagraph = async () => {
    if (!paragraph.length) return;
    html.push(`<p>${await formatInlineMarkdown(paragraph.join(" "), inputDir)}</p>`);
    paragraph = [];
  };

  const flushList = async () => {
    if (!listType || !listItems.length) return;
    const renderedItems = [];
    for (const item of listItems) {
      renderedItems.push(`<li>${await formatInlineMarkdown(item, inputDir)}</li>`);
    }
    html.push(`<${listType}>${renderedItems.join("")}</${listType}>`);
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
        await flushParagraph();
        await flushList();
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
      await flushParagraph();
      await flushList();
      continue;
    }

    if (isMarkdownTableHeader(line) && index + 1 < lines.length && isMarkdownTableDelimiter(lines[index + 1])) {
      await flushParagraph();
      await flushList();

      const headerCells = parseMarkdownTableCells(line);
      const alignments = parseMarkdownTableAlignments(lines[index + 1]);
      const bodyRows = [];

      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        bodyRows.push(parseMarkdownTableCells(lines[index]));
        index += 1;
      }
      index -= 1;

      html.push(await renderMarkdownTable(headerCells, alignments, bodyRows, inputDir));
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      await flushParagraph();
      await flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${await formatInlineMarkdown(heading[2], inputDir)}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      await flushParagraph();
      await flushList();
      html.push(`<blockquote><p>${await formatInlineMarkdown(quote[1], inputDir)}</p></blockquote>`);
      continue;
    }

    const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (unorderedItem) {
      await flushParagraph();
      if (listType !== "ul") await flushList();
      listType = "ul";
      listItems.push(unorderedItem[1]);
      continue;
    }

    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedItem) {
      await flushParagraph();
      if (listType !== "ol") await flushList();
      listType = "ol";
      listItems.push(orderedItem[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCodeBlock) flushCodeBlock();
  await flushParagraph();
  await flushList();

  return html.join("");
}

async function formatInlineMarkdown(value, inputDir) {
  const codeSegments = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code) => {
    const index = codeSegments.push(`<code>${code}</code>`) - 1;
    return `${INLINE_CODE_MARKER_PREFIX}${index}${INLINE_CODE_MARKER_SUFFIX}`;
  });

  html = await replaceAsync(html, /!\[([^\]]*)\]\(([^)\s]+)\)/g, async (_match, alt, src) => {
    const safeSrc = await resolveMarkdownImageSource(src, inputDir);
    if (!safeSrc) return escapeHtml(alt);
    const safeAlt = escapeAttribute(alt);
    return `<img src="${escapeAttribute(safeSrc)}" alt="${safeAlt}" loading="lazy" />`;
  });

  html = html
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_match, label, href) => {
      const safeHref = sanitizeMarkdownUrl(href);
      return safeHref ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");

  return html.replace(INLINE_CODE_MARKER_PATTERN, (_match, index) => codeSegments[Number(index)] ?? "");
}

async function renderMarkdownTable(headers, alignments, rows, inputDir) {
  const normalizeCellCount = (cells) => Array.from({ length: headers.length }, (_value, index) => cells[index] ?? "");
  const renderAlignment = (alignment) => (alignment ? ` data-align="${alignment}"` : "");

  const headerCells = normalizeCellCount(headers);
  const renderedHeaders = [];
  for (let index = 0; index < headerCells.length; index += 1) {
    renderedHeaders.push(
      `<th${renderAlignment(alignments[index] ?? "")}>${await formatInlineMarkdown(headerCells[index], inputDir)}</th>`,
    );
  }

  const renderedRows = [];
  for (const row of rows) {
    const normalizedRow = normalizeCellCount(row);
    const renderedCells = [];
    for (let index = 0; index < normalizedRow.length; index += 1) {
      renderedCells.push(
        `<td${renderAlignment(alignments[index] ?? "")}>${await formatInlineMarkdown(normalizedRow[index], inputDir)}</td>`,
      );
    }
    renderedRows.push(`<tr>${renderedCells.join("")}</tr>`);
  }

  return `<div class="tk-table-wrapper"><table><thead><tr>${renderedHeaders.join("")}</tr></thead><tbody>${renderedRows.join("")}</tbody></table></div>`;
}

async function resolveMarkdownImageSource(src, inputDir) {
  const normalized = src.trim();
  if (!normalized) return null;
  if (normalized.startsWith("data:")) return normalized;
  if (/^(https?:|mailto:)/i.test(normalized)) return normalized;

  const absolutePath = path.resolve(inputDir, normalized);
  let buffer;
  try {
    buffer = await fs.readFile(absolutePath);
  } catch {
    return null;
  }

  const mimeType = inferImageMimeType(absolutePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function inferImageMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".bmp":
      return "image/bmp";
    case ".avif":
      return "image/avif";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

function buildEnhancedRichHtml(innerHtml) {
  return [
    '<article style="font-family: Georgia, Cambria, Times New Roman, serif; color: #2f1b1b; line-height: 1.85; font-size: 16px; background: #fffdfb;">',
    inlineEnhancedClipboardStyles(innerHtml),
    "</article>",
  ].join("");
}

function buildStandaloneHtml(bodyHtml, title) {
  const safeTitle = escapeHtml(title || "trustedKnowledge export");
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${safeTitle}</title>`,
    "</head>",
    `<body style="margin:0; padding:32px 20px; background:#f7f1ee;">${bodyHtml}</body>`,
    "</html>",
  ].join("");
}

function inlineEnhancedClipboardStyles(html) {
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
    .replace(/<tbody>/g, "<tbody>")
    .replace(/<tr>/g, "<tr>")
    .replace(/<th(?=[\\s>])/g, '<th style="border: 1px solid #ead9d3; padding: 10px 12px; font-weight: 700; text-align: left; color: #7f1d1d;"')
    .replace(/<td(?=[\\s>])/g, '<td style="border: 1px solid #f1dfda; padding: 10px 12px; text-align: left; vertical-align: top;"')
    .replace(/<pre([^>]*)><code([^>]*) style="([^"]*)">/g, '<pre$1><code$2 style="font-family: Consolas, Menlo, Monaco, monospace; background: transparent; color: #fdf4f1; padding: 0;">')
    .replace(/<strong>/g, '<strong style="color: #5f1d1d; font-weight: 700;">')
    .replace(/<em>/g, '<em style="color: #7c4a43;">')
    .replace(/<img /g, '<img style="display: block; max-width: 100%; height: auto; margin: 18px auto; border-radius: 14px; box-shadow: 0 8px 24px rgba(95, 29, 29, 0.08);" ')
    .replace(/<a /g, '<a style="color: #8f2d2d; text-decoration: underline; text-decoration-color: #d6a79c; text-underline-offset: 3px;" ');
}

function extractMarkdownHeading(markdown) {
  for (const line of markdown.split("\n")) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return "";
}

function sanitizeFileBaseName(value) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || "trustedKnowledge-export";
}

function removeLeakedMarkdownCodePlaceholders(markdown) {
  return markdown
    .replace(/[ \t]*(?:@@CODE_?\d+@@|\uE000CODE_?\d+\uE001)[ \t]*/g, (match, offset, source) => {
      const before = offset > 0 ? source[offset - 1] : "";
      const after = source[offset + match.length] ?? "";
      return shouldKeepPlaceholderGap(before, after) ? " " : "";
    })
    .replace(/[ \t]{2,}/g, " ");
}

function isMarkdownTableHeader(line) {
  const trimmed = line.trim();
  return trimmed.includes("|") && parseMarkdownTableCells(trimmed).length > 1;
}

function isMarkdownTableDelimiter(line) {
  const cells = parseMarkdownTableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function isMarkdownTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes("|")) return false;
  if (/^```/.test(trimmed)) return false;
  return parseMarkdownTableCells(trimmed).length > 1;
}

function parseMarkdownTableAlignments(line) {
  return parseMarkdownTableCells(line).map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
    if (trimmed.endsWith(":")) return "right";
    if (trimmed.startsWith(":")) return "left";
    return "";
  });
}

function parseMarkdownTableCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
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

function sanitizeMarkdownUrl(value) {
  const unescaped = value.replace(/&amp;/g, "&");
  if (/^(https?:|mailto:|data:)/i.test(unescaped)) return unescaped;
  return "";
}

function shouldKeepPlaceholderGap(before, after) {
  return /[A-Za-z0-9)\]]/.test(before) && /[A-Za-z0-9([]/.test(after);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function replaceAsync(value, pattern, replacer) {
  const matches = [...value.matchAll(pattern)];
  if (matches.length === 0) return Promise.resolve(value);

  return Promise.all(matches.map((match) => replacer(...match))).then((replacements) => {
    let offset = 0;
    let result = value;
    matches.forEach((match, index) => {
      const replacement = replacements[index];
      const start = match.index + offset;
      const end = start + match[0].length;
      result = `${result.slice(0, start)}${replacement}${result.slice(end)}`;
      offset += replacement.length - match[0].length;
    });
    return result;
  });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

const INLINE_CODE_MARKER_PREFIX = "TKMDINLINECODE";
const INLINE_CODE_MARKER_SUFFIX = "ENDTK";
const INLINE_CODE_MARKER_PATTERN = new RegExp(`${INLINE_CODE_MARKER_PREFIX}(\\d+)${INLINE_CODE_MARKER_SUFFIX}`, "g");

main();
