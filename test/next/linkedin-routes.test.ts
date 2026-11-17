import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGate, mockHandlePublished, mockPostArticle, mockCheckBatch, mockExtract, mockExchange } = vi.hoisted(() => ({
  mockGate: vi.fn(),
  mockHandlePublished: vi.fn(),
  mockPostArticle: vi.fn(),
  mockCheckBatch: vi.fn(),
  mockExtract: vi.fn(),
  mockExchange: vi.fn(),
}));

vi.mock('@/lib/cms/auth', () => ({
  requireEditorInChief: mockGate,
}));

vi.mock('@/lib/linkedin/automation', () => ({
  handleArticlePublished: mockHandlePublished,
  postArticleToLinkedIn: mockPostArticle,
  checkAndPostNewArticles: mockCheckBatch,
}));

vi.mock('@/lib/linkedin/article-extractor', () => ({
  extractArticleForLinkedIn: mockExtract,
}));

vi.mock('@/lib/linkedin/oauth', () => ({
  getAuthUrl: (state: string) => `https://www.linkedin.com/oauth/v2/authorization?state=${state}`,
  exchangeCodeForTokens: mockExchange,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ rpc: vi.fn(async () => ({ data: [], error: null })) })),
  getSupabasePublicClient: vi.fn(() => ({ rpc: vi.fn(async () => ({ data: [], error: null })) })),
}));

import { POST as webhookPost } from '@/app/api/webhooks/article-published/route';
import { GET as cronGet } from '@/app/api/cron/linkedin-batch/route';
import { GET as authGet } from '@/app/api/admin/linkedin/auth/route';
import { GET as callbackGet } from '@/app/api/admin/linkedin/callback/route';
import { POST as adminPost } from '@/app/api/admin/linkedin/post/route';
import { GET as statusGet } from '@/app/api/admin/linkedin/status/route';
import { encrypt, decrypt } from '@/lib/crypto';

function sign(body: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
}

describe('Hardened LinkedIn routes (editorial-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('LINKEDIN_WEBHOOK_SECRET', 'whsec_test_secret');
    vi.stubEnv('CRON_SECRET', 'cron_test_secret');
    vi.stubEnv('LINKEDIN_CLIENT_ID', 'li-client');
    vi.stubEnv('LINKEDIN_REDIRECT_URI', 'https://researchwith.me/api/admin/linkedin/callback');
    vi.stubEnv('ENCRYPTION_SECRET', '0123456789abcdef0123456789abcdef');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('lib/crypto per-ciphertext salt', () => {
    it('encrypts with random salt (v2 format) and decrypts both v2 and legacy ciphertexts', () => {
      const a = encrypt('secret-token');
      const b = encrypt('secret-token');
      expect(a).not.toBe(b);
      expect(a.startsWith('v2:')).toBe(true);
      expect(decrypt(a)).toBe('secret-token');
      expect(decrypt(b)).toBe('secret-token');
    });
  });

  describe('POST /api/webhooks/article-published', () => {
    it('fails closed with 503 when LINKEDIN_WEBHOOK_SECRET is unset', async () => {
      vi.stubEnv('LINKEDIN_WEBHOOK_SECRET', '');
      const res = await webhookPost(
        new NextRequest('https://researchwith.me/api/webhooks/article-published', {
          method: 'POST',
          body: '{}',
        }),
      );
      expect(res.status).toBe(503);
    });

    it('rejects unsigned or wrongly signed requests with 401', async () => {
      const body = JSON.stringify({ type: 'INSERT', table: 'posts', record: { status: 'published', publication_type: 'editorial', slug: 'ed-1' } });
      const res = await webhookPost(
        new NextRequest('https://researchwith.me/api/webhooks/article-published', {
          method: 'POST',
          headers: { 'x-webhook-signature': 'sha256=deadbeef' },
          body,
        }),
      );
      expect(res.status).toBe(401);
      expect(mockHandlePublished).not.toHaveBeenCalled();
    });

    it('skips non-editorial review posts even with a valid signature', async () => {
      const body = JSON.stringify({
        type: 'INSERT',
        table: 'posts',
        record: { status: 'published', publication_type: 'review', slug: 'rev-1' },
      });
      const res = await webhookPost(
        new NextRequest('https://researchwith.me/api/webhooks/article-published', {
          method: 'POST',
          headers: { 'x-webhook-signature': sign(body, 'whsec_test_secret') },
          body,
        }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true, skipped: true, reason: 'not_editorial' });
      expect(mockHandlePublished).not.toHaveBeenCalled();
    });

    it('awaits publishing for a newly published editorial post on public.posts', async () => {
      mockHandlePublished.mockResolvedValue({ success: true, postUrn: 'urn:li:share:ed1' });
      const body = JSON.stringify({
        type: 'INSERT',
        table: 'posts',
        record: { status: 'published', publication_type: 'editorial', slug: 'ed-1' },
      });
      const res = await webhookPost(
        new NextRequest('https://researchwith.me/api/webhooks/article-published', {
          method: 'POST',
          headers: { 'x-webhook-signature': sign(body, 'whsec_test_secret') },
          body,
        }),
      );
      expect(res.status).toBe(200);
      expect(mockHandlePublished).toHaveBeenCalledWith('ed-1');
      expect(await res.json()).toMatchObject({ received: true, posted: true, postUrn: 'urn:li:share:ed1' });
    });
  });

  describe('GET /api/cron/linkedin-batch', () => {
    it('rejects wrong Bearer token with 401', async () => {
      const res = await cronGet(
        new NextRequest('https://researchwith.me/api/cron/linkedin-batch', {
          headers: { authorization: 'Bearer wrong' },
        }),
      );
      expect(res.status).toBe(401);
    });

    it('runs editorial batch when Bearer token matches CRON_SECRET', async () => {
      mockCheckBatch.mockResolvedValue({ posted: 1, failed: 0, skipped: 2, results: [] });
      const res = await cronGet(
        new NextRequest('https://researchwith.me/api/cron/linkedin-batch', {
          headers: { authorization: 'Bearer cron_test_secret' },
        }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        success: true,
        scope: 'editorial_only',
        posted: 1,
        skipped: 2,
      });
    });
  });

  describe('Admin LinkedIn OAuth & manual post routes', () => {
    it('blocks non-Editor-in-Chief on auth, callback, status, and post', async () => {
      mockGate.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
      expect((await authGet(new Request('https://researchwith.me/api/admin/linkedin/auth'))).status).toBe(403);
      expect((await statusGet(new Request('https://researchwith.me/api/admin/linkedin/status'))).status).toBe(403);
      expect(
        (await callbackGet(new NextRequest('https://researchwith.me/api/admin/linkedin/callback?code=c&state=s'))).status,
      ).toBe(403);
      expect(
        (
          await adminPost(
            new NextRequest('https://researchwith.me/api/admin/linkedin/post', {
              method: 'POST',
              headers: { host: 'researchwith.me', 'content-type': 'application/json' },
              body: JSON.stringify({ slug: 'ed-1' }),
            }),
          )
        ).status,
      ).toBe(403);
    });

    it('rejects mismatched OAuth state cookie (CSRF protection) and redirects to /dashboard/desk', async () => {
      mockGate.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'e@x', name: 'E', isEditor: true, isEditorInChief: true } });
      const req = new NextRequest('https://researchwith.me/api/admin/linkedin/callback?code=abc&state=forged', {
        headers: { cookie: 'linkedin_oauth_state=expected-state' },
      });
      const res = await callbackGet(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get('location')!);
      expect(location.pathname).toBe('/dashboard/desk');
      expect(location.searchParams.get('linkedin_error')).toBe('invalid_state');
      expect(mockExchange).not.toHaveBeenCalled();
    });

    it('rejects manual posting of a non-editorial review with 422', async () => {
      mockGate.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'e@x', name: 'E', isEditor: true, isEditorInChief: true } });
      mockExtract.mockResolvedValue({
        title: 'A Review',
        summary: 'Summary',
        url: 'https://researchwith.me/post/rev-1',
        authorName: 'Author',
        category: 'Research Reviews',
        tags: [],
        publicationType: 'review',
      });
      const res = await adminPost(
        new NextRequest('https://researchwith.me/api/admin/linkedin/post', {
          method: 'POST',
          headers: { host: 'researchwith.me', 'content-type': 'application/json' },
          body: JSON.stringify({ slug: 'rev-1' }),
        }),
      );
      expect(res.status).toBe(422);
      expect(mockPostArticle).not.toHaveBeenCalled();
    });
  });
});
