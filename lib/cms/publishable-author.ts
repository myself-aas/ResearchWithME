import { CmsAuthorError } from './errors';

/**
 * The pure core of the publishable-author decision, extracted so both the
 * Next.js wrapper (lib/cms/authors.ts) and the Pages store adapter can use it.
 * No Next, no node:*, no I/O — the query lives with the caller.
 */

/** The subset of `public.profiles` a post attribution depends on. */
export interface PublishableAuthor {
  userId: string;
  slug: string;
  displayName: string;
}

export interface ProfileRow {
  user_id: string;
  slug: string;
  display_name: string;
  published: boolean;
}

export type AuthorResolution =
  | { ok: true; author: PublishableAuthor }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'unpublished'; displayName: string };

/**
 * Decide whether a profile row may carry a post's byline.
 *
 * This is deliberately narrower than the table's select policy. An editor can
 * *read* every profile through the `public.is_editor()` branch of
 * "Anyone can read a published profile", including unpublished ones — but
 * attributing a public article to an unpublished profile would put a real
 * person's name on an article whose /author/[slug] page is not in the
 * directory. Requiring `published` guarantees the attribution resolves.
 */
export function resolveProfileRow(authorId: string, row: ProfileRow | null): AuthorResolution {
  if (!row || row.slug !== authorId) return { ok: false, reason: 'not_found' };
  if (!row.published) {
    return { ok: false, reason: 'unpublished', displayName: row.display_name };
  }
  return {
    ok: true,
    author: { userId: row.user_id, slug: row.slug, displayName: row.display_name },
  };
}

/** Map a failed resolution onto the right CmsAuthorError (422) and throw it. */
export function rejectAuthorResolution(
  authorId: string,
  resolution: Extract<AuthorResolution, { ok: false }>,
): never {
  if (resolution.reason === 'unpublished') {
    throw new CmsAuthorError(
      `${resolution.displayName}'s profile is not published, so it cannot carry a byline yet.`,
      { authorId: 'That profile is not published. Ask them to publish it first.' },
    );
  }
  throw new CmsAuthorError('No published author profile uses that identifier.', {
    authorId: 'Pick an author who has a published profile.',
  });
}
