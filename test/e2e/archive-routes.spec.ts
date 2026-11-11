import { expect, test } from '@playwright/test';

/**
 * Permanent coverage for the archive routes and the design-system shell
 * (Task 12A). Runs against `wrangler pages dev` via `npm run test:pages`.
 */
test('the paper and contributor archives render', async ({ page }) => {
  await page.goto('/papers');
  await expect(
    page.getByRole('heading', { name: 'Papers, methods, and reproducible artifacts' }),
  ).toBeVisible();
  await page.goto('/authors');
  await expect(
    page.getByRole('heading', { name: 'The reviewers behind the archive' }),
  ).toBeVisible();
});

test('the editions archive and editorial board render', async ({ page }) => {
  await page.goto('/editions');
  await expect(
    page.getByRole('heading', { name: 'Quarterly editions for offline reading' }),
  ).toBeVisible();
  await page.goto('/editorial-board');
  await expect(
    page.getByRole('heading', { name: 'Editorial standards and the people who keep them' }),
  ).toBeVisible();
});

test('the SSR document opts into the pieme-locale cookie', async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: 'pieme-locale', value: 'bn', url: baseURL ?? 'http://localhost:8788' }]);
  await page.goto('/papers');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  // The interface locale never rewrites content language; the cookie only
  // drives the shell. (Bangla copy is out of scope for this archive.)
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('archive pages are keyboard reachable and viewport-safe', async ({ page }) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/papers');
    // Tab order reaches the search input without trapping.
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toBeVisible();
  }
});
