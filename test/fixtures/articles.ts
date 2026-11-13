import type { BlogPost } from '@/lib/blog-data';

/**
 * A neutral CMS-shaped article fixture for unit tests that render feed or
 * search components. Real catalogue data is CMS-only; these posts never look
 * like the deleted seed corpus.
 */
export function makeTestArticle(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'cms-test-1',
    slug: 'test-article-1',
    title: 'A Test Article for Unit Tests',
    subtitle: 'A short subtitle used only in tests.',
    category: 'Research Reviews',
    format: 'Paper Review',
    author: {
      id: 'test-author',
      name: 'Test Author',
      avatar: 'TA',
      bio: 'A neutral test author used only in unit tests.',
      role: 'Researcher',
      domain: 'Testing',
      institution: 'Test Lab',
      joinedDate: '2026-01-01',
      articleCount: 0,
    },
    publishedAt: '2026-02-01',
    readTime: '3 min read',
    coverImage: '',
    featured: false,
    summary: 'A summary for the test article.',
    content: ['Body of the test article.'],
    bodyMarkdown: 'Body of the test article.',
    keyTakeaways: [],
    tags: ['test'],
    likes: 0,
    commentsCount: 0,
    ...overrides,
  };
}
