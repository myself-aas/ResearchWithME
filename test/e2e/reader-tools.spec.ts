import { expect, test } from '@playwright/test';

/**
 * Permanent coverage for the reader tools (Task 12B). Runs against
 * `wrangler pages dev` via `npm run test:pages`.
 */
test('bookmarks and citation tools survive client navigation', async ({ page }) => {
  await page.goto('/bookmarks');
  await expect(page.getByRole('heading', { name: 'Your reading list' })).toBeVisible();
  await page.goto('/cite');
  await expect(page.getByRole('heading', { name: 'Build a citation that travels' })).toBeVisible();
});

test('the assistant renders and the document title tracks client-side navigation', async ({ page }) => {
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: 'Ask the archive a question' })).toBeVisible();
  expect(await page.title()).toBe('Ask the archive — ResearchWithMe');
  // Client-side navigation through the shared header brand link updates the title.
  await page.getByRole('link', { name: 'ResearchWithMe platform home' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.title()).not.toBe('Ask the archive — ResearchWithMe');
});

test('saved bookmarks survive a reload', async ({ page }) => {
  // Saved ids live in localStorage under the legacy key; the seeded demo corpus
  // carries post-1 (inside-vllm-and-paged-attention).
  await page.goto('/bookmarks');
  await page.evaluate(() => window.localStorage.setItem('rwm_saved_posts', JSON.stringify(['post-1'])));
  await page.reload();
  await expect(page.getByText(/Inside vLLM/)).toBeVisible();
});

test('the API reference renders and its group anchors resolve', async ({ page }) => {
  await page.goto('/api-docs');
  await expect(page.getByRole('heading', { name: 'ResearchWithMe API' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'API groups' });
  await nav.getByRole('link', { name: 'Articles' }).click();
  await expect(page).toHaveURL(/#articles$/);
});
