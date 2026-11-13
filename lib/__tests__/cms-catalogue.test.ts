import { describe, expect, it } from 'vitest';
import { getArticleCatalogue, getFeedArticles } from '@/lib/cms/catalogue';
import type { CmsPost, CmsStore } from '@/lib/cms/types';

function unused(): never {
  throw new Error('unused');
}

/**
 * In-memory CmsStore: only the two reads the catalogue makes are implemented.
 * listPosts returns drafts too, because lib/cms/read.ts does the filtering.
 */
function memoryCmsStore(posts: CmsPost[], counts: Record<string, number> = {}): CmsStore {
  return {
    kind: 'local',
    listPosts: () => Promise.resolve(posts),
    listCommentCounts: () => Promise.resolve(counts),
    getPost: unused,
    getPostBySlug: unused,
    createPost: unused,
    updatePost: unused,
    deletePost: unused,
    incrementLikes: unused,
    listComments: unused,
    listCommentsForPost: unused,
    getComment: unused,
    createComment: unused,
    deleteComment: unused,
  };
}

function cmsPost(overrides: Partial<CmsPost> = {}): CmsPost {
  return {
    id: 'a1',
    slug: 'test-cms-article',
    title: 'Test CMS article',
    subtitle: '',
    summary: 'A summary for the test CMS article.',
    category: 'Research Reviews',
    format: 'Paper Review',
    content: 'Body of the test article.',
    status: 'published',
    authorId: 'test-author',
    authorName: 'Test Author',
    coverImage: null,
    tags: [],
    keyTakeaways: [],
    readTime: '3 min read',
    featured: false,
    artifact: null,
    likes: 0,
    publishedAt: '2026-02-01',
    insertedAt: '2026-02-01',
    updatedAt: '2026-02-01',
    ...overrides,
  };
}

describe('getArticleCatalogue (CMS only)', () => {
  it('is empty when nothing is published', async () => {
    const emptyStore = memoryCmsStore([cmsPost({ id: 'd1', slug: 'a-draft', status: 'draft' })]);
    await expect(getArticleCatalogue(emptyStore)).resolves.toEqual([]);
  });

  it('contains only published CMS posts', async () => {
    const store = memoryCmsStore(
      [cmsPost(), cmsPost({ id: 'd1', slug: 'a-draft', status: 'draft' })],
      { a1: 2 },
    );
    const catalogue = await getArticleCatalogue(store);
    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].slug).toBe('test-cms-article');
    expect(catalogue[0].commentsCount).toBe(2);
  });

  it('never contains seed articles', async () => {
    const catalogue = await getArticleCatalogue(memoryCmsStore([cmsPost()]));
    for (const article of catalogue) expect(article.id).not.toMatch(/^post-\d+$/);
  });
});

describe('getFeedArticles', () => {
  it('getFeedArticles strips bodies', async () => {
    const feed = await getFeedArticles(memoryCmsStore([cmsPost()]));
    expect(feed).toHaveLength(1);
    for (const article of feed) {
      expect(article.content).toEqual([]);
      expect(article.bodyMarkdown).toBeUndefined();
    }
  });
});
