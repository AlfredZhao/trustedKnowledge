import { markdownToHtml } from "./markdown";
import { prepareMarkdownSlides } from "./markdownSlides";
import { apiUrl } from "../api/client";
import { officeRequest } from "../api/office";
import { assertOfficeAssetCount, assertOfficeAssetSize } from "./officeAssetLimits";
import type { OfficeAsset, OfficeBlock, OfficeLimits, OfficeRun, OfficeSource } from "./officeTypes";

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("已取消", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Only the existing media API; never send API keys to Markdown-selected origins. */
export function officeMediaPath(src: string): string {
  const url = new URL(src, window.location.href);
  const apiOrigin = new URL(apiUrl("/api/media/"), window.location.href).origin;
  if (![window.location.origin, apiOrigin].includes(url.origin) || !/^\/api\/media\/[A-Za-z0-9_-]{20,80}\/content$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("导出图片仅支持本系统上传的图片；请先上传外链或相对路径图片，避免导出后丢图。");
  }
  return url.pathname;
}

async function imageData(src: string, signal: AbortSignal): Promise<{ data: string; width: number; height: number }> {
  const response = await officeRequest(officeMediaPath(src), { signal });
  const mime = response.headers.get("content-type")?.split(";")[0] || "";
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) throw new Error("图片类型不支持导出，请使用 PNG/JPEG/WebP/GIF。");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法读取图片，请重试。");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 8 * 1024 * 1024) throw new Error("原图超过 8 MB，请压缩后再导出。");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const objectUrl = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: mime }));
  try {
    const image = new Image(); image.src = objectUrl;
    await abortable(image.decode(), signal);
    if (!image.width || !image.height || image.width * image.height > 16_000_000) throw new Error("原图分辨率过高，请缩小后再导出。");
    const ratio = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法生成导出图片。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png").split(",")[1], width: canvas.width, height: canvas.height };
  } finally { URL.revokeObjectURL(objectUrl); }
}

/** Current visible snapshot → typed IR. Same parser as the reader, no source persistence. */
export async function prepareOfficeSource(markdown: string, signal: AbortSignal, progress: (message: string) => void, limits: OfficeLimits): Promise<OfficeSource> {
  if (!markdown.trim()) throw new Error("没有可导出的内容。");
  if (markdown.length > 120_000) throw new Error("正文超过 120,000 字符，请拆分后导出。");
  const prepared = prepareMarkdownSlides(markdown);
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const manual = prepared.breaks.filter(line => /^\s*<!--\s*slide\s*-->\s*$/i.test(lines[line]));
  // Inert template prevents arbitrary <img> requests before media URL validation.
  const template = document.createElement("template");
  template.innerHTML = markdownToHtml(prepared.markdown, { sourceMap: true });
  const imageSources = new Map<Element, string>();
  for (const image of template.content.querySelectorAll("img")) {
    const src = image.getAttribute("src") || "";
    officeMediaPath(src); imageSources.set(image, src); image.removeAttribute("src");
  }
  if (template.content.querySelector("a img")) throw new Error("暂不支持带超链接的图片，请将图片与链接分开后导出。");
  // Count all graphics before fetching media or rasterizing expensive diagrams.
  assertOfficeAssetCount([
    ...Array.from(imageSources, () => "image" as const),
    ...Array.from(template.content.querySelectorAll("[data-mermaid-render]"), () => "mermaid" as const),
    ...Array.from(template.content.querySelectorAll(".katex"), () => "formula" as const),
  ], limits);
  const host = document.createElement("div");
  host.className = "office-source"; host.setAttribute("aria-hidden", "true"); host.inert = true;
  host.append(template.content); document.body.append(host);
  const assets: OfficeAsset[] = []; const blocks: OfficeBlock[] = [];
  const assetNodes = new Map<Element, OfficeAsset>();
  const addAsset = (kind: OfficeAsset["kind"], alt: string, data: { data: string; width: number; height: number }): OfficeAsset => {
    const item = { id: `asset-${assets.length + 1}`, kind, alt, ...data };
    assertOfficeAssetSize(assets, item, limits);
    assets.push(item); return item;
  };
  try {
    progress("正在准备图片、图表与公式…");
    for (const [image, src] of imageSources) {
      signal.throwIfAborted();
      const data = await imageData(src, signal);
      const asset = addAsset("image", image.getAttribute("alt") || "", data);
      assetNodes.set(image, asset); (image as HTMLImageElement).src = `data:image/png;base64,${asset.data}`;
    }
    const diagrams = Array.from(host.querySelectorAll<HTMLElement>("[data-mermaid-render]"));
    if (diagrams.length) {
      const { default: mermaid } = await abortable(import("mermaid"), signal);
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", htmlLabels: false, theme: "base", themeVariables: { fontFamily: "Noto Sans CJK SC, sans-serif", primaryColor: "#f4f1ed", primaryTextColor: "#312d2a", primaryBorderColor: "#c74634", lineColor: "#5c5651" } });
      for (const diagram of diagrams) {
        const code = diagram.closest("[data-mermaid-block]")?.querySelector("[data-mermaid-source]")?.textContent || "";
        if (code.length > 20_000 || /https?:|file:|data:|url\s*\(|@\{|<\s*(?:img|image|iframe)|%%\{/i.test(code)) throw new Error("Mermaid 过长或含有外部资源/自定义初始化，暂不支持导出。");
        const id = Array.from(crypto.getRandomValues(new Uint32Array(2)), value => value.toString(16)).join("");
        const rendered = await abortable(mermaid.render(`office-${id}`, code), signal);
        diagram.innerHTML = rendered.svg;
        if (diagram.querySelector("image,foreignObject,script")) throw new Error("Mermaid 包含暂不支持的嵌入资源。");
      }
    }
    if (host.querySelector(".katex-error,.tk-math-error")) throw new Error("公式渲染失败，请先修正公式再导出。");
    await abortable(document.fonts.ready, signal);
    const graphics = [...diagrams, ...Array.from(host.querySelectorAll<HTMLElement>(".katex"))];
    if (graphics.length) {
      const { toPng, getFontEmbedCSS } = await abortable(import("html-to-image"), signal);
      const fontEmbedCSS = await abortable(getFontEmbedCSS(host, { preferredFontFormat: "woff2" }), signal);
      for (const node of graphics) {
        signal.throwIfAborted();
        const bounds = node.getBoundingClientRect();
        if (bounds.width < 1 || bounds.height < 1 || bounds.width > 4096 || bounds.height > 4096) throw new Error("图形尺寸过大，请拆分图形或简化公式。");
        const isDiagram = node.hasAttribute("data-mermaid-render");
        // Inline glyph overhangs (italic letters, superscripts, fractions) can
        // extend outside a span's CSS box. Preserve a raster safety margin.
        const padding = isDiagram ? 0 : 6;
        const width = Math.ceil(bounds.width) + padding * 2, height = Math.ceil(bounds.height) + padding * 2;
        if (width * height > 4_000_000) throw new Error("图形分辨率过高，请拆分图形或简化公式。");
        const url = await abortable(toPng(node, { width, height, pixelRatio: 2, backgroundColor: "#FCFBFA", fontEmbedCSS, style: { margin: "0", position: "static", display: "inline-block", boxSizing: "border-box", padding: `${padding}px`, overflow: "visible", width: `${width}px`, height: `${height}px` } }), signal);
        const alt = isDiagram ? node.closest("[data-mermaid-block]")?.querySelector("[data-mermaid-source]")?.textContent || "" : node.querySelector("annotation")?.textContent || "";
        assetNodes.set(node, addAsset(isDiagram ? "mermaid" : "formula", alt, { width, height, data: url.split(",")[1] }));
      }
    }
    const runs = (node: Node, style: Partial<OfficeRun> = {}): OfficeRun[] => {
      if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || "", ...style }];
      if (!(node instanceof Element)) return [];
      const asset = assetNodes.get(node);
      if (asset) return [{ asset: asset.id, alt: asset.alt, ...style }];
      if (node.matches("br")) return [{ text: "\n", ...style }];
      const next = { ...style };
      if (node.matches("strong,b")) next.bold = true;
      if (node.matches("em,i")) next.italic = true;
      if (node.matches("code")) next.code = true;
      if (node.matches("a")) {
        const href = node.getAttribute("href") || "";
        const url = new URL(href, window.location.href);
        if (!["https:", "http:", "mailto:"].includes(url.protocol)) throw new Error("链接类型不支持导出。");
        next.href = url.href;
      }
      return Array.from(node.childNodes).flatMap(child => runs(child, next));
    };
    const add = (block: Omit<OfficeBlock, "id">) => blocks.push({ id: `block-${blocks.length + 1}`, ...block });
    let previous = -1;
    for (const wrapper of Array.from(host.children)) {
      signal.throwIfAborted();
      const start = Number((wrapper as HTMLElement).dataset.markdownSourceStart), end = Number((wrapper as HTMLElement).dataset.markdownSourceEnd);
      const base = { sourceStart: start, sourceEnd: end };
      if (manual.some(line => line > previous && line <= start)) add({ ...base, type: "break" });
      previous = end;
      const element = wrapper.firstElementChild!;
      if (element.matches("h1,h2,h3,h4")) add({ ...base, type: "heading", level: Number(element.tagName[1]), runs: runs(element) });
      else if (element.matches("[data-mermaid-block]")) {
        const asset = assetNodes.get(element.querySelector("[data-mermaid-render]")!)!;
        add({ ...base, type: "graphic", asset: asset.id, alt: asset.alt });
        add({ ...base, type: "code", text: asset.alt, language: "mermaid" });
      } else if (element.matches("[data-code-block]")) {
        const code = element.querySelector("pre code")!;
        add({ ...base, type: "code", text: code.textContent || "", language: code.className.replace("language-", "") });
      } else if (element.matches(".tk-math-block")) {
        const asset = assetNodes.get(element.querySelector(".katex")!)!;
        add({ ...base, type: "graphic", asset: asset.id, alt: asset.alt });
      } else if (element.matches(".tk-table-wrapper")) {
        add({ ...base, type: "table", rows: Array.from(element.querySelectorAll("tr"), row => Array.from(row.children, cell => runs(cell))) });
      } else if (element.matches("ul,ol")) {
        for (const item of Array.from(element.children)) {
          const line = Number((item as HTMLElement).dataset.markdownSourceLine);
          if (/^\s{2,}/.test(lines[line])) throw new Error("暂不支持嵌套列表导出，请将列表展平或改用小标题。");
          const number = lines[line].match(/^\s*(\d+)\.\s/)?.[1];
          add({ sourceStart: line, sourceEnd: line, type: "paragraph", list: element.tagName.toLowerCase() as "ul" | "ol", prefix: number ? `${number}. ` : "• ", runs: runs(item) });
        }
      } else if (element.matches("p,blockquote")) {
        let pending: OfficeRun[] = [];
        const flush = () => { if (pending.length) add({ ...base, type: "paragraph", quote: element.matches("blockquote"), runs: pending }); pending = []; };
        for (const run of runs(element)) {
          if (run.asset && assets.find(asset => asset.id === run.asset)?.kind === "image") { flush(); add({ ...base, type: "graphic", asset: run.asset, alt: run.alt }); }
          else pending.push(run);
        }
        flush();
      } else if (element.matches("hr")) add({ ...base, type: "rule" });
      else throw new Error("存在暂不支持的 Markdown 内容块。");
      if (blocks.length > 500) throw new Error("内容超过 500 个块，请拆分后导出。");
    }
    return { blocks, assets };
  } finally { host.remove(); }
}
