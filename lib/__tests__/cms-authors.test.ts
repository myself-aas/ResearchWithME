import { describe, expect, it } from 'vitest';
import { resolveProfileRow, type ProfileRow } from '@/lib/cms/authors';
import { CmsAuthorError } from '@/lib/cms/errors';
import { errorResponse } from '@/lib/cms/http';

const published: ProfileRow = {
  user_id: 'b7e2c1a4-0000-4000-8000-000000000001',
  slug: 'maya-lin',
  display_name: 'Maya Lin',
  published: true,
};

const unpublished: ProfileRow = { ...published, slug: 'hiroshi-tanaka', display_name: 'Hiroshi Tanaka', published: false };

describe('resolveProfileRow', () => {
  it('accepts a published profile and returns the stored display name', () => {
    const result = resolveProfileRow('maya-lin', published);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.author.slug).toBe('maya-lin');
    expect(result.author.displayName).toBe('Maya Lin');
    expect(result.author.userId).toBe(published.user_id);
  });

  it('refuses an unpublished profile even though an editor can read it', () => {
    // This is the deliberate narrowing of the RLS select policy: attribution to
    // an unpublished profile would credit someone whose /author/[slug] page is
    // not in the directory.
    const result = resolveProfileRow('hiroshi-tanaka', unpublished);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unpublished');
    if (result.reason === 'unpublished') {
      expect(result.displayName).toBe('Hiroshi Tanaka');
    }
  });

  it('reports a missing profile as not_found', () => {
    const result = resolveProfileRow('nobody', null);
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('treats a row that does not match the requested id as not_found', () => {
    const result = resolveProfileRow('someone-else', published);
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('CmsAuthorError', () => {
  it('is 422 so the editor can tell it apart from a malformed payload', () => {
    const error = new CmsAuthorError('No published author profile uses that identifier.', {
      authorId: 'Pick an author who has a published profile.',
    });
    expect(error.status).toBe(422);
    expect(error.code).toBe('author_not_publishable');
    expect(error.fieldErrors.authorId).toBeTruthy();
  });

  it('survives errorResponse with its field errors attached', async () => {
    const response = errorResponse(
      new CmsAuthorError('That profile is not published.', { authorId: 'Not published.' }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string; fieldErrors?: Record<string, string> };
    expect(body.error).toBe('That profile is not published.');
    expect(body.fieldErrors?.authorId).toBe('Not published.');
  });
});
