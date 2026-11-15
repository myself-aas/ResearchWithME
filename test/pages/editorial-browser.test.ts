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
    const profile = { slug: 'fixture-author', published: true, display_name: 'Fixture Researcher', bio: 'Studies reproducibility.', role: 'Researcher', domain: 'Methods', institution: 'Fixture Lab', avatar_url: '', orcid: '0000-0002-1825-0097', github: 'https://github.com/fixture', website: '', scholar: '', created_at: '2026-01-01T00:00:00.000Z' };
    const app = createTestApp({ profileRows: [profile] });
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
  it('filters the contributor directory and clears an empty search', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.goto(`${origin}/authors`);
      await page.getByText('Fixture Researcher').first().waitFor();
      const group = page.getByRole('group', { name: 'Linked identifier' });
      await group.getByRole('button', { name: 'Has an ORCID' }).click();
      expect(await group.getByRole('button', { name: 'Has an ORCID' }).getAttribute('aria-pressed')).toBe('true');
      expect(await page.getByText('Fixture Researcher').count()).toBeGreaterThan(0);
      await page.locator('#author-search').fill('no-such-contributor');
      await page.getByRole('heading', { name: 'No contributors match those filters' }).waitFor();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      expect(await page.locator('#author-search').inputValue()).toBe('');
      expect(await group.getByRole('button', { name: 'All contributors' }).getAttribute('aria-pressed')).toBe('true');
    } finally { await page.close(); }
  });

  it('renders author profile actions and public identifiers in dark mode', async () => {
    const page = await fixturePage(390, 'dark');
    try {
      const response = await page.goto(`${origin}/author/fixture-author`);
      expect(response?.status()).toBe(200);
      expect(await page.getByRole('heading', { name: 'Fixture Researcher', level: 1 }).count()).toBe(1);
      for (const action of [page.getByRole('button', { name: 'Share profile' }), page.getByRole('link', { name: 'Writer studio' })]) {
        await action.waitFor({ state: 'visible' });
        expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        expect(await action.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('9999px');
      }
      expect(await page.getByRole('link', { name: 'ORCID', exact: true }).getAttribute('href')).toBe('https://orcid.org/0000-0002-1825-0097');
    } finally { await page.close(); }
  });

  it('requires an external paper title before copying or downloading a citation', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.goto(`${origin}/cite`);
      await page.getByRole('button', { name: 'External paper or DOI' }).click();
      expect(await page.locator('#citation-output').inputValue()).toBe('');
      expect(await page.getByRole('button', { name: 'Copy citation' }).isDisabled()).toBe(true);
      await page.getByRole('button', { name: 'bibtex', exact: true }).click();
      expect(await page.getByRole('button', { name: 'Download .bib' }).isDisabled()).toBe(true);
      await page.locator('#custom-title').fill('A test paper');
      expect(await page.getByRole('button', { name: 'Copy citation' }).isEnabled()).toBe(true);
      const output = await page.locator('#citation-output').inputValue();
      expect(output).toContain('A test paper');
      expect(output).not.toContain('Maya Lin');
      expect(output).not.toContain('/post/editorial-fixture');
      expect(output).not.toContain('ResearchWithMe Press');
    } finally { await page.close(); }
  });

  it('confirms clearing the reading list and announces the empty state', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.goto(`${origin}/post/editorial-fixture`);
      await page.locator('article button').filter({ hasText: /^Save$/ }).click();
      await page.locator('article button').filter({ hasText: /^Saved$/ }).waitFor();
      await page.goto(`${origin}/bookmarks`);
      await page.getByRole('link', { name: 'Read', exact: true }).waitFor();
      for (const action of [page.getByRole('link', { name: 'Read', exact: true }), page.getByRole('button', { name: 'Remove', exact: true })]) {
        expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        expect(await action.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('9999px');
      }
      await page.getByRole('button', { name: 'Clear list' }).click();
      await page.getByRole('button', { name: 'Keep them' }).click();
      expect(await page.getByRole('link', { name: 'Read', exact: true }).count()).toBe(1);
      await page.getByRole('button', { name: 'Clear list' }).click();
      await page.getByRole('button', { name: 'Yes, clear' }).click();
      await page.getByRole('heading', { name: 'Nothing saved yet' }).waitFor();
      expect(await page.getByRole('status').innerText()).toContain('Reading list cleared');
      await page.reload();
      await page.getByRole('heading', { name: 'Nothing saved yet' }).waitFor();
    } finally { await page.close(); }
  });

  it('reports a blocked storage write when clearing the reading list', async () => {
    const page = await fixturePage(390, 'light');
    try {
      await page.goto(`${origin}/post/editorial-fixture`);
      await page.locator('article button').filter({ hasText: /^Save$/ }).click();
      await page.locator('article button').filter({ hasText: /^Saved$/ }).waitFor();
      await page.goto(`${origin}/bookmarks`);
      await page.getByRole('button', { name: 'Clear list' }).waitFor();
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
      await page.getByRole('button', { name: 'Clear list' }).click();
      await page.getByRole('button', { name: 'Yes, clear' }).click();
      await page.getByRole('heading', { name: 'Nothing saved yet' }).waitFor();
      expect(await page.getByRole('alert').innerText()).toContain('will not persist');
      expect(await page.getByText('Saved items are gone from this device.').count()).toBe(0);
      await page.reload();
      await page.getByRole('link', { name: 'Read', exact: true }).waitFor();
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
