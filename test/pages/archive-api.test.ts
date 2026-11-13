import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import type { ProfileRow } from '@/lib/author-directory-core';

const PUBLISHED_MAYA: ProfileRow & { published: boolean } = {
  slug: 'maya-lin',
  published: true,
  display_name: 'Maya Lin',
  bio: 'Studies inference systems.',
  role: 'Systems reviewer',
  domain: 'Inference',
  institution: 'Example Lab',
  avatar_url: 'ML',
  orcid: '0000-0000-0000-0001',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

const PUBLISHED_MARCUS: ProfileRow & { published: boolean } = {
  ...PUBLISHED_MAYA,
  slug: 'marcus-vance',
  display_name: 'Marcus Vance',
  bio: 'Writes about compiler infrastructure.',
  role: 'Reviewer',
  domain: 'Tooling',
  orcid: '',
  created_at: '2025-06-01T00:00:00.000Z',
};

// Fixture rows are kept in display_name order, mirroring the directory query.
const PUBLISHED_ORDERED: ProfileRow[] = [PUBLISHED_MARCUS, PUBLISHED_MAYA];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('GET /api/articles', () => {
  it('returns an empty catalogue before any post is published and 404 for an unknown article', async () => {
    const app = createTestApp();
    const list = await app.request('/api/articles?limit=1');
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.articles).toEqual([]);
    expect(body.count).toBe(0);
    expect((await app.request('/api/articles/no-such-id')).status).toBe(404);
  });

  it('serves published CMS posts and caps the page size', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'cms-review-1', status: 'published', title: 'CMS Review 1' });
    await app.seedPost({ slug: 'cms-review-2', status: 'published', title: 'CMS Review 2' });
    await app.seedPost({ slug: 'cms-review-3', status: 'published', title: 'CMS Review 3' });

    const res = await app.request('/api/articles?limit=2');
    const body = await res.json();
    expect(body.articles).toHaveLength(2);
    expect(body.count).toBe(3);
    expect(res.headers.get('cache-control')).toBe('public, max-age=30, stale-while-revalidate=300');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('clamps a degenerate limit and ignores a non-numeric one', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'cms-degen', status: 'published', title: 'Degen' });
    const zero = await (await app.request('/api/articles?limit=0')).json();
    expect(zero.articles).toHaveLength(1);
    const bogus = await (await app.request('/api/articles?limit=abc')).json();
    expect(bogus.articles.length).toBe(1);
  });

  it('filters by category, search and author', async () => {
    const app = createTestApp({ profileRows: [PUBLISHED_MAYA] });
    const p1 = await app.seedPost({ slug: 'cms-filter-1', status: 'published', title: 'vLLM teardown', category: 'GitHub Repo Teardowns', authorId: 'maya-lin' });

    const byCategory = await (await app.request('/api/articles?category=GitHub%20Repo%20Teardowns')).json();
    expect(byCategory.count).toBeGreaterThan(0);
    expect(byCategory.articles.every((a: { category: string }) => a.category === 'GitHub Repo Teardowns')).toBe(true);

    const bySearch = await (await app.request('/api/articles?search=vllm')).json();
    expect(bySearch.articles.some((a: { id: string }) => a.id === `cms-${p1.id}`)).toBe(true);

    const byFormat = await (await app.request('/api/articles?format=Repo%20Teardown')).json();
    expect(byFormat.articles.every((a: { format: string }) => a.format === 'Repo Teardown')).toBe(true);
  });

  it('strips bodies unless full=1 is requested', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'cms-bodies', status: 'published', title: 'Bodies' });
    const short = await (await app.request('/api/articles?limit=1')).json();
    expect(short.articles[0].content).toBeUndefined();
    expect(short.articles[0].bodyMarkdown).toBeUndefined();
    expect(short.articles[0].title).toBeTruthy();

    const full = await (await app.request('/api/articles?limit=1&full=1')).json();
    expect(full.articles[0].content).toBeTruthy();
  });

  it('serves HEAD with an empty body and OPTIONS with an Allow header', async () => {
    const app = createTestApp();
    const head = await app.request('/api/articles', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(head.headers.get('content-type')).toContain('application/json');
    expect(head.headers.get('cache-control')).toContain('max-age=30');

    const options = await app.request('/api/articles', { method: 'OPTIONS' });
    expect(options.status).toBe(204);
    expect(options.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
    expect(await options.text()).toBe('');
  });

  it('answers 405 with Allow for an unregistered method', async () => {
    const app = createTestApp();
    const res = await app.request('/api/articles', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });

  it('404s a non-CMS article id', async () => {
    const app = createTestApp();
    const res = await app.request('/api/articles/post-1');
    expect(res.status).toBe(404);
  });

  it('returns published CMS posts by their public id', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-article-detail', status: 'published', title: 'CMS Detail' });
    const publicId = `cms-${post.id}`;

    const list = await (await app.request('/api/articles?limit=1')).json();
    expect(list.articles[0].id).toBe(publicId);

    const detail = await app.request(`/api/articles/${publicId}`);
    expect(detail.status).toBe(200);
    expect((await detail.json()).article.slug).toBe('cms-article-detail');
  });

  it('leads the feed with published CMS posts and resolves their public ids', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'cms-review-alpha', status: 'published', title: 'CMS Review Alpha' });
    const publicId = `cms-${post.id}`;

    const list = await (await app.request('/api/articles?limit=1')).json();
    expect(list.articles[0].id).toBe(publicId);
    expect(list.articles[0].slug).toBe('cms-review-alpha');
    expect(list.articles[0].content).toBeUndefined();

    const detail = await app.request(`/api/articles/${publicId}`);
    expect(detail.status).toBe(200);
    expect((await detail.json()).article.slug).toBe('cms-review-alpha');

    const draft = await app.seedPost({ slug: 'cms-draft-beta', status: 'draft' });
    const draftDetail = await app.request(`/api/articles/cms-${draft.id}`);
    expect(draftDetail.status).toBe(404);
    const draftList = await (await app.request('/api/articles?search=cms-draft-beta')).json();
    expect(draftList.count).toBe(0);
  });
});

describe('GET /api/authors', () => {
  it('returns an empty directory when no profile is published', async () => {
    const app = createTestApp();
    const res = await app.request('/api/authors');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authors: [] });
    expect(res.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=600');
  });

  it('lists published profiles with article counts from the catalogue', async () => {
    const app = createTestApp({ profileRows: PUBLISHED_ORDERED });
    await app.seedPost({ slug: 'maya-article-1', status: 'published', authorId: 'maya-lin' });
    await app.seedPost({ slug: 'maya-article-2', status: 'published', authorId: 'maya-lin' });
    const res = await app.request('/api/authors');
    const body = await res.json();
    expect(body.authors.map((a: { id: string }) => a.id)).toEqual(['marcus-vance', 'maya-lin']);
    const maya = body.authors.find((a: { id: string }) => a.id === 'maya-lin');
    expect(maya.articleCount).toBe(2);
    expect(maya.orcid).toBe('0000-0000-0000-0001');
  });

  it('serves one archive with metrics, case-insensitively on the slug', async () => {
    const app = createTestApp({ profileRows: PUBLISHED_ORDERED });
    await app.seedPost({ slug: 'marcus-article', status: 'published', authorId: 'marcus-vance' });
    const res = await app.request('/api/authors/Marcus-Vance');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.author.id).toBe('marcus-vance');
    expect(body.articles.length).toBe(body.metrics.totalArticles);
    expect(body.articles.every((a: { author: { id: string } }) => a.author.id === 'marcus-vance')).toBe(true);
    expect(Array.isArray(body.metrics.domains)).toBe(true);
  });

  it('404s a genuinely missing author', async () => {
    const app = createTestApp({ profileRows: PUBLISHED_ORDERED });
    const res = await app.request('/api/authors/nobody-here');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Author not found');
  });

  it('degrades the list but fails the lookup when the directory read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ profileRows: PUBLISHED_ORDERED, authorLookupFails: true });

    const list = await app.request('/api/authors');
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({ authors: [] });

    const detail = await app.request('/api/authors/maya-lin');
    expect(detail.status).toBe(500);
    expect((await detail.json()).error).toBe('Internal server error fetching author');
  });

  it('answers 204 OPTIONS on the authors collection', async () => {
    const app = createTestApp();
    const res = await app.request('/api/authors', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
  });
});

describe('API dispatcher fallback', () => {
  it('falls through to the page renderer for an unknown /api path', async () => {
    const app = createTestApp();
    const res = await app.request('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
  });
});
