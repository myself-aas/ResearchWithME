import { test, expect } from '@playwright/test';

// No LinkedIn account, live Supabase project, or posting operation is used.
// Positive authenticated publishing requires a separate isolated integration
// environment; these tests cover the real unauthenticated HTTP boundaries.
test.describe('LinkedIn automation HTTP boundaries', () => {
  test('the sign-in page is reachable without a pre-existing session', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Write, review, and publish' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  for (const path of ['/api/admin/linkedin/auth', '/api/admin/linkedin/status']) {
    test(`${path} rejects an anonymous request`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
  }

  test('manual posting rejects an anonymous request', async ({ request }) => {
    const response = await request.post('/api/admin/linkedin/post', { data: { slug: 'unpublished-example' } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  test('the scheduled batch rejects absent and invalid secrets', async ({ request }) => {
    const headerCases: Array<Record<string, string>> = [{}, { authorization: 'Bearer incorrect-secret' }];
    for (const headers of headerCases) {
      const response = await request.get('/api/cron/linkedin-batch', { headers });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  test('the OAuth callback rejects missing parameters without contacting LinkedIn', async ({ request }) => {
    const response = await request.get('/api/admin/linkedin/callback', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const redirect = new URL(response.headers().location, response.url());
    expect(redirect.pathname).toBe('/admin/linkedin');
    expect(redirect.searchParams.get('error')).toBe('missing_params');
  });

  test('a draft event is acknowledged without attempting a post', async ({ request }) => {
    const response = await request.post('/api/webhooks/article-published', {
      data: { type: 'INSERT', table: 'articles', record: { status: 'draft', slug: 'unpublished-example' } },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });
});
