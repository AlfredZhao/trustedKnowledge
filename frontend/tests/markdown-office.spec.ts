import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { build } from "vite";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertOfficeAssetCount, assertOfficeAssetSize } from "../src/utils/officeAssetLimits";
import type { OfficeAsset, OfficeLimits } from "../src/utils/officeTypes";

const serverLimits: OfficeLimits = { max_assets: 64, max_asset_bytes: 4_000_000, max_total_bytes: 48_000_000, max_total_pixels: 128_000_000, max_body_bytes: 56_000_000, max_output_bytes: 64_000_000, max_job_seconds: 90, client_timeout_seconds: 180 };
const legacyLimits = { ...serverLimits, max_assets: 24, max_total_bytes: 12_000_000 };
const exec = promisify(execFile);
const output = path.resolve("node_modules/.cache/office-browser-build");
const scratch = path.resolve("node_modules/.cache/office-e2e");
const backend = path.resolve("../backend");
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml" };

test.beforeAll(async () => {
  await build({ logLevel: "error", build: { outDir: output, rollupOptions: { input: { fixture: path.resolve("tests/markdown-slides.html") } } } });
  await mkdir(scratch, { recursive: true });
});

function mockPreview(payload: any) {
  const title = payload.source.blocks.find((block: any) => block.type === "heading")?.runs?.[0]?.text || "正文";
  return { pages: [0, 1].map(index => ({ layout: "content", title: index ? title + "（续）" : title, elements: [{ kind: "text", name: `title-${index}`, block: payload.source.blocks[0].id, x: 60, y: 20, w: 840, h: 70, size: 32, runs: [{ text: index ? "第二页" : title }] }] })), decorations: { cover: [], content: [] }, fonts: { latin: "Arial", east_asia: "Noto Sans CJK SC", code: "Consolas" }, colors: { text: "312D2A", paper: "FCFBFA", accent: "C74634", table_header: "312D2A", table_alternate: "F4F1ED" }, copyright: "Template copyright", footer: payload.metadata.footer, warnings: [] };
}

async function routeApp(context: BrowserContext, state: { delay?: number; gate?: Promise<void>; fail?: boolean; unauthorized?: boolean; real?: boolean; limits?: OfficeLimits; limitsFail?: boolean; requests: any[]; downloads: number; external: string[] }) {
  await context.addInitScript(() => {
    localStorage.setItem("trustedKnowledge.apiKey", "office-test-session");
    localStorage.setItem("trustedKnowledge.authUser", JSON.stringify({ username: "office-tester" }));
  });
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://office.test") { state.external.push(url.href); return route.abort(); }
    if (url.pathname.startsWith("/api/markdown/office/")) {
      expect(route.request().headers()["x-api-key"]).toBe("office-test-session");
      if (url.pathname.endsWith("/limits")) {
        return state.limitsFail ? route.fulfill({ status: 503, json: { detail: "配置暂不可用" } }) : route.fulfill({ json: state.limits || serverLimits });
      }
      const payload = route.request().postDataJSON(); state.requests.push(payload);
      if (state.gate) await state.gate;
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (state.unauthorized) return route.fulfill({ status: 401, json: { detail: "Expired" } }).catch(() => undefined);
      if (state.fail) return route.fulfill({ status: 422, json: { detail: "表格过宽，请拆分后重试。" } }).catch(() => undefined);
      const kind = url.pathname.endsWith("preview") ? "preview" : url.pathname.split("/").pop()!;
      if (state.real) {
        const dir = await mkdtemp(path.join(scratch, "job-"));
        await writeFile(path.join(dir, "request.json"), JSON.stringify(payload));
        try {
          await exec(process.env.OFFICE_TEST_PYTHON || "python", ["-m", "app.services.office.worker", dir, kind, process.env.TRUSTED_KNOWLEDGE_OFFICE_FONT_PATH || "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc"], { cwd: backend, timeout: 95_000 });
          if (kind !== "preview") state.downloads++;
          return route.fulfill({ contentType: kind === "preview" ? "application/json" : "application/octet-stream", body: await readFile(path.join(dir, kind === "preview" ? "result.json" : `aibs-markdown-proof.${kind}`)), headers: { "Cache-Control": "no-store" } });
        } catch {
          const error = await readFile(path.join(dir, "error.json"), "utf8").catch(() => '{"detail":"隔离测试需要安装后端 Office 依赖与字体。"}');
          return route.fulfill({ status: 422, contentType: "application/json", body: error });
        }
      }
      if (kind === "preview") return route.fulfill({ json: mockPreview(payload) }).catch(() => undefined);
      state.downloads++;
      return route.fulfill({ contentType: "application/octet-stream", body: Buffer.from("PK-office-test") }).catch(() => undefined);
    }
    if (url.pathname.startsWith("/api/media/")) {
      expect(route.request().headers()["x-api-key"]).toBe("office-test-session");
      return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM87mbCAANMDEgANwcAQEkBSWl8KwAAAAAASUVORK5CYII=", "base64") });
    }
    const name = url.pathname === "/" ? "tests/markdown-slides.html" : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(output, name);
    if (!file.startsWith(output + path.sep)) return route.abort();
    try { return route.fulfill({ contentType: types[path.extname(file)] || "application/octet-stream", body: await readFile(file) }); }
    catch { return route.fulfill({ status: 404, body: "Not found" }); }
  });
}

async function openOffice(page: Page, markdown = "# 可见草稿\n\n只导出这段内容。") {
  await page.goto("http://office.test/");
  await page.getByLabel("测试正文").fill(markdown);
  await page.getByRole("button", { name: "导出", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Markdown 模板与 Office 导出", exact: true })).toBeVisible();
}

async function reachable(page: Page) {
  expect(await page.evaluate(() => {
    const root = document.querySelector(".office-screen")!;
    return Array.from(root.querySelectorAll<HTMLElement>(".slide-header button,.slide-header select,.office-toolbar button,.slide-footer button,.slide-footer input")).filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1;
    }).map(node => node.textContent || node.getAttribute("aria-label"));
  })).toEqual([]);
}

test("asset limits retain exact boundaries and distinguish count, single and total encoding", () => {
  const asset = (length: number, kind: OfficeAsset["kind"] = "image"): OfficeAsset => ({ id: "test", kind, alt: "测试素材", width: 1, height: 1, data: "A".repeat(length) });
  expect(() => assertOfficeAssetCount(Array(24).fill("formula"), legacyLimits)).not.toThrow();
  expect(() => assertOfficeAssetCount([...Array(23).fill("image"), "mermaid", "formula"], legacyLimits)).toThrow(/共 25 个（图片 23、Mermaid 图 1、公式 1）/);
  const full = asset(4_000_000);
  expect(() => assertOfficeAssetSize([], full, legacyLimits)).not.toThrow();
  expect(() => assertOfficeAssetSize([full, full], full, legacyLimits)).not.toThrow();
  expect(() => assertOfficeAssetSize([], asset(4_000_001, "formula"), legacyLimits)).toThrow(/单个素材编码大小超过限制：第 1 个公式.*4,000,001 字节/);
  expect(() => assertOfficeAssetSize([full, full, full], asset(1, "mermaid"), legacyLimits)).toThrow(/素材总编码大小超过限制.*第 1 个Mermaid 图.*已处理 4 个素材.*12,000,001 字节/);
  expect(() => assertOfficeAssetCount(Array(64).fill("image"), serverLimits)).not.toThrow();
  expect(() => assertOfficeAssetCount(Array(65).fill("image"), serverLimits)).toThrow(/最多 64 个/);
  expect(() => assertOfficeAssetSize(Array(11).fill(full), full, serverLimits)).not.toThrow();
  expect(() => assertOfficeAssetSize(Array(12).fill(full), asset(4), serverLimits)).toThrow(/48,000,004 字节.*48 MB/);
});

test("server policy failure is recoverable and lowered policy rechecks cached assets", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], limitsFail: true, limits: serverLimits };
  await routeApp(context, state);
  const markdown = '# 两张图\n\n' + Array(2).fill('![图](/api/media/abcdefghijklmnopqrstuvwx12345678/content)').join('\n\n');
  await openOffice(page, markdown);
  await expect(page.getByRole('alert')).toContainText('配置暂不可用');
  expect(state.requests).toHaveLength(0);
  state.limitsFail = false;
  await page.getByRole('button', { name: '重新预览' }).click();
  await expect(page.locator('.office-canvas')).toBeVisible();
  await expect(page.locator('.office-notice')).toContainText('64 个素材／总编码 48 MB');
  state.limits = { ...serverLimits, max_assets: 1 };
  await page.getByRole('button', { name: '导出 PPTX', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('最多 1 个');
  expect(state.requests).toHaveLength(1); expect(state.downloads).toBe(0);
});

test("33 images and a three-line mixed title reach the real worker on desktop and mobile", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], real: true };
  await routeApp(context, state);
  const title = '揭开 Oracle 属性图的神秘面纱：给 DBA 的 GRAPH_TABLE 内部机制指南';
  await openOffice(page, `# ${title}\n\n` + Array(33).fill('![图](/api/media/abcdefghijklmnopqrstuvwx12345678/content)').join('\n\n'));
  await expect(page.locator('.office-canvas')).toBeVisible({ timeout: 60_000 });
  expect(state.requests[0].source.assets).toHaveLength(33);
  await page.getByLabel('跳转页码').fill('1');
  await page.getByLabel('跳转页码').press('Enter');
  const heading = page.locator('.office-canvas-text').first();
  expect((await heading.textContent())?.replace(/\n/g, '')).toBe(title);
  await expect(heading.locator(':scope > div')).toHaveCount(3);
  await expect(heading.locator(':scope > div').first()).toHaveText('揭开 Oracle 属性图的神秘面纱：');
  for (const mobile of [false, true]) {
    if (mobile) {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.getByRole('button', { name: '切换浅色主题' }).click();
    }
    await reachable(page);
    expect(await heading.evaluate(node => node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(mobile ? 'long-title-mobile.png' : 'long-title-desktop.png') });
  }
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PPTX', exact: true }).click();
  await (await download).saveAs(testInfo.outputPath('33-images-long-title.pptx'));
});

test("a source above the former 12 MB limit can now reach export", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[] };
  await routeApp(context, state);
  await context.addInitScript(() => { HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,' + 'A'.repeat(4_000_000); });
  await openOffice(page, '# 大文档\n\n' + Array(4).fill('![图](/api/media/abcdefghijklmnopqrstuvwx12345678/content)').join('\n\n'));
  await expect(page.locator('.office-canvas')).toBeVisible();
  expect(state.requests[0].source.assets.reduce((sum: number, asset: OfficeAsset) => sum + asset.data.length, 0)).toBe(16_000_000);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`asset count diagnostics ${viewport.width}x${viewport.height}: mixed graphics, themes, no fetch, retry`, async ({ page, context }) => {
    const state = { limits: legacyLimits, requests: [] as any[], downloads: 0, external: [] as string[] };
    await routeApp(context, state); await page.setViewportSize(viewport);
    let mediaRequests = 0;
    page.on("request", request => { if (request.url().includes("/api/media/")) mediaRequests++; });
    const markdown = "# 多素材\n\n" + Array(23).fill("![图片](/api/media/abcdefghijklmnopqrstuvwx12345678/content)").join("\n\n") + "\n\n```mermaid\nflowchart LR\n A --> B\n```\n\n$E=mc^2$";
    await openOffice(page, markdown);
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("共 25 个（图片 23、Mermaid 图 1、公式 1）");
    await expect(alert).toContainText("最多 24 个");
    expect(mediaRequests).toBe(0); expect(state.requests).toEqual([]);
    await expect(page.locator(".office-source")).toHaveCount(0);
    for (const light of [false, true]) {
      if (light) await page.getByRole("button", { name: "切换浅色主题" }).click();
      await reachable(page);
      expect(await alert.evaluate(node => {
        const range = document.createRange(); range.setStart(node.firstChild!, 0); range.setEnd(node.firstChild!, 1);
        return range.getBoundingClientRect().top >= node.getBoundingClientRect().top;
      })).toBe(true);
      expect(await alert.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
    await page.getByRole("button", { name: "重新预览" }).click();
    await expect(alert).toContainText("素材数量超过限制");
    await page.getByRole("button", { name: "返回编辑", exact: true }).click();
    await expect(page.getByLabel("测试正文")).toHaveValue(markdown);
    await page.getByLabel("测试正文").fill("# 已拆分\n\n保留正文。");
    await page.getByRole("button", { name: "导出", exact: true }).click();
    await expect(page.locator(".office-canvas")).toBeVisible();
  });
}

for (const [size, count, expected] of [[4_000_004, 1, "单个素材编码大小超过限制"], [4_000_000, 4, "素材总编码大小超过限制"]] as const) {
  test(`encoded size diagnostics: ${expected}`, async ({ page, context }) => {
    const state = { limits: legacyLimits, requests: [] as any[], downloads: 0, external: [] as string[] };
    await routeApp(context, state); await page.setViewportSize({ width: 320, height: 568 });
    // Inject encoded sizes only; normal media fetch/decode and source assembly still run.
    await context.addInitScript(length => { HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64," + "A".repeat(length); }, size);
    await openOffice(page, "# 编码大小\n\n" + Array(count).fill("![" + "长图片名称".repeat(30) + "](/api/media/abcdefghijklmnopqrstuvwx12345678/content)").join("\n\n"));
    await expect(page.getByRole("alert")).toContainText(expected);
    await expect(page.getByRole("alert")).toContainText("Base64 编码");
    await expect(page.getByRole("alert")).toContainText(count === 1 ? "4,000,004 字节" : "16,000,000 字节");
    await expect(page.locator(".office-source")).toHaveCount(0);
    expect(state.requests).toEqual([]); await reachable(page);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`template UI ${viewport.width}x${viewport.height}: themes/loading/dialog/navigation/download`, async ({ page, context }, testInfo) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const state = { requests: [] as any[], downloads: 0, external: [] as string[], gate };
    await routeApp(context, state); await page.setViewportSize(viewport);
    await openOffice(page);
    try { await expect(page.getByRole("button", { name: "取消处理" })).toBeVisible(); await reachable(page); }
    finally { release(); }
    await expect(page.locator(".office-canvas")).toBeVisible(); await reachable(page);
    await page.screenshot({ path: testInfo.outputPath("template-dark.png") });
    await page.getByRole("button", { name: "切换浅色主题" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    await expect(page.getByLabel("跳转页码")).toHaveValue("2");
    await page.getByLabel("跳转页码").fill("999"); await page.getByLabel("跳转页码").press("Enter");
    await expect(page.getByLabel("跳转页码")).toHaveValue("2");
    await page.getByLabel("跳转页码").fill("1.5"); await page.getByLabel("跳转页码").press("Enter");
    await expect(page.getByLabel("跳转页码")).toHaveValue("1");
    await page.getByRole("button", { name: "目录", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "模板目录", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "返回放映" }).press("Escape");
    await page.getByRole("button", { name: "展开本页" }).click();
    await expect(page.getByRole("dialog", { name: "本页详细内容", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "返回放映" }).click();
    await page.getByRole("button", { name: "导出设置" }).click();
    await page.getByLabel("副标题（可选）").fill("人工填写的副标题");
    await page.getByLabel("页脚说明 / 保密级别（可选）").fill("内部评审");
    await page.screenshot({ path: testInfo.outputPath("template-light-settings.png") });
    await page.getByRole("button", { name: "应用设置并预览" }).click();
    await expect(page.locator(".office-canvas")).toBeVisible(); await reachable(page);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出 DOCX", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("可见草稿.docx");
    expect(state.requests.at(-1).metadata.footer).toBe("内部评审");
    expect(state.external).toEqual([]);
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(stored).not.toContain("只导出这段内容");
    await page.getByRole("button", { name: "返回编辑", exact: true }).click();
    await expect(page.getByLabel("测试正文")).toHaveValue("# 可见草稿\n\n只导出这段内容。");
    await expect(page.getByLabel("测试正文")).toBeFocused();
  });
}

test("empty disabled, masked snapshot only, cancellation and recoverable errors", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], delay: 900, fail: true };
  await routeApp(context, state); await page.goto("http://office.test/");
  await page.getByLabel("测试正文").fill("");
  await expect(page.getByRole("button", { name: "导出", exact: true })).toBeDisabled();
  await page.getByLabel("测试正文").fill("# 脱敏预览\n\n电话：***");
  await page.evaluate(() => { (window as any).originalPrivateContent = "PRIVATE-ORIGINAL-12345"; });
  await page.getByRole("button", { name: "导出", exact: true }).click();
  await expect(page.getByRole("button", { name: "取消处理" })).toBeVisible();
  await page.getByRole("button", { name: "取消处理" }).click();
  await expect(page.getByRole("status")).toContainText("取消");
  await page.getByRole("button", { name: "重新预览" }).click();
  await expect(page.getByRole("alert")).toContainText("表格过宽");
  expect(JSON.stringify(state.requests)).not.toContain("PRIVATE-ORIGINAL");
  expect(JSON.stringify(state.requests)).toContain("电话：***");
  state.fail = false; state.delay = 0;
  await page.getByRole("button", { name: "重新预览" }).click();
  await expect(page.locator(".office-canvas")).toBeVisible();
});

test("default reader switches to fixed template and back, preserving original text", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[] };
  await routeApp(context, state); await page.goto("http://office.test/");
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole("button", { name: "幻灯片", exact: true }).click();
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  await page.getByLabel("演示模板").selectOption("aibs");
  await expect(page.locator(".office-canvas")).toBeVisible();
  const count = await page.locator(".slide-page-picker span").last().textContent();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator(".slide-page-picker span").last().textContent()).toBe(count);
  await page.getByLabel("演示模板").selectOption("reading");
  await expect(page.locator(".slide-page")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".slide-content").first()).toContainText("正文");
});

test("session change during download cannot download a stale private snapshot", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], delay: 0 };
  await routeApp(context, state); await openOffice(page);
  await expect(page.locator(".office-canvas")).toBeVisible();
  state.delay = 300;
  let downloads = 0; page.on("download", () => downloads++);
  await page.getByRole("button", { name: "导出 PPTX" }).click();
  await expect.poll(() => state.requests.length).toBe(2);
  await page.evaluate(() => localStorage.setItem("trustedKnowledge.apiKey", "different-session"));
  await expect(page.locator(".office-screen")).toHaveCount(0);
  expect(downloads).toBe(0);
  expect(await page.locator(".office-source").count()).toBe(0);
});

test("external images fail before fetching and media API credentials never leave the trusted origin", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[] };
  await routeApp(context, state);
  await openOffice(page, "# 外链\n\n![private](https://untrusted.example/collect)");
  await expect(page.getByRole("alert")).toContainText("本系统上传");
  expect(state.external).toEqual([]); expect(state.requests).toEqual([]);
});

test("an old export 401 cannot clear a newly switched session", async ({ page, context }) => {
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], delay: 0, unauthorized: false };
  await routeApp(context, state); await openOffice(page);
  await expect(page.locator(".office-canvas")).toBeVisible();
  state.delay = 300; state.unauthorized = true;
  await page.getByRole("button", { name: "导出 DOCX", exact: true }).click();
  await expect.poll(() => state.requests.length).toBe(2);
  await page.evaluate(() => localStorage.setItem("trustedKnowledge.apiKey", "new-valid-session"));
  await expect(page.locator(".office-screen")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("trustedKnowledge.apiKey"))).toBe("new-valid-session");
});

test("real browser IR → bounded Python worker → native PPTX/DOCX, including Mermaid and math", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const state = { requests: [] as any[], downloads: 0, external: [] as string[], real: true };
  await routeApp(context, state);
  const content = "# 集成验证\n\n这是 **原文**，保留 $E=mc^2$。\n\n![系统图片](/api/media/abcdefghijklmnopqrstuvwx12345678/content)\n\n## 表格\n\n| ID | 内容 |\n| --- | --- |\n| 1 | 保留 |\n\n## 流程\n\n```mermaid\nflowchart LR\n A[输入] --> B[输出]\n```\n\n$$\\frac{1}{2}$$\n\n```python\n    keep_indent = True\n```\n\n全文结束标记。";
  await openOffice(page, content);
  await expect.poll(async () => await page.locator(".office-canvas").count() ? "ready" : await page.getByRole("alert").textContent({ timeout: 100 }).catch(() => "pending"), { timeout: 70_000 }).toBe("ready");
  expect(state.requests[0].source.assets.length).toBe(4);
  expect(state.requests[0].source.assets.every((asset: any) => asset.data.startsWith("iVBOR"))).toBe(true);
  const margins = await page.evaluate(async assets => {
    const results = [];
    for (const asset of assets.filter((item: any) => item.kind === "formula")) {
      const image = new Image(); image.src = `data:image/png;base64,${asset.data}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let left = image.width, right = -1, top = image.height, bottom = -1;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        if (data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180 && data[i + 3] > 128) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      results.push([left, image.width - 1 - right, top, image.height - 1 - bottom, right - left + 1, bottom - top + 1]);
    }
    return results;
  }, state.requests[0].source.assets);
  expect(margins).toHaveLength(2);
  for (const sides of margins) for (const margin of sides) expect(margin).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("real-template.png") });
  for (const format of ["PPTX", "DOCX"]) {
    const pending = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: `导出 ${format}`, exact: true }).click();
    const download = await pending;
    await download.saveAs(testInfo.outputPath(`actual.${format.toLowerCase()}`));
    const bytes = await readFile(testInfo.outputPath(`actual.${format.toLowerCase()}`));
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    await expect(page.getByRole("button", { name: `导出 ${format}`, exact: true })).toBeEnabled();
  }
  expect(state.external).toEqual([]);
});
