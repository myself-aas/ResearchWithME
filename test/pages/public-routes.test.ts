/**
 * Public reader routes (Task 11): the HTML surface of the ported pages.
 * The JSON APIs are covered by their own suites; here we assert status,
 * no-JS body text, metadata, and the error semantics that keep a crawler
 * from de-indexing a valid record.
 */
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import type { ProfileRow } from '@/lib/author-directory-core';
import { paperFixture } from '@/test/fixtures/paper';

// The fake profiles table filters `published = true`, like RLS does; the
// ProfileRow type simply doesn't carry the flag.
const MAYA_PROFILE: ProfileRow & { published: boolean } = {
  slug: 'maya-lin',
  published: true,
  display_name: 'Maya Lin',
  bio: 'Maya Lin reviews reproducible systems research.',
  role: 'Reviewing editor',
  domain: 'Scholarly Tech',
  institution: 'ResearchWithMe',
  avatar_url: '',
  orcid: '0000-0002-1825-0097',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('GET / (home)', () => {
  it('renders the SSR document with the seeded archive and default metadata', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'feed-probe', status: 'published', title: 'Feed probe article' });

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const html = await res.text();
    // No-JS body text: the reader sees the feed, not an empty shell.
    expect(html).toContain('Research you can read, check, and reuse.');
    expect(html).toContain('Feed probe article');
    expect(html).toContain('ResearchWithMe');
  });

  it('canonicalises the legacy ?category= query to a clean field URL', async () => {
    const app = createTestApp();
    const res = await app.request('/?category=Data%20%26%20Policy');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/category/data-policy');
  });

  it('preserves a search term through the category canonical redirect', async () => {
    const app = createTestApp();
    const res = await app.request('/?category=Data%20%26%20Policy&search=differential%20privacy');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/category/data-policy?search=differential%20privacy');
  });

  it('ignores an unrecognised ?category= value instead of redirecting', async () => {
    const app = createTestApp();
    const res = await app.request('/?category=not-a-field');
    expect(res.status).toBe(200);
  });
});

describe('GET /articles', () => {
  it('redirects /articles cleanly to / so existing navigation targets never 404', async () => {
    const app = createTestApp();
    const res = await app.request('/articles');
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get('location')).toBe('/');
  });
});

describe('GET /category/:slug', () => {
  it('renders a known field page', async () => {
    const app = createTestApp();
    const res = await app.request('/category/data-policy');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Data &amp; Policy Reviews');
    expect(html).toContain('data-policy');
  });

  it('404s on an unknown field instead of rendering an empty feed', async () => {
    const app = createTestApp();
    expect((await app.request('/category/not-a-field')).status).toBe(404);
  });
});

describe('GET /post/:slug', () => {
  it('renders the full article for a published CMS post', async () => {
    const app = createTestApp();
    await app.seedPost({
      slug: 'reader-probe',
      status: 'published',
      title: 'Reader probe article',
      summary: 'A deterministic summary for the reader probe.',
      keyTakeaways: ['First takeaway for the probe.'],
    });

    const res = await app.request('/post/reader-probe');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Reader probe article');
    expect(html).toContain('First takeaway for the probe.');
    // Metadata: title, canonical, Open Graph article typing.
    expect(html).toContain('<title>Reader probe article</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/post/reader-probe"');
    expect(html).toContain('property="og:type" content="article"');
    // Structured data is embedded for crawlers.
    expect(html).toContain('application/ld+json');
    // Single-article CMS probe has no related entries, so the Related reviews block is not forced.
  });

  it('404s for a missing article', async () => {
    const app = createTestApp();
    expect((await app.request('/post/definitely-not-published')).status).toBe(404);
  });

  it('404s for a draft and never leaks its text', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'draft-probe', status: 'draft', title: 'Secret draft wording probe' });
    const res = await app.request('/post/draft-probe');
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('Secret draft wording probe');
  });

  it('prefers a CMS post over a bundled seed article with the same slug', async () => {
    const app = createTestApp();
    await app.seedPost({
      slug: 'inside-vllm-and-paged-attention',
      status: 'published',
      title: 'CMS override of the vLLM teardown',
    });

    const res = await app.request('/post/inside-vllm-and-paged-attention');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('CMS override of the vLLM teardown');
  });

  it('escapes an XSS payload in the title everywhere it is rendered', async () => {
    const app = createTestApp();
    const payload = '</script><script>alert(1)</script>';
    await app.seedPost({
      slug: 'xss-probe',
      status: 'published',
      title: `Probe ${payload} probe`,
      summary: `Summary ${payload} probe`,
    });

    const res = await app.request('/post/xss-probe');
    expect(res.status).toBe(200);
    const html = await res.text();
    // The raw payload must not appear anywhere — not in the title tag, the
    // heading, the meta tags, the JSON-LD block, or the hydration payload.
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;/script&gt;');
    // The JSON-LD block escapes < as <.
    expect(html).toContain('\\u003c/script>');
  });
});

describe('GET /paper/:slug', () => {
  it('returns 404 because the legacy /paper archive has been retired', async () => {
    const app = createTestApp();
    app.seedPaper(
      paperFixture({ slug: 'field-scaling-laws', title: 'Field-tested scaling laws' }),
    );
    expect((await app.request('/paper/field-scaling-laws')).status).toBe(404);
    expect((await app.request('/paper/nothing-here')).status).toBe(404);
  });
});

describe('GET /author/:id', () => {
  it('renders the published profile and attributed articles', async () => {
    const app = createTestApp({ profileRows: [MAYA_PROFILE] });
    await app.seedPost({
      slug: 'maya-probe',
      status: 'published',
      title: 'Maya probe article',
      authorId: 'maya-lin',
      authorName: 'Maya Lin',
    });

    const res = await app.request('/author/maya-lin');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Maya Lin');
    expect(html).toContain('Maya Lin reviews reproducible systems research.');
    expect(html).toContain('Maya probe article');
    expect(html).toContain('<title>Maya Lin — ResearchWithMe</title>');
  });

  it('returns 404 for a genuinely missing author', async () => {
    const app = createTestApp();
    expect((await app.request('/author/missing')).status).toBe(404);
  });

  it('returns 5xx for a profile outage rather than de-indexing a valid author', async () => {
    const app = createTestApp({ authorLookupFails: true });
    const res = await app.request('/author/maya-lin');
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
