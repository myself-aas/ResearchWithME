import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { BlogPost } from '@/lib/blog-data';

const article: BlogPost = {
  id: 'cms-1', slug: 'next-review', title: 'A Next review', subtitle: 'Short review',
  category: 'Research Reviews', format: 'Paper Review', publishedAt: 'Nov 13, 2026',
  dateISO: '2026-11-13T00:00:00.000Z', author: {
    id: 'writer', name: 'Test Writer', avatar: '', bio: '', role: 'Writer', domain: 'Research',
    joinedDate: '2026', articleCount: 1,
  },
  coverImage: '', featured: false, summary: 'An open article.',
  content: ['A fallback.'], bodyMarkdown: '## The paper\n\nThe **full** text.',
  keyTakeaways: ['Read the paper.'], tags: [], readTime: '2 min', likes: 0, commentsCount: 0,
};

vi.mock('@/lib/cms/catalogue', () => ({ getCachedArticleCatalogue: async () => [article] }));

import { middleware } from '@/middleware';
import { GET as markdownGET, HEAD as markdownHEAD } from '@/app/agent-markdown/route';

describe('Next markdown negotiation', () => {
  it('rewrites only explicitly requested public catalogue pages', async () => {
    const request = (path: string, accept: string) => new NextRequest(`https://researchwith.me${path}`, { headers: { Accept: accept } });
    const markdown = await middleware(request('/post/next-review?search=paper', 'text/markdown'));
    const rewrite = new URL(markdown.headers.get('x-middleware-rewrite')!);
    expect(rewrite.pathname).toBe('/agent-markdown');
    expect(rewrite.searchParams.get('search')).toBe('paper');
    expect(markdown.headers.get('vary')).toContain('Accept');
    expect((await middleware(request('/', 'text/html'))).headers.get('x-middleware-rewrite')).toBeNull();
    expect((await middleware(request('/post/next-review', 'text/markdown;q=0'))).headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('serves Markdown from published source data and refuses arbitrary rewrite paths', async () => {
    // Route handlers receive the original URL after Next middleware rewrites.
    const request = (path: string, method = 'GET') => new NextRequest(`https://researchwith.me${path}`, {
      method, headers: { Accept: 'text/markdown' },
    });
    const result = await markdownGET(request('/post/next-review'));
    expect(result.status).toBe(200);
    expect(result.headers.get('content-type')).toContain('text/markdown');
    expect(result.headers.get('vary')).toContain('Accept');
    expect(await result.text()).toContain('## The paper\n\nThe **full** text.');
    expect((await markdownGET(request('/post/unknown'))).status).toBe(404);
    expect((await markdownGET(request('/dashboard'))).status).toBe(404);
    expect((await markdownGET(request('/agent-markdown'))).status).toBe(404);
    const head = await markdownHEAD(request('/post/next-review', 'HEAD'));
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});
