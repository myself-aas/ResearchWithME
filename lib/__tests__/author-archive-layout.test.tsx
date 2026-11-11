import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthorArchiveLayout from '@/components/AuthorArchiveLayout';
import type { BlogPost } from '@/lib/blog-data';

function article(slug: string): BlogPost {
  return {
    id: slug,
    slug,
    title: `Work ${slug}`,
    subtitle: '',
    category: 'Research Reviews',
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

function renderLayout(articles: BlogPost[]) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AuthorArchiveLayout, { articles })));
}

describe('AuthorArchiveLayout', () => {
  it('renders_archive_and_summary_tracks_when_articles_exist', () => {
    const html = renderLayout([article('one')]);
    expect(html).toContain('data-layout-grid="author-archive"');
    expect(html).toContain('Publication archive');
    expect(html).toContain('Work at a glance');
    expect(html).toContain('<aside');
  });

  it('renders_archive_full_width_without_empty_track_when_no_articles', () => {
    const html = renderLayout([]);
    expect(html).toContain('Publication archive');
    expect(html).toContain('No articles published yet');
    expect(html).not.toContain('data-layout-grid="author-archive"');
    expect(html).not.toContain('<aside');
  });
});
