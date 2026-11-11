import { expect, test } from '@playwright/test';

/**
 * Permanent smoke coverage for the Pages SSR shell (Task 10). Runs against
 * `wrangler pages dev` with the public Supabase variables blanked, via
 * `npm run test:pages`.
 */
test('Pages serves the SSR document, hydrates client-side navigation, and returns a real 404', async ({ page, request }) => {
  expect((await request.get('/')).status()).toBe(200);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Research you can read, check, and reuse.' }),
  ).toBeVisible();
  // Hydration smoke check: a client-side navigation through the React data
  // router lands on a reader route without a full document reload.
  await page.getByRole('link', { name: /Research Reviews/ }).first().click();
  await expect(page).toHaveURL(/\/category\/research-reviews/);
  expect((await request.get('/not-a-route')).status()).toBe(404);
});

test('JavaScript-disabled browser still receives the SSR document', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Research you can read, check, and reuse.' }),
  ).toBeVisible();
  await context.close();
});

test('root and HEAD requests behave', async ({ request }) => {
  expect((await request.get('/')).status()).toBe(200);
  const head = await request.head('/');
  expect(head.status()).toBe(200);
});

test('missing static assets 404 instead of falling back to the app', async ({ request }) => {
  const response = await request.get('/images/definitely-not-a-real-file.png');
  expect(response.status()).toBe(404);
});

test('the loader transport rejects external targets', async ({ request }) => {
  expect((await request.get('/__data?routeId=home&url=%2F%2Fevil.example')).status()).toBe(400);
});
