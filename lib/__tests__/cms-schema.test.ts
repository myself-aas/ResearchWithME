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
    authorName: 'Maya Lin',
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

  it('rejects a short title and a missing byline', () => {
    const result = normalizePostInput(base({ title: 'Short', authorId: '' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.fieldErrors.title).toBeTruthy();
    expect(result.fieldErrors.authorId).toBeTruthy();
  });

  it('leaves byline text to the route, which resolves it from the profile', () => {
    // A client cannot dictate the stored author name: the route overwrites it
    // with display_name from public.profiles. See lib/cms/authors.ts.
    const result = normalizePostInput(base({ authorName: 'Not My Name' }));
    expect(result.ok).toBe(true);
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

describe('normalizePostInput artifact record', () => {
  const artifact = {
    type: 'github',
    title: 'vllm-project/vllm',
    url: 'https://github.com/vllm-project/vllm',
    identifier: 'vllm-project/vllm',
    meta: '44.8k Stars · Apache-2.0',
  };

  it('is null when no artifact is supplied', () => {
    const result = normalizePostInput(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact).toBeNull();
  });

  it('is null for an empty object, so the studio never invents a record', () => {
    const result = normalizePostInput(base({ artifact: {} }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact).toBeNull();
  });

  it('preserves a complete artifact', () => {
    const result = normalizePostInput(base({ artifact }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact).toEqual(artifact);
  });

  it('falls back to the identifier as the title, and vice versa', () => {
    const fromIdentifier = normalizePostInput(base({ artifact: { type: 'paper', identifier: 'arXiv:2309.06180' } }));
    expect(fromIdentifier.ok).toBe(true);
    if (fromIdentifier.ok) {
      expect(fromIdentifier.value.artifact).toMatchObject({
        type: 'paper',
        title: 'arXiv:2309.06180',
        identifier: 'arXiv:2309.06180',
      });
    }

    const fromTitle = normalizePostInput(base({ artifact: { title: 'A study of paged memory' } }));
    expect(fromTitle.ok).toBe(true);
    if (fromTitle.ok) {
      expect(fromTitle.value.artifact).toMatchObject({
        type: 'paper', // unknown types default rather than reject
        title: 'A study of paged memory',
        identifier: 'A study of paged memory',
      });
    }
  });

  it('drops an artifact that names nothing instead of blocking the save', () => {
    const result = normalizePostInput(base({ artifact: { type: 'dataset', url: 'https://example.org/data' } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact).toBeNull();
  });

  it('rejects a non-http artifact URL by clearing it', () => {
    const result = normalizePostInput(base({ artifact: { ...artifact, url: 'javascript:alert(1)' } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact?.url).toBe('');
  });

  it('enforces the length limits', () => {
    const result = normalizePostInput(
      base({ artifact: { ...artifact, meta: 'x'.repeat(400), identifier: 'y'.repeat(400) } }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artifact?.meta).toHaveLength(160);
    expect(result.value.artifact?.identifier).toHaveLength(160);
  });
});

describe('normalizePostInput publicationType', () => {
  it('defaults publicationType to review when omitted or unknown', () => {
    const omitted = normalizePostInput(base());
    expect(omitted.ok).toBe(true);
    if (omitted.ok) expect(omitted.value.publicationType).toBe('review');

    const unknown = normalizePostInput(base({ publicationType: 'opinion' }));
    expect(unknown.ok).toBe(true);
    if (unknown.ok) expect(unknown.value.publicationType).toBe('review');
  });

  it('preserves editorial when explicitly requested', () => {
    const editorial = normalizePostInput(base({ publicationType: 'editorial' }));
    expect(editorial.ok).toBe(true);
    if (editorial.ok) expect(editorial.value.publicationType).toBe('editorial');
  });
});
