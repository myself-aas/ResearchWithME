#!/usr/bin/env node
/**
 * Visual parity harness — full-page screenshots of the main routes at the five
 * reme breakpoints, and a pixel comparison between two captures.
 *
 *   node scripts/visual-parity.mjs capture <outDir> [route ...]
 *   node scripts/visual-parity.mjs compare <beforeDir> <afterDir>
 *
 * Use it around any refactor that should not change pixels: capture, change,
 * capture again, compare. Captures pin the motion mode to `static`, wait for
 * hydration and fonts, and hide the Next dev overlay, so two captures of an
 * unchanged app are byte-identical.
 *
 * Env: PARITY_BASE_URL (default http://localhost:3000),
 *      PARITY_CHANNEL   (Playwright browser channel, e.g. msedge or chrome;
 *                        default: Playwright's bundled Chromium),
 *      PARITY_SCHEME    (light | dark, default light).
 */
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const BASE = process.env.PARITY_BASE_URL ?? 'http://localhost:3000';
const ROUTES = ['/', '/papers', '/authors', '/assistant', '/bookmarks', '/cite', '/editions', '/about', '/post/inside-vllm-and-paged-attention'];
const WIDTHS = [320, 390, 768, 1280, 1440];
/** Sum of |ΔR|+|ΔG|+|ΔB| above which a pixel counts as changed (ignores anti-aliasing noise). */
const THRESHOLD = 24;

const fileName = (route, width) => `${route === '/' ? 'home' : route.slice(1).replace(/[/[\]]/g, '_')}@${width}.png`;

async function capture(outDir, routes) {
  const { chromium } = await import('@playwright/test');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.PARITY_CHANNEL ? { channel: process.env.PARITY_CHANNEL } : {});
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    colorScheme: process.env.PARITY_SCHEME === 'dark' ? 'dark' : 'light',
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('rwm-motion-mode', 'static');
    } catch {
      /* storage blocked */
    }
  });
  for (const route of routes) {
    const page = await context.newPage();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 180_000 });
      await page
        .waitForFunction(() => document.documentElement.getAttribute('data-motion-mode') === 'static', null, { timeout: 30_000 })
        .catch(() => console.warn(`  ${route} @${width}: page did not hydrate`));
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important} *{caret-color:transparent!important}' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(outDir, fileName(route, width)), fullPage: true, animations: 'disabled' });
    }
    await page.close();
    console.log(`captured ${route}`);
  }
  await browser.close();
}

async function compare(before, after) {
  let changed = 0;
  for (const file of readdirSync(before).filter((f) => f.endsWith('.png'))) {
    if (!existsSync(join(after, file))) {
      console.log(`MISSING ${file}`);
      changed++;
      continue;
    }
    const [a, b] = await Promise.all(
      [join(before, file), join(after, file)].map((p) => sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true })),
    );
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      changed++;
      console.log(`SIZE  ${file}  ${a.info.width}x${a.info.height} -> ${b.info.width}x${b.info.height}`);
      continue;
    }
    let diff = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const delta = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
      if (delta > THRESHOLD) diff++;
    }
    if (diff > 0) {
      changed++;
      console.log(`DIFF  ${file}  ${diff}px (${((diff / (a.data.length / 4)) * 100).toFixed(3)}%)`);
    }
  }
  console.log(changed ? `${changed} screenshot(s) differ` : 'PARITY: all identical');
  process.exitCode = changed ? 1 : 0;
}

const [mode, first, second, ...rest] = process.argv.slice(2);
if (mode === 'capture' && first) await capture(first, second ? [second, ...rest] : ROUTES);
else if (mode === 'compare' && first && second) await compare(first, second);
else {
  console.error('usage: visual-parity.mjs capture <outDir> [route ...] | compare <beforeDir> <afterDir>');
  process.exitCode = 2;
}
