import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { wantsMarkdown, markdownRoute } from '@/lib/markdown-negotiation';

const ACCEPT = { Accept: 'text/markdown' };

describe('Markdown content negotiation (Pages)', () => {
  it('returns an article source Markdown body, not rendered HTML or unpublished content', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'published-review', status: 'published', title: 'Published review',
      summary: 'Evidence from an open review.', content: '## Methods\n\nA **reproducible** method.',
      keyTakeaways: ['Inspect the data.'] });
    await app.seedPost({ slug: 'private-review', status: 'draft', title: 'Private draft secret' });
    const response = await app.request('/post/published-review', { headers: ACCEPT });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('vary')).toContain('Accept');
    const body = await response.text();
    expect(body).toContain('# Published review');
    expect(body).toContain('## Methods\n\nA **reproducible** method.');
    expect(body).toContain('https://researchwith.me/post/published-review');
    expect(body).not.toContain('<html');
    expect(body).not.toContain('Private draft secret');
    const missing = await app.request('/post/private-review', { headers: ACCEPT });
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain('Private draft secret');
  });

  it('keeps HTML as the browser default and honours explicit q values', async () => {
    const app = createTestApp();
    for (const headers of [undefined, { Accept: '*/*' }, { Accept: 'text/html, text/markdown;q=0' },
      { Accept: 'text/html;q=1, text/markdown;q=0.5' }]) {
      const response = await app.request('/', { headers });
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(response.headers.get('vary')).toContain('Accept');
      expect(await response.text()).toContain('<html');
    }
    const markdown = await app.request('/', { headers: { Accept: 'text/html;q=0.1, text/markdown;q=1' } });
    expect(markdown.headers.get('content-type')).toContain('text/markdown');
    expect(await markdown.text()).toMatch(/^# ResearchWithMe/);
  });

  it('serves category and search results, supports HEAD, and excludes API and studio routes', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'quantum-note', status: 'published', title: 'Quantum note', category: 'STEM & Tech' });
    await app.seedPost({ slug: 'policy-note', status: 'published', title: 'Policy note', category: 'Data & Policy' });
    const response = await app.request('/category/stem-tech?search=quantum', { headers: ACCEPT });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('Quantum note');
    expect(text).not.toContain('Policy note');
    expect((await app.request('/category/no-such-field', { headers: ACCEPT })).status).toBe(404);
    const head = await app.request('/post/quantum-note', { method: 'HEAD', headers: ACCEPT });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(markdownRoute('/api/articles')).toBeNull();
    expect(markdownRoute('/dashboard')).toBeNull();
  });
});

describe('Accept parser', () => {
  it('requires explicit text/markdown with positive, valid preference', () => {
    expect(wantsMarkdown('text/markdown')).toBe(true);
    expect(wantsMarkdown('text/markdown;q=0')).toBe(false);
    expect(wantsMarkdown('text/markdown;q=oops')).toBe(false);
    expect(wantsMarkdown('text/markdown;q=0.9, text/html;q=0.5')).toBe(true);
    expect(wantsMarkdown('application/json, */*')).toBe(false);
    expect(wantsMarkdown('text/markdown;q=0.5, */*;q=1')).toBe(false);
    expect(wantsMarkdown('text/markdown;q=1, text/html;q=0, */*;q=1')).toBe(true);
  });
});
