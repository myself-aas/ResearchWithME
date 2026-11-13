import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, TEST_ORIGIN, TEST_SITE_URL } from '@/test/support/pages';
import { clientIp, clientKey, isSameOrigin } from '@/cloudflare-pages/src/server/http';

afterEach(() => {
  // no-op: legacyFails option removed; tests use only CMS posts.
});

const JSON_HEADERS = { 'content-type': 'application/json' };

describe('PATCH /api/articles/:id (likes)', () => {
  it('404s a non-CMS article id', async () => {
    const app = createTestApp();
    expect((await app.request('/api/articles/post-1', { method: 'PATCH' })).status).toBe(404);
    expect((await app.request('/api/articles/no-such-id', { method: 'PATCH' })).status).toBe(404);
  });

  it('increments CMS likes', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-like-target', status: 'published' });
    const res = await app.request(`/api/articles/cms-${post.id}`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    expect((await res.json()).likes).toBe(1);

    const second = await app.request(`/api/articles/cms-${post.id}`, { method: 'PATCH' });
    expect((await second.json()).likes).toBe(2);
  });

  it('returns 503 for an unconfigured deployment', async () => {
    const app = createTestApp({ configured: false });
    expect((await app.request('/api/articles')).status).toBe(200);
    expect((await app.request('/api/articles/post-1', { method: 'PATCH' })).status).toBe(404);
  });

  it('limits one client to 30 likes a minute', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'rate-limit-like', status: 'published' });
    const ip = { 'cf-connecting-ip': '203.0.113.77' };
    for (let i = 0; i < 30; i += 1) {
      const res = await app.request(`/api/articles/cms-${post.id}`, { method: 'PATCH', headers: { ...ip, 'x-forwarded-for': `10.0.0.${i}` } });
      expect(res.status).toBe(200);
    }
    const limited = await app.request(`/api/articles/cms-${post.id}`, { method: 'PATCH', headers: ip });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('GET /api/comments', () => {
  it('404s a non-CMS postId', async () => {
    const app = createTestApp();
    const all = await app.request('/api/comments?postId=post-1');
    expect(all.status).toBe(404);

    const unknown = await app.request('/api/comments?postId=post-999');
    expect(unknown.status).toBe(404);
  });

  it('serves CMS comments for a cms-* post id', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-comment-feed', status: 'published' });
    const res = await app.request(`/api/comments?postId=cms-${post.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ comments: [] });
    expect(res.headers.get('cache-control')).toBe('public, max-age=15, stale-while-revalidate=60');
  });
});

describe('POST /api/comments', () => {
  it('404s a comment on a non-CMS article', async () => {
    const app = createTestApp();
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ postId: 'post-1', authorName: 'Reader', text: 'Useful notes.' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('That article does not exist.');
  });

  it('creates a CMS comment for a cms-* post id', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-comment-target', status: 'published' });
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ postId: `cms-${post.id}`, authorName: 'Reader', text: 'Useful notes.' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).comment.postId).toBe(`cms-${post.id}`);

    const draft = await app.seedPost({ slug: 'cms-comment-draft', status: 'draft' });
    const draftRes = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ postId: `cms-${draft.id}`, authorName: 'Reader', text: 'Draft comment.' }),
    });
    expect(draftRes.status).toBe(404);
  });

  it('rejects cross-site browser posts with 403', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'xsite-cms-target', status: 'published' });
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: JSON.stringify({ postId: `cms-${post.id}`, authorName: 'Reader', text: 'x' }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('Cross-site');
  });

  it('accepts same-origin and site-origin posts, and origin-less callers', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'origin-cms-target', status: 'published' });
    const body = (extra = '') => JSON.stringify({ postId: `cms-${post.id}`, authorName: 'Reader', text: `ok ${extra}` });

    const sameOrigin = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: TEST_ORIGIN, host: new URL(TEST_ORIGIN).host },
      body: body('same'),
    });
    expect(sameOrigin.status).toBe(201);

    const siteOrigin = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: TEST_SITE_URL, host: 'test.researchwith.me' },
      body: body('site'),
    });
    expect(siteOrigin.status).toBe(201);

    const originless = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: body('none'),
    });
    expect(originless.status).toBe(201);
  });

  it('rejects a missing JSON content type with 415, malformed JSON with 400', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'ct-cms-target', status: 'published' });
    const wrongType = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ postId: `cms-${post.id}` }),
    });
    expect(wrongType.status).toBe(415);

    const malformed = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{ not json',
    });
    expect(malformed.status).toBe(400);
  });

  it('validates the body and reports field errors', async () => {
    const app = createTestApp();
    const missingPostId = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ authorName: 'Reader Example', text: 'Hello there.' }),
    });
    expect(missingPostId.status).toBe(400);
    expect((await missingPostId.json()).error).toBe('A post id is required.');

    const invalid = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ postId: 'cms-x', authorName: 'R', text: 'hi' }),
    });
    expect(invalid.status).toBe(400);
  });

  it('rate-limits the ninth comment in a minute with Retry-After', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'rl-cms-comment', status: 'published' });
    const ip = { 'cf-connecting-ip': '203.0.113.77' };
    for (let index = 0; index < 8; index += 1) {
      const res = await app.request('/api/comments', {
        method: 'POST',
        headers: { ...JSON_HEADERS, ...ip },
        body: JSON.stringify({ postId: `cms-${post.id}`, authorName: 'Reader', text: `c${index}` }),
      });
      expect(res.status).toBe(201);
    }
    const limited = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...ip },
      body: JSON.stringify({ postId: `cms-${post.id}`, authorName: 'Reader', text: 'over' }),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('isSameOrigin and client keys', () => {
  const url = `${TEST_ORIGIN}/api/comments`;

  it('matches the request host, then the configured site host', () => {
    expect(isSameOrigin(new Request(url, { headers: { origin: TEST_ORIGIN, host: 'test.researchwith.me' } }), TEST_SITE_URL)).toBe(true);
    expect(isSameOrigin(new Request(url, { headers: { origin: TEST_SITE_URL, host: 'test.researchwith.me' } }), TEST_SITE_URL)).toBe(true);
    expect(isSameOrigin(new Request(url, { headers: { origin: 'https://evil.example', host: 'test.researchwith.me' } }), TEST_SITE_URL)).toBe(false);
  });

  it('allows origin-less clients and rejects a present-but-unparseable Origin', () => {
    expect(isSameOrigin(new Request(url), TEST_SITE_URL)).toBe(true);
    expect(isSameOrigin(new Request(url, { headers: { origin: 'not-a-url', host: 'test.researchwith.me' } }), TEST_SITE_URL)).toBe(false);
  });

  it('rejects an Origin when the request has no Host to compare against', () => {
    expect(isSameOrigin(new Request(url, { headers: { origin: TEST_ORIGIN } }), '')).toBe(false);
  });

  it('prefers the edge-provided client IP for rate-limit keys', () => {
    const req = new Request(url, {
      headers: { 'cf-connecting-ip': '192.0.2.55', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('192.0.2.55');
    expect(clientKey(req, 'comments')).toBe('comments:192.0.2.55');

    const forwarded = new Request(url, { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } });
    expect(clientIp(forwarded)).toBe('203.0.113.9');

    expect(clientIp(new Request(url))).toBe('local');
  });
});
