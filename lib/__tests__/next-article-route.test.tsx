import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { makeTestArticle } from '../../test/fixtures/articles';

const catalogue = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cms/catalogue', () => ({ getCachedArticleCatalogue: catalogue }));
vi.mock('next/navigation', async (importOriginal) => ({ ...(await importOriginal<object>()), notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
import ArticlePage from '@/app/post/[slug]/page';

describe('Next article route', () => {
  it('invokes notFound for a missing article', async () => {
    catalogue.mockResolvedValue([]);
    await expect(ArticlePage({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
  it('does not claim an upstream artifact is linked when no artifact exists', async () => {
    const article = makeTestArticle({ reviewedArtifact: undefined, coverImage: '', bodyMarkdown: undefined, content: ['Only fixture content.'], tags: [] });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).toContain('Only fixture content.');
    expect(html).not.toContain('Primary artifacts are linked and citable below');
    expect(html).not.toContain('against the linked upstream artifact');
    expect(html).not.toContain('Open the reviewed artifact');
  });
  it('does not offer a video when the article has no published video asset', async () => {
    const article = makeTestArticle();
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).not.toContain('<video');
    expect(html).not.toContain(`/videos/explainer-${article.slug}.mp4`);
  });
  it('keeps the artifact link and verification note when an artifact exists', async () => {
    const article = makeTestArticle({ reviewedArtifact: { type: 'paper', title: 'Fixture paper', url: 'https://example.org/paper', identifier: 'fixture-id', meta: 'Fixture details' } });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).toContain('href="https://example.org/paper"');
    expect(html).toContain('The reviewed artifact is linked below.');
    expect(html).toContain('against the linked upstream artifact');
  });
  it('returns the reader to the feed instead of a redirect-only legacy index', async () => {
    const article = makeTestArticle();
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    // /articles redirects to /, and / sends signed-in readers to their landing
    // page; the reader's back control must resolve to the feed directly.
    expect(html).toContain('aria-label="Feed"');
    expect(html).toContain('href="/feed"');
    expect(html).not.toContain('href="/articles"');
  });

  it('prints the licence once, not once per spelling', async () => {
    const article = makeTestArticle();
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect((html.match(/Licence/g) ?? []).length).toBe(1);
    expect(html).not.toContain('License');
  });

  it('keeps standalone article controls at 44px', async () => {
    const article = makeTestArticle({
      tags: ['audit'],
      reviewedArtifact: { type: 'paper', title: 'Fixture paper', url: 'https://example.org/paper', identifier: 'fixture-id', meta: 'Fixture details' },
    });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);

    const tag = html.match(/<a[^>]*search=audit[^>]*>/)?.[0] ?? '';
    expect(tag).toContain('min-h-11');

    const artifact = html.match(/<a[^>]*example\.org\/paper[^>]*>/)?.[0] ?? '';
    expect(artifact).toContain('min-h-11');

    const citation = html.match(/<button[^>]*aria-label="Citation Cite:[^"]*"[^>]*>/)?.[0] ?? '';
    expect(citation).toContain('min-h-11');
  });

  it('makes a wide table and a code block keyboard-scrollable', async () => {
    const article = makeTestArticle({
      bodyMarkdown: [
        '| Metric | Value |',
        '| --- | --- |',
        '| Accuracy | 0.91 |',
        '',
        '```js',
        'const value = 1;',
        '```',
      ].join('\n'),
    });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    const tableRegion = html.match(/<div[^>]*aria-label="Table"[^>]*>/)?.[0] ?? '';
    expect(tableRegion).toContain('role="region"');
    expect(tableRegion).toContain('tabindex="0"');
    const codeRegion = html.match(/<pre[^>]*aria-label="Code block"[^>]*>/)?.[0] ?? '';
    expect(codeRegion).toContain('role="region"');
    expect(codeRegion).toContain('tabindex="0"');
  });

  it('omits the takeaways card when there are no takeaways', async () => {
    const article = makeTestArticle({ keyTakeaways: [] });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).not.toContain('Key takeaways');
  });

  it('shows the specialist credential once, beside the byline', async () => {
    const base = makeTestArticle();
    const article = makeTestArticle({
      author: { ...base.author, verifiedVia: 'orcid', orcid: '0000-0002-1825-0097' },
    });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    // The badge sits next to the byline; the author card at the foot of the
    // article used to repeat the same credential control.
    expect((html.match(/specialist credentials/g) ?? []).length).toBe(1);
  });

  it('server-renders a fixture title and body', async () => {
    const article = makeTestArticle({ title: 'Fixture title', bodyMarkdown: 'Fixture body' });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).toContain('Fixture title');
    expect(html).toContain('Fixture body');
  });
});
