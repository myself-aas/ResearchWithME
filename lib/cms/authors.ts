import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CmsAuthorError, CmsUnavailableError } from './errors';

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
 *
 * Split out from the query so the decision is testable without a database.
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

function reject(authorId: string, resolution: Extract<AuthorResolution, { ok: false }>): never {
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

/**
 * Resolve the profile a post is attributed to, or throw a 422.
 *
 * The caller must not trust a client-supplied byline: use `author.displayName`
 * for the stored `authorName` so the row records what the profile actually
 * says, not what the request claimed.
 *
 * In local mode there is no `profiles` table to check against, so the byline is
 * accepted as sent. That is a development-only path — production runs with
 * Supabase configured, where the check always applies.
 */
export async function resolvePublishableAuthor(authorId: string): Promise<PublishableAuthor> {
  if (!isSupabaseConfigured) {
    return { userId: '', slug: authorId, displayName: authorId };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, slug, display_name, published')
    .eq('slug', authorId)
    .maybeSingle<ProfileRow>();

  // Fail closed. A profile we cannot check is not a profile we may attribute to.
  if (error) {
    throw new CmsUnavailableError('Author profiles could not be checked. Try again in a moment.');
  }

  const resolution = resolveProfileRow(authorId, data ?? null);
  if (!resolution.ok) reject(authorId, resolution);
  return resolution.author;
}
