import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';

// No LinkedIn account, live Supabase project, or posting operation is used.
// Positive authenticated publishing requires a separate isolated integration
// environment; these tests cover the real unauthenticated HTTP boundaries.
test.describe('LinkedIn automation HTTP boundaries (editorial-only)', () => {
  test('the sign-in page is reachable without a pre-existing session', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Write, review, and publish' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  for (const path of ['/api/admin/linkedin/auth', '/api/admin/linkedin/callback', '/api/admin/linkedin/status']) {
    test(`${path} rejects an anonymous request`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
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

  test('the article webhook rejects unsigned requests with 401', async ({ request }) => {
    const response = await request.post('/api/webhooks/article-published', {
      data: { type: 'INSERT', table: 'posts', record: { status: 'published', publication_type: 'editorial', slug: 'ed-1' } },
    });
    expect(response.status()).toBe(401);
  });

  test('a signed non-editorial or draft post event is skipped cleanly without posting', async ({ request }) => {
    const secret = process.env.LINKEDIN_WEBHOOK_SECRET || 'local-test-webhook-secret';
    const rawBody = JSON.stringify({
      type: 'INSERT',
      table: 'posts',
      record: { status: 'published', publication_type: 'review', slug: 'review-example' },
    });
    const sig = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
    const response = await request.post('/api/webhooks/article-published', {
      headers: { 'content-type': 'application/json', 'x-webhook-signature': sig },
      data: rawBody,
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: true, reason: 'not_editorial' });
  });
});
