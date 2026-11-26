import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { genui } from '../../src/design/genui.manifest';

declare global { interface Window { testCLS: number } }

for (const colorScheme of ['light', 'dark'] as const) {
  test(`v4.1 ${colorScheme}: nine widgets reflow in 288/358/720px message containers`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/lab/genui');
    await expect(page.locator('[data-widget]')).toHaveCount(9);
    for (const width of genui.fixtures.panes) {
      await page.locator('.catalog-preview').evaluate((el, w) => { el.setAttribute('class', `r-flow catalog-preview catalog-pane-${w}`); }, width);
      const sizes = await page.locator('[data-widget] .genui-surface').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, scroll: el.scrollWidth, client: el.clientWidth })));
      for (const size of sizes) {
        expect(size.width).toBeCloseTo(width, 0);
        expect(size.scroll).toBeLessThanOrEqual(size.client);
      }
      const columns = await page.locator('[data-widget="RemeSplit"] .genui-split').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width > 520 ? 2 : 1);
      expect(await page.locator('.genui-surface [style]').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
    const targets = await page.locator('.genui-surface button, .genui-surface a, .genui-surface input').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    for (const t of targets) { expect(t.width).toBeGreaterThanOrEqual(44); expect(t.height).toBeGreaterThanOrEqual(44); }
    expect(errors).toEqual([]);
  });
}

test('v4.1 catalog: axe A/AA', async ({ page }) => {
  await page.goto('/lab/genui');
  await expect(page.locator('[data-streaming="false"]').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('v4.1 bounded status stream: measured CLS and calm live region', async ({ page }) => {
  await page.addInitScript(() => {
    window.testCLS = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) window.testCLS += shift.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/lab/genui');
  await expect(page.locator('[data-streaming="true"] output')).toHaveText('Preparing the research view…');
  await expect(page.locator('[data-streaming="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.testCLS)).toBeLessThan(.05);
  expect(await page.locator('[class*="skeleton"]').count()).toBe(0);
});

test('v4.1 assistant: local quotation, validated summary, no outbound traffic or model download', async ({ page, context, baseURL }) => {
  const external: string[] = [], models: string[] = [], errors: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.origin !== new URL(baseURL!).origin) external.push(req.url());
    if (url.pathname.startsWith('/models/')) models.push(req.url());
  });
  page.on('pageerror', err => errors.push(err.message));
  const response = await page.goto('/assistant');
  expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  await expect(page.getByRole('button', { name: 'Load local model — unavailable' })).toBeDisabled();
  await page.getByRole('button', { name: 'Check device support' }).click();
  await expect(page.locator('.assistant-model output')).toContainText('No model is installed.');
  await page.getByRole('textbox', { name: 'Ask the archive' }).fill('What is Prithvi?');
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(page.locator('.assistant-answer .genui-surface')).toBeVisible();
  await expect(page.locator('.assistant-answer .genui-surface')).toContainText('matching archive passages');
  await expect(page.locator('.assistant-markdown')).toContainText('Prithvi', { timeout: 30000 });
  expect(external).toEqual([]); expect(models).toEqual([]); expect(errors).toEqual([]); expect(await context.cookies()).toEqual([]);
});
