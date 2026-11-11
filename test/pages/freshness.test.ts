/**
 * Publication freshness (Task 11): a publish, rename or unpublish must be
 * visible on the very next read — the HTML reader route, the JSON API and
 * (via `npm run build:pages`, covered in Task 14B) the sitemap. The Next
 * app revalidates on a 30s ISR window; the Pages runtime is request-scoped,
 * so the guarantee is stronger here.
 */
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';

describe('publication freshness', () => {
  it('reflects a publish, rename and unpublish on the next read', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'new-study', status: 'draft', title: 'New study' });

    expect((await app.request('/post/new-study')).status).toBe(404);

    await app.updatePost(post.id, { status: 'published' });
    expect((await app.request('/post/new-study')).status).toBe(200);

    await app.updatePost(post.id, { slug: 'renamed-study' });
    expect((await app.request('/post/new-study')).status).toBe(404);
    expect((await app.request('/post/renamed-study')).status).toBe(200);

    await app.updatePost(post.id, { status: 'draft' });
    expect((await app.request('/post/renamed-study')).status).toBe(404);
  });

  it('reflects a publish, rename and unpublish in the articles API on the next read', async () => {
    const app = createTestApp();
    const post = await app.seedPost({ slug: 'api-freshness', status: 'draft', title: 'API freshness probe' });

    const slugsOf = async () => {
      const res = await app.request('/api/articles?limit=100');
      expect(res.status).toBe(200);
      const body: { articles: Array<{ slug: string }> } = await res.json();
      return body.articles.map((article) => article.slug);
    };

    expect(await slugsOf()).not.toContain('api-freshness');

    await app.updatePost(post.id, { status: 'published' });
    expect(await slugsOf()).toContain('api-freshness');

    await app.updatePost(post.id, { slug: 'api-freshness-renamed' });
    const afterRename = await slugsOf();
    expect(afterRename).not.toContain('api-freshness');
    expect(afterRename).toContain('api-freshness-renamed');

    await app.updatePost(post.id, { status: 'draft' });
    expect(await slugsOf()).not.toContain('api-freshness-renamed');
  });

  it('never exposes a draft through direct HTML reads or the API payload', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'hidden-draft', status: 'draft', title: 'Hidden draft probe' });

    const html = await app.request('/post/hidden-draft');
    expect(html.status).toBe(404);

    const api = await app.request('/api/articles/hidden-draft');
    expect(api.status).toBe(404);
    expect(await api.text()).not.toContain('Hidden draft probe');
  });
});
