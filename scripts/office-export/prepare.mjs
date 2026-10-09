#!/usr/bin/env node
/** Offline proof tooling. Reuses the application's Markdown parser; never starts a server. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { build } = requireFrontend('esbuild');
const { chromium } = requireFrontend('playwright');
const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg || process.argv.length !== 4) {
  console.error('Usage: node scripts/office-export/prepare.mjs INPUT.md NEW_OUTPUT_DIR');
  process.exit(2);
}
const input = await realpath(inputArg);
const inputRoot = path.dirname(input);
const output = path.resolve(outputArg);
const markdown = await readFile(input, 'utf8');
if (!markdown.trim() || markdown.length > 2_000_000) throw new Error('Markdown must contain 1–2,000,000 characters.');
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output); // Never overwrite an earlier proof or user file.
await mkdir(path.join(output, 'assets'));

const bundle = await build({
  absWorkingDir: path.join(root, 'frontend'),
  stdin: { contents: `
    import { markdownToHtml } from './src/utils/markdown';
    import { prepareMarkdownSlides } from './src/utils/markdownSlides';
    import mermaid from 'mermaid';
    import katexCss from 'katex/dist/katex.min.css?inline';
    globalThis.officeProof = { markdownToHtml, prepareMarkdownSlides, mermaid, katexCss };
  `, resolveDir: path.join(root, 'frontend') },
  bundle: true, write: false, format: 'iife', platform: 'browser', logLevel: 'error',
  plugins: [{ name: 'inline-css', setup(builder) {
    builder.onResolve({ filter: /\.css\?inline$/ }, args => ({ path: requireFrontend.resolve(args.path.slice(0, -7)), namespace: 'css-text' }));
    builder.onLoad({ filter: /.*/, namespace: 'css-text' }, async args => ({ contents: await readFile(args.path, 'utf8'), loader: 'text' }));
  } }],
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const denied = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const fontRoot = path.join(path.dirname(requireFrontend.resolve('katex/package.json')), 'dist/fonts');
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://office-proof.invalid') {
      denied.push(url.href); return route.abort();
    }
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>Office source proof</title><script src="/bundle.js"></script><main id="source"></main>' });
    if (url.pathname === '/bundle.js') return route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text });
    try {
      const isFont = url.pathname.startsWith('/fonts/');
      const base = isFont ? fontRoot : inputRoot;
      const name = decodeURIComponent(isFont ? url.pathname.slice(7) : url.pathname.slice(1));
      const file = await realpath(path.resolve(base, name));
      const ext = path.extname(file).toLowerCase();
      const types = isFont ? { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }
        : { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
      if (!file.startsWith(`${base}${path.sep}`) || !types[ext]) throw new Error('Not an allowed local asset');
      return route.fulfill({ contentType: types[ext], body: await readFile(file) });
    } catch {
      denied.push(url.href); return route.abort();
    }
  });
  await page.goto('https://office-proof.invalid/');
  await page.evaluate(async markdown => {
    const { markdownToHtml, prepareMarkdownSlides, mermaid, katexCss } = window.officeProof;
    const style = document.createElement('style');
    style.textContent = katexCss + `
      body { margin: 32px; background: white; color: #312d2a; font: 20px/1.5 'Noto Sans CJK SC', Arial, sans-serif; }
      #source { width: 1024px; } img { max-width: 960px; height: auto; }
      [data-mermaid-render] { width: 1000px; } [data-mermaid-render] svg { max-width: 100%; height: auto; }
      .tk-math-block { padding: 12px; } .tk-math-content { display: inline-block; }
      pre { white-space: pre-wrap; } table { border-collapse: collapse; }
      td,th { padding: 8px; border: 1px solid #ddd; }
    `;
    document.head.append(style);
    const prepared = prepareMarkdownSlides(markdown);
    document.querySelector('#source').innerHTML = markdownToHtml(prepared.markdown, { sourceMap: true });
    document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', htmlLabels: false, theme: 'base',
      themeVariables: { fontFamily: 'Noto Sans CJK SC, sans-serif', primaryColor: '#f4f1ed', primaryTextColor: '#312d2a', primaryBorderColor: '#c74634', lineColor: '#5c5651' } });
    let i = 0;
    for (const target of document.querySelectorAll('[data-mermaid-render]')) {
      const code = target.closest('[data-mermaid-block]').querySelector('[data-mermaid-source]').textContent;
      if (code.length > 20_000) throw new Error('Mermaid source exceeds 20,000 characters.');
      const result = await mermaid.render(`office-mermaid-${i++}`, code);
      target.innerHTML = result.svg;
    }
    await Promise.all(Array.from(document.images, image => image.decode()));
    await document.fonts.ready;
  }, markdown);

  const data = await page.evaluate(markdown => {
    const blocks = [];
    const assets = [];
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const prepared = window.officeProof.prepareMarkdownSlides(markdown);
    const manual = prepared.breaks.filter(line => /^\s*<!--\s*slide\s*-->\s*$/i.test(lines[line]));
    let lastLine = -1;
    const asset = (element, kind, alt) => {
      const id = `asset-${String(assets.length + 1).padStart(3, '0')}`;
      element.dataset.officeAsset = id;
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1 || box.width > 10000 || box.height > 10000) throw new Error(`Invalid graphic dimensions: ${id}`);
      assets.push({ id, kind, alt, width: box.width, height: box.height, file: `assets/${id}.png` });
      return { asset: id, alt };
    };
    const runs = (element, style = {}) => {
      if (element.nodeType === Node.TEXT_NODE) return [{ text: element.textContent, ...style }];
      if (!(element instanceof Element)) return [];
      if (element.matches('.katex')) return [{ ...asset(element, 'formula', element.querySelector('annotation')?.textContent ?? ''), ...style }];
      if (element.matches('img')) return [{ ...asset(element, 'image', element.getAttribute('alt') ?? ''), ...style }];
      if (element.tagName === 'BR') return [{ text: '\n', ...style }];
      const next = { ...style };
      if (element.matches('strong,b')) next.bold = true;
      if (element.matches('em,i')) next.italic = true;
      if (element.matches('code')) next.code = true;
      if (element.matches('a')) next.href = element.getAttribute('href');
      return Array.from(element.childNodes).flatMap(child => runs(child, next));
    };
    for (const wrapper of document.querySelector('#source').children) {
      const start = Number(wrapper.dataset.markdownSourceStart);
      const end = Number(wrapper.dataset.markdownSourceEnd);
      if (manual.some(line => line > lastLine && line <= start)) blocks.push({ type: 'break', sourceStart: start, sourceEnd: start });
      lastLine = end;
      const base = { sourceStart: start, sourceEnd: end };
      const element = wrapper.firstElementChild;
      if (!element) throw new Error('Unexpected Markdown block without an element.');
      if (element.matches('h1,h2,h3,h4')) blocks.push({ ...base, type: 'heading', level: Number(element.tagName[1]), runs: runs(element) });
      else if (element.matches('[data-mermaid-block]')) {
        const source = element.querySelector('[data-mermaid-source]').textContent;
        blocks.push({ ...base, type: 'graphic', ...asset(element.querySelector('[data-mermaid-render]'), 'mermaid', source) });
        blocks.push({ ...base, type: 'code', language: 'mermaid', text: source });
      } else if (element.matches('[data-code-block]')) {
        const code = element.querySelector('pre code');
        blocks.push({ ...base, type: 'code', language: code.className.replace('language-', ''), text: code.textContent });
      } else if (element.matches('.tk-math-block')) {
        if (element.querySelector('.katex-error, .tk-math-error')) throw new Error('Formula rendering failed.');
        blocks.push({ ...base, type: 'graphic', ...asset(element.querySelector('.tk-math-content'), 'formula', element.querySelector('annotation')?.textContent ?? '') });
      } else if (element.matches('.tk-table-wrapper')) {
        blocks.push({ ...base, type: 'table', rows: Array.from(element.querySelectorAll('tr'), row => Array.from(row.children, cell => runs(cell))) });
      } else if (element.matches('ul,ol')) {
        for (const li of element.children) {
          const line = Number(li.dataset.markdownSourceLine);
          const marker = lines[line]?.match(/^\s*(\d+)\.\s/);
          blocks.push({ ...base, sourceStart: line, sourceEnd: line, type: 'paragraph', list: element.tagName.toLowerCase(),
            prefix: marker ? `${marker[1]}. ` : '• ', runs: runs(li) });
        }
      } else if (element.matches('p,blockquote')) {
        let pending = [];
        const flush = () => { if (pending.length) blocks.push({ ...base, type: 'paragraph', quote: element.matches('blockquote'), runs: pending }); pending = []; };
        for (const run of runs(element)) {
          if (run.asset && assets.find(a => a.id === run.asset).kind === 'image') { flush(); blocks.push({ ...base, type: 'graphic', ...run }); }
          else pending.push(run);
        }
        flush();
      } else if (element.matches('hr')) blocks.push({ ...base, type: 'rule' });
      else throw new Error(`Unsupported block: ${element.tagName} at line ${start + 1}`);
    }
    if (document.querySelector('.katex-error, .tk-math-error')) throw new Error('One or more formulas could not be rendered.');
    return { schema: 1, blocks: blocks.map((block, i) => ({ id: `block-${i + 1}`, ...block })), assets };
  }, markdown);
  if (denied.length || errors.length) throw new Error(`Asset/render errors: ${JSON.stringify({ denied, errors })}`);
  if (data.blocks.length > 3000) throw new Error('Proof limited to 3,000 blocks.');
  for (const asset of data.assets) {
    await page.locator(`[data-office-asset="${asset.id}"]`).screenshot({ path: path.join(output, asset.file), animations: 'disabled' });
  }
  data.source_sha256 = createHash('sha256').update(markdown).digest('hex');
  data.source_file = path.basename(input);
  data.parser = 'frontend/src/utils/markdown.ts (existing renderer; no second Markdown parser)';
  data.warnings = ['Prototype: source DOM extraction is not yet a production export API.', 'Mermaid and formulas use PNG assets; Mermaid source is also retained as editable code.', 'Local assets only; business /api/media and remote assets require a future authorized resolver.'];
  await writeFile(path.join(output, 'source.md'), markdown);
  await writeFile(path.join(output, 'source.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ output, blocks: data.blocks.length, assets: data.assets.length }));
} finally { await browser.close(); }
