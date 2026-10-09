#!/usr/bin/env node
/** Capture explicitly approximate HTML layout proofs without running a service. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, realpath } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = requireFrontend('playwright');
if (process.argv.length !== 3) throw new Error('Usage: node scripts/office-export/check-preview.mjs OUTPUT_DIR');
const directory = await realpath(process.argv[2]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://office-preview.invalid') return route.abort();
    try {
      const relative = decodeURIComponent(url.pathname.slice(1) || 'ppt-layout-preview.html');
      const file = await realpath(path.resolve(directory, relative));
      const type = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' }[path.extname(file)];
      if (!file.startsWith(directory + path.sep) || !type) return route.abort();
      return route.fulfill({ contentType: type, body: await readFile(file) });
    } catch { return route.abort(); }
  });
  await page.goto('https://office-preview.invalid/');
  await page.evaluate(async () => { await Promise.all(Array.from(document.images, image => image.decode())); await document.fonts.ready; });
  const errors = await page.evaluate(() => {
    const errors = [];
    for (const box of document.querySelectorAll('[data-object]')) {
      if (box.scrollHeight > box.clientHeight + 3 || box.scrollWidth > box.clientWidth + 3) errors.push({ object: box.dataset.object, message: 'HTML content exceeds planned box', width: [box.scrollWidth, box.clientWidth], height: [box.scrollHeight, box.clientHeight] });
    }
    return errors;
  });
  const pages = page.locator('.page');
  for (let i = 0; i < await pages.count(); i++) {
    await pages.nth(i).screenshot({ path: path.join(directory, `preview-${String(i + 1).padStart(2, '0')}.png`) });
  }
  const report = { renderer: 'Chromium HTML approximation — NOT Microsoft Office', delivery_approved: false, pages: await pages.count(), errors };
  await page.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll('.page'));
    const heading = document.createElement('p');
    heading.textContent = 'HTML 近似排版检查（不是 Office 渲染）；最多展示前 60 页。';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,320px);gap:10px';
    for (const [index, sheet] of sheets.slice(0, 60).entries()) {
      const frame = document.createElement('div');
      frame.style.cssText = 'position:relative;width:320px;height:204px;font-size:12px';
      frame.append(`Page ${index + 1}`);
      sheet.style.cssText = 'position:absolute;left:0;top:20px;margin:0;transform:scale(.25);transform-origin:top left';
      frame.append(sheet); grid.append(frame);
    }
    document.body.replaceChildren(heading, grid);
  });
  await page.screenshot({ path: path.join(directory, 'contact-sheet.png'), fullPage: true });
  await writeFile(path.join(directory, 'html-preview-check.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
