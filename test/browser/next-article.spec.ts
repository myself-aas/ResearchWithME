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

for (const theme of ['light', 'dark'] as const) {
  test(`fixture reader content remains visible in ${theme} mode`, async ({ page }) => {
    test.skip(process.env.RWM_ARTICLE_FIXTURE !== '1', 'Requires the isolated editorial-fixture CMS post.');
    await page.addInitScript((choice) => localStorage.setItem('rwm-theme', choice), theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/post/editorial-fixture');
    await expect(page.locator('html')).toHaveAttribute('data-theme', `reme-${theme}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('This is a deterministic research review fixture', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open citation builder' })).toBeVisible();
  });
}

test('reader save is keyboard accessible and persists after reload', async ({ page }) => {
  test.skip(process.env.RWM_ARTICLE_FIXTURE !== '1', 'Requires the isolated editorial-fixture CMS post.');
  await page.goto('/post/editorial-fixture');
  const save = page.getByRole('article').getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeVisible();
  for (let i = 0; i < 60 && !(await save.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('article').getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('article').getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('fixture without a published explainer does not request a video', async ({ page }) => {
  test.skip(process.env.RWM_ARTICLE_FIXTURE !== '1', 'Requires the isolated editorial-fixture CMS post.');
  const videoRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/videos/explainer-')) videoRequests.push(request.url());
  });
  await page.goto('/post/editorial-fixture', { waitUntil: 'networkidle' });
  await expect(page.getByRole('article').locator('video')).toHaveCount(0);
  expect(videoRequests).toEqual([]);
});
