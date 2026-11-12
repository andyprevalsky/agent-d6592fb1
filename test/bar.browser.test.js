// Drives demo/index.html in headless Chromium and checks the bar's conditional behaviour,
// placement directly above the composer, left/right layout and the archive action.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'test-artifacts');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
let server, browser, base;

function findChromium() {
  for (const dir of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright', path.join(process.env.HOME || '', '.cache/ms-playwright')]) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const d of fs.readdirSync(dir).sort().reverse()) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
        const exe = path.join(dir, d, rel);
        if (d.startsWith('chromium') && fs.existsSync(exe)) return exe;
      }
    }
  }
  return undefined; // fall back to playwright's own lookup
}

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/demo/index.html`;
  browser = await chromium.launch({ executablePath: findChromium() });
  fs.mkdirSync(shots, { recursive: true });
});

after(async () => { await browser?.close(); server?.close(); });

async function open(viewport, query = '') {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(base + query);
  await page.waitForFunction(() => window.__demo);
  return { page, errors };
}

test('hidden while the agent is still working', async () => {
  const { page, errors } = await open({ width: 1440, height: 900 });
  assert.equal(await page.getByTestId('task-completed-bar').isVisible(), false);
  await page.screenshot({ path: path.join(shots, 'desktop-active.png') });
  assert.deepEqual(errors, []);
  await page.close();
});

test('appears directly above the composer when the task completes, text left and button right', async () => {
  const { page, errors } = await open({ width: 1440, height: 900 });
  await page.selectOption('#status', 'COMPLETED');
  const bar = page.getByTestId('task-completed-bar');
  assert.equal(await bar.isVisible(), true);
  assert.match(await bar.innerText(), /Task Completed/);
  const button = page.getByRole('button', { name: 'Archive Agent' });
  assert.equal(await button.isVisible(), true);

  const b = await bar.boundingBox();
  const c = await page.getByTestId('composer').boundingBox();
  const label = await bar.locator('.rose-task-completed-bar__label').boundingBox();
  const btn = await button.boundingBox();
  assert.ok(b.y + b.height <= c.y && c.y - (b.y + b.height) <= 12, `bar sits right above composer (gap ${c.y - b.y - b.height}px)`);
  assert.ok(Math.abs(b.x - c.x) < 1 && Math.abs(b.width - c.width) < 1, 'bar matches the composer column');
  assert.ok(label.x < btn.x && btn.x + btn.width > b.x + b.width - 16, 'label on the left, button on the right');
  assert.equal(await page.evaluate(() => document.querySelector('.composer').previousElementSibling.dataset.testid), 'task-completed-bar');

  // Pinned with the composer: scrolling the transcript does not move it.
  await page.evaluate(() => { document.querySelector('.column').style.height = '3000px'; document.querySelector('.scroll').scrollTop = 2000; });
  assert.deepEqual(await bar.boundingBox(), b);

  await page.screenshot({ path: path.join(shots, 'desktop-completed.png') });
  assert.deepEqual(errors, []);
  await page.close();
});

test('Archive Agent calls onArchive and hides the bar', async () => {
  const { page } = await open({ width: 1440, height: 900 }, '?status=completed');
  const bar = page.getByTestId('task-completed-bar');
  assert.equal(await bar.isVisible(), true);
  await page.getByRole('button', { name: 'Archive Agent' }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid=task-completed-bar]').hidden);
  assert.equal(await page.getByTestId('archive-log').innerText(), 'archived demo-agent');
  await page.close();
});

test('responsive: fits a 375px phone viewport without overflow', async () => {
  const { page } = await open({ width: 375, height: 740 }, '?status=COMPLETED');
  const bar = page.getByTestId('task-completed-bar');
  const b = await bar.boundingBox();
  const btn = await page.getByRole('button', { name: 'Archive Agent' }).boundingBox();
  const c = await page.getByTestId('composer').boundingBox();
  assert.ok(b.x >= 0 && b.x + b.width <= 375, 'bar within viewport');
  assert.ok(btn.x + btn.width <= b.x + b.width, 'button inside bar');
  assert.ok(b.y + b.height <= c.y, 'still above composer');
  assert.ok(b.height < 60, `single row (${b.height}px)`);
  await page.screenshot({ path: path.join(shots, 'mobile-completed.png') });
  await page.close();
});
