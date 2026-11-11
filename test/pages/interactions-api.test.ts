import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_ORIGIN, TEST_SITE_URL } from '@/test/support/pages';
import { clientIp, clientKey, isSameOrigin } from '@/cloudflare-pages/src/server/http';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const JSON_HEADERS = { 'content-type': 'application/json' };
const commentBody = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ postId: 'post-1', authorName: 'Reader', text: 'Useful notes.', ...overrides });

describe('PATCH /api/articles/:id (likes)', () => {
  it('persists a legacy like', async () => {
    const app = createTestApp();
    const res = await app.request('/api/articles/post-1', { method: 'PATCH' });
    expect(res.status).toBe(200);
    expect((await res.json()).likes).toBe(343); // seed 342 + 1

    const second = await app.request('/api/articles/post-1', { method: 'PATCH' });
    expect((await second.json()).likes).toBe(344);
  });

  it('404s an unknown article and increments CMS likes', async () => {
    const app = createTestApp();
    expect((await app.request('/api/articles/post-999', { method: 'PATCH' })).status).toBe(404);

    const post = await app.seedPost({ slug: 'cms-like-target', status: 'published' });
    const res = await app.request(`/api/articles/cms-${post.id}`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    expect((await res.json()).likes).toBe(1);
  });

  it('returns 503 instead of claiming an unpersisted write', async () => {
    const app = createTestApp({ configured: false });
    expect((await app.request('/api/articles')).status).toBe(200);
    expect((await app.request('/api/articles/post-1', { method: 'PATCH' })).status).toBe(503);
    expect((await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody(),
    })).status).toBe(503);
  });

  it('returns 503 when the legacy store fails, without mutating the counter', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ legacyFails: true });
    const res = await app.request('/api/articles/post-1', { method: 'PATCH' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('could not be read');
  });
});

describe('GET /api/comments', () => {
  it('reads the legacy corpus with its cache policy and filters by postId', async () => {
    const app = createTestApp();
    const all = await app.request('/api/comments');
    expect(all.status).toBe(200);
    const body = await all.json();
    expect(Array.isArray(body.comments)).toBe(true);
    expect(all.headers.get('cache-control')).toBe('public, max-age=15, stale-while-revalidate=60');

    const filtered = await (await app.request('/api/comments?postId=post-1')).json();
    expect(filtered.comments.length).toBeGreaterThan(0);
    expect(filtered.comments.every((c: { postId: string }) => c.postId === 'post-1')).toBe(true);

    const unknown = await (await app.request('/api/comments?postId=post-999')).json();
    expect(unknown.comments).toEqual([]);
  });

  it('serves CMS comments for a cms-* post id', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-comment-feed', status: 'published' });
    const res = await app.request(`/api/comments?postId=cms-${post.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ comments: [] });
  });
});

describe('POST /api/comments', () => {
  it('creates a legacy comment and reflects it in the counter', async () => {
    const app = createTestApp();
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody(),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.comment.text).toBe('Useful notes.');
    expect(body.comment.postId).toBe('post-1');

    const comments = await (await app.request('/api/comments?postId=post-1')).json();
    expect(comments.comments.some((c: { text: string }) => c.text === 'Useful notes.')).toBe(true);
  });

  it('creates a CMS comment for a cms-* post id', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-comment-target', status: 'published' });
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody({ postId: `cms-${post.id}` }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).comment.postId).toBe(`cms-${post.id}`);

    const draft = await app.seedPost({ slug: 'cms-comment-draft', status: 'draft' });
    const draftRes = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody({ postId: `cms-${draft.id}` }),
    });
    expect(draftRes.status).toBe(404);
  });

  it('rejects cross-site browser posts with 403', async () => {
    const app = createTestApp();
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: commentBody(),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('Cross-site');
  });

  it('accepts same-origin and site-origin posts, and origin-less callers', async () => {
    const app = createTestApp();
    const sameOrigin = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: TEST_ORIGIN, host: new URL(TEST_ORIGIN).host },
      body: commentBody({ text: 'Same origin wins.' }),
    });
    expect(sameOrigin.status).toBe(201);

    const siteOrigin = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: TEST_SITE_URL, host: 'test.researchwith.me' },
      body: commentBody({ text: 'Site origin wins.' }),
    });
    expect(siteOrigin.status).toBe(201);

    const originless = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody({ text: 'No origin header at all.' }),
    });
    expect(originless.status).toBe(201);
  });

  it('rejects a missing JSON content type with 415, malformed JSON with 400', async () => {
    const app = createTestApp();
    const wrongType = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: commentBody(),
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
      body: commentBody({ authorName: 'R' }),
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).fieldErrors.authorName).toBeTruthy();
  });

  it('404s a comment on an unknown article', async () => {
    const app = createTestApp();
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: commentBody({ postId: 'post-999' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('That article does not exist.');
  });

  it('rate-limits the ninth comment in a minute with Retry-After', async () => {
    const app = createTestApp();
    const ip = { 'x-forwarded-for': '203.0.113.77' };
    for (let index = 0; index < 8; index += 1) {
      const res = await app.request('/api/comments', {
        method: 'POST',
        headers: { ...JSON_HEADERS, ...ip },
        body: commentBody({ text: `Comment number ${index} from the limited address.` }),
      });
      expect(res.status).toBe(201);
    }
    const limited = await app.request('/api/comments', {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...ip },
      body: commentBody({ text: 'One comment too many.' }),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('answers HEAD and OPTIONS on the comments collection', async () => {
    const app = createTestApp();
    const head = await app.request('/api/comments', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');

    const options = await app.request('/api/comments', { method: 'OPTIONS' });
    expect(options.status).toBe(204);
    expect(options.headers.get('allow')).toBe('GET, HEAD, POST, OPTIONS');
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
