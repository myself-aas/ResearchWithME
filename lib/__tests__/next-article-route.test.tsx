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
  it('server-renders a fixture title and body', async () => {
    const article = makeTestArticle({ title: 'Fixture title', bodyMarkdown: 'Fixture body' });
    catalogue.mockResolvedValue([article]);
    const page = await ArticlePage({ params: Promise.resolve({ slug: article.slug }) });
    const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);
    expect(html).toContain('Fixture title');
    expect(html).toContain('Fixture body');
  });
});
