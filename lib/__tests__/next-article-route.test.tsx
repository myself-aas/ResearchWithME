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
  it('server-renders a fixture title and body', async () => {
    const article = makeTestArticle({ title: 'Fixture title', bodyMarkdown: 'Fixture body' });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).toContain('Fixture title');
    expect(html).toContain('Fixture body');
  });
});
