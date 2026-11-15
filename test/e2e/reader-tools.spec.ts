import { expect, test } from '@playwright/test';
import { makeTestArticle } from '../fixtures/articles';

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
  await page.getByRole('link', { name: 'ResearchWithMe home' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).not.toHaveTitle('Ask the archive — ResearchWithMe');
});

test('saved bookmarks survive navigation and reload', async ({ page }) => {
  const article = makeTestArticle({ id: 'fixture-saved', title: 'A saved fixture review' });
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [article] } }));
  await page.goto('/');
  const card = page.locator('[data-layout-grid="article-cards"] article');
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'Save A saved fixture review to reading list' }).click();
  await expect(card.getByRole('button', { name: 'Remove A saved fixture review from reading list' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/bookmarks');
  await expect(page.getByText('A saved fixture review')).toBeVisible();
  await page.reload();
  await expect(page.getByText('A saved fixture review')).toBeVisible();
});

test('the API reference renders and its group anchors resolve', async ({ page }) => {
  await page.goto('/api-docs');
  await expect(page.getByRole('heading', { name: 'ResearchWithMe API' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'API groups' });
  await nav.getByRole('link', { name: 'Articles' }).click();
  await expect(page).toHaveURL(/#articles$/);
});

test('a missing article returns an HTTP 404', async ({ request }) => {
  const response = await request.get('/post/definitely-missing-reader');
  expect(response.status()).toBe(404);
});
