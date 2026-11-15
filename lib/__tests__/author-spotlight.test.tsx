import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthorSpotlight from '@/components/AuthorSpotlight';
import type { Author } from '@/lib/blog-data';

describe('author spotlight', () => {
  it('renders a visual fallback rather than exposing a raw avatar value', () => {
    const author: Author = {
      id: 'writer', name: 'Example Writer', avatar: 'raw-avatar-value', bio: 'Researcher',
      role: 'Writer', domain: 'Science', joinedDate: '2026-01-01', articleCount: 1,
    };
    const html = renderToStaticMarkup(<MemoryRouter><AuthorSpotlight authors={[author]} /></MemoryRouter>);
    expect(html).toContain('Example Writer');
    expect(html).toContain('data:image/svg+xml');
    expect(html).not.toContain('raw-avatar-value');
    expect(html).toContain('/author/writer');
  });
});
