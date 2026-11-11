import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthorDirectory from '@/components/AuthorDirectory';
import type { Author } from '@/lib/blog-data';

const author: Author = {
  id: 'maya-lin',
  name: 'Maya Lin',
  avatar: 'ML',
  bio: 'Studies inference systems.',
  role: 'Systems reviewer',
  domain: 'Inference',
  institution: 'Example Lab',
  joinedDate: '2026-01-01',
  articleCount: 1,
};

describe('AuthorDirectory responsive card collection', () => {
  it('marks the author-card collection and reserves three columns for xl', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AuthorDirectory, { authors: [author] })),
    );
    expect(html).toContain('data-layout-grid="author-cards"');
    expect(html).toContain('grid-cols-1 md:grid-cols-2 xl:grid-cols-3');
  });
});
