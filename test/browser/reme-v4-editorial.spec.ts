import { expect, test } from '@playwright/test';
import publication from '../../docs/writing/publication-manifest.json';

const route = '/blog/prithvi-eo-2-0-multi-temporal-foundation-model';

for (const width of [390, 1280]) {
  test(`Prithvi editorial review: ${width}px text, tables, FAQ and figures`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('.mdx-body > table, .mdx-body > div > table')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: 'Agent & Engineering Quick-Spec', exact: false })).toBeVisible();
    await expect(page.locator('.mdx-body')).toContainText('not a complete configuration');
    await expect(page.locator('.mdx-body')).toContainText('not a measured end-to-end speedup');
    const flood = page.locator('[data-chart="sen1floods11"]');
    await flood.getByRole('button', { name: 'mIoU', exact: true }).click();
    await expect(flood.getByRole('button', { name: 'mIoU', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const pastis = page.locator('[data-chart="pastis"]');
    await pastis.getByRole('button', { name: '10% · ≈200 images', exact: true }).click();
    await expect(pastis.getByRole('button', { name: '10% · ≈200 images', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const faq = page.locator('[data-faq-item]').filter({ hasText: 'Can I fine-tune' });
    await faq.locator('summary').click();
    await expect(faq).toHaveAttribute('open', '');
    await expect(faq).toContainText('No fine-tuning run was executed');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('Prithvi evidence limits survive without JavaScript; approved worked example is public', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + route);
  await expect(page.locator('.mdx-body')).toContainText('not a complete configuration');
  await expect(page.locator('.mdx-body')).toContainText('no independent reproduction is claimed here');
  await expect(page.locator('[data-chart="sen1floods11"]')).toContainText('Water IoU');
  await expect(page.locator('[data-chart="pastis"]')).toContainText('reported scores');
  const faq = page.locator('[data-faq-item]').nth(1);
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  await context.close();
  const response = await request.get('/blog/reproducing-a-benchmark-that-did-not-survive');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('hypothetical worked example');
});

for (const width of [390, 1280]) {
  test(`all 17 approved posts: ${width}px covers load and pages remain readable`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const cover of publication.covers) {
      const response = await page.goto(`/blog/${cover.slug}`);
      expect(response?.status(), cover.slug).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
      const image = page.getByRole('img', { name: cover.alt, exact: true });
      await expect(image).toBeVisible();
      const src = new URL((await image.getAttribute('src'))!, page.url());
      expect(src.searchParams.get('url') ?? src.pathname).toBe(cover.cover);
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), cover.slug).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
    for (const path of ['/sitemap.xml', '/feed.json', '/search-index.json', '/llms.txt']) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const text = await response.text();
      for (const cover of publication.covers) expect(text, `${path}: ${cover.slug}`).toContain(cover.slug);
    }
  });
}
