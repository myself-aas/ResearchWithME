/** Browser integration over the real Pages dispatcher with an isolated in-process CMS.
 * Run only after build:pages with RWM_BROWSER_TESTS=1 and a working Chromium. */
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';

const enabled = process.env.RWM_BROWSER_TESTS === '1';
const dist = path.resolve('cloudflare-pages/dist');
let server: Server;
let browser: Browser;
let origin: string;

async function fixturePage(width: number, theme: 'light' | 'dark'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  await page.addInitScript((value) => localStorage.setItem('rwm-theme', value), theme);
  return page;
}

describe.skipIf(!enabled)('Pages reader browser with isolated server fixture', () => {
  beforeAll(async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'editorial-fixture', status: 'published', title: 'A long research review examining reproducibility, methods, evidence, and open scholarly collaboration across scientific disciplines', content: 'This is a deterministic research review fixture with evidence and context.', tags: ['long-tag-about-open-science-and-reproducible-methods'] });
    (globalThis as Record<string, unknown>).__RWM_CLIENT_MANIFEST__ = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
    server = createServer(async (req, res) => {
      try {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname.startsWith('/assets/') || pathname.startsWith('/fonts/') || pathname.startsWith('/brand/') || pathname === '/webmcp.js') {
          const file = path.resolve(dist, '.' + pathname);
          if (!file.startsWith(dist + path.sep)) { res.writeHead(404).end(); return; }
          const data = await readFile(file);
          const ext = path.extname(file);
          res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' } as Record<string, string>)[ext] || 'application/octet-stream');
          res.end(data);
          return;
        }
        const response = await app.request(req.url || '/');
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch { res.writeHead(500).end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No local test server address');
    origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ executablePath: process.env.RWM_CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'] });
  }, 60000);
  afterAll(async () => {
    if (browser) await browser.close();
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  for (const width of [320, 390, 768, 1024, 1440]) {
    it(`renders the article without page overflow at ${width}px`, async () => {
      const page = await fixturePage(width, 'light');
      try {
        const response = await page.goto(`${origin}/post/editorial-fixture`);
        expect(response?.status()).toBe(200);
        expect(await page.locator('h1').innerText()).toContain('A long research review');
        expect(await page.locator('aside[aria-label="Reading controls"]').evaluate((element) => getComputedStyle(element).position)).toBe('static');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      } finally { await page.close(); }
    });
  }
  it('keeps the home search clear action usable at mobile size', async () => {
    const page = await fixturePage(320, 'light');
    try {
      await page.goto(`${origin}/`);
      const input = page.locator('#catalog-search');
      await input.fill('reproducibility');
      const clear = page.getByRole('button', { name: 'Clear search' });
      await clear.waitFor({ state: 'visible' });
      const bounds = await clear.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      await clear.click();
      expect(await input.inputValue()).toBe('');
    } finally { await page.close(); }
  });
  it('keeps filters usable and avoids animated scrolling with reduced motion', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.addInitScript(() => {
        const state = window as Window & { lastScrollBehavior?: ScrollBehavior };
        Element.prototype.scrollIntoView = function (options) {
          if (typeof options === 'object') state.lastScrollBehavior = options.behavior;
        };
      });
      await page.goto(`${origin}/`);
      const format = page.getByRole('button', { name: 'Paper Review', exact: true });
      await format.waitFor({ state: 'visible' });
      const box = await format.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await format.click();
      expect(await format.getAttribute('aria-pressed')).toBe('true');
      await page.getByRole('button', { name: 'Clear all filters' }).click();
      expect(await page.evaluate(() => (window as Window & { lastScrollBehavior?: ScrollBehavior }).lastScrollBehavior)).toBe('auto');
      expect(await format.getAttribute('aria-pressed')).toBe('false');
    } finally { await page.close(); }
  });
  it('keeps related discovery reset actions aligned and usable', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.goto(`${origin}/`);
      await page.getByRole('group', { name: 'Editorial Column' }).getByRole('button', { name: 'Research Reviews' }).click();
      await page.locator('#catalog-search').fill('query-with-no-matches');
      const actions = ['All columns', 'Clear all filters', 'Reset filters'].map((name) => page.locator('#articles-feed').getByRole('button', { name, exact: true }));
      for (const action of actions) {
        await action.waitFor({ state: 'visible' });
        expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        expect(await action.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('9999px');
      }
      await actions[2].click();
      expect(await page.locator('#catalog-search').inputValue()).toBe('');
    } finally { await page.close(); }
  });
  it('honors the reader static motion preference for the document scroller', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    try {
      await page.addInitScript(() => localStorage.setItem('rwm-motion-mode', 'static'));
      await page.goto(`${origin}/`);
      await page.waitForFunction(() => document.documentElement.dataset.motionMode === 'static');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    } finally { await page.close(); }
  });
  it('renders dark mode and lets the reader save by keyboard', async () => {
    const page = await fixturePage(390, 'dark');
    try {
      await page.goto(`${origin}/post/editorial-fixture`);
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'reme-dark');
      const button = page.locator('article button').filter({ hasText: /^Save$/ });
      await button.waitFor({ state: 'visible' });
      for (let i = 0; i < 60 && !(await button.evaluate((element) => document.activeElement === element)); i++) await page.keyboard.press('Tab');
      expect(await button.evaluate((element) => document.activeElement === element)).toBe(true);
      await page.keyboard.press('Enter');
      await page.locator('article button').filter({ hasText: /^Saved$/ }).waitFor();
      await page.reload();
      await page.locator('article button').filter({ hasText: /^Saved$/ }).waitFor();
    } finally { await page.close(); }
  });
});
