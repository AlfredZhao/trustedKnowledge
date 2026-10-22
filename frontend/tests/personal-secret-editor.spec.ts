import { expect, test, type Locator, type Page } from "@playwright/test";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("node_modules/.cache/personal-secrets-browser-build");
const extensions: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };

test.beforeAll(async () => {
  await build({ logLevel: "error", build: { outDir: output, rollupOptions: { input: path.resolve("tests/personal-secret-editor.html") } } });
});

test.beforeEach(async ({ context, page }) => {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://secret-editor.test") return route.abort();
    const relative = url.pathname === "/" ? "tests/personal-secret-editor.html" : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(output, relative);
    if (!file.startsWith(`${output}${path.sep}`)) return route.abort();
    try { return route.fulfill({ body: await readFile(file), contentType: extensions[path.extname(file)] ?? "application/octet-stream" }); }
    catch { return route.fulfill({ status: 404, body: "Not found" }); }
  });
  await page.goto("http://secret-editor.test/");
  await expect(page.getByRole("heading", { name: "编辑机密" })).toBeVisible();
});

async function reachable(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function noOverflow(page: Page) {
  expect(await page.getByRole("dialog").evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`editor ${viewport.width}x${viewport.height}: themes, empty, preview, save and busy states`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const notes = page.getByRole("textbox", { name: "备注", exact: true });
    const modes = page.getByRole("group", { name: "备注显示模式" });
    for (const theme of ["dark", "light"]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await notes.fill("");
      expect((await notes.boundingBox())!.height).toBeGreaterThanOrEqual(360);
      await modes.getByRole("button", { name: "Markdown 预览" }).click();
      await expect(page.getByText("暂无备注可预览。")).toBeVisible();
      expect((await page.getByRole("region", { name: "备注 Markdown 预览" }).boundingBox())!.height).toBeGreaterThanOrEqual(360);
      await modes.getByRole("button", { name: "编辑", exact: true }).click();
      const markdown = `# 测试标题\n\n**重要备注**\n\n- 列表项\n\n| 字段 | 内容 |\n| --- | --- |\n| 测试 | ${"long_value_".repeat(40)} |\n\n\`\`\`text\n${"code_".repeat(180)}\n\`\`\``;
      await notes.fill(markdown);
      await expect(notes).toHaveAttribute("maxlength", "4000");
      await modes.getByRole("button", { name: "Markdown 预览" }).click();
      const preview = page.getByRole("region", { name: "备注 Markdown 预览" });
      await expect(preview.getByRole("heading", { name: "测试标题" })).toBeVisible();
      await expect(preview.locator("strong")).toHaveText("重要备注");
      await expect(preview.locator("li")).toHaveText("列表项");
      await expect(preview.locator("table")).toHaveCount(1);
      await noOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${theme}.png`) });
      const save = page.getByRole("button", { name: "保存修改" });
      await reachable(page, save);
      await save.click();
      expect(await page.evaluate(() => (window as any).secretEditorTest.savedNotes)).toBe(markdown);
      await expect(page.getByRole("button", { name: "保存中" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "删除", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "关闭", exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.evaluate(() => { (window as any).secretEditorTest.setSaving(false); (window as any).secretEditorTest.setError("测试保存失败，原文保留"); });
      await expect(page.getByText("测试保存失败，原文保留")).toBeVisible();
      await modes.getByRole("button", { name: "编辑", exact: true }).click();
      await expect(notes).toHaveValue(markdown);
      await noOverflow(page);
      await reachable(page, page.getByRole("button", { name: "关闭", exact: true }));
      await page.evaluate(() => (window as any).secretEditorTest.setError(null));
    }
  });
}

test("switching modes preserves draft, caret, scroll and height; closing or changing records resets mode", async ({ page }) => {
  const notes = page.getByRole("textbox", { name: "备注", exact: true });
  const modes = page.getByRole("group", { name: "备注显示模式" });
  const markdown = Array.from({ length: 100 }, (_, i) => `第 ${i} 行备注明文`).join("\n");
  await notes.fill(markdown);
  const before = await notes.evaluate((node: HTMLTextAreaElement) => {
    node.style.height = "420px";
    node.setSelectionRange(300, 320);
    node.scrollTop = 400;
    return { start: node.selectionStart, end: node.selectionEnd, top: node.scrollTop };
  });
  await modes.getByRole("button", { name: "Markdown 预览" }).click();
  await modes.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(notes).toBeFocused();
  expect(await notes.evaluate((node: HTMLTextAreaElement) => ({ start: node.selectionStart, end: node.selectionEnd, top: node.scrollTop }))).toEqual(before);
  expect((await notes.boundingBox())!.height).toBe(420);
  await expect(notes).toHaveValue(markdown);
  await modes.getByRole("button", { name: "Markdown 预览" }).click();
  await page.evaluate(() => (window as any).secretEditorTest.changeRecord());
  await expect(notes).toBeVisible();
  await expect(notes).toHaveValue("另一条备注");
  await modes.getByRole("button", { name: "Markdown 预览" }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator(".markdown-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "打开编辑" }).click();
  await expect(notes).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "新增", exact: true }).click();
  await expect(page.getByRole("heading", { name: "新增机密" })).toBeVisible();
  await expect(notes).toHaveValue("");
  expect((await notes.boundingBox())!.height).toBeGreaterThanOrEqual(360);
  await expect(page.getByRole("button", { name: "保存机密" })).toBeDisabled();
  await page.getByRole("textbox", { name: "系统名称" }).fill("新增测试");
  await expect(page.getByRole("button", { name: "保存机密" })).toBeEnabled();
});

test("private preview never loads images or diagrams, executes HTML, persists notes or enables exports", async ({ page }) => {
  const image = "![保密图片](https://tracker.invalid/secret.png)";
  const markdown = `# ${image}\n\n${image}\n\n- ${image}\n\n> ${image}\n\n| ${image} | 标题 |\n| --- | --- |\n| ${image} | 内容 |\n\n![内部](/api/media/private/content)\n\n![协议相对](//tracker.invalid/a)\n\n<img src="https://tracker.invalid/raw" onerror="window.secretXss=1">\n<script>window.secretXss=1</script>\n\n[危险](javascript:alert) [数据](data:text/html,test) [安全](https://example.test/)\n\n\`\`\`mermaid\ngraph TD; A-->B\n\`\`\``;
  await page.getByRole("textbox", { name: "备注", exact: true }).fill(markdown);
  await page.evaluate(() => document.fonts.ready);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.getByRole("button", { name: "Markdown 预览" }).click();
  const preview = page.getByRole("region", { name: "备注 Markdown 预览" });
  await expect(preview.locator("img, iframe, script, [data-mermaid-render]")).toHaveCount(0);
  await expect(preview).toContainText("图片已禁用");
  await expect(preview.locator("code")).toHaveText("graph TD; A-->B");
  await expect(preview.locator("a")).toHaveCount(1);
  await expect(preview.getByRole("link", { name: "安全" })).toHaveAttribute("rel", "noreferrer");
  await expect(page.getByRole("button", { name: /幻灯片|导出|上传/ })).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(requests.filter(url => /tracker\.invalid|\/api\/media|mermaid/i.test(url))).toEqual([]);
  expect(await page.evaluate(() => (window as any).secretXss)).toBeUndefined();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("保密图片");
  const regular = await page.evaluate(markdown => (window as any).secretEditorTest.markdownToHtml(markdown), `${image}\n\n\`\`\`mermaid\ngraph TD; A-->B\n\`\`\``);
  expect(regular).toContain('<img src="https://tracker.invalid/secret.png"');
  expect(regular).toContain("data-mermaid-render");
});
