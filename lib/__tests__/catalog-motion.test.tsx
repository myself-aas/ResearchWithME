import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { BlogPost } from '@/lib/blog-data';
import ArticleFeed from '@/components/ArticleFeed';

const posts: BlogPost[] = JSON.parse(readFileSync(join(process.cwd(), 'data/articles.json'), 'utf8'));

describe('ArticleFeed motion catalog & empty/populated states', () => {
  it('Review Focus #4b: renders populated archival cards with DOI badges, numbered columns, and full SSR visibility (no opacity:0)', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticleFeed, {
          posts,
          savedPostIds: [],
          onToggleSave: () => {},
          onLikePost: () => {},
          selectedCategory: 'All',
          selectedFormat: 'All',
          searchQuery: '',
          onClearFilters: () => {},
        }),
      ),
    );
    expect(html).toContain('Inside vLLM');
    expect(html).toContain('10.5555/rwm.post-1');
    expect(html).toContain('01');
    expect(html).toContain('06');
    expect(html).not.toContain('opacity:0');
    expect(html).toContain('CC BY 4.0');
  });

  it('renders diagnostic active filter chips and Reset filters button in empty state', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticleFeed, {
          posts: [],
          savedPostIds: [],
          onToggleSave: () => {},
          onLikePost: () => {},
          selectedCategory: 'STEM & Tech',
          selectedFormat: 'Field Notes',
          searchQuery: 'nonexistent-doi',
          onClearFilters: () => {},
        }),
      ),
    );
    expect(html).toContain('data-testid="active-filter-chips"');
    expect(html).toContain('Column: STEM &amp; Tech');
    expect(html).toContain('Format: Field Notes');
    expect(html).toContain('Query: nonexistent-doi');
    expect(html).toContain('Reset filters');
  });
});
