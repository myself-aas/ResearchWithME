import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_SITE_URL } from '@/test/support/pages';
import {
  HIROSHI_UNPUBLISHED,
  MAYA_PROFILE,
  publishedPostBody,
  validPostBody,
} from '@/test/fixtures/cms';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const JSON_HEADERS = { 'content-type': 'application/json' };
const SITE_HEADERS = { ...JSON_HEADERS, origin: TEST_SITE_URL, host: 'test.researchwith.me' };
const EDITOR_APP = () =>
  createTestApp({ profileRows: [MAYA_PROFILE, HIROSHI_UNPUBLISHED] });

const postPath = (id: string) => `/api/cms/posts/${id}`;

describe('CMS studio authentication and gates', () => {
  it('rejects anonymous readers from every CMS route with 401', async () => {
    const app = createTestApp();
    expect((await app.request('/api/cms/posts')).status).toBe(401);
    expect((await app.request('/api/cms/posts', { method: 'POST' })).status).toBe(401);
    expect((await app.request('/api/cms/posts/some-id')).status).toBe(401);
    expect((await app.request('/api/cms/posts/some-id', { method: 'PATCH' })).status).toBe(401);
    expect((await app.request('/api/cms/posts/some-id', { method: 'DELETE' })).status).toBe(401);
    expect((await app.request('/api/cms/comments')).status).toBe(401);
    expect((await app.request('/api/cms/comments/comment-1', { method: 'DELETE' })).status).toBe(401);
  });

  it('rejects non-editor accounts with 403', async () => {
    const app = createTestApp();
    const as = { as: 'reader' as const };
    expect((await app.request('/api/cms/posts', as)).status).toBe(403);
    expect((await app.request('/api/cms/posts', { ...as, method: 'POST' })).status).toBe(403);
    expect((await app.request('/api/cms/posts/some-id', { ...as, method: 'PATCH' })).status).toBe(403);
    expect((await app.request('/api/cms/comments', as)).status).toBe(403);
    expect((await app.request('/api/cms/comments/comment-1', { ...as, method: 'DELETE' })).status).toBe(403);
  });

  it('lets an editor list posts with no-store semantics', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', { as: 'editor' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.posts).toEqual([]);
    expect(body.mode).toBe('supabase');
  });

  it('answers OPTIONS for the CMS detail route from its handler map', async () => {
    const app = EDITOR_APP();
    const options = await app.request('/api/cms/posts/some-id', { method: 'OPTIONS' });
    expect(options.status).toBe(204);
    expect(options.headers.get('allow')).toBe('GET, HEAD, PATCH, DELETE, OPTIONS');
  });

  it('rejects cross-site browser writes with 403 before any gate runs', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: JSON.stringify(validPostBody()),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('Cross-site');
  });
});

describe('POST /api/cms/posts', () => {
  it('creates a draft, deriving the byline from the profile', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(validPostBody()),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.post.slug).toBe('a-serious-review-of-inference-engines');
    // The client claimed "Spoofed Byline"; the stored name must be the profile's.
    expect(body.post.authorName).toBe('Maya Lin');
    expect(body.mode).toBe('supabase');
  });

  it('rejects a non-JSON body with 415 (baseline parity)', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not json',
    });
    expect(res.status).toBe(415);
  });

  it('rejects a weak published article with 400 and field errors', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(publishedPostBody({ content: 'Too short.', keyTakeaways: [] })),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors).toBeTruthy();
    expect(Object.keys(body.fieldErrors).length).toBeGreaterThan(0);
  });

  it('creates a published article that passes validation', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(publishedPostBody({ slug: 'a-published-inference-review' })),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).post.status).toBe('published');
  });

  it('rejects an author whose profile is not published with 422', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(validPostBody({ authorId: 'hiroshi-tanaka' })),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors?.authorId).toContain('not published');
  });

  it('fails closed with 503 when the profiles lookup errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ profilesFail: true, profileRows: [MAYA_PROFILE] });
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(validPostBody()),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('profiles could not be checked');
  });

  it('rejects a slug already used by another CMS post with 409', async () => {
    const app = EDITOR_APP();
    await app.seedPost({ slug: 'a-duplicate-cms-slug', status: 'draft' });
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(validPostBody({ slug: 'a-duplicate-cms-slug' })),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain('already uses this URL');
  });



  it('rate-limits the twenty-first save in a minute with Retry-After', async () => {
    const app = EDITOR_APP();
    const ip = { 'x-forwarded-for': '198.51.100.44' };
    for (let index = 0; index < 20; index += 1) {
      const res = await app.request('/api/cms/posts', {
        as: 'editor',
        method: 'POST',
        headers: { ...SITE_HEADERS, ...ip },
        body: JSON.stringify(validPostBody({ slug: `rate-limit-draft-${index}` })),
      });
      expect(res.status).toBe(201);
    }
    const limited = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: { ...SITE_HEADERS, ...ip },
      body: JSON.stringify(validPostBody({ slug: 'rate-limit-draft-21' })),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('PATCH /api/cms/posts/:id', () => {
  it('updates the title and keeps the server-derived byline', async () => {
    const app = EDITOR_APP();
    const seeded = await app.seedPost({ slug: 'the-original-title-slug', status: 'draft' });
    const res = await app.request(postPath(seeded.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ title: 'A completely different title for the article' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.post.title).toBe('A completely different title for the article');
    expect(body.post.authorName).toBe('Maya Lin');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('404s an unknown post', async () => {
    const app = EDITOR_APP();
    const res = await app.request(postPath('does-not-exist'), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ title: 'A title long enough to validate' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('not found');
  });

  it('rejects a slug change that collides with a published CMS post with 409', async () => {
    const app = EDITOR_APP();
    await app.seedPost({ slug: 'inside-vllm-and-paged-attention', status: 'published', title: 'Existing' });
    const seeded = await app.seedPost({ slug: 'a-perfectly-fine-slug', status: 'draft' });
    const res = await app.request(postPath(seeded.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ slug: 'inside-vllm-and-paged-attention' }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain('already uses this URL');
  });
});

describe('DELETE /api/cms/posts/:id', () => {
  it('404s an unknown post', async () => {
    const app = EDITOR_APP();
    const res = await app.request(postPath('does-not-exist'), {
      as: 'editor',
      method: 'DELETE',
      headers: SITE_HEADERS,
    });
    expect(res.status).toBe(404);
  });

  it('deletes an existing post and reports it', async () => {
    const app = EDITOR_APP();
    const seeded = await app.seedPost({ slug: 'delete-me-please', status: 'draft' });
    const res = await app.request(postPath(seeded.id), {
      as: 'editor',
      method: 'DELETE',
      headers: SITE_HEADERS,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
    expect((await app.request(postPath(seeded.id), { as: 'editor' })).status).toBe(404);
  });
});

describe('editorial comment moderation', () => {
  it('lists comments with no-store semantics', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/comments', { as: 'editor' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(Array.isArray((await res.json()).comments)).toBe(true);
  });

  it('deletes a CMS comment created through the public endpoint', async () => {
    const app = EDITOR_APP();
    const post = await app.seedPost({ slug: 'moderation-target', status: 'published' });
    const created = await app.request('/api/comments', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        postId: `cms-${post.id}`,
        authorName: 'Reader',
        text: 'A comment that will be moderated away.',
      }),
    });
    expect(created.status).toBe(201);

    const listed = await (await app.request('/api/cms/comments', { as: 'editor' })).json();
    const target = listed.comments.find((comment: { postId: string }) => comment.postId === post.id);
    expect(target).toBeTruthy();

    const res = await app.request(`/api/cms/comments/${target.id}`, {
      as: 'editor',
      method: 'DELETE',
      headers: SITE_HEADERS,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);

    const after = await (await app.request('/api/cms/comments', { as: 'editor' })).json();
    expect(after.comments.some((comment: { id: string }) => comment.id === target.id)).toBe(false);
  });

  it('404s an unknown comment', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/comments/comment-does-not-exist', {
      as: 'editor',
      method: 'DELETE',
      headers: SITE_HEADERS,
    });
    expect(res.status).toBe(404);
  });

  it('rejects cross-site moderation deletes with 403', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/comments/comment-1', {
      as: 'editor',
      method: 'DELETE',
      headers: { origin: 'https://evil.example', host: 'test.researchwith.me' },
    });
    expect(res.status).toBe(403);
  });
});

describe('Editor-in-Chief editorial publicationType authorization', () => {
  const CHIEF_APP = () =>
    createTestApp({ profileRows: [MAYA_PROFILE], editorInChief: true });

  it('forbids a regular editor from creating an editorial post', async () => {
    const app = EDITOR_APP();
    const res = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(
        publishedPostBody({ slug: 'unauthorized-editorial', publicationType: 'editorial' }),
      ),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('Editor-in-Chief');
  });

  it('allows the Editor-in-Chief to publish an editorial and defaults reviews to review', async () => {
    const app = CHIEF_APP();

    const editorialRes = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(
        publishedPostBody({ slug: 'chief-editorial-note', publicationType: 'editorial' }),
      ),
    });
    expect(editorialRes.status).toBe(201);
    const editorialBody = await editorialRes.json();
    expect(editorialBody.post.publicationType).toBe('editorial');

    const reviewRes = await app.request('/api/cms/posts', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify(publishedPostBody({ slug: 'chief-standard-review' })),
    });
    expect(reviewRes.status).toBe(201);
    expect((await reviewRes.json()).post.publicationType).toBe('review');

    // SSR reader shows the Editorial badge on Editorials and omits it on Reviews.
    const editorialHtml = await (await app.request('/post/chief-editorial-note')).text();
    expect(editorialHtml).toContain('>Editorial<');

    const reviewHtml = await (await app.request('/post/chief-standard-review')).text();
    expect(reviewHtml).not.toContain('>Editorial<');
  });

  it('forbids a regular editor from reclassifying a post, while allowing non-classification edits', async () => {
    const app = EDITOR_APP();
    const editorial = await app.seedPost({
      slug: 'existing-editorial',
      status: 'draft',
      publicationType: 'editorial',
    });
    const review = await app.seedPost({
      slug: 'existing-review',
      status: 'draft',
      publicationType: 'review',
    });

    const promote = await app.request(postPath(review.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ publicationType: 'editorial' }),
    });
    expect(promote.status).toBe(403);

    const demote = await app.request(postPath(editorial.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ publicationType: 'review' }),
    });
    expect(demote.status).toBe(403);

    // Updating title alone preserves publicationType without error.
    const titleOnly = await app.request(postPath(editorial.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ title: 'Updated headline for the existing editorial' }),
    });
    expect(titleOnly.status).toBe(200);
    expect((await titleOnly.json()).post.publicationType).toBe('editorial');
  });

  it('allows the Editor-in-Chief to toggle publicationType via PATCH', async () => {
    const app = CHIEF_APP();
    const review = await app.seedPost({
      slug: 'convertible-review',
      status: 'draft',
      publicationType: 'review',
    });

    const promoted = await app.request(postPath(review.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ publicationType: 'editorial' }),
    });
    expect(promoted.status).toBe(200);
    expect((await promoted.json()).post.publicationType).toBe('editorial');

    const reverted = await app.request(postPath(review.id), {
      as: 'editor',
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: JSON.stringify({ publicationType: 'review' }),
    });
    expect(reverted.status).toBe(200);
    expect((await reverted.json()).post.publicationType).toBe('review');
  });
});
