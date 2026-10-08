/** Pagination uses the existing, sanitized Markdown DOM, not a second Markdown parser. */
export interface SlideAnchor { block: number; offset: number }
export interface MarkdownSlide {
  html: string;
  detailHtml: string;
  title: string;
  sourceStart: number;
  sourceEnd: number;
  anchor: SlideAnchor;
  scaled: boolean;
}

export interface PreparedSlides {
  markdown: string;
  breaks: number[];
}

/** Recognize explicit breaks only outside fenced code, display math and comments. */
export function prepareMarkdownSlides(markdown: string): PreparedSlides {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const explicit: number[] = [];
  const headings: number[] = [];
  let fence: { character: string; length: number } | null = null;
  let math = false;
  let comment = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (fence) {
      if (new RegExp(`^${fence.character}{${fence.length},}\\s*$`).test(trimmed)) fence = null;
      return;
    }
    if (math) {
      if (trimmed.endsWith("$$")) math = false;
      return;
    }
    if (comment) {
      if (trimmed.includes("-->")) comment = false;
      return;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (opening) {
      fence = { character: opening[1][0], length: opening[1].length };
      return;
    }
    if (trimmed.startsWith("$$")) {
      math = trimmed.length === 2 || !trimmed.slice(2).endsWith("$$");
      return;
    }
    if (/^<!--\s*slide\s*-->$/i.test(trimmed)) {
      explicit.push(index);
      // Keep source line numbers unchanged; don't expose presentation directives.
      lines[index] = "";
      return;
    }
    if (trimmed.includes("<!--") && !trimmed.includes("-->")) comment = true;
    if (/^#{1,2}\s+/.test(line)) headings.push(index);
  });
  return { markdown: lines.join("\n"), breaks: explicit.length ? explicit : headings };
}

type Segment = { node: Node; start: number; end: number; atomic: boolean };

function textSegments(element: Element) {
  const segments: Segment[] = [];
  let length = 0;
  const visit = (node: Node) => {
    const atomic = node instanceof Element && node.matches("img, svg, .katex, .tk-math-block, br");
    if (node.nodeType === Node.TEXT_NODE || atomic) {
      const size = atomic ? 1 : (node.textContent?.length ?? 0);
      if (size) segments.push({ node, start: length, end: length + size, atomic });
      length += size;
    } else node.childNodes.forEach(visit);
  };
  element.childNodes.forEach(visit);
  return { segments, length };
}

/** Range.cloneContents preserves emphasis, links, highlighting and source-line spans. */
function sliceContents(element: Element, segments: Segment[], start: number, end: number) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const setPoint = (offset: number, isStart: boolean) => {
    const segment = segments.find((item) => offset >= item.start && offset < item.end) ?? segments[segments.length - 1];
    if (!segment) return;
    if (segment.atomic) {
      if (offset <= segment.start) {
        if (isStart) range.setStartBefore(segment.node); else range.setEndBefore(segment.node);
      } else {
        if (isStart) range.setStartAfter(segment.node); else range.setEndAfter(segment.node);
      }
    } else {
      const position = Math.min(offset - segment.start, segment.end - segment.start);
      if (isStart) range.setStart(segment.node, position); else range.setEnd(segment.node, position);
    }
  };
  setPoint(start, true);
  setPoint(end, false);
  return range.cloneContents();
}

interface Piece {
  node: HTMLElement;
  detail: HTMLElement;
  anchor: SlideAnchor;
  sourceStart: number;
  sourceEnd: number;
  scaled: boolean;
}

export function slideIndexForAnchor(slides: MarkdownSlide[], anchor: SlideAnchor) {
  let index = 0;
  slides.forEach((slide, candidate) => {
    if (slide.anchor.block < anchor.block || (slide.anchor.block === anchor.block && slide.anchor.offset <= anchor.offset)) index = candidate;
  });
  return index;
}

/** Measure at actual viewport dimensions. Only indivisible graphics/rows may be scaled. */
export async function paginateMarkdownSlides(
  source: HTMLElement,
  measure: HTMLElement,
  width: number,
  height: number,
  breaks: number[],
  isCancelled: () => boolean = () => false,
): Promise<MarkdownSlide[]> {
  const pages: MarkdownSlide[] = [];
  let pending: Piece[] = [];
  let title = "正文";
  let previousLine = -1;
  let work = 0;
  const clone = (node: HTMLElement) => node.cloneNode(true) as HTMLElement;
  const measureNodes = (nodes: HTMLElement[]) => {
    measure.replaceChildren(...nodes.map(clone));
    return {
      width: Array.from(measure.querySelectorAll<HTMLElement>("*")).reduce((maximum, node) => Math.max(maximum, node.scrollWidth), measure.scrollWidth),
      height: measure.getBoundingClientRect().height,
    };
  };
  const fits = (nodes: HTMLElement[]) => {
    const size = measureNodes(nodes);
    return size.height <= height - 2 && size.width <= width + 1;
  };
  const flush = () => {
    if (!pending.length) return;
    pages.push({
      html: pending.map((piece) => piece.node.outerHTML).join(""),
      detailHtml: pending.map((piece) => piece.detail.outerHTML).join(""),
      title,
      sourceStart: Math.min(...pending.map((piece) => piece.sourceStart)),
      sourceEnd: Math.max(...pending.map((piece) => piece.sourceEnd)),
      anchor: pending[0].anchor,
      scaled: pending.some((piece) => piece.scaled),
    });
    pending = [];
  };
  const makePiece = (node: HTMLElement, block: number, offset = 0): Piece => {
    const lines = Array.from(node.querySelectorAll<HTMLElement>("[data-markdown-source-line]"))
      .filter((item) => item.textContent || item.matches("img") || item.querySelector("img"))
      .map((item) => Number(item.dataset.markdownSourceLine));
    return {
      node, detail: node, anchor: { block, offset },
      sourceStart: lines.length ? Math.min(...lines) : Number(node.dataset.markdownSourceStart ?? 0),
      sourceEnd: lines.length ? Math.max(...lines) : Number(node.dataset.markdownSourceEnd ?? 0),
      scaled: false,
    };
  };
  const fitAtomic = (piece: Piece): Piece => {
    const size = measureNodes([piece.node]);
    const scale = Math.min(1, width / Math.max(1, size.width), (height - 4) / Math.max(1, size.height));
    const frame = document.createElement("div");
    frame.className = "slide-scaled-frame";
    frame.style.height = `${Math.max(1, size.height * scale)}px`;
    const content = document.createElement("div");
    content.className = "slide-scaled-content";
    content.style.width = `${width}px`;
    content.style.transform = `scale(${scale})`;
    content.append(clone(piece.node));
    frame.append(content);
    return { ...piece, node: frame, scaled: true };
  };
  const append = (piece: Piece) => {
    if (pending.length && !fits([...pending.map((item) => item.node), piece.node])) flush();
    pending.push(piece);
  };

  const splitText = async (base: HTMLElement, targetSelector: string, block: number, baseOffset = 0): Promise<Piece[]> => {
    const target = base.querySelector(targetSelector);
    if (!target) return [fitAtomic(makePiece(base, block, baseOffset))];
    const { segments, length } = textSegments(target);
    if (!length) return [fitAtomic(makePiece(base, block, baseOffset))];
    const make = (start: number, end: number) => {
      const node = clone(base);
      node.querySelector(targetSelector)!.replaceChildren(sliceContents(target, segments, start, end));
      if (targetSelector === "pre code") {
        const button = node.querySelector("[data-copy-code-block]");
        if (button) { button.textContent = "复制本页代码"; button.setAttribute("aria-label", "复制本页代码"); }
      }
      return node;
    };
    const pieces: Piece[] = [];
    let start = 0;
    while (start < length && !isCancelled()) {
      // Fill the space after a heading instead of emitting an otherwise empty title page.
      let prefix = pieces.length ? [] : pending.map((piece) => piece.node);
      if (prefix.length && !fits([...prefix, make(start, start + 1)])) prefix = [];
      let low = start + 1;
      let high = length;
      let best = start;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (fits([...prefix, make(start, middle)])) { best = middle; low = middle + 1; } else high = middle - 1;
      }
      if (best > start && best < length) {
        const segment = segments.find((item) => !item.atomic && best > item.start && best < item.end);
        if (segment) {
          const char = segment.node.textContent!.charCodeAt(best - segment.start);
          if (char >= 0xdc00 && char <= 0xdfff) best -= 1;
        }
        // Prefer a complete code line, but soft-wrap exceptionally long lines.
        if (targetSelector === "pre code") {
          const newline = (target.textContent ?? "").lastIndexOf("\n", best - 1) + 1;
          if (newline > start) best = newline;
        }
      }
      if (best <= start) {
        // One indivisible inline formula/image is larger than a page.
        const segment = segments.find((item) => start >= item.start && start < item.end)!;
        best = Math.min(length, start + (segment.atomic ? 1 : ((segment.node.textContent?.codePointAt(start - segment.start) ?? 0) > 0xffff ? 2 : 1)));
      }
      let piece = makePiece(make(start, best), block, baseOffset + start);
      if (targetSelector === "pre code") {
        piece.sourceStart += 1 + ((target.textContent ?? "").slice(0, start).match(/\n/g)?.length ?? 0);
        piece.sourceEnd = piece.sourceStart + ((target.textContent ?? "").slice(start, best).match(/\n/g)?.length ?? 0);
      }
      if (!fits([piece.node])) piece = fitAtomic(piece);
      pieces.push(piece);
      start = best;
      if (pieces.length % 4 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    return pieces;
  };

  const splitBlock = async (base: HTMLElement, block: number): Promise<Piece[]> => {
    if (base.querySelector("[data-mermaid-block], .tk-math-block")) return [fitAtomic(makePiece(base, block))];
    const code = base.querySelector("pre code");
    if (code) return splitText(base, "pre code", block);
    const collection = base.querySelector("tbody, ul, ol");
    if (collection) {
      const children = Array.from(collection.children);
      const isTable = collection.tagName === "TBODY";
      const selector = isTable ? "tbody" : collection.tagName.toLowerCase();
      const make = (from: number, to: number) => {
        const node = clone(base);
        const container = node.querySelector(selector)!;
        container.replaceChildren(...children.slice(from, to).map((item) => item.cloneNode(true)));
        if (collection.tagName === "OL") container.setAttribute("start", String(Number(collection.getAttribute("start") ?? 1) + from));
        if (isTable) {
          const sourceStart = Number(base.dataset.markdownSourceStart ?? 0);
          node.dataset.markdownSourceStart = String(sourceStart + (from ? 2 + from : 0));
          node.dataset.markdownSourceEnd = String(sourceStart + 1 + to);
        }
        return node;
      };
      const pieces: Piece[] = [];
      let start = 0;
      let offset = 0;
      while (start < children.length && !isCancelled()) {
        let prefix = pieces.length ? [] : pending.map((piece) => piece.node);
        if (prefix.length && !fits([...prefix, make(start, start + 1)])) prefix = [];
        let best = start;
        let low = start + 1;
        let high = children.length;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          if (fits([...prefix, make(start, middle)])) { best = middle; low = middle + 1; } else high = middle - 1;
        }
        if (best === start) {
          const node = make(start, start + 1);
          pieces.push(...(isTable ? [fitAtomic(makePiece(node, block, offset))] : await splitText(node, "li", block, offset)));
          best = start + 1;
        } else pieces.push(makePiece(make(start, best), block, offset));
        offset += children.slice(start, best).reduce((sum, item) => sum + textSegments(item).length, 0);
        start = best;
        if (pieces.length % 4 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }
      return pieces.length ? pieces : [fitAtomic(makePiece(base, block))];
    }
    if (base.querySelector("p")) return splitText(base, "p", block);
    return [fitAtomic(makePiece(base, block))];
  };

  for (const [block, original] of Array.from(source.children).entries()) {
    if (isCancelled()) return [];
    if (!(original instanceof HTMLElement)) continue;
    const node = clone(original);
    const startLine = Number(node.dataset.markdownSourceStart ?? 0);
    if (breaks.some((line) => line > previousLine && line <= startLine)) flush();
    const heading = node.querySelector("h1, h2");
    if (heading) title = heading.textContent || "正文";
    previousLine = Number(node.dataset.markdownSourceEnd ?? startLine);
    if (fits([node])) append(makePiece(node, block));
    else {
      const pieces = await splitBlock(node, block);
      if (isCancelled()) return [];
      for (const piece of pieces) append(piece);
    }
    // Yield between blocks so loading/close controls remain usable for long articles.
    if (++work % 8 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  flush();
  measure.replaceChildren();
  return pages;
}
