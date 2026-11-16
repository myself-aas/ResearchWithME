import { describe, expect, it } from 'vitest';
import { cmsCommentToRecord, cmsPostToArticle } from '@/lib/cms/mapping';
import type { CmsComment, CmsPost } from '@/lib/cms/types';

const post: CmsPost = {
  id: '7',
  title: 'Inside paged attention',
  slug: 'inside-paged-attention',
  content: 'First paragraph about memory.\n\nSecond paragraph about throughput.',
  status: 'published',
  subtitle: 'A systems teardown',
  summary: 'How paged memory made high-concurrency serving practical.',
  category: 'GitHub Repo Teardowns',
  format: 'Repo Teardown',
  authorId: 'maya-lin',
  authorName: 'Maya Lin',
  coverImage: null,
  tags: ['CUDA', 'Inference'],
  keyTakeaways: ['Fragmentation was the bottleneck.'],
  readTime: '9 min read',
  featured: false,
  likes: 12,
  publishedAt: '2026-10-20T10:00:00.000Z',
  insertedAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  artifact: null,
};

const postWithArtifact: CmsPost = {
  ...post,
  id: '8',
  slug: 'inside-paged-attention-artifact',
  artifact: {
    type: 'github',
    title: 'vllm-project/vllm',
    url: 'https://github.com/vllm-project/vllm',
    identifier: 'vllm-project/vllm',
    meta: '44.8k Stars · Apache-2.0',
  },
};

describe('cmsPostToArticle artifact mapping', () => {
  it('omits the artifact record when the post has none', () => {
    expect(cmsPostToArticle(post).reviewedArtifact).toBeUndefined();
  });

  it('exposes a stored artifact as the reader artifact record', () => {
    expect(cmsPostToArticle(postWithArtifact).reviewedArtifact).toEqual({
      type: 'github',
      title: 'vllm-project/vllm',
      url: 'https://github.com/vllm-project/vllm',
      identifier: 'vllm-project/vllm',
      meta: '44.8k Stars · Apache-2.0',
    });
  });

  it('supplies meta copy when the stored record has none', () => {
    const mapped = cmsPostToArticle({
      ...postWithArtifact,
      artifact: { ...postWithArtifact.artifact!, meta: '' },
    });
    expect(mapped.reviewedArtifact?.meta).toBe('Artifact record supplied by the author');
  });
});

describe('cmsPostToArticle', () => {
  it('maps a CMS row into the reader model', () => {
    const article = cmsPostToArticle(post);

    expect(article.id).toBe('cms-7');
    expect(article.slug).toBe(post.slug);
    expect(article.bodyMarkdown).toBe(post.content);
    expect(article.dateISO).toBe(post.publishedAt);
    expect(article.author.id).toBe('maya-lin');
    expect(article.author.name).toBe('Maya Lin');
    expect(article.content).toEqual([
      'First paragraph about memory.',
      'Second paragraph about throughput.',
    ]);
  });

  it('keeps the profile slug as the author id rather than deriving one from the name', () => {
    // The routes validate authorId against public.profiles, so it is the
    // canonical identity. Deriving it from display_name would only line up with
    // a profile slug by coincidence.
    const article = cmsPostToArticle({ ...post, authorId: 'dr-lin', authorName: 'Dr. Maya Lin' });
    expect(article.author.id).toBe('dr-lin');
    expect(article.author.name).toBe('Dr. Maya Lin');
  });

  it('supplies the default editorial cover when none is set', () => {
    expect(cmsPostToArticle(post).coverImage).toBe('/images/folio-hero.jpeg');
  });

  it('builds a safe fallback profile for an unknown byline', () => {
    const article = cmsPostToArticle({
      ...post,
      authorId: null,
      authorName: 'Guest Editor',
    });

    expect(article.author.id).toBe('guest-editor');
    expect(article.author.name).toBe('Guest Editor');
    expect(article.author.avatar).toBe('GE');
  });

  it('defaults publicationType to review and preserves editorial', () => {
    expect(cmsPostToArticle(post).publicationType).toBe('review');
    expect(cmsPostToArticle({ ...post, publicationType: 'editorial' }).publicationType).toBe('editorial');
  });
});

describe('cmsCommentToRecord', () => {
  it('shapes a moderation row for the public discussion component', () => {
    const comment: CmsComment = {
      id: '5',
      postId: '7',
      postTitle: post.title,
      authorName: 'Dana Reed',
      authorRole: 'Systems engineer',
      content: 'We reproduced this on two nodes.',
      insertedAt: '2026-10-21T12:00:00.000Z',
    };

    const record = cmsCommentToRecord(comment);
    expect(record.id).toBe('cms-comment-5');
    expect(record.postId).toBe('cms-7');
    expect(record.avatar).toBe('DR');
    expect(record.timestamp).toContain('2026');
    expect(record.text).toContain('two nodes');
  });
});
