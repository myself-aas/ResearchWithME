// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardShell from '@/components/cms/DashboardShell';
import PostEditor from '@/components/cms/PostEditor';
import ArticleFeed from '@/components/ArticleFeed';
import AuthorArchive from '@/components/AuthorArchive';
import FeaturedArticle from '@/components/FeaturedArticle';
import type { BlogPost } from '@/lib/blog-data';
import type { CmsPost, DashboardUser } from '@/lib/cms/types';

vi.mock('@/components/BlogHeader', () => ({ default: () => <header /> }));
vi.mock('@/components/BlogFooter', () => ({ default: () => <footer /> }));
vi.mock('@/components/cms/MarkdownEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea id="post-content" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const sampleEditorialPost: CmsPost = {
  id: '42',
  title: 'Why reproducibility checklists matter now',
  slug: 'why-reproducibility-checklists-matter-now',
  content: 'A thorough editorial on reproducibility standards in computational research. '.repeat(6),
  status: 'draft',
  subtitle: 'Notes from the Editor-in-Chief',
  summary: 'A concise editorial statement on open benchmarks and artifact verification across disciplines.',
  category: 'Research Reviews',
  format: 'Deep-Dive Essay',
  publicationType: 'editorial',
  authorId: 'myself-aas',
  authorName: 'Ashif Ahmed Shuvo',
  coverImage: '/images/folio-hero.jpeg',
  tags: ['reproducibility'],
  keyTakeaways: ['Artifacts should be inspectable alongside every review.'],
  readTime: '4 min read',
  featured: false,
  likes: 0,
  publishedAt: null,
  insertedAt: '2026-11-16T00:00:00.000Z',
  updatedAt: '2026-11-16T00:00:00.000Z',
  artifact: null,
};

const chiefUser: DashboardUser = {
  id: 'e67f53f4-c5a6-4275-9fc1-be02f0bb954e',
  email: 'shuvo.1807016@bau.edu.bd',
  name: 'Ashif Ahmed Shuvo',
  isEditor: true,
  isEditorInChief: true,
};

const regularEditor: DashboardUser = {
  id: 'editor-regular',
  email: 'maya@example.org',
  name: 'Maya Lin',
  isEditor: true,
  isEditorInChief: false,
};

function makeArticle(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'cms-1',
    slug: 'sample-article',
    title: 'Sample research piece',
    subtitle: 'A clear subtitle',
    category: 'Research Reviews',
    format: 'Paper Review',
    publicationType: 'review',
    author: {
      id: 'myself-aas',
      name: 'Ashif Ahmed Shuvo',
      avatar: 'AS',
      bio: 'Editor-in-Chief',
      role: 'Editor-in-Chief',
      domain: 'Research Reviews',
      joinedDate: '2026',
      articleCount: 1,
    },
    publishedAt: 'Nov 16, 2026',
    readTime: '6 min read',
    coverImage: '/images/folio-hero.jpeg',
    featured: false,
    summary: 'An empirical review summary with enough detail to display cleanly in article cards.',
    content: ['Body paragraph.'],
    keyTakeaways: ['Key finding.'],
    tags: ['methodology'],
    likes: 3,
    commentsCount: 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PostEditor publication type dropdown visibility and submission', () => {
  it('hides the Review/Editorial dropdown for standard editors', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authors: [{ id: 'maya-lin', name: 'Maya Lin', role: 'Editor' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/dashboard']}>
            <DashboardShell configured user={regularEditor}>
              <PostEditor mode="create" />
            </DashboardShell>
          </MemoryRouter>,
        );
      });
      expect(container.querySelector('#cms-publication-type')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('shows the Review/Editorial dropdown beside Publish for Editor-in-Chief and submits selected editorial', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/authors') {
        return new Response(
          JSON.stringify({ authors: [{ id: 'myself-aas', name: 'Ashif Ahmed Shuvo', role: 'Editor-in-Chief' }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url === '/api/cms/posts/42' && init?.method === 'PATCH') {
        const parsed = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            post: { ...sampleEditorialPost, ...parsed, status: parsed.status },
            mode: 'supabase',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    });

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/dashboard/edit/42']}>
            <DashboardShell configured user={chiefUser}>
              <PostEditor mode="edit" initialPost={{ ...sampleEditorialPost, publicationType: 'review' }} />
            </DashboardShell>
          </MemoryRouter>,
        );
      });

      const select = container.querySelector<HTMLSelectElement>('#cms-publication-type');
      expect(select).not.toBeNull();
      expect(select?.value).toBe('review');
      expect([...(select?.options ?? [])].map((o) => ({ value: o.value, label: o.text }))).toEqual([
        { value: 'review', label: 'Review' },
        { value: 'editorial', label: 'Editorial' },
      ]);

      // Placed immediately before the Publish button in the action bar.
      expect(select?.nextElementSibling?.textContent).toContain('Publish article');

      const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
      await act(async () => {
        setSelect.call(select, 'editorial');
        select!.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select?.value).toBe('editorial');

      const publishButton = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Publish article'),
      );
      expect(publishButton).toBeTruthy();

      await act(async () => {
        publishButton!.click();
      });

      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/cms/posts/42' && init?.method === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
      const submitted = JSON.parse(String(patchCall![1]!.body));
      expect(submitted.publicationType).toBe('editorial');
      expect(submitted.status).toBe('published');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});

describe('Editorial badge rendering on public cards', () => {
  it('shows Editorial badge on Editorials and leaves Reviews unchanged across cards', () => {
    const editorial = makeArticle({ id: 'ed-1', slug: 'ed-1', publicationType: 'editorial' });
    const review = makeArticle({ id: 'rev-1', slug: 'rev-1', publicationType: 'review' });

    const featuredEditorialHtml = renderToStaticMarkup(
      <MemoryRouter>
        <FeaturedArticle post={editorial} isSaved={false} onToggleSave={() => {}} />
      </MemoryRouter>,
    );
    expect(featuredEditorialHtml).toContain('>Editorial<');
    expect(featuredEditorialHtml).toContain('Featured editorial');

    const featuredReviewHtml = renderToStaticMarkup(
      <MemoryRouter>
        <FeaturedArticle post={review} isSaved={false} onToggleSave={() => {}} />
      </MemoryRouter>,
    );
    expect(featuredReviewHtml).not.toContain('>Editorial<');
    expect(featuredReviewHtml).toContain('Featured review');

    const feedEditorialHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ArticleFeed
          posts={[editorial]}
          selectedCategory="All"
          selectedFormat="All"
          searchQuery=""
          likedPostIds={[]}
          savedPostIds={[]}
          onLikePost={() => {}}
          onToggleSave={() => {}}
          onClearFilters={() => {}}
        />
      </MemoryRouter>,
    );
    expect(feedEditorialHtml).toContain('>Editorial<');

    const feedReviewHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ArticleFeed
          posts={[review]}
          selectedCategory="All"
          selectedFormat="All"
          searchQuery=""
          likedPostIds={[]}
          savedPostIds={[]}
          onLikePost={() => {}}
          onToggleSave={() => {}}
          onClearFilters={() => {}}
        />
      </MemoryRouter>,
    );
    expect(feedReviewHtml).not.toContain('>Editorial<');

    const archiveEditorialHtml = renderToStaticMarkup(
      <MemoryRouter>
        <AuthorArchive articles={[editorial]} />
      </MemoryRouter>,
    );
    expect(archiveEditorialHtml).toContain('>Editorial<');

    const archiveReviewHtml = renderToStaticMarkup(
      <MemoryRouter>
        <AuthorArchive articles={[review]} />
      </MemoryRouter>,
    );
    expect(archiveReviewHtml).not.toContain('>Editorial<');
  });
});
