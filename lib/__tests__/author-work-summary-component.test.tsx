import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthorWorkSummary from '@/components/AuthorWorkSummary';
import type { BlogPost } from '@/lib/blog-data';

function article(slug: string, title: string, category: BlogPost['category'] = 'Research Reviews'): BlogPost {
  return {
    id: slug,
    slug,
    title,
    subtitle: '',
    category,
    format: 'Paper Review',
    author: {} as BlogPost['author'],
    publishedAt: '2026-01-01T00:00:00.000Z',
    readTime: '5 min',
    coverImage: '',
    featured: false,
    summary: '',
    content: [],
    keyTakeaways: [],
    tags: [],
    likes: 0,
    commentsCount: 0,
  };
}

function renderSummary(articles: BlogPost[]) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AuthorWorkSummary, { articles })));
}

describe('AuthorWorkSummary', () => {
  it('renders_factual_counts_and_category_breakdown', () => {
    const html = renderSummary([article('one', 'One'), article('two', 'Two', 'Data & Policy')]);
    expect(html).toContain('Published works');
    expect(html).toContain('Reviewed artifacts');
    expect(html).toContain('Research Reviews');
    expect(html).toContain('Data &amp; Policy');
    expect(html).toContain('>2</dd>');
  });

  it('links_latest_works_to_their_post_routes', () => {
    const html = renderSummary([
      article('old', 'Older work'),
      article('recent', 'Recent work'),
    ]);
    expect(html).toContain('href="/post/old"');
    expect(html).toContain('href="/post/recent"');
    expect([...html.matchAll(/href="\/post\//g)]).toHaveLength(2);
  });

  it('renders_nothing_for_empty_work_list', () => {
    const html = renderSummary([]);
    expect(html).toBe('');
    expect(html).not.toContain('<aside');
  });
});
