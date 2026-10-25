import { describe, expect, it } from 'vitest';
import {
  fromPublicPostId,
  normalizeCommentInput,
  normalizePostInput,
  toPublicPostId,
} from '@/lib/cms/schema';

const body = 'Paged attention stores the key-value cache in fixed-size blocks. '.repeat(4);
const summary = 'A detailed review of memory fragmentation in high-concurrency model serving.';

function base(overrides: Record<string, unknown> = {}) {
  return {
    title: 'A rigorous review of paged attention',
    content: body,
    summary,
    keyTakeaways: ['Block-based allocation removed the memory waste.'],
    authorId: 'maya-lin',
    category: 'GitHub Repo Teardowns',
    format: 'Repo Teardown',
    coverImage: '/images/folio-code.jpeg',
    status: 'published',
    ...overrides,
  };
}

describe('normalizePostInput', () => {
  it('normalises a publishable article and derives the slug and reading time', () => {
    const result = normalizePostInput(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.slug).toBe('a-rigorous-review-of-paged-attention');
    expect(result.value.readTime).toMatch(/min read$/);
    expect(result.value.authorName).toBe('Maya Lin');
    expect(result.value.category).toBe('GitHub Repo Teardowns');
    expect(result.value.coverImage).toBe('/images/folio-code.jpeg');
  });

  it('allows an incomplete draft but blocks publishing it', () => {
    const draft = normalizePostInput(base({ content: '', summary: '', keyTakeaways: [], status: 'draft' }));
    expect(draft.ok).toBe(true);
    if (draft.ok) expect(draft.value.status).toBe('draft');

    const publish = normalizePostInput(base({ content: '', summary: '', keyTakeaways: [] }));
    expect(publish.ok).toBe(false);
    if (publish.ok) return;

    expect(publish.fieldErrors.content).toBeTruthy();
    expect(publish.fieldErrors.summary).toBeTruthy();
    expect(publish.fieldErrors.keyTakeaways).toBeTruthy();
  });

  it('rejects a short title and an unknown byline', () => {
    const result = normalizePostInput(base({ title: 'Short', authorId: 'nobody' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.fieldErrors.title).toBeTruthy();
    expect(result.fieldErrors.authorId).toBeTruthy();
  });

  it('accepts bundled covers and rejects unconfigured remote hosts', () => {
    expect(normalizePostInput(base({ coverImage: '/images/folio-hero.jpeg' })).ok).toBe(true);

    const remote = normalizePostInput(base({ coverImage: 'https://images.example.org/cover.jpg' }));
    expect(remote.ok).toBe(false);
    if (!remote.ok) expect(remote.fieldErrors.coverImage).toBeTruthy();

    const traversal = normalizePostInput(base({ coverImage: '/images/../secret.jpg' }));
    expect(traversal.ok).toBe(false);
  });

  it('parses comma-separated tags and caps them at eight', () => {
    const result = normalizePostInput(
      base({ tags: 'one, two, three, four, five, six, seven, eight, nine' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tags).toHaveLength(8);
  });

  it('falls back to a truncated summary when no standfirst is supplied', () => {
    const result = normalizePostInput(base({ subtitle: '' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.subtitle).toBe(summary.slice(0, 140));
  });
});

describe('normalizeCommentInput', () => {
  it('accepts a valid reader comment with the default role', () => {
    const result = normalizeCommentInput({ authorName: 'A reader', content: 'The reproduced benchmark is useful.' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.authorRole).toBe('Reader');
      expect(result.value.content).toContain('benchmark');
    }
  });

  it('rejects one-character comments and missing names', () => {
    const result = normalizeCommentInput({ authorName: 'A', content: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.authorName).toBeTruthy();
      expect(result.fieldErrors.content).toBeTruthy();
    }
  });
});

describe('public post ids', () => {
  it('namespaces numeric CMS ids to avoid colliding with seed ids', () => {
    expect(toPublicPostId('42')).toBe('cms-42');
    expect(fromPublicPostId('cms-42')).toBe('42');
  });

  it('rejects ids that do not belong to the CMS', () => {
    expect(fromPublicPostId('post-1')).toBeNull();
    expect(fromPublicPostId('cms-abc')).toBeNull();
    expect(fromPublicPostId('cms-')).toBeNull();
  });
});
