import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ArticleFeed from '@/components/ArticleFeed';
import { makeTestArticle } from '@/test/fixtures/articles';

const posts = [
  makeTestArticle(),
  makeTestArticle({
    id: 'cms-test-2',
    slug: 'test-article-2',
    title: 'A Second Test Article',
    category: 'GitHub Repo Teardowns',
    format: 'Repo Teardown',
  }),
];

describe('ArticleFeed motion catalog & empty/populated states', () => {
  it('renders populated archival cards with numbered columns and full SSR visibility (no opacity:0)', () => {
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
    expect(html).toContain('A Test Article for Unit Tests');
    expect(html).toContain('01');
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
          searchQuery: 'nonexistent-query',
          onClearFilters: () => {},
        }),
      ),
    );
    expect(html).toContain('data-testid="active-filter-chips"');
    expect(html).toContain('Column: STEM &amp; Tech');
    expect(html).toContain('Format: Field Notes');
    expect(html).toContain('Query: nonexistent-query');
    expect(html).toContain('Reset filters');
  });
});
