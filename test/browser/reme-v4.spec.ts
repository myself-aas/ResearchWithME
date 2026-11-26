import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { design } from '../../src/design';
import { geometry, tiers } from '../../scripts/design/system';

const widths = [320, 390, 600, 768, 1024, 1280, 1536];
for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme}: generated geometry, heading wraps, slot coverage and reflow`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const tier = [...tiers].reverse().find(t => width >= design.breakpoint[t].min)!;
      const g = geometry(design, width).find(g => g.tier === tier)!;
      expect(await page.locator('[data-section]').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.section))).toEqual(design.section.map(s => s.key));
      const observed = await page.locator('[data-slot]').evaluateAll(els => els.map(el => ({ slot: (el as HTMLElement).dataset.slot!, width: el.getBoundingClientRect().width })));
      expect(observed.map(s => s.slot).sort()).toEqual(design.section.flatMap(s => s.slots.map(slot => slot.key)).sort());
      for (const { slot, width: actual } of observed) {
        const count = design.layout[slot as keyof typeof design.layout][tier];
        const placement = design.placement[slot as keyof typeof design.placement];
        const cap = placement && 'maxInline' in placement && !['xs', 'md'].includes(tier) ? placement.maxInline : Infinity;
        const expected = Math.min(count * g.track + (count - 1) * g.gutter, cap);
        expect(Math.abs(actual - expected), `${width}px ${slot}`).toBeLessThanOrEqual(.5);
      }
      const headings = await page.locator('main h1, main h2').evaluateAll(els => els.map(el => ({ tag: el.tagName, size: parseFloat(getComputedStyle(el).fontSize), lines: el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight) })));
      for (const h of headings) expect(h.lines).toBeLessThanOrEqual(h.tag === 'H1' ? 4.01 : 3.01);
      expect(Math.abs(headings[0].size - design.type.roles.h1.targets[tier])).toBeLessThanOrEqual(.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
  });
}

test('landing: no cross-origin fetches, page errors or cookies; new primitive target sizes', async ({ page, context, baseURL }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const targets = await page.locator('main .r-control-primary, main .r-control-secondary, main .r-row-link, main summary').evaluateAll(els => els.map(el => ({ text: el.textContent, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
  for (const t of targets) { expect(t.width, t.text ?? '').toBeGreaterThanOrEqual(44); expect(t.height, t.text ?? '').toBeGreaterThanOrEqual(44); }
  expect(requests).toEqual([]); expect(errors).toEqual([]); expect(await context.cookies()).toEqual([]);
});

test('landing: axe WCAG A/AA scan', async ({ page }) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('landing: FAQ, navigation, figure snapshot and assistant link survive without JS', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('a[href="/assistant"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="figure.frame"]')).toContainText('Wipe between');
  await page.locator('main summary').first().click();
  await expect(page.locator('main details').first()).toHaveAttribute('open', '');
  await expect(page.locator('main details').first()).toContainText('personal research notebook');
  await page.getByRole('navigation', { name: 'Navigation without JavaScript' }).getByRole('link', { name: 'Writing' }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await context.close();
});
