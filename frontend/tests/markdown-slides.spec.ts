import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("node_modules/.cache/slides-browser-build");
const extensions: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".svg": "image/svg+xml" };

test.beforeAll(async () => {
  await build({ logLevel: "error", build: { outDir: output, rollupOptions: { input: { main: path.resolve("index.html"), fixture: path.resolve("tests/markdown-slides.html") } } } });
});

async function routeBuild(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem("trustedKnowledge.apiKey", "test-session");
    localStorage.setItem("trustedKnowledge.authUser", JSON.stringify({ username: "slide-tester" }));
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/image.svg") {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1200"><rect width="1800" height="1200" fill="#3d998f"/><text x="60" y="140" font-size="80">Delayed image</text></svg>' });
    }
    const relative = url.pathname === "/" ? (url.searchParams.has("markdown_slides") ? "index.html" : "tests/markdown-slides.html") : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(output, relative);
    if (!file.startsWith(`${output}${path.sep}`)) return route.abort();
    try { await route.fulfill({ body: await readFile(file), contentType: extensions[path.extname(file)] ?? "application/octet-stream" }); }
    catch { await route.fulfill({ status: 404, body: "Not found" }); }
  });
}

test.beforeEach(async ({ context, page }) => {
  await routeBuild(context);
  await page.goto("http://slides.test/");
  await expect(page.getByLabel("测试正文")).toBeVisible();
});

async function loadContent(page: Page, markdown: string, caret = 0) {
  await page.getByLabel("测试正文").fill(markdown);
  await page.getByLabel("测试正文").evaluate((textarea: HTMLTextAreaElement, position) => { textarea.focus(); textarea.setSelectionRange(position, position); }, caret);
}

async function inline(page: Page, markdown: string) {
  await loadContent(page, markdown);
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
}

async function checkLayout(page: Page) {
  const problems = await page.evaluate(() => {
    const errors: string[] = [];
    const screen = document.querySelector<HTMLElement>(".slide-screen")!;
    const viewport = document.querySelector<HTMLElement>(".slide-viewport")!;
    const content = viewport.querySelector<HTMLElement>(".slide-content");
    if (screen.scrollHeight > screen.clientHeight + 2 || screen.scrollWidth > screen.clientWidth + 2) errors.push("screen overflow");
    if (content && content.getBoundingClientRect().height > viewport.clientHeight + 2) errors.push(`content clipped: ${content.getBoundingClientRect().height} > ${viewport.clientHeight}`);
    if (viewport.scrollWidth > viewport.clientWidth + 2) errors.push("horizontal overflow");
    for (const button of screen.querySelectorAll<HTMLElement>(".slide-header button,.slide-footer button,.slide-footer input")) {
      const rect = button.getBoundingClientRect();
      if (rect.x < 0 || rect.y < 0 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1) errors.push(`control unreachable: ${button.textContent}`);
    }
    return errors;
  });
  expect(problems).toEqual([]);
}

test("manual separators never split code, formulas or comments", async ({ page }) => {
  const result = await page.evaluate(() => {
    const { prepareMarkdownSlides: prepare } = (window as any).slidesTest;
    const code = "# 标题\n\n```md\n## 示例标题\n<!-- slide -->\n```\n\n$$\n<!-- slide -->\n$$\n\n<!--\n<!-- slide -->\n\n<!-- slide -->\n下一页";
    return { explicit: prepare(code), headings: prepare("# A\n\n## B\n\n```\n## not a heading\n```"), rule: prepare("正文\n\n---\n\n正文") };
  });
  expect(result.explicit.breaks).toEqual([14]);
  expect(result.explicit.markdown).toContain("## 示例标题\n<!-- slide -->");
  expect(result.headings.breaks).toEqual([0, 2]);
  expect(result.rule.breaks).toEqual([]);
});

test("pagination preserves prose, code indentation, lists and every table row without scrolling", async ({ page }) => {
  const prose = "长段落里的加粗文字和链接必须完整保留。😀".repeat(180);
  const code = Array.from({ length: 90 }, (_, index) => `    print(${index})  # keep indentation`).join("\n");
  const markdown = `# 内容\n\n**${prose}**\n\n\`\`\`python\n${code}\n\`\`\`\n\n${Array.from({ length: 40 }, (_, index) => `${index + 1}. 列表${index}`).join("\n")}\n\n| 编号 | 内容 |\n| --- | --- |\n${Array.from({ length: 45 }, (_, index) => `| ${index} | 单元格${index} |`).join("\n")}`;
  const result = await page.evaluate(async ({ markdown, code }) => {
    const { prepareMarkdownSlides, paginateMarkdownSlides, markdownToHtml } = (window as any).slidesTest;
    await document.fonts.ready;
    const source = document.createElement("div");
    const measure = document.createElement("div");
    for (const node of [source, measure]) { node.className = "markdown-preview slide-content"; node.style.width = "550px"; node.style.setProperty("--slide-height", "300px"); document.body.append(node); }
    const prepared = prepareMarkdownSlides(markdown);
    source.innerHTML = markdownToHtml(prepared.markdown, { sourceMap: true });
    const slides = await paginateMarkdownSlides(source, measure, 550, 300, prepared.breaks);
    const container = document.createElement("div");
    container.innerHTML = slides.map((slide: any) => slide.detailHtml).join("");
    const heights = slides.map((slide: any) => { measure.innerHTML = slide.html; return measure.getBoundingClientRect().height; });
    const result = { count: slides.length, code: Array.from(container.querySelectorAll("pre code"), (node) => node.textContent).join(""), prose: Array.from(container.querySelectorAll("p"), (node) => node.textContent).join(""), items: container.querySelectorAll("li").length, rows: container.querySelectorAll("tbody tr").length, scaled: slides.filter((slide: any) => slide.scaled).length, maxHeight: Math.max(...heights), originalCodeLength: code.length };
    source.remove(); measure.remove();
    return result;
  }, { markdown, code });
  expect(result.count).toBeGreaterThan(10);
  expect(result.code).toBe(code);
  expect(result.prose).toBe(prose);
  expect(result.items).toBe(40);
  expect(result.rows).toBe(45);
  expect(result.scaled).toBe(0);
  expect(result.maxHeight).toBeLessThanOrEqual(300);
});

test("desktop opens isolated snapshot; edits and multiple decks cannot overwrite it; refresh and logout", async ({ page, context }) => {
  await loadContent(page, "# 原草稿\n\n未保存的第一篇内容。");
  const firstPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  const first = await firstPromise;
  await expect(first.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  await expect(first.locator("[data-slide-page]")).toContainText("未保存的第一篇内容");
  expect(first.url()).toMatch(/markdown_slides=[a-f0-9]{32}$/);
  expect(first.url()).not.toContain("原草稿");
  await loadContent(page, "# 第二篇\n\n第二篇独立内容。");
  const secondPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  const second = await secondPromise;
  await expect(second.locator("[data-slide-page]")).toContainText("第二篇独立内容");
  await first.reload();
  await expect(first.locator("[data-slide-page]")).toContainText("未保存的第一篇内容");
  await checkLayout(first);
  const stored = await first.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("未保存的第一篇内容");
  await page.evaluate(() => { localStorage.removeItem("trustedKnowledge.apiKey"); });
  await expect(first.getByRole("status")).toContainText("失效");
  await expect(second.getByRole("status")).toContainText("失效");
  await expect(first.locator("[data-slide-page]")).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`viewport ${viewport.width}x${viewport.height}: keyboard, themes, directory and return`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const markdown = `# 演示标题\n\n${"用于分页的正文。".repeat(250)}\n\n## 下一章\n\n${"下一章内容。".repeat(150)}`;
    await inline(page, markdown);
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("dark.png") });
    await page.locator(".slide-screen").press("ArrowDown");
    await expect(page.locator("[data-slide-page]")).toHaveAttribute("data-slide-page", "2");
    await checkLayout(page);
    await page.getByRole("button", { name: "切换浅色主题" }).click();
    await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
    await checkLayout(page);
    await page.getByRole("button", { name: "目录", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "幻灯片目录", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("light-directory.png") });
    await page.getByRole("button", { name: "返回放映", exact: true }).press("Escape");
    await expect(page.locator(".slide-panel")).toHaveCount(0);
    await expect(page.locator(".slide-screen")).toBeFocused();
    await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("[data-slide-page]")).toHaveAttribute("data-slide-page", "3");
    await page.getByRole("button", { name: "返回编辑", exact: true }).click();
    await expect(page.getByLabel("测试正文")).toHaveValue(markdown);
    expect(await page.evaluate(() => document.getElementById("root")!.inert)).toBe(false);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    expect(await page.getByLabel("测试正文").evaluate((textarea: HTMLTextAreaElement) => textarea.selectionStart)).toBe(0);
  });
}

test("late images, Mermaid and math fit; details are an explicit scrollable exception", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await inline(page, "# 图文\n\n![延迟图片](/image.svg)\n\n## 图表\n\n```mermaid\ngraph TD\nA[开始] --> B[结束]\n```\n\n## 公式\n\n$$\n\\frac{1}{2} + \\sqrt{x}\n$$");
  await page.waitForTimeout(1100);
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  const count = Number(await page.getByLabel("跳转页码").getAttribute("max"));
  let diagramFound = false;
  let formulaFound = false;
  for (let i = 0; i < count; i++) {
    await checkLayout(page);
    diagramFound ||= await page.locator("[data-slide-page] .markdown-mermaid-render svg").count() > 0;
    formulaFound ||= await page.locator("[data-slide-page] .katex").count() > 0;
    if (await page.locator("[data-slide-page] .markdown-mermaid-render svg").count()) await page.screenshot({ path: testInfo.outputPath("mermaid.png") });
    if (i < count - 1) await page.getByRole("button", { name: "下一页", exact: true }).click();
  }
  expect(diagramFound).toBe(true);
  expect(formulaFound).toBe(true);
  await page.getByRole("button", { name: "展开本页", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "本页详细内容", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "返回放映", exact: true }).click();
  await checkLayout(page);
});

test("desktop PWA stays inline and unsupported fullscreen remains usable", async ({ page, context }) => {
  await page.evaluate(() => { Object.defineProperty(navigator, "standalone", { value: true }); });
  await loadContent(page, "# PWA\n\n独立窗口正文");
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  expect(context.pages()).toHaveLength(1);
  await page.evaluate(() => { Element.prototype.requestFullscreen = async () => { throw new Error("denied"); }; });
  await page.getByRole("button", { name: "全屏", exact: true }).click();
  await expect(page.locator(".slide-caption")).toContainText("未允许全屏");
  await checkLayout(page);
});

test.describe("touchscreen landscape", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });
  test("wide mobile screens still open inline without requesting a popup", async ({ page, context }) => {
    await loadContent(page, "# 手机横屏\n\n无需新标签页。");
    await page.getByRole("button", { name: "幻灯片", exact: true }).click();
    await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
    expect(context.pages()).toHaveLength(1);
    await expect(page.locator(".slide-caption")).not.toContainText("新标签页未能打开");
    await checkLayout(page);
  });
});

test("indivisible oversized table row is fitted and all original content is available in details", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const cell = "这是不可丢失的单元格。".repeat(220);
  await inline(page, `| 表头 | 备注 |\n| --- | --- |\n| ${cell} | 原始内容 |`);
  await expect(page.locator(".slide-caption")).toContainText("缩放");
  await checkLayout(page);
  await page.getByRole("button", { name: "展开本页", exact: true }).click();
  await expect(page.locator(".slide-detail-content td").first()).toHaveText(cell);
  await page.getByRole("button", { name: "返回放映", exact: true }).press("Tab");
  await expect(page.getByRole("button", { name: "返回放映", exact: true })).toBeFocused();
});

test("broken images and invalid Mermaid preserve navigation and original diagram source", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await inline(page, "# 异常资源\n\n![图片说明](/not-found.png)\n\n```mermaid\nthis is not a diagram\n```\n\n## 正常下一章\n\n可以继续。");
  await expect(page.locator(".slide-caption")).toContainText("图片加载失败");
  await checkLayout(page);
  await page.getByRole("button", { name: "展开本页", exact: true }).click();
  await expect(page.locator(".slide-detail-content [data-mermaid-source]")).toHaveText("this is not a diagram");
  await page.getByRole("button", { name: "返回放映", exact: true }).click();
  await page.locator(".slide-screen").press("End");
  await expect(page.locator("[data-slide-page]")).toContainText("可以继续");
});

test("lazy-load failure returns safely to the unmodified draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/\/assets\/MarkdownSlides-.*\.js$/, (route) => route.abort());
  await loadContent(page, "未保存正文");
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("加载失败");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByLabel("测试正文")).toHaveValue("未保存正文");
  expect(await page.evaluate(() => document.getElementById("root")!.inert)).toBe(false);
});

test("empty content disabled; unavailable popup falls back; invalid direct link is recoverable", async ({ page }) => {
  await loadContent(page, "   ");
  await expect(page.getByRole("button", { name: "幻灯片", exact: true })).toBeDisabled();
  await inline(page, "正文");
  await expect(page.locator(".slide-caption")).toContainText("新标签页未能打开");
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await page.goto("http://slides.test/?markdown_slides=invalid");
  await expect(page.getByRole("status")).toContainText("失效");
  await expect(page.getByRole("button", { name: "返回工作台" })).toBeVisible();
});

test("resizing keeps the current reading location rather than returning to page one", async ({ page }) => {
  await inline(page, `# 开头\n\n正文\n\n## 中间章节\n\n${"中间章节正文。".repeat(350)}\n\n## 尾声\n\n最后一章。`);
  await page.locator(".slide-screen").press("End");
  await expect(page.locator("[data-slide-page]")).toContainText("最后一章");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("[data-slide-page]")).toContainText("最后一章");
  await checkLayout(page);
});
