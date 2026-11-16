import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTestArticle } from '../../test/fixtures/articles';
import type { RequestContext } from '../../cloudflare-pages/src/server/context';

const catalogue = vi.hoisted(() => vi.fn());
vi.mock('../../cloudflare-pages/src/server/stores', () => ({ getPublicArticleCatalogue: catalogue }));
import { loadPublicRoute } from '../../cloudflare-pages/src/server/loaders/public';

const ctx = { request: new Request('http://localhost/post/test-article-1') } as RequestContext;
beforeEach(() => catalogue.mockReset());
describe('Pages article loader', () => {
  it('returns a real 404 response for an unknown article', async () => {
    catalogue.mockResolvedValue([]);
    await expect(loadPublicRoute(ctx, 'post', { slug: 'missing' })).rejects.toMatchObject({ status: 404 });
  });
  it('returns the full fixture article with its body for SSR', async () => {
    const article = makeTestArticle({ title: 'Fixture title', bodyMarkdown: 'Fixture body' });
    catalogue.mockResolvedValue([article]);
    const result = await loadPublicRoute(ctx, 'post', { slug: article.slug });
    expect(result).toMatchObject({ kind: 'post', article: { title: 'Fixture title', bodyMarkdown: 'Fixture body' }, related: [] });
  });
});
