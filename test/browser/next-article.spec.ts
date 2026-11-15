import { test, expect } from '@playwright/test';

test('a missing article returns HTTP 404', async ({ request }) => {
  const response = await request.get('/post/definitely-missing-reader');
  expect(response.status()).toBe(404);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`fixture reader stays within ${width}px viewport`, async ({ page }) => {
    test.skip(process.env.RWM_ARTICLE_FIXTURE !== '1', 'Requires the isolated editorial-fixture CMS post.');
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto('/post/editorial-fixture');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const controls = page.getByRole('complementary', { name: 'Reading controls' });
    await expect(controls).toBeVisible();
    await expect(controls).toHaveCSS('position', 'static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
