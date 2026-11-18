import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ArticleFeed from '@/components/ArticleFeed';

const baseProps = {
  posts: [],
  savedPostIds: [],
  likedPostIds: [],
  onToggleSave: vi.fn(),
  onLikePost: vi.fn(),
  selectedCategory: 'All',
  selectedFormat: 'All',
  searchQuery: '',
  onClearFilters: vi.fn(),
};

describe('ArticleFeed empty states', () => {
  it('renders the stand-alone empty state when nothing is above it', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ArticleFeed, baseProps)));
    expect(html).toContain('No reviews yet');
  });

  it('renders nothing when the lead story above already covers the catalogue', () => {
    const html = renderToStaticMarkup(createElement(ArticleFeed, { ...baseProps, leadExcluded: true }));
    expect(html).toBe('');
  });
});
